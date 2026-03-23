"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ProfileListItem } from "@/lib/api/client";
import type { ViewerTab } from "@/components/layout/CenterPane";

interface Command {
  id: string;
  label: string;
  description?: string;
  shortcut?: string[];
  icon: React.ReactNode;
  action: () => void;
  group: "navigate" | "action" | "patient";
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  profiles: ProfileListItem[];
  activeTab: ViewerTab;
  onTabChange: (tab: ViewerTab) => void;
  onProfileSelect: (id: string) => void;
  onUploadImage: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  hasImage: boolean;
  onAutoScan?: () => void;
  sessionId?: string | null;
}

const XRayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6M9 12h6M9 15h4" />
  </svg>
);
const NotesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </svg>
);
const ToothIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8 2 5 5 5 9c0 2 .5 3.5 1 5 .7 2 1 4 1 6h2c0-1.5.3-3 .8-4.5C10.3 14 11 13 12 13s1.7 1 2.2 2.5C14.7 17 15 18.5 15 20h2c0-2 .3-4 1-6 .5-1.5 1-3 1-5 0-4-3-7-7-7z" />
  </svg>
);
const TreatmentIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
  </svg>
);
const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const ScanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);
const PersonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <kbd key={i} className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-[11px] font-medium text-ide-muted bg-white border border-ide-border rounded shadow-[0_1px_0_rgba(0,0,0,0.08)]">
          {k === "cmd" ? "⌘" : k === "shift" ? "⇧" : k === "alt" ? "⌥" : k}
        </kbd>
      ))}
    </span>
  );
}

export default function CommandPalette({
  open,
  onClose,
  profiles,
  activeTab,
  onTabChange,
  onProfileSelect,
  onUploadImage,
  onToggleLeft,
  onToggleRight,
  hasImage,
  onAutoScan,
  sessionId,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback((tab: ViewerTab) => {
    onTabChange(tab);
    onClose();
  }, [onTabChange, onClose]);

  const baseCommands: Command[] = [
    {
      id: "xray",
      label: "X-Ray Viewer",
      shortcut: ["cmd", "X"],
      icon: <XRayIcon />,
      action: () => navigate("xray"),
      group: "navigate",
    },
    {
      id: "clinical-notes",
      label: "Clinical Notes",
      shortcut: ["⇧", "cmd", "N"],
      icon: <NotesIcon />,
      action: () => navigate("clinical-notes"),
      group: "navigate",
    },
    {
      id: "tooth-chart",
      label: "Tooth Chart",
      shortcut: ["cmd", "T"],
      icon: <ToothIcon />,
      action: () => navigate("tooth-chart"),
      group: "navigate",
    },
    {
      id: "treatment",
      label: "Treatment Plan",
      shortcut: ["cmd", "P"],
      icon: <TreatmentIcon />,
      action: () => navigate("treatment"),
      group: "navigate",
    },
    {
      id: "upload",
      label: "Upload X-Ray",
      shortcut: ["⇧", "cmd", "U"],
      icon: <UploadIcon />,
      action: () => { onUploadImage(); onClose(); },
      group: "action",
    },
    ...(hasImage && onAutoScan ? [{
      id: "autoscan",
      label: "Run Auto Scan",
      shortcut: ["⇧", "cmd", "S"],
      icon: <ScanIcon />,
      action: () => { onAutoScan(); onClose(); },
      group: "action" as const,
    }] : []),
    {
      id: "toggle-left",
      label: "Toggle Sidebar",
      shortcut: ["cmd", "B"],
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="9" y1="3" x2="9" y2="21" />
        </svg>
      ),
      action: () => { onToggleLeft(); onClose(); },
      group: "action",
    },
  ];

  const patientCommands: Command[] = profiles.map((p) => ({
    id: `patient-${p.patient_id}`,
    label: p.name,
    description: p.last_visit ? `Last visit: ${p.last_visit}` : p.patient_id,
    icon: <PersonIcon />,
    action: () => { onProfileSelect(p.patient_id); onClose(); },
    group: "patient" as const,
  }));

  const allCommands = [...baseCommands, ...patientCommands];

  const filtered = query.trim()
    ? allCommands.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  // Group filtered commands
  const groups: { label: string; key: string; items: Command[] }[] = [];
  const nav = filtered.filter((c) => c.group === "navigate");
  const actions = filtered.filter((c) => c.group === "action");
  const patients = filtered.filter((c) => c.group === "patient");
  if (nav.length) groups.push({ label: "Navigate", key: "navigate", items: nav });
  if (actions.length) groups.push({ label: "Actions", key: "action", items: actions });
  if (patients.length) groups.push({ label: "Patients", key: "patient", items: patients });

  const flatFiltered = groups.flatMap((g) => g.items);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, flatFiltered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === "Enter") { e.preventDefault(); flatFiltered[selected]?.action(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selected, flatFiltered, onClose]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

      {/* Panel */}
      <div className="relative w-[540px] max-h-[480px] bg-white rounded-2xl shadow-[0_24px_64px_-12px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ide-border shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ide-muted shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, patients, tabs..."
            className="flex-1 text-[14px] text-ide-text placeholder:text-ide-muted bg-transparent outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-ide-muted hover:text-ide-text transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <kbd className="text-[11px] text-ide-muted bg-ide-surface border border-ide-border rounded px-1.5 py-0.5 shrink-0">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto flex-1" style={{ scrollbarWidth: "none" }}>
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-ide-muted">No results for "{query}"</div>
          ) : (
            groups.map((group) => (
              <div key={group.key}>
                <div className="px-4 py-2 text-[11px] font-semibold text-ide-muted uppercase tracking-wider bg-ide-surface/50 border-b border-ide-border/40">
                  {group.label}
                </div>
                {group.items.map((cmd) => {
                  const idx = globalIdx++;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onClick={cmd.action}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? "bg-ide-surface" : "hover:bg-ide-surface/60"
                      }`}
                    >
                      <span className={`shrink-0 ${isSelected ? "text-ide-text" : "text-ide-muted"}`}>
                        {cmd.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-[14px] font-medium text-ide-text block truncate">{cmd.label}</span>
                        {cmd.description && (
                          <span className="text-[12px] text-ide-muted truncate block">{cmd.description}</span>
                        )}
                      </span>
                      {cmd.shortcut && (
                        <span className="shrink-0 ml-2">
                          <Kbd keys={cmd.shortcut} />
                        </span>
                      )}
                      {isSelected && (
                        <span className="shrink-0 text-ide-muted">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 10 4 15 9 20" />
                            <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-ide-border flex items-center gap-4 shrink-0 bg-ide-surface/30">
          <span className="text-[11px] text-ide-muted flex items-center gap-1.5">
            <Kbd keys={["↑"]} /><Kbd keys={["↓"]} /> navigate
          </span>
          <span className="text-[11px] text-ide-muted flex items-center gap-1.5">
            <Kbd keys={["↵"]} /> open
          </span>
          <span className="text-[11px] text-ide-muted flex items-center gap-1.5">
            <Kbd keys={["esc"]} /> close
          </span>
        </div>
      </div>
    </div>
  );
}
