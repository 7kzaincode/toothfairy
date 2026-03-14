"""Terminal Log Emitter

Emits structured log events via SSE for real-time terminal streaming.
Per-session asyncio.Queue with heartbeat keep-alive.
"""

import asyncio
from typing import Optional

from app.models.logs import CopilotType, LogEvent, LogSeverity, Heartbeat


class LogEmitter:
    """Manages terminal log events for real-time SSE streaming."""

    def __init__(self):
        self._session_queues: dict[str, asyncio.Queue] = {}
        self._queue_size = 100

    def get_or_create_queue(self, session_id: str) -> asyncio.Queue:
        if session_id not in self._session_queues:
            self._session_queues[session_id] = asyncio.Queue(maxsize=self._queue_size)
        return self._session_queues[session_id]

    async def emit(
        self,
        session_id: str,
        copilot: CopilotType,
        severity: LogSeverity,
        message: str,
        context: Optional[dict] = None,
    ) -> None:
        queue = self.get_or_create_queue(session_id)
        event = LogEvent(
            severity=severity,
            copilot=copilot,
            message=message,
            context=context,
        )
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            try:
                queue.get_nowait()
                queue.put_nowait(event)
            except asyncio.QueueEmpty:
                queue.put_nowait(event)

    async def emit_info(self, session_id: str, copilot: CopilotType, message: str, context: Optional[dict] = None):
        await self.emit(session_id, copilot, LogSeverity.INFO, message, context)

    async def emit_progress(self, session_id: str, copilot: CopilotType, message: str, context: Optional[dict] = None):
        await self.emit(session_id, copilot, LogSeverity.PROGRESS, message, context)

    async def emit_success(self, session_id: str, copilot: CopilotType, message: str, context: Optional[dict] = None):
        await self.emit(session_id, copilot, LogSeverity.SUCCESS, message, context)

    async def emit_fallback(self, session_id: str, copilot: CopilotType, message: str, context: Optional[dict] = None):
        await self.emit(session_id, copilot, LogSeverity.FALLBACK, message, context)

    async def emit_error(self, session_id: str, copilot: CopilotType, message: str, context: Optional[dict] = None):
        await self.emit(session_id, copilot, LogSeverity.ERROR, message, context)

    async def stream_events(self, session_id: str):
        queue = self.get_or_create_queue(session_id)
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=1.0)
                yield {
                    "event": "log",
                    "data": event.model_dump_json(),
                }
            except asyncio.TimeoutError:
                heartbeat = Heartbeat()
                yield {
                    "event": "heartbeat",
                    "data": heartbeat.model_dump_json(),
                }
            except asyncio.CancelledError:
                break

    def cleanup_session(self, session_id: str) -> None:
        if session_id in self._session_queues:
            del self._session_queues[session_id]


log_emitter = LogEmitter()
