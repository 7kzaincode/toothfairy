"use client";

import type { TimelineEntry } from "@/types/patient-state";

interface TreatmentTimelineProps {
  timeline: TimelineEntry[];
  onEntryClick?: (entry: TimelineEntry) => void;
}

export default function TreatmentTimeline({ timeline, onEntryClick }: TreatmentTimelineProps) {
  const sorted = [...timeline].sort((a, b) => a.order - b.order);

  return (
    <div className="p-3 space-y-2">
      {sorted.map((entry) => (
        <div
          key={`${entry.order}-${entry.tooth_number}`}
          onClick={() => onEntryClick?.(entry)}
          className="bg-ide-surface border border-ide-border rounded-md p-2.5 animate-slide-in cursor-pointer hover:border-ide-accent transition-colors"
        >
          <div className="flex items-center gap-1 mb-1.5">
            <span
              className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                color: entry.urgency_color,
                background: `${entry.urgency_color}20`,
              }}
            >
              {entry.urgency}
            </span>
            <span className="text-[11px] font-mono text-ide-text">#{entry.tooth_number}</span>
          </div>
          <div className="text-xs text-ide-text mb-0.5 capitalize">
            {entry.condition.replace(/_/g, " ")}
          </div>
          <div className="text-[11px] text-ide-text-2">{entry.treatment}</div>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ide-muted">
            <span>
              {entry.estimated_visits} visit{entry.estimated_visits > 1 ? "s" : ""}
            </span>
            {entry.cdt_code && <span>{entry.cdt_code}</span>}
            {entry.estimated_cost && <span>{entry.estimated_cost}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
