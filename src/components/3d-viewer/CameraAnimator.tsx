"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// The approximate world-space center of the entire mouth model
const MODEL_CENTER = new THREE.Vector3(0, 20, 0);

interface CameraAnimatorProps {
  targetPos: THREE.Vector3 | null;
  zoomDistance?: number;
  resetView?: boolean;
  defaultCameraPos?: THREE.Vector3;
  defaultTarget?: THREE.Vector3;
  onResetComplete?: () => void;
}

export default function CameraAnimator({
  targetPos,
  zoomDistance = 5,
  resetView,
  defaultCameraPos,
  defaultTarget,
  onResetComplete,
}: CameraAnimatorProps) {
  const { controls } = useThree();
  const goalTarget = useRef(new THREE.Vector3());
  const goalCamera = useRef(new THREE.Vector3());
  const animating = useRef(false);
  const prevTarget = useRef<string>("");
  const isResetting = useRef(false);

  // Reset to default view
  if (resetView && defaultCameraPos && defaultTarget) {
    goalCamera.current.copy(defaultCameraPos);
    goalTarget.current.copy(defaultTarget);
    animating.current = true;
    isResetting.current = true;
    prevTarget.current = "";
  } else if (targetPos && !resetView) {
  // Zoom to tooth
    const key = `${targetPos.x.toFixed(2)},${targetPos.y.toFixed(2)},${targetPos.z.toFixed(2)}`;
    if (key !== prevTarget.current) {
      prevTarget.current = key;
      isResetting.current = false;

      goalTarget.current.copy(targetPos);

      const outward = new THREE.Vector3().subVectors(targetPos, MODEL_CENTER).normalize();

      // For back teeth (large sideways offset), clamp the outward Z so
      // the camera doesn't swing fully behind the mouth.
      const absX = Math.abs(outward.x);
      if (absX > 0.6) {
        outward.z = Math.max(outward.z, 0.5);
        outward.normalize();
      }

      // For upper teeth, clamp upward direction so camera doesn't go too high
      if (outward.y > 0.3) {
        outward.y = 0.3;
        outward.z = Math.max(outward.z, 0.5);
        outward.normalize();
      }

      goalCamera.current.copy(targetPos).addScaledVector(outward, zoomDistance);

      animating.current = true;
    }
  }

  useFrame(({ camera }) => {
    if (!animating.current || !controls) return;

    const orbitControls = controls as unknown as { target: THREE.Vector3; update: () => void };

    camera.position.lerp(goalCamera.current, 0.07);
    orbitControls.target.lerp(goalTarget.current, 0.07);
    orbitControls.update();

    if (
      camera.position.distanceTo(goalCamera.current) < 0.05 &&
      orbitControls.target.distanceTo(goalTarget.current) < 0.05
    ) {
      animating.current = false;
      if (isResetting.current) {
        isResetting.current = false;
        onResetComplete?.();
      }
    }
  });

  return null;
}
