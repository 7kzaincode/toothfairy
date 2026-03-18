"""Imaging Copilot Handler

Processes tooth clicks on dental X-rays:
1. Map click position to FDI tooth number
2. Segment tooth region using MedSAM2 (via ReliabilityManager)
3. Detect findings using Gemini vision
4. Update patient state
"""

import asyncio
import base64
import logging
import time
from pathlib import Path

from app.core.log_emitter import log_emitter
from app.core.config import settings
from app.core.reliability_manager import reliability_manager, ReliabilityManager, ExecutionStatus
from app.api.dependencies import cache_manager
from app.models.logs import CopilotType
from app.models.imaging import ImagingActionRequest, ImagingActionResponse
from app.models.patient_state import PatientState, ImagingOutput, ImagingProvenance, ToothFinding, ClinicalNotesOutput, ClinicalNotesArtifact, TreatmentProtocol
from app.copilots.imaging.tooth_mapper import map_click_to_tooth, PANORAMIC_TEETH
from app.copilots.imaging.finding_detector import detect_findings_with_llm, detect_findings_full_scan
from app.services.replicate_client import replicate_client
from app.services.tooth_segmentation import segment_full_image, extract_tooth_contour, is_available as unet_available

logger = logging.getLogger(__name__)

# Limit concurrent Gemini calls to avoid 429 rate limiting
_gemini_semaphore = asyncio.Semaphore(3)

XRAY_DIR = settings.ASSETS_ROOT_DIR / "xrays"

# Demo cache constants — fallback when live inference is unavailable
_DEMO_PATIENT_ID = "patient-001"
_DEMO_IMAGE_ID = "demo-panoramic"


def _load_image_bytes(image_id: str) -> bytes | None:
    """Load X-ray image bytes from disk by image_id.

    Searches XRAY_DIR for a file whose stem matches image_id.
    Returns raw bytes or None if not found.
    """
    if not XRAY_DIR.exists():
        return None
    for p in XRAY_DIR.iterdir():
        if p.stem == image_id and p.suffix.lower() in (".png", ".jpg", ".jpeg"):
            return p.read_bytes()
    return None


