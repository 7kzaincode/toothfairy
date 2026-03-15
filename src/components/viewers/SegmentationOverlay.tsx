"use client";

interface SegmentationOverlayProps {
  contourPoints: number[][];
  width: number;
  height: number;
  /** Native image dimensions for viewBox (contour points are in this space) */
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  color?: string;
}

export default function SegmentationOverlay({
  contourPoints,
  width,
  height,
  viewBoxWidth,
  viewBoxHeight,
  color = "#FF3B3B",
}: SegmentationOverlayProps) {
  if (!contourPoints || contourPoints.length < 3) return null;

  const vbW = viewBoxWidth || width;
  const vbH = viewBoxHeight || height;

  const pathData =
    contourPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
      .join(" ") + " Z";

  const filterId = `glow-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${vbW} ${vbH}`}
    >
      <defs>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={pathData}
        fill={`${color}30`}
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
      />
    </svg>
  );
}
