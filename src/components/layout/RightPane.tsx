"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/api/client";
import type { LogEvent } from "@/types/logs";
import type { PatientState } from "@/types/patient-state";

interface RightPaneProps {
  logs: LogEvent[];
  connected: boolean;
  patientState: PatientState | null;
  sessionId: string | null;
  collapsed: boolean;
  onToggle: () => void;
  width?: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
}

export default function RightPane({
  logs,
  connected,
  patientState,
  sessionId,
  collapsed,
  onToggle,
  width = 300,
}: RightPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "agent",
      content: "Hello! I am your AI assistant. Upload an X-ray to get started.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  // Build context from patient state for the AI
  const buildContext = (): string => {
    if (!patientState) return "";
    const parts: string[] = [];

    // Tooth chart findings
    const findings = Object.entries(patientState.tooth_chart);
    if (findings.length > 0) {
      parts.push("Current findings:");
      findings.forEach(([tooth, f]) => {
        parts.push(`  Tooth #${tooth}: ${f.condition} (${f.severity}, ${(f.confidence * 100).toFixed(0)}% confidence)`);
      });
    }

    // Clinical notes
    if (patientState.clinical_notes_output) {
      const cn = patientState.clinical_notes_output;
      if (cn.patient_summary) parts.push(`\nPatient summary: ${cn.patient_summary}`);
      if (cn.dentist_summary) parts.push(`Dentist summary: ${cn.dentist_summary}`);
    }

    if (patientState.clinical_notes_artifact?.notes_text) {
      parts.push(`\nClinical notes:\n${patientState.clinical_notes_artifact.notes_text}`);
    }

    return parts.join("\n");
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMsg]);
    const message = inputValue;
    setInputValue("");

    if (sessionId) {
      setChatLoading(true);
      try {
        const context = buildContext();
        const response = await apiClient.chatClinicalNotes({
          session_id: sessionId,
          message,
          context: context || undefined,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: response.response,
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: "Sorry, I couldn't process that request. Make sure the backend is running.",
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "agent",
          content: "No active session. Please wait for the backend connection.",
        },
      ]);
    }
  };

  if (collapsed) {
    return (
      <div className="w-[36px] flex-shrink-0 border-l border-ide-border bg-ide-bg flex flex-col items-center h-full">
        <button
          onClick={onToggle}
          className="w-full h-9 flex items-center justify-center border-b border-ide-border hover:bg-ide-surface transition-colors text-ide-muted hover:text-ide-text"
          title="Expand AI Assistant"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ide-muted"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            AI Assistant
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-l border-ide-border bg-ide-panel flex flex-col h-full" style={{ width }}>
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border bg-ide-bg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-ide-text">
            AI Assistant
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-log-success" : "bg-ide-muted"}`} />
            <span className="text-[10px] text-ide-muted">
              {connected ? "connected" : "disconnected"}
            </span>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-ide-surface rounded transition-colors text-ide-muted hover:text-ide-text"
          title="Collapse"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Chat Area */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto bg-ide-bg p-4 space-y-5"
        style={{ scrollbarWidth: "none" }}
      >
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "agent" ? (
              <div>
                <span className="text-[10px] text-ide-muted mb-1.5 block">toothfairy AI</span>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center">
                    <Image src="/logo.png" alt="AI" width={18} height={18} className="opacity-70 invert" />
                  </div>
                  <p className="text-[13px] leading-relaxed text-ide-text">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-[10px] text-ide-muted mb-1.5 block text-right">You</span>
                <div className="flex items-start gap-2.5 justify-end">
                  <p className="text-[13px] leading-relaxed text-ide-text">{msg.content}</p>
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-ide-surface border border-ide-border flex items-center justify-center shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ide-muted">
                      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Thinking indicator */}
        {chatLoading && (
          <div>
            <span className="text-[10px] text-ide-muted mb-1.5 block">toothfairy AI</span>
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center">
                <Image src="/logo.png" alt="AI" width={18} height={18} className="opacity-70 invert" />
              </div>
              <div className="flex items-center gap-1 py-1">
                <div className="w-1.5 h-1.5 rounded-full bg-ide-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-ide-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-ide-muted animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-ide-border bg-ide-bg shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handleSend();
            }}
            placeholder="Ask the agent..."
            className="w-full bg-ide-surface border border-ide-border rounded-lg py-2.5 pl-3 pr-10 text-[13px] text-ide-text focus:outline-none focus:border-ide-text/30 placeholder:text-ide-muted transition-colors"
            disabled={chatLoading}
          />
          <button
            onClick={handleSend}
            className="absolute right-2.5 p-1 text-ide-muted hover:text-ide-text transition-colors"
            disabled={!inputValue.trim() || chatLoading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
