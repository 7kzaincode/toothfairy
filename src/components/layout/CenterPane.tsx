"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import type { PatientState, ClinicalNotesOutput } from "@/types/patient-state";
import type { TreatmentActionResponse, ImagingActionResponse, AutoScanResponse } from "@/types/api";
import type { PatientProfile } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import Image from "next/image";
import ClinicalNotesViewer from "@/components/viewers/ClinicalNotesViewer";
import TreatmentTable from "@/components/viewers/TreatmentTable";
import DentalXrayViewer from "@/components/viewers/DentalXrayViewer";

const ToothChart3D = dynamic(() => import("@/components/3d-viewer/ToothChart3D"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center h-full">
      <span className="text-xs text-ide-muted">Loading 3D model...</span>
    </div>
  ),
});

export type ViewerTab = "xray" | "clinical-notes" | "treatment" | "tooth-chart";

const TABS: { key: ViewerTab; label: string }[] = [
  { key: "xray", label: "X-Ray Viewer" },
  { key: "clinical-notes", label: "Clinical Notes" },
  { key: "tooth-chart", label: "Tooth Chart" },
  { key: "treatment", label: "Treatment" },
];

const DEFAULT_NOTES = "Select a patient profile to view their clinical notes.";

interface CenterPaneProps {
  activeTab: ViewerTab;
  onTabChange: (tab: ViewerTab) => void;
  patientState: PatientState | null;
  sessionId: string | null;
  profile?: PatientProfile | null;
  onOpenCommandPalette?: () => void;
  onImagingClick?: (imageId: string, x: number, y: number) => void;
  onTextHighlight?: (text: string) => void;
  onTreatmentClick?: (condition: string, toothNumber?: number) => void;
  onFileUpload?: (file: File) => void;
  onToothSelect?: (toothNumber: number) => void;
  onClearTreatment?: () => void;
  onClearImage?: () => void;
  onToggleLeftPane?: () => void;
  onToggleRightPane?: () => void;
  onAutoScan?: (imageId: string) => void;
  onViewOnModel?: (toothNumber: number) => void;
  imageId?: string | null;
  imageUrl?: string | null;
  imagingResult?: ImagingActionResponse | null;
  autoScanResult?: AutoScanResponse | null;
  clinicalNotesOutput?: ClinicalNotesOutput | null;
  treatmentResult?: TreatmentActionResponse | null;
  profileNotes?: string | null;
  processing?: boolean;
}

