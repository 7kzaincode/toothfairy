"use client";

import { useState, useCallback } from "react";

interface NotesHighlighterProps {
  text: string;
  onHighlight?: (selectedText: string) => void;
  processing?: boolean;
}

export default function NotesHighlighter({ text, onHighlight, processing }: NotesHighlighterProps) {
  const [selectedText, setSelectedText] = useState<string | null>(null);

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 3) {
      setSelectedText(selection);
    }
  }, []);

  const handleAnalyze = useCallback(() => {
    if (selectedText && onHighlight) {
      onHighlight(selectedText);
      setSelectedText(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selectedText, onHighlight]);

  const handleDismiss = useCallback(() => {
    setSelectedText(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <div className="relative h-full">
      {/* Sticky selection toolbar — Onco-style */}
      {selectedText && !processing && onHighlight && (
        <div className="sticky top-0 z-10 px-4 py-2 bg-ide-accent/10 border-b border-ide-accent/20 flex items-center justify-between animate-slide-in backdrop-blur-sm">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-ide-accent truncate">
              Selected: &ldquo;{selectedText.slice(0, 60)}{selectedText.length > 60 ? "..." : ""}&rdquo;
            </span>
            <button
              onClick={handleDismiss}
              className="text-ide-muted hover:text-ide-text transition-colors shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleAnalyze}
            className="ml-3 px-3 py-1.5 bg-ide-accent text-white text-xs rounded hover:bg-ide-accent/90 transition-colors flex items-center gap-1.5 shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            Analyze with Agent
            <span className="text-[10px] opacity-70">⌘E</span>
          </button>
        </div>
      )}

      {processing && (
        <div className="sticky top-0 z-10 px-4 py-2 bg-log-info/10 border-b border-log-info/20 flex items-center gap-2 backdrop-blur-sm">
          <div className="w-3 h-3 border-2 border-log-info border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-log-info">Analyzing clinical notes...</span>
        </div>
      )}

      <pre
        onMouseUp={handleMouseUp}
        className="p-4 text-xs leading-relaxed text-ide-text-2 font-mono whitespace-pre-wrap select-text cursor-text h-full"
      >
        {text}
      </pre>
    </div>
  );
}
