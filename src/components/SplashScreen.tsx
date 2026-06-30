import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [phase, setPhase] = useState<"enter" | "exit" | "done">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("exit"), 1000);
    const t2 = setTimeout(() => setPhase("done"), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "done") return null;

  const isExiting = phase === "exit";

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center bg-[var(--background)] transition-opacity duration-700 ${
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden={isExiting}
    >
      {/* Logo mark — stylised football */}
      <div className={`relative mb-6 transition-transform duration-700 ${isExiting ? "scale-95" : "scale-100"}`}>
        <div className="w-24 h-24 rounded-full border-[3px] border-[var(--gold)] flex items-center justify-center relative">
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="text-[var(--gold)]">
            <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth="2" />
            <path d="M32 8 L42 22 L32 36 L22 22 Z" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="32" cy="22" r="3.5" fill="currentColor" />
            <path d="M22 22 Q16 32 22 42" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <path d="M42 22 Q48 32 42 42" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
            <path d="M32 36 L32 50" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
          </svg>
          {/* Subtle ring pulse */}
          <div className="absolute inset-0 rounded-full border border-[var(--gold)] opacity-0 animate-ping" style={{ animationDuration: "2s" }} />
        </div>
      </div>

      {/* App name */}
      <h1
        className={`font-[var(--font-display)] text-5xl text-[var(--gold)] tracking-[0.15em] mb-3 transition-all duration-700 ${
          isExiting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        موعد
      </h1>

      {/* Divider */}
      <div
        className={`w-12 h-0.5 bg-[var(--gold)] rounded-full mb-4 opacity-60 transition-all duration-700 ${
          isExiting ? "scale-x-0 opacity-0" : "scale-x-100 opacity-60"
        }`}
      />

      {/* Developer name */}
      <p
        className={`text-sm text-[var(--muted-foreground)] tracking-wide transition-all duration-700 delay-75 ${
          isExiting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        المهندس حبيب الرحمن
      </p>
    </div>
  );
}
