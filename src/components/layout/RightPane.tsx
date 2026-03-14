/**
 * RightPane - Agent terminal (SSE logs) + structured output
 * TODO: Implement log display, auto-scroll, structured output panels
 */

"use client";

import type { LogEvent } from "@/types/logs";
import type { PatientState } from "@/types/patient-state";

interface RightPaneProps {
  logs: LogEvent[];
  connected: boolean;
  patientState: PatientState | null;
}

export default function RightPane({ logs, connected, patientState }: RightPaneProps) {
  return (
    <div className="w-[320px] border-l border-border bg-surface-secondary flex flex-col">
      {/* TODO: Terminal header with connection status */}
      {/* TODO: Log stream display */}
      {/* TODO: Structured output panel */}
    </div>
  );
}
