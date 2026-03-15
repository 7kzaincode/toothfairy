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
  if (!contourPoints || contourPoints.length < 3) return null;

  const pathData =
    contourPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
      .join(" ") + " Z";

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={pathData}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
