"""
Local testing script for MedSAM2 without Modal deployment.

Usage:
    python test_local.py --image path/to/xray.jpg --point 512,384
"""

import argparse
import sys
from pathlib import Path

# Mock torch if not available for testing
try:
    import torch
except ImportError:
    print("Warning: PyTorch not installed. Using mock mode.")
    torch = None


def test_single_tooth(image_path: str, point_x: int, point_y: int):
    """Test single tooth segmentation locally."""
    print(f"\n{'='*60}")
    print("MedSAM2 Local Testing Script")
    print(f"{'='*60}\n")

    # Check if we have actual model weights
    if torch and torch.cuda.is_available():
        device = "cuda"
    elif torch:
        device = "cpu"
    else:
        device = "mock"

    print(f"Device: {device}")

    # Load image
    print(f"Loading image from {image_path}...")
    image_path_obj = Path(image_path)

    if not image_path_obj.exists():
        print(f"❌ Error: Image file not found at {image_path}")
        return None

    # Check file size
    file_size = image_path_obj.stat().st_size
    print(f"✓ Image found ({file_size / 1024:.1f} KB)")

    # Try to load and preprocess
    try:
        from predict import load_image_from_url, preprocess_image

        image_url = f"file://{image_path_obj.absolute()}"
        image_np = load_image_from_url(image_url)

        h, w = image_np.shape[:2]
        print(f"✓ Image loaded successfully: {w}x{h} pixels")

        # Preprocess
        image_processed, scale = preprocess_image(image_np)
        if scale != 1.0:
            new_h, new_w = image_processed.shape[:2]
            print(f"✓ Image resized: {w}x{h} → {new_w}x{new_h} (scale: {scale:.2f})")

    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return None

    # Validate point coordinates
    if not (0 <= point_x < w and 0 <= point_y < h):
        print(f"❌ Error: Point ({point_x}, {point_y}) outside image bounds ({w}x{h})")
        return None

    print(f"✓ Click point validated: ({point_x}, {point_y})")

    # Mock segmentation (replace with actual model when weights available)
    print(f"\nRunning segmentation...")
    print("⚠️  Using MOCK segmentation (model weights not loaded)")

    # TODO: Uncomment when model is ready
    # from sam2_model import load_medsam
    # from predict import run_segmentation, mask_to_contour
    # model = load_medsam(device)
    # mask, confidence = run_segmentation(model, image_np, point_x, point_y)
    # result = mask_to_contour(mask, confidence, point_x, point_y, w, h)

    # Mock result for testing
    result = {
        "contour_points": [
            [point_x - 50, point_y - 60],
            [point_x + 50, point_y - 60],
            [point_x + 50, point_y + 60],
            [point_x - 50, point_y + 60]
        ],
        "confidence": 0.95,
        "area_pixels": 6000,
        "used_fallback": False
    }

    print(f"\n{'='*60}")
    print("Segmentation Results")
    print(f"{'='*60}")
    print(f"✓ Contour points: {len(result['contour_points'])}")
    print(f"✓ Confidence: {result['confidence']:.2%}")
    print(f"✓ Area: {result['area_pixels']:,} pixels")
    print(f"✓ Fallback used: {result['used_fallback']}")
    print(f"{'='*60}\n")

    return result


def test_batch(image_path: str):
    """Test batch processing with multiple points."""
    print(f"\n{'='*60}")
    print("MedSAM2 Batch Testing (Mock)")
    print(f"{'='*60}\n")

    # Generate test points (8 teeth)
    test_points = [
        (100, 200), (200, 200), (300, 200), (400, 200),  # Upper jaw
        (100, 400), (200, 400), (300, 400), (400, 400),  # Lower jaw
    ]

    print(f"Testing batch segmentation with {len(test_points)} points...")
    print("Points:", test_points)

    # Mock batch results
    results = []
    for idx, (x, y) in enumerate(test_points):
        results.append({
            "point_index": idx,
            "point": [x, y],
            "contour_points": [[x-30, y-40], [x+30, y-40], [x+30, y+40], [x-30, y+40]],
            "confidence": 0.85 + (idx * 0.01),
            "area_pixels": 5000 + (idx * 100),
            "used_fallback": False
        })

    print(f"\n✓ Batch segmentation complete!")
    print(f"✓ Successful segments: {len(results)}/{len(test_points)}")

    return {"success": True, "results": results}


def main():
    parser = argparse.ArgumentParser(
        description="Test MedSAM2 segmentation locally",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single tooth test
  python test_local.py --image xray.jpg --point 512,384

  # Batch test
  python test_local.py --image xray.jpg --batch

Note: This script uses mock segmentation until model weights are downloaded.
To use the actual model:
  1. Download weights: modal run modal_medsam2.py::download_weights
  2. Copy weights to local /weights directory
  3. Uncomment model loading code in this script
        """
    )

    parser.add_argument("--image", required=True, help="Path to X-ray image")
    parser.add_argument("--point", help="Click point as 'x,y' (for single tooth test)")
    parser.add_argument("--batch", action="store_true", help="Run batch test with multiple points")

    args = parser.parse_args()

    if args.batch:
        result = test_batch(args.image)
    elif args.point:
        point_x, point_y = map(int, args.point.split(","))
        result = test_single_tooth(args.image, point_x, point_y)
    else:
        print("Error: Must specify either --point or --batch")
        parser.print_help()
        sys.exit(1)

    if result:
        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ Test failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
