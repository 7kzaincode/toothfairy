"use client";

import { Suspense, useState, useEffect, useRef } from "react";
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
};

interface ToothChart3DProps {
  toothChart: Record<number, ToothFinding>;
  onToothSelect?: (toothNumber: number) => void;
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

  const handleToothSelect = (toothNumber: number, worldPos: THREE.Vector3) => {
    setSelectedTooth(toothNumber);
    setZoomTarget(worldPos.clone());
    onToothSelect?.(toothNumber);
  };

  const [resetView, setResetView] = useState(false);

  const handleCanvasMiss = () => {
    setSelectedTooth(null);
    setZoomTarget(null);
    setResetView(true);
  };

  const selectedFinding = selectedTooth ? toothChart[selectedTooth] : null;

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
          camera={{ position: [-3, 21, 5], fov: 45 }}
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
              toothColors={{}}
            />
          </Suspense>

          <OrbitControls
            makeDefault
            target={[0, 20, 0]}
            minDistance={4}
            maxDistance={30}
          />

          <CameraAnimator
            targetPos={zoomTarget}
            zoomDistance={5}
            resetView={resetView}
            defaultCameraPos={new THREE.Vector3(-3, 21, 5)}
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
              #{selectedTooth}
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
