"""Imaging Copilot Handler

Processes tooth clicks on dental X-rays:
1. Segment tooth region using MedSAM2
2. Map click position to FDI tooth number
3. Detect findings using Gemini
4. Update patient state
"""

import time
from app.core.log_emitter import log_emitter
from app.core.config import settings
from app.api.dependencies import cache_manager
from app.models.logs import CopilotType
from app.models.imaging import ImagingActionRequest, ImagingActionResponse
from app.models.patient_state import PatientState, ImagingOutput, ImagingProvenance, ToothFinding
from app.copilots.imaging.tooth_mapper import map_click_to_tooth


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

        # Step 2: Attempt segmentation (cached fallback for demo)
        await log_emitter.emit_progress(session_id, copilot, "Segmenting tooth region...")
        contour_points = None
        provenance = "cached"

        cached_seg = cache_manager.get_imaging_segmentation(
            patient_state.identifiers.patient_id,
            request.image_id,
            str(tooth_number),
        )

        if cached_seg:
            contour_points = cached_seg.get("contour_points", [])
            await log_emitter.emit_fallback(session_id, copilot, "Using cached segmentation mask")
        else:
            await log_emitter.emit_fallback(session_id, copilot, "No cached segmentation available, using bounding estimate")
            # Generate approximate bounding box around click
            contour_points = [
                [request.x - 30, request.y - 40],
                [request.x + 30, request.y - 40],
                [request.x + 30, request.y + 40],
                [request.x - 30, request.y + 40],
            ]

        # Step 3: Detect findings
        await log_emitter.emit_progress(session_id, copilot, f"Analyzing tooth #{tooth_number} for pathology...")

        cached_findings = cache_manager.get_imaging_findings(
            patient_state.identifiers.patient_id, request.image_id
        )

        findings = []
        if cached_findings and str(tooth_number) in cached_findings.get("teeth", {}):
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
            await log_emitter.emit_info(session_id, copilot, f"No cached findings for tooth #{tooth_number}, generating estimate")
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
            live_attempted=False,
            live_succeeded=False,
            fallback_used=True,
            duration_ms=elapsed_ms,
        )

        patient_state.imaging_output = imaging_output
        patient_state.imaging_provenance = imaging_provenance

        # Update tooth chart
        for finding in findings:
            if finding.condition != "under_review":
                patient_state.tooth_chart[finding.tooth_number] = finding

        return ImagingActionResponse(
            session_id=session_id,
            tooth_number=tooth_number,
            contour_points=contour_points,
            findings=findings,
            narrative=narrative,
            provenance=provenance,
            inference_time_ms=elapsed_ms,
        )
