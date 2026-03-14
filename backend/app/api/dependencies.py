"""API Dependencies

FastAPI dependency injection for core services.
"""

from typing import Annotated
from fastapi import Depends, HTTPException

from app.core.cache_manager import CacheManager
from app.core.config import settings
from app.core.log_emitter import log_emitter
from app.core.session_manager import session_manager

cache_manager = CacheManager(settings.CACHE_ROOT_DIR)


def get_session_manager():
    return session_manager

def get_cache_manager():
    return cache_manager

def get_log_emitter():
    return log_emitter


async def validate_session(session_id: str) -> str:
    patient_state = session_manager.get_session(session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return session_id


SessionManagerDep = Annotated[type, Depends(get_session_manager)]
CacheManagerDep = Annotated[CacheManager, Depends(get_cache_manager)]
LogEmitterDep = Annotated[type, Depends(get_log_emitter)]
ValidatedSessionId = Annotated[str, Depends(validate_session)]
