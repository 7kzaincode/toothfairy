/**
 * usePatientState Hook
 * Manages session lifecycle and patient state sync
 * TODO: Implement session creation, polling, state management
 */

"use client";

import { useState } from "react";
import type { PatientState } from "@/types/patient-state";

export function usePatientState() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [patientState, setPatientState] = useState<PatientState | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = async () => {
    // TODO: implement
  };

  const refreshState = async () => {
    // TODO: implement
  };

  return {
    sessionId,
    patientState,
    loading,
    createSession,
    refreshState,
    setPatientState,
  };
}
