"""Finding Detector

Uses Gemini vision to analyze dental X-ray regions and identify conditions.
Falls back to empty list if Gemini is unavailable or call fails,
so the handler's cache fallback kicks in.
"""

import base64
import json
import logging
from typing import Optional

from app.models.patient_state import ToothFinding
from app.services.llm_client import llm_client

logger = logging.getLogger(__name__)


async def detect_findings_with_llm(
    image_base64: str,
    tooth_number: int,
    image_type: str = "panoramic",
) -> list[ToothFinding]:
    """Detect dental findings using Gemini vision model.

    Decodes the base64 image, calls Gemini with a dental radiologist prompt,
    and parses the structured JSON response into ToothFinding objects.

    Returns [] on any failure so the handler's cache fallback kicks in.
    """
    # Guard: skip if no API key configured
    if not llm_client.is_available:
        logger.warning("Gemini API key not configured — skipping LLM finding detection")
        return []

    try:
        prompt = (
            "You are a dental radiologist. List all pathological findings visible in this "
            "cropped X-ray region. Respond ONLY with a JSON array of objects, each with: "
            '{"condition": str, "severity": "mild|moderate|severe", "confidence": 0.0-1.0, '
            '"location_description": str}. Use snake_case conditions: cavity, bone_loss, '
            "periapical_lesion, impacted, fracture, root_resorption, cyst, abscess, "
            "crown_defect, missing. Return [] if no pathology visible."
        )

        # Decode base64 image to raw bytes
        image_bytes = base64.b64decode(image_base64)

        # Call Gemini vision via llm_client
        raw = await llm_client.extract_dental_findings(image_bytes, prompt)

        # Parse candidates[0].content.parts[0].text → list[dict]
        text = llm_client._extract_text(raw)
        if not text:
            logger.warning("Empty response text from Gemini vision")
            return []

        # Strip markdown fences if present despite response_mime_type
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()

        parsed = json.loads(cleaned)
        if not isinstance(parsed, list):
            parsed = [parsed] if isinstance(parsed, dict) else []

        # Map each dict to ToothFinding
        findings: list[ToothFinding] = []
        for item in parsed:
            try:
                findings.append(ToothFinding(
                    tooth_number=tooth_number,
                    condition=item.get("condition", "under_review"),
                    severity=item.get("severity", "moderate"),
                    confidence=float(item.get("confidence", 0.5)),
                    location_description=item.get("location_description", ""),
                ))
            except Exception as e:
                logger.warning(f"Failed to parse finding item {item}: {e}")
                continue

        logger.info(f"Gemini vision detected {len(findings)} finding(s) for tooth #{tooth_number}")
        return findings

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        return []
    except Exception as e:
        logger.error(f"Finding detection failed: {e}")
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
