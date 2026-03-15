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
  timestamp: string;
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
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, logs]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const message = inputValue;
    setInputValue("");

    if (sessionId) {
      setChatLoading(true);
      try {
        const response = await apiClient.chatClinicalNotes({
          session_id: sessionId,
          message,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: response.response,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "agent",
            content: "Sorry, I couldn't process that request. Make sure the backend is running.",
            timestamp: new Date().toISOString(),
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
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  };

  // Collapsed state
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-ide-text-2">
            AI Assistant
          </span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-log-success" : "bg-ide-muted"}`} />
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
        className="flex-1 min-h-0 overflow-y-auto scrollbar-ide bg-ide-bg p-3 space-y-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-[10px] text-ide-muted mb-1 px-1">
              {msg.role === "user" ? "You" : "toothfairy AI"}
            </span>
            <div className={`flex items-start gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {msg.role === "agent" && (
                <div className="mt-1 w-5 h-5 rounded-full shrink-0 overflow-hidden"><Image src="/logo.png" alt="TF" width={20} height={20} className="w-full h-full object-cover invert" /></div>
              )}
              {msg.role === "user" && (
                <div className="mt-1 w-5 h-5 rounded-full bg-ide-surface shadow-sm shrink-0 border border-ide-border flex items-center justify-center text-ide-text overflow-hidden">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C9.243 2 7 4.243 7 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5zm0 8c-1.654 0-3-1.346-3-3s1.346-3 3-3 3 1.346 3 3-1.346 3-3 3zm9 11v-1c0-3.859-3.141-7-7-7h-4c-3.859 0-7 3.141-7 7v1h2v-1c0-2.757 2.243-5 5-5h4c2.757 0 5 2.243 5 5v1h2z" />
                  </svg>
                </div>
              )}
              <div className="py-1 text-[13px] leading-relaxed break-words text-ide-text">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex items-start gap-2">
            <div className="mt-1 w-5 h-5 rounded-full shrink-0 overflow-hidden"><Image src="/logo.png" alt="TF" width={20} height={20} className="w-full h-full object-cover invert" /></div>
            <div className="py-1 text-[13px] text-ide-muted animate-pulse">Thinking...</div>
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
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask the agent..."
            className="w-full bg-ide-surface border border-ide-border rounded-md py-2 pl-3 pr-10 text-[13px] text-ide-text focus:outline-none focus:border-blue-500 placeholder:text-ide-muted transition-colors"
            disabled={chatLoading}
          />
          <button
            onClick={handleSend}
            className="absolute right-2 p-1.5 text-ide-muted hover:text-[#171717] transition-colors rounded-md hover:bg-[#f5f5f5]"
            disabled={!inputValue.trim() || chatLoading}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}

