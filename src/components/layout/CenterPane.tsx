"use client";

import dynamic from "next/dynamic";
import type { PatientState } from "@/types/patient-state";
import Image from "next/image";

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

interface CenterPaneProps {
  activeTab: ViewerTab;
  onTabChange: (tab: ViewerTab) => void;
  patientState: PatientState | null;
  sessionId: string | null;
  onImagingClick?: (imageId: string, x: number, y: number) => void;
  onTextHighlight?: (text: string) => void;
  onFileUpload?: (file: File) => void;
  onToothSelect?: (toothNumber: number) => void;
}

export default function CenterPane({
  activeTab,
  onTabChange,
  patientState,
  onFileUpload,
  onToothSelect,
}: CenterPaneProps) {
  return (
    <div className="flex-1 min-w-0 flex flex-col bg-ide-panel">
      {/* Tab Bar */}
      <div className="h-9 flex items-end gap-1 border-b border-ide-border bg-ide-bg px-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex-none h-8 px-3 text-[10px] font-medium rounded-t-md border border-b-0 transition-colors duration-150 ${activeTab === tab.key
              ? "bg-ide-panel text-ide-text border-ide-border"
              : "bg-transparent text-ide-muted border-transparent hover:bg-ide-surface hover:text-ide-text-2"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Viewer Content */}
      <div className="flex-1 min-h-0 overflow-auto scrollbar-ide relative">
        {activeTab === "clinical-notes" && <ClinicalNotesPlaceholder patientState={patientState} />}
        {activeTab === "tooth-chart" && (
          <div className="absolute inset-0">
            <ToothChart3D toothChart={patientState?.tooth_chart ?? {}} onToothSelect={onToothSelect} />
          </div>
        )}
        {activeTab === "treatment" && <TreatmentPlaceholder patientState={patientState} />}
        {activeTab === "xray" && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Image src="/logo.png" alt="Logo" width={170} height={170} className="opacity-40 transition-opacity duration-300 hover:opacity-100 cursor-pointer" />
            <div className="flex flex-col gap- w-80">
              <div
                className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer
  text-[#6b6b6b] bg-transparent hover:bg-[#242424] hover:text-white
  transition-colors duration-150"
              >
                <span>Open AI Agent</span>
                <div className="flex gap-1.5 text-xs">
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⇧</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⌘</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">L</span>
                </div>
              </div>
              <div className="flex items-center justify-between transition-colors px-3 py-1 rounded" style={{ color: "#4c4c4c" }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "white"} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#4c4c4c"}>
                <span>Show Agent Stream</span>
                <div className="flex gap-1.5 text-xs">
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⇧</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⌘</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">J</span>
                </div>
              </div>
              <div className="flex items-center justify-between transition-colors px-3 py-1 rounded" style={{ color: "#4c4c4c" }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "white"} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#4c4c4c"}>
                <span>Hide Artifacts</span>
                <div className="flex gap-1.5 text-xs">
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded">⌘</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded">B</span>
                </div>
              </div>
              <div className="flex items-center justify-between transition-colors px-3 py-1 rounded" style={{ color: "#4c4c4c" }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "white"} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#4c4c4c"}>
                <span>Search X-Rays</span>
                <div className="flex gap-1.5 text-xs">
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⌘</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">P</span>
                </div>
              </div>
              <div className="flex items-center justify-between transition-colors px-3 py-1 rounded" style={{ color: "#4c4c4c" }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "white"} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#4c4c4c"}>
                <span>Upload Files</span>
                <div className="flex gap-1.5 text-xs">
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⇧</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⌘</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">U</span>
                </div>
              </div>
              <div className="flex items-center justify-between transition-colors px-3 py-1 rounded" style={{ color: "#4c4c4c" }} onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.color = "white"} onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.color = "#4c4c4c"}>
                <span>Open X-Ray</span>
                <div className="flex gap-1.5 text-xs">
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">⌘</span>
                  <span className="border border-[#6b6b6b] px-2 py-0.5 rounded text-[10px]">O</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



function ClinicalNotesPlaceholder({ patientState }: { patientState: PatientState | null }) {
  const demoNotes = `CLINICAL NOTES — Sarah Chen (DOB: 1990-04-12)
Date: 2024-03-15  Provider: Dr. Martinez

CHIEF COMPLAINT: Routine checkup, occasional sensitivity upper left.

CLINICAL FINDINGS:
- Tooth #14: MOD caries extending to dentin, moderate depth.
  Recommend composite restoration (D2392).
- Tooth #36: Periapical radiolucency noted on PA radiograph.
  Positive to percussion, negative vitality.
  Root canal therapy indicated (D3330).
- Tooth #47: Early horizontal bone loss (2-3mm).
  Recommend scaling and root planing (D4341).
- Tooth #28: Partially impacted, mesioangular orientation.
  Refer to OMFS for evaluation.

TREATMENT PLAN:
1. [IMMEDIATE] Tooth #36 — Root canal therapy
2. [SOON] Tooth #14 — Composite restoration
3. [SOON] Tooth #28 — Surgical extraction referral
4. [ROUTINE] Tooth #47 — Scaling and root planing

NOTES: Patient informed of findings. Discussed treatment
options and costs. Patient consents to begin with #36 RCT
at next visit.`;

  return (
    <div className="flex h-full">
      {/* Notes side */}
      <div className="flex-1 border-r border-ide-hairline overflow-auto scrollbar-ide">
        <div className="h-8 flex items-center px-3 border-b border-ide-hairline bg-ide-bg">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
            Clinical Notes
          </span>
          <span className="ml-2 text-[9px] text-ide-muted bg-ide-surface px-1.5 py-0.5 rounded">
            Highlight text to analyze
          </span>
        </div>
        <pre className="p-4 text-xs leading-relaxed text-ide-text-2 font-mono whitespace-pre-wrap select-text cursor-text">
          {demoNotes}
        </pre>
      </div>

      {/* Treatment plan side */}
      <div className="w-[280px] overflow-auto scrollbar-ide flex flex-col">
        <div className="h-8 flex items-center px-3 border-b border-ide-hairline bg-ide-bg">
          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
            Treatment Timeline
          </span>
        </div>
        <div className="p-3 space-y-2">
          {patientState && Object.values(patientState.tooth_chart).length > 0 ? (
            <>
              <TimelineCard urgency="immediate" color="#FF5C7A" tooth={36} condition="Periapical lesion" treatment="Root canal therapy" visits={2} cost="$700–1200" />
              <TimelineCard urgency="soon" color="#F4C152" tooth={14} condition="MOD caries" treatment="Composite restoration" visits={1} cost="$150–300" />
              <TimelineCard urgency="soon" color="#F4C152" tooth={28} condition="Partial impaction" treatment="Surgical extraction" visits={1} cost="$300–600" />
              <TimelineCard urgency="routine" color="#2BD4A7" tooth={47} condition="Bone loss" treatment="Scaling & root planing" visits={2} cost="$200–400" />
            </>
          ) : (
            <div className="text-[11px] text-ide-muted text-center py-8">
              Highlight clinical text to generate treatment timeline
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineCard({ urgency, color, tooth, condition, treatment, visits, cost }: {
  urgency: string; color: string; tooth: number; condition: string;
  treatment: string; visits: number; cost: string;
}) {
  return (
    <div className="bg-ide-surface border border-ide-border rounded-md p-2.5 animate-slide-in">
      <div className="flex items-center gap-1 mb-1.5">
        <span
          className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ color, background: `${color}20` }}
        >
          {urgency}
        </span>
        <span className="text-[11px] font-mono text-ide-text">#{tooth}</span>
      </div>
      <div className="text-xs text-ide-text mb-0.5">{condition}</div>
      <div className="text-[11px] text-ide-text-2">{treatment}</div>
      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-ide-muted">
        <span>{visits} visit{visits > 1 ? "s" : ""}</span>
        <span>{cost}</span>
      </div>
    </div>
  );
}

function ToothChartPlaceholder({ patientState }: { patientState: PatientState | null }) {
  const findings = patientState ? Object.values(patientState.tooth_chart) : [];

  const TOOTH_COLORS: Record<string, string> = {
    cavity: "#F4C152",
    periapical_lesion: "#FF5C7A",
    bone_loss: "#A78BFA",
    impacted: "#4C9AFF",
    root_canal_needed: "#FF5C7A",
    fracture: "#FF9F4A",
    gingivitis: "#F4C152",
  };

  // FDI tooth numbers
  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  const getToothColor = (num: number) => {
    const finding = patientState?.tooth_chart[num];
    return finding ? TOOTH_COLORS[finding.condition] || "#6E7A92" : undefined;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <h3 className="text-sm font-medium text-ide-text mb-6">Interactive Tooth Chart</h3>

      {/* Upper arch */}
      <div className="flex gap-1 mb-2">
        {upperTeeth.map((num) => {
          const color = getToothColor(num);
          return (
            <div
              key={num}
              className="w-8 h-10 rounded-t-lg border border-ide-border flex flex-col items-center justify-center cursor-pointer hover:border-ide-accent transition-colors"
              style={color ? { borderColor: color, background: `${color}15` } : {}}
            >
              <span className="text-[9px] font-mono text-ide-muted">{num}</span>
              {color && <div className="w-2 h-2 rounded-full mt-0.5" style={{ background: color }} />}
            </div>
          );
        })}
      </div>

      {/* Midline */}
      <div className="w-full max-w-md h-px bg-ide-hairline my-1 relative">
        <span className="absolute left-1/2 -translate-x-1/2 -top-2 text-[8px] text-ide-muted bg-ide-panel px-2">
          R ← → L
        </span>
      </div>

      {/* Lower arch */}
      <div className="flex gap-1 mt-2">
        {lowerTeeth.map((num) => {
          const color = getToothColor(num);
          return (
            <div
              key={num}
              className="w-8 h-10 rounded-b-lg border border-ide-border flex flex-col items-center justify-center cursor-pointer hover:border-ide-accent transition-colors"
              style={color ? { borderColor: color, background: `${color}15` } : {}}
            >
              {color && <div className="w-2 h-2 rounded-full mb-0.5" style={{ background: color }} />}
              <span className="text-[9px] font-mono text-ide-muted">{num}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-8">
        {Object.entries(TOOTH_COLORS).map(([condition, color]) => (
          <div key={condition} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-ide-muted capitalize">{condition.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentPlaceholder({ patientState }: { patientState: PatientState | null }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 rounded-lg bg-ide-surface flex items-center justify-center mb-4">
        <span className="text-2xl">💊</span>
      </div>
      <h3 className="text-sm font-medium text-ide-text mb-1">Treatment & Evidence</h3>
      <p className="text-[11px] text-ide-muted max-w-xs">
        Click a condition in the treatment timeline to look up evidence-based guidelines, success rates, and referral options.
      </p>
    </div>
  );
}
