/**
 * CenterPane - Viewer switcher (X-ray, Clinical Notes, Treatment)
 * TODO: Implement tab switching between DentalXrayViewer, ClinicalNotesViewer, TreatmentTable
 */

"use client";

import type { PatientState } from "@/types/patient-state";

export type ViewerTab = "xray" | "clinical-notes" | "treatment" | "tooth-chart";

interface CenterPaneProps {
  activeTab: ViewerTab;
  onTabChange: (tab: ViewerTab) => void;
  patientState: PatientState | null;
  sessionId: string | null;
  onImagingClick?: (imageId: string, x: number, y: number) => void;
  onTextHighlight?: (text: string) => void;
}

export default function CenterPane({
  activeTab,
  onTabChange,
  patientState,
  sessionId,
  onImagingClick,
  onTextHighlight,
}: CenterPaneProps) {
  return (
    <div className="flex-1 flex flex-col bg-surface-primary">
      {/* TODO: Tab bar */}
      {/* TODO: Render active viewer */}
    </div>
  );
}
