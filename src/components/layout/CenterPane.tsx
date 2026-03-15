"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import type { PatientState, ClinicalNotesOutput } from "@/types/patient-state";
import type { TreatmentActionResponse, ImagingActionResponse, AutoScanResponse } from "@/types/api";
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
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-ide-panel">
      {/* Tab Bar — v0 square style, full width */}
      <div className="flex items-stretch bg-ide-bg shrink-0 border-b border-ide-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-1 py-2.5 text-[12px] font-medium transition-colors relative text-center ${
              activeTab === tab.key
                ? "text-[#171717] bg-black/[0.03]"
                : "text-ide-muted hover:text-ide-text hover:bg-black/[0.02]"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#171717]" />
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
              output={clinicalNotesOutput || patientState?.clinical_notes_output || undefined}
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
              clinicalNotesOutput={clinicalNotesOutput || patientState?.clinical_notes_output || undefined}
              treatmentResult={treatmentResult}
              onRowClick={onTreatmentClick}
              onBack={onClearTreatment}
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
      className="flex items-center justify-between w-full px-3 py-2 rounded-md transition-all duration-100 text-[#737373] hover:text-[#171717] hover:bg-[#f5f5f5] active:scale-[0.98] active:bg-[#ebebeb] cursor-pointer text-left group"
    >
      <span className="text-[13px]">{label}</span>
      <div className="flex gap-1 text-xs">
        {keys.map((k) => (
          <span key={k} className="border border-[#e5e5e5] group-hover:border-[#d4d4d4] px-1.5 py-0.5 rounded text-[10px] min-w-[22px] text-center transition-colors">
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
}: {
  patientState: PatientState | null;
  clinicalNotesOutput?: ClinicalNotesOutput;
  treatmentResult?: TreatmentActionResponse | null;
  onRowClick?: (condition: string, toothNumber?: number) => void;
  onBack?: () => void;
}) {
  const protocols = clinicalNotesOutput?.protocols;

  // If we have a treatment result, show evidence detail with back button
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
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ide-text capitalize">
              {treatmentResult.condition.replace(/_/g, " ")}
            </span>
            <span className="text-[9px] text-ide-muted font-mono bg-ide-surface px-1.5 py-0.5 rounded">
              {treatmentResult.provenance}
            </span>
          </div>

          {treatmentResult.evidence_summary && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">
                Evidence Summary
              </div>
              <p className="text-xs text-ide-text-2 leading-relaxed">
                {treatmentResult.evidence_summary}
              </p>
            </div>
          )}

          {treatmentResult.success_rate && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-ide-muted">Success Rate</span>
              <span className="text-xs font-mono text-log-success">
                {treatmentResult.success_rate}
              </span>
            </div>
          )}

          {treatmentResult.risk_factors && treatmentResult.risk_factors.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">
                Risk Factors
              </div>
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
              <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-1">
                Alternatives
              </div>
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
        </div>
      </div>
    );
  }

  // Default: show protocols table
  if (!protocols?.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-lg bg-ide-surface flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {/* Briefcase */}
              <rect x="4" y="5" width="16" height="11" rx="2" />
              <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
              <path d="M12 8v5M9.5 10.5h5" />
              {/* Hand */}
              <path d="M3 21c0-2 2-4 5-5h8c3 1 5 3 5 5" />
              <path d="M7 16l-3 1c-1 .5-1.5 1.5-1 2.5" />
              <path d="M17 16l3 1c1 .5 1.5 1.5 1 2.5" />
            </svg>
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
