"""
predict.py
Core inference logic: image loading → segmentation → contour extraction.
"""

import io
import base64
import numpy as np
import cv2
from PIL import Image
import requests


def load_image_from_url(image_url: str) -> np.ndarray:
    """Load an image from a URL or base64 data URI.

    Args:
        image_url: Either a http(s) URL or a data:image/... base64 URI

    Returns:
        image_np: RGB image as numpy array (H x W x 3), uint8
    """
    if image_url.startswith("data:"):
        # base64 data URI → decode
        header, encoded = image_url.split(",", 1)
        img_bytes = base64.b64decode(encoded)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    else:
        # HTTP(S) URL → download
        resp = requests.get(image_url, timeout=10)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")

    return np.array(img)


def preprocess_image(image_np: np.ndarray, max_size: int = 1024) -> tuple[np.ndarray, float]:
    """Preprocess image with size limiting for efficient inference.

    Args:
        image_np: Input image as numpy array (H x W x 3 or H x W)
        max_size: Maximum dimension size (default 1024px)

    Returns:
        tuple: (preprocessed_image, scale_factor)
            - preprocessed_image: Resized image if needed
            - scale_factor: Scale factor applied (1.0 if no resize)

    Raises:
        ValueError: If image data is invalid
    """
    if image_np.size == 0:
        raise ValueError("Invalid image data - empty array")

    h, w = image_np.shape[:2]

    # Resize if too large
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_h, new_w = int(h * scale), int(w * scale)
        image_resized = cv2.resize(image_np, (new_w, new_h))
        return image_resized, scale

    return image_np, 1.0


def run_segmentation(model, image_np: np.ndarray, point_x: int, point_y: int) -> tuple[np.ndarray, float]:
    """Run MedSAM on a single click point with input validation.

    Args:
        model:     loaded SAM model (from load_medsam)
        image_np:  RGB image (H x W x 3)
        point_x:   click x coordinate in pixels
        point_y:   click y coordinate in pixels

    Returns:
        tuple: (mask, confidence_score)
            - mask: boolean mask (H x W) of the segmented tooth
            - confidence_score: float confidence score from SAM (0.0-1.0)

    Raises:
        ValueError: If point coordinates are outside image bounds or image is empty
    """
    from segment_anything import SamPredictor

    h, w = image_np.shape[:2]

    # Validate point coordinates
    if not (0 <= point_x < w and 0 <= point_y < h):
        raise ValueError(f"Point ({point_x}, {point_y}) outside image bounds ({w}x{h})")

    if image_np.size == 0:
        raise ValueError("Empty image provided")

    predictor = SamPredictor(model)
    predictor.set_image(image_np)

    # Single-point prompt (foreground)
    input_point = np.array([[point_x, point_y]])
    input_label = np.array([1])  # 1 = foreground

    masks, scores, logits = predictor.predict(
        point_coords=input_point,
        point_labels=input_label,
        multimask_output=True,  # SAM returns 3 masks at different quality levels
    )

    # Pick the mask with highest confidence
    best_idx = np.argmax(scores)
    mask = masks[best_idx]  # shape: (H, W), dtype: bool
    confidence = float(scores[best_idx])

    return mask, confidence


def mask_to_contour(
    mask: np.ndarray,
    confidence: float,
    point_x: int,
    point_y: int,
    img_w: int,
    img_h: int
) -> dict:
    """Extract a simplified polygon contour from a binary mask with quality metrics.

    Args:
        mask:       H x W boolean mask
        confidence: Confidence score from SAM model (0.0-1.0)
        point_x:    Original click x (used for fallback bounding box)
        point_y:    Original click y (used for fallback bounding box)
        img_w:      Image width in pixels
        img_h:      Image height in pixels

    Returns:
        dict with:
            - contour_points: [[x, y], ...] list of polygon vertices
            - confidence: float confidence score
            - area_pixels: int area of the segmented region
            - used_fallback: bool whether fallback bounding box was used
    """
    mask_uint8 = (mask * 255).astype(np.uint8)
    contours, _ = cv2.findContours(mask_uint8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        # Fallback: bounding box around click point
        pad = 40
        return {
            "contour_points": [
                [max(0, point_x - pad), max(0, point_y - pad)],
                [min(img_w, point_x + pad), max(0, point_y - pad)],
                [min(img_w, point_x + pad), min(img_h, point_y + pad)],
                [max(0, point_x - pad), min(img_h, point_y + pad)],
            ],
            "confidence": 0.0,
            "area_pixels": (pad * 2) * (pad * 2),
            "used_fallback": True
        }

    # Use largest contour (main tooth body) and simplify to ~40 points
    largest = max(contours, key=cv2.contourArea)
    epsilon = 0.02 * cv2.arcLength(largest, True)
    approx = cv2.approxPolyDP(largest, epsilon, True)

    return {
        "contour_points": approx.reshape(-1, 2).tolist(),
        "confidence": float(confidence),
        "area_pixels": int(cv2.contourArea(largest)),
        "used_fallback": False
    }


def segment_tooth_local(model, image_url: str, point_x: int, point_y: int) -> dict:
    """End-to-end helper: load image → segment → return contour with metrics.
    Useful for local testing without Modal.

    Args:
        model: Loaded SAM model
        image_url: URL or base64 data URI of the X-ray
        point_x: Click x coordinate
        point_y: Click y coordinate

    Returns:
        dict with contour_points, confidence, area_pixels, used_fallback
    """
    image_np = load_image_from_url(image_url)

    # Preprocess (resize if needed)
    image_processed, scale = preprocess_image(image_np)

    # Scale point coordinates if image was resized
    scaled_x = int(point_x * scale)
    scaled_y = int(point_y * scale)

    # Run segmentation
    mask, confidence = run_segmentation(model, image_processed, scaled_x, scaled_y)

    h, w = image_processed.shape[:2]
    result = mask_to_contour(mask, confidence, scaled_x, scaled_y, w, h)

    # Scale contour points back to original size
    if scale != 1.0:
        result["contour_points"] = [
            [int(x / scale), int(y / scale)]
            for x, y in result["contour_points"]
        ]
        # Area needs to be scaled by scale²
        result["area_pixels"] = int(result["area_pixels"] / (scale ** 2))

    return result
