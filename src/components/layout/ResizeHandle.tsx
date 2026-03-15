"use client";

import { useCallback, useRef, useEffect } from "react";

interface ResizeHandleProps {
  direction: "horizontal" | "vertical";
  onResize: (delta: number) => void;
}

export default function ResizeHandle({ direction, onResize }: ResizeHandleProps) {
  const isDragging = useRef(false);
  const lastPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      lastPos.current = direction === "horizontal" ? e.clientX : e.clientY;
      document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [direction],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const current = direction === "horizontal" ? e.clientX : e.clientY;
      const delta = current - lastPos.current;
      if (delta !== 0) {
        onResize(delta);
        lastPos.current = current;
      }
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, onResize]);

  if (direction === "horizontal") {
    return (
      <div
        onMouseDown={handleMouseDown}
        className="w-[3px] shrink-0 cursor-col-resize hover:bg-ide-accent/40 active:bg-ide-accent/60 transition-colors duration-75 relative group"
        style={{ zIndex: 30 }}
      >
        <div className="absolute inset-y-0 -left-[3px] -right-[3px]" />
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="h-[3px] shrink-0 cursor-row-resize hover:bg-ide-accent/40 active:bg-ide-accent/60 transition-colors duration-75 relative group"
      style={{ zIndex: 30 }}
    >
      <div className="absolute inset-x-0 -top-[3px] -bottom-[3px]" />
    </div>
  );
}
