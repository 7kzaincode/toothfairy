"use client";

import { useState, useCallback } from "react";
import { usePatientState } from "@/hooks/usePatientState";
import { useCopilot } from "@/hooks/useCopilot";
import { useSSE } from "@/hooks/useSSE";
import { apiClient } from "@/lib/api/client";
import LeftPane from "@/components/layout/LeftPane";
import CenterPane from "@/components/layout/CenterPane";
import RightPane from "@/components/layout/RightPane";
import ResizeHandle from "@/components/layout/ResizeHandle";
import LandingPopup from "@/components/layout/LandingPopup";
import type { ViewerTab } from "@/components/layout/CenterPane";

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewerTab>("xray");
  const { sessionId, patientState, profile, createSession, refreshState, switchProfile } = usePatientState();
  const [hasUploaded, setHasUploaded] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

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

  const handleToothSelect = (toothNumber: number) => {
    const finding = displayState?.tooth_chart[toothNumber];
    if (finding) {
      copilot.triggerTreatment(finding.condition, toothNumber);
      setActiveTab("treatment");
    }
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

  const handleAutoScan = (imageId: string) => {
    if (sessionId) {
      copilot.triggerAutoScan(imageId, "panoramic");
    }
  };

  const handleProfileSelect = async (patientId: string) => {
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
        sessionId={sessionId || displayState?.identifiers.session_id || null}
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
        imageId={uploadedImageId}
        imageUrl={uploadedImageUrl}
        imagingResult={copilot.lastImagingResult}
        autoScanResult={copilot.lastAutoScanResult}
        clinicalNotesOutput={copilot.lastClinicalNotesResult ? {
          diagnoses: copilot.lastClinicalNotesResult.diagnoses,
          protocols: copilot.lastClinicalNotesResult.treatment_protocols,
          timeline: copilot.lastClinicalNotesResult.treatment_timeline,
          patient_summary: copilot.lastClinicalNotesResult.patient_summary,
          dentist_summary: copilot.lastClinicalNotesResult.dentist_summary,
        } : undefined}
        treatmentResult={copilot.lastTreatmentResult}
        profileNotes={profile?.clinical_notes || null}
        onClearTreatment={copilot.clearTreatmentResult}
        processing={copilot.processing}
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
