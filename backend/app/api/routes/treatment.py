"""Treatment Routes

Endpoints for treatment evidence lookup (stretch goal).
"""

from fastapi import APIRouter, HTTPException

from app.core.session_manager import session_manager
from app.models.treatment import TreatmentActionRequest, TreatmentActionResponse

router = APIRouter(prefix="/treatment", tags=["Treatment"])


@router.post("/action", response_model=TreatmentActionResponse)
async def treatment_action(request: TreatmentActionRequest):
    """Look up evidence-based treatment for a dental condition."""
    patient_state = session_manager.get_session(request.session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    from app.copilots.treatment.handler import TreatmentHandler
    handler = TreatmentHandler()
    response = await handler.handle_evidence_lookup(request, patient_state)

    session_manager.update_session(request.session_id, patient_state)
    return response
