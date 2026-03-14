/**
 * FindingsPanel - Severity-colored finding cards
 * TODO: Implement finding card rendering with severity colors
 */

"use client";

import type { ToothFinding } from "@/types/patient-state";

interface FindingsPanelProps {
  findings: ToothFinding[];
  onFindingClick?: (finding: ToothFinding) => void;
}

export default function FindingsPanel({ findings, onFindingClick }: FindingsPanelProps) {
  return (
    <div className="space-y-2 p-4">
      {/* TODO: Finding cards with severity color coding */}
    </div>
  );
}
