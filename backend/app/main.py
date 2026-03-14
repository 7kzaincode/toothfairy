"""Tooth Fairy Backend

FastAPI backend for the dental agentic IDE.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from app.core.config import settings
from app.core.session_manager import session_manager
from app.core.log_emitter import log_emitter

from app.api.routes import session as session_routes
from app.api.routes import imaging as imaging_routes
from app.api.routes import clinical_notes as clinical_notes_routes
from app.api.routes import treatment as treatment_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Tooth Fairy Backend starting...")
    config_status = settings.get_status()
    print(f"   Assets root: {config_status['assets_root']}")
    print(f"   Cache root: {config_status['cache_root']}")
    print(f"   Demo mode: {config_status['demo_mode']}")
    print(f"   Gemini configured: {config_status['gemini_configured']}")

    if not config_status["valid"]:
        print("   Warnings:")
        for error in config_status["errors"]:
            print(f"      - {error}")

    print("Backend ready")
    yield
    print(f"Shutting down... ({session_manager.get_session_count()} sessions)")


app = FastAPI(
    title="Tooth Fairy Backend",
    description="Agentic dental IDE backend with imaging, clinical notes, and treatment copilots",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "sessions": session_manager.get_session_count()}


@app.get("/")
async def root():
    return {
        "name": "Tooth Fairy Backend",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "session": "/api/session",
            "stream": "/api/stream/{session_id}",
            "imaging": "/api/imaging/action",
            "clinical_notes": "/api/clinical-notes/action",
            "treatment": "/api/treatment/action",
        },
    }


# Register routers
app.include_router(session_routes.router, prefix="/api")
app.include_router(imaging_routes.router, prefix="/api")
app.include_router(clinical_notes_routes.router, prefix="/api")
app.include_router(treatment_routes.router, prefix="/api")


# SSE Streaming
@app.get("/api/stream/{session_id}")
async def stream_logs(session_id: str):
    from sse_starlette.sse import EventSourceResponse

    patient_state = session_manager.get_session(session_id)
    if not patient_state:
        return {"error": f"Session {session_id} not found"}, 404

    async def event_generator():
        async for event in log_emitter.stream_events(session_id):
            yield event

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    debug = os.getenv("DEBUG", "false").lower() == "true"
    uvicorn.run("app.main:app", host=host, port=port, reload=debug)
