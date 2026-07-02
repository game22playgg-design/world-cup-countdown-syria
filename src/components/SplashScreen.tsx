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
      <div className={`mb-6 transition-transform duration-700 ${isExiting ? "scale-95" : "scale-100"}`}>
        <img
          src="/icon-512.png"
          alt="موعد"
          width={128}
          height={128}
          className="w-32 h-32 rounded-3xl shadow-2xl"
        />
      </div>

      <h1
        className={`font-[var(--font-display)] text-5xl text-[var(--gold)] tracking-[0.15em] transition-all duration-700 ${
          isExiting ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        موعد
      </h1>

      <div
        className={`w-12 h-0.5 bg-[var(--gold)] rounded-full mt-4 opacity-60 transition-all duration-700 ${
          isExiting ? "scale-x-0 opacity-0" : "scale-x-100 opacity-60"
        }`}
      />
    </div>
  );
}
