"use client";

interface NotesHighlighterProps {
  text: string;
  onHighlight?: (selectedText: string) => void;
}

export default function NotesHighlighter({ text, onHighlight }: NotesHighlighterProps) {
  const handleMouseUp = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 3 && onHighlight) {
      onHighlight(selection);
    }
  };

  return (
    <pre
      onMouseUp={handleMouseUp}
      className="p-4 text-xs leading-relaxed text-ide-text-2 font-mono whitespace-pre-wrap select-text cursor-text h-full"
    >
      {text}
    </pre>
  );
}
