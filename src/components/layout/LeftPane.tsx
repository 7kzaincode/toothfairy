/**
 * LeftPane - Patient info, mini tooth chart, artifact tree, image upload
 * TODO: Implement patient info display, mini ToothChart, artifact tree, upload button
 */

"use client";

import type { PatientState } from "@/types/patient-state";

interface LeftPaneProps {
  patientState: PatientState | null;
  onUploadImage?: (file: File) => void;
  onSelectArtifact?: (type: string) => void;
}

export default function LeftPane({ patientState, onUploadImage, onSelectArtifact }: LeftPaneProps) {
  return (
    <div className="w-[260px] border-r border-border bg-surface-secondary flex flex-col">
      {/* TODO: Patient info header */}
      {/* TODO: Mini tooth chart */}
      {/* TODO: Artifact tree */}
      {/* TODO: Upload button */}
    </div>
  );
}
