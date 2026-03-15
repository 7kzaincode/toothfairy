"""
sam2_model.py
Model loading and wrapper for MedSAM with configurable model size.
Kept separate so modal_medsam2.py and predict.py stay clean.
"""

import os
import sys
from pathlib import Path
import torch

MEDSAM_REPO = Path("/opt/medsam")
MODEL_SIZE = os.getenv("MEDSAM_MODEL_SIZE", "vit_b")  # vit_b | vit_l | vit_h
WEIGHTS_PATH = Path(f"/weights/medsam_{MODEL_SIZE}.pth")


def load_medsam(device: torch.device):
    """Load the MedSAM model with configurable size from the persisted weights volume.

    Uses MEDSAM_MODEL_SIZE environment variable (default: vit_b).

    Returns:
        model: loaded SAM model in eval mode

    Raises:
        RuntimeError: If repo or weights not found
    """
    if not MEDSAM_REPO.exists():
        raise RuntimeError(
            f"MedSAM repo not found at {MEDSAM_REPO}. "
            "Ensure the Modal image build clones it."
        )

    if not WEIGHTS_PATH.exists():
        raise RuntimeError(
            f"Weights not found at {WEIGHTS_PATH}. "
            f"Run: MEDSAM_MODEL_SIZE={MODEL_SIZE} modal run modal_medsam2.py::download_weights"
        )

    sys.path.insert(0, str(MEDSAM_REPO))
    from segment_anything import sam_model_registry

    model = sam_model_registry[MODEL_SIZE](checkpoint=str(WEIGHTS_PATH))
    model.to(device)
    model.eval()

    print(f"Loaded MedSAM model: {MODEL_SIZE}")
    return model
