"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiClient.listProfiles().then((res) => setProfiles(res.profiles)).catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
      {/* Header — logo / patient selector / collapse */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border shrink-0" ref={dropdownRef}>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 relative">
          <Image src="/logo.png" alt="Logo" width={20} height={20} className="opacity-80 shrink-0 invert" />
          <span className="text-ide-border text-sm">/</span>
          <div className="w-6 h-6 rounded-full bg-ide-surface flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-ide-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 text-[13px] font-medium text-ide-text hover:text-ide-text-2 transition-colors truncate"
          >
            <span className="truncate">{profile?.name || "Select patient"}</span>
            <svg className="w-3 h-3 text-ide-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 10l4 4 4-4" />
            </svg>
          </button>

          {/* Custom Dropdown */}
          {dropdownOpen && profiles.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-ide-border rounded-xl shadow-lg z-50 py-2 overflow-hidden">
              <div className="px-4 py-2 text-[11px] font-semibold text-ide-muted uppercase tracking-wider">
                Patients
              </div>
              {profiles.map((p) => (
                <button
                  key={p.patient_id}
                  onClick={() => {
                    onProfileSelect?.(p.patient_id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-ide-surface transition-colors text-left ${
                    profile?.patient_id === p.patient_id ? "bg-ide-surface" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-ide-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-ide-text">{p.name}</div>
                    <div className="text-[11px] text-ide-muted">{p.patient_id}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-ide-surface rounded transition-colors text-ide-muted hover:text-ide-text shrink-0"
          title="Collapse"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* Upload X-Ray Button */}
      <div className="px-3 py-3">
        <button
          onClick={handleUploadClick}
          className="w-full bg-ide-text text-ide-bg text-[13px] font-semibold py-2.5 px-4 rounded-lg transition-all hover:opacity-90 active:scale-[0.98]"
        >
          Upload X-Ray
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".dcm,.jpg,.jpeg,.png,.tiff,.tif"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Patient Info */}
      {profile && (
        <div className="px-4 py-4 border-t border-ide-hairline">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ide-text mb-4">
            Patient Info
          </div>
          <div className="space-y-4 text-[13px]">
            {profile.age && <InfoRow label="Age" value={`${profile.age} years`} />}
            {profile.gender && <InfoRow label="Gender" value={profile.gender === "M" ? "Male" : profile.gender === "F" ? "Female" : profile.gender} />}
            {profile.allergies && <InfoRow label="Allergies" value={profile.allergies.join(", ")} />}
            {profile.last_visit && <InfoRow label="Last Visit" value={profile.last_visit} />}
            {profile.insurance && <InfoRow label="Insurance" value={profile.insurance} />}
          </div>
        </div>
      )}

      {/* Previous Procedures */}
      {profile?.dental_history?.previous_procedures && profile.dental_history.previous_procedures.length > 0 && (
        <ProceduresSection procedures={profile.dental_history.previous_procedures} />
      )}

      <div className="flex-1" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between">
      <span className="text-ide-muted">{label}</span>
      <span className="text-ide-text font-medium text-right truncate ml-3">{value}</span>
    </div>
  );
}

function ProceduresSection({ procedures }: { procedures: Array<{ procedure: string; date: string; tooth?: string }> }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="px-4 py-4 border-t border-ide-hairline flex-1 overflow-hidden flex flex-col">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-3"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ide-text">
          Previous Procedures
        </span>
        <svg
          className={`w-4 h-4 text-ide-muted transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="space-y-4 overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
          {procedures.map((proc, i) => (
            <div key={i}>
              <div className="flex justify-between items-start">
                <span className="text-[13px] font-semibold text-ide-text truncate">{proc.procedure}</span>
                {proc.tooth && <span className="text-[13px] text-ide-muted shrink-0 ml-2">#{proc.tooth}</span>}
              </div>
              <div className="text-[12px] text-ide-muted mt-0.5">{proc.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
