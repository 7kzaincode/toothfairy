/**
 * useCopilot Hook
 * Triggers copilot actions: imaging, clinical notes, treatment
 * TODO: Implement API calls + state refresh after each action
 */

"use client";

import { useState } from "react";

export function useCopilot(sessionId: string | null) {
  const [activeCopilot, setActiveCopilot] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const triggerImaging = async (imageId: string, x: number, y: number) => {
    // TODO: implement
  };

  const triggerClinicalNotes = async (highlightedText: string, fullNotes?: string) => {
    // TODO: implement
  };

  const triggerTreatment = async (condition: string, toothNumber?: number) => {
    // TODO: implement
  };

  return {
    activeCopilot,
    processing,
    triggerImaging,
    triggerClinicalNotes,
    triggerTreatment,
  };
}
