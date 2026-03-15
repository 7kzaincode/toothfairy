"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import Image from "next/image";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

const dmSans = DM_Sans({ subsets: ["latin"] });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"] });

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
  return <pointLight ref={lightRef} intensity={8} color="#e0e0e0" distance={22} decay={2} />;
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
                color="#c4a6b8"
                transparent
                opacity={0.35}
                roughness={0.3}
                metalness={0.2}
                emissive="#b08ea0"
                emissiveIntensity={0.15}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          {[nodes.Object_6, nodes.Object_7].map((node, i) => (
            <mesh key={`tooth-${i}`} geometry={node.geometry}>
              <meshPhysicalMaterial
                color="#e8e8e8"
                emissive="#d0d0d0"
                emissiveIntensity={0.1}
                transparent
                opacity={0.85}
                roughness={0.05}
                metalness={0.05}
                clearcoat={1}
                clearcoatRoughness={0.0}
                ior={1.5}
                reflectivity={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
          <mesh geometry={nodes.Object_8.geometry}>
            <meshPhysicalMaterial
              color="#b0a0a8"
              transparent
              opacity={0.12}
              roughness={0.4}
              metalness={0.2}
              emissive="#a090a0"
              emissiveIntensity={0.05}
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

  useEffect(() => {
    setMounted(true);
    const modelTimer = setTimeout(() => setShowModel(true), 1200);
    return () => clearTimeout(modelTimer);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-white ${dmSans.className}`}>

      {/* Top Spotlight Beam */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-0"
        style={{
          height: "65vh",
          background:
            "radial-gradient(ellipse 38% 75% at 50% -8%, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.01) 45%, transparent 70%)",
        }}
      />

      {/* Grid Pattern Background */}
      <div
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* 3D Teeth Model — absolutely positioned, floats in from the right */}
      {showModel && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
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
              <ambientLight intensity={0.8} />
              <pointLight position={[6, 26, 6]} intensity={3} color="#ffffff" />
              <pointLight position={[-6, 18, 4]} intensity={1.5} color="#d0d0d0" />
              <pointLight position={[0, 24, -4]} intensity={1} color="#c0c0c0" />
              <Suspense fallback={null}>
                <ShimmerLight />
                <TeethDisplay />
                <Environment preset="studio" />
              </Suspense>
            </Canvas>
          </div>
        </div>
      )}

      {/* Left content area — shifts left when model appears */}
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
          <div className="flex flex-col items-center text-center mx-4 max-w-[440px]">

            <div className="w-14 h-14 mb-8 rounded-2xl bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center p-2">
              <Image src="/logo.png" alt="Tooth Fairy Logo" width={44} height={44} className="opacity-90 invert" />
            </div>

            <h1 className={`text-[56px] leading-[1.1] font-normal text-[#171717] tracking-tight ${dmSerif.className}`}>
              Reimagine your
            </h1>
            <h1 className={`text-[56px] leading-[1.1] font-normal italic text-[#171717] tracking-tight mb-5 ${dmSerif.className}`}>
              dental workflow.
            </h1>

            <p className="text-[17px] leading-relaxed text-[#737373] mb-10 max-w-[340px]">
              Your AI-powered dental IDE for X-ray analysis, clinical notes, and treatment planning.
            </p>

            <button
              type="button"
              onClick={() => onDismiss(false)}
              className="bg-[#171717] text-white rounded-xl px-10 py-3.5 text-[15px] font-semibold transition-all hover:bg-[#2a2a2a] active:scale-[0.97] shadow-lg shadow-black/10"
            >
              Jump in!
            </button>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-6 flex flex-col items-center gap-4 pointer-events-none">
        <p className="text-[13px] text-[#a3a3a3]">
          By continuing, you agree to Tooth Fairy&apos;s{" "}
          <span className="underline cursor-pointer pointer-events-auto">Terms of Service</span>{" "}
          and{" "}
          <span className="underline cursor-pointer pointer-events-auto">Privacy Policy</span>
        </p>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#a3a3a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#737373] tracking-wider uppercase">AI Powered</span>
              <span className="text-[10px] text-[#a3a3a3] uppercase tracking-wider">Gemini</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#a3a3a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#737373] tracking-wider uppercase">Privacy First</span>
              <span className="text-[10px] text-[#a3a3a3] uppercase tracking-wider">Secure</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#a3a3a3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" /></svg>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-[#737373] tracking-wider uppercase">Open Source</span>
              <span className="text-[10px] text-[#a3a3a3] uppercase tracking-wider">MIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
