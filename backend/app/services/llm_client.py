"""
Gemini LLM Client

Wraps the Gemini REST API via httpx for dental AI tasks:
- Clinical notes structured extraction
- Dental X-ray finding detection (vision)
- Follow-up chat with clinical context

Uses raw httpx async calls with base64 image encoding.
Requests JSON responses via generationConfig to avoid parsing markdown.
"""

import asyncio
import base64
import json
import logging
import os
import time
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class RateLimiter:
    """Enforces minimum interval between API calls to avoid 429s."""

    def __init__(self, requests_per_minute: int = 4):
        self.min_interval = 60.0 / requests_per_minute
        self.last_request_time = 0.0

    async def acquire(self):
        now = time.time()
        elapsed = now - self.last_request_time
        if elapsed < self.min_interval:
            wait = self.min_interval - elapsed
            logger.info(f"Rate limiting: waiting {wait:.1f}s before Gemini call")
            await asyncio.sleep(wait)
        self.last_request_time = time.time()

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

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
    """Wrapper around Google Gemini REST API using httpx."""

    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.model_name = GEMINI_MODEL
        self.rate_limiter = RateLimiter(requests_per_minute=5)  # Match Gemini free tier limit

    @property
    def is_available(self) -> bool:
        """Check if Gemini is configured and usable."""
        return bool(self.api_key)

    async def _call_gemini(self, payload: dict, timeout: int = 30) -> dict:
        """Make a raw POST to the Gemini REST API with retry on 429.

        Args:
            payload: The full request body (contents, generationConfig, etc.)
            timeout: Request timeout in seconds

        Returns:
            The raw JSON response dict from Gemini.

        Raises:
            RuntimeError: If API key is not configured.
            httpx.HTTPStatusError: If the API returns a non-2xx status.
        """
        if not self.api_key:
            raise RuntimeError("GOOGLE_API_KEY is not set. Cannot use Gemini.")

        url = f"{GEMINI_BASE_URL}/{self.model_name}:generateContent?key={self.api_key}"

        max_retries = 3
        for attempt in range(max_retries):
            # Proactive rate limiting — wait before each request
            await self.rate_limiter.acquire()

            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(url, json=payload)

                if r.status_code == 429 and attempt < max_retries - 1:
                    # Exponential backoff: 8s, 16s, 32s
                    wait = 2 ** (attempt + 3)
                    logger.warning(
                        f"Gemini 429 rate limited, retrying in {wait}s "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )
                    await asyncio.sleep(wait)
                    continue

                r.raise_for_status()
                return r.json()

        # Should not reach here, but just in case
        r.raise_for_status()
        return r.json()

    def _extract_text(self, response: dict) -> str:
        """Extract the text content from a Gemini API response.

        Response structure: candidates[0].content.parts[0].text
        """
        try:
            return response["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to extract text from Gemini response: {e}")
            return ""

    async def parse_clinical_notes(self, text: str) -> list[dict]:
        """Parse clinical notes into structured diagnoses."""
        logger.info("Calling Gemini for clinical notes extraction")

        payload = {
            "contents": [{
                "parts": [
                    {"text": f"{CLINICAL_NOTES_SYSTEM_PROMPT}\n\nClinical notes to analyze:\n\n{text}"}
                ]
            }],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        response = await self._call_gemini(payload)
        return self._parse_json_response(self._extract_text(response))

    async def extract_dental_findings(self, image_bytes: bytes, prompt: str = "") -> dict:
        """Extract dental findings from X-ray image using Gemini vision.

        Encodes image as base64, sends as image/jpeg inline_data part to
        Gemini vision. Requests JSON response via generationConfig.

        Args:
            image_bytes: Raw image bytes (JPEG or PNG)
            prompt: Optional additional context for the prompt

        Returns:
            Raw Gemini response dict. Text is under
            candidates[0].content.parts[0].text
        """
        logger.info("Calling Gemini vision for dental finding detection")

        b64 = base64.b64encode(image_bytes).decode("utf-8")

        full_prompt = DENTAL_FINDINGS_SYSTEM_PROMPT
        if prompt:
            full_prompt += f"\n\nAdditional context: {prompt}"

        payload = {
            "contents": [{
                "parts": [
                    {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
                    {"text": full_prompt}
                ]
            }],
            "generationConfig": {"response_mime_type": "application/json"}
        }

        response = await self._call_gemini(payload, timeout=30)
        return response

    async def chat(self, message: str, context: str = "") -> str:
        """General chat completion with clinical context."""
        logger.info("Calling Gemini for clinical chat")

        prompt = CHAT_SYSTEM_PROMPT
        if context:
            prompt += f"\n\nCurrent patient context:\n{context}"
        prompt += f"\n\nDentist's question: {message}"

        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt}
                ]
            }]
        }

        response = await self._call_gemini(payload)
        return self._extract_text(response)

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
