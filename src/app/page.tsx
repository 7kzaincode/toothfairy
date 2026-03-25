"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePatientState } from "@/hooks/usePatientState";
import { useCopilot } from "@/hooks/useCopilot";
import { useSSE } from "@/hooks/useSSE";
import { apiClient } from "@/lib/api/client";
import type { ProfileListItem } from "@/lib/api/client";
import LeftPane from "@/components/layout/LeftPane";
import CenterPane from "@/components/layout/CenterPane";
import RightPane from "@/components/layout/RightPane";
import ResizeHandle from "@/components/layout/ResizeHandle";
import LandingPopup from "@/components/layout/LandingPopup";
import CommandPalette from "@/components/layout/CommandPalette";
import type { ViewerTab } from "@/components/layout/CenterPane";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewerTab>("xray");
  const { sessionId, patientState, profile, createSession, refreshState, switchProfile, clearProfile } = usePatientState();
  const [hasUploaded, setHasUploaded] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileListItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collapse state for sidebars
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Resizable pane widths
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(300);

  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((w) => Math.max(180, Math.min(400, w + delta)));
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((w) => Math.max(220, Math.min(500, w - delta)));
  }, []);

  // SSE logs from backend
  const { logs, connected } = useSSE(sessionId);

  // Copilot actions
  const copilot = useCopilot(sessionId, refreshState);

  // Display state: prefer real state from backend
  const displayState = patientState || null;

  // Auto-parse clinical notes when profile loads (populates tooth chart from notes)
  const notesParsedRef = useRef<string | null>(null);
  const triggerClinicalNotes = copilot.triggerClinicalNotes;
  useEffect(() => {
    const notes = profile?.clinical_notes;
    if (notes && sessionId && notesParsedRef.current !== notes) {
      notesParsedRef.current = notes;
      triggerClinicalNotes(notes, notes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.clinical_notes, sessionId]);

  // Load profiles for command palette
  useEffect(() => {
    apiClient.listProfiles().then((res) => setProfiles(res.profiles)).catch(() => {});
  }, []);

  // Global ⌘K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleToothSelect = (_toothNumber: number) => {
    // Just select the tooth on the 3D model — the popup handles navigation to treatment
  };

  const handleFileUpload = async (file: File) => {
    try {
      const result = await apiClient.uploadImage(file);
      setUploadedImageId(result.image_id);
      setUploadedImageUrl(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/imaging/image/${result.image_id}`);
      // Link X-ray to current profile
      if (profile) {
        try {
          await apiClient.linkXrayToProfile(profile.patient_id, result.image_id);
        } catch {}
      }
      setHasUploaded(true);
      setActiveTab("xray");
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadedImageUrl(URL.createObjectURL(file));
      setHasUploaded(true);
      setActiveTab("xray");
    }
  };

  const handleImagingClick = (imageId: string, x: number, y: number) => {
    copilot.triggerImaging(imageId, x, y);
  };

  const handleTextHighlight = (text: string) => {
    copilot.triggerClinicalNotes(text, profile?.clinical_notes);
  };

  const handleTreatmentClick = (condition: string, toothNumber?: number) => {
    copilot.triggerTreatment(condition, toothNumber);
    setActiveTab("treatment");
  };

  const [focusToothFDI, setFocusToothFDI] = useState<number | null>(null);

  const handleViewOnModel = (toothNumber: number) => {
    setFocusToothFDI(toothNumber);
    setActiveTab("tooth-chart");
  };

  const handleAutoScan = (imageId: string) => {
    if (sessionId) {
      // Collapse sidebars for full-width X-ray view during scan
      setLeftCollapsed(true);
      setRightCollapsed(true);
      copilot.triggerAutoScan(imageId, "panoramic");
    }
  };

  const handleProfileSelect = async (patientId: string) => {
    if (profile?.patient_id === patientId) {
      // Clicking the already-selected patient deselects them
      setUploadedImageId(null);
      setUploadedImageUrl(null);
      setHasUploaded(false);
      clearProfile();
      return;
    }
    // Reset upload state when switching profiles
    setUploadedImageId(null);
    setUploadedImageUrl(null);
    setHasUploaded(false);
    await switchProfile(patientId);
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-ide-bg">
      {showLanding && (
        <LandingPopup
          onDismiss={async () => {
            setShowLanding(false);
          }}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".dcm,.jpg,.jpeg,.png,.tiff,.tif"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleFileUpload(f); if (fileInputRef.current) fileInputRef.current.value = ""; } }}
        className="hidden"
      />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        profiles={profiles}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onProfileSelect={handleProfileSelect}
        onUploadImage={() => fileInputRef.current?.click()}
        onToggleLeft={() => setLeftCollapsed((v) => !v)}
        onToggleRight={() => setRightCollapsed((v) => !v)}
        hasImage={!!uploadedImageId}
        onAutoScan={uploadedImageId ? () => handleAutoScan(uploadedImageId) : undefined}
        sessionId={sessionId}
      />
      <LeftPane
        patientState={displayState}
        profile={profile}
        onUploadImage={handleFileUpload}
        onSelectArtifact={(type) => {
          if (type === "imaging") setActiveTab("xray");
          else if (type === "clinical_notes") setActiveTab("clinical-notes");
          else if (type === "treatment") setActiveTab("treatment");
          else if (type === "tooth-chart") setActiveTab("tooth-chart");
        }}
        onProfileSelect={handleProfileSelect}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((v) => !v)}
        width={leftWidth}
      />
      {!leftCollapsed && <ResizeHandle direction="horizontal" onResize={handleLeftResize} />}
      <CenterPane
        activeTab={activeTab}
        onTabChange={setActiveTab}
        patientState={displayState}
        profile={profile}
        sessionId={sessionId || displayState?.identifiers.session_id || null}
        onOpenCommandPalette={() => setCmdOpen(true)}
        onToothSelect={handleToothSelect}
        onTextHighlight={handleTextHighlight}
        onTreatmentClick={handleTreatmentClick}
        onImagingClick={handleImagingClick}
        onFileUpload={handleFileUpload}
        onClearImage={() => {
          setUploadedImageId(null);
          setUploadedImageUrl(null);
        }}
        onToggleLeftPane={() => setLeftCollapsed((v) => !v)}
        onToggleRightPane={() => setRightCollapsed((v) => !v)}
        onAutoScan={handleAutoScan}
        onViewOnModel={handleViewOnModel}
        imageId={uploadedImageId}
        imageUrl={uploadedImageUrl}
        imagingResult={copilot.lastImagingResult}
        autoScanResult={copilot.lastAutoScanResult}
        clinicalNotesOutput={copilot.lastClinicalNotesResult ? {
          diagnoses: copilot.lastClinicalNotesResult.diagnoses,
          protocols: copilot.lastClinicalNotesResult.protocols,
          timeline: copilot.lastClinicalNotesResult.timeline,
          patient_summary: copilot.lastClinicalNotesResult.patient_summary,
          dentist_summary: copilot.lastClinicalNotesResult.dentist_summary,
        } : undefined}
        treatmentResult={copilot.lastTreatmentResult}
        profileNotes={profile?.clinical_notes || null}
        onClearTreatment={copilot.clearTreatmentResult}
        processing={copilot.processing}
        focusToothFDI={focusToothFDI}
      />
      {!rightCollapsed && <ResizeHandle direction="horizontal" onResize={handleRightResize} />}
      <RightPane
        logs={logs}
        connected={connected}
        patientState={displayState}
        sessionId={sessionId}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((v) => !v)}
        width={rightWidth}
      />
    </main>
  );
}
