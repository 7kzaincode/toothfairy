"""Log Event Models for Terminal Output

Defines structured log events that stream to frontend via SSE.
Each event has a severity, timestamp, and domain-specific context.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class LogSeverity(str, Enum):
    """Severity levels for log events."""
    INFO = "info"
    PROGRESS = "progress"
    SUCCESS = "success"
    FALLBACK = "fallback"
    ERROR = "error"


class CopilotType(str, Enum):
    """Copilot domain types for Tooth Fairy."""
    IMAGING = "imaging"
    CLINICAL_NOTES = "clinical_notes"
    TREATMENT = "treatment"


class LogEvent(BaseModel):
    """Structured log event for SSE streaming."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "timestamp": "2026-03-13T10:30:00Z",
                "severity": "progress",
                "copilot": "imaging",
                "message": "Segmenting tooth at click position...",
                "context": {"x": 256, "y": 180, "image_id": "panoramic-001"},
            }
        }
    )

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    severity: LogSeverity
    copilot: CopilotType
    message: str
    context: Optional[dict[str, Any]] = None


class Heartbeat(BaseModel):
    """Heartbeat event for SSE keep-alive."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)


__all__ = ["LogSeverity", "CopilotType", "LogEvent", "Heartbeat"]
