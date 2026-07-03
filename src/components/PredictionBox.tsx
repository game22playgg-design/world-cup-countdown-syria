import { useState } from "react";
import type { Match } from "@/lib/wc2026-data";
import { submitPrediction, type Prediction, type MatchResult } from "@/lib/predictions";

interface Props {
  match: Match;
  userId: string | null;
  prediction: Prediction | undefined;
  result: MatchResult | undefined;
  now: Date;
  onRequireLogin?: () => void;
}

/**
 * Handles the *input* flow only. The parent MatchCard renders the
 * "Final Result" and "Your Prediction" blocks once data exists.
 * This component shows either:
 *   - a login CTA (guest)
 *   - "انتهى وقت التوقع" (kickoff passed, no prediction)
 *   - the input form (open, no prediction yet)
 *   - nothing (prediction already submitted — card shows it)
 */
export default function PredictionBox({ match, userId, prediction, result, now, onRequireLogin }: Props) {
  const kickoff = new Date(match.kickoffUtc).getTime();
  const kickedOff = now.getTime() >= kickoff;

  const [homeStr, setHomeStr] = useState<string>("");
  const [awayStr, setAwayStr] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Prediction already made or result posted — parent renders the display, we render nothing here.
  if (prediction || result) return null;

  if (kickedOff) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
        انتهى وقت التوقع
      </div>
    );
  }

  // Guest — prompt sign-in
  if (!userId) {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)] text-center">
        <p className="text-xs text-[var(--muted-foreground)] mb-2">
          يجب تسجيل الدخول لإضافة توقع
        </p>
        <button
          onClick={() => onRequireLogin?.()}
          className="inline-flex items-center justify-center gap-2 bg-[var(--gold)] text-[var(--primary-foreground)] font-bold px-4 py-2 rounded-lg text-xs"
        >
          سجّل الدخول للتوقع
        </button>
      </div>
    );
  }

  const submit = async () => {
    const hn = parseInt(homeStr, 10);
    const an = parseInt(awayStr, 10);
    if (isNaN(hn) || isNaN(an) || hn < 0 || an < 0 || hn > 20 || an > 20) {
      setErr("أدخل رقمين صحيحين");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await submitPrediction(userId, match.id, hn, an);
    setBusy(false);
    if (res.error) setErr(res.error);
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase text-center mb-2">توقعك</div>
      {/* Matches card grid: col-1 = home (right in RTL), col-3 = away (left in RTL) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex justify-center">
          <input
            type="number"
            min="0"
            max="20"
            inputMode="numeric"
            value={homeStr}
            onChange={(e) => setHomeStr(e.target.value)}
            disabled={busy}
            placeholder="0"
            aria-label={`توقع ${match.homeNameAr}`}
            className="w-16 h-12 text-center font-mono font-bold text-xl bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--gold)]"
          />
        </div>
        <div className="text-[var(--muted-foreground)] font-bold text-lg">-</div>
        <div className="flex justify-center">
          <input
            type="number"
            min="0"
            max="20"
            inputMode="numeric"
            value={awayStr}
            onChange={(e) => setAwayStr(e.target.value)}
            disabled={busy}
            placeholder="0"
            aria-label={`توقع ${match.awayNameAr}`}
            className="w-16 h-12 text-center font-mono font-bold text-xl bg-[var(--background)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--gold)]"
          />
        </div>
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="w-full mt-3 bg-[var(--gold)] text-[var(--primary-foreground)] font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
      >
        حفظ التوقع
      </button>
      {err && <div className="text-[var(--stadium-red)] text-xs text-center mt-2">{err}</div>}
    </div>
  );
}
