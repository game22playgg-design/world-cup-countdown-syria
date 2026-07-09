import { useEffect, useMemo, useState } from "react";
import { useLeaderboard, fetchUserPredictions, type Prediction } from "@/lib/predictions";
import { MATCHES, type Match } from "@/lib/wc2026-data";
import { supabase } from "@/integrations/supabase/client";

const STAGE_LABEL: Record<Match["stage"], string> = {
  r32: "دور 32",
  r16: "دور 16",
  qf: "ربع",
  sf: "نصف",
  final: "نهائي",
};

// Same match-status logic used elsewhere: finished ~110 minutes after kickoff.
function matchFinished(iso: string, now: Date) {
  const k = new Date(iso).getTime();
  return now.getTime() >= k + 110 * 60 * 1000;
}

export default function Leaderboard({ currentUserId }: { currentUserId: string | null }) {
  const rows = useLeaderboard();
  const [openUser, setOpenUser] = useState<{ id: string; username: string } | null>(null);
  const [sortBy, setSortBy] = useState<"total" | Match["stage"]>("total");

  const stages = useMemo(() => {
    const set = new Set<Match["stage"]>();
    MATCHES.forEach((m) => set.add(m.stage));
    const order: Match["stage"][] = ["r32", "r16", "qf", "sf", "final"];
    return order.filter((s) => set.has(s));
  }, []);

  const ranked = useMemo(() => {
    const scored = rows.map((r) => ({
      ...r,
      _score: sortBy === "total" ? r.total_points : r.per_round[sortBy] ?? 0,
    }));
    scored.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return b.exact_count - a.exact_count;
    });
    let lastPts = -1;
    let lastRank = 0;
    return scored.map((r, i) => {
      const rank = r._score === lastPts ? lastRank : i + 1;
      lastPts = r._score;
      lastRank = rank;
      return { ...r, rank };
    });
  }, [rows, sortBy]);


  if (ranked.length === 0) {
    return (
      <div className="text-center text-[var(--muted-foreground)] py-12 text-sm">
        لا يوجد لاعبون بعد. كن أول من يتوقع!
      </div>
    );
  }

  return (
    <div className="px-3 pt-3">
      <div className="overflow-x-auto no-scrollbar rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm min-w-full" dir="rtl">
          <thead className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
            <tr className="border-b border-[var(--border)]">
              <th className="text-right p-2 sticky right-0 bg-[var(--card)] z-10">#</th>
              <th className="text-right p-2 sticky right-8 bg-[var(--card)] z-10">اللاعب</th>
              {stages.map((s) => (
                <th key={s} className="text-center p-2">{STAGE_LABEL[s]}</th>
              ))}
              <th className="text-center p-2 text-[var(--gold)]">الإجمالي</th>
              <th className="text-center p-2"></th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => {
              const isMe = r.user_id === currentUserId;
              const rowBg = isMe ? "bg-[#1d2033]" : "bg-[var(--card)]";
              return (
                <tr key={r.user_id} className={`border-b border-[var(--border)] last:border-0 ${isMe ? "bg-[var(--gold)]/10" : ""}`}>
                  <td className={`p-2 font-mono font-bold text-[var(--gold)] sticky right-0 z-10 ${rowBg}`}>{r.rank}</td>
                  <td className={`p-2 font-bold sticky right-8 z-10 ${rowBg} whitespace-nowrap`}>
                    {r.username}
                    {isMe && <span className="text-[9px] text-[var(--gold)] mr-1">(أنت)</span>}
                  </td>
                  {stages.map((s) => (
                    <td key={s} className="p-2 text-center font-mono text-[var(--muted-foreground)]">
                      {r.per_round[s] ?? 0}
                    </td>
                  ))}
                  <td className="p-2 text-center font-mono font-bold text-[var(--gold)]">{r.total_points}</td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => setOpenUser({ id: r.user_id, username: r.username })}
                      className="text-[10px] font-bold px-2 py-1 rounded border border-[var(--gold)]/50 text-[var(--gold)] hover:bg-[var(--gold)]/10 whitespace-nowrap"
                    >
                      التوقعات
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[var(--muted-foreground)] text-center mt-3 font-mono">
        3 نقاط للنتيجة الدقيقة • 1 نقطة للفائز الصحيح • مرّر أفقياً لرؤية جميع الأدوار
      </p>

      {openUser && (
        <PredictionsModal
          userId={openUser.id}
          username={openUser.username}
          currentUserId={currentUserId}
          onClose={() => setOpenUser(null)}
        />
      )}
    </div>
  );
}

