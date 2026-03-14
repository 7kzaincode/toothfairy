"use client";

import { useState, useEffect, useRef } from "react";
import { DM_Sans } from "next/font/google";
import Image from "next/image";

const dmSans = DM_Sans({ subsets: ["latin"] });

interface LandingPopupProps {
  onDismiss: () => void;
}

export default function LandingPopup({ onDismiss }: LandingPopupProps) {
  const [mounted, setMounted] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Global cursor position for the background spotlight
  useEffect(() => {
    setMounted(true);
    
    const handleMouseMove = (e: MouseEvent) => {
      // Update global CSS variables for the background spotlight
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Local cursor position for the card's inner glowing border
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);
  };

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#080808] ${dmSans.className}`}>
      
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      {/* Global Spotlight */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-60"
        style={{
          background: `radial-gradient(600px circle at var(--cursor-x, 50%) var(--cursor-y, 50%), rgba(255,255,255,0.08), transparent 40%)`
        }}
      />

      {/* Glassmorphism Card Container */}
      <div className="relative z-10 w-full max-w-[400px] p-[1px] rounded-2xl mx-4 group">
        
        {/* Border Glow Highlight that tracks mouse inside the card */}
        <div 
          className="absolute inset-0 rounded-2xl z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(300px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.25), transparent 40%)`
          }}
        />

        {/* Actual Card Content */}
        <div 
          ref={cardRef}
          onMouseMove={handleCardMouseMove}
          className="relative z-10 bg-white/[0.03] backdrop-blur-[20px] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center"
        >
          {/* Logo */}
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
            onClick={onDismiss}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white rounded-lg px-4 py-3.5 text-[15px] font-medium transition-all shadow-sm active:scale-[0.98]"
          >
            Enter Workspace
          </button>

        </div>
      </div>
    </div>
  );
}
