"""
MedSAM2 Inference Client (Replicate/Modal)

Calls the Modal/Replicate endpoint for tooth segmentation.
Raises on error — ReliabilityManager catches it and returns bounding box fallback.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ModalClient:
    """Client for MedSAM2 tooth segmentation via Modal endpoint."""

    def __init__(self):
        self.endpoint_url = settings.MODAL_ENDPOINT_URL

    async def segment_tooth(
        self, image_url: str, point_x: int, point_y: int
    ) -> dict:
        """Run MedSAM2 segmentation on a dental X-ray.

        POSTs {image_url, point_x, point_y} to the Modal endpoint.
        Returns dict with contour_points: [[x,y], ...].

        Raises on error — the ReliabilityManager catches it
        and returns the bounding box fallback.

        Args:
            image_url: URL or path to the X-ray image
            point_x: X coordinate of click point
            point_y: Y coordinate of click point

        Returns:
            dict with contour_points as list of [x, y] pairs
        """
        if not self.endpoint_url:
            raise RuntimeError("MODAL_ENDPOINT_URL is not configured")

        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(self.endpoint_url, json={
                "image_url": image_url,
                "point_x": point_x,
                "point_y": point_y,
            })
            r.raise_for_status()
            data = r.json()
            return {"contour_points": data["contour_points"]}  # [[x,y], ...]

    async def segment_teeth_batch(
        self,
        image_url: str,
        points: list[tuple[int, int]]
    ) -> dict:
        """Segment multiple teeth in batch (4x faster than sequential).

        Args:
            image_url: URL to X-ray image
            points: List of (x, y) tuples for each tooth

        Returns:
            {
                "success": True,
                "results": [
                    {
                        "point_index": 0,
                        "point": [x, y],
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

        Raises:
            RuntimeError: If MODAL_ENDPOINT_URL is not configured
            httpx.HTTPStatusError: If request fails
        """
        if not self.endpoint_url:
            raise RuntimeError("MODAL_ENDPOINT_URL is not configured")

        # Use /segment-teeth-batch endpoint
        # Construct batch URL by replacing the last path segment
        # This works regardless of whether URL ends with /segment-tooth or has a different format
        if "/segment-tooth" in self.endpoint_url:
            batch_url = self.endpoint_url.replace("/segment-tooth", "/segment-teeth-batch")
        else:
            # Fallback: append to base URL
            base_url = self.endpoint_url.rstrip("/")
            batch_url = f"{base_url}/segment-teeth-batch"

        async with httpx.AsyncClient(timeout=120) as client:  # Longer timeout for batch
            r = await client.post(batch_url, json={
                "image_url": image_url,
                "points": [[x, y] for x, y in points]
            })
            r.raise_for_status()
            return r.json()


# Default client instance (using Modal)
modal_client = ModalClient()

# Alias for backward compatibility
replicate_client = modal_client
