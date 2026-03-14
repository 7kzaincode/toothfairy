"use client";

import { useState, useRef, useEffect } from "react";
import type { LogEvent } from "@/types/logs";
import type { PatientState } from "@/types/patient-state";

interface RightPaneProps {
  logs: LogEvent[];
  connected: boolean;
  patientState: PatientState | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export default function RightPane({ logs, connected, patientState }: RightPaneProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "agent",
      content: "Hello! I am your AI assistant. Upload an X-ray to get started.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, logs]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");

    // Simulate agent reply
    setTimeout(() => {
      const newAgentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "I'm analyzing that request now...",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newAgentMsg]);
    }, 1000);
  };

  const findings = patientState ? Object.values(patientState.tooth_chart) : [];

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-ide-border bg-ide-panel flex flex-col h-full">
      {/* Header */}
      <div className="h-9 flex items-center justify-between px-3 border-b border-ide-border bg-ide-bg shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ide-text-2">
            AI Assistant
          </span>
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${connected ? "bg-log-success" : "bg-ide-muted"
                }`}
            />
            <span className="text-[10px] text-ide-muted">
              {connected ? "connected" : "disconnected"}
            </span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div
        ref={chatRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-ide bg-ide-bg p-3 space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"
              }`}
          >
            <span className="text-[10px] text-ide-muted mb-1 px-1">
              {msg.role === "user" ? "You" : "ToothFairy AI"}
            </span>
            <div className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "agent" && (
                <div className="mt-1 w-5 h-5 rounded-full bg-blue-500/20 shadow-sm shrink-0 border border-blue-500/30"></div>
              )}
              {msg.role === "user" && (
                <div className="mt-1 w-5 h-5 rounded-full bg-ide-surface shadow-sm shrink-0 border border-ide-border flex items-center justify-center text-ide-text overflow-hidden">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3zm9 11v-1c0-3.859-3.141-7-7-7h-4c-3.859 0-7 3.141-7 7v1h2v-1c0-2.757 2.243-5 5-5h4c2.757 0 5 2.243 5 5v1h2z"></path>
                  </svg>
                </div>
              )}
              <div
                className={`py-1 text-[13px] leading-relaxed break-words text-ide-text`}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-ide-border bg-ide-bg shrink-0">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            placeholder="Ask the agent..."
            className="w-full bg-ide-surface border border-ide-border rounded-md py-2 pl-3 pr-10 text-[13px] text-ide-text focus:outline-none focus:border-blue-500 placeholder:text-ide-muted transition-colors"
          />
          <button
            onClick={handleSend}
            className="absolute right-2 p-1.5 text-ide-muted hover:text-white transition-colors rounded-md hover:bg-ide-panel"
            disabled={!inputValue.trim()}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {findings.length > 0 && (
        <div className="flex-[40] min-h-0 overflow-y-auto scrollbar-ide border-t border-ide-border">
          <div className="h-8 flex items-center px-3 border-b border-ide-hairline bg-ide-bg sticky top-0 z-10">
            <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-ide-muted">
              Structured Output
            </span>
          </div>
          <div className="p-3 space-y-2">
            {findings.map((f) => (
              <div
                key={`${f.tooth_number}-${f.condition}`}
                className="bg-ide-surface border border-ide-border rounded-md p-2.5 animate-slide-in"
              >
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-ide-hairline">
                  <span className="text-xs font-semibold text-ide-text">
                    Tooth #{f.tooth_number}
                  </span>
                  <span className="text-[10px] font-mono text-ide-muted">
                    {(f.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="space-y-1">
                  <OutputRow label="Condition" value={f.condition.replace(/_/g, " ")} />
                  <OutputRow label="Severity" value={f.severity} />
                  <OutputRow label="Location" value={f.location_description} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-0.5">
      <span className="text-[10px] uppercase tracking-[0.04em] text-ide-muted">{label}</span>
      <span className="text-xs font-mono text-ide-text text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}
