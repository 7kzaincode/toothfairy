"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import SegmentationOverlay from "./SegmentationOverlay";
import type { AutoScanResponse, ImagingActionResponse } from "@/types/api";

interface DentalXrayViewerProps {
  imageUrl?: string;
  imageId?: string;
  onToothClick?: (imageId: string, x: number, y: number) => void;
  segmentationOverlay?: number[][];
  imagingResult?: ImagingActionResponse | null;
  onFileUpload?: (file: File) => void;
  onClose?: () => void;
  onAutoScan?: (imageId: string) => void;
  autoScanResult?: AutoScanResponse | null;
  onTreatmentClick?: (condition: string, toothNumber?: number) => void;
  onViewOnModel?: (toothNumber: number) => void;
}

export default function DentalXrayViewer({
  imageUrl,
  imageId,
  onToothClick,
  segmentationOverlay,
  imagingResult,
  onFileUpload,
  onAutoScan,
  autoScanResult,
  onTreatmentClick,
  onClose,
  onViewOnModel,
}: DentalXrayViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const dropLabelRef = useRef<HTMLParagraphElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [clickMarker, setClickMarker] = useState<{ x: number; y: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showScanResults, setShowScanResults] = useState(true);
  const [showToothResult, setShowToothResult] = useState(true);

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
    if (!imageUrl) return;
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    const spotlight = spotlightRef.current;
    if (!wrapper || !card || !spotlight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const wr = wrapper.getBoundingClientRect();
      spotlight.style.left = e.clientX - wr.left + "px";
      spotlight.style.top = e.clientY - wr.top + "px";
    };

    wrapper.addEventListener("mousemove", handleMouseMove);
    return () => wrapper.removeEventListener("mousemove", handleMouseMove);
  }, [imageUrl]);

  // Upload-only 3D tilt effect
  useEffect(() => {
    if (imageUrl) return; // disable tilt when viewing image
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
  }, [imageUrl]);

  // Clear analyzing state when segmentation result arrives
  useEffect(() => {
    if (segmentationOverlay && segmentationOverlay.length > 0) {
      setAnalyzing(false);
    }
  }, [segmentationOverlay]);

  // Clear scanning state when auto-scan completes
  useEffect(() => {
    if (autoScanResult) {
      setScanning(false);
    }
  }, [autoScanResult]);

  // Show tooth result panel when new imaging result arrives
  useEffect(() => {
    if (imagingResult) {
      setShowToothResult(true);
    }
  }, [imagingResult]);

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

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageId || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setClickMarker({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setAnalyzing(true);
    // Exclusivity: single-tooth scan clears auto-scan
    setShowScanResults(false);
    onToothClick?.(imageId, x, y);
  };

  const handleImageLoad = () => {
    if (imgRef.current) {
      setImgSize({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      });
      setImgNaturalSize({
        width: imgRef.current.naturalWidth,
        height: imgRef.current.naturalHeight,
      });
    }
  };

  // Keep overlay dimensions in sync when container resizes
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const observer = new ResizeObserver(() => {
      setImgSize({
        width: img.clientWidth,
        height: img.clientHeight,
      });
    });
    observer.observe(img);
    return () => observer.disconnect();
  }, [imageUrl]);

  // ——— Image viewer mode ———
  if (imageUrl) {
    return (
      <div
        ref={wrapperRef}
        className="flex-1 flex flex-col relative bg-white min-h-0"
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
        />
        <div
          ref={spotlightRef}
          style={{
            position: "absolute", width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)",
            pointerEvents: "none", transform: "translate(-50%, -50%)", left: "50%", top: "50%",
          }}
        />

        {/* Image area */}
        <div className="flex-1 flex items-center justify-center relative min-h-0 p-4" style={{ minHeight: 0 }}>
        {(onClose || (imageId && onAutoScan)) && (
          <div className="absolute top-3 right-3 z-20 flex items-start gap-2">
            {imageId && onAutoScan && (
              <div className="flex gap-2">
                {autoScanResult && (
                  <>
                    <button
                      onClick={() => setShowScanResults(!showScanResults)}
                      className="px-3 py-2 rounded-lg font-medium text-sm transition-all bg-white hover:bg-white/90 text-[#171717] active:scale-95"
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                      }}
                      title={showScanResults ? "Hide contours" : "Show contours"}
                    >
                      <span className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          {showScanResults ? (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </>
                          ) : (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          )}
                        </svg>
                        {showScanResults ? "Hide" : "Show"}
                      </span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setScanning(true);
                    setShowScanResults(true);
                    // Exclusivity: auto-scan clears single-tooth result
                    setShowToothResult(false);
                    setClickMarker(null);
                    onAutoScan(imageId);
                  }}
                  disabled={scanning}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    scanning
                      ? "bg-white/80 cursor-not-allowed"
                      : "bg-white hover:bg-white/90 active:scale-95"
                  }`}
                  style={{
                    border: "1px solid rgba(0,0,0,0.08)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  }}
                >
                  {scanning ? (
                    <span className="flex items-center gap-2 text-[#525252]">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Scanning...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-[#171717]">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      {autoScanResult ? "Re-Scan" : "Auto-Scan All Teeth"}
                    </span>
                  )}
                </button>
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-black/8 text-[#525252] hover:text-[#171717] hover:bg-white/90 active:scale-95 transition-all shadow-sm"
                title="Close X-Ray"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="bg-[#f0f0f0] rounded-2xl p-2 shadow-sm" style={{ maxWidth: "98%", maxHeight: "98%" }}>
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Dental X-Ray"
              onLoad={handleImageLoad}
              onClick={handleImageClick}
              className="max-w-full rounded-xl cursor-crosshair"
              style={{ display: "block", maxHeight: autoScanResult ? "calc(100vh - 420px)" : "calc(100vh - 160px)" }}
            />

            {/* Click marker */}
            {clickMarker && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: clickMarker.x - 12,
                  top: clickMarker.y - 12,
                  width: 24,
                  height: 24,
                }}
              >
                <div className={`w-6 h-6 rounded-full border-2 ${analyzing ? "border-blue-400 animate-ping" : "border-teal-400"}`} />
                <div className={`absolute inset-0 w-6 h-6 rounded-full border-2 ${analyzing ? "border-blue-400" : "border-teal-400"}`} />
              </div>
            )}

            {/* Segmentation overlay (single tooth) */}
            {segmentationOverlay && segmentationOverlay.length >= 3 && imgSize.width > 0 && (
              <SegmentationOverlay
                contourPoints={segmentationOverlay}
                width={imgSize.width}
                height={imgSize.height}
                viewBoxWidth={imgNaturalSize.width || imgSize.width}
                viewBoxHeight={imgNaturalSize.height || imgSize.height}
              />
            )}

            {/* Auto-scan segments (all teeth) */}
            {showScanResults && autoScanResult && autoScanResult.segments && imgSize.width > 0 && autoScanResult.segments.map((seg) => (
              <SegmentationOverlay
                key={seg.tooth_number}
                contourPoints={seg.contour_points}
                width={imgSize.width}
                height={imgSize.height}
                viewBoxWidth={imgNaturalSize.width || imgSize.width}
                viewBoxHeight={imgNaturalSize.height || imgSize.height}
                toothLabel={`#${seg.tooth_number}`}
                interactive={true}
                onClick={() => onViewOnModel?.(seg.tooth_number)}
              />
            ))}

            {/* Instruction hint */}
            {!analyzing && !autoScanResult && !(showToothResult && imagingResult) && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/40 bg-black/50 px-3 py-1 rounded-full">
                Click on a tooth to analyze
              </div>
            )}
          </div>
        </div>
        </div>{/* end image area */}

        {/* Auto-scan findings panel — BELOW the image */}
        {autoScanResult && (
          <div className="shrink-0 border-t border-ide-border bg-white">
            {/* Stats bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-ide-border/60">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-bold text-ide-text">Auto-Scan Results</span>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                  autoScanResult.provenance === "unet" || autoScanResult.provenance === "live"
                    ? "text-emerald-500 border-emerald-400"
                    : "text-blue-500 border-blue-400"
                }`}>
                  {autoScanResult.provenance === "unet" ? "U-NET" : autoScanResult.provenance === "live" ? "LIVE" : "GEMINI"}
                </span>
                <span className="text-[12px] text-ide-muted">{autoScanResult.inference_time_ms}ms</span>
              </div>
              <div className="flex items-center gap-5">
                <span className="text-[13px] text-ide-muted"><span className="font-bold text-[15px] text-ide-text">{autoScanResult.segmented}</span> teeth</span>
                <span className="text-[13px] text-ide-muted"><span className="font-bold text-[15px] text-amber-600">{autoScanResult.suspicious_teeth}</span> flagged</span>
                <span className="text-[13px] text-ide-muted"><span className="font-bold text-[15px] text-red-500">{autoScanResult.findings.length}</span> findings</span>
              </div>
            </div>

            {/* Cards grid */}
            {autoScanResult.findings.length > 0 && (
              <div className="overflow-y-auto" style={{ maxHeight: 240, scrollbarWidth: "none" }}>
                <div className="grid grid-cols-2 gap-px bg-ide-border/40 p-0">
                  {autoScanResult.findings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="bg-white px-4 py-3.5 hover:bg-[#fafafa] transition-colors cursor-pointer group"
                      onClick={() => onViewOnModel?.(finding.tooth_number)}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <span className="text-[13px] font-bold text-ide-text">#{finding.tooth_number}</span>
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                          finding.severity === "severe"
                            ? "text-red-500"
                            : finding.severity === "moderate"
                            ? "text-orange-500"
                            : "text-green-600"
                        }`}>
                          {finding.severity}
                        </span>
                      </div>
                      <div className="text-[13px] font-semibold text-ide-text capitalize leading-snug">
                        {finding.condition.replace(/_/g, " ")}
                      </div>
                      {finding.location_description && (
                        <div className="text-[11px] text-ide-muted mt-0.5 truncate">
                          {finding.location_description}
                        </div>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-ide-muted">{Math.round(finding.confidence * 100)}%</span>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onTreatmentClick && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onTreatmentClick(finding.condition, finding.tooth_number); }}
                              className="text-[11px] text-ide-accent hover:text-ide-text transition-colors"
                            >
                              Treatment →
                            </button>
                          )}
                          <span className="text-[11px] text-ide-muted">
                            View on 3D →
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {autoScanResult.findings.length === 0 && (
              <div className="px-5 py-4 text-[13px] text-ide-muted">No pathology detected — all teeth appear healthy.</div>
            )}
          </div>
        )}

        {/* Single tooth analysis panel — BELOW the image */}
        {showToothResult && imagingResult && !autoScanResult && (
          <div className="border-t border-ide-border bg-ide-bg px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold text-ide-text">
                  Tooth #{imagingResult.tooth_number} Analysis
                </h3>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  imagingResult.provenance === "unet" || imagingResult.provenance === "live"
                    ? "bg-log-success/15 text-log-success border border-log-success/30"
                    : "bg-log-warn/15 text-log-warn border border-log-warn/30"
                }`}>
                  {imagingResult.provenance === "unet" ? "U-NET" : imagingResult.provenance === "live" ? "LIVE" : "GEMINI"}
                </span>
              </div>
              <button
                onClick={() => setShowToothResult(false)}
                className="text-ide-muted hover:text-ide-text transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {imagingResult.findings && imagingResult.findings.length > 0 && (
              <div className="space-y-1 mb-2">
                {imagingResult.findings.map((finding, idx) => (
                  <div key={idx} className="text-xs bg-ide-surface rounded px-3 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-ide-text capitalize">{finding.condition.replace(/_/g, " ")}</span>
                      <span className="text-ide-border">|</span>
                      <span className={`font-medium ${
                        finding.severity === "severe" ? "text-log-error" :
                        finding.severity === "moderate" ? "text-log-warn" :
                        "text-log-success"
                      }`}>{finding.severity}</span>
                      {finding.location_description && (
                        <>
                          <span className="text-ide-border">|</span>
                          <span className="text-ide-muted text-[11px]">{finding.location_description}</span>
                        </>
                      )}
                    </div>
                    <span className={`text-[9px] font-mono ${
                      finding.confidence >= 0.7 ? "text-log-success" :
                      finding.confidence >= 0.4 ? "text-log-warn" :
                      "text-log-error"
                    }`}>
                      {Math.round(finding.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(imagingResult.narrative || imagingResult.narrative_summary) && (
              <p className="text-[11px] text-ide-muted leading-relaxed mb-2">
                {imagingResult.narrative || imagingResult.narrative_summary}
              </p>
            )}

            {imagingResult.findings && imagingResult.findings.length > 0 &&
              imagingResult.findings[0].condition !== "under_review" && onTreatmentClick && (
              <button
                onClick={() => onTreatmentClick(
                  imagingResult.findings![0].condition,
                  imagingResult.tooth_number
                )}
                className="text-[11px] text-ide-accent hover:text-ide-text transition-colors flex items-center gap-1"
              >
                Look up treatment
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ——— Upload mode ———
  return (
    <div
      ref={wrapperRef}
      className="flex-1 flex items-center justify-center relative overflow-hidden"
      style={{ background: "#0B0B0B", minHeight: 480 }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />
      <div
        ref={spotlightRef}
        style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(80,120,255,0.18) 0%, rgba(80,120,255,0.06) 40%, transparent 70%)",
          pointerEvents: "none", transform: "translate(-50%, -50%)", left: "50%", top: "50%",
        }}
      />

      <div
        ref={cardRef}
        style={{ position: "relative", zIndex: 2, width: 380, padding: "40px 32px", textAlign: "center" }}
      >
        <div ref={glareRef} style={{ position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none" }} />

        <div
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
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

        <div
          ref={dropzoneRef}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: "1.5px dashed rgba(255,255,255,0.15)", borderRadius: 12,
            padding: "28px 20px", marginBottom: 20, cursor: "pointer",
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
            width: "100%", padding: "12px", borderRadius: 10,
            background: "rgba(80,130,255,0.85)", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            letterSpacing: "-0.1px", transition: "background 0.2s, transform 0.1s",
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
