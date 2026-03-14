"""Tooth Mapper

Maps (x, y) click coordinates on a dental X-ray to FDI tooth numbers.
Uses zone-based heuristics for panoramic X-rays.

FDI Numbering (as seen on panoramic — patient's right on image left):
  Upper Right: 18-11  |  Upper Left: 21-28
  Lower Right: 48-41  |  Lower Left: 31-38

Coordinates can be:
  - Normalized (0.0 to 1.0): detected automatically when both x,y < 1.0
  - Pixel coordinates: normalized using image dimensions
"""


# Panoramic X-ray tooth zones (normalized 0-1 x-coordinates)
# Mapped against real OPG: "R" marker on left = patient's right
# Teeth visible in dental arch span roughly x: 0.10 to 0.90
PANORAMIC_TEETH_UPPER = {
    # Patient's right (image left) → patient's left (image right)
    18: (0.05, 0.10), 17: (0.10, 0.15), 16: (0.15, 0.21), 15: (0.21, 0.26),
    14: (0.26, 0.32), 13: (0.32, 0.37), 12: (0.37, 0.42), 11: (0.42, 0.48),
    21: (0.48, 0.54), 22: (0.54, 0.59), 23: (0.59, 0.64), 24: (0.64, 0.69),
    25: (0.69, 0.74), 26: (0.74, 0.80), 27: (0.80, 0.86), 28: (0.86, 0.93),
}

PANORAMIC_TEETH_LOWER = {
    # Patient's right (image left) → patient's left (image right)
    48: (0.05, 0.11), 47: (0.11, 0.17), 46: (0.17, 0.23), 45: (0.23, 0.28),
    44: (0.28, 0.33), 43: (0.33, 0.38), 42: (0.38, 0.43), 41: (0.43, 0.48),
    31: (0.48, 0.53), 32: (0.53, 0.58), 33: (0.58, 0.63), 34: (0.63, 0.68),
    35: (0.68, 0.73), 36: (0.73, 0.79), 37: (0.79, 0.85), 38: (0.85, 0.93),
}


def map_click_to_tooth(
    x: float,
    y: float,
    image_type: str = "panoramic",
    image_width: int = 2041,
    image_height: int = 1024,
) -> int:
    """Map a click position to an FDI tooth number.

    Args:
        x: Click x coordinate — normalized (0-1) or pixel value
        y: Click y coordinate — normalized (0-1) or pixel value
        image_type: Type of dental X-ray
        image_width: Image width in pixels (used if coords are pixels)
        image_height: Image height in pixels (used if coords are pixels)

    Returns:
        FDI tooth number (11-48)
    """
    if image_type == "panoramic":
        return _map_panoramic(x, y, image_width, image_height)
    else:
        return _map_simple(x, y, image_width, image_height)


def _normalize(x: float, y: float, width: int, height: int) -> tuple[float, float]:
    """Normalize coordinates to 0-1 range. Auto-detects if already normalized."""
    if 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0:
        return x, y
    return x / width, y / height


def _map_panoramic(x: float, y: float, width: int, height: int) -> int:
    """Map click on panoramic X-ray to tooth number."""
    norm_x, norm_y = _normalize(x, y, width, height)

    # Upper jaw: ~20-48% of image height. Lower jaw: ~52-82%.
    # Split point at ~0.50
    is_upper = norm_y < 0.50

    # Select the correct jaw's tooth map
    teeth = PANORAMIC_TEETH_UPPER if is_upper else PANORAMIC_TEETH_LOWER

    # Find closest tooth by x position
    best_tooth = 11 if is_upper else 41
    best_distance = float("inf")

    for tooth_num, (x_min, x_max) in teeth.items():
        center_x = (x_min + x_max) / 2
        distance = abs(norm_x - center_x)

        if distance < best_distance:
            best_distance = distance
            best_tooth = tooth_num

    return best_tooth


def _map_simple(x: float, y: float, width: int, height: int) -> int:
    """Simple quadrant-based mapping for non-panoramic X-rays."""
    norm_x, norm_y = _normalize(x, y, width, height)
    is_upper = norm_y < 0.5
    is_right = norm_x < 0.5  # Patient's right = image left

    if is_upper and is_right:
        return 14  # Upper right premolar area
    elif is_upper and not is_right:
        return 24  # Upper left premolar area
    elif not is_upper and is_right:
        return 44  # Lower right premolar area
    else:
        return 34  # Lower left premolar area
