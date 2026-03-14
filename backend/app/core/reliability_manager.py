"""Reliability Manager

Live-first with cached fallback pattern.
Enforces time budgets and tracks provenance.
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Optional, Callable, Any

logger = logging.getLogger(__name__)


class ExecutionStatus(str, Enum):
    LIVE_SUCCESS = "live_success"
    LIVE_TIMEOUT = "live_timeout"
    LIVE_ERROR = "live_error"
    CACHED_SUCCESS = "cached_success"


class ReliabilityManager:
    """Manages reliability with live-first and cached fallback pattern."""

    async def execute_with_fallback(
        self,
        live_fn: Callable[..., Any],
        fallback_value: Any,
        timeout_seconds: float,
        fallback_fn: Optional[Callable[..., Any]] = None,
        *live_args,
        **live_kwargs,
    ) -> tuple[Any, ExecutionStatus]:
        start_time = time.time()
        try:
            result = await asyncio.wait_for(
                live_fn(*live_args, **live_kwargs),
                timeout=timeout_seconds,
            )
            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Live execution succeeded ({elapsed_ms}ms)")
            return result, ExecutionStatus.LIVE_SUCCESS
        except asyncio.TimeoutError:
            logger.warning(f"Live execution timed out ({timeout_seconds}s) -> using fallback")
            if fallback_fn is not None:
                try:
                    fallback_value = await fallback_fn()
                except Exception as e:
                    logger.error(f"Error loading fallback: {e}")
            return fallback_value, ExecutionStatus.LIVE_TIMEOUT
        except Exception as e:
            logger.error(f"Live execution failed: {e} -> using fallback")
            if fallback_fn is not None:
                try:
                    fallback_value = await fallback_fn()
                except Exception as fallback_error:
                    logger.error(f"Error loading fallback: {fallback_error}")
            return fallback_value, ExecutionStatus.LIVE_ERROR

    @staticmethod
    def get_provenance(status: ExecutionStatus) -> dict:
        if status == ExecutionStatus.LIVE_SUCCESS:
            return {"live_attempted": True, "live_succeeded": True, "fallback_used": False, "method": "live"}
        elif status == ExecutionStatus.LIVE_TIMEOUT:
            return {"live_attempted": True, "live_succeeded": False, "fallback_used": True, "method": "cached", "reason": "timeout"}
        elif status == ExecutionStatus.LIVE_ERROR:
            return {"live_attempted": True, "live_succeeded": False, "fallback_used": True, "method": "cached", "reason": "error"}
        else:
            return {"live_attempted": False, "live_succeeded": False, "fallback_used": True, "method": "cached", "reason": "demo_mode"}


reliability_manager = ReliabilityManager()
