"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type {
  ClinicalNotesActionResponse,
  ImagingActionResponse,
  TreatmentActionResponse,
  AutoScanResponse,
} from "@/types/api";

export function useCopilot(
  sessionId: string | null,
  refreshState: () => Promise<void>
) {
  const [activeCopilot, setActiveCopilot] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastClinicalNotesResult, setLastClinicalNotesResult] =
    useState<ClinicalNotesActionResponse | null>(null);
  const [lastImagingResult, setLastImagingResult] =
    useState<ImagingActionResponse | null>(null);
  const [lastTreatmentResult, setLastTreatmentResult] =
    useState<TreatmentActionResponse | null>(null);
  const [lastAutoScanResult, setLastAutoScanResult] =
    useState<AutoScanResponse | null>(null);

  const triggerImaging = useCallback(
    async (imageId: string, x: number, y: number) => {
      if (!sessionId) return;
      setProcessing(true);
      setActiveCopilot("imaging");
      try {
        const response = await apiClient.triggerImagingAction({
          session_id: sessionId,
          image_id: imageId,
          x,
          y,
        });
        setLastImagingResult(response);
        await refreshState();
        return response;
      } catch (error) {
        console.error("Imaging copilot error:", error);
      } finally {
        setProcessing(false);
        setActiveCopilot(null);
      }
    },
    [sessionId, refreshState]
  );

  const triggerClinicalNotes = useCallback(
    async (highlightedText: string, fullNotes?: string) => {
      if (!sessionId) return;
      setProcessing(true);
      setActiveCopilot("clinical_notes");
      try {
        const response = await apiClient.triggerClinicalNotesAction({
          session_id: sessionId,
          highlighted_text: highlightedText,
          full_notes: fullNotes,
        });
        setLastClinicalNotesResult(response);
        await refreshState();
        return response;
      } catch (error) {
        console.error("Clinical notes copilot error:", error);
      } finally {
        setProcessing(false);
        setActiveCopilot(null);
      }
    },
    [sessionId, refreshState]
  );

  const triggerTreatment = useCallback(
    async (condition: string, toothNumber?: number) => {
      if (!sessionId) return;
      setProcessing(true);
      setActiveCopilot("treatment");
      try {
        const response = await apiClient.triggerTreatmentAction({
          session_id: sessionId,
          condition,
          tooth_number: toothNumber,
        });
        setLastTreatmentResult(response);
        await refreshState();
        return response;
      } catch (error) {
        console.error("Treatment copilot error:", error);
      } finally {
        setProcessing(false);
        setActiveCopilot(null);
      }
    },
    [sessionId, refreshState]
  );

  const triggerAutoScan = useCallback(
    async (imageId: string, imageType: string = "panoramic") => {
      if (!sessionId) return;
      setProcessing(true);
      setActiveCopilot("imaging");
      try {
        const response = await apiClient.triggerAutoScan(
          sessionId,
          imageId,
          imageType
        );
        setLastAutoScanResult(response);
        await refreshState();
        return response;
      } catch (error) {
        console.error("Auto-scan copilot error:", error);
      } finally {
        setProcessing(false);
        setActiveCopilot(null);
      }
    },
    [sessionId, refreshState]
  );

  const clearTreatmentResult = useCallback(() => {
    setLastTreatmentResult(null);
  }, []);

  return {
    activeCopilot,
    processing,
    triggerImaging,
    triggerClinicalNotes,
    triggerTreatment,
    triggerAutoScan,
    clearTreatmentResult,
    lastClinicalNotesResult,
    lastImagingResult,
    lastTreatmentResult,
    lastAutoScanResult,
  };
}
