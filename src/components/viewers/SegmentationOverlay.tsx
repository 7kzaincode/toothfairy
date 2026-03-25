"use client";

import { useState, useMemo } from "react";

interface SegmentationOverlayProps {
  contourPoints: number[][];
  width: number;
  height: number;
  /** Native image dimensions for viewBox (contour points are in this space) */
  viewBoxWidth?: number;
  viewBoxHeight?: number;
  color?: string;
  /** Tooth label shown on hover */
  toothLabel?: string;
  /** Called when the contour is clicked */
  onClick?: () => void;
  interactive?: boolean;
}

export default function SegmentationOverlay({
  contourPoints,
  width,
  height,
  viewBoxWidth,
  viewBoxHeight,
  color = "#FF3B3B",
  toothLabel,
  onClick,
  interactive = false,
}: SegmentationOverlayProps) {
  const [hovered, setHovered] = useState(false);

  if (!contourPoints || contourPoints.length < 3) return null;

  const vbW = viewBoxWidth || width;
  const vbH = viewBoxHeight || height;

  const pathData =
    contourPoints
      .map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`)
      .join(" ") + " Z";

  const filterId = useMemo(() => `glow-${Math.random().toString(36).slice(2, 8)}`, []);

  // Compute centroid for label positioning
  const centroid = useMemo(() => {
    if (!toothLabel || contourPoints.length === 0) return null;
    let cx = 0, cy = 0;
    for (const p of contourPoints) {
      cx += p[0];
      cy += p[1];
    }
    return { x: cx / contourPoints.length, y: cy / contourPoints.length };
  }, [contourPoints, toothLabel]);

  const fillOpacity = hovered ? "60" : "30";
  const strokeW = hovered ? 3.5 : 2.5;

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
        fill={`${color}${fillOpacity}`}
        stroke={hovered ? "#ffffff" : color}
        strokeWidth={strokeW}
        strokeLinejoin="round"
        filter={`url(#${filterId})`}
        className={interactive ? "pointer-events-auto cursor-pointer" : ""}
        onMouseEnter={interactive ? () => setHovered(true) : undefined}
        onMouseLeave={interactive ? () => setHovered(false) : undefined}
        onClick={interactive ? onClick : undefined}
      />
      {hovered && centroid && toothLabel && (
        <>
          <rect
            x={centroid.x - toothLabel.length * 7}
            y={centroid.y - 22}
            width={toothLabel.length * 14}
            height={28}
            rx={6}
            fill="rgba(0,0,0,0.85)"
          />
          <text
            x={centroid.x}
            y={centroid.y - 4}
            textAnchor="middle"
            fill="white"
            fontSize={18}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {toothLabel}
          </text>
        </>
      )}
    </svg>
  );
}
