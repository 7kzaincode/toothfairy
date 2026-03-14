"""Finding Detector

Uses Gemini to analyze dental X-ray regions and identify conditions.
Falls back to heuristic detection if Gemini is unavailable.
"""

from typing import Optional
from app.models.patient_state import ToothFinding


async def detect_findings_with_llm(
    image_base64: str,
    tooth_number: int,
    image_type: str = "panoramic",
) -> list[ToothFinding]:
    """Detect dental findings using Gemini vision model.

    TODO: Implement with google-generativeai when API key is available.
    For now, returns empty list (handler falls back to cached findings).
    """
    return []


def get_common_conditions() -> list[str]:
    """List of dental conditions the system can detect."""
    return [
        "cavity",
        "bone_loss",
        "periapical_lesion",
        "impacted",
        "fracture",
        "root_resorption",
        "cyst",
        "abscess",
        "crown_defect",
        "missing",
    ]