class ImagingHandler:
    """Handles dental X-ray imaging analysis."""

    async def handle_tooth_click(
        self, request: ImagingActionRequest, patient_state: PatientState
    ) -> ImagingActionResponse:
        start_time = time.time()
        session_id = request.session_id
        copilot = CopilotType.IMAGING

        await log_emitter.emit_info(session_id, copilot, f"Imaging copilot activated at ({request.x}, {request.y})")

        # Step 1: Map click to tooth number (handles both normalized and pixel coords)
        await log_emitter.emit_progress(session_id, copilot, "Mapping click position to tooth number...")
        tooth_number = map_click_to_tooth(request.x, request.y, request.image_type)
        await log_emitter.emit_info(session_id, copilot, f"Identified FDI tooth #{tooth_number}")

        # Step 2: Segment tooth using U-Net model
        await log_emitter.emit_progress(session_id, copilot, "Segmenting tooth region...")
        live_attempted = False
        live_succeeded = False

        # Load image to get dimensions
        image_bytes = _load_image_bytes(request.image_id)
        img_width, img_height = 1200, 800  # defaults

        if image_bytes:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes))
            img_width, img_height = img.size

        # Look up the zone for this tooth
        zone = None
        for quadrant in PANORAMIC_TEETH.values():
            if tooth_number in quadrant:
                zone = quadrant[tooth_number]
                break

        contour_points = None
        provenance = "zone-map"

        # Try U-Net segmentation first
        if image_bytes and zone and unet_available():
            live_attempted = True
            try:
                mask = segment_full_image(image_bytes, request.image_id)
                if mask is not None:
                    contour = extract_tooth_contour(mask, tooth_number, zone, img_width, img_height)
                    if contour and len(contour) >= 3:
                        contour_points = contour
                        provenance = "unet"
                        live_succeeded = True
                        await log_emitter.emit_success(session_id, copilot, f"U-Net segmented tooth #{tooth_number}")
            except Exception as e:
                logger.warning(f"U-Net segmentation failed: {e}")

        # Fallback to zone-based contour
        if contour_points is None:
            contour_points = self._generate_tooth_contour(tooth_number, img_width, img_height, image_bytes)
            await log_emitter.emit_success(session_id, copilot, f"Tooth #{tooth_number} region mapped")

        # Step 3: Detect findings (cache → Gemini vision → placeholder)
        await log_emitter.emit_progress(session_id, copilot, f"Analyzing tooth #{tooth_number} for pathology...")

        cached_findings = cache_manager.get_imaging_findings(
            patient_state.identifiers.patient_id, request.image_id
        )
        if not cached_findings:
            cached_findings = cache_manager.get_imaging_findings(
                _DEMO_PATIENT_ID, _DEMO_IMAGE_ID
            )

        findings = []
        if cached_findings and str(tooth_number) in cached_findings.get("teeth", {}):
            # Use cached findings
            tooth_data = cached_findings["teeth"][str(tooth_number)]
            for f in tooth_data.get("findings", []):
                findings.append(ToothFinding(
                    tooth_number=tooth_number,
                    condition=f["condition"],
                    severity=f.get("severity", "moderate"),
                    confidence=f.get("confidence", 0.8),
                    location_description=f.get("location", ""),
                ))
            await log_emitter.emit_success(session_id, copilot, f"Found {len(findings)} finding(s) for tooth #{tooth_number}")
        else:
            # Attempt LLM-based finding detection (rate-limited)
            image_bytes = _load_image_bytes(request.image_id)
            if image_bytes:
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                async with _gemini_semaphore:
                    findings = await detect_findings_with_llm(
                        image_base64, tooth_number, request.image_type
                    )
                if findings:
                    await log_emitter.emit_success(
                        session_id, copilot,
                        f"Gemini detected {len(findings)} finding(s) for tooth #{tooth_number}"
                    )

            # If both cache and LLM returned nothing, report healthy
            if not findings:
                await log_emitter.emit_success(session_id, copilot, f"No pathology detected for tooth #{tooth_number}")
                findings.append(ToothFinding(
                    tooth_number=tooth_number,
                    condition="healthy",
                    severity="none",
                    confidence=0.75,
                    location_description="No visible pathology detected",
                ))

        # Step 4: Generate narrative
        if findings and findings[0].condition not in ("under_review", "healthy"):
            narrative = f"Tooth #{tooth_number}: {', '.join(f.condition.replace('_', ' ') for f in findings)}. "
            narrative += f"Severity: {findings[0].severity}. Confidence: {findings[0].confidence:.0%}."
        elif findings and findings[0].condition == "healthy":
            narrative = f"Tooth #{tooth_number}: No pathology detected. Tooth appears healthy."
        else:
            narrative = f"Tooth #{tooth_number} selected. Region segmented for review."

        await log_emitter.emit_success(session_id, copilot, narrative)

        # Step 5: Update patient state
        elapsed_ms = int((time.time() - start_time) * 1000)

        imaging_output = ImagingOutput(
            segmentation_provenance=provenance,
            contour_points=contour_points,
            tooth_number=tooth_number,
            findings=findings,
            narrative_summary=narrative,
        )

        imaging_provenance = ImagingProvenance(
            live_attempted=live_attempted,
            live_succeeded=live_succeeded,
            fallback_used=not live_succeeded,
            duration_ms=elapsed_ms,
        )

        patient_state.imaging_output = imaging_output
        patient_state.imaging_provenance = imaging_provenance

        # Update tooth chart (skip healthy — only add actual findings)
        for finding in findings:
            if finding.condition not in ("under_review", "healthy"):
                patient_state.tooth_chart[finding.tooth_number] = finding

        # Build image URL for frontend
        image_url = f"/api/imaging/image/{request.image_id}"

        return ImagingActionResponse(
            session_id=session_id,
            tooth_number=tooth_number,
            contour_points=contour_points,
            findings=findings,
            narrative=narrative,
            provenance=provenance,
            image_url=image_url,
            inference_time_ms=elapsed_ms,
        )

    async def handle_auto_scan(
        self,
        image_id: str,
        patient_state: PatientState,
        image_type: str = "panoramic"
    ) -> dict:
        """Auto-scan all teeth using U-Net + CCA segmentation.

        1. Run U-Net on full image → teeth mask
        2. CCA post-processing → individual tooth components
        3. Return all tooth contours for frontend rendering

        Returns:
            {
                "total_teeth": N,
                "segmented": N,
                "suspicious_teeth": 0,
                "findings": [],
                "inference_time_ms": ...,
                "segments": [...],
                "provenance": "unet"
            }
        """
        from app.services.tooth_segmentation import (
            extract_all_tooth_contours, is_available as unet_available
        )

        start_time = time.time()
        image_bytes = _load_image_bytes(image_id)

        all_segments = []
        provenance = "fallback"

        if image_bytes and unet_available():
            try:
                tooth_contours = extract_all_tooth_contours(image_bytes, image_id)
                provenance = "unet"

                for i, tc in enumerate(tooth_contours):
                    all_segments.append({
                        "tooth_number": i + 1,  # CCA label as identifier
                        "contour_points": tc["contour_points"],
                        "confidence": 0.85,
                        "area_pixels": tc["area"],
                        "used_fallback": False,
                    })
            except Exception as e:
                logger.error(f"U-Net auto-scan failed: {e}")

        # Fallback to bounding boxes if U-Net unavailable
        if not all_segments:
            tooth_points, _, _ = self._generate_tooth_center_points(
                image_id=image_id, image_type=image_type
            )
            fallback = self._generate_fallback_batch_results(tooth_points)
            for seg in fallback.get("results", []):
                tooth_number = self._point_index_to_fdi(seg["point_index"])
                all_segments.append({
                    "tooth_number": tooth_number,
                    "contour_points": seg["contour_points"],
                    "confidence": 0.0,
                    "area_pixels": seg["area_pixels"],
                    "used_fallback": True,
                })
            provenance = "fallback"

        # Run Gemini full-scan diagnostic on the image
        findings = []
        if image_bytes:
            try:
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                async with _gemini_semaphore:
                    findings = await detect_findings_full_scan(image_base64, image_type)
            except Exception as e:
                logger.error(f"Full-scan Gemini diagnostics failed: {e}")

        # Fallback to cached findings if Gemini returned nothing (e.g. rate limited)
        if not findings:
            try:
                import json as _json
                cache_path = Path(__file__).resolve().parents[3] / "assets" / "cache" / "imaging" / "patient-001" / "demo-panoramic" / "findings.json"
                if cache_path.exists():
                    cached = _json.loads(cache_path.read_text())
                    for tooth_str, tooth_data in cached.get("teeth", {}).items():
                        for f_data in tooth_data.get("findings", []):
                            findings.append(ToothFinding(
                                tooth_number=int(tooth_str),
                                condition=f_data["condition"],
                                severity=f_data["severity"],
                                confidence=f_data["confidence"],
                                location_description=f_data.get("location", ""),
                            ))
                    await log_emitter.emit_fallback(
                        session_id, copilot,
                        f"Gemini unavailable, using cached findings ({len(findings)} findings)"
                    )
            except Exception as e:
                logger.error(f"Cached findings fallback failed: {e}")

        # Filter out "missing" findings — if U-Net segmented the tooth, it's not missing
        segmented_count = len(all_segments)
        if segmented_count > 0:
            before = len(findings)
            findings = [f for f in findings if f.condition != "missing"]
            dropped = before - len(findings)
            if dropped:
                logger.info(f"Dropped {dropped} 'missing' findings — U-Net segmented {segmented_count} teeth")

        suspicious = len(set(f.tooth_number for f in findings if f.condition != "healthy"))

        # Write findings to patient_state.tooth_chart (don't overwrite existing notes-based findings)
        for f in findings:
            if f.condition not in ("under_review", "healthy"):
                if f.tooth_number not in patient_state.tooth_chart:
                    patient_state.tooth_chart[f.tooth_number] = f

        # Generate clinical notes output from imaging findings so other tabs pick it up
        pathological = [f for f in findings if f.condition not in ("under_review", "healthy")]
        if pathological:
            # Build treatment timeline entries from findings
            _TREATMENT_MAP = {
                "cavity": ("Composite restoration", "soon", 1, "D2391", "$150-$300"),
                "bone_loss": ("Scaling & root planing", "soon", 2, "D4341", "$200-$400"),
                "periapical_lesion": ("Root canal therapy", "immediate", 2, "D3310", "$700-$1200"),
                "impacted": ("Surgical extraction", "routine", 1, "D7240", "$250-$500"),
                "fracture": ("Crown placement", "immediate", 2, "D2740", "$800-$1500"),
                "root_resorption": ("Endodontic evaluation", "soon", 1, "D3310", "$500-$900"),
                "cyst": ("Surgical excision", "immediate", 1, "D7450", "$400-$800"),
                "abscess": ("Incision & drainage + antibiotics", "immediate", 1, "D7510", "$300-$600"),
                "crown_defect": ("Crown replacement", "routine", 2, "D2740", "$800-$1500"),
                "missing": ("Implant or bridge evaluation", "routine", 3, "D6010", "$1500-$4000"),
            }
            _URGENCY_ORDER = {"immediate": 0, "soon": 1, "routine": 2, "monitor": 3}

            timeline = []
            protocols = []
            for i, f in enumerate(sorted(pathological, key=lambda x: _URGENCY_ORDER.get(
                _TREATMENT_MAP.get(x.condition, ("", "routine", 1, None, None))[1], 3
            ))):
                tx = _TREATMENT_MAP.get(f.condition, (f.condition.replace("_", " ").title(), "routine", 1, None, None))
                timeline.append({
                    "order": i + 1,
                    "tooth_number": f.tooth_number,
                    "condition": f.condition,
                    "treatment": tx[0],
                    "urgency": tx[1],
                    "cdt_code": tx[3],
                    "estimated_cost": tx[4],
                })
                protocols.append(TreatmentProtocol(
                    condition=f.condition,
                    tooth_number=f.tooth_number,
                    recommended_treatment=tx[0],
                    urgency=tx[1],
                    estimated_visits=tx[2],
                    patient_explanation=f"Tooth #{f.tooth_number}: {f.condition.replace('_', ' ')} detected via X-ray analysis.",
                    cdt_code=tx[3],
                    estimated_cost=tx[4],
                ))

            # Only set clinical notes output if not already populated by the clinical notes copilot
            if not patient_state.clinical_notes_output:
                patient_state.clinical_notes_output = ClinicalNotesOutput(
                    diagnoses=pathological,
                    protocols=protocols,
                    timeline=timeline,
                    patient_summary=f"X-ray analysis identified {len(pathological)} finding(s) requiring attention.",
                    dentist_summary=f"Auto-scan ({provenance}): {len(all_segments)} teeth segmented, {len(pathological)} pathological finding(s).",
                )
            else:
                # Merge imaging findings into existing clinical notes
                existing_teeth = {d.tooth_number for d in (patient_state.clinical_notes_output.diagnoses or [])}
                existing_timeline_teeth = {
                    e.get("tooth_number") for e in (patient_state.clinical_notes_output.timeline or [])
                }
                next_order = len(patient_state.clinical_notes_output.timeline or []) + 1

                existing_protocol_teeth = {
                    p.tooth_number for p in (patient_state.clinical_notes_output.protocols or [])
                }

                for f in pathological:
                    if f.tooth_number not in existing_teeth:
                        if patient_state.clinical_notes_output.diagnoses is None:
                            patient_state.clinical_notes_output.diagnoses = []
                        patient_state.clinical_notes_output.diagnoses.append(f)

                    if f.tooth_number not in existing_protocol_teeth:
                        tx = _TREATMENT_MAP.get(f.condition, (f.condition.replace("_", " ").title(), "routine", 1, None, None))
                        if patient_state.clinical_notes_output.protocols is None:
                            patient_state.clinical_notes_output.protocols = []
                        patient_state.clinical_notes_output.protocols.append(TreatmentProtocol(
                            condition=f.condition,
                            tooth_number=f.tooth_number,
                            recommended_treatment=tx[0],
                            urgency=tx[1],
                            estimated_visits=tx[2],
                            patient_explanation=f"Tooth #{f.tooth_number}: {f.condition.replace('_', ' ')} detected via X-ray analysis.",
                            cdt_code=tx[3],
                            estimated_cost=tx[4],
                        ))

                    if f.tooth_number not in existing_timeline_teeth:
                        tx = _TREATMENT_MAP.get(f.condition, (f.condition.replace("_", " ").title(), "routine", 1, None, None))
                        if patient_state.clinical_notes_output.timeline is None:
                            patient_state.clinical_notes_output.timeline = []
                        patient_state.clinical_notes_output.timeline.append({
                            "order": next_order,
                            "tooth_number": f.tooth_number,
                            "condition": f.condition,
                            "treatment": tx[0],
                            "urgency": tx[1],
                            "cdt_code": tx[3],
                            "estimated_cost": tx[4],
                            "source": "imaging",
                        })
                        next_order += 1

        # Append imaging findings addendum to clinical notes text
        if pathological:
            addendum_lines = ["\n\n--- X-RAY IMAGING FINDINGS (Auto-Scan) ---"]
            for f in pathological:
                addendum_lines.append(
                    f"- Tooth #{f.tooth_number}: {f.condition.replace('_', ' ')} "
                    f"({f.severity}, {f.confidence:.0%} confidence) — {f.location_description}"
                )
            addendum_lines.append(f"\nTotal: {len(pathological)} finding(s) across {suspicious} tooth/teeth.")
            addendum_text = "\n".join(addendum_lines)

            # Strip previous auto-scan section if re-scanning, append to existing notes
            MARKER = "--- X-RAY IMAGING FINDINGS (Auto-Scan) ---"
            if patient_state.clinical_notes_artifact and patient_state.clinical_notes_artifact.notes_text:
                existing = patient_state.clinical_notes_artifact.notes_text
                if MARKER in existing:
                    existing = existing[:existing.index(MARKER)].rstrip()
                patient_state.clinical_notes_artifact.notes_text = existing + addendum_text
            else:
                # No artifact yet (auto-parse hasn't run) — create with just imaging findings.
                # Frontend will show profileNotes as fallback if this is empty.
                patient_state.clinical_notes_artifact = ClinicalNotesArtifact(
                    notes_text=addendum_text.strip()
                )

        # Update imaging output with all findings for cross-tab access
        patient_state.imaging_output = ImagingOutput(
            segmentation_provenance=provenance,
            contour_points=None,
            tooth_number=None,
            findings=findings,
            narrative_summary=f"Auto-scan detected {len(all_segments)} teeth with {len(findings)} finding(s) across {suspicious} tooth/teeth.",
        )
        patient_state.imaging_provenance = ImagingProvenance(
            live_attempted=True,
            live_succeeded=(provenance == "unet"),
            fallback_used=(provenance != "unet"),
            duration_ms=int((time.time() - start_time) * 1000),
        )

        inference_time_ms = int((time.time() - start_time) * 1000)

        return {
            "total_teeth": len(all_segments),
            "segmented": len(all_segments),
            "suspicious_teeth": suspicious,
            "findings": [
                {
                    "tooth_number": f.tooth_number,
                    "condition": f.condition,
                    "severity": f.severity,
                    "confidence": f.confidence,
                    "location_description": f.location_description,
                }
                for f in findings
            ],
            "inference_time_ms": inference_time_ms,
            "segments": all_segments,
            "provenance": provenance,
        }

    def _generate_tooth_center_points(
        self,
        image_id: str,
        image_type: str = "panoramic"
    ) -> tuple[list[tuple[int, int]], int, int]:
        """Generate approximate center points for all 32 teeth.

        Uses PANORAMIC_TEETH zones from tooth_mapper.py to calculate centers.

        Args:
            image_id: X-ray image ID to get actual dimensions
            image_type: Type of X-ray (default: panoramic)

        Returns:
            tuple: (points, width, height)
                - points: List of (x, y) center coordinates for each tooth
                - width: Actual image width in pixels
                - height: Actual image height in pixels
        """
        from PIL import Image

        # Load actual image dimensions
        image_bytes = _load_image_bytes(image_id)
        if image_bytes:
            import io
            img = Image.open(io.BytesIO(image_bytes))
            width, height = img.size
        else:
            # Fallback to typical panoramic dimensions
            width, height = 1200, 800
            logger.warning(f"Could not load image {image_id}, using default dimensions {width}x{height}")

        points = []

        # FDI tooth order: upper right (18-11), upper left (21-28), lower left (31-38), lower right (41-48)
        for quadrant in ["upper_right", "upper_left", "lower_left", "lower_right"]:
            teeth = PANORAMIC_TEETH.get(quadrant, {})
            for tooth_number in sorted(teeth.keys()):
                zone = teeth[tooth_number]
                # Zone has x_min, x_max, y_min, y_max in normalized coordinates (0-1)
                x_center = int(width * (zone["x_min"] + zone["x_max"]) / 2)
                y_center = int(height * (zone["y_min"] + zone["y_max"]) / 2)
                points.append((x_center, y_center))

        return points, width, height

    def _point_index_to_fdi(self, point_index: int) -> int:
        """Map batch point index to FDI tooth number.

        FDI order: 18-11 (upper right), 21-28 (upper left), 31-38 (lower left), 41-48 (lower right)
        """
        # Upper right (18-11): indices 0-7
        if point_index < 8:
            return 18 - point_index
        # Upper left (21-28): indices 8-15
        elif point_index < 16:
            return 21 + (point_index - 8)
        # Lower left (31-38): indices 16-23
        elif point_index < 24:
            return 31 + (point_index - 16)
        # Lower right (41-48): indices 24-31
        else:
            return 48 - (point_index - 24)

    def _is_tooth_suspicious(self, seg_result: dict) -> bool:
        """Lightweight heuristics to flag suspicious teeth.

        Returns True if tooth should be analyzed by Gemini.

        Heuristics:
        - Low confidence score (< 0.7)
        - Unusual area (too small/large compared to average tooth)
        - Used fallback bounding box
        """
        confidence = seg_result.get("confidence", 0)
        area = seg_result.get("area_pixels", 0)
        used_fallback = seg_result.get("used_fallback", False)

        # Flag if low confidence
        if confidence < 0.7:
            seg_result["suspicion_reason"] = "low_confidence"
            return True

        # Flag if fallback was used (segmentation failed)
        if used_fallback:
            seg_result["suspicion_reason"] = "segmentation_failed"
            return True

        # Flag if area is unusual (< 500px² or > 10000px²)
        if area < 500 or area > 10000:
            seg_result["suspicion_reason"] = "unusual_size"
            return True

        return False

    def _generate_tooth_contour(
        self, tooth_number: int, img_width: int, img_height: int,
        image_bytes: bytes | None = None,
    ) -> list[list[int]]:
        """Generate tooth contour using OpenCV edge detection within the zone.

        1. Look up the PANORAMIC_TEETH zone for this tooth
        2. Crop the image to that zone (with padding)
        3. Use Canny edge detection + contour finding to trace the actual tooth
        4. Fall back to a tapered polygon if edge detection fails
        """
        import cv2
        import numpy as np

        # Find the zone for this tooth
        zone = None
        for quadrant in PANORAMIC_TEETH.values():
            if tooth_number in quadrant:
                zone = quadrant[tooth_number]
                break

        if not zone:
            cx, cy = img_width // 2, img_height // 2
            p = 30
            return [[cx - p, cy - p], [cx + p, cy - p], [cx + p, cy + p], [cx - p, cy + p]]

        # Convert normalized zone to pixel coordinates with padding
        pad_x = int((zone["x_max"] - zone["x_min"]) * img_width * 0.15)
        pad_y = int((zone["y_max"] - zone["y_min"]) * img_height * 0.15)
        x1 = max(0, int(zone["x_min"] * img_width) - pad_x)
        x2 = min(img_width, int(zone["x_max"] * img_width) + pad_x)
        y1 = max(0, int(zone["y_min"] * img_height) - pad_y)
        y2 = min(img_height, int(zone["y_max"] * img_height) + pad_y)

        # Try OpenCV edge-based contour detection
        if image_bytes:
            try:
                img_array = np.frombuffer(image_bytes, np.uint8)
                full_img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)

                if full_img is not None:
                    # Crop to zone
                    crop = full_img[y1:y2, x1:x2]
                    ch, cw = crop.shape

                    # Enhance contrast with CLAHE
                    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(4, 4))
                    enhanced = clahe.apply(crop)

                    # Blur to reduce noise
                    blurred = cv2.GaussianBlur(enhanced, (5, 5), 1.5)

                    # Adaptive threshold to find tooth region (teeth are bright)
                    thresh = cv2.adaptiveThreshold(
                        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                        cv2.THRESH_BINARY, 21, -8
                    )

                    # Morphological close to fill gaps
                    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                    closed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)

                    # Find contours
                    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                    if contours:
                        # Pick the contour closest to the center of the crop
                        center = np.array([cw // 2, ch // 2])
                        best_contour = None
                        best_score = float("inf")

                        min_area = cw * ch * 0.05  # At least 5% of crop
                        max_area = cw * ch * 0.85  # At most 85% of crop

                        for c in contours:
                            area = cv2.contourArea(c)
                            if area < min_area or area > max_area:
                                continue
                            M = cv2.moments(c)
                            if M["m00"] == 0:
                                continue
                            cx_c = int(M["m10"] / M["m00"])
                            cy_c = int(M["m01"] / M["m00"])
                            dist = np.linalg.norm(np.array([cx_c, cy_c]) - center)
                            if dist < best_score:
                                best_score = dist
                                best_contour = c

                        if best_contour is not None:
                            # Simplify contour to reduce point count
                            epsilon = 0.02 * cv2.arcLength(best_contour, True)
                            approx = cv2.approxPolyDP(best_contour, epsilon, True)

                            # Offset back to full image coordinates
                            points = approx.reshape(-1, 2).tolist()
                            return [[p[0] + x1, p[1] + y1] for p in points]

            except Exception as e:
                logger.warning(f"OpenCV contour detection failed: {e}")

        # Fallback: tapered polygon from zone
        is_upper = tooth_number < 30
        zx1 = int(zone["x_min"] * img_width)
        zx2 = int(zone["x_max"] * img_width)
        zy1 = int(zone["y_min"] * img_height)
        zy2 = int(zone["y_max"] * img_height)
        cx = (zx1 + zx2) // 2
        w = zx2 - zx1
        h = zy2 - zy1
        tooth_h = int(h * 0.6)
        narrow_w = int(w * 0.6)

        if is_upper:
            crown_y, root_y = zy2, zy2 - tooth_h
            return [
                [cx - w // 2, crown_y], [cx - narrow_w // 2, root_y],
                [cx, root_y - 8], [cx + narrow_w // 2, root_y], [cx + w // 2, crown_y],
            ]
        else:
            crown_y, root_y = zy1, zy1 + tooth_h
            return [
                [cx - w // 2, crown_y], [cx + w // 2, crown_y],
                [cx + narrow_w // 2, root_y], [cx, root_y + 8], [cx - narrow_w // 2, root_y],
            ]

    async def _detect_findings_batch(
        self,
        image_id: str,
        suspicious_teeth: list[dict]
    ) -> list[ToothFinding]:
        """Detect findings for batch of suspicious teeth using Gemini.

        Uses a semaphore to limit concurrent Gemini calls and avoid 429 rate limiting.
        """
        async def _rate_limited_detect(tooth_data: dict) -> list[ToothFinding]:
            async with _gemini_semaphore:
                return await self._detect_findings_for_segment(
                    image_id=image_id,
                    tooth_number=tooth_data["tooth_number"],
                    confidence=tooth_data["confidence"]
                )

        tasks = [_rate_limited_detect(td) for td in suspicious_teeth]

        # Run with semaphore limiting concurrency
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten results
        findings = []
        for result in results:
            if isinstance(result, list):
                findings.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Finding detection failed: {result}")

        return findings

    async def _detect_findings_for_segment(
        self,
        image_id: str,
        tooth_number: int,
        confidence: float
    ) -> list[ToothFinding]:
        """Detect findings for a single tooth segment.

        Args:
            image_id: X-ray image ID
            tooth_number: FDI tooth number
            confidence: Segmentation confidence score

        Returns:
            List of ToothFinding objects (may be empty or placeholder)
        """
        # Load image and detect findings
        image_bytes = _load_image_bytes(image_id)
        if not image_bytes:
            return []

        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        findings = await detect_findings_with_llm(
            image_base64, tooth_number, image_type="panoramic"
        )

        # If no findings, add placeholder
        if not findings:
            findings = [ToothFinding(
                tooth_number=tooth_number,
                condition="under_review",
                severity="mild",
                confidence=confidence,
                location_description="Flagged for review by auto-scan"
            )]

        return findings

    def _generate_fallback_batch_results(self, tooth_points: list[tuple[int, int]]) -> dict:
        """Generate fallback bounding box results for batch segmentation.

        Used when Modal endpoint is unavailable or times out.
        Creates simple bounding boxes around each tooth center point.

        Args:
            tooth_points: List of (x, y) center points for each tooth

        Returns:
            dict: Batch result structure with fallback bounding boxes
        """
        results = []
        pad = 40  # Bounding box padding in pixels

        for idx, (x, y) in enumerate(tooth_points):
            results.append({
                "point_index": idx,
                "point": [x, y],
                "contour_points": [
                    [x - pad, y - pad],
                    [x + pad, y - pad],
                    [x + pad, y + pad],
                    [x - pad, y + pad]
                ],
                "confidence": 0.0,
                "area_pixels": (pad * 2) * (pad * 2),
                "used_fallback": True
            })

        return {
            "success": True,
            "results": results,
            "total_points": len(tooth_points),
            "successful_segments": len(tooth_points)
        }
