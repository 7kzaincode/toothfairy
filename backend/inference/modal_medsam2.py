"""
modal_medsam2.py
Modal deployment for MedSAM tooth segmentation.

Usage:
    # Download weights once (run before deploying):
    modal run modal_medsam2.py::download_weights

    # Deploy:
    modal deploy modal_medsam2.py

    # Your endpoint URL will look like:
    # https://aidanjnn--medsam2-segmentation-medsam-segmenter-segment-tooth.modal.run
    # Add this to your backend .env as MODAL_ENDPOINT_URL
"""

import os
from pathlib import Path
import modal

# ---------------------------------------------------------------------------
# Configurable model size
# ---------------------------------------------------------------------------
MODEL_SIZE = os.getenv("MEDSAM_MODEL_SIZE", "vit_b")  # vit_b | vit_l | vit_h

WEIGHTS_URLS = {
    "vit_b": "https://drive.google.com/uc?id=1UAmWL88roYR7wKlnApw5Bcuzf2iQgk6_",
    # TODO: Add URLs for larger models when upgrading
    # "vit_l": "https://drive.google.com/uc?id=...",
    # "vit_h": "https://drive.google.com/uc?id=...",
}

GPU_CONFIGS = {
    "vit_b": "T4",      # Fastest, cheapest (~$0.60/hr)
    "vit_l": "A10G",    # Better quality (~$1.10/hr)
    "vit_h": "A100",    # Best quality (~$4.00/hr)
}

# ---------------------------------------------------------------------------
# Container image — all GPU dependencies installed here
# ---------------------------------------------------------------------------
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install(
        "fastapi[standard]",  # Required for Modal web endpoints
        "torch==2.3.1",
        "torchvision==0.18.1",
        "numpy",
        "Pillow",
        "opencv-python-headless",
        "requests",
        "scipy",
        "gdown",
    )
    .run_commands(
        "git clone https://github.com/bowang-lab/MedSAM.git /opt/medsam"
    )
    # Pass MODEL_SIZE as env var to container (MUST come before add_local_file)
    .env({"MEDSAM_MODEL_SIZE": MODEL_SIZE})
    # Copy inference helpers into the container (MUST come last)
    .add_local_file("sam2_model.py", "/app/sam2_model.py")
    .add_local_file("predict.py", "/app/predict.py")
)

# ---------------------------------------------------------------------------
# Persistent volume — stores weights so they survive redeployments
# ---------------------------------------------------------------------------
volume = modal.Volume.from_name("medsam2-weights", create_if_missing=True)
WEIGHTS_DIR = Path("/weights")

app = modal.App("medsam2-segmentation", image=image)


# ---------------------------------------------------------------------------
# One-time weight download
# ---------------------------------------------------------------------------
@app.function(volumes={WEIGHTS_DIR: volume}, timeout=600)
def download_weights():
    """Download MedSAM weights based on MEDSAM_MODEL_SIZE env var.

    Run once before deploying:
        MEDSAM_MODEL_SIZE=vit_b modal run modal_medsam2.py::download_weights

    Model sizes:
        - vit_b: ~360MB, fastest inference
        - vit_l: ~1.2GB, better quality (TODO: add URL)
        - vit_h: ~2.4GB, best quality (TODO: add URL)
    """
    import gdown

    weights_url = WEIGHTS_URLS.get(MODEL_SIZE)
    if not weights_url:
        raise ValueError(
            f"Unknown model size: {MODEL_SIZE}. "
            f"Available: {list(WEIGHTS_URLS.keys())}"
        )

    weights_path = WEIGHTS_DIR / f"medsam_{MODEL_SIZE}.pth"

    if weights_path.exists():
        print(f"Weights for {MODEL_SIZE} already present at {weights_path}, skipping.")
        return

    WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading MedSAM {MODEL_SIZE} weights...")
    gdown.download(weights_url, str(weights_path), quiet=False)
    volume.commit()
    print(f"Done! Downloaded {MODEL_SIZE} weights.")


