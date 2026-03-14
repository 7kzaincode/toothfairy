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

    # Placeholder — will be implemented with Gemini
    return ClinicalNotesChatResponse(
        session_id=request.session_id,
        response="Chat functionality will be available soon.",
    )