export default function CenterPane({
  activeTab,
  onTabChange,
  patientState,
  sessionId,
  profile,
  onOpenCommandPalette,
  onImagingClick,
  onTextHighlight,
  onTreatmentClick,
  onFileUpload,
  onClearTreatment,
  onClearImage,
  onToggleLeftPane,
  onToggleRightPane,
  onToothSelect,
  onAutoScan,
  onViewOnModel,
  imageId,
  imageUrl,
  imagingResult,
  autoScanResult,
  clinicalNotesOutput,
  treatmentResult,
  profileNotes,
  processing,
}: CenterPaneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const examDate = patientState?.created_at
    ? new Date(patientState.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-white">

      {/* Patient Header — inspired by Freed */}
      <div className="h-12 flex items-center px-5 border-b border-ide-border shrink-0 gap-3 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[16px] font-semibold text-ide-text truncate">
            {profile?.name ?? "Select a patient"}
          </span>
          {profile && (
            <span className="text-[12px] text-ide-muted border border-ide-border rounded-full px-2 py-0.5 shrink-0">
              Dental Exam
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Command palette trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ide-border text-ide-muted hover:text-ide-text hover:bg-ide-surface transition-colors text-[12px] shrink-0"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search</span>
          <span className="flex items-center gap-0.5">
            <kbd className="text-[10px] bg-white border border-ide-border rounded px-1 shadow-[0_1px_0_rgba(0,0,0,0.07)]">⌘</kbd>
            <kbd className="text-[10px] bg-white border border-ide-border rounded px-1 shadow-[0_1px_0_rgba(0,0,0,0.07)]">K</kbd>
          </span>
        </button>

        {profile && (
          <span className="text-[12px] text-ide-muted shrink-0">Saved {examDate}</span>
        )}

        {/* Export Report */}
        {sessionId && profile && (
          <a
            href={ENDPOINTS.SESSION_REPORT(sessionId)}
            download
            className="flex items-center gap-1.5 border border-ide-border text-ide-text text-[12px] font-medium py-1.5 px-3 rounded-lg transition-all hover:bg-ide-surface active:scale-[0.98] shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Report
          </a>
        )}

        {/* Auto Scan */}
        {imageId && onAutoScan && (
          <button
            onClick={() => onAutoScan(imageId)}
            disabled={processing}
            className="flex items-center gap-1.5 bg-ide-text text-white text-[12px] font-semibold py-1.5 px-3 rounded-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 shrink-0"
          >
            {processing ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Auto Scan
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="h-9 flex items-stretch border-b border-ide-border bg-white px-2 shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 px-4 text-[11px] font-medium transition-colors duration-150 text-center relative ${
              activeTab === tab.key
                ? "text-ide-text bg-ide-surface"
                : "text-ide-muted hover:text-ide-text-2"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-ide-text rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Viewer Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {activeTab === "clinical-notes" && (
          <div className="absolute inset-0">
            <ClinicalNotesViewer
              notesText={patientState?.clinical_notes_artifact?.notes_text || profileNotes || DEFAULT_NOTES}
              output={patientState?.clinical_notes_output || clinicalNotesOutput || undefined}
              onTextHighlight={onTextHighlight}
              onTimelineEntryClick={(entry) =>
                onTreatmentClick?.(entry.condition, entry.tooth_number)
              }
              processing={processing}
            />
          </div>
        )}

        {activeTab === "tooth-chart" && (
          <div className="absolute inset-0">
            <ToothChart3D toothChart={patientState?.tooth_chart ?? {}} onToothSelect={onToothSelect} />
          </div>
        )}

        {activeTab === "treatment" && (
          <div className="absolute inset-0 overflow-auto scrollbar-ide">
            <TreatmentView
              patientState={patientState}
              clinicalNotesOutput={patientState?.clinical_notes_output || clinicalNotesOutput || undefined}
              treatmentResult={treatmentResult}
              onRowClick={onTreatmentClick}
              onBack={onClearTreatment}
              onViewOnModel={onViewOnModel}
            />
          </div>
        )}

        {activeTab === "xray" && (
          imageUrl ? (
            <div className="absolute inset-0">
              <DentalXrayViewer
                imageUrl={imageUrl}
                imageId={imageId || undefined}
                onToothClick={onImagingClick}
                segmentationOverlay={imagingResult?.contour_points}
                imagingResult={imagingResult}
                onFileUpload={onFileUpload}
                onClose={onClearImage}
                onAutoScan={onAutoScan}
                autoScanResult={autoScanResult}
                onTreatmentClick={onTreatmentClick}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Image src="/logo.png" alt="Logo" width={170} height={170} className="opacity-40 transition-opacity duration-300 hover:opacity-100 cursor-pointer invert" />
              <div className="flex flex-col w-80">
                <ShortcutRow label="Open AI Agent" keys={["⇧", "⌘", "L"]} onClick={onToggleRightPane} />
                <ShortcutRow label="Clinical Notes" keys={["⇧", "⌘", "N"]} onClick={() => onTabChange("clinical-notes")} />
                <ShortcutRow label="Hide Artifacts" keys={["⌘", "B"]} onClick={onToggleLeftPane} />
                <ShortcutRow label="Tooth Chart" keys={["⌘", "T"]} onClick={() => onTabChange("tooth-chart")} />
                <ShortcutRow label="Upload X-Ray" keys={["⇧", "⌘", "U"]} onClick={() => fileInputRef.current?.click()} />
                <ShortcutRow label="Treatment Plan" keys={["⌘", "P"]} onClick={() => onTabChange("treatment")} />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".dcm,.jpg,.jpeg,.png,.tiff,.tif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileUpload?.(file);
                }}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ShortcutRow({ label, keys, onClick }: { label: string; keys: string[]; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 rounded-md transition-all duration-100 text-ide-muted hover:text-ide-text hover:bg-ide-surface active:scale-[0.98] active:bg-ide-selected cursor-pointer text-left group"
    >
      <span className="text-[13px]">{label}</span>
      <div className="flex gap-1 text-xs">
        {keys.map((k) => (
          <span key={k} className="border border-ide-border group-hover:border-ide-muted px-1.5 py-0.5 rounded text-[10px] min-w-[22px] text-center transition-colors">
            {k}
          </span>
        ))}
      </div>
    </button>
  );
}

function TreatmentView({
  clinicalNotesOutput,
  treatmentResult,
  onRowClick,
  onBack,
  onViewOnModel,
}: {
  patientState: PatientState | null;
  clinicalNotesOutput?: ClinicalNotesOutput;
  treatmentResult?: TreatmentActionResponse | null;
  onRowClick?: (condition: string, toothNumber?: number) => void;
  onBack?: () => void;
  onViewOnModel?: (toothNumber: number) => void;
}) {
  const protocols = clinicalNotesOutput?.protocols;

  if (treatmentResult) {
    return (
      <div className="flex flex-col h-full overflow-auto scrollbar-ide">
        <div className="h-8 flex items-center px-4 border-b border-ide-hairline bg-ide-bg shrink-0">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[10px] text-ide-muted hover:text-ide-text transition-colors mr-3"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
            Evidence Detail
          </span>
          {treatmentResult.tooth_number && onViewOnModel && (
            <button
              onClick={() => onViewOnModel(treatmentResult.tooth_number!)}
              className="ml-auto text-[10px] text-ide-accent hover:text-ide-text transition-colors flex items-center gap-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              View on Model
            </button>
          )}
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ide-text capitalize">
              {treatmentResult.condition.replace(/_/g, " ")}
              {treatmentResult.tooth_number && (
                <span className="text-ide-muted font-mono"> — Tooth #{treatmentResult.tooth_number}</span>
              )}
            </span>
            <span className="text-[9px] text-ide-muted font-mono bg-ide-surface px-1.5 py-0.5 rounded">
              {treatmentResult.provenance}
            </span>
          </div>

          {treatmentResult.evidence_summary && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">Evidence Summary</div>
              <p className="text-xs text-ide-text-2 leading-relaxed">{treatmentResult.evidence_summary}</p>
            </div>
          )}

          {treatmentResult.success_rate && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-ide-muted">Success Rate</span>
              <span className="text-xs font-mono text-log-success">{treatmentResult.success_rate}</span>
            </div>
          )}

          {treatmentResult.risk_factors && treatmentResult.risk_factors.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">Risk Factors</div>
              <ul className="text-xs text-ide-text-2 space-y-0.5">
                {treatmentResult.risk_factors.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-log-warn mt-0.5">•</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {treatmentResult.alternatives && treatmentResult.alternatives.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">Alternatives</div>
              <ul className="text-xs text-ide-text-2 space-y-0.5">
                {treatmentResult.alternatives.map((a, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-log-info mt-0.5">•</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {treatmentResult.pharmacy_results && treatmentResult.pharmacy_results.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">
                Recommended Medications (Health Canada DPD)
              </div>
              <div className="space-y-1.5">
                {treatmentResult.pharmacy_results.map((med, i) => (
                  <div key={i} className="text-xs text-ide-text-2 bg-ide-surface rounded px-2 py-1.5 flex items-start gap-2">
                    <span className="text-log-success shrink-0">Rx</span>
                    <div>
                      <span className="font-medium text-ide-text">{med.drug_name || med.brand_name || Object.values(med)[0]}</span>
                      {med.din && <span className="text-ide-muted ml-1.5 font-mono text-[10px]">DIN: {med.din}</span>}
                      {med.form && <span className="text-ide-muted ml-1.5">{med.form}</span>}
                      {med.schedule && <span className="text-ide-muted ml-1.5">({med.schedule})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!protocols?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-lg bg-ide-surface flex items-center justify-center mb-4">
          <span className="text-2xl">💊</span>
        </div>
        <h3 className="text-sm font-medium text-ide-text mb-1">Treatment & Evidence</h3>
        <p className="text-[11px] text-ide-muted max-w-xs">
          Analyze clinical notes first, then click a condition to look up evidence-based guidelines, success rates, and referral options.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-8 flex items-center px-4 border-b border-ide-hairline bg-ide-bg shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
          Treatment Protocols ({protocols.length})
        </span>
      </div>
      <TreatmentTable
        protocols={protocols}
        onRowClick={(p) => onRowClick?.(p.condition, p.tooth_number ?? undefined)}
      />
    </div>
  );
}
