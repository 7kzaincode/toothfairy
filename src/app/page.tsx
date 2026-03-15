"use client";

import { useState, useEffect } from "react";
import { usePatientState } from "@/hooks/usePatientState";
import { useCopilot } from "@/hooks/useCopilot";
import { useSSE } from "@/hooks/useSSE";
import { apiClient } from "@/lib/api/client";
import LeftPane from "@/components/layout/LeftPane";
import CenterPane from "@/components/layout/CenterPane";
import RightPane from "@/components/layout/RightPane";
import LandingPopup from "@/components/layout/LandingPopup";
import type { ViewerTab } from "@/components/layout/CenterPane";
import type { PatientState } from "@/types/patient-state";

// Demo patient state for visual scaffolding when backend is unavailable
const DEMO_STATE: PatientState = {
  identifiers: {
    session_id: "sess-demo-001",
    case_id: "case-2024-001",
    patient_id: "patient-sarah-chen",
  },
  tooth_chart: {
    14: { tooth_number: 14, condition: "cavity", severity: "moderate", confidence: 0.89, location_description: "MOD caries extending to dentin" },
    36: { tooth_number: 36, condition: "periapical_lesion", severity: "moderate", confidence: 0.92, location_description: "Periapical radiolucency at root apex" },
    47: { tooth_number: 47, condition: "bone_loss", severity: "mild", confidence: 0.78, location_description: "Early horizontal bone loss" },
    28: { tooth_number: 28, condition: "impacted", severity: "moderate", confidence: 0.95, location_description: "Partial buccal impaction" },
  },
  created_at: new Date().toISOString(),
  last_updated_at: new Date().toISOString(),
  action_count: 4,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewerTab>("xray");
  const { sessionId, patientState, createSession, refreshState, setPatientState } = usePatientState();
  const [hasUploaded, setHasUploaded] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [, setSelectedTooth] = useState<number | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  // Collapse state for sidebars
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // SSE logs from backend
  const { logs, connected } = useSSE(sessionId);

  // Copilot actions
  const copilot = useCopilot(sessionId, refreshState);

  // Display state: prefer real state from backend, fall back to demo
  const displayState = patientState || (hasUploaded ? DEMO_STATE : null);

  // Create session on mount
  useEffect(() => {
    createSession();
  }, [createSession]);

  const handleToothSelect = (toothNumber: number) => {
    // Could trigger treatment lookup for clicked tooth
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
      setUploadedImageUrl(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/imaging/image/${result.image_id}`);
      setPatientState(DEMO_STATE);
      setHasUploaded(true);
      setActiveTab("xray");
    } catch (err) {
      console.error("Upload failed:", err);
      // Fallback to local preview
      setUploadedImageUrl(URL.createObjectURL(file));
      setPatientState(DEMO_STATE);
      setHasUploaded(true);
      setActiveTab("xray");
    }
  };

  const handleImagingClick = (imageId: string, x: number, y: number) => {
    copilot.triggerImaging(imageId, x, y);
  };

  const handleTextHighlight = (text: string) => {
    copilot.triggerClinicalNotes(text);
  };

  const handleTreatmentClick = (condition: string, toothNumber?: number) => {
    copilot.triggerTreatment(condition, toothNumber);
    setActiveTab("treatment");
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-ide-bg">
      {showLanding && <LandingPopup onDismiss={() => setShowLanding(false)} />}
      <LeftPane
        patientState={displayState}
        onUploadImage={handleFileUpload}
        onSelectArtifact={(type) => {
          if (type === "imaging") setActiveTab("xray");
          else if (type === "clinical_notes") setActiveTab("clinical-notes");
          else if (type === "treatment") setActiveTab("treatment");
        }}
        collapsed={leftCollapsed}
        onToggle={() => setLeftCollapsed((v) => !v)}
      />
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
        imageId={uploadedImageId}
        imageUrl={uploadedImageUrl}
        imagingResult={copilot.lastImagingResult}
        clinicalNotesOutput={copilot.lastClinicalNotesResult ? {
          diagnoses: copilot.lastClinicalNotesResult.diagnoses,
          protocols: copilot.lastClinicalNotesResult.treatment_protocols,
          timeline: copilot.lastClinicalNotesResult.treatment_timeline,
          patient_summary: copilot.lastClinicalNotesResult.patient_summary,
          dentist_summary: copilot.lastClinicalNotesResult.dentist_summary,
        } : undefined}
        treatmentResult={copilot.lastTreatmentResult}
        onClearTreatment={copilot.clearTreatmentResult}
        processing={copilot.processing}
      />
      <RightPane
        logs={logs}
        connected={connected}
        patientState={displayState}
        sessionId={sessionId}
        collapsed={rightCollapsed}
        onToggle={() => setRightCollapsed((v) => !v)}
      />
    </main>
  );
}
