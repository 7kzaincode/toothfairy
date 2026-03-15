"""Profile Routes

Endpoints for patient profile management.
"""

from fastapi import APIRouter, HTTPException, Body
from typing import Optional

from app.core.profile_manager import profile_manager

router = APIRouter(prefix="/profiles", tags=["Profiles"])


@router.get("/")
async def list_profiles():
    """List all patient profiles (summary view)."""
    profiles = profile_manager.list_profiles()
    return {"profiles": profiles, "count": len(profiles)}


@router.get("/{patient_id}")
async def get_profile(patient_id: str):
    """Get full patient profile."""
    profile = profile_manager.get_profile(patient_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Profile {patient_id} not found")
    return profile


@router.post("/{patient_id}/link-xray")
async def link_xray(
    patient_id: str,
    image_id: str = Body(...),
    image_type: str = Body(default="panoramic"),
    notes: str = Body(default=""),
):
    """Link an uploaded X-ray to a patient profile."""
    success = profile_manager.link_xray(patient_id, image_id, image_type, notes)
    if not success:
        raise HTTPException(status_code=404, detail=f"Profile {patient_id} not found")
    return {"status": "linked", "patient_id": patient_id, "image_id": image_id}


@router.put("/{patient_id}")
async def update_profile(patient_id: str, profile: dict = Body(...)):
    """Update a patient profile."""
    existing = profile_manager.get_profile(patient_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Profile {patient_id} not found")
    profile["patient_id"] = patient_id  # Ensure ID matches
    profile_manager.save_profile(profile)
    return {"status": "updated", "patient_id": patient_id}
