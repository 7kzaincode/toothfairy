"""Imaging Copilot Handler

Processes tooth clicks on dental X-rays:
1. Map click position to FDI tooth number
2. Segment tooth region using MedSAM2 (via ReliabilityManager)
3. Detect findings using Gemini vision
4. Update patient state
"""

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
from app.copilots.imaging.tooth_mapper import map_click_to_tooth
from app.copilots.imaging.finding_detector import detect_findings_with_llm
from app.services.replicate_client import replicate_client

logger = logging.getLogger(__name__)

XRAY_DIR = settings.ASSETS_ROOT_DIR / "xrays"


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

        # Step 1: Map click to tooth number
        await log_emitter.emit_progress(session_id, copilot, "Mapping click position to tooth number...")
        tooth_number = map_click_to_tooth(request.x, request.y, request.image_type)
        await log_emitter.emit_info(session_id, copilot, f"Identified FDI tooth #{tooth_number}")

        # Step 2: Attempt segmentation (cache → live MedSAM2 → bounding box fallback)
        await log_emitter.emit_progress(session_id, copilot, "Segmenting tooth region...")
        contour_points = None
        provenance = "cached"
        live_attempted = False
        live_succeeded = False

        # Build fallback bounding box
        bounding_box_estimate = [
            [request.x - 30, request.y - 40],
            [request.x + 30, request.y - 40],
            [request.x + 30, request.y + 40],
            [request.x - 30, request.y + 40],
        ]

        # Check cache first
        cached_seg = cache_manager.get_imaging_segmentation(
            patient_state.identifiers.patient_id,
            request.image_id,
            str(tooth_number),
        )

        if cached_seg:
            contour_points = cached_seg.get("contour_points", [])
            await log_emitter.emit_fallback(session_id, copilot, "Using cached segmentation mask")
        else:
            # Attempt live segmentation via ReliabilityManager
            image_url = f"/api/imaging/image/{request.image_id}"
            live_attempted = True

            result, status = await reliability_manager.execute_with_fallback(
                live_fn=lambda: replicate_client.segment_tooth(
                    image_url, request.x, request.y
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

            # If both cache and LLM returned nothing, use placeholder
            if not findings:
                await log_emitter.emit_info(session_id, copilot, f"No findings detected for tooth #{tooth_number}")
                findings.append(ToothFinding(
                    tooth_number=tooth_number,
                    condition="under_review",
                    severity="mild",
                    confidence=0.5,
                    location_description="Requires further analysis",
                ))

        # Step 4: Generate narrative
        if findings and findings[0].condition != "under_review":
            narrative = f"Tooth #{tooth_number}: {', '.join(f.condition.replace('_', ' ') for f in findings)}. "
            narrative += f"Severity: {findings[0].severity}. Confidence: {findings[0].confidence:.0%}."
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

        # Update tooth chart
        for finding in findings:
            if finding.condition != "under_review":
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
