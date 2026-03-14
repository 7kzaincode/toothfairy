"use client";

import { useRef, useEffect } from "react";
import type { LogEvent } from "@/types/logs";
import type { PatientState } from "@/types/patient-state";

const SEVERITY_LABELS: Record<string, string> = {
  info: "INFO",
  progress: "PROG",
  success: "OK",
  fallback: "CACHE",
  error: "ERR",
};

const COPILOT_LABELS: Record<string, { label: string; color: string }> = {
  imaging: { label: "IMG", color: "var(--imaging)" },
  clinical_notes: { label: "CLN", color: "var(--clinical-notes)" },
  treatment: { label: "TRT", color: "var(--treatment)" },
};

interface RightPaneProps {
  logs: LogEvent[];
  connected: boolean;
  patientState: PatientState | null;
}

export default function RightPane({ logs, connected, patientState }: RightPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const findings = patientState ? Object.values(patientState.tooth_chart) : [];

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-ide-border bg-ide-panel flex flex-col h-full">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border bg-ide-bg">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ide-text-2">
            Agent
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-log-success" : "bg-ide-muted"
              }`}
            />
            <span className="text-[10px] text-ide-muted">
              {connected ? "connected" : "disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <div
        ref={terminalRef}
        className="flex-[55] min-h-0 overflow-y-auto scrollbar-ide border-b border-ide-hairline bg-ide-bg font-mono"
      >
        {logs.length === 0 ? (
          <div className="p-4 text-center text-[11px] text-ide-muted">
            Waiting for copilot actions...
          </div>
        ) : (
          logs.map((log, i) => {
            const copilot = COPILOT_LABELS[log.copilot];
            return (
              <div key={i} className={`log-line log-${log.severity}`}>
                {copilot && (
                  <span
                    className="text-[9px] font-semibold flex-shrink-0 mt-0.5"
                    style={{ color: copilot.color }}
                  >
                    {copilot.label}
                  </span>
                )}
                <span className="log-badge">{SEVERITY_LABELS[log.severity] || log.severity}</span>
                <span className="log-msg text-[13px]">{log.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Structured Output */}
      <div className="flex-[45] min-h-0 overflow-y-auto scrollbar-ide">
        <div className="h-8 flex items-center px-3 border-b border-ide-hairline bg-ide-bg">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
            Output
          </span>
        </div>
        <div className="p-3 space-y-2">
          {findings.length > 0 ? (
            findings.map((f) => (
              <div
                key={`${f.tooth_number}-${f.condition}`}
                className="bg-ide-surface border border-ide-border rounded-md p-2.5 animate-slide-in"
              >
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-ide-hairline">
                  <span className="text-xs font-semibold text-ide-text">
                    Tooth #{f.tooth_number}
                  </span>
                  <span className="text-[10px] font-mono text-ide-muted">
                    {(f.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="space-y-1">
                  <OutputRow label="Condition" value={f.condition.replace(/_/g, " ")} />
                  <OutputRow label="Severity" value={f.severity} />
                  <OutputRow label="Location" value={f.location_description} />
                </div>
              </div>
            ))
          ) : (
            <div className="text-[11px] text-ide-muted text-center py-6">
              No structured output yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-0.5">
      <span className="text-[10px] uppercase tracking-[0.04em] text-ide-muted">{label}</span>
      <span className="text-xs font-mono text-ide-text text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
