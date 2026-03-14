/**
 * NotesHighlighter - Text selection triggers copilot
 * TODO: Implement text selection detection, highlight rendering, copilot trigger
 */

"use client";

interface NotesHighlighterProps {
  text: string;
  onHighlight?: (selectedText: string) => void;
}

export default function NotesHighlighter({ text, onHighlight }: NotesHighlighterProps) {
  return (
    <div className="whitespace-pre-wrap font-mono text-sm p-4">
      {/* TODO: Render text with selection handler */}
      {text}
    </div>
  );
}
