"use client";

import type { PatientState } from "@/types/patient-state";

const CONDITION_COLORS: Record<string, string> = {
  cavity: "#F4C152",
  periapical_lesion: "#FF5C7A",
  bone_loss: "#A78BFA",
  impacted: "#4C9AFF",
  root_canal_needed: "#FF5C7A",
  fracture: "#FF9F4A",
  gingivitis: "#F4C152",
};

const COPILOT_ITEMS = [
  { key: "imaging", label: "Dental X-Ray", icon: "🦷", color: "var(--imaging)" },
  { key: "clinical_notes", label: "Clinical Notes", icon: "📋", color: "var(--clinical-notes)" },
  { key: "treatment", label: "Treatment Plan", icon: "💊", color: "var(--treatment)" },
];

interface LeftPaneProps {
  patientState: PatientState | null;
  onUploadImage?: (file: File) => void;
  onSelectArtifact?: (type: string) => void;
}

export default function LeftPane({ patientState, onSelectArtifact }: LeftPaneProps) {
  const findings = patientState ? Object.values(patientState.tooth_chart) : [];

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-ide-border bg-ide-panel flex flex-col h-full">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ide-text-2">
          Explorer
        </span>
        {patientState && (
          <span className="text-[9px] font-mono text-ide-muted bg-ide-surface px-1.5 py-0.5 rounded">
            {patientState.identifiers.session_id.slice(0, 13)}
          </span>
        )}
      </div>

      {/* Patient Info */}
      <div className="px-3 py-3 border-b border-ide-hairline">
        <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-2">
          Patient
        </div>
        <div className="text-sm font-medium text-ide-text">Sarah Chen</div>
        <div className="text-[11px] text-ide-text-2 mt-0.5">34F • ID: SC-2024-001</div>
      </div>

      {/* Copilot Artifacts */}
      <div className="px-2 py-2 border-b border-ide-hairline">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1.5">
          Copilots
        </div>
        {COPILOT_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelectArtifact?.(item.key)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-ide-hover transition-colors duration-150"
          >
            <span className="text-sm">{item.icon}</span>
            <span className="text-xs text-ide-text-2">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tooth Findings */}
      <div className="flex-1 overflow-y-auto scrollbar-ide px-2 py-2">
        <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1.5">
          Findings ({findings.length})
        </div>
        {findings.length === 0 ? (
          <div className="px-2 py-4 text-center text-[11px] text-ide-muted">
            No findings yet. Upload an X-ray or paste clinical notes.
          </div>
        ) : (
          <div className="space-y-0.5">
            {findings.map((f) => (
              <div
                key={`${f.tooth_number}-${f.condition}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-ide-hover transition-colors duration-150 cursor-pointer"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: CONDITION_COLORS[f.condition] || "#6E7A92" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-ide-text">
                    #{f.tooth_number} — {f.condition.replace(/_/g, " ")}
                  </div>
                  <div className="text-[10px] text-ide-muted truncate">
                    {f.severity} • {(f.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="h-7 flex items-center px-3 border-t border-ide-border bg-ide-bg">
        <span className="text-[10px] text-ide-muted">
          {patientState ? `${patientState.action_count} actions` : "No session"}
        </span>
      </div>
    </div>
  );
}
