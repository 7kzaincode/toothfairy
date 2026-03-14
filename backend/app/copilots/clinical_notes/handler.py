"""Clinical Notes Copilot Handler

Processes highlighted clinical notes text:
1. Extract diagnoses (tooth numbers, conditions, severity)
2. Map conditions to treatment protocols
3. Generate urgency-ranked timeline
4. Generate patient + dentist summaries
"""

import time
from app.core.log_emitter import log_emitter
from app.api.dependencies import cache_manager
from app.models.logs import CopilotType
from app.models.clinical_notes import ClinicalNotesActionRequest, ClinicalNotesActionResponse
from app.models.patient_state import (
    PatientState, ClinicalNotesOutput, ClinicalNotesProvenance,
    ToothFinding, TreatmentProtocol,
)
from app.copilots.clinical_notes.extractor import extract_dental_diagnoses
from app.copilots.clinical_notes.protocol_mapper import map_condition_to_protocol
from app.copilots.clinical_notes.timeline_generator import generate_timeline


class ClinicalNotesHandler:
    """Handles clinical notes analysis."""

    async def handle_text_highlight(
        self, request: ClinicalNotesActionRequest, patient_state: PatientState
    ) -> ClinicalNotesActionResponse:
        start_time = time.time()
        session_id = request.session_id
        copilot = CopilotType.CLINICAL_NOTES

        await log_emitter.emit_info(session_id, copilot, "Clinical notes copilot activated")
        await log_emitter.emit_progress(session_id, copilot, "Extracting diagnoses from highlighted text...")

        # Step 1: Extract diagnoses
        diagnoses = extract_dental_diagnoses(request.highlighted_text)
        await log_emitter.emit_info(
            session_id, copilot,
            f"Extracted {len(diagnoses)} diagnosis(es) from text"
        )

        # Step 2: Map to treatment protocols
        await log_emitter.emit_progress(session_id, copilot, "Mapping conditions to treatment protocols...")
        protocols = []
        for diag in diagnoses:
            protocol = map_condition_to_protocol(diag.condition, diag.tooth_number, diag.severity)
            if protocol:
                protocols.append(protocol)
                await log_emitter.emit_info(
                    session_id, copilot,
                    f"#{diag.tooth_number} {diag.condition} -> {protocol.recommended_treatment} ({protocol.urgency})"
                )

        # Step 3: Generate timeline
        await log_emitter.emit_progress(session_id, copilot, "Generating treatment timeline...")
        timeline = generate_timeline(protocols)

        # Step 4: Generate summaries
        await log_emitter.emit_progress(session_id, copilot, "Generating clinical summaries...")

        patient_summary = self._generate_patient_summary(diagnoses, protocols)
        dentist_summary = self._generate_dentist_summary(diagnoses, protocols)

        elapsed_ms = int((time.time() - start_time) * 1000)

        await log_emitter.emit_success(
            session_id, copilot,
            f"Analysis complete: {len(diagnoses)} diagnoses, {len(protocols)} treatment plans"
        )

        # Update patient state
        clinical_output = ClinicalNotesOutput(
            diagnoses=diagnoses,
            treatment_protocols=protocols,
            treatment_timeline=timeline,
            patient_summary=patient_summary,
            dentist_summary=dentist_summary,
        )
        patient_state.clinical_notes_output = clinical_output
        patient_state.clinical_notes_provenance = ClinicalNotesProvenance(duration_ms=elapsed_ms)

        # Update tooth chart
        for diag in diagnoses:
            patient_state.tooth_chart[diag.tooth_number] = diag

        return ClinicalNotesActionResponse(
            session_id=session_id,
            diagnoses=diagnoses,
            treatment_protocols=protocols,
            treatment_timeline=timeline,
            patient_summary=patient_summary,
            dentist_summary=dentist_summary,
            provenance="rule-based",
            inference_time_ms=elapsed_ms,
        )

    def _generate_patient_summary(self, diagnoses: list[ToothFinding], protocols: list[TreatmentProtocol]) -> str:
        if not protocols:
            return "No specific treatment needed at this time."
        lines = ["Here's what we found and what we recommend:\n"]
        for p in protocols:
            tooth_str = f"Tooth #{p.tooth_number}" if p.tooth_number else "General"
            lines.append(f"- {tooth_str}: {p.patient_explanation or p.recommended_treatment}")
        return "\n".join(lines)

    def _generate_dentist_summary(self, diagnoses: list[ToothFinding], protocols: list[TreatmentProtocol]) -> str:
        if not protocols:
            return "No actionable findings in highlighted text."
        lines = ["Clinical Assessment:\n"]
        for p in protocols:
            cdt = f" (CDT: {p.cdt_code})" if p.cdt_code else ""
            lines.append(f"- #{p.tooth_number} {p.condition}: {p.recommended_treatment}{cdt} - Urgency: {p.urgency}")
        return "\n".join(lines)
