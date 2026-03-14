/**
 * useSSE Hook
 * Manages SSE connection for real-time log streaming
 * TODO: Implement connect/disconnect lifecycle, log accumulation
 */

"use client";

import { useState, useEffect, useRef } from "react";
import type { LogEvent } from "@/types/logs";

export function useSSE(sessionId: string | null) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);

  // TODO: implement EventSource connection

  const clearLogs = () => setLogs([]);

  return { logs, connected, clearLogs };
}
