/**
 * ClinicalNotesViewer - Split view: notes (left) + treatment plan (right)
 * TODO: Implement notes display, text selection handler, treatment plan display
 */

"use client";

import type { ClinicalNotesOutput } from "@/types/patient-state";

interface ClinicalNotesViewerProps {
  notesText?: string;
  output?: ClinicalNotesOutput;
  onTextHighlight?: (text: string) => void;
}

export default function ClinicalNotesViewer({
  notesText,
  output,
  onTextHighlight,
}: ClinicalNotesViewerProps) {
  return (
    <div className="flex-1 flex">
      {/* TODO: Left side - notes with text selection */}
      {/* TODO: Right side - treatment plan + timeline */}
    </div>
  );
}
