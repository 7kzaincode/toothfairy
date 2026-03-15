"use client";

import { useState, useEffect, useCallback } from "react";
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
  clinical_notes_output: {
    diagnoses: [
      { tooth_number: 14, condition: "cavity", severity: "moderate", confidence: 0.89, location_description: "MOD caries extending to dentin" },
      { tooth_number: 36, condition: "periapical_lesion", severity: "moderate", confidence: 0.92, location_description: "Periapical radiolucency at root apex" },
      { tooth_number: 47, condition: "bone_loss", severity: "mild", confidence: 0.78, location_description: "Early horizontal bone loss" },
      { tooth_number: 28, condition: "impacted", severity: "moderate", confidence: 0.95, location_description: "Partial buccal impaction" },
    ],
    protocols: [
      { condition: "periapical_lesion", tooth_number: 36, recommended_treatment: "Root canal therapy (endodontic treatment)", urgency: "immediate", estimated_visits: 2, patient_explanation: "The nerve of this tooth is likely infected. Root canal treatment will remove the infection and save the tooth.", cdt_code: "D3330", estimated_cost: "$700-1200" },
      { condition: "cavity", tooth_number: 14, recommended_treatment: "Composite restoration (filling)", urgency: "soon", estimated_visits: 1, patient_explanation: "You have a cavity that needs a filling. We'll remove the decay and fill it with a tooth-colored material.", cdt_code: "D2392", estimated_cost: "$150-300" },
      { condition: "impacted", tooth_number: 28, recommended_treatment: "Surgical extraction", urgency: "soon", estimated_visits: 1, patient_explanation: "This impacted tooth should be removed to prevent future problems. It's a routine surgical procedure.", cdt_code: "D7240", estimated_cost: "$300-600" },
      { condition: "bone_loss", tooth_number: 47, recommended_treatment: "Scaling and root planing (deep cleaning)", urgency: "routine", estimated_visits: 2, patient_explanation: "Your gums need a deep cleaning to remove bacteria below the gumline and help the bone heal.", cdt_code: "D4341", estimated_cost: "$200-400" },
    ],
    timeline: [
      { order: 1, tooth_number: 36, condition: "periapical_lesion", treatment: "Root canal therapy (endodontic treatment)", urgency: "IMMEDIATE", urgency_color: "#FF5C7A", estimated_visits: 2, cdt_code: "D3330", estimated_cost: "$700-1200" },
      { order: 2, tooth_number: 14, condition: "cavity", treatment: "Composite restoration (filling)", urgency: "SOON", urgency_color: "#FF9F4A", estimated_visits: 1, cdt_code: "D2392", estimated_cost: "$150-300" },
      { order: 3, tooth_number: 28, condition: "impacted", treatment: "Surgical extraction", urgency: "SOON", urgency_color: "#FF9F4A", estimated_visits: 1, cdt_code: "D7240", estimated_cost: "$300-600" },
      { order: 4, tooth_number: 47, condition: "bone_loss", treatment: "Scaling and root planing (deep cleaning)", urgency: "ROUTINE", urgency_color: "#4A9EF5", estimated_visits: 2, cdt_code: "D4341", estimated_cost: "$200-400" },
    ],
    patient_summary: "Here's what we found and what we recommend: Tooth #14 has a cavity that needs a filling. Tooth #36 has an infection at the root that needs root canal treatment (most urgent). Tooth #47 needs a deep cleaning to address early gum disease. Tooth #28 is an impacted wisdom tooth that should be surgically removed.",
    dentist_summary: "Patient presents with 4 findings requiring treatment. Priority: #36 RCT due to periapical pathology with positive percussion and negative vitality. #14 MOD composite restoration for moderate caries. #28 surgical extraction referral for mesioangular impaction. #47 SRP for early horizontal bone loss (2-3mm).",
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
      {showLanding && (
        <LandingPopup
          onDismiss={async (demoMode) => {
            // Ensure backend session exists
            if (!sessionId) await createSession();
            try {
              await fetch(`http://localhost:8000/api/demo-mode?enabled=${demoMode ? "true" : "false"}`, { method: "POST" });
            } catch {}
            if (demoMode) {
              setPatientState(DEMO_STATE);
              setHasUploaded(true);
            }
            setShowLanding(false);
          }}
        />
      )}
      <LeftPane
        patientState={displayState}
        onUploadImage={handleFileUpload}
        onSelectArtifact={(type) => {
          if (type === "imaging") setActiveTab("xray");
          else if (type === "clinical_notes") setActiveTab("clinical-notes");
          else if (type === "treatment") setActiveTab("treatment");
          else if (type === "tooth-chart") setActiveTab("tooth-chart");
        }}
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
