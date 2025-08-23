"use client";

import Image from "next/image";
import { useEffect } from "react";

export default function Hero() {
  useEffect(() => {
    // Enhanced CSS animations with proper timing
    const timer = setTimeout(() => {
      document.querySelector(".hero-container")?.classList.add("animate-fade-in");
      document.querySelector(".hero-logo")?.classList.add("animate-scale-in");
      document.querySelector(".hero-headline")?.classList.add("animate-slide-up");
      document.querySelector(".hero-sub")?.classList.add("animate-slide-up");
      document.querySelectorAll(".hero-cta a").forEach((el, i) => {
        setTimeout(() => el.classList.add("animate-fade-in"), i * 100);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* Grid Background - Exact recreation */}
      <div className="absolute inset-0 -z-20 grid-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-purple-950 to-black" />
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          filter: 'blur(0.5px)'
        }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
      
      <div aria-hidden className="absolute inset-0 -z-10 bg-anim">
        <div className="absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-purple-600/30 blur-3xl blob-1" />
        <div className="absolute top-20 right-10 size-72 rounded-full bg-fuchsia-500/20 blur-2xl blob-2" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center hero-container opacity-0">
        <div className="mx-auto mb-6 flex items-center justify-center">
          <div className="relative hero-logo opacity-0" style={{ width: "25vw", height: "25vh", minWidth: "200px", minHeight: "200px" }}>
            <Image src="/edgar-logo-svg.svg" alt="Edgar" fill className="invert object-contain" priority />
          </div>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
          New • Cross‑platform builds for Web, Desktop, Mobile
        </p>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white hero-headline opacity-0">
          Send the command and sleep.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-white/70 max-w-3xl mx-auto hero-sub opacity-0 px-4">
          Edgar is the VibeCoding agent that ships real apps for web, desktop, and mobile.
          Choose your stack, theme, and models — GPT‑5, Claude 4.1 Opus, Gemini 2.5 Pro —
          then let Edgar plan, act, and deliver.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 hero-cta px-4">
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-purple-600 hover:bg-purple-500 text-white text-base font-medium px-6 py-3 shadow-[0_0_35px_rgba(168,85,247,0.7)] opacity-0"
          >
            Start for $0
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white text-base font-medium px-6 py-3 opacity-0"
          >
            Explore features
          </a>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatX {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-8px); }
        }
        @keyframes hueRotate {
          0%, 100% { filter: hue-rotate(0deg); }
          50% { filter: hue-rotate(30deg); }
        }
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 30px); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-fade-in {
          animation: fadeIn 0.7s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.8s ease-out 0.15s forwards;
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out 0.12s forwards;
        }
        .blob-1 {
          animation: float 4s ease-in-out infinite;
        }
        .blob-2 {
          animation: floatX 4.2s ease-in-out infinite;
        }
        .bg-anim {
          animation: hueRotate 12s ease-in-out infinite;
        }
        .grid-bg {
          animation: gridMove 30s linear infinite;
        }
        .hero-container.animate-fade-in {
          animation: fadeIn 0.7s ease-out forwards;
        }
        .hero-logo.animate-scale-in {
          animation: scaleIn 0.8s ease-out 0.15s forwards;
        }
        .hero-headline.animate-slide-up {
          animation: slideUp 0.6s ease-out 0.12s forwards;
        }
        .hero-sub.animate-slide-up {
          animation: slideUp 0.6s ease-out 0.3s forwards;
        }
        .hero-cta a.animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .hero-cta a:nth-child(1).animate-fade-in {
          animation-delay: 0.45s;
        }
        .hero-cta a:nth-child(2).animate-fade-in {
          animation-delay: 0.55s;
        }
      `}</style>
    </section>
  );
}


