/**
 * ToothPath - Individual tooth SVG component
 * TODO: Implement SVG path rendering with hover/click states, color based on condition
 */

"use client";

interface ToothPathProps {
  toothNumber: number;
  pathData: string;
  x: number;
  y: number;
  color?: string;
  isSelected?: boolean;
  onClick?: (toothNumber: number) => void;
}

export default function ToothPath({
  toothNumber,
  pathData,
  x,
  y,
  color = "#E5E7EB",
  isSelected = false,
  onClick,
}: ToothPathProps) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick?.(toothNumber)}
      className="cursor-pointer"
    >
      {/* TODO: SVG path + label */}
    </g>
  );
}
