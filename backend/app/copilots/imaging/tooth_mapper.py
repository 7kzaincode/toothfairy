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


# Panoramic X-ray tooth zones (normalized 0-1 coordinates)
# Structured by quadrant with x and y zones for each tooth
# Upper arch: y ~20-45%, Lower arch: y ~55-80%
PANORAMIC_TEETH = {
    "upper_right": {
        18: {"x_min": 0.02, "x_max": 0.08, "y_min": 0.20, "y_max": 0.45},
        17: {"x_min": 0.08, "x_max": 0.13, "y_min": 0.20, "y_max": 0.45},
        16: {"x_min": 0.13, "x_max": 0.18, "y_min": 0.20, "y_max": 0.45},
        15: {"x_min": 0.18, "x_max": 0.23, "y_min": 0.20, "y_max": 0.45},
        14: {"x_min": 0.23, "x_max": 0.28, "y_min": 0.20, "y_max": 0.45},
        13: {"x_min": 0.28, "x_max": 0.33, "y_min": 0.20, "y_max": 0.45},
        12: {"x_min": 0.33, "x_max": 0.38, "y_min": 0.20, "y_max": 0.45},
        11: {"x_min": 0.38, "x_max": 0.44, "y_min": 0.20, "y_max": 0.45},
    },
    "upper_left": {
        21: {"x_min": 0.44, "x_max": 0.50, "y_min": 0.20, "y_max": 0.45},
        22: {"x_min": 0.50, "x_max": 0.55, "y_min": 0.20, "y_max": 0.45},
        23: {"x_min": 0.55, "x_max": 0.60, "y_min": 0.20, "y_max": 0.45},
        24: {"x_min": 0.60, "x_max": 0.65, "y_min": 0.20, "y_max": 0.45},
        25: {"x_min": 0.65, "x_max": 0.70, "y_min": 0.20, "y_max": 0.45},
        26: {"x_min": 0.70, "x_max": 0.75, "y_min": 0.20, "y_max": 0.45},
        27: {"x_min": 0.75, "x_max": 0.82, "y_min": 0.20, "y_max": 0.45},
        28: {"x_min": 0.82, "x_max": 0.90, "y_min": 0.20, "y_max": 0.45},
    },
    "lower_right": {
        48: {"x_min": 0.02, "x_max": 0.08, "y_min": 0.55, "y_max": 0.80},
        47: {"x_min": 0.08, "x_max": 0.14, "y_min": 0.55, "y_max": 0.80},
        46: {"x_min": 0.14, "x_max": 0.20, "y_min": 0.55, "y_max": 0.80},
        45: {"x_min": 0.20, "x_max": 0.25, "y_min": 0.55, "y_max": 0.80},
        44: {"x_min": 0.25, "x_max": 0.30, "y_min": 0.55, "y_max": 0.80},
        43: {"x_min": 0.30, "x_max": 0.35, "y_min": 0.55, "y_max": 0.80},
        42: {"x_min": 0.35, "x_max": 0.40, "y_min": 0.55, "y_max": 0.80},
        41: {"x_min": 0.40, "x_max": 0.45, "y_min": 0.55, "y_max": 0.80},
    },
    "lower_left": {
        31: {"x_min": 0.45, "x_max": 0.50, "y_min": 0.55, "y_max": 0.80},
        32: {"x_min": 0.50, "x_max": 0.55, "y_min": 0.55, "y_max": 0.80},
        33: {"x_min": 0.55, "x_max": 0.60, "y_min": 0.55, "y_max": 0.80},
        34: {"x_min": 0.60, "x_max": 0.65, "y_min": 0.55, "y_max": 0.80},
        35: {"x_min": 0.65, "x_max": 0.70, "y_min": 0.55, "y_max": 0.80},
        36: {"x_min": 0.70, "x_max": 0.77, "y_min": 0.55, "y_max": 0.80},
        37: {"x_min": 0.77, "x_max": 0.84, "y_min": 0.55, "y_max": 0.80},
        38: {"x_min": 0.84, "x_max": 0.92, "y_min": 0.55, "y_max": 0.80},
    },
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

    # Determine upper vs lower jaw using anatomical bands
    # Real panoramic X-rays: upper arch ~20-45% height, lower arch ~55-80%
    if 0.20 <= norm_y <= 0.45:
        is_upper = True
    elif 0.55 <= norm_y <= 0.80:
        is_upper = False
    else:
        # Click outside arch bands — snap to nearest
        is_upper = norm_y < 0.5

    # Select relevant quadrants based on jaw
    if is_upper:
        quadrants = ["upper_right", "upper_left"]
    else:
        quadrants = ["lower_right", "lower_left"]

    # Find closest tooth by x position
    best_tooth = 11 if is_upper else 41
    best_distance = float("inf")

    for quadrant in quadrants:
        teeth = PANORAMIC_TEETH[quadrant]
        for tooth_num, zone in teeth.items():
            center_x = (zone["x_min"] + zone["x_max"]) / 2
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
