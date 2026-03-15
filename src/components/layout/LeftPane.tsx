"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { PatientState } from "@/types/patient-state";
import type { PatientProfile, ProfileListItem } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";

/* ── Icons ── */
function UserIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronUpDown({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function ChevronRight({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ide-accent">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Patient Switcher (v0 workspace-style) ── */
function PatientSwitcher({
  profiles,
  selectedId,
  selectedName,
  onSelect,
}: {
  profiles: ProfileListItem[];
  selectedId: string;
  selectedName: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClose = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClose);
    return () => document.removeEventListener("mousedown", handleClose);
  }, [handleClose]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div className="w-6 h-6 rounded-md bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
          <UserIcon size={14} className="text-ide-muted" />
        </div>
        <span className="text-[13px] font-medium text-ide-text truncate max-w-[120px]">
          {selectedName || "Select patient"}
        </span>
        <ChevronUpDown className="text-ide-muted shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 mt-1 w-64 bg-[#1a1a1a] border border-ide-border rounded-lg shadow-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-ide-border">
            <span className="text-[11px] text-ide-muted font-medium">Patients</span>
          </div>
          {profiles.map((p) => (
            <button
              key={p.patient_id}
              type="button"
              onClick={() => { onSelect(p.patient_id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/5 ${p.patient_id === selectedId ? "bg-white/[0.03]" : ""}`}
            >
              <div className="w-7 h-7 rounded-md bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
                <UserIcon size={14} className="text-ide-muted" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-[13px] text-ide-text truncate">{p.name}</div>
                <div className="text-[10px] text-ide-muted">{p.patient_id}</div>
              </div>
              {p.patient_id === selectedId && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
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
  profile,
  onUploadImage,
  onProfileSelect,
  collapsed,
  onToggle,
  width = 240,
}: LeftPaneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [proceduresOpen, setProceduresOpen] = useState(false);

  useEffect(() => {
    apiClient.listProfiles().then((res) => setProfiles(res.profiles)).catch(() => {});
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage?.(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Collapsed
  if (collapsed) {
    return (
      <div className="w-[36px] flex-shrink-0 border-r border-ide-border bg-ide-bg flex flex-col items-center h-full">
        <button
          onClick={onToggle}
          className="w-full h-11 flex items-center justify-center border-b border-ide-border hover:bg-ide-surface transition-colors text-ide-muted hover:text-ide-text"
          title="Expand sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[10px] font-bold tracking-tight text-ide-muted"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            toothfairy
          </span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>
    );
  }

  const hasProcedures = profile?.dental_history?.previous_procedures && profile.dental_history.previous_procedures.length > 0;

  return (
    <div className="flex-shrink-0 border-r border-ide-border bg-ide-bg flex flex-col h-full" style={{ width }}>
      {/* Header — v0 style: logo / patient switcher */}
      <div className="h-11 flex items-center px-3 border-b border-ide-border shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Image src="/logo.png" alt="TF" width={20} height={20} className="shrink-0" />
          <span className="text-[13px] font-bold tracking-tight text-ide-text shrink-0">/</span>
          {profiles.length > 0 ? (
            <PatientSwitcher
              profiles={profiles}
              selectedId={profile?.patient_id || ""}
              selectedName={profile?.name || ""}
              onSelect={(id) => onProfileSelect?.(id)}
            />
          ) : (
            <span className="text-[13px] text-ide-muted truncate">
              {profile ? profile.name : "No patient"}
            </span>
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

      {/* Upload button */}
      <div className="px-3 py-4 border-b border-ide-border">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-white text-black text-[13px] font-medium py-2 px-3 rounded-lg hover:bg-white/90 active:scale-[0.98] transition-all"
        >
          Upload X-Ray
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Patient Info — shown when a patient is selected */}
      {profile && (
        <div className={`px-3 py-5 border-b border-ide-border ${!hasProcedures ? "flex-1" : ""}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ide-muted mb-4">
            Patient Info
          </div>
          <div className="space-y-3.5 text-[12px]">
            {profile.age && (
              <div className="flex items-center justify-between">
                <span className="text-ide-muted">Age</span>
                <span className="text-ide-text-2">{profile.age} years</span>
              </div>
            )}
            {profile.gender && (
              <div className="flex items-center justify-between">
                <span className="text-ide-muted">Gender</span>
                <span className="text-ide-text-2">{profile.gender === "M" ? "Male" : profile.gender === "F" ? "Female" : profile.gender}</span>
              </div>
            )}
            {profile.allergies && profile.allergies.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-ide-muted">Allergies</span>
                <span className="text-ide-text-2 text-right max-w-[60%] truncate">{profile.allergies.join(", ")}</span>
              </div>
            )}
            {profile.last_visit && (
              <div className="flex items-center justify-between">
                <span className="text-ide-muted">Last Visit</span>
                <span className="text-ide-text-2">{profile.last_visit}</span>
              </div>
            )}
            {profile.insurance && (
              <div className="flex items-center justify-between">
                <span className="text-ide-muted">Insurance</span>
                <span className="text-ide-text-2 text-right max-w-[60%] truncate">{profile.insurance}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Previous Procedures — v0 collapsible section */}
      {hasProcedures && (
        <div className="flex-1 min-h-0 flex flex-col">
          <button
            type="button"
            onClick={() => setProceduresOpen(!proceduresOpen)}
            className="flex items-center justify-between px-3 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ide-muted hover:text-ide-text transition-colors w-full"
          >
            <span>Previous Procedures</span>
            <ChevronRight className={`transition-transform duration-200 ${proceduresOpen ? "rotate-90" : ""}`} />
          </button>

          {proceduresOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-ide px-3 pb-4">
              <div className="flex flex-col gap-1">
                {profile!.dental_history!.previous_procedures!.map((proc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-md text-[12px] text-ide-text-2 hover:bg-white/[0.04] transition-colors cursor-default"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium text-ide-text">{proc.procedure}</span>
                        {proc.tooth && <span className="text-ide-muted shrink-0 ml-1 text-[11px]">#{proc.tooth}</span>}
                      </div>
                      <div className="text-[10px] text-ide-muted mt-1">{proc.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spacer when no patient selected */}
      {!profile && <div className="flex-1" />}
    </div>
  );
}
