/**
 * DentalXrayViewer - X-ray display with Cmd+Click for segmentation
 * TODO: Implement image rendering, zoom/pan, brightness/contrast, click handler
 */

"use client";

interface DentalXrayViewerProps {
  imageUrl?: string;
  imageId?: string;
  onToothClick?: (imageId: string, x: number, y: number) => void;
  segmentationOverlay?: number[][];
}

export default function DentalXrayViewer({
  imageUrl,
  imageId,
  onToothClick,
  segmentationOverlay,
}: DentalXrayViewerProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      {/* TODO: X-ray image with click handler */}
      {/* TODO: Zoom/pan controls */}
      {/* TODO: Brightness/contrast CSS filters */}
      {/* TODO: SegmentationOverlay when available */}
    </div>
  );
}
