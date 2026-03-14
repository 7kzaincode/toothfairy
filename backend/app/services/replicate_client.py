"""
MedSAM2 Inference Client (Replicate/Modal)

Calls the Modal/Replicate endpoint for tooth segmentation.
Raises on error — ReliabilityManager catches it and returns bounding box fallback.
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class ReplicateClient:
    """Client for MedSAM2 tooth segmentation."""

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


replicate_client = ReplicateClient()
