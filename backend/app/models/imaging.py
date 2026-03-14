"""Imaging Copilot Request/Response Models"""

from typing import Optional
from pydantic import BaseModel, Field
from app.models.patient_state import ToothFinding


class ImagingActionRequest(BaseModel):
    """Request for imaging copilot action (tooth click)."""
    session_id: str = Field(..., description="Session ID")
    image_id: str = Field(..., description="Uploaded image ID")
    x: float = Field(..., description="Click x coordinate (0-1 normalized or pixel)")
    y: float = Field(..., description="Click y coordinate (0-1 normalized or pixel)")
    image_type: str = Field(default="panoramic", description="periapical, panoramic, bitewing")


class ImagingActionResponse(BaseModel):
    """Response from imaging copilot."""
    session_id: str
    tooth_number: Optional[int] = None
    contour_points: Optional[list[list[float]]] = None
    findings: Optional[list[ToothFinding]] = None
    measurements: Optional[dict] = None
    narrative: Optional[str] = None
    provenance: str = "cached"
    inference_time_ms: Optional[int] = None


class ImageUploadResponse(BaseModel):
    """Response from image upload."""
    image_id: str
    image_type: str
    status: str = "uploaded"


class ImageListResponse(BaseModel):
    """Response listing available images."""
    images: list[dict]
    count: int
