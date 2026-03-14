"use client";

import { useRef, useEffect, useCallback } from "react";

interface DentalXrayViewerProps {
  imageUrl?: string;
  imageId?: string;
  onToothClick?: (imageId: string, x: number, y: number) => void;
  segmentationOverlay?: number[][];
  onFileUpload?: (file: File) => void;
}

export default function DentalXrayViewer({
  imageUrl,
  imageId,
  onToothClick,
  segmentationOverlay,
  onFileUpload,
}: DentalXrayViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const dropLabelRef = useRef<HTMLParagraphElement>(null);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = wrapper.offsetWidth;
    canvas.height = wrapper.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    ([[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]] as [number, number][]).forEach(([rx, ry]) => {
      ctx.beginPath();
      ctx.arc(rx * canvas.width, ry * canvas.height, 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    drawGrid();
    window.addEventListener("resize", drawGrid);
    return () => window.removeEventListener("resize", drawGrid);
  }, [drawGrid]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    const glare = glareRef.current;
    const spotlight = spotlightRef.current;
    if (!wrapper || !card || !glare || !spotlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const wr = wrapper.getBoundingClientRect();
      spotlight.style.left = e.clientX - wr.left + "px";
      spotlight.style.top = e.clientY - wr.top + "px";

      const cr = card.getBoundingClientRect();
      const cx = e.clientX - cr.left - cr.width / 2;
      const cy = e.clientY - cr.top - cr.height / 2;
      card.style.transform = `perspective(900px) rotateX(${(cy / cr.height) * 7}deg) rotateY(${-(cx / cr.width) * 7}deg)`;

      const gx = ((e.clientX - cr.left) / cr.width) * 100;
      const gy = ((e.clientY - cr.top) / cr.height) * 100;
      glare.style.background = `radial-gradient(ellipse 55% 40% at ${gx}% ${gy}%, rgba(255,255,255,0.1) 0%, transparent 70%)`;
    };

    const handleMouseLeave = () => {
      card.style.transition = "transform 0.5s ease";
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      setTimeout(() => { card.style.transition = ""; }, 500);
    };

    wrapper.addEventListener("mousemove", handleMouseMove);
    wrapper.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      wrapper.removeEventListener("mousemove", handleMouseMove);
      wrapper.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const showFile = (name: string) => {
    if (dropLabelRef.current) {
      dropLabelRef.current.innerHTML = `<span style="color:rgba(100,200,130,0.9)">✓</span> <span style="color:rgba(255,255,255,0.6)">${name}</span>`;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showFile(file.name);
    onFileUpload?.(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropzoneRef.current) {
      dropzoneRef.current.style.borderColor = "rgba(80,140,255,0.6)";
      dropzoneRef.current.style.background = "rgba(80,140,255,0.08)";
    }
  };

  const handleDragLeave = () => {
    if (dropzoneRef.current) {
      dropzoneRef.current.style.borderColor = "rgba(255,255,255,0.15)";
      dropzoneRef.current.style.background = "transparent";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    showFile(file.name);
    onFileUpload?.(file);
  };

  return (
    <div
      ref={wrapperRef}
      className="flex-1 flex items-center justify-center relative overflow-hidden"
      style={{ background: "#0B0B0B", minHeight: 480 }}
    >
      {/* Grid background */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />

      {/* Spotlight */}
      <div
        ref={spotlightRef}
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(80,120,255,0.18) 0%, rgba(80,120,255,0.06) 40%, transparent 70%)",
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          left: "50%",
          top: "50%",
        }}
      />

      {/* Content wrapper */}
      <div
        ref={cardRef}
        style={{
          position: "relative",
          zIndex: 2,
          width: 380,
          padding: "40px 32px",
          textAlign: "center",
        }}
      >

        {/* Icon */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
          </svg>
        </div>

        <p style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.92)", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
          Dental X-Ray Viewer
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", margin: "0 0 32px", lineHeight: 1.5 }}>
          Upload a radiograph to begin AI-assisted<br />analysis and segmentation
        </p>

        {/* Drop zone */}
        <div
          ref={dropzoneRef}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: "1.5px dashed rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: "28px 20px",
            marginBottom: 20,
            cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(80,140,255,0.5)";
            (e.currentTarget as HTMLDivElement).style.background = "rgba(80,140,255,0.05)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.15)";
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p ref={dropLabelRef} style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>
            Drop your X-ray here or <span style={{ color: "rgba(100,160,255,0.8)" }}>browse</span>
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", margin: "6px 0 0" }}>
            DICOM · JPEG · PNG · TIFF
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".dcm,.jpg,.jpeg,.png,.tiff,.tif"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            background: "rgba(80,130,255,0.85)",
            border: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "-0.1px",
            transition: "background 0.2s, transform 0.1s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(100,150,255,1)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(80,130,255,0.85)"; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          Upload X-Ray
        </button>
      </div>
    </div>
  );
}