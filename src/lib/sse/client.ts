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
    if (this.eventSource) {
      this.disconnect();
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const streamUrl = `${baseUrl}/api/stream/${sessionId}`;

    this.eventSource = new EventSource(streamUrl);

    this.eventSource.addEventListener("message", (event: Event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        onEvent(data as LogEvent);
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    });

    this.eventSource.addEventListener("heartbeat", () => {
      // Ignore heartbeat events
    });

    this.eventSource.addEventListener("error", () => {
      console.error("SSE connection error");
      this.disconnect();
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }
}
