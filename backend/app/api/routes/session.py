"""Session Routes

CRUD endpoints for session management.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional

from app.core import session_manager, log_emitter
from app.core.profile_manager import profile_manager
from app.models import PatientState


class CreateSessionRequest(BaseModel):
    case_id: str = Field(default="dental-001")
    patient_id: str = Field(default="aidan-jeon")


class SessionResponse(BaseModel):
    session_id: str
    status: str
    patient_state: Optional[PatientState] = None
    profile: Optional[dict] = None


class SessionInfoResponse(BaseModel):
    session_id: str
    status: str
    age_seconds: Optional[float] = None
    has_imaging_output: bool = False
    has_clinical_notes_output: bool = False
    has_treatment_output: bool = False


class SessionListResponse(BaseModel):
    sessions: list
    count: int


class DeleteSessionResponse(BaseModel):
    session_id: str
    status: str


router = APIRouter(prefix="/session", tags=["Session"])


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: CreateSessionRequest = CreateSessionRequest()):
    patient_state = session_manager.create_session(
        case_id=request.case_id,
        patient_id=request.patient_id,
    )
    # Load profile data if available
    profile = profile_manager.get_profile(request.patient_id)
    return SessionResponse(
        session_id=patient_state.identifiers.session_id,
        status="created",
        patient_state=patient_state,
        profile=profile,
    )


@router.get("", response_model=SessionListResponse)
async def list_sessions():
    sessions = session_manager.list_sessions()
    return SessionListResponse(sessions=sessions, count=len(sessions))


@router.get("/{session_id}", response_model=SessionInfoResponse)
async def get_session_info(session_id: str):
    patient_state = session_manager.get_session(session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return SessionInfoResponse(
        session_id=session_id,
        status="active",
        age_seconds=session_manager.get_session_age(session_id),
        has_imaging_output=patient_state.imaging_output is not None,
        has_clinical_notes_output=patient_state.clinical_notes_output is not None,
        has_treatment_output=patient_state.treatment_output is not None,
    )


@router.get("/{session_id}/state", response_model=PatientState)
async def get_patient_state(session_id: str):
    patient_state = session_manager.get_session(session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return patient_state


@router.delete("/{session_id}", response_model=DeleteSessionResponse)
async def delete_session(session_id: str):
    if not session_manager.session_exists(session_id):
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    log_emitter.cleanup_session(session_id)
    session_manager.delete_session(session_id)
    return DeleteSessionResponse(session_id=session_id, status="deleted")
