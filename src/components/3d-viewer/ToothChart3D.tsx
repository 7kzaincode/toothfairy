"use client";

import { Suspense, useState, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import TeethModel from "./TeethModel";
import CameraAnimator from "./CameraAnimator";
import type { ToothFinding } from "@/types/patient-state";

const CONDITION_COLORS: Record<string, string> = {
  cavity: "#F4C152",
  periapical_lesion: "#FF5C7A",
  bone_loss: "#A78BFA",
  impacted: "#4C9AFF",
  root_canal_needed: "#FF5C7A",
  fracture: "#FF9F4A",
  gingivitis: "#F4C152",
  missing: "#6B7280",
};

interface ToothChart3DProps {
  toothChart: Record<number, ToothFinding>;
  onToothSelect?: (toothNumber: number) => void;
}

// FDI (11-48) → Universal (1-32) mapping
const FDI_TO_UNIVERSAL: Record<number, number> = {
  18: 1, 17: 2, 16: 3, 15: 4, 14: 5, 13: 6, 12: 7, 11: 8,
  21: 9, 22: 10, 23: 11, 24: 12, 25: 13, 26: 14, 27: 15, 28: 16,
  38: 17, 37: 18, 36: 19, 35: 20, 34: 21, 33: 22, 32: 23, 31: 24,
  41: 25, 42: 26, 43: 27, 44: 28, 45: 29, 46: 30, 47: 31, 48: 32,
};

// Universal (1-32) → FDI (11-48) mapping
const UNIVERSAL_TO_FDI: Record<number, number> = {};
for (const [fdi, uni] of Object.entries(FDI_TO_UNIVERSAL)) {
  UNIVERSAL_TO_FDI[uni] = Number(fdi);
}

export default function ToothChart3D({
  toothChart,
  onToothSelect,
}: ToothChart3DProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [zoomTarget, setZoomTarget] = useState<THREE.Vector3 | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Build Universal-numbered color map from FDI-numbered toothChart
  const toothColors = useMemo(() => {
    const colors: Record<number, string> = {};
    for (const [fdiStr, finding] of Object.entries(toothChart)) {
      const fdi = Number(fdiStr);
      const universal = FDI_TO_UNIVERSAL[fdi];
      if (universal && CONDITION_COLORS[finding.condition]) {
        colors[universal] = CONDITION_COLORS[finding.condition];
      }
    }
    return colors;
  }, [toothChart]);

  const handleToothSelect = (universalNum: number, worldPos: THREE.Vector3) => {
    setSelectedTooth(universalNum);
    setZoomTarget(worldPos.clone());
    // Convert Universal → FDI for the rest of the app
    const fdiNum = UNIVERSAL_TO_FDI[universalNum] || universalNum;
    onToothSelect?.(fdiNum);
  };

  const [resetView, setResetView] = useState(false);

  const handleCanvasMiss = () => {
    setSelectedTooth(null);
    setZoomTarget(null);
    setResetView(true);
  };

  const selectedFinding = selectedTooth
    ? toothChart[UNIVERSAL_TO_FDI[selectedTooth] || selectedTooth]
    : null;

  if (!mounted) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000000" }}>
        <span style={{ color: "#888", fontSize: 12 }}>Initializing 3D viewer...</span>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative" }}>
        <Canvas
          camera={{ position: [0, 20, 4], fov: 80 }}
          gl={{ antialias: true }}
          style={{ position: "absolute", inset: 0, background: "#000000" }}
          onPointerMissed={handleCanvasMiss}
        >
          <ambientLight intensity={0.3} color="#4488ff" />
          <directionalLight position={[5, 25, 10]} intensity={0.8} color="#88ccff" />
          <directionalLight position={[-5, 15, 5]} intensity={0.4} color="#4466cc" />
          <pointLight position={[0, 20, 8]} intensity={1.5} color="#00aaff" distance={50} />
          <hemisphereLight args={["#1a4080", "#050510", 0.5]} />

          <Suspense fallback={null}>
            <TeethModel
              onToothSelect={handleToothSelect}
              selectedTooth={selectedTooth}
              toothColors={toothColors}
            />
          </Suspense>

          <OrbitControls
            makeDefault
            target={[0, 20, 0]}
            enableZoom={false}
            minDistance={4}
            maxDistance={4}
          />

          <CameraAnimator
            targetPos={zoomTarget}
            zoomDistance={5}
            resetView={resetView}
            defaultCameraPos={new THREE.Vector3(0, 20, 4)}
            defaultTarget={new THREE.Vector3(0, 20, 0)}
            onResetComplete={() => setResetView(false)}
          />
        </Canvas>

        {selectedTooth && (
          <div className="absolute top-3 left-3 bg-ide-surface/90 backdrop-blur-sm border border-ide-border rounded-md px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-ide-muted mb-0.5">
              Selected Tooth
            </div>
            <div className="text-sm font-mono text-ide-text">
              #{UNIVERSAL_TO_FDI[selectedTooth] || selectedTooth}
            </div>
            {selectedFinding && (
              <div className="mt-1">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    color: CONDITION_COLORS[selectedFinding.condition],
                    background: `${CONDITION_COLORS[selectedFinding.condition]}20`,
                  }}
                >
                  {selectedFinding.condition.replace(/_/g, " ")}
                </span>
                <div className="text-[10px] text-ide-muted mt-1">
                  {selectedFinding.severity} &bull;{" "}
                  {(selectedFinding.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2 border-t border-ide-hairline bg-ide-bg">
        <span className="text-[10px] text-ide-muted mr-1">Legend:</span>
        {Object.entries(CONDITION_COLORS).map(([condition, color]) => (
          <div key={condition} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-ide-muted capitalize">
              {condition.replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
