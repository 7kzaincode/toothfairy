"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import type { PatientState } from "@/types/patient-state";
import type { PatientProfile, ProfileListItem } from "@/lib/api/client";
import { apiClient } from "@/lib/api/client";

interface LeftPaneProps {
  patientState?: PatientState | null;
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
  width = 260,
}: LeftPaneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [listOpen, setListOpen] = useState(true);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage?.(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ide-muted" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
            Tooth Fairy
          </span>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
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

          {/* Dropdown */}
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
                    <div className="text-[11px] text-ide-muted">{p.last_visit || p.patient_id}</div>
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
          onClick={() => fileInputRef.current?.click()}
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

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name..."
            className="w-full bg-ide-surface border border-ide-border rounded-lg py-2 pl-8 pr-3 text-[13px] text-ide-text placeholder:text-ide-muted focus:outline-none focus:border-ide-text/30 transition-colors"
          />
        </div>
      </div>

      {/* Active patients label */}
      <button
        onClick={() => setListOpen(!listOpen)}
        className="px-4 py-2 flex items-center gap-1 shrink-0 w-full hover:bg-ide-surface transition-colors"
      >
        <span className="text-[11px] font-semibold text-ide-muted uppercase tracking-wider">Active patients</span>
        <svg
          className={`w-3 h-3 text-ide-muted transition-transform ${listOpen ? "rotate-0" : "-rotate-90"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Patient list */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${listOpen ? "" : "hidden"}`} style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0 && (
          <div className="px-4 py-6 text-[12px] text-ide-muted text-center">No patients found</div>
        )}
        {filtered.map((p) => {
          const isSelected = profile?.patient_id === p.patient_id;
          return (
            <button
              key={p.patient_id}
              onClick={() => onProfileSelect?.(p.patient_id)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-ide-hairline text-left transition-colors hover:bg-[#f7f7f7] ${
                isSelected ? "bg-[#f5f5f5]" : ""
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? "bg-ide-text border-ide-text" : "border-ide-border bg-white"
              }`}>
                {isSelected && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-ide-text truncate">{p.name}</div>
                <div className="text-[12px] text-ide-muted mt-0.5">
                  {p.last_visit ? formatDate(p.last_visit) : "No visits on record"}
                  {p.xray_count > 0 && (
                    <span className="ml-1.5">· {p.xray_count} x-ray{p.xray_count !== 1 ? "s" : ""}</span>
                  )}
                </div>
                {p.insurance && (
                  <div className="text-[11px] text-ide-muted mt-0.5 truncate">{p.insurance}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Patient info + previous procedures — scrollable bottom section */}
      {profile && (
        <div className="shrink-0 border-t border-ide-border overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {/* Patient Info */}
          <div className="px-4 pt-4 pb-3 border-b border-ide-border">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-ide-text mb-3">Patient Info</div>
            <div className="space-y-2.5 text-[13px]">
              {profile.age && <InfoRow label="Age" value={`${profile.age} years`} />}
              {profile.gender && <InfoRow label="Gender" value={profile.gender === "M" ? "Male" : profile.gender === "F" ? "Female" : profile.gender} />}
              {profile.allergies && <InfoRow label="Allergies" value={profile.allergies.join(", ")} />}
              {profile.last_visit && <InfoRow label="Last Visit" value={profile.last_visit} />}
              {profile.insurance && <InfoRow label="Insurance" value={profile.insurance} />}
            </div>
          </div>

          {/* Previous Procedures */}
          <PreviousProcedures />
        </div>
      )}
    </div>
  );
}

const PROCEDURES = [
  { name: "Periodontal maintenance cleaning", date: "2025-09-20", tooth: null },
  { name: "PFM crown delivery", date: "2025-01-15", tooth: 36 },
  { name: "Root canal therapy", date: "2024-11-05", tooth: 36 },
  { name: "Scaling and root planing (full mouth)", date: "2024-03-18", tooth: null },
  { name: "Composite filling", date: "2023-07-12", tooth: 14 },
];

function PreviousProcedures() {
  const [open, setOpen] = useState(true);
  return (
    <div className="px-4 pt-3 pb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ide-text">Previous Procedures</span>
        <svg
          className={`w-3.5 h-3.5 text-ide-muted transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3">
          {PROCEDURES.map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-ide-text leading-snug truncate">{p.name}</div>
                <div className="text-[11px] text-ide-muted mt-0.5">{p.date}</div>
              </div>
              {p.tooth && (
                <span className="text-[12px] font-medium text-ide-muted shrink-0">#{p.tooth}</span>
              )}
            </div>
          ))}
        </div>
      )}
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

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}
