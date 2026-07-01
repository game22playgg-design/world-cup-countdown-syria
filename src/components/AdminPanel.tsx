import { useState } from "react";
import { MATCHES } from "@/lib/wc2026-data";
import { upsertMatchResult, deleteMatchResult, useMatchResults } from "@/lib/predictions";

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const results = useMatchResults();
  return (
    <div className="fixed inset-0 z-30 bg-[var(--background)]/95 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto max-w-[480px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider">لوحة المشرف</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] text-sm">إغلاق</button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          أدخل النتيجة النهائية لكل مباراة. تُحسب نقاط اللاعبين تلقائياً.
        </p>
        <div className="space-y-3">
          {MATCHES.map((m) => (
            <ResultRow key={m.id} matchId={m.id} homeName={m.homeNameAr} awayName={m.awayNameAr} existing={results[m.id]} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  matchId, homeName, awayName, existing,
}: {
  matchId: string; homeName: string; awayName: string;
  existing: { home_score: number; away_score: number } | undefined;
}) {
  const [h, setH] = useState<string>(existing ? String(existing.home_score) : "");
  const [a, setA] = useState<string>(existing ? String(existing.away_score) : "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    const hn = parseInt(h, 10), an = parseInt(a, 10);
    if (isNaN(hn) || isNaN(an)) return;
    setBusy(true);
    const { error } = await upsertMatchResult(matchId, hn, an);
    setBusy(false);
    setMsg(error ? "خطأ" : "✓");
    setTimeout(() => setMsg(null), 1500);
  };
  const clear = async () => {
    setBusy(true);
    await deleteMatchResult(matchId);
    setH(""); setA("");
    setBusy(false);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
      <div className="text-xs text-center mb-2">{homeName} <span className="text-[var(--muted-foreground)]">vs</span> {awayName}</div>
      <div dir="ltr" className="flex items-center justify-center gap-2">
        <input type="number" min="0" value={h} onChange={(e) => setH(e.target.value)}
          className="w-14 h-10 text-center font-mono bg-[var(--background)] border border-[var(--border)] rounded" />
        <span>-</span>
        <input type="number" min="0" value={a} onChange={(e) => setA(e.target.value)}
          className="w-14 h-10 text-center font-mono bg-[var(--background)] border border-[var(--border)] rounded" />
        <button onClick={save} disabled={busy} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-3 py-1.5 rounded text-xs font-bold">حفظ</button>
        {existing && <button onClick={clear} disabled={busy} className="text-[var(--stadium-red)] text-xs">حذف</button>}
        {msg && <span className="text-[var(--gold)] text-xs">{msg}</span>}
      </div>
    </div>
  );
}
