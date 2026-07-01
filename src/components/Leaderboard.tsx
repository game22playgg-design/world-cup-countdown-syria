import { useMemo } from "react";
import { useLeaderboard } from "@/lib/predictions";
import { MATCHES, type Match } from "@/lib/wc2026-data";

const STAGE_LABEL: Record<Match["stage"], string> = {
  r32: "دور 32",
  r16: "دور 16",
  qf: "ربع",
  sf: "نصف",
  final: "نهائي",
};

export default function Leaderboard({ currentUserId }: { currentUserId: string | null }) {
  const rows = useLeaderboard();

  // Only show stage columns that exist in current tournament data
  const stages = useMemo(() => {
    const set = new Set<Match["stage"]>();
    MATCHES.forEach((m) => set.add(m.stage));
    const order: Match["stage"][] = ["r32", "r16", "qf", "sf", "final"];
    return order.filter((s) => set.has(s));
  }, []);

  // Compute rank with ties (same points = same rank)
  const ranked = useMemo(() => {
    let lastPts = -1;
    let lastRank = 0;
    return rows.map((r, i) => {
      const rank = r.total_points === lastPts ? lastRank : i + 1;
      lastPts = r.total_points;
      lastRank = rank;
      return { ...r, rank };
    });
  }, [rows]);

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
              <th className="text-center p-2 text-[var(--gold)] sticky left-0 bg-[var(--card)] z-10">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => {
              const isMe = r.user_id === currentUserId;
              const bg = isMe ? "bg-[var(--gold)]/10" : "";
              return (
                <tr key={r.user_id} className={`border-b border-[var(--border)] last:border-0 ${bg}`}>
                  <td className={`p-2 font-mono font-bold text-[var(--gold)] sticky right-0 z-10 ${isMe ? "bg-[#1d2033]" : "bg-[var(--card)]"}`}>
                    {r.rank}
                  </td>
                  <td className={`p-2 font-bold truncate max-w-[100px] sticky right-8 z-10 ${isMe ? "bg-[#1d2033]" : "bg-[var(--card)]"}`}>
                    {r.username}
                    {isMe && <span className="text-[9px] text-[var(--gold)] mr-1">(أنت)</span>}
                  </td>
                  {stages.map((s) => (
                    <td key={s} className="p-2 text-center font-mono text-[var(--muted-foreground)]">
                      {r.per_round[s] ?? 0}
                    </td>
                  ))}
                  <td className={`p-2 text-center font-mono font-bold text-[var(--gold)] sticky left-0 z-10 ${isMe ? "bg-[#1d2033]" : "bg-[var(--card)]"}`}>
                    {r.total_points}
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
    </div>
  );
}
