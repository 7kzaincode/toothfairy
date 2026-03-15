"""Configuration Module

Application settings loaded from environment variables.
"""

import os
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv

# Project root = backend/ directory (where uvicorn runs from)
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
# Default assets at project root (one level above backend/)
_PROJECT_ROOT = _BACKEND_DIR.parent

# Load .env BEFORE class attributes are evaluated
load_dotenv(_BACKEND_DIR / ".env", override=True)


class Settings:
    """Application settings loaded from environment variables."""

    # Asset & Cache Paths — resolve relative to project root
    # Empty env vars fall back to project root defaults
    ASSETS_ROOT_DIR: Path = Path(os.getenv("ASSETS_ROOT_DIR", "") or str(_PROJECT_ROOT / "assets")).resolve()
    CACHE_ROOT_DIR: Path = Path(os.getenv("CACHE_ROOT_DIR", "") or str(_PROJECT_ROOT / "assets" / "cache")).resolve()

    # Google Gemini Configuration
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Modal/Replicate Configuration (for MedSAM2)
    MODAL_ENDPOINT_URL: str = os.getenv("MODAL_ENDPOINT_URL", "")
    MEDSAM_MODEL_SIZE: str = os.getenv("MEDSAM_MODEL_SIZE", "vit_b")  # vit_b | vit_l | vit_h

    # Moorcheh AI Configuration (patient memory / MUMLA)
    MOORCHEH_API_KEY: str = os.getenv("MOORCHEH_API_KEY", "")

    # Timeout Configuration (seconds)
    IMAGING_INFERENCE_TIMEOUT_SECONDS: int = int(
        os.getenv("IMAGING_INFERENCE_TIMEOUT_SECONDS", "30")
    )
    EVIDENCE_API_TIMEOUT_SECONDS: int = int(
        os.getenv("EVIDENCE_API_TIMEOUT_SECONDS", "10")
    )

    # Demo Mode
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # CORS Configuration
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    @classmethod
    def validate(cls) -> tuple[bool, list[str]]:
        """Validate critical settings."""
        errors = []
        if not cls.ASSETS_ROOT_DIR.exists():
            errors.append(f"ASSETS_ROOT_DIR does not exist: {cls.ASSETS_ROOT_DIR}")
        if not cls.CACHE_ROOT_DIR.exists():
            errors.append(f"CACHE_ROOT_DIR does not exist: {cls.CACHE_ROOT_DIR}")
        if not cls.GOOGLE_API_KEY and not cls.DEMO_MODE:
            errors.append("GOOGLE_API_KEY not set (required if DEMO_MODE=false)")
        return len(errors) == 0, errors

    @classmethod
    def get_status(cls) -> dict:
        """Get configuration status for logging."""
        is_valid, errors = cls.validate()
        return {
            "assets_root": str(cls.ASSETS_ROOT_DIR),
            "cache_root": str(cls.CACHE_ROOT_DIR),
            "demo_mode": cls.DEMO_MODE,
            "gemini_configured": bool(cls.GOOGLE_API_KEY),
            "modal_configured": bool(cls.MODAL_ENDPOINT_URL),
            "medsam_model_size": cls.MEDSAM_MODEL_SIZE,
            "timeout_imaging_sec": cls.IMAGING_INFERENCE_TIMEOUT_SECONDS,
            "timeout_evidence_sec": cls.EVIDENCE_API_TIMEOUT_SECONDS,
            "valid": is_valid,
            "errors": errors,
        }


settings = Settings()
