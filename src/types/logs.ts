/**
 * Log Event Types
 * Mirrors backend/app/models/logs.py
 */

export type CopilotType = "imaging" | "clinical_notes" | "treatment";

export type LogSeverity = "info" | "progress" | "success" | "fallback" | "error";

export interface LogEvent {
  session_id: string;
  copilot: CopilotType;
  severity: LogSeverity;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Heartbeat {
  type: "heartbeat";
  timestamp: string;
}
