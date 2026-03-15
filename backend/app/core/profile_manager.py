"""Profile Manager

Manages persistent patient profiles stored as JSON files.
Profiles contain patient info, dental history, and linked X-rays.
"""

import json
import logging
from pathlib import Path
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

PROFILES_DIR = settings.ASSETS_ROOT_DIR / "profiles"


class ProfileManager:
    """Reads and writes patient profile JSON files."""

    def __init__(self, profiles_dir: Path | None = None):
        self.profiles_dir = profiles_dir or PROFILES_DIR
        if not self.profiles_dir.exists():
            self.profiles_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created profiles directory: {self.profiles_dir}")

    def list_profiles(self) -> list[dict]:
        """List all patient profiles (summary only)."""
        profiles = []
        for p in sorted(self.profiles_dir.glob("*.json")):
            data = self._load_json(p)
            if data:
                profiles.append({
                    "patient_id": data["patient_id"],
                    "name": data.get("name", "Unknown"),
                    "age": data.get("age"),
                    "last_visit": data.get("last_visit"),
                    "insurance": data.get("insurance"),
                    "xray_count": len(data.get("xrays", [])),
                })
        return profiles

    def get_profile(self, patient_id: str) -> Optional[dict]:
        """Load a full patient profile by patient_id."""
        path = self.profiles_dir / f"{patient_id}.json"
        return self._load_json(path)

    def save_profile(self, profile: dict) -> None:
        """Save/update a patient profile."""
        patient_id = profile.get("patient_id")
        if not patient_id:
            raise ValueError("Profile must have a patient_id")
        path = self.profiles_dir / f"{patient_id}.json"
        with open(path, "w") as f:
            json.dump(profile, f, indent=2)
        logger.info(f"Saved profile: {patient_id}")

    def link_xray(self, patient_id: str, image_id: str, image_type: str = "panoramic", notes: str = "") -> bool:
        """Link an uploaded X-ray to a patient profile."""
        profile = self.get_profile(patient_id)
        if not profile:
            return False

        # Avoid duplicates
        existing_ids = {x["image_id"] for x in profile.get("xrays", [])}
        if image_id in existing_ids:
            return True

        from datetime import datetime
        profile.setdefault("xrays", []).append({
            "image_id": image_id,
            "image_type": image_type,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "notes": notes,
        })
        self.save_profile(profile)
        return True

    def update_conditions(self, patient_id: str, tooth_number: int, condition: dict) -> bool:
        """Update known conditions for a patient from imaging findings."""
        profile = self.get_profile(patient_id)
        if not profile:
            return False

        profile.setdefault("known_conditions", {})[str(tooth_number)] = condition
        self.save_profile(profile)
        return True

    def _load_json(self, path: Path) -> Optional[dict]:
        if not path.exists():
            return None
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error reading profile {path}: {e}")
            return None


profile_manager = ProfileManager()
