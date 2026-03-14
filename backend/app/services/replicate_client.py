"""
MedSAM2 Inference Client (Replicate/Modal)
TODO: Implement segmentation inference via Replicate or Modal endpoint
"""

from app.core.config import settings


class ReplicateClient:
    """Client for MedSAM2 tooth segmentation."""

    def __init__(self):
        self.endpoint_url = settings.MODAL_ENDPOINT_URL

    async def segment_tooth(
        self, image_url: str, point_x: int, point_y: int
    ) -> dict:
        """Run MedSAM2 segmentation on a dental X-ray.

        Args:
            image_url: URL or path to the X-ray image
            point_x: X coordinate of click point
            point_y: Y coordinate of click point

        Returns:
            dict with mask_url and contour_points
        """
        # TODO: implement
        raise NotImplementedError


replicate_client = ReplicateClient()
