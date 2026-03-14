"""Treatment Copilot Handler (Stretch Goal)

Looks up evidence-based treatment guidelines for dental conditions.
"""

import time
from app.core.log_emitter import log_emitter
from app.api.dependencies import cache_manager
from app.models.logs import CopilotType
from app.models.treatment import TreatmentActionRequest, TreatmentActionResponse
from app.models.patient_state import PatientState, TreatmentOutput, TreatmentProvenance


class TreatmentHandler:
    """Handles treatment evidence lookup."""

    async def handle_evidence_lookup(
        self, request: TreatmentActionRequest, patient_state: PatientState
    ) -> TreatmentActionResponse:
        start_time = time.time()
        session_id = request.session_id
        copilot = CopilotType.TREATMENT

        await log_emitter.emit_info(session_id, copilot, f"Looking up evidence for: {request.condition}")

        # Check cache first
        evidence = cache_manager.get_treatment_evidence(request.condition)
        elapsed_ms = int((time.time() - start_time) * 1000)

        if evidence:
            await log_emitter.emit_success(session_id, copilot, "Found cached evidence data")
            response = TreatmentActionResponse(
                session_id=session_id,
                condition=request.condition,
                evidence_summary=evidence.get("summary"),
                success_rate=evidence.get("success_rate"),
                risk_factors=evidence.get("risk_factors"),
                alternatives=evidence.get("alternatives"),
                referral_summary=evidence.get("referral_summary"),
                patient_education=evidence.get("patient_education"),
                provenance="cached",
                inference_time_ms=elapsed_ms,
            )
        else:
            await log_emitter.emit_fallback(session_id, copilot, "No cached evidence, returning placeholder")
            response = TreatmentActionResponse(
                session_id=session_id,
                condition=request.condition,
                evidence_summary=f"Evidence-based treatment information for {request.condition} is being compiled.",
                provenance="placeholder",
                inference_time_ms=elapsed_ms,
            )

        # Update patient state
        patient_state.treatment_output = TreatmentOutput(
            evidence_summary=response.evidence_summary,
            success_rate=response.success_rate,
            risk_factors=response.risk_factors,
            alternatives=response.alternatives,
            referral_summary=response.referral_summary,
            patient_education=response.patient_education,
        )
        patient_state.treatment_provenance = TreatmentProvenance(
            fallback_used=True, duration_ms=elapsed_ms,
        )

        return response
