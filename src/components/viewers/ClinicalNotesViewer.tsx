"use client";

import { useState, useCallback } from "react";
import type { ClinicalNotesOutput } from "@/types/patient-state";
import NotesHighlighter from "./NotesHighlighter";
import ResizeHandle from "@/components/layout/ResizeHandle";

const SEVERITY_COLORS: Record<string, string> = {
  mild: "#F4C152",
  moderate: "#FF9F4A",
  severe: "#FF5C7A",
};

const URGENCY_LABELS: Record<string, { color: string; bg: string }> = {
  IMMEDIATE: { color: "#FF5C7A", bg: "rgba(255,92,122,0.15)" },
  immediate: { color: "#FF5C7A", bg: "rgba(255,92,122,0.15)" },
  SOON: { color: "#FF9F4A", bg: "rgba(255,159,74,0.15)" },
  soon: { color: "#FF9F4A", bg: "rgba(255,159,74,0.15)" },
  ROUTINE: { color: "#4A9EF5", bg: "rgba(74,158,245,0.15)" },
  routine: { color: "#4A9EF5", bg: "rgba(74,158,245,0.15)" },
};

type ResultsTab = "plan" | "findings" | "summary";

interface ClinicalNotesViewerProps {
  notesText?: string;
  output?: ClinicalNotesOutput;
  onTextHighlight?: (text: string) => void;
  onTimelineEntryClick?: (entry: { condition: string; tooth_number: number }) => void;
  processing?: boolean;
}

