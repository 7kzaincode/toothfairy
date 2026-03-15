"use client";

import { useRef } from "react";
import type { PatientState } from "@/types/patient-state";

interface LeftPaneProps {
  patientState: PatientState | null;
  onUploadImage?: (file: File) => void;
  onSelectArtifact?: (type: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  width?: number;
}

export default function LeftPane({
  patientState,
  onSelectArtifact,
  onUploadImage,
  collapsed,
  onToggle,
  width = 240,
}: LeftPaneProps) {
  const findings = patientState ? Object.values(patientState.tooth_chart) : [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage?.(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Collapsed state
  if (collapsed) {
    return (
      <div className="w-[36px] flex-shrink-0 border-r border-ide-border bg-ide-bg flex flex-col items-center h-full">
        <button
          onClick={onToggle}
          className="w-full h-9 flex items-center justify-center border-b border-ide-border hover:bg-ide-surface transition-colors text-ide-muted hover:text-ide-text"
          title="Expand sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ide-muted"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            Tooth Fairy
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-r border-ide-border bg-ide-panel flex flex-col h-full" style={{ width }}>
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ide-text-2">
          Tooth Fairy
        </span>
        <div className="flex items-center gap-1">
          {patientState && (
            <span className="text-[9px] font-mono text-ide-muted bg-ide-surface px-1.5 py-0.5 rounded">
              {patientState.identifiers.session_id.slice(0, 13)}
            </span>
          )}
          <button
            onClick={onToggle}
            className="p-1 hover:bg-ide-surface rounded transition-colors text-ide-muted hover:text-ide-text"
            title="Collapse"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
      </div>

      {patientState ? (
        <>
          {/* Patient Info */}
          <div className="px-3 py-3 border-b border-ide-hairline">
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-2">
              Patient
            </div>
            <div className="text-sm font-medium text-ide-text mb-3">Sarah Chen</div>
            <div className="space-y-2 text-[10px]">
              <InfoRow label="ID" value="SC-2024-001" />
              <InfoRow label="Age" value="34 years" />
              <InfoRow label="Allergies" value="Penicillin, NSAIDs" />
              <InfoRow label="Last Visit" value="2024-03-08" />
            </div>
          </div>

          {/* Scan Type Dropdown */}
          <div className="px-3 py-3 border-b border-ide-hairline">
            <label className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted block mb-2">
              Scan Type
            </label>
            <select
              defaultValue="dental-xray"
              onChange={(e) => {
                if (e.target.value === "dental-xray") {
                  onSelectArtifact?.("imaging");
                }
              }}
              className="w-full bg-ide-surface border border-ide-border text-ide-text text-xs py-2 px-2 rounded hover:border-ide-accent transition-colors cursor-pointer"
            >
              <option value="dental-xray">Dental X-ray</option>
            </select>
          </div>

          {/* Upload Dental X-Ray */}
          <div className="px-2 py-2 border-b border-ide-hairline">
            <button
              onClick={handleUploadClick}
              className="w-full border border-[#8e8e8e] hover:border-white text-[#8e8e8e] hover:text-white text-xs font-medium py-2 px-2 rounded transition-colors duration-150"
            >
              ↑ Upload Dental X-Ray
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </>
      ) : (
        <>
          {/* Patient Selector */}
          <div className="px-3 py-3 border-b border-ide-hairline">
            <label className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted block mb-2">
              Patient
            </label>
            <select
              defaultValue="demo-001"
              className="w-full bg-ide-surface border border-ide-border text-ide-text text-xs py-2 px-2 rounded hover:border-ide-accent transition-colors cursor-pointer"
            >
              <option value="demo-001">Demo-001</option>
              <option value="demo-002">Demo-002</option>
              <option value="demo-003">Demo-003</option>
            </select>
          </div>

          {/* Scan Type Selection */}
          <div className="px-3 py-3 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-4">
              Select Scan Type
            </p>
            <button
              onClick={handleUploadClick}
              className="w-full flex items-start gap-3 text-ide-text text-xs py-3 px-2 rounded transition-colors duration-150 hover:text-ide-accent text-left"
            >
              <span className="text-2xl flex-shrink-0">📷</span>
              <div className="flex flex-col">
                <span className="font-medium">X-ray Scan</span>
                <span className="text-[9px] text-ide-muted">2D dental radiograph</span>
              </div>
            </button>
            <button
              onClick={() => onSelectArtifact?.("tooth-chart")}
              className="w-full flex items-start gap-3 text-ide-text text-xs py-3 px-2 rounded transition-colors duration-150 hover:text-ide-accent text-left"
            >
              <span className="text-2xl flex-shrink-0">🎯</span>
              <div className="flex flex-col">
                <span className="font-medium">3D Intraoral Scan</span>
                <span className="text-[9px] text-ide-muted">Digital 3D mouth scan</span>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-ide-muted">{label}:</span>
      <span className="text-ide-text-2">{value}</span>
    </div>
  );
}
