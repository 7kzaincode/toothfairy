/**
 * SSE Client
 * Connects to /api/stream/{session_id} for real-time log streaming
 * TODO: Implement EventSource connection + reconnection logic
 */

import type { LogEvent } from "@/types/logs";

export type SSECallback = (event: LogEvent) => void;

export class SSEClient {
  private eventSource: EventSource | null = null;

  connect(sessionId: string, onEvent: SSECallback): void {
    // TODO: implement
  }

  disconnect(): void {
    // TODO: implement
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}
