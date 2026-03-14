"""Tooth Mapper

Maps (x, y) click coordinates on a dental X-ray to FDI tooth numbers.
Uses zone-based heuristics for panoramic X-rays.

FDI Numbering:
  Upper Right: 11-18  |  Upper Left: 21-28
  Lower Right: 41-48  |  Lower Left: 31-38
"""


# Panoramic X-ray tooth zones (normalized 0-1 coordinates)
# Each tooth has an approximate x-range on a panoramic image
PANORAMIC_TEETH = {
    # Upper row (from patient's right to left)
    18: (0.02, 0.08), 17: (0.08, 0.13), 16: (0.13, 0.18), 15: (0.18, 0.23),
    14: (0.23, 0.28), 13: (0.28, 0.33), 12: (0.33, 0.38), 11: (0.38, 0.44),
    21: (0.44, 0.50), 22: (0.50, 0.55), 23: (0.55, 0.60), 24: (0.60, 0.65),
    25: (0.65, 0.70), 26: (0.70, 0.75), 27: (0.75, 0.82), 28: (0.82, 0.90),
    # Lower row (from patient's right to left)
    48: (0.02, 0.08), 47: (0.08, 0.14), 46: (0.14, 0.20), 45: (0.20, 0.25),
    44: (0.25, 0.30), 43: (0.30, 0.35), 42: (0.35, 0.40), 41: (0.40, 0.45),
    31: (0.45, 0.50), 32: (0.50, 0.55), 33: (0.55, 0.60), 34: (0.60, 0.65),
    35: (0.65, 0.70), 36: (0.70, 0.77), 37: (0.77, 0.84), 38: (0.84, 0.92),
}

# Default image dimensions for normalization
DEFAULT_WIDTH = 800
DEFAULT_HEIGHT = 400


def map_click_to_tooth(
    x: int,
    y: int,
    image_type: str = "panoramic",
    image_width: int = DEFAULT_WIDTH,
    image_height: int = DEFAULT_HEIGHT,
) -> int:
    """Map a click position to an FDI tooth number.

    Args:
        x: Click x coordinate in pixels
        y: Click y coordinate in pixels
        image_type: Type of dental X-ray
        image_width: Image width in pixels
        image_height: Image height in pixels

    Returns:
        FDI tooth number (11-48)
    """
    if image_type == "panoramic":
        return _map_panoramic(x, y, image_width, image_height)
    else:
        # For periapical/bitewing, use simple quadrant mapping
        return _map_simple(x, y, image_width, image_height)


def _map_panoramic(x: int, y: int, width: int, height: int) -> int:
    """Map click on panoramic X-ray to tooth number."""
    norm_x = x / width
    norm_y = y / height

    # Determine upper vs lower jaw (roughly split at y=0.5)
    is_upper = norm_y < 0.5

    # Find closest tooth by x position
    best_tooth = 11 if is_upper else 41
    best_distance = float("inf")

    for tooth_num, (x_min, x_max) in PANORAMIC_TEETH.items():
        # Filter by jaw (upper: 11-28, lower: 31-48)
        if is_upper and tooth_num > 28:
            continue
        if not is_upper and tooth_num < 31:
            continue

        center_x = (x_min + x_max) / 2
        distance = abs(norm_x - center_x)

        if distance < best_distance:
            best_distance = distance
            best_tooth = tooth_num

    return best_tooth


def _map_simple(x: int, y: int, width: int, height: int) -> int:
    """Simple quadrant-based mapping for non-panoramic X-rays."""
    is_upper = y < height / 2
    is_right = x < width / 2  # Patient's right = image left

    if is_upper and is_right:
        return 14  # Upper right premolar area
    elif is_upper and not is_right:
        return 24  # Upper left premolar area
    elif not is_upper and is_right:
        return 44  # Lower right premolar area
    else:
        return 34  # Lower left premolar area
