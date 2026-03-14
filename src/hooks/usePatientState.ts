/**
 * usePatientState Hook
 * Manages session lifecycle and patient state sync
 * TODO: Implement session creation, polling, state management
 */

"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type { PatientState } from "@/types/patient-state";

export function usePatientState() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [patientState, setPatientState] = useState<PatientState | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.createSession();
      setSessionId(response.session_id);
    } catch (error) {
      console.error("Failed to create session:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshState = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const state = await apiClient.getSessionState(sessionId);
      setPatientState(state);
    } catch (error) {
      console.error("Failed to refresh patient state:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  return {
    sessionId,
    patientState,
    loading,
    createSession,
    refreshState,
    setPatientState,
  };
}
