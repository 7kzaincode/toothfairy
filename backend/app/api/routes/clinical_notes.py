"""Clinical Notes Routes

Endpoints for clinical notes analysis.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from datetime import datetime

from app.core.config import settings
from app.core.session_manager import session_manager
from app.models.clinical_notes import (
    ClinicalNotesActionRequest,
    ClinicalNotesActionResponse,
    ClinicalNotesChatRequest,
    ClinicalNotesChatResponse,
)

router = APIRouter(prefix="/clinical-notes", tags=["Clinical Notes"])


@router.post("/action", response_model=ClinicalNotesActionResponse)
async def clinical_notes_action(
    request: ClinicalNotesActionRequest,
    background_tasks: BackgroundTasks,
):
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

    # Fire-and-forget: ingest session into Moorcheh for longitudinal memory
    try:
        from app.services.moorcheh_client import moorcheh_service
        if moorcheh_service.is_available:
            background_tasks.add_task(
                moorcheh_service.ingest_session,
                patient_id=patient_state.identifiers.patient_id,
                session_data=patient_state.model_dump(mode="json"),
                session_date=patient_state.last_updated_at.isoformat()[:10],
            )
    except ImportError:
        pass  # moorcheh_sdk not installed

    return response


@router.post("/chat", response_model=ClinicalNotesChatResponse)
async def clinical_notes_chat(request: ClinicalNotesChatRequest, background_tasks: BackgroundTasks):
    """Chat about clinical notes with AI."""
    patient_state = session_manager.get_session(request.session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    from app.services.llm_client import llm_client

    if not llm_client.is_available or settings.DEMO_MODE:
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

    # Retrieve historical patient context from Moorcheh (RAG)
    try:
        from app.services.moorcheh_client import moorcheh_service
        if moorcheh_service.is_available:
            history = await moorcheh_service.retrieve_history(
                patient_id=patient_state.identifiers.patient_id,
                query=request.message,
            )
            if history:
                context_parts.append(
                    f"Here is the exact historical context retrieved for this patient:\n{history}"
                )
    except ImportError:
        pass  # moorcheh_sdk not installed

    context = "\n\n".join(context_parts)

    try:
        reply = await llm_client.chat(request.message, context=context)

        # Ingest chat exchange into Moorcheh for longitudinal memory
        try:
            from app.services.moorcheh_client import moorcheh_service
            if moorcheh_service.is_available:
                chat_text = (
                    f"Chat exchange on {datetime.now().isoformat()[:10]}:\n"
                    f"Dentist: {request.message}\n"
                    f"AI Assistant: {reply}"
                )
                from moorcheh_sdk.types.document import Document
                background_tasks.add_task(
                    moorcheh_service.ingest_chat_message,
                    patient_id=patient_state.identifiers.patient_id,
                    chat_text=chat_text,
                )
        except ImportError:
            pass

        return ClinicalNotesChatResponse(
            session_id=request.session_id,
            response=reply,
        )
    except Exception as e:
        return ClinicalNotesChatResponse(
            session_id=request.session_id,
            response=f"Error communicating with LLM: {str(e)}",
        )
