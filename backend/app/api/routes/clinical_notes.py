"""Clinical Notes Routes

Endpoints for clinical notes analysis.
"""

from fastapi import APIRouter, HTTPException

from app.core.session_manager import session_manager
from app.models.clinical_notes import (
    ClinicalNotesActionRequest,
    ClinicalNotesActionResponse,
    ClinicalNotesChatRequest,
    ClinicalNotesChatResponse,
)

router = APIRouter(prefix="/clinical-notes", tags=["Clinical Notes"])


@router.post("/action", response_model=ClinicalNotesActionResponse)
async def clinical_notes_action(request: ClinicalNotesActionRequest):
    """Analyze highlighted clinical notes text.

    Extracts diagnoses, maps to treatment protocols, generates timeline.
    """
    patient_state = session_manager.get_session(request.session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    from app.copilots.clinical_notes.handler import ClinicalNotesHandler
    handler = ClinicalNotesHandler()
    response = await handler.handle_text_highlight(request, patient_state)

    session_manager.update_session(request.session_id, patient_state)
    return response


@router.post("/chat", response_model=ClinicalNotesChatResponse)
async def clinical_notes_chat(request: ClinicalNotesChatRequest):
    """Chat about clinical notes with AI."""
    patient_state = session_manager.get_session(request.session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    from app.services.llm_client import llm_client

    if not llm_client.is_available:
        return ClinicalNotesChatResponse(
            session_id=request.session_id,
            response="Chat requires a configured LLM. Set GOOGLE_API_KEY in your .env file.",
        )

    # Build clinical context from patient state
    context_parts = []
    if patient_state.tooth_chart:
        findings_str = ", ".join(
            f"#{num} {f.condition} ({f.severity})"
            for num, f in patient_state.tooth_chart.items()
        )
        context_parts.append(f"Current findings: {findings_str}")

    if patient_state.clinical_notes_output:
        out = patient_state.clinical_notes_output
        if out.dentist_summary:
            context_parts.append(f"Clinical assessment:\n{out.dentist_summary}")

    if request.context:
        context_parts.append(f"Additional context: {request.context}")

    context = "\n\n".join(context_parts)

    try:
        reply = await llm_client.chat(request.message, context=context)
        return ClinicalNotesChatResponse(
            session_id=request.session_id,
            response=reply,
        )
    except Exception as e:
        return ClinicalNotesChatResponse(
            session_id=request.session_id,
            response=f"Error communicating with LLM: {str(e)}",
        )
