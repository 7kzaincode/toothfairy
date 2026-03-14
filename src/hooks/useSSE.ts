/**
 * useSSE Hook
 * Manages SSE connection for real-time log streaming
 * TODO: Implement connect/disconnect lifecycle, log accumulation
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { SSEClient } from "@/lib/sse/client";
import type { LogEvent } from "@/types/logs";

const MAX_LOGS = 200;

export function useSSE(sessionId: string | null) {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<SSEClient | null>(null);

  useEffect(() => {
    if (!sessionId) {
      // Disconnect if no session ID
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Initialize SSE client if not already done
    if (!clientRef.current) {
      clientRef.current = new SSEClient();
    }

    // Connect to stream
    clientRef.current.connect(sessionId, (event: LogEvent) => {
      setLogs((prevLogs) => {
        const newLogs = [...prevLogs, event];
        // Cap at MAX_LOGS entries, removing oldest if needed
        if (newLogs.length > MAX_LOGS) {
          return newLogs.slice(-MAX_LOGS);
        }
        return newLogs;
      });
    });

    setConnected(true);

    // Cleanup on unmount or when sessionId changes
    return () => {
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
      setConnected(false);
    };
  }, [sessionId]);

  const clearLogs = () => setLogs([]);

  return { logs, connected, clearLogs };
}
