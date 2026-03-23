"""Dental Tooth Segmentation Service

Uses a pre-trained U-Net model to segment teeth in panoramic X-rays.
Model source: SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image

Pipeline (matching the original repo's CCA_Analysis.py):
1. U-Net inference → raw probability mask
2. Resize to original dimensions
3. Morphological opening → sharpening → erosion → Otsu threshold
4. Connected Component Labeling (8-connectivity) → individual tooth labels
5. Extract contour for the clicked tooth's zone
"""

import logging
import cv2
import numpy as np
from pathlib import Path

logger = logging.getLogger(__name__)

# Lazy-loaded globals
_model = None
_labels_cache: dict[str, np.ndarray] = {}  # Connected component labels per image
_mask_cache: dict[str, np.ndarray] = {}    # Binary mask per image

MODEL_PATH = Path(__file__).parent.parent.parent / "models"
MODEL_FILENAME = "dental_xray_seg.h5"


def _find_model_weights() -> str | None:
    """Find the .h5 weights file in the models directory."""
    if not MODEL_PATH.exists():
        return None
    for p in MODEL_PATH.rglob(MODEL_FILENAME):
        return str(p)
    return None


def _build_unet():
    """Build the EXACT U-Net architecture from the original repo's model.py.

    Source: SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image
    Layer order per encoder block: Conv → Dropout → Conv → BatchNorm → Pool
    Dropout rates: 0.1, 0.2, 0.3, 0.4, 0.5 (increasing per block)
    """
    import tensorflow as tf

    inputs = tf.keras.layers.Input(shape=(512, 512, 1))

    # Encoder block 1: Conv → Dropout(0.1) → Conv → BatchNorm → Pool
    c1 = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(inputs)
    d1 = tf.keras.layers.Dropout(0.1)(c1)
    c1b = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d1)
    b1 = tf.keras.layers.BatchNormalization()(c1b)
    p1 = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(b1)

    # Encoder block 2: Conv → Dropout(0.2) → Conv → BatchNorm → Pool
    c2 = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(p1)
    d2 = tf.keras.layers.Dropout(0.2)(c2)
    c2b = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d2)
    b2 = tf.keras.layers.BatchNormalization()(c2b)
    p2 = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(b2)

    # Encoder block 3: Conv → Dropout(0.3) → Conv → BatchNorm → Pool
    c3 = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(p2)
    d3 = tf.keras.layers.Dropout(0.3)(c3)
    c3b = tf.keras.layers.Conv2D(128, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d3)
    b3 = tf.keras.layers.BatchNormalization()(c3b)
    p3 = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(b3)

    # Encoder block 4: Conv → Dropout(0.4) → Conv → BatchNorm → Pool
    c4 = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(p3)
    d4 = tf.keras.layers.Dropout(0.4)(c4)
    c4b = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d4)
    b4 = tf.keras.layers.BatchNormalization()(c4b)
    p4 = tf.keras.layers.MaxPooling2D(pool_size=(2, 2))(b4)

    # Bottleneck: Conv → Dropout(0.5) → Conv → BatchNorm
    c5 = tf.keras.layers.Conv2D(512, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(p4)
    d5 = tf.keras.layers.Dropout(0.5)(c5)
    c5b = tf.keras.layers.Conv2D(512, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d5)
    b5 = tf.keras.layers.BatchNormalization()(c5b)

    # Decoder block 1: ConvTranspose → concat(c4b) → Conv → Dropout(0.4) → Conv → BatchNorm
    u6 = tf.keras.layers.Conv2DTranspose(512, (4, 4), strides=(2, 2), padding='same', activation='relu', kernel_initializer='he_normal')(b5)
    u6 = tf.keras.layers.concatenate([u6, c4b])
    c6 = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(u6)
    d6 = tf.keras.layers.Dropout(0.4)(c6)
    c6b = tf.keras.layers.Conv2D(256, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d6)
    b6 = tf.keras.layers.BatchNormalization()(c6b)

    # Decoder block 2: ConvTranspose → concat(c3b) → Conv → Dropout(0.3) → Conv → BatchNorm
    u7 = tf.keras.layers.Conv2DTranspose(256, (4, 4), strides=(2, 2), padding='same', activation='relu', kernel_initializer='he_normal')(b6)
    u7 = tf.keras.layers.concatenate([u7, c3b])
    c7 = tf.keras.layers.Conv2D(128, 3, activation='relu', padding='same', kernel_initializer='he_normal')(u7)
    d7 = tf.keras.layers.Dropout(0.3)(c7)
    c7b = tf.keras.layers.Conv2D(128, 3, activation='relu', padding='same', kernel_initializer='he_normal')(d7)
    b7 = tf.keras.layers.BatchNormalization()(c7b)

    # Decoder block 3: ConvTranspose → concat(c2b) → Conv → Dropout(0.2) → Conv → BatchNorm
    u8 = tf.keras.layers.Conv2DTranspose(128, (4, 4), strides=(2, 2), padding='same', activation='relu', kernel_initializer='he_normal')(b7)
    u8 = tf.keras.layers.concatenate([u8, c2b])
    c8 = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(u8)
    d8 = tf.keras.layers.Dropout(0.2)(c8)
    c8b = tf.keras.layers.Conv2D(64, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d8)
    b8 = tf.keras.layers.BatchNormalization()(c8b)

    # Decoder block 4: ConvTranspose → concat(c1b) → Conv → Dropout(0.1) → Conv
    u9 = tf.keras.layers.Conv2DTranspose(64, (4, 4), strides=(2, 2), padding='same', activation='relu', kernel_initializer='he_normal')(b8)
    u9 = tf.keras.layers.concatenate([u9, c1b])
    c9 = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(u9)
    d9 = tf.keras.layers.Dropout(0.1)(c9)
    c9b = tf.keras.layers.Conv2D(32, (3, 3), activation='relu', padding='same', kernel_initializer='he_normal')(d9)

    outputs = tf.keras.layers.Conv2D(1, (1, 1), activation='sigmoid', padding='same', kernel_initializer='he_normal')(c9b)
    return tf.keras.models.Model(inputs=inputs, outputs=outputs)


def _get_model():
    """Lazy-load the U-Net model (built once, kept in memory)."""
    global _model
    if _model is not None:
        return _model

    weights_path = _find_model_weights()
    if not weights_path:
        logger.warning(
            "Dental segmentation model not found. "
            "Download dental_xray_seg.h5 from HuggingFace and place it at: "
            "backend/models/downloaded/dental_xray_seg.h5\n"
            "  huggingface-cli download SerdarHelli/Segmentation-of-Teeth-in-Panoramic-X-ray-Image-Using-U-Net "
            "dental_xray_seg.h5 --repo-type space --local-dir backend/models/downloaded"
        )
        return None

    logger.info(f"Loading dental U-Net from {weights_path}...")
    model = _build_unet()
    model.load_weights(weights_path)
    _model = model
    logger.info("Dental U-Net loaded successfully")
    return _model


def _cca_postprocess(raw_mask: np.ndarray, orig_h: int, orig_w: int) -> tuple[np.ndarray, np.ndarray]:
    """Apply the exact CCA post-processing from the original repo.

    Pipeline:
    1. Resize prediction to original dimensions (as 3-channel for filter2D)
    2. Morphological opening (5x5 kernel)
    3. Sharpening filter (3x3 edge-enhancement)
    4. Erosion to separate merged teeth
    5. Convert to grayscale → Otsu threshold
    6. Connected component labeling (8-connectivity)

    Returns:
        (binary_mask, labels) — the clean binary mask and the CCA label map
    """
    # Resize to original dimensions
    mask_full = cv2.resize(raw_mask, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)

    # Convert to 8-bit 3-channel (the original CCA code expects BGR input)
    mask_8bit = (mask_full * 255).astype(np.uint8)
    mask_bgr = cv2.cvtColor(mask_8bit, cv2.COLOR_GRAY2BGR)

    # Step 1: Morphological opening — removes small noise spots
    # Original repo CCA_Analysis: open_iteration=2
    kernel = np.ones((5, 5), dtype=np.float32)
    opened = cv2.morphologyEx(mask_bgr, cv2.MORPH_OPEN, kernel, iterations=2)  # matches original

    # Step 2: Sharpening filter — enhances tooth boundaries
    kernel_sharp = np.array([[-1, -1, -1],
                             [-1,  9, -1],
                             [-1, -1, -1]])
    sharpened = cv2.filter2D(opened, -1, kernel_sharp)

    # Step 3: Erosion — separates merged adjacent teeth
    # Original repo CCA_Analysis: erode_iteration=3
    erode_kernel = np.ones((5, 5), dtype=np.uint8)
    eroded = cv2.erode(sharpened, erode_kernel, iterations=3)  # matches original

    # Step 4: Grayscale + Otsu threshold
    gray = cv2.cvtColor(eroded, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Step 5: Connected component labeling
    num_labels, labels = cv2.connectedComponents(binary, connectivity=8)
    logger.info(f"CCA found {num_labels - 1} tooth components")

    return binary, labels


def segment_full_image(image_bytes: bytes, image_id: str) -> np.ndarray | None:
    """Run U-Net + CCA on full panoramic X-ray.

    Returns the connected component labels map (each tooth has a unique integer label).
    Results are cached by image_id.
    """
    if image_id in _labels_cache:
        return _labels_cache[image_id]

    model = _get_model()
    if model is None:
        return None

    # Decode image
    img_array = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None

    orig_h, orig_w = img.shape

    # Preprocess: resize to 512x512, normalize
    resized = cv2.resize(img, (512, 512), interpolation=cv2.INTER_LANCZOS4)
    normalized = np.float32(resized / 255.0).reshape(1, 512, 512, 1)

    # Inference
    prediction = model.predict(normalized, verbose=0)
    raw_mask = prediction[0, :, :, 0]

    # CCA post-processing (matching the original repo exactly)
    binary, labels = _cca_postprocess(raw_mask, orig_h, orig_w)

    # Cache both
    _mask_cache[image_id] = binary
    _labels_cache[image_id] = labels
    logger.info(f"U-Net + CCA cached for {image_id} ({orig_w}x{orig_h})")
    return labels


def extract_tooth_contour(
    labels: np.ndarray,
    tooth_number: int,
    zone: dict,
    img_width: int,
    img_height: int,
) -> list[list[int]] | None:
    """Extract the contour for a single tooth using CCA labels.

    Uses the PANORAMIC_TEETH zone to identify which connected component
    belongs to the clicked tooth, then extracts its contour.

    Returns list of [x, y] points in original image coordinates, or None.
    """
    # Zone pixel coordinates (tight, no padding)
    zx1 = int(zone["x_min"] * img_width)
    zx2 = int(zone["x_max"] * img_width)
    zy1 = int(zone["y_min"] * img_height)
    zy2 = int(zone["y_max"] * img_height)

    # Find which CCA label(s) are present in this zone
    zone_labels = labels[zy1:zy2, zx1:zx2]
    unique_labels = np.unique(zone_labels)
    # Remove background (label 0)
    unique_labels = unique_labels[unique_labels > 0]

    if len(unique_labels) == 0:
        return None

    # Pick the label with the most pixels in this zone
    best_label = 0
    best_count = 0
    zone_cx = (zx2 - zx1) // 2
    zone_cy = (zy2 - zy1) // 2

    for lbl in unique_labels:
        count = np.count_nonzero(zone_labels == lbl)
        if count > best_count:
            best_count = count
            best_label = lbl

    if best_label == 0:
        return None

    # Create a mask for just this component (full image)
    component_mask = np.uint8(labels == best_label) * 255

    # CRITICAL: Clip component to the zone so merged multi-tooth blobs
    # only show the portion within the clicked tooth's zone
    zone_mask = np.zeros_like(component_mask)
    # Use slightly expanded zone for clipping (so contour isn't cut too tight)
    clip_pad_x = int((zx2 - zx1) * 0.15)
    clip_pad_y = int((zy2 - zy1) * 0.1)
    clip_x1 = max(0, zx1 - clip_pad_x)
    clip_x2 = min(img_width, zx2 + clip_pad_x)
    clip_y1 = max(0, zy1 - clip_pad_y)
    clip_y2 = min(img_height, zy2 + clip_pad_y)
    zone_mask[clip_y1:clip_y2, clip_x1:clip_x2] = 255

    # Intersect component with zone
    clipped = cv2.bitwise_and(component_mask, zone_mask)

    # Find contour of the clipped region
    contours, _ = cv2.findContours(clipped, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    # Pick largest contour
    contour = max(contours, key=cv2.contourArea)

    # Filter out tiny noise (less than 500px area)
    if cv2.contourArea(contour) < 500:
        return None

    # Smooth the contour for clean rendering
    epsilon = 0.008 * cv2.arcLength(contour, True)
    smoothed = cv2.approxPolyDP(contour, epsilon, True)

    points = smoothed.reshape(-1, 2).tolist()
    return [[p[0], p[1]] for p in points]


def extract_all_tooth_contours(
    image_bytes: bytes,
    image_id: str,
) -> list[dict]:
    """Extract contours for ALL teeth in the image using CCA.

    Returns a list of dicts, each with:
        - label: int (CCA component ID)
        - contour_points: list of [x, y]
        - area: float (contour area in pixels)
        - center: [x, y] (centroid)
    """
    labels = segment_full_image(image_bytes, image_id)
    if labels is None:
        return []

    unique_labels = np.unique(labels)
    unique_labels = unique_labels[unique_labels > 0]  # skip background

    results = []
    for lbl in unique_labels:
        component_mask = np.uint8(labels == lbl) * 255
        contours, _ = cv2.findContours(component_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue

        contour = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(contour)

        # Skip tiny noise components
        if area < 2000:
            continue

        # Smooth
        epsilon = 0.008 * cv2.arcLength(contour, True)
        smoothed = cv2.approxPolyDP(contour, epsilon, True)

        # Centroid
        M = cv2.moments(contour)
        if M["m00"] == 0:
            continue
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])

        points = smoothed.reshape(-1, 2).tolist()
        results.append({
            "label": int(lbl),
            "contour_points": [[p[0], p[1]] for p in points],
            "area": area,
            "center": [cx, cy],
        })

    logger.info(f"Extracted {len(results)} tooth contours from CCA")
    return results


def clear_cache():
    """Clear cached segmentation results (call after parameter changes)."""
    _labels_cache.clear()
    _mask_cache.clear()
    logger.info("Segmentation cache cleared")


def is_available() -> bool:
    """Check if the segmentation model weights exist."""
    return _find_model_weights() is not None
