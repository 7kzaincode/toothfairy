"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { PatientState } from "@/types/patient-state";
import type { PatientProfile, ProfileListItem } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";

/* ── Shared SVG icons ── */
function UserIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
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

/* ── Custom Dropdown ── */
interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  icon,
}: {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
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

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 bg-ide-surface border border-ide-border text-ide-text text-xs py-2 px-2.5 rounded-md hover:border-ide-accent transition-colors cursor-pointer"
      >
        {icon && <span className="shrink-0 text-ide-muted">{icon}</span>}
        <span className="flex-1 text-left truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`text-ide-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1e1e1e] border border-ide-border rounded-lg shadow-xl overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs transition-colors hover:bg-white/5 ${opt.value === value ? "text-ide-text" : "text-ide-text-2"}`}
            >
              {opt.icon && <span className="shrink-0">{opt.icon}</span>}
              <span className="flex-1 text-left truncate">{opt.label}</span>
              {opt.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Patient Dropdown (special layout with avatar row) ── */
function PatientDropdown({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: ProfileListItem[];
  selectedId: string;
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

  const selected = profiles.find((p) => p.patient_id === selectedId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 hover:bg-ide-surface/60 rounded-lg px-1.5 py-1.5 transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-full bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
          <UserIcon size={18} className="text-ide-muted" />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="text-sm font-medium text-ide-text truncate">
            {selected ? selected.name : "Select patient..."}
          </div>
          {selected && <div className="text-[10px] text-ide-muted">{selected.patient_id}</div>}
        </div>
        <ChevronDown className={`text-ide-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1e1e1e] border border-ide-border rounded-lg shadow-xl overflow-hidden">
          {profiles.map((p) => (
            <button
              key={p.patient_id}
              type="button"
              onClick={() => { onSelect(p.patient_id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-3 transition-colors hover:bg-white/5 ${p.patient_id === selectedId ? "text-ide-text" : "text-ide-text-2"}`}
            >
              <div className="w-8 h-8 rounded-full bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
                <UserIcon size={16} className="text-ide-muted" />
              </div>
              <span className="flex-1 text-left text-[13px] truncate">{p.name}</span>
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
  const [scanType, setScanType] = useState("dental-xray");

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
            className="text-[10px] font-bold tracking-tight text-ide-muted"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            toothfairy
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
        <span className="text-[12px] font-bold tracking-tight text-ide-text">
          toothfairy
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

      {/* Patient */}
      <div className="px-3 py-4 border-b border-ide-hairline">
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ide-muted mb-3">
          Patient
        </div>
        {profiles.length > 0 ? (
          <PatientDropdown
            profiles={profiles}
            selectedId={profile?.patient_id || ""}
            onSelect={(id) => onProfileSelect?.(id)}
          />
        ) : profile ? (
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-full bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
              <UserIcon size={18} className="text-ide-muted" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-ide-text truncate">{profile.name}</div>
              <div className="text-[10px] text-ide-muted mt-0.5">{profile.patient_id}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-ide-muted">No profile loaded</div>
        )}
        {profile && (
          <div className="space-y-2.5 text-[11px] mt-4">
            {profile.age && <InfoRow label="Age" value={`${profile.age} years`} />}
            {profile.gender && <InfoRow label="Gender" value={profile.gender === "M" ? "Male" : profile.gender === "F" ? "Female" : profile.gender} />}
            {profile.allergies && <InfoRow label="Allergies" value={profile.allergies.join(", ")} />}
            {profile.last_visit && <InfoRow label="Last Visit" value={profile.last_visit} />}
            {profile.insurance && <InfoRow label="Insurance" value={profile.insurance} />}
          </div>
        )}
      </div>

      {/* Scan Type Dropdown */}
      <div className="px-3 py-4 border-b border-ide-hairline">
        <label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ide-muted block mb-2.5">
          Scan Type
        </label>
        <CustomDropdown
          options={[{ value: "dental-xray", label: "Dental X-ray" }]}
          value={scanType}
          onChange={(v) => {
            setScanType(v);
            if (v === "dental-xray") onSelectArtifact?.("imaging");
          }}
        />
      </div>

      {/* Upload */}
      <div className="px-3 py-4 border-b border-ide-hairline">
        <button
          onClick={handleUploadClick}
          className="w-full border border-ide-border hover:border-ide-text text-ide-muted hover:text-ide-text text-xs font-medium py-2.5 px-3 rounded-md transition-colors duration-150"
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
        <div className="px-3 py-4 border-b border-ide-hairline">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ide-muted mb-2.5">
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
        <div className="px-3 pt-4 pb-6 flex-1 overflow-y-auto">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ide-muted mb-3">
            Previous Procedures
          </div>
          <div className="space-y-4">
            {profile.dental_history.previous_procedures.map((proc, i) => (
              <div key={i} className="text-[12px] text-ide-text-2 pb-4 border-b border-ide-hairline last:border-0 last:pb-0">
                <div className="flex justify-between items-center">
                  <span className="truncate font-medium">{proc.procedure}</span>
                  {proc.tooth && <span className="text-ide-muted shrink-0 ml-1 text-[11px]">#{proc.tooth}</span>}
                </div>
                <div className="text-ide-muted text-[11px] mt-1.5">{proc.date}</div>
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
