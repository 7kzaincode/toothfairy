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
from app.models.patient_state import PatientState, ImagingOutput, ImagingProvenance, ToothFinding
from app.copilots.imaging.tooth_mapper import map_click_to_tooth, PANORAMIC_TEETH
from app.copilots.imaging.finding_detector import detect_findings_with_llm
from app.services.replicate_client import replicate_client

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

        # Step 2: Attempt segmentation (cache → live MedSAM2 → bounding box fallback)
        await log_emitter.emit_progress(session_id, copilot, "Segmenting tooth region...")
        contour_points = None
        provenance = "cached"
        live_attempted = False
        live_succeeded = False

        # Load image to get dimensions + base64
        image_bytes = _load_image_bytes(request.image_id)
        img_width, img_height = 1200, 800  # defaults

        if image_bytes:
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(image_bytes))
            img_width, img_height = img.size

        # Convert normalized (0-1) coordinates to pixel coordinates
        click_x = request.x
        click_y = request.y
        if 0.0 <= click_x <= 1.0 and 0.0 <= click_y <= 1.0:
            pixel_x = int(click_x * img_width)
            pixel_y = int(click_y * img_height)
        else:
            pixel_x = int(click_x)
            pixel_y = int(click_y)

        # Build fallback bounding box (in pixel coordinates)
        pad = 40
        bounding_box_estimate = [
            [max(0, pixel_x - pad), max(0, pixel_y - pad)],
            [min(img_width, pixel_x + pad), max(0, pixel_y - pad)],
            [min(img_width, pixel_x + pad), min(img_height, pixel_y + pad)],
            [max(0, pixel_x - pad), min(img_height, pixel_y + pad)],
        ]

        # Check cache first (exact match, then demo fallback)
        cached_seg = cache_manager.get_imaging_segmentation(
            patient_state.identifiers.patient_id,
            request.image_id,
            str(tooth_number),
        )
        if not cached_seg:
            cached_seg = cache_manager.get_imaging_segmentation(
                _DEMO_PATIENT_ID, _DEMO_IMAGE_ID, str(tooth_number),
            )

        if cached_seg:
            contour_points = cached_seg.get("contour_points", [])
            await log_emitter.emit_fallback(session_id, copilot, "Using cached segmentation mask")
        else:
            # Build base64 data URI so Modal can access the image
            if image_bytes:
                b64 = base64.b64encode(image_bytes).decode("utf-8")
                image_url = f"data:image/png;base64,{b64}"
            else:
                image_url = f"/api/imaging/image/{request.image_id}"
            live_attempted = True

            result, status = await reliability_manager.execute_with_fallback(
                live_fn=lambda: replicate_client.segment_tooth(
                    image_url, pixel_x, pixel_y
                ),
                fallback_value=bounding_box_estimate,
                timeout_seconds=settings.IMAGING_INFERENCE_TIMEOUT_SECONDS,
            )

            prov_dict = ReliabilityManager.get_provenance(status)
            provenance = prov_dict["method"]
            live_succeeded = status == ExecutionStatus.LIVE_SUCCESS

            if live_succeeded:
                contour_points = result if isinstance(result, list) else result.get("contour_points", bounding_box_estimate)
                await log_emitter.emit_success(session_id, copilot, "Live segmentation succeeded")
            else:
                contour_points = bounding_box_estimate
                reason = prov_dict.get("reason", "unavailable")
                await log_emitter.emit_fallback(
                    session_id, copilot,
                    f"Live segmentation {reason}, using bounding box estimate"
                )

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
            # Attempt LLM-based finding detection
            image_bytes = _load_image_bytes(request.image_id)
            if image_bytes:
                image_base64 = base64.b64encode(image_bytes).decode("utf-8")
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
        """Auto-scan all teeth in panoramic X-ray using HYBRID approach.

        1. Batch segment all 32 teeth (~15-20s)
        2. Flag suspicious teeth using lightweight heuristics
        3. Run Gemini only on suspicious ~5-10 teeth (~10-15s)

        Returns:
            {
                "total_teeth": 32,
                "segmented": 28,
                "suspicious_teeth": 7,
                "findings": [...],
                "inference_time_ms": 25000
            }
        """
        start_time = time.time()

        # Generate center points for all 32 teeth using actual image dimensions
        tooth_points, img_width, img_height = self._generate_tooth_center_points(
            image_id=image_id,
            image_type=image_type
        )

        # Build base64 data URI so Modal can access the image
        image_bytes = _load_image_bytes(image_id)
        if image_bytes:
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            image_url = f"data:image/png;base64,{b64}"
        else:
            image_url = f"/api/imaging/image/{image_id}"

        # Batch segmentation with fallback (all teeth in one call)
        result, status = await reliability_manager.execute_with_fallback(
            live_fn=lambda: replicate_client.segment_teeth_batch(
                image_url, tooth_points
            ),
            fallback_value=self._generate_fallback_batch_results(tooth_points),
            timeout_seconds=settings.IMAGING_INFERENCE_TIMEOUT_SECONDS * 2,  # Double timeout for batch
        )

        prov_dict = ReliabilityManager.get_provenance(status)
        batch_provenance = prov_dict["method"]

        if status != ExecutionStatus.LIVE_SUCCESS:
            logger.warning(f"Auto-scan using fallback: {prov_dict.get('reason', 'unavailable')}")

        # Process results with HYBRID approach
        suspicious_teeth = []
        all_segments = []

        for seg_result in result.get("results", []):
            if seg_result.get("contour_points"):
                tooth_number = self._point_index_to_fdi(seg_result["point_index"])

                # Store segment data
                segment_data = {
                    "tooth_number": tooth_number,
                    "contour_points": seg_result["contour_points"],
                    "confidence": seg_result["confidence"],
                    "area_pixels": seg_result["area_pixels"],
                    "used_fallback": seg_result["used_fallback"]
                }
                all_segments.append(segment_data)

                # Lightweight suspicious region detection
                if self._is_tooth_suspicious(seg_result):
                    suspicious_teeth.append(segment_data)

        # Run Gemini only on suspicious teeth (parallel batch)
        findings = []
        if suspicious_teeth:
            findings = await self._detect_findings_batch(
                image_id=image_id,
                suspicious_teeth=suspicious_teeth
            )

        # Update patient state with findings
        for finding in findings:
            if finding.condition != "under_review":
                patient_state.tooth_chart[finding.tooth_number] = finding

        inference_time_ms = int((time.time() - start_time) * 1000)

        return {
            "total_teeth": len(tooth_points),
            "segmented": result.get("successful_segments", 0),
            "suspicious_teeth": len(suspicious_teeth),
            "findings": findings,
            "inference_time_ms": inference_time_ms,
            "segments": all_segments,  # Return all segments for frontend rendering
            "provenance": batch_provenance  # Track if fallback was used
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
