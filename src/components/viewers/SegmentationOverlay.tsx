/**
 * SegmentationOverlay - SVG contour rendering on top of X-ray
 * TODO: Implement SVG path rendering from contour points
 */

"use client";

interface SegmentationOverlayProps {
  contourPoints: number[][];
  width: number;
  height: number;
  color?: string;
}

export default function SegmentationOverlay({
  contourPoints,
  width,
  height,
  color = "#2BD4A7",
}: SegmentationOverlayProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* TODO: Render contour path */}
    </svg>
  );
}
