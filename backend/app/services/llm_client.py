"""
Gemini LLM Client

Wraps google-genai for dental AI tasks:
- Clinical notes structured extraction
- Dental X-ray finding detection (vision)
- Follow-up chat with clinical context
"""

import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"

CLINICAL_NOTES_SYSTEM_PROMPT = """You are a dental clinician AI assistant. Your job is to extract structured diagnoses from clinical notes text.

For each finding, return a JSON array of objects with these exact fields:
- tooth_number: integer (FDI numbering 11-48, or 0 if no specific tooth mentioned)
- condition: string (one of: cavity, periapical_lesion, bone_loss, impacted, fracture, gingivitis, abscess, crown_defect, missing, root_resorption). IMPORTANT: Use periapical_lesion instead of root_canal_needed — root canal is a treatment, not a diagnosis. Never return root_canal_needed.
- severity: string (one of: mild, moderate, severe)
- confidence: float (0.0 to 1.0)
- location_description: string (anatomical location ONLY — e.g. "mesial-occlusal-distal surface", "periapical region at root apex", "buccal impaction", "horizontal bone loss". Do NOT include symptoms, test results, or clinical reasoning here.)

Return ONLY valid JSON. No markdown, no explanation. Example:
[{"tooth_number": 14, "condition": "cavity", "severity": "moderate", "confidence": 0.92, "location_description": "MOD surface extending to dentin"}]"""

DENTAL_FINDINGS_SYSTEM_PROMPT = """You are a dental radiologist AI. Analyze the provided dental X-ray region and identify all pathological findings.

Return a JSON array of objects with these exact fields:
- tooth_number: integer (FDI numbering 11-48, or 0 if unclear)
- condition: string (one of: cavity, periapical_lesion, bone_loss, impacted, root_canal_needed, fracture, gingivitis, abscess, crown_defect, missing, root_resorption)
- severity: string (one of: mild, moderate, severe)
- confidence: float (0.0 to 1.0)
- location_description: string (brief radiographic description)

Return ONLY valid JSON. No markdown, no explanation."""

CHAT_SYSTEM_PROMPT = """You are a dental clinical assistant AI embedded in a dental IDE called Tooth Fairy. You help dentists analyze findings, answer clinical questions, and explain treatment options.

Be concise, clinically accurate, and reference specific tooth numbers and conditions when relevant. If patient context is provided, use it to give personalized answers."""


class LLMClient:
    """Wrapper around Google Gemini API."""

    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self._client = None

    def _ensure_client(self):
        """Lazily create the Gemini client."""
        if self._client:
            return
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set. Cannot use Gemini.")
        self._client = genai.Client(api_key=self.api_key)

    @property
    def is_available(self) -> bool:
        """Check if Gemini is configured and usable."""
        return bool(self.api_key)

    async def parse_clinical_notes(self, text: str) -> list[dict]:
        """Parse clinical notes into structured diagnoses."""
        self._ensure_client()

        logger.info("Calling Gemini for clinical notes extraction")
        response = await self._client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=f"{CLINICAL_NOTES_SYSTEM_PROMPT}\n\nClinical notes to analyze:\n\n{text}",
        )

        return self._parse_json_response(response.text)

    async def extract_dental_findings(self, image_bytes: bytes, prompt: str = "") -> list[dict]:
        """Extract dental findings from X-ray image using Gemini vision."""
        self._ensure_client()

        full_prompt = DENTAL_FINDINGS_SYSTEM_PROMPT
        if prompt:
            full_prompt += f"\n\nAdditional context: {prompt}"

        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

        logger.info("Calling Gemini vision for dental finding detection")
        response = await self._client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=[full_prompt, image_part],
        )

        return self._parse_json_response(response.text)

    async def chat(self, message: str, context: str = "") -> str:
        """General chat completion with clinical context."""
        self._ensure_client()

        prompt = CHAT_SYSTEM_PROMPT
        if context:
            prompt += f"\n\nCurrent patient context:\n{context}"
        prompt += f"\n\nDentist's question: {message}"

        logger.info("Calling Gemini for clinical chat")
        response = await self._client.aio.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        return response.text

    def _parse_json_response(self, text: str) -> list[dict]:
        """Parse a JSON array from Gemini's response text."""
        cleaned = text.strip()

        # Strip markdown code fences if present
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict):
                return [parsed]
            logger.warning(f"Unexpected JSON type from Gemini: {type(parsed)}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini JSON response: {e}\nRaw: {text[:200]}")
            return []


llm_client = LLMClient()
