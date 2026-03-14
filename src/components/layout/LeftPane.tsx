"use client";

import { useRef } from "react";
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

interface LeftPaneProps {
  patientState: PatientState | null;
  onUploadImage?: (file: File) => void;
  onSelectArtifact?: (type: string) => void;
}

export default function LeftPane({ patientState, onSelectArtifact, onUploadImage }: LeftPaneProps) {
  const findings = patientState ? Object.values(patientState.tooth_chart) : [];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage?.(file);
      // Reset input for future uploads
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-ide-border bg-ide-panel flex flex-col h-full">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ide-text-2">
          Tooth Fairy
        </span>
        {patientState && (
          <span className="text-[9px] font-mono text-ide-muted bg-ide-surface px-1.5 py-0.5 rounded">
            {patientState.identifiers.session_id.slice(0, 13)}
          </span>
        )}
      </div>

      {patientState ? (
        <>
          {/* Patient Info */}
          <div className="px-3 py-3 border-b border-ide-hairline">
            <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-2">
              Patient
            </div>
            <div className="text-sm font-medium text-ide-text mb-3">Sarah Chen</div>

            {/* Patient History */}
            <div className="space-y-2 text-[10px]">
              <div className="flex items-start justify-between">
                <span className="text-ide-muted">ID:</span>
                <span className="text-ide-text-2">SC-2024-001</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-ide-muted">Age:</span>
                <span className="text-ide-text-2">34 years</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-ide-muted">Allergies:</span>
                <span className="text-ide-text-2">Penicillin, NSAIDs</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-ide-muted">Last Visit:</span>
                <span className="text-ide-text-2">2024-03-08</span>
              </div>
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
        /* Empty State - Show patient selector and scan options */
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

            {/* X-Ray Scan */}
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

            {/* 3D Intraoral Scan */}
            <button
              onClick={handleUploadClick}
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