export default function ClinicalNotesViewer({
  notesText,
  output,
  onTextHighlight,
  onTimelineEntryClick,
  processing,
}: ClinicalNotesViewerProps) {
  const [resultsTab, setResultsTab] = useState<ResultsTab>("plan");
  const [bottomHeight, setBottomHeight] = useState(280);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const hasResults = output && (output.timeline?.length || output.diagnoses?.length || output.patient_summary);
  const timeline = output?.timeline ? [...output.timeline].sort((a, b) => a.order - b.order) : [];

  const copyText = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 1500);
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Clinical Notes — full width, scrollable */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-ide border-b border-ide-border">
        {/* Section header — Freed style */}
        <div className="h-10 flex items-center px-4 border-b border-ide-hairline bg-white shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-3.5 h-3.5 text-ide-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <span className="text-[13px] font-semibold text-ide-text-2">Clinical Notes</span>
          </div>
          {notesText && (
            <CopyButton
              copied={copiedSection === "notes"}
              onClick={() => copyText(notesText, "notes")}
            />
          )}
        </div>
        {notesText ? (
          <NotesHighlighter text={notesText} onHighlight={onTextHighlight} processing={processing} />
        ) : (
          <div className="flex items-center justify-center h-full text-[11px] text-ide-muted">
            No clinical notes available
          </div>
        )}
      </div>

      {/* Results Panel — bottom */}
      {hasResults && (
        <>
          <ResizeHandle direction="vertical" onResize={(delta) => setBottomHeight((h) => Math.max(120, Math.min(500, h - delta)))} />
          <div className="shrink-0 flex flex-col bg-ide-bg" style={{ height: bottomHeight }}>
            {/* Section header — Freed style */}
            <div className="h-10 flex items-center px-4 border-b border-ide-hairline shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-3.5 h-3.5 text-ide-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span className="text-[13px] font-semibold text-ide-text-2">AI Analysis</span>
              </div>
              {/* Sub-tabs */}
              <div className="flex items-center gap-0.5 mr-2">
                <ResultsTabButton label="Treatment Plan" count={timeline.length} active={resultsTab === "plan"} onClick={() => setResultsTab("plan")} />
                <ResultsTabButton label="Findings" count={output?.diagnoses?.length} active={resultsTab === "findings"} onClick={() => setResultsTab("findings")} />
                <ResultsTabButton label="Summary" active={resultsTab === "summary"} onClick={() => setResultsTab("summary")} />
              </div>
              <CopyButton
                copied={copiedSection === "analysis"}
                onClick={() => {
                  const text =
                    resultsTab === "summary"
                      ? [output?.patient_summary, output?.dentist_summary].filter(Boolean).join("\n\n")
                      : resultsTab === "plan"
                      ? timeline.map((e) => `${e.order}. Tooth #${e.tooth_number} — ${e.condition} → ${e.treatment} [${e.urgency}] ${e.cdt_code ?? ""} ${e.estimated_cost ?? ""}`).join("\n")
                      : (output?.diagnoses ?? []).map((d) => `Tooth #${d.tooth_number}: ${d.condition} (${d.severity})`).join("\n");
                  copyText(text, "analysis");
                }}
              />
            </div>

            {/* Results content */}
            <div className="flex-1 min-h-0 overflow-auto scrollbar-ide">
              {resultsTab === "plan" && (
                <div className="p-3">
                  {timeline.length > 0 ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[0.04em] text-ide-muted border-b border-ide-hairline">
                          <th className="text-left py-1.5 pr-3 font-medium">#</th>
                          <th className="text-left py-1.5 pr-3 font-medium">Tooth</th>
                          <th className="text-left py-1.5 pr-3 font-medium">Condition</th>
                          <th className="text-left py-1.5 pr-3 font-medium">Treatment</th>
                          <th className="text-left py-1.5 pr-3 font-medium">Priority</th>
                          <th className="text-left py-1.5 pr-3 font-medium">CDT</th>
                          <th className="text-right py-1.5 font-medium">Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeline.map((entry) => {
                          const urgency = URGENCY_LABELS[entry.urgency] || URGENCY_LABELS.routine;
                          return (
                            <tr
                              key={`${entry.order}-${entry.tooth_number}`}
                              onClick={() => onTimelineEntryClick?.({ condition: entry.condition, tooth_number: entry.tooth_number })}
                              className="border-b border-ide-hairline/50 hover:bg-ide-surface cursor-pointer transition-colors"
                            >
                              <td className="py-2 pr-3 text-ide-muted">{entry.order}</td>
                              <td className="py-2 pr-3 font-mono text-ide-text">#{entry.tooth_number}</td>
                              <td className="py-2 pr-3 text-ide-text capitalize">{entry.condition.replace(/_/g, " ")}</td>
                              <td className="py-2 pr-3 text-ide-text-2">{entry.treatment}</td>
                              <td className="py-2 pr-3">
                                <span
                                  className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{ color: urgency.color, background: urgency.bg }}
                                >
                                  {entry.urgency}
                                </span>
                              </td>
                              <td className="py-2 pr-3 font-mono text-ide-muted">{entry.cdt_code || "—"}</td>
                              <td className="py-2 text-right text-ide-text-2">{entry.estimated_cost || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-[11px] text-ide-muted text-center py-6">No treatment plan generated yet</div>
                  )}
                </div>
              )}

              {resultsTab === "findings" && (
                <div className="p-3">
                  {output?.diagnoses && output.diagnoses.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {output.diagnoses.map((f) => {
                        const color = SEVERITY_COLORS[f.severity] || "#6E7A92";
                        return (
                          <div
                            key={`${f.tooth_number}-${f.condition}`}
                            className="bg-ide-surface border border-ide-border rounded-md p-2.5 hover:border-ide-accent transition-colors cursor-pointer"
                            onClick={() => onTimelineEntryClick?.({ condition: f.condition, tooth_number: f.tooth_number })}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-ide-text font-mono">#{f.tooth_number}</span>
                              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded" style={{ color, background: `${color}20` }}>
                                {f.severity}
                              </span>
                            </div>
                            <div className="text-[11px] text-ide-text capitalize">{f.condition.replace(/_/g, " ")}</div>
                            {f.location_description && (
                              <div className="text-[10px] text-ide-muted mt-0.5 truncate">{f.location_description}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-ide-muted text-center py-6">No diagnoses extracted yet</div>
                  )}
                </div>
              )}

              {resultsTab === "summary" && (
                <div className="p-4 space-y-4">
                  {output?.patient_summary && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1.5">Patient Summary</div>
                      <p className="text-xs text-ide-text-2 leading-relaxed">{output.patient_summary}</p>
                    </div>
                  )}
                  {output?.dentist_summary && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1.5">Clinical Assessment</div>
                      <p className="text-xs text-ide-text-2 leading-relaxed font-mono">{output.dentist_summary}</p>
                    </div>
                  )}
                  {!output?.patient_summary && !output?.dentist_summary && (
                    <div className="text-[11px] text-ide-muted text-center py-6">No summary available yet</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ResultsTabButton({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
        active ? "bg-ide-surface text-ide-text" : "text-ide-muted hover:text-ide-text-2 hover:bg-ide-surface/50"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 text-[10px] text-ide-muted">({count})</span>
      )}
    </button>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Copy to clipboard"
      className="flex items-center gap-1 px-2 py-1 rounded-md text-ide-muted hover:text-ide-text hover:bg-ide-surface transition-colors"
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      <span className="text-[11px]">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
