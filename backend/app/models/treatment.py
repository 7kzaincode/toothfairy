"""Treatment & Evidence Copilot Request/Response Models"""

from typing import Optional
from pydantic import BaseModel, Field


class TreatmentActionRequest(BaseModel):
    """Request for treatment evidence lookup."""
    session_id: str = Field(..., description="Session ID")
    condition: str = Field(..., description="Dental condition to look up")
    tooth_number: Optional[int] = Field(default=None, description="FDI tooth number")


class TreatmentActionResponse(BaseModel):
    """Response from treatment copilot."""
    session_id: str
    condition: str
    evidence_summary: Optional[str] = None
    success_rate: Optional[float] = None
    risk_factors: Optional[list[str]] = None
    alternatives: Optional[list[dict]] = None
    referral_summary: Optional[str] = None
    patient_education: Optional[str] = None
    provenance: str = "cached"
    inference_time_ms: Optional[int] = None
