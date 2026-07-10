import { useState } from "react";
import { MATCHES } from "@/lib/wc2026-data";
import {
  upsertMatchResult,
  deleteMatchResult,
  useMatchResults,
  useLeaderboard,
  setUserBonusPoints,
  setHighlightsUrl,
} from "@/lib/predictions";

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const results = useMatchResults();
  const [view, setView] = useState<"results" | "points">("results");
  return (
    <div className="fixed inset-0 z-30 bg-[var(--background)]/95 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto max-w-[480px] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider">لوحة المشرف</h2>
          <button onClick={onClose} className="text-[var(--muted-foreground)] text-sm">إغلاق</button>
        </div>

        <div className="flex gap-1 mb-4">
          {(["results", "points"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold ${
                view === v
                  ? "bg-[var(--gold)] text-[var(--primary-foreground)]"
                  : "bg-[var(--card)] text-[var(--muted-foreground)]"
              }`}
            >
              {v === "results" ? "النتائج" : "نقاط اللاعبين"}
            </button>
          ))}
        </div>

        {view === "results" ? (
          <>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              أدخل النتيجة النهائية لكل مباراة. تُحسب نقاط اللاعبين تلقائياً.
            </p>
            <div className="space-y-3">
              {MATCHES.map((m) => (
                <ResultRow
                  key={m.id}
                  matchId={m.id}
                  homeName={m.homeNameAr}
                  awayName={m.awayNameAr}
                  existing={results[m.id]}
                />
              ))}
            </div>
          </>
        ) : (
          <PointsEditor />
        )}
      </div>
    </div>
  );
}

function ResultRow({
  matchId, homeName, awayName, existing,
}: {
  matchId: string; homeName: string; awayName: string;
  existing: { home_score: number; away_score: number; highlights_url?: string | null; advance_pick?: "home" | "away" | null } | undefined;
}) {
  const [h, setH] = useState<string>(existing ? String(existing.home_score) : "");
  const [a, setA] = useState<string>(existing ? String(existing.away_score) : "");
  const [advance, setAdvance] = useState<"home" | "away" | null>(existing?.advance_pick ?? null);
  const [url, setUrl] = useState<string>(existing?.highlights_url ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [urlMsg, setUrlMsg] = useState<string | null>(null);

  const hn = parseInt(h, 10);
  const an = parseInt(a, 10);
  const validScores = !isNaN(hn) && !isNaN(an);
  const isDraw = validScores && hn === an;

  const save = async () => {
    if (!validScores) return;
    if (isDraw && advance === null) {
      setMsg("اختر المتأهّل");
      setTimeout(() => setMsg(null), 1800);
      return;
    }
    setBusy(true);
    const { error } = await upsertMatchResult(matchId, hn, an, isDraw ? advance : null);
    setBusy(false);
    setMsg(error ? "خطأ" : "✓");
    setTimeout(() => setMsg(null), 1500);
  };
  const clear = async () => {
    setBusy(true);
    await deleteMatchResult(matchId);
    setH(""); setA(""); setUrl(""); setAdvance(null);
    setBusy(false);
  };

  const saveUrl = async () => {
    setBusy(true);
    const { error } = await setHighlightsUrl(matchId, url);
    setBusy(false);
    setUrlMsg(error ? "خطأ" : "✓");
    setTimeout(() => setUrlMsg(null), 1500);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
      <div className="text-xs text-center mb-2">{homeName} <span className="text-[var(--muted-foreground)]">vs</span> {awayName}</div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2">
        <input type="number" min="0" value={h} onChange={(e) => setH(e.target.value)}
          className="h-10 text-center font-mono bg-[var(--background)] border border-[var(--border)] rounded" />
        <span>-</span>
        <input type="number" min="0" value={a} onChange={(e) => setA(e.target.value)}
          className="h-10 text-center font-mono bg-[var(--background)] border border-[var(--border)] rounded" />
      </div>

      {isDraw && (
        <div className="mb-2">
          <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] mb-1 text-center">
            المتأهّل (بركلات الترجيح)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdvance("home")}
              className={`py-1.5 rounded text-xs font-bold border ${
                advance === "home"
                  ? "bg-[var(--gold)] text-[var(--primary-foreground)] border-[var(--gold)]"
                  : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]"
              }`}
            >{homeName}</button>
            <button
              type="button"
              onClick={() => setAdvance("away")}
              className={`py-1.5 rounded text-xs font-bold border ${
                advance === "away"
                  ? "bg-[var(--gold)] text-[var(--primary-foreground)] border-[var(--gold)]"
                  : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]"
              }`}
            >{awayName}</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button onClick={save} disabled={busy} className="bg-[var(--gold)] text-[var(--primary-foreground)] px-3 py-1.5 rounded text-xs font-bold">حفظ</button>
        {existing && <button onClick={clear} disabled={busy} className="text-[var(--stadium-red)] text-xs">حذف</button>}
        {msg && <span className="text-[var(--gold)] text-xs">{msg}</span>}
      </div>


      {/* Highlights URL — enabled only after a result exists (i.e. match marked finished) */}
      <div className={`mt-3 pt-3 border-t border-[var(--border)] ${existing ? "" : "opacity-50"}`}>
        <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] mb-1 text-center">
          رابط ملخص المباراة
        </div>
        <div className="flex items-center gap-2">
          <input
            type="url"
            dir="ltr"
            placeholder="https://youtube.com/…"
            value={url}
            disabled={!existing || busy}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 h-9 px-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded font-mono"
          />
          <button
            onClick={saveUrl}
            disabled={!existing || busy}
            className="bg-[var(--gold)]/80 text-[var(--primary-foreground)] px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap disabled:opacity-40"
          >
            حفظ الرابط
          </button>
          {urlMsg && <span className="text-[var(--gold)] text-xs">{urlMsg}</span>}
        </div>
        {!existing && (
          <div className="text-[10px] text-[var(--muted-foreground)] text-center mt-1">
            سجّل النتيجة أولاً لتفعيل الرابط
          </div>
        )}
      </div>
    </div>
  );
}

function PointsEditor() {
  const rows = useLeaderboard();
  if (rows.length === 0) {
    return <div className="text-center text-[var(--muted-foreground)] text-sm py-6">لا يوجد لاعبون</div>;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--muted-foreground)] mb-2">
        عدّل النقاط الإضافية (bonus) لكل لاعب — تُضاف إلى مجموع نقاطه.
      </p>
      {rows.map((r) => (
        <PointsRow key={r.user_id} userId={r.user_id} username={r.username} total={r.total_points} />
      ))}
    </div>
  );
}

function PointsRow({ userId, username, total }: { userId: string; username: string; total: number }) {
  const [val, setVal] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    setBusy(true);
    const { error } = await setUserBonusPoints(userId, n);
    setBusy(false);
    setMsg(error ? "خطأ" : "✓");
    setTimeout(() => setMsg(null), 1500);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate">{username}</div>
        <div className="text-[10px] font-mono text-[var(--muted-foreground)]">إجمالي حالي: {total}</div>
      </div>
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="0"
        className="w-16 h-9 text-center font-mono bg-[var(--background)] border border-[var(--border)] rounded"
      />
      <button
        onClick={save}
        disabled={busy}
        className="bg-[var(--gold)] text-[var(--primary-foreground)] px-3 py-1.5 rounded text-xs font-bold"
      >
        تعيين
      </button>
      {msg && <span className="text-[var(--gold)] text-xs">{msg}</span>}
    </div>
  );
}
