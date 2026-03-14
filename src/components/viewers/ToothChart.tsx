/**
 * ToothChart - Interactive SVG dental chart (32 teeth, FDI numbering)
 * THE DIFFERENTIATOR - used in LeftPane (mini) and CenterPane (full)
 * TODO: Implement interactive SVG with 32 clickable teeth, color coding by condition
 *
 * Color coding:
 * - healthy: default
 * - cavity: amber (#F4C152)
 * - periapical: red (#FF5C7A)
 * - crown: blue (#4C9AFF)
 * - missing: gray (#6B7280)
 * - bone_loss: purple (#A78BFA)
 */

"use client";

import type { ToothFinding } from "@/types/patient-state";

interface ToothChartProps {
  toothChart: Record<number, ToothFinding>;
  onToothClick?: (toothNumber: number) => void;
  mini?: boolean; // mini version for LeftPane
}

export default function ToothChart({ toothChart, onToothClick, mini = false }: ToothChartProps) {
  return (
    <div className={mini ? "w-full p-2" : "flex-1 flex items-center justify-center p-8"}>
      {/* TODO: SVG with 32 teeth using ToothPath components */}
    </div>
  );
}
