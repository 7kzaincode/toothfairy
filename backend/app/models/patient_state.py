"""Patient State Models

Pydantic models for the dental patient state schema.
In-memory session-scoped patient data shared between copilots.
"""

from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field


# =====================
# Identifiers
# =====================
class SessionIdentifiers(BaseModel):
    """Session and patient identifiers."""
    session_id: str = Field(..., description="Unique session ID")
    case_id: str = Field(default="demo-dental-001", description="Case identifier")
    patient_id: str = Field(default="patient-001", description="Patient ID")


# =====================
# Tooth Finding
# =====================
class ToothFinding(BaseModel):
    """A clinical finding associated with a specific tooth."""
    tooth_number: int = Field(..., description="FDI tooth number (11-48)")
    condition: str = Field(..., description="cavity, bone_loss, periapical_lesion, impacted, fracture, etc.")
    severity: str = Field(default="moderate", description="mild, moderate, severe")
    confidence: float = Field(default=0.8, description="AI confidence 0-1")
    location_description: str = Field(default="", description="e.g. mesial surface, distal, buccal")


# =====================
# Treatment Protocol
# =====================
class TreatmentProtocol(BaseModel):
    """A recommended treatment for a dental condition."""
    condition: str = Field(..., description="The dental condition")
    tooth_number: Optional[int] = Field(default=None, description="FDI tooth number")
    recommended_treatment: str = Field(..., description="e.g. Composite restoration, Root canal therapy")
    urgency: str = Field(default="routine", description="immediate, soon, routine, monitor")
    estimated_visits: int = Field(default=1, description="Number of visits needed")
    patient_explanation: str = Field(default="", description="Patient-friendly explanation")
    cdt_code: Optional[str] = Field(default=None, description="CDT insurance code")
    estimated_cost: Optional[str] = Field(default=None, description="Estimated cost range")


# =====================
# Imaging Data
# =====================
class ImagingArtifact(BaseModel):
    """Dental X-ray imaging artifacts."""
    image_id: Optional[str] = Field(default=None, description="Uploaded image ID")
    image_type: Optional[str] = Field(default=None, description="periapical, panoramic, bitewing")
    image_path: Optional[str] = Field(default=None, description="Path to image file")


class ImagingOutput(BaseModel):
    """Imaging copilot output."""
    segmentation_provenance: str = Field(default="none", description="'live' or 'cached'")
    contour_points: Optional[list[list[float]]] = Field(default=None, description="Contour polygon as [[x,y], ...] points")
    tooth_number: Optional[int] = Field(default=None, description="FDI tooth number identified")
    findings: Optional[list[ToothFinding]] = Field(default=None, description="Detected findings for the tooth")
    measurements: Optional[dict] = Field(default=None, description="Size measurements")
    narrative_summary: Optional[str] = Field(default=None, description="Clinical summary sentence")


class ImagingProvenance(BaseModel):
    """Imaging action provenance tracking."""
    live_attempted: bool = Field(default=False)
    live_succeeded: bool = Field(default=False)
    fallback_used: bool = Field(default=False)
    timestamp: Optional[datetime] = Field(default=None)
    duration_ms: Optional[int] = Field(default=None)
    error_message: Optional[str] = Field(default=None)


# =====================
# Clinical Notes Data
# =====================
class ClinicalNotesArtifact(BaseModel):
    """Clinical notes artifacts."""
    notes_text: Optional[str] = Field(default=None, description="Full clinical notes text")


class ClinicalNotesOutput(BaseModel):
    """Clinical notes copilot output."""
    diagnoses: Optional[list[ToothFinding]] = Field(default=None, description="Extracted dental diagnoses")
    protocols: Optional[list[TreatmentProtocol]] = Field(default=None, description="Mapped treatment protocols")
    timeline: Optional[list[dict]] = Field(default=None, description="Urgency-sorted treatment timeline")
    patient_summary: Optional[str] = Field(default=None, description="Patient-friendly summary")
    dentist_summary: Optional[str] = Field(default=None, description="Dentist-facing summary")


class ClinicalNotesProvenance(BaseModel):
    """Clinical notes action provenance."""
    timestamp: Optional[datetime] = Field(default=None)
    duration_ms: Optional[int] = Field(default=None)
    fallback_used: bool = Field(default=False, description="Whether regex fallback was used")


# =====================
# Treatment & Evidence Data
# =====================
class TreatmentArtifact(BaseModel):
    """Treatment copilot artifacts."""
    selected_condition: Optional[str] = Field(default=None)
    selected_tooth: Optional[int] = Field(default=None)


class TreatmentOutput(BaseModel):
    """Treatment & evidence copilot output."""
    evidence_summary: Optional[str] = Field(default=None, description="Evidence-based treatment summary")
    success_rate: Optional[str] = Field(default=None, description="Treatment success rate e.g. '85-95%'")
    risk_factors: Optional[list[str]] = Field(default=None, description="Risk factors to consider")
    alternatives: Optional[list[str]] = Field(default=None, description="Alternative treatments")
    referral_summary: Optional[str] = Field(default=None, description="Specialist referral summary")
    patient_education: Optional[str] = Field(default=None, description="Patient education material")


class TreatmentProvenance(BaseModel):
    """Treatment action provenance."""
    live_attempted: bool = Field(default=False)
    live_succeeded: bool = Field(default=False)
    fallback_used: bool = Field(default=False)
    timestamp: Optional[datetime] = Field(default=None)
    duration_ms: Optional[int] = Field(default=None)


# =====================
# Consolidated Patient State
# =====================
class PatientState(BaseModel):
    """Complete in-memory session-scoped dental patient state."""

    identifiers: SessionIdentifiers

    # Artifacts (input data)
    imaging_artifact: Optional[ImagingArtifact] = Field(default=None)
    clinical_notes_artifact: Optional[ClinicalNotesArtifact] = Field(default=None)
    treatment_artifact: Optional[TreatmentArtifact] = Field(default=None)

    # Outputs (copilot results)
    imaging_output: Optional[ImagingOutput] = Field(default=None)
    clinical_notes_output: Optional[ClinicalNotesOutput] = Field(default=None)
    treatment_output: Optional[TreatmentOutput] = Field(default=None)

    # Provenance (action metadata)
    imaging_provenance: Optional[ImagingProvenance] = Field(default=None)
    clinical_notes_provenance: Optional[ClinicalNotesProvenance] = Field(default=None)
    treatment_provenance: Optional[TreatmentProvenance] = Field(default=None)

    # Tooth chart: tooth_number -> most recent finding
    tooth_chart: dict[int, ToothFinding] = Field(default_factory=dict)

    # Session metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
    action_count: int = Field(default=0)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "identifiers": {
                    "session_id": "sess-abc123",
                    "case_id": "demo-dental-001",
                    "patient_id": "patient-001",
                },
                "tooth_chart": {
                    "14": {
                        "tooth_number": 14,
                        "condition": "cavity",
                        "severity": "moderate",
                        "confidence": 0.85,
                        "location_description": "mesial-occlusal-distal surfaces",
                    }
                },
                "created_at": "2026-03-13T12:00:00",
                "action_count": 1,
            }
        }
    )

    def update_timestamp(self):
        """Update last modified timestamp."""
        self.last_updated_at = datetime.utcnow()

    def increment_action_count(self):
        """Increment action counter after copilot action."""
        self.action_count += 1
        self.update_timestamp()
