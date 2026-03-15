"use client";

import type { ToothFinding } from "@/types/patient-state";

const SEVERITY_COLORS: Record<string, string> = {
  mild: "#F4C152",
  moderate: "#FF9F4A",
  severe: "#FF5C7A",
};

interface FindingsPanelProps {
  findings: ToothFinding[];
  onFindingClick?: (finding: ToothFinding) => void;
}

export default function FindingsPanel({ findings, onFindingClick }: FindingsPanelProps) {
  return (
    <div className="p-3 space-y-2">
      {findings.map((f) => {
        const color = SEVERITY_COLORS[f.severity] || "#6E7A92";
        return (
          <div
            key={`${f.tooth_number}-${f.condition}`}
            onClick={() => onFindingClick?.(f)}
            className="bg-ide-surface border border-ide-border rounded-md p-2.5 animate-slide-in cursor-pointer hover:border-ide-accent transition-colors"
          >
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-ide-hairline">
              <span className="text-xs font-semibold text-ide-text">
                Tooth #{f.tooth_number}
              </span>
              <span className="text-[10px] font-mono text-ide-muted">
                {f.confidence === 0.85 ? "regex" : `${(f.confidence * 100).toFixed(0)}%`}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-[10px] uppercase tracking-[0.04em] text-ide-muted">
                  Condition
                </span>
                <span className="text-xs font-mono text-ide-text capitalize">
                  {f.condition.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between items-baseline py-0.5">
                <span className="text-[10px] uppercase tracking-[0.04em] text-ide-muted">
                  Severity
                </span>
                <span
                  className="text-xs font-semibold capitalize"
                  style={{ color }}
                >
                  {f.severity}
                </span>
              </div>
              {f.location_description && (
                <div className="flex justify-between items-start py-0.5 gap-2">
                  <span className="text-[10px] uppercase tracking-[0.04em] text-ide-muted shrink-0">
                    Location
                  </span>
                  <span className="text-xs font-mono text-ide-text text-right break-words">
                    {f.location_description}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
