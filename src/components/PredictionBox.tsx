import { useState } from "react";
import type { Match } from "@/lib/wc2026-data";
import { submitPrediction, type Prediction, type MatchResult } from "@/lib/predictions";

interface Props {
  match: Match;
  userId: string | null;
  prediction: Prediction | undefined;
  result: MatchResult | undefined;
  now: Date;
}

export default function PredictionBox({ match, userId, prediction, result, now }: Props) {
  const kickoff = new Date(match.kickoffUtc).getTime();
  const kickedOff = now.getTime() >= kickoff;
  const [h, setH] = useState<string>("");
  const [a, setA] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Finished: show comparison + points
  if (result && prediction) {
    const pts = prediction.points ?? 0;
    const color = pts === 3 ? "text-[var(--gold)]" : pts === 1 ? "text-[#86ac6f]" : "text-[var(--muted-foreground)]";
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-[var(--background)] rounded-lg py-2">
            <div className="text-[9px] text-[var(--muted-foreground)] font-mono uppercase">توقعك</div>
            <div className="font-mono font-bold text-lg mt-1">
              {prediction.home_score} - {prediction.away_score}
            </div>
          </div>
          <div className="bg-[var(--background)] rounded-lg py-2">
            <div className="text-[9px] text-[var(--muted-foreground)] font-mono uppercase">النتيجة</div>
            <div className="font-mono font-bold text-lg mt-1">
              {result.home_score} - {result.away_score}
            </div>
          </div>
        </div>
        <div className={`text-center mt-2 font-[var(--font-display)] text-lg tracking-wider ${color}`}>
          {pts} {pts === 1 ? "نقطة" : "نقاط"}
        </div>
      </div>
    );
  }

  // Finished but no prediction
  if (result && !prediction) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
        <div className="text-xs text-[var(--muted-foreground)]">
          النتيجة: <span className="font-mono font-bold text-[var(--foreground)]">{result.home_score} - {result.away_score}</span>
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)] mt-1">لم تتوقع هذه المباراة</div>
      </div>
    );
  }

  // Kickoff passed but no result yet
  if (kickedOff) {
    if (prediction) {
      return (
        <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
          <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase">توقعك (مقفل)</div>
          <div className="font-mono font-bold text-xl mt-1 text-[var(--gold)]">
            {prediction.home_score} - {prediction.away_score}
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
        انتهى وقت التوقع
      </div>
    );
  }

  // Not started, has prediction: locked view
  if (prediction) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
        <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase">توقعك (مقفل)</div>
        <div className="font-mono font-bold text-xl mt-1 text-[var(--gold)]">
          {prediction.home_score} - {prediction.away_score}
        </div>
      </div>
    );
  }

  // Input form
  const submit = async () => {
    if (!userId) return;
    const hn = parseInt(h, 10);
    const an = parseInt(a, 10);
    if (isNaN(hn) || isNaN(an) || hn < 0 || an < 0 || hn > 20 || an > 20) {
      setErr("أدخل رقمين صحيحين");
      return;
    }
    setBusy(true);
    const res = await submitPrediction(userId, match.id, hn, an);
    setBusy(false);
    if (res.error) setErr(res.error);
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase text-center mb-2">توقعك</div>
      <div dir="ltr" className="flex items-center justify-center gap-2">
        <input
          type="number"
          min="0"
          max="20"
          value={h}
          onChange={(e) => setH(e.target.value)}
          disabled={!userId || busy}
          placeholder="0"
          className="w-14 h-12 text-center font-mono font-bold text-xl bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--gold)]"
        />
        <span className="text-[var(--muted-foreground)] font-bold">-</span>
        <input
          type="number"
          min="0"
          max="20"
          value={a}
          onChange={(e) => setA(e.target.value)}
          disabled={!userId || busy}
          placeholder="0"
          className="w-14 h-12 text-center font-mono font-bold text-xl bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--gold)]"
        />
        <button
          onClick={submit}
          disabled={!userId || busy}
          className="ml-2 bg-[var(--gold)] text-[var(--primary-foreground)] font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
        >
          حفظ
        </button>
      </div>
      {!userId && (
        <div className="text-[10px] text-[var(--muted-foreground)] text-center mt-2">
          سجّل الدخول للتوقع
        </div>
      )}
      {err && <div className="text-[var(--stadium-red)] text-xs text-center mt-2">{err}</div>}
    </div>
  );
}
