/**
 * SVG path data + positions for all 32 teeth (FDI numbering)
 * TODO: Define SVG paths and (x, y) positions for each tooth
 *
 * FDI numbering:
 * Upper right: 11-18 | Upper left: 21-28
 * Lower right: 41-48 | Lower left: 31-38
 */

export interface ToothPathData {
  toothNumber: number;
  path: string; // SVG path data
  x: number;
  y: number;
  label: string; // e.g., "Upper Right Central Incisor"
}

export const TOOTH_PATHS: ToothPathData[] = [
  // TODO: Define paths for all 32 teeth
];
