"""Cache Manager

Reads file-based cached artifacts for Tooth Fairy demo.
Dental-specific: imaging segmentations, clinical note mappings, treatment evidence.
"""

import json
import logging
from pathlib import Path
from typing import Optional, Any

logger = logging.getLogger(__name__)


class CacheManager:
    """Manages file-based caching of precomputed dental artifacts."""

    def __init__(self, cache_root: str | Path):
        self.cache_root = Path(cache_root)
        if not self.cache_root.exists():
            logger.warning(f"Cache root does not exist: {self.cache_root}")

    def _load_json(self, path: Path) -> Optional[dict]:
        """Load a JSON file, returning None on failure."""
        if not path.exists():
            return None
        try:
            with open(path, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Error reading {path}: {e}")
            return None

    # ===========================
    # Imaging Cache Operations
    # ===========================

    def get_imaging_segmentation(
        self, patient_id: str, image_id: str, tooth_id: str
    ) -> Optional[dict]:
        """Get cached segmentation contour for a tooth."""
        path = (
            self.cache_root / "imaging" / patient_id / image_id
            / f"segmentation_tooth_{tooth_id}.json"
        )
        return self._load_json(path)

    def get_imaging_findings(
        self, patient_id: str, image_id: str
    ) -> Optional[dict]:
        """Get cached findings for an image."""
        path = self.cache_root / "imaging" / patient_id / image_id / "findings.json"
        return self._load_json(path)

    # ===========================
    # Clinical Notes Cache
    # ===========================

    def get_condition_to_treatment(self) -> Optional[dict]:
        """Get condition-to-treatment mapping."""
        path = self.cache_root / "clinical_notes" / "mappings" / "condition_to_treatment.json"
        return self._load_json(path)

    def get_treatment_for_condition(self, condition: str) -> Optional[dict]:
        """Get treatment mapping for a specific condition."""
        mappings = self.get_condition_to_treatment()
        if not mappings:
            return None
        normalized = condition.lower().replace(" ", "_")
        return mappings.get("mappings", {}).get(normalized)

    # ===========================
    # Treatment Evidence Cache
    # ===========================

    def get_treatment_evidence(self, condition: str) -> Optional[dict]:
        """Get cached treatment evidence for a condition."""
        normalized = condition.lower().replace(" ", "_")
        path = self.cache_root / "treatment" / "evidence" / f"{normalized}.json"
        return self._load_json(path)

    # ===========================
    # Cache Status
    # ===========================

    def get_cache_status(self) -> dict:
        """Get status of cache directories."""
        return {
            "cache_root": str(self.cache_root),
            "exists": self.cache_root.exists(),
            "imaging_cache": (self.cache_root / "imaging").exists(),
            "clinical_notes_cache": (self.cache_root / "clinical_notes").exists(),
            "treatment_cache": (self.cache_root / "treatment").exists(),
        }
