"use client";

import { useState, useEffect } from "react";
import { usePatientState } from "@/hooks/usePatientState";
import LeftPane from "@/components/layout/LeftPane";
import CenterPane from "@/components/layout/CenterPane";
import RightPane from "@/components/layout/RightPane";
import LandingPopup from "@/components/layout/LandingPopup";
import type { ViewerTab } from "@/components/layout/CenterPane";
import type { LogEvent } from "@/types/logs";
import type { PatientState } from "@/types/patient-state";

// Demo patient state for visual scaffolding
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

const DEMO_LOGS: LogEvent[] = [
  { session_id: "sess-demo-001", copilot: "imaging", severity: "info", message: "Initializing imaging copilot...", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "imaging", severity: "progress", message: "Segmenting tooth at click position (342, 218)...", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "imaging", severity: "success", message: "Mapped click to FDI tooth #36", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "imaging", severity: "fallback", message: "Using cached segmentation mask", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "imaging", severity: "success", message: "Found: periapical radiolucency (moderate, confidence: 0.92)", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "clinical_notes", severity: "info", message: "Parsing highlighted clinical text...", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "clinical_notes", severity: "progress", message: "Extracting dental diagnoses from notes...", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "clinical_notes", severity: "success", message: "Extracted 3 diagnoses, mapped to treatment protocols", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "clinical_notes", severity: "info", message: "Generating urgency-ranked treatment timeline...", timestamp: new Date().toISOString() },
  { session_id: "sess-demo-001", copilot: "clinical_notes", severity: "success", message: "Timeline generated: 2 immediate, 1 soon, 1 routine", timestamp: new Date().toISOString() },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<ViewerTab>("xray");
  const [logs] = useState<LogEvent[]>(DEMO_LOGS);
  const { sessionId, patientState, createSession, setPatientState } = usePatientState();
  const [hasUploaded, setHasUploaded] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const displayState = patientState || (hasUploaded ? DEMO_STATE : null);
  const [, setSelectedTooth] = useState<number | null>(null);

  // Create session on mount (only when backend is available)
  useEffect(() => {
    createSession();
  }, [createSession]);

  const handleToothSelect = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
  };

  // Handle file upload - show mock patient data
  const handleFileUpload = (file: File) => {
    console.log("File uploaded:", file.name);
    // Mock workflow: set the hardcoded patient state when file is uploaded
    setPatientState(DEMO_STATE);
    setHasUploaded(true);
    // Switch to xray tab to show the data
    setActiveTab("xray");
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
      />
      <CenterPane
        activeTab={activeTab}
        onTabChange={setActiveTab}
        patientState={displayState}
        sessionId={sessionId || displayState?.identifiers.session_id || null}
        onToothSelect={handleToothSelect}
      />
      <RightPane
        logs={logs}
        connected={true}
        patientState={displayState}
      />
    </main>
  );
}
