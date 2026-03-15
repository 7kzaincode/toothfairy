"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { DM_Sans } from "next/font/google";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

const dmSans = DM_Sans({ subsets: ["latin"] });

type GLTFNodes = {
  nodes: {
    Object_3: THREE.Mesh;
    Object_4: THREE.Mesh;
    Object_5: THREE.Mesh;
    Object_6: THREE.Mesh;
    Object_7: THREE.Mesh;
    Object_8: THREE.Mesh;
  };
};

const SPIN_DURATION = 1.5; // seconds for the half-rotation entrance

// Animated point light that orbits the model to create a moving specular shine
function ShimmerLight() {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.getElapsedTime();
    lightRef.current.position.set(
      Math.sin(t * 0.7) * 6,
      22 + Math.cos(t * 0.45) * 2,
      4 + Math.cos(t * 0.7) * 4
    );
  });
  return <pointLight ref={lightRef} intensity={12} color="#ffffff" distance={22} decay={2} />;
}

function TeethDisplay() {
  const groupRef = useRef<THREE.Group>(null);
  const { nodes } = useGLTF("/models/teeth.glb") as unknown as GLTFNodes;
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    elapsedRef.current += delta;

    const t = Math.min(elapsedRef.current / SPIN_DURATION, 1);
    const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out

    if (t < 1) {
      // Half rotation on an angle: y swings from π→0, x tilt resolves simultaneously
      groupRef.current.rotation.y = Math.PI * (1 - eased);
      groupRef.current.rotation.x = 0.45 * (1 - eased);
    } else {
      // Gentle idle float after the entrance spin settles
      const idleTime = elapsedRef.current - SPIN_DURATION;
      groupRef.current.rotation.y = Math.sin(idleTime * 0.35) * 0.09;
      groupRef.current.rotation.x = Math.sin(idleTime * 0.22) * 0.04;
    }
  });

  return (
    <group ref={groupRef} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={4.135}>
        <group position={[-0.262, -0.314, 4.671]}>
          {[nodes.Object_3, nodes.Object_4, nodes.Object_5].map((node, i) => (
            <mesh key={`gum-${i}`} geometry={node.geometry}>
              <meshPhysicalMaterial
                color="#4a7aaa"
                transparent
                opacity={0.3}
                roughness={0.2}
                metalness={0.6}
                emissive="#5a90c0"
                emissiveIntensity={0.4}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          {[nodes.Object_6, nodes.Object_7].map((node, i) => (
            <mesh key={`tooth-${i}`} geometry={node.geometry}>
              <meshPhysicalMaterial
                color="#9adcff"
                emissive="#5ab8f0"
                emissiveIntensity={0.5}
                transparent
                opacity={0.72}
                roughness={0.02}
                metalness={0.1}
                clearcoat={1}
                clearcoatRoughness={0.0}
                ior={1.65}
                reflectivity={1}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          <mesh geometry={nodes.Object_8.geometry}>
            <meshPhysicalMaterial
              color="#3a6090"
              transparent
              opacity={0.15}
              roughness={0.3}
              metalness={0.6}
              emissive="#4a80b0"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

interface LandingPopupProps {
  onDismiss: () => void;
}

export default function LandingPopup({ onDismiss }: LandingPopupProps) {
  const [mounted, setMounted] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    const modelTimer = setTimeout(() => setShowModel(true), 1200);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(modelTimer);
    };
  }, []);

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#080808] ${dmSans.className}`}>

      {/* Top Spotlight Beam */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height: "65vh",
          background:
            "radial-gradient(ellipse 38% 75% at 50% -8%, rgba(140, 190, 255, 0.48) 0%, rgba(100, 155, 235, 0.18) 45%, transparent 70%)",
        }}
      />

      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Global Spotlight (cursor-following) */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-60"
        style={{
          background: `radial-gradient(600px circle at var(--cursor-x, 50%) var(--cursor-y, 50%), rgba(255,255,255,0.08), transparent 40%)`,
        }}
      />

      {/* 3D Teeth Model — absolutely positioned, floats in from the right */}
      {showModel && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            // Model left edge sits at page center — it bleeds off the right side
            // (clipped by overflow-hidden). Card shifts left to balance visually.
            left: "calc(50% - 500px)",
            top: "50%",
            transform: "translateY(-50%)",
            width: "1600px",
            height: "1600px",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              animation: "model-slide-in-right 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            }}
          >
            <Canvas
              camera={{ position: [2, 22, 9], fov: 55 }}
              gl={{ alpha: true, antialias: true }}
              style={{ background: "transparent" }}
              onCreated={({ camera }) => camera.lookAt(0, 20, 0)}
            >
              <ambientLight intensity={0.4} />
              <pointLight position={[6, 26, 6]} intensity={4} color="#ffffff" />
              <pointLight position={[-6, 18, 4]} intensity={2} color="#88ccff" />
              <pointLight position={[0, 24, -4]} intensity={1.5} color="#4466bb" />
              <Suspense fallback={null}>
                <ShimmerLight />
                <TeethDisplay />
                <Environment preset="studio" />
              </Suspense>
            </Canvas>
          </div>
        </div>
      )}

      {/* Card — shifts left when the model appears.
          Two wrappers: outer handles translateX shift, inner handles the float-in animation
          (keeping them separate avoids transform conflicts). */}
      <div
        style={{
          transform: showModel ? "translateX(-340px)" : "translateX(0)",
          transition: "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative",
          zIndex: 20,
        }}
      >
        <div
          style={{
            animation: "card-float-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <div className="relative w-full max-w-[400px] p-[1px] rounded-2xl mx-4 group">

            {/* Border Glow Highlight (mouse-tracked) */}
            <div
              className="absolute inset-0 rounded-2xl z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{
                background: `radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.25), transparent 40%)`,
              }}
            />

            {/* Card Content */}
            <div
              ref={cardRef}
              onMouseMove={handleCardMouseMove}
              className="relative z-10 bg-white/[0.03] backdrop-blur-[20px] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center"
            >
              <div className="w-16 h-16 mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner p-2">
                <Image src="/logo.png" alt="Tooth Fairy Logo" width={48} height={48} className="opacity-90" />
              </div>

              <h1 className="text-3xl font-medium text-white/90 mb-3 text-center tracking-tight">
                Tooth Fairy
              </h1>
              <p className="text-[15px] leading-relaxed text-white/50 mb-8 text-center max-w-[280px]">
                Your Agentic Dental IDE for X-ray analysis, clinical notes, and interactive treatment planning.
              </p>

              <button
                type="button"
                onClick={() => onDismiss()}
                className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-lg px-4 py-3.5 text-[15px] font-medium transition-all shadow-sm active:scale-[0.98]"
              >
                Enter Workspace
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
