/**
 * usePatientState Hook
 * Manages session lifecycle, patient state sync, and profile loading.
 */

"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import type { PatientProfile } from "@/lib/api/client";
import type { PatientState } from "@/types/patient-state";

export function usePatientState() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [patientState, setPatientState] = useState<PatientState | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = useCallback(async (patientId?: string) => {
    setLoading(true);
    try {
      const response = await apiClient.createSession(patientId);
      setSessionId(response.session_id);
      // Load profile if available
      if (patientId) {
        try {
          const prof = await apiClient.getProfile(patientId);
          setProfile(prof);
        } catch {
          // Profile not found — that's okay
        }
      }
    } catch (error) {
      console.error("Failed to create session:", error);
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

  const switchProfile = useCallback(async (patientId: string) => {
    setPatientState(null);
    setProfile(null);
    setSessionId(null);
    await createSession(patientId);
  }, [createSession]);

  const clearProfile = useCallback(() => {
    setPatientState(null);
    setProfile(null);
    setSessionId(null);
  }, []);

  return {
    sessionId,
    patientState,
    profile,
    loading,
    createSession,
    refreshState,
    setPatientState,
    switchProfile,
    clearProfile,
  };
}
