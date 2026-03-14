"""
Gemini LLM Client
TODO: Implement google-generativeai client for structured extraction
"""

from app.core.config import settings


class LLMClient:
    """Wrapper around Google Gemini API."""

    def __init__(self):
        self.api_key = settings.GOOGLE_API_KEY
        self.model_name = "gemini-2.0-flash"

    async def extract_dental_findings(self, image_bytes: bytes, prompt: str) -> dict:
        """Extract dental findings from X-ray image using Gemini vision."""
        # TODO: implement
        raise NotImplementedError

    async def parse_clinical_notes(self, text: str, prompt: str) -> dict:
        """Parse clinical notes into structured diagnoses."""
        # TODO: implement
        raise NotImplementedError

    async def chat(self, message: str, context: str = "") -> str:
        """General chat completion."""
        # TODO: implement
        raise NotImplementedError


llm_client = LLMClient()
