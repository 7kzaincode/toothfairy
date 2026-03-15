"use client";

import { useRef, useState, useEffect } from "react";
import type { PatientState } from "@/types/patient-state";
import type { PatientProfile, ProfileListItem } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";

interface LeftPaneProps {
  patientState: PatientState | null;
  profile: PatientProfile | null;
  onUploadImage?: (file: File) => void;
  onSelectArtifact?: (type: string) => void;
  onProfileSelect?: (patientId: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  width?: number;
}

export default function LeftPane({
  patientState,
  profile,
  onSelectArtifact,
  onUploadImage,
  onProfileSelect,
  collapsed,
  onToggle,
  width = 240,
}: LeftPaneProps) {
  const findings = patientState ? Object.values(patientState.tooth_chart) : [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);

  // Load profile list
  useEffect(() => {
    apiClient.listProfiles().then((res) => setProfiles(res.profiles)).catch(() => {});
  }, []);

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

      {/* Patient Info — from profile */}
      <div className="px-3 py-3 border-b border-ide-hairline">
        <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-2">
          Patient
        </div>
        {profile ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-ide-accent/20 border border-ide-accent/30 flex items-center justify-center text-[11px] font-semibold text-ide-accent shrink-0">
                {profile.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-ide-text truncate">{profile.name}</div>
                <div className="text-[10px] text-ide-muted">{profile.patient_id}</div>
              </div>
            </div>
            <div className="space-y-2 text-[10px]">
              {profile.age && <InfoRow label="Age" value={`${profile.age} years`} />}
              {profile.gender && <InfoRow label="Gender" value={profile.gender === "M" ? "Male" : profile.gender === "F" ? "Female" : profile.gender} />}
              {profile.allergies && <InfoRow label="Allergies" value={profile.allergies.join(", ")} />}
              {profile.last_visit && <InfoRow label="Last Visit" value={profile.last_visit} />}
              {profile.insurance && <InfoRow label="Insurance" value={profile.insurance} />}
            </div>
          </>
        ) : (
          <div className="text-xs text-ide-muted">No profile loaded</div>
        )}
      </div>

      {/* Profile Switcher */}
      {profiles.length > 0 && (
        <div className="px-3 py-2 border-b border-ide-hairline">
          <label className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted block mb-1.5">
            {profile ? "Switch Patient" : "Select Patient"}
          </label>
          <select
            value={profile?.patient_id || ""}
            onChange={(e) => {
              if (e.target.value) onProfileSelect?.(e.target.value);
            }}
            className="w-full bg-ide-surface border border-ide-border text-ide-text text-xs py-1.5 px-2 rounded hover:border-ide-accent transition-colors cursor-pointer"
          >
            {!profile && <option value="">— Select —</option>}
            {profiles.map((p) => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {/* Upload */}
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

      {/* X-ray History */}
      {profile?.xrays && profile.xrays.length > 0 && (
        <div className="px-3 py-2 border-b border-ide-hairline">
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-2">
            X-ray History
          </div>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
            {profile.xrays.map((xray) => (
              <div
                key={xray.image_id}
                className="flex items-center justify-between text-[10px] px-1.5 py-1 rounded bg-ide-surface/50 hover:bg-ide-surface transition-colors cursor-pointer"
                onClick={() => onSelectArtifact?.("imaging")}
              >
                <span className="text-ide-text-2 truncate">{xray.image_id}</span>
                <span className="text-ide-muted shrink-0 ml-2">{xray.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dental History */}
      {profile?.dental_history?.previous_procedures && profile.dental_history.previous_procedures.length > 0 && (
        <div className="px-3 py-2 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted mb-2">
            Previous Procedures
          </div>
          <div className="space-y-1.5">
            {profile.dental_history.previous_procedures.map((proc, i) => (
              <div key={i} className="text-[10px] text-ide-text-2">
                <div className="flex justify-between">
                  <span className="truncate">{proc.procedure}</span>
                  {proc.tooth && <span className="text-ide-muted shrink-0 ml-1">#{proc.tooth}</span>}
                </div>
                <div className="text-ide-muted">{proc.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-ide-muted">{label}:</span>
      <span className="text-ide-text-2 text-right">{value}</span>
    </div>
  );
}
