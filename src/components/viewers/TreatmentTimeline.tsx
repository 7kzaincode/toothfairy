/**
 * TreatmentTimeline - Urgency-ranked visual timeline
 * TODO: Implement visual timeline with urgency colors (red/amber/green/blue)
 */

"use client";

import type { TimelineEntry } from "@/types/patient-state";

interface TreatmentTimelineProps {
  timeline: TimelineEntry[];
  onEntryClick?: (entry: TimelineEntry) => void;
}

export default function TreatmentTimeline({ timeline, onEntryClick }: TreatmentTimelineProps) {
  return (
    <div className="space-y-3 p-4">
      {/* TODO: Timeline entries with urgency color bars */}
    </div>
  );
}
