"""Imaging Routes

Endpoints for dental X-ray upload and analysis.
"""

import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body
from typing import Optional

from app.core.config import settings
from app.core.session_manager import session_manager
from app.models.imaging import (
    ImagingActionRequest,
    ImagingActionResponse,
    ImageUploadResponse,
    ImageListResponse,
)

router = APIRouter(prefix="/imaging", tags=["Imaging"])

XRAY_DIR = settings.ASSETS_ROOT_DIR / "xrays"


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_xray(
    file: UploadFile = File(...),
    image_type: str = Form(default="panoramic"),
):
    """Upload a dental X-ray image (PNG/JPEG)."""
    XRAY_DIR.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix if file.filename else ".png"
    image_id = f"xray-{uuid.uuid4().hex[:8]}"
    save_path = XRAY_DIR / f"{image_id}{ext}"

    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    return ImageUploadResponse(
        image_id=image_id,
        image_type=image_type,
        status="uploaded",
    )


@router.get("/images", response_model=ImageListResponse)
async def list_images():
    """List all uploaded X-ray images."""
    images = []
    if XRAY_DIR.exists():
        for p in XRAY_DIR.iterdir():
            if p.suffix.lower() in (".png", ".jpg", ".jpeg"):
                images.append({
                    "image_id": p.stem,
                    "filename": p.name,
                    "path": str(p),
                })
    return ImageListResponse(images=images, count=len(images))


@router.get("/image/{image_id}")
async def get_image(image_id: str):
    """Serve an uploaded X-ray image."""
    from fastapi.responses import FileResponse

    if XRAY_DIR.exists():
        for p in XRAY_DIR.iterdir():
            if p.stem == image_id:
                media_type = "image/png" if p.suffix == ".png" else "image/jpeg"
                return FileResponse(p, media_type=media_type)

    raise HTTPException(status_code=404, detail=f"Image {image_id} not found")


@router.post("/action", response_model=ImagingActionResponse)
async def imaging_action(request: ImagingActionRequest):
    """Process a tooth click on a dental X-ray.

    This triggers the imaging copilot pipeline:
    1. Segment tooth at click position
    2. Map to FDI tooth number
    3. Detect findings
    4. Update patient state
    """
    patient_state = session_manager.get_session(request.session_id)
    if not patient_state:
        raise HTTPException(status_code=404, detail=f"Session {request.session_id} not found")

    # Import handler lazily to avoid circular imports
    from app.copilots.imaging.handler import ImagingHandler
    handler = ImagingHandler()
    response = await handler.handle_tooth_click(request, patient_state)

    # Update session
    session_manager.update_session(request.session_id, patient_state)
    return response


@router.post("/auto-scan")
async def auto_scan_xray(
    session_id: str = Body(...),
    image_id: str = Body(...),
    image_type: str = Body(default="panoramic")
):
    """Auto-scan all teeth in panoramic X-ray using HYBRID approach.

    This analyzes all 32 teeth in one request:
    1. Batch segment all teeth (~15-20s)
    2. Flag suspicious teeth using heuristics
    3. Run Gemini vision on suspicious teeth only (~10-15s)

    Total time: ~25-35 seconds (vs. 75-110s for full analysis)

    Returns:
        {
            "total_teeth": 32,
            "segmented": 28,
            "suspicious_teeth": 7,
            "findings": [...],
            "inference_time_ms": 25000,
            "segments": [...]
        }
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")

    # Import handler lazily
    from app.copilots.imaging.handler import ImagingHandler
    handler = ImagingHandler()

    result = await handler.handle_auto_scan(
        image_id=image_id,
        patient_state=session,
        image_type=image_type
    )

    # Update session with new findings
    session_manager.update_session(session_id, session)

    return result
