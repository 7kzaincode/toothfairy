"""Clinical Notes Copilot Request/Response Models"""

from typing import Optional
from pydantic import BaseModel, Field
from app.models.patient_state import ToothFinding, TreatmentProtocol


class ClinicalNotesActionRequest(BaseModel):
    """Request for clinical notes copilot action."""
    session_id: str = Field(..., description="Session ID")
    highlighted_text: str = Field(..., description="Selected text from clinical notes")
    full_notes: Optional[str] = Field(default=None, description="Full clinical notes for context")


class ClinicalNotesActionResponse(BaseModel):
    """Response from clinical notes copilot."""
    session_id: str
    diagnoses: Optional[list[ToothFinding]] = None
    treatment_protocols: Optional[list[TreatmentProtocol]] = None
    treatment_timeline: Optional[list[dict]] = None
    patient_summary: Optional[str] = None
    dentist_summary: Optional[str] = None
    provenance: str = "live"
    inference_time_ms: Optional[int] = None


class ClinicalNotesChatRequest(BaseModel):
    """Request for clinical notes chat."""
    session_id: str
    message: str
    context: Optional[str] = None


class ClinicalNotesChatResponse(BaseModel):
    """Response from clinical notes chat."""
    session_id: str
    response: str
    sources: Optional[list[str]] = None
