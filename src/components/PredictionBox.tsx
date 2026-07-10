import { useState } from "react";
import type { Match } from "@/lib/wc2026-data";
import { submitPrediction, type Prediction, type MatchResult, type AdvanceSide } from "@/lib/predictions";

interface Props {
  match: Match;
  userId: string | null;
  prediction: Prediction | undefined;
  result: MatchResult | undefined;
  now: Date;
  onRequireLogin?: () => void;
}

export default function PredictionBox({ match, userId, prediction, result, now, onRequireLogin }: Props) {
  const kickoff = new Date(match.kickoffUtc).getTime();
  const kickedOff = now.getTime() >= kickoff;

  const [homeStr, setHomeStr] = useState<string>(prediction ? String(prediction.home_score) : "");
  const [awayStr, setAwayStr] = useState<string>(prediction ? String(prediction.away_score) : "");
  const [advance, setAdvance] = useState<AdvanceSide | null>(prediction?.advance_pick ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (result) return null;

  if (kickedOff) {
    if (prediction) return null;
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
        انتهى وقت التوقع
      </div>
    );
  }

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

  const hn = parseInt(homeStr, 10);
  const an = parseInt(awayStr, 10);
  const validScores = !isNaN(hn) && !isNaN(an) && hn >= 0 && an >= 0 && hn <= 20 && an <= 20;
  const isDraw = validScores && hn === an;
  const needsAdvance = isDraw && advance === null;

  const submit = async () => {
    if (!validScores) {
      setErr("أدخل رقمين صحيحين");
      return;
    }
    if (isDraw && advance === null) {
      setErr("اختر المتأهّل عند التعادل");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await submitPrediction(userId, match.id, hn, an, isDraw ? advance : null);
    setBusy(false);
    if (res.error) setErr(res.error);
  };

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
      <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase text-center mb-2">
        {prediction ? "تعديل توقعك" : "توقعك"}
      </div>
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

      {isDraw && (
        <div className="mt-3">
          <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase text-center mb-2">
            من يتأهّل؟ (ركلات الترجيح)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdvance("home")}
              disabled={busy}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                advance === "home"
                  ? "bg-[var(--gold)] text-[var(--primary-foreground)] border-[var(--gold)]"
                  : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]"
              }`}
            >
              <span className="me-1">{match.homeFlag}</span>{match.homeNameAr}
            </button>
            <button
              type="button"
              onClick={() => setAdvance("away")}
              disabled={busy}
              className={`py-2 rounded-lg text-xs font-bold border transition-colors ${
                advance === "away"
                  ? "bg-[var(--gold)] text-[var(--primary-foreground)] border-[var(--gold)]"
                  : "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]"
              }`}
            >
              <span className="me-1">{match.awayFlag}</span>{match.awayNameAr}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy || !validScores || needsAdvance}
        className="w-full mt-3 bg-[var(--gold)] text-[var(--primary-foreground)] font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-40"
      >
        {prediction ? "تحديث التوقع" : "حفظ التوقع"}
      </button>
      {err && <div className="text-[var(--stadium-red)] text-xs text-center mt-2">{err}</div>}
    </div>
  );
}
