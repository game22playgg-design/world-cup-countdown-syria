import { useEffect, useMemo, useState } from "react";

interface Props {
  storageKey: string;
  title: string;
  message: string;
  emoji?: string;
}

/**
 * Full-screen celebratory overlay with confetti. Shown once per storageKey.
 * Purely presentational; no notifications, no backend.
 */
export default function CelebrationModal({ storageKey, title, message, emoji = "🎯" }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") return;
    } catch {}
    const t = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(t);
  }, [storageKey]);

  const confetti = useMemo(() => {
    const colors = ["#C9A227", "#E63946", "#4ade80", "#60a5fa", "#f472b6", "#fbbf24"];
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.5 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }));
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* Confetti layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.id}
            style={{
              position: "absolute",
              top: "-20px",
              left: `${c.left}%`,
              width: `${c.size}px`,
              height: `${c.size * 0.4}px`,
              background: c.color,
              transform: `rotate(${c.rotate}deg)`,
              animation: `confetti-fall ${c.duration}s ${c.delay}s linear infinite`,
              borderRadius: "2px",
            }}
          />
        ))}
      </div>

      <div className="relative mx-4 w-[min(92vw,420px)] rounded-2xl border-2 border-[var(--gold)] bg-gradient-to-br from-[var(--card)] to-[var(--surface-2)] p-6 text-center animate-scale-in shadow-2xl">
        <div className="text-6xl mb-3 animate-bounce">{emoji}</div>
        <div className="font-[var(--font-display)] text-2xl font-extrabold text-[var(--gold)] mb-2 tracking-wide">
          {title}
        </div>
        <p className="text-sm text-[var(--foreground)] leading-relaxed mb-5 whitespace-pre-line">
          {message}
        </p>
        <button
          onClick={close}
          className="w-full bg-[var(--gold)] text-[var(--primary-foreground)] font-extrabold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          شكراً 🙌
        </button>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
