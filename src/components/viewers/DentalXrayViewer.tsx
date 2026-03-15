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
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
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
      ctx.fillStyle = "rgba(0,0,0,0.08)";
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
      glare.style.background = `radial-gradient(ellipse 55% 40% at ${gx}% ${gy}%, rgba(0,0,0,0.03) 0%, transparent 70%)`;
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
      dropLabelRef.current.innerHTML = `<span style="color:#16a34a">✓</span> <span style="color:#404040">${name}</span>`;
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
      dropzoneRef.current.style.borderColor = "rgba(23,23,23,0.4)";
      dropzoneRef.current.style.background = "rgba(23,23,23,0.03)";
    }
  };

  const handleDragLeave = () => {
    if (dropzoneRef.current) {
      dropzoneRef.current.style.borderColor = "rgba(0,0,0,0.15)";
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
        className="flex-1 flex items-center justify-center relative overflow-hidden"
        style={{ background: "#1a1a1a", minHeight: 480 }}
      >
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0 }}
        />
        <div
          ref={spotlightRef}
          style={{
            position: "absolute", width: 600, height: 600, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
            pointerEvents: "none", transform: "translate(-50%, -50%)", left: "50%", top: "50%",
          }}
        />

        {(onClose || (imageId && onAutoScan)) && (
          <div className="absolute top-3 right-3 z-20 flex items-start gap-2">
            {imageId && onAutoScan && (
              <div className="flex gap-2">
                {autoScanResult && (
                  <button
                    onClick={() => setShowScanResults(!showScanResults)}
                    className="px-3 py-2 rounded-lg font-medium text-sm transition-all bg-white/90 hover:bg-white text-[#171717] active:scale-95"
                    style={{
                      border: "1px solid rgba(255,255,255,0.3)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
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
                )}
                <button
                  onClick={() => {
                    setScanning(true);
                    setShowScanResults(true);
                    onAutoScan(imageId);
                  }}
                  disabled={scanning}
                  className={`px-4 py-2 rounded-lg font-medium text-sm text-white transition-all ${
                    scanning
                      ? "bg-[#171717]/50 cursor-not-allowed"
                      : "bg-[#171717] hover:bg-[#2a2a2a] active:scale-95"
                  }`}
                  style={{
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {scanning ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Scanning...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
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
                className="w-8 h-8 flex items-center justify-center rounded-md bg-white/90 border border-white/30 text-[#737373] hover:text-[#171717] hover:bg-white active:scale-95 transition-all"
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

        <div className="relative" style={{ maxWidth: "90%", maxHeight: "90%" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Dental X-Ray"
            onLoad={handleImageLoad}
            onClick={handleImageClick}
            className="max-w-full max-h-[80vh] rounded-lg cursor-crosshair"
            style={{ display: "block", border: "1px solid rgba(255,255,255,0.15)" }}
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
            />
          ))}

          {/* Auto-scan results panel */}
          {showScanResults && autoScanResult && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Auto-Scan Complete</h3>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    autoScanResult.provenance === "unet" || autoScanResult.provenance === "live"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : autoScanResult.provenance === "cached"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}>
                    {autoScanResult.provenance === "unet" ? "U-NET" : autoScanResult.provenance === "live" ? "LIVE" : autoScanResult.provenance === "cached" ? "CACHED" : "FALLBACK"}
                  </span>
                  <span className="text-xs text-white/40">{autoScanResult.inference_time_ms}ms</span>
                  <button
                    onClick={() => setShowScanResults(false)}
                    className="text-white/40 hover:text-white/80 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div className="bg-white/10 rounded p-2">
                  <div className="text-lg font-bold text-white">{autoScanResult.segmented}</div>
                  <div className="text-[10px] text-white/40">Teeth Analyzed</div>
                </div>
                <div className="bg-yellow-500/10 rounded p-2">
                  <div className="text-lg font-bold text-yellow-400">{autoScanResult.suspicious_teeth}</div>
                  <div className="text-[10px] text-white/40">Flagged</div>
                </div>
                <div className="bg-red-500/10 rounded p-2">
                  <div className="text-lg font-bold text-red-400">{autoScanResult.findings.length}</div>
                  <div className="text-[10px] text-white/40">Findings</div>
                </div>
              </div>

              {autoScanResult.findings.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {autoScanResult.findings.map((finding, idx) => (
                    <div key={idx} className="text-xs bg-white/10 rounded px-2 py-1.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-blue-400">#{finding.tooth_number}</span>
                        <span className="mx-1.5 text-white/30">·</span>
                        <span className="text-white/70">{finding.condition.replace(/_/g, " ")}</span>
                        <span className="mx-1.5 text-white/30">·</span>
                        <span className={`font-medium ${
                          finding.severity === "severe" ? "text-red-400" :
                          finding.severity === "moderate" ? "text-yellow-400" :
                          "text-green-400"
                        }`}>{finding.severity}</span>
                      </div>
                      <span className={`text-[9px] font-mono ${
                        finding.confidence >= 0.7 ? "text-green-400" :
                        finding.confidence >= 0.4 ? "text-yellow-400" :
                        "text-red-400"
                      }`}>
                        {Math.round(finding.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Single tooth analysis panel (cmd+click result) */}
          {showToothResult && imagingResult && !(showScanResults && autoScanResult) && (
            <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">
                  Tooth #{imagingResult.tooth_number} Analysis
                </h3>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                    imagingResult.provenance === "unet" || imagingResult.provenance === "live"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : imagingResult.provenance === "cached"
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  }`}>
                    {imagingResult.provenance === "unet" ? "U-NET" : imagingResult.provenance === "live" ? "LIVE" : imagingResult.provenance === "cached" ? "CACHED" : "FALLBACK"}
                  </span>
                  {imagingResult.inference_time_ms != null && (
                    <span className="text-xs text-white/40">{imagingResult.inference_time_ms}ms</span>
                  )}
                  <button
                    onClick={() => setShowToothResult(false)}
                    className="text-white/40 hover:text-white/80 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Findings */}
              {imagingResult.findings && imagingResult.findings.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {imagingResult.findings.map((finding, idx) => (
                    <div key={idx} className="text-xs bg-white/10 rounded px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white/80 capitalize">{finding.condition.replace(/_/g, " ")}</span>
                        <span className="text-white/20">|</span>
                        <span className={`font-medium ${
                          finding.severity === "severe" ? "text-red-400" :
                          finding.severity === "moderate" ? "text-yellow-400" :
                          "text-green-400"
                        }`}>{finding.severity}</span>
                        {finding.location_description && (
                          <>
                            <span className="text-white/20">|</span>
                            <span className="text-white/50 text-[11px]">{finding.location_description}</span>
                          </>
                        )}
                      </div>
                      <span className={`text-[9px] font-mono ${
                        finding.confidence >= 0.7 ? "text-green-400" :
                        finding.confidence >= 0.4 ? "text-yellow-400" :
                        "text-red-400"
                      }`}>
                        {Math.round(finding.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Narrative */}
              {(imagingResult.narrative || imagingResult.narrative_summary) && (
                <p className="text-[11px] text-white/50 leading-relaxed mb-3">
                  {imagingResult.narrative || imagingResult.narrative_summary}
                </p>
              )}

              {/* Treatment lookup button */}
              {imagingResult.findings && imagingResult.findings.length > 0 &&
                imagingResult.findings[0].condition !== "under_review" && onTreatmentClick && (
                <button
                  onClick={() => onTreatmentClick(
                    imagingResult.findings![0].condition,
                    imagingResult.tooth_number
                  )}
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                >
                  Look up treatment
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Instruction hint */}
          {!analyzing && !(showScanResults && autoScanResult) && !(showToothResult && imagingResult) && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white/60 bg-black/60 px-3 py-1 rounded-full">
              Click on a tooth to analyze
            </div>
          )}
        </div>{/* end image area */}

        {/* Auto-scan findings panel — BELOW the image */}
        {autoScanResult && (
          <div className="border-t border-white/10 bg-[#111] px-5 py-4 overflow-y-auto" style={{ maxHeight: 280 }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-white">Auto-Scan Results</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                  autoScanResult.provenance === "unet" || autoScanResult.provenance === "live"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : autoScanResult.provenance === "cached"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}>
                  {autoScanResult.provenance === "unet" ? "U-NET" : autoScanResult.provenance === "live" ? "LIVE" : autoScanResult.provenance === "cached" ? "CACHED" : "FALLBACK"}
                </span>
                <span className="text-xs text-white/30">{autoScanResult.inference_time_ms}ms</span>
              </div>
              <div className="flex items-center gap-5 text-sm">
                <span className="text-white/60"><span className="font-bold text-white text-base">{autoScanResult.segmented}</span> teeth</span>
                <span className="text-yellow-400"><span className="font-bold text-base">{autoScanResult.suspicious_teeth}</span> flagged</span>
                <span className="text-red-400"><span className="font-bold text-base">{autoScanResult.findings.length}</span> findings</span>
              </div>
            </div>

            {autoScanResult.findings.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {autoScanResult.findings.map((finding, idx) => (
                  <div key={idx} className="text-sm bg-white/5 rounded-lg px-3 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400">#{finding.tooth_number}</span>
                      <span className="text-white/20">{"\u00b7"}</span>
                      <span className="text-white/70">{finding.condition.replace(/_/g, " ")}</span>
                      <span className="text-white/20">{"\u00b7"}</span>
                      <span className={`font-semibold ${
                        finding.severity === "severe" ? "text-red-400" :
                        finding.severity === "moderate" ? "text-yellow-400" :
                        "text-green-400"
                      }`}>{finding.severity}</span>
                    </div>
                    <span className={`text-xs font-mono font-semibold ${
                      finding.confidence >= 0.7 ? "text-green-400" :
                      finding.confidence >= 0.4 ? "text-yellow-400" :
                      "text-red-400"
                    }`}>
                      {Math.round(finding.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {autoScanResult.findings.length === 0 && (
              <p className="text-sm text-white/30">No pathology detected — all teeth appear healthy.</p>
            )}
          </div>
        )}

        {/* Single tooth analysis panel — BELOW the image */}
        {showToothResult && imagingResult && !autoScanResult && (
          <div className="border-t border-white/10 bg-[#111] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-semibold text-white">
                  Tooth #{imagingResult.tooth_number} Analysis
                </h3>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                  imagingResult.provenance === "unet" || imagingResult.provenance === "live"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : imagingResult.provenance === "cached"
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                }`}>
                  {imagingResult.provenance === "unet" ? "U-NET" : imagingResult.provenance === "live" ? "LIVE" : imagingResult.provenance === "cached" ? "CACHED" : "FALLBACK"}
                </span>
              </div>
              <button
                onClick={() => setShowToothResult(false)}
                className="text-white/40 hover:text-white/80 transition-colors"
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
                  <div key={idx} className="text-xs bg-white/5 rounded px-3 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 capitalize">{finding.condition.replace(/_/g, " ")}</span>
                      <span className="text-white/20">|</span>
                      <span className={`font-medium ${
                        finding.severity === "severe" ? "text-red-400" :
                        finding.severity === "moderate" ? "text-yellow-400" :
                        "text-green-400"
                      }`}>{finding.severity}</span>
                      {finding.location_description && (
                        <>
                          <span className="text-white/20">|</span>
                          <span className="text-white/50 text-[11px]">{finding.location_description}</span>
                        </>
                      )}
                    </div>
                    <span className={`text-[9px] font-mono ${
                      finding.confidence >= 0.7 ? "text-green-400" :
                      finding.confidence >= 0.4 ? "text-yellow-400" :
                      "text-red-400"
                    }`}>
                      {Math.round(finding.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(imagingResult.narrative || imagingResult.narrative_summary) && (
              <p className="text-[11px] text-white/50 leading-relaxed mb-2">
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
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
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
      style={{ background: "#fafafa", minHeight: 480 }}
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

      <div
        ref={cardRef}
        style={{ position: "relative", zIndex: 2, width: 380, padding: "40px 32px", textAlign: "center" }}
      >
        <div ref={glareRef} style={{ position: "absolute", inset: 0, borderRadius: 16, pointerEvents: "none" }} />

        <div
          style={{
            width: 52, height: 52, borderRadius: 14,
            background: "#f5f5f5", border: "1px solid #e5e5e5",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M3 15l5-5 4 4 3-3 6 6" />
          </svg>
        </div>

        <p style={{ fontSize: 18, fontWeight: 500, color: "#171717", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
          Dental X-Ray Viewer
        </p>
        <p style={{ fontSize: 13, color: "#737373", margin: "0 0 32px", lineHeight: 1.5 }}>
          Upload a radiograph to begin AI-assisted<br />analysis and segmentation
        </p>

        <div
          ref={dropzoneRef}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: "1.5px dashed rgba(0,0,0,0.15)", borderRadius: 12,
            padding: "28px 20px", marginBottom: 20, cursor: "pointer",
            transition: "border-color 0.2s, background 0.2s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(23,23,23,0.4)";
            (e.currentTarget as HTMLDivElement).style.background = "rgba(23,23,23,0.03)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(0,0,0,0.15)";
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto 10px" }}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p ref={dropLabelRef} style={{ fontSize: 13, color: "#737373", margin: 0 }}>
            Drop your X-ray here or <span style={{ color: "#171717" }}>browse</span>
          </p>
          <p style={{ fontSize: 11, color: "#a3a3a3", margin: "6px 0 0" }}>
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
            background: "#171717", border: "none",
            color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer",
            letterSpacing: "-0.1px", transition: "background 0.2s, transform 0.1s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#2a2a2a"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#171717"; }}
          onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)"; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
        >
          Upload X-Ray
        </button>
      </div>
    </div>
  );
}