# ---------------------------------------------------------------------------
# Segmentation web endpoint
# ---------------------------------------------------------------------------
@app.cls(
    gpu=GPU_CONFIGS.get(MODEL_SIZE, "T4"),  # Use appropriate GPU for model size
    volumes={WEIGHTS_DIR: volume},
    timeout=60,
    scaledown_window=300,  # stay warm for 5 min between requests
)
class MedSAMSegmenter:

    @modal.enter()
    def load_model(self):
        """Load model once when the container starts (not on every request)."""
        import sys
        import torch

        sys.path.insert(0, "/app")
        from sam2_model import load_medsam

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Loading MedSAM on {self.device}...")
        self.model = load_medsam(self.device)
        print("MedSAM ready.")

    @modal.fastapi_endpoint(method="POST")
    def segment_tooth(self, item: dict) -> dict:
        """Segment tooth with structured error handling.

        POST body:
            {
                "image_url": str,    # URL or base64 data URI of the X-ray
                "point_x":  int,     # click x coordinate in pixels
                "point_y":  int      # click y coordinate in pixels
            }

        Returns:
            {
                "success": True,
                "contour_points": [[x, y], ...],
                "confidence": 0.92,
                "area_pixels": 1250,
                "used_fallback": False
            }
            OR on error:
            {
                "success": False,
                "error": "invalid_input" | "model_error",
                "message": str,
                "contour_points": None
            }
        """
        import sys
        import logging
        sys.path.insert(0, "/app")

        logger = logging.getLogger(__name__)

        try:
            from predict import load_image_from_url, run_segmentation, mask_to_contour, preprocess_image

            image_url: str = item["image_url"]
            point_x: int   = item["point_x"]
            point_y: int   = item["point_y"]

            # Load and preprocess image
            image_np = load_image_from_url(image_url)
            image_processed, scale = preprocess_image(image_np)

            # Scale point coordinates if image was resized
            scaled_x = int(point_x * scale)
            scaled_y = int(point_y * scale)

            h, w = image_processed.shape[:2]

            # Run segmentation (returns mask + confidence)
            mask, confidence = run_segmentation(self.model, image_processed, scaled_x, scaled_y)

            # Extract contour with metrics
            result = mask_to_contour(mask, confidence, scaled_x, scaled_y, w, h)

            # Scale contour points back to original size
            if scale != 1.0:
                result["contour_points"] = [
                    [int(x / scale), int(y / scale)]
                    for x, y in result["contour_points"]
                ]
                result["area_pixels"] = int(result["area_pixels"] / (scale ** 2))

            return {
                "success": True,
                "contour_points": result["contour_points"],
                "confidence": result["confidence"],
                "area_pixels": result["area_pixels"],
                "used_fallback": result["used_fallback"]
            }

        except ValueError as e:
            # Input validation error
            logger.error(f"Validation error: {e}")
            return {
                "success": False,
                "error": "invalid_input",
                "message": str(e),
                "contour_points": None
            }

        except Exception as e:
            # Model inference error
            logger.exception("MedSAM inference failed")
            return {
                "success": False,
                "error": "model_error",
                "message": str(e),
                "contour_points": None
            }

    @modal.fastapi_endpoint(method="POST")
    def segment_teeth_batch(self, item: dict) -> dict:
        """Segment multiple teeth in one request (BATCH PROCESSING).

        POST body:
            {
                "image_url": str,
                "points": [[x1, y1], [x2, y2], ...]  # Multiple tooth clicks
            }

        Returns:
            {
                "success": True,
                "results": [
                    {
                        "point_index": 0,
                        "point": [x1, y1],
                        "contour_points": [[x, y], ...],
                        "confidence": 0.92,
                        "area_pixels": 1250,
                        "used_fallback": False
                    },
                    ...
                ],
                "total_points": 32,
                "successful_segments": 28
            }
        """
        import sys
        import logging
        sys.path.insert(0, "/app")

        logger = logging.getLogger(__name__)

        try:
            from predict import load_image_from_url, run_segmentation, mask_to_contour, preprocess_image

            image_url: str = item["image_url"]
            points: list = item["points"]  # [[x, y], ...]

            # Load image once (reused for all teeth)
            image_np = load_image_from_url(image_url)
            image_processed, scale = preprocess_image(image_np)
            h, w = image_processed.shape[:2]

            results = []
            for idx, (point_x, point_y) in enumerate(points):
                try:
                    # Scale point coordinates if image was resized
                    scaled_x = int(point_x * scale)
                    scaled_y = int(point_y * scale)

                    # Run segmentation
                    mask, confidence = run_segmentation(self.model, image_processed, scaled_x, scaled_y)
                    result = mask_to_contour(mask, confidence, scaled_x, scaled_y, w, h)

                    # Scale contour points back to original size
                    if scale != 1.0:
                        result["contour_points"] = [
                            [int(x / scale), int(y / scale)]
                            for x, y in result["contour_points"]
                        ]
                        result["area_pixels"] = int(result["area_pixels"] / (scale ** 2))

                    results.append({
                        "point_index": idx,
                        "point": [point_x, point_y],
                        "contour_points": result["contour_points"],
                        "confidence": result["confidence"],
                        "area_pixels": result["area_pixels"],
                        "used_fallback": result["used_fallback"]
                    })

                except Exception as e:
                    # Individual tooth failure - continue with others
                    logger.error(f"Failed to segment point {idx} ({point_x}, {point_y}): {e}")
                    results.append({
                        "point_index": idx,
                        "point": [point_x, point_y],
                        "error": str(e),
                        "contour_points": None,
                        "confidence": 0.0,
                        "area_pixels": 0,
                        "used_fallback": True
                    })

            successful = sum(1 for r in results if r.get("contour_points") is not None)

            return {
                "success": True,
                "results": results,
                "total_points": len(points),
                "successful_segments": successful
            }

        except Exception as e:
            logger.exception("Batch segmentation failed")
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "total_points": 0,
                "successful_segments": 0
            }