function PredictionsModal({
  userId,
  username,
  currentUserId,
  onClose,
}: {
  userId: string;
  username: string;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const [preds, setPreds] = useState<Prediction[] | null>(null);
  const [myPredMatchIds, setMyPredMatchIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());

  const matchById = useMemo(() => {
    const m: Record<string, Match> = {};
    MATCHES.forEach((x) => (m[x.id] = x));
    return m;
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancel = false;
    fetchUserPredictions(userId).then((data) => {
      if (!cancel) setPreds(data);
    });
    return () => { cancel = true; };
  }, [userId]);

  // Pull the viewing user's own predictions so we can enforce the reciprocity rule
  // for matches that haven't finished yet.
  useEffect(() => {
    let cancel = false;
    if (!currentUserId || currentUserId === userId) {
      setMyPredMatchIds(new Set());
      return;
    }
    supabase
      .from("predictions")
      .select("match_id")
      .eq("user_id", currentUserId)
      .then(({ data }) => {
        if (cancel) return;
        setMyPredMatchIds(new Set((data ?? []).map((r) => r.match_id as string)));
      });
    return () => { cancel = true; };
  }, [currentUserId, userId]);

  // Sort by kickoff (chronological)
  const sorted = useMemo(() => {
    if (!preds) return [];
    return [...preds]
      .filter((p) => matchById[p.match_id])
      .sort((a, b) => +new Date(matchById[a.match_id].kickoffUtc) - +new Date(matchById[b.match_id].kickoffUtc));
  }, [preds, matchById]);

  const isSelfView = currentUserId === userId;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-end sm:place-items-center px-2 sm:px-4 py-4"
      onClick={onClose}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest">توقعات اللاعب</div>
            <div className="font-bold truncate text-[var(--gold)]">{username}</div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm px-2"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {preds === null ? (
            <div className="text-center text-xs text-[var(--muted-foreground)] py-10">…جاري التحميل</div>
          ) : sorted.length === 0 ? (
            <div className="text-center text-xs text-[var(--muted-foreground)] py-10">لا توجد توقعات بعد</div>
          ) : (
            sorted.map((p) => {
              const m = matchById[p.match_id];
              const finished = matchFinished(m.kickoffUtc, now);
              const canSeeScore = isSelfView || finished || myPredMatchIds.has(p.match_id);

              const pts = p.points;
              const pillCls =
                pts === 3
                  ? "bg-[var(--gold)]/20 text-[var(--gold)]"
                  : pts === 1
                  ? "bg-[#86ac6f]/20 text-[#86ac6f]"
                  : pts === 0
                  ? "bg-[var(--stadium-red)]/15 text-[var(--stadium-red)]"
                  : "bg-[var(--secondary)] text-[var(--muted-foreground)]";
              const ptsLabel = pts == null ? "—" : `${pts} ${pts === 1 ? "نقطة" : "نقاط"}`;

              return (
                <div key={p.match_id} className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <div className="flex items-center justify-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{m.homeFlag}</span>
                      <span className="text-xs font-bold truncate">{m.homeNameAr}</span>
                    </div>
                    {canSeeScore ? (
                      <div dir="ltr" className="font-mono font-bold text-lg px-2 whitespace-nowrap">
                        {p.away_score} - {p.home_score}
                      </div>
                    ) : (
                      <div className="font-mono font-bold text-lg px-2 whitespace-nowrap text-[var(--muted-foreground)]">
                        ? - ?
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 min-w-0">
                      <span className="text-xs font-bold truncate">{m.awayNameAr}</span>
                      <span className="text-lg shrink-0">{m.awayFlag}</span>
                    </div>
                  </div>

                  {!canSeeScore && (
                    <div className="mt-2 text-[11px] text-center text-[var(--muted-foreground)] leading-relaxed">
                      يمكنك رؤية التوقع بعد توقعك للمباراة
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase">
                      {STAGE_LABEL[m.stage]}
                    </span>
                    {canSeeScore && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${pillCls}`}>
                        {ptsLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
