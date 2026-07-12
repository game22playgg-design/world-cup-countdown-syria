import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MATCHES, type Match } from "@/lib/wc2026-data";
import SplashScreen from "@/components/SplashScreen";
import UsernameGate from "@/components/UsernameGate";
import PredictionBox from "@/components/PredictionBox";
import Leaderboard from "@/components/Leaderboard";
import AdminPanel from "@/components/AdminPanel";
import { useCurrentUser, signOut } from "@/lib/auth-user";
import { useMatchResults, useMyPredictions } from "@/lib/predictions";
import { enablePushNotifications, pushPermissionState, pushSupported } from "@/lib/push";
import BracketView from "@/components/BracketView";
import ScorersView from "@/components/ScorersView";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "موعد — مباريات كأس العالم 2026" },
      { name: "description", content: "توقّع نتائج كأس العالم 2026 وتنافس على لوحة المتصدرين — بتوقيت سوريا." },
      { property: "og:title", content: "موعد — كأس العالم 2026" },
      { property: "og:description", content: "توقعات ولوحة متصدرين لمباريات كأس العالم 2026." },
    ],
  }),
  component: Index,
});

type Screen = "home" | "leaderboard" | "stats";
type StatsTab = "scorers" | "bracket";

const SYRIA_TZ = "Asia/Damascus";

const STAGE_LABEL: Record<Match["stage"], string> = {
  r32: "دور الـ32",
  r16: "ثمن النهائي",
  qf: "ربع النهائي",
  sf: "نصف النهائي",
  final: "تحديد المركز الثالث والنهائي",
};

const ROUNDS: { key: Match["stage"]; label: string; short: string }[] = [
  { key: "r32", label: "دور الـ32", short: "الـ32" },
  { key: "r16", label: "ثمن النهائي", short: "الـ16" },
  { key: "qf", label: "ربع النهائي", short: "ربع" },
  { key: "sf", label: "نصف النهائي", short: "نصف" },
  { key: "final", label: "النهائي", short: "النهائي" },
];

function fmtSyria(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("ar-SY", {
    timeZone: SYRIA_TZ, weekday: "short", day: "numeric", month: "long",
  }).format(d);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SYRIA_TZ, hour: "2-digit", minute: "2-digit", hour12: true,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const dp = parts.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() ?? "";
  const period = dp === "AM" ? "صباحاً" : "مساءً";
  return { date, time: `${hour}:${minute} ${period}` };
}

function matchStatus(iso: string, now: Date): "upcoming" | "live" | "finished" {
  const k = new Date(iso).getTime();
  const n = now.getTime();
  if (n < k) return "upcoming";
  if (n < k + 110 * 60 * 1000) return "live";
  return "finished";
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function roundStatus(round: Match["stage"], now: Date): "done" | "active" | "upcoming" {
  const rMatches = MATCHES.filter((m) => m.stage === round);
  if (rMatches.length === 0) return "upcoming";
  const statuses = rMatches.map((m) => matchStatus(m.kickoffUtc, now));
  if (statuses.every((s) => s === "finished")) return "done";
  if (statuses.every((s) => s === "upcoming")) return "upcoming";
  return "active";
}

function CountdownCard({ target }: { target: Match | null }) {
  const now = useNow(1000);
  if (!target) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--card)] to-[var(--surface-2)] p-6 text-center">
        <div className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider">
          بانتظار جدول الدور القادم
        </div>
      </div>
    );
  }
  const diff = Math.max(0, new Date(target.kickoffUtc).getTime() - now.getTime());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const { date, time } = fmtSyria(target.kickoffUtc);
  const segs = [
    { v: pad(d), label: "يوم" },
    { v: pad(h), label: "ساعة" },
    { v: pad(m), label: "دقيقة" },
    { v: pad(s), label: "ثانية" },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--card)] to-[var(--surface-2)] p-5">
      <div className="text-center text-[11px] text-[var(--muted-foreground)] mb-3">
        المباراة القادمة · بتوقيت <b className="text-[var(--gold)]">دمشق</b>
      </div>
      <div dir="ltr" className="flex justify-center items-start gap-2 mb-4">
        {segs.map((seg, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="text-center">
              <div className="countdown-digit text-2xl sm:text-3xl bg-[var(--gold-soft)] rounded-lg px-3 py-1 min-w-[52px]">
                {seg.v}
              </div>
              <div className="text-[9px] text-[var(--text-3)] mt-1 font-medium">{seg.label}</div>
            </div>
            {i < segs.length - 1 && (
              <div className="font-[var(--font-display)] text-2xl sm:text-3xl text-[var(--text-3)] pt-1">:</div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-around">
        <div className="text-center flex-1 min-w-0">
          <div className="text-3xl mb-1">{target.homeFlag}</div>
          <div className="text-xs font-bold text-[var(--muted-foreground)] truncate">{target.homeNameAr}</div>
        </div>
        <div className="font-[var(--font-display)] text-lg font-bold text-[var(--stadium-red)] px-3">VS</div>
        <div className="text-center flex-1 min-w-0">
          <div className="text-3xl mb-1">{target.awayFlag}</div>
          <div className="text-xs font-bold text-[var(--muted-foreground)] truncate">{target.awayNameAr}</div>
        </div>
      </div>
      <div className="text-center text-[11px] text-[var(--text-3)] mt-3">
        {date} · {time}
      </div>
    </div>
  );
}

function LiveHero({ match, result }: { match: Match; result: { home_score: number; away_score: number } | undefined }) {
  return (
    <div className="rounded-2xl border border-[var(--green)]/30 bg-gradient-to-b from-[var(--card)] to-[var(--surface-2)] p-5">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
        <span className="text-[11px] font-bold text-[var(--green)]">مباراة جارية الآن</span>
      </div>
      <div className="flex items-center justify-around">
        <div className="text-center flex-1 min-w-0">
          <div className="text-4xl mb-1">{match.homeFlag}</div>
          <div className="text-xs font-bold truncate">{match.homeNameAr}</div>
        </div>
        <div dir="ltr" className="font-[var(--font-display)] font-bold text-4xl text-[var(--gold)] whitespace-nowrap px-3">
          {result ? `${result.home_score} - ${result.away_score}` : "— : —"}
        </div>
        <div className="text-center flex-1 min-w-0">
          <div className="text-4xl mb-1">{match.awayFlag}</div>
          <div className="text-xs font-bold truncate">{match.awayNameAr}</div>
        </div>
      </div>
      <div className="text-center text-[10px] font-bold text-[var(--gold)] mt-3 tracking-wider">
        {STAGE_LABEL[match.stage]}
      </div>
    </div>
  );
}

function RoundStepper({
  now, selected, onSelect,
}: {
  now: Date; selected: Match["stage"]; onSelect: (r: Match["stage"]) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-extrabold">مخطط البطولة</div>
        <div className="text-[10px] text-[var(--text-3)] font-[var(--font-display)] tracking-wider">TOURNAMENT PROGRESS</div>
      </div>
      <div className="flex items-start px-1">
        {ROUNDS.map((r, i) => {
          const status = roundStatus(r.key, now);
          const isSelected = r.key === selected;
          const done = status === "done";
          // In RTL, first step should be on the right. The connector line renders to the RIGHT of each dot
          // (i.e., toward the previous step). We hide it on the first item.
          return (
            <button
              key={r.key}
              onClick={() => onSelect(r.key)}
              className="flex-1 flex flex-col items-center relative cursor-pointer group"
            >
              {i > 0 && (
                <div
                  className={`absolute top-[13px] right-1/2 w-full h-[2px] z-0 transition-colors ${
                    done || (roundStatus(ROUNDS[i - 1].key, now) === "done" && (done || isSelected))
                      ? "bg-[var(--gold)]"
                      : "bg-[var(--border)]"
                  }`}
                />
              )}
              <div
                className={`z-10 rounded-full flex items-center justify-center font-[var(--font-display)] font-bold transition-all ${
                  done
                    ? "w-[26px] h-[26px] bg-[var(--gold)] border-2 border-[var(--gold)] text-[var(--primary-foreground)]"
                    : isSelected
                    ? "w-[30px] h-[30px] bg-[var(--background)] border-2 border-[var(--gold)] text-[var(--gold)] shadow-[0_0_0_4px_var(--gold-soft)]"
                    : "w-[26px] h-[26px] bg-[var(--card)] border-2 border-[var(--border)] text-[var(--text-3)]"
                }`}
              >
                {done ? "✓" : ""}
              </div>
              <div
                className={`text-[10px] font-bold mt-2 max-w-[54px] leading-tight ${
                  isSelected ? "text-[var(--gold)]" : done ? "text-[var(--muted-foreground)]" : "text-[var(--text-3)]"
                }`}
              >
                {r.short}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status, hasResult }: { status: "upcoming" | "live" | "finished"; hasResult: boolean }) {
  if (status === "live") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--green-soft)] text-[var(--green)] flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
        مباشر
      </span>
    );
  }
  if (status === "finished") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-2)] text-[var(--text-3)] border border-[var(--border)]">
        {hasResult ? "انتهت" : "بانتظار النتيجة"}
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--gold-soft)] text-[var(--gold)]">
      قادمة
    </span>
  );
}

function ScoreRow({ label, home, away, tone }: { label: string; home: number; away: number; tone: "gold" | "muted" }) {
  const color = tone === "gold" ? "text-[var(--gold)]" : "text-[var(--foreground)]";
  const bg = tone === "gold" ? "bg-[var(--gold-soft)] border-[var(--gold)]/30" : "bg-[var(--surface-2)] border-[var(--border)]";
  return (
    <div className={`mt-3 rounded-lg border ${bg} px-3 py-2`}>
      <div className="text-[9px] uppercase tracking-widest text-[var(--muted-foreground)] text-center mb-1">
        {label}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className={`text-center font-[var(--font-display)] font-bold text-2xl ${color}`}>{home}</div>
        <div className="text-[var(--text-3)] font-bold">-</div>
        <div className={`text-center font-[var(--font-display)] font-bold text-2xl ${color}`}>{away}</div>
      </div>
    </div>
  );
}

function MatchCard({
  match, now, userId, prediction, result, onRequireLogin,
}: {
  match: Match; now: Date; userId: string | null;
  prediction: ReturnType<typeof useMyPredictions>["predictions"][string] | undefined;
  result: ReturnType<typeof useMatchResults>[string] | undefined;
  onRequireLogin: () => void;
}) {
  const { date, time } = fmtSyria(match.kickoffUtc);
  const status = matchStatus(match.kickoffUtc, now);
  const pts = prediction?.points;
  const ptsColor =
    pts === 3 ? "text-[var(--gold)]" : pts === 1 ? "text-[var(--green)]" : pts === 0 ? "text-[var(--stadium-red)]" : "text-[var(--muted-foreground)]";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <StatusBadge status={status} hasResult={!!result} />
        <span className="text-[11px] font-bold text-[var(--gold)]">{match.id.startsWith('third') ? "تحديد المركز الثالث" : STAGE_LABEL[match.stage]}</span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-3xl">{match.homeFlag}</span>
          <span className="text-sm font-bold text-center truncate w-full">{match.homeNameAr}</span>
        </div>
        <div className="text-center">
          <div className="font-[var(--font-display)] text-lg font-bold text-[var(--foreground)]">{time}</div>
          <div className="text-[10px] text-[var(--text-3)] mt-0.5">{date}</div>
        </div>
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-3xl">{match.awayFlag}</span>
          <span className="text-sm font-bold text-center truncate w-full">{match.awayNameAr}</span>
        </div>
      </div>

      {result && (
        <>
          <ScoreRow label="النتيجة النهائية" home={result.home_score} away={result.away_score} tone="gold" />
          {result.home_score === result.away_score && result.advance_pick && (
            <div className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
              المتأهّل:{" "}
              <span className="font-bold text-[var(--gold)]">
                {result.advance_pick === "home" ? match.homeNameAr : match.awayNameAr}
              </span>
            </div>
          )}
          {result.highlights_url && (
            <a
              href={result.highlights_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-[var(--gold)] border border-[var(--gold)]/40 hover:bg-[var(--gold-soft)] rounded-lg py-2 transition-colors"
            >
              <span>▶</span>
              <span>مشاهدة ملخص المباراة</span>
            </a>
          )}
        </>
      )}

      {prediction && (
        <>
          <ScoreRow label="توقعك" home={prediction.home_score} away={prediction.away_score} tone="muted" />
          {prediction.home_score === prediction.away_score && prediction.advance_pick && (
            <div className="mt-1 text-center text-[11px] text-[var(--muted-foreground)]">
              توقعت تأهّل:{" "}
              <span className="font-bold">
                {prediction.advance_pick === "home" ? match.homeNameAr : match.awayNameAr}
              </span>
            </div>
          )}
          {result && pts != null && (
            <div className={`text-center mt-2 font-[var(--font-display)] text-base font-bold tracking-wider ${ptsColor}`}>
              {pts} {pts === 1 ? "نقطة" : "نقاط"}
            </div>
          )}
        </>
      )}


      <PredictionBox
        match={match}
        userId={userId}
        prediction={prediction}
        result={result}
        now={now}
        onRequireLogin={onRequireLogin}
      />
    </div>
  );
}

/* ---------- Icons (inline SVG) ---------- */
const IconBall = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2l3 4.5-1.5 5-3 0-1.5-5z" />
    <path d="M4 9l4.5 1.5M19.5 9l-4.5 1.5M7 20l1.5-4.5M17 20l-1.5-4.5" />
  </svg>
);
const IconCrown = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7l4 5 5-8 5 8 4-5v11H3z" />
    <path d="M3 20h18" />
  </svg>
);
const IconChart = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="6" />
    <rect x="12" y="8" width="3" height="10" />
    <rect x="17" y="4" width="3" height="14" />
  </svg>
);
const IconSearch = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);
const IconClose = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

function Index() {
  const [screen, setScreen] = useState<Screen>("home");
  const [statsTab, setStatsTab] = useState<StatsTab>("scorers");
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  const now = useNow(1000);
  const { profile, loading } = useCurrentUser();
  const results = useMatchResults();
  const { predictions } = useMyPredictions(profile?.id ?? null);

  // Default selected round: first non-done round, else last round.
  const initialRound = useMemo<Match["stage"]>(() => {
    for (const r of ROUNDS) {
      const st = roundStatus(r.key, new Date());
      if (st !== "done") return r.key;
    }
    return ROUNDS[ROUNDS.length - 1].key;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedRound, setSelectedRound] = useState<Match["stage"]>(initialRound);

  // Push prompt (unchanged logic)
  useEffect(() => {
    if (!profile) return;
    if (!pushSupported()) return;
    if (pushPermissionState() !== "default") return;
    let dismissed = false;
    try { dismissed = localStorage.getItem("moaid_push_dismissed") === "1"; } catch {}
    if (dismissed) return;
    const t = setTimeout(() => setShowPushPrompt(true), 1500);
    return () => clearTimeout(t);
  }, [profile]);

  const dismissPushPrompt = (persist: boolean) => {
    setShowPushPrompt(false);
    if (persist) { try { localStorage.setItem("moaid_push_dismissed", "1"); } catch {} }
  };
  const enablePush = async () => {
    if (!profile) return;
    setPushBusy(true);
    await enablePushNotifications(profile.id);
    setPushBusy(false);
    dismissPushPrompt(true);
  };

  const allMatches = useMemo(() => {
    return [...MATCHES].sort((a, b) => +new Date(a.kickoffUtc) - +new Date(b.kickoffUtc));
  }, []);

  const liveMatch = useMemo(
    () => allMatches.find((m) => matchStatus(m.kickoffUtc, now) === "live") ?? null,
    [allMatches, now]
  );
  const nextMatch = useMemo(
    () => allMatches.find((m) => matchStatus(m.kickoffUtc, now) === "upcoming") ?? null,
    [allMatches, now]
  );

  const myTotal = useMemo(() => {
    let t = profile?.bonus_points ?? 0;
    Object.values(predictions).forEach((p) => { if (p.points != null) t += p.points; });
    return t;
  }, [predictions, profile?.bonus_points]);

  // Matches for currently selected round in Home
  const roundMatches = useMemo(
    () => allMatches
      .filter((m) => m.stage === selectedRound)
      .sort((a, b) => {
        // upcoming/live first, finished at bottom, each chronological
        const sa = matchStatus(a.kickoffUtc, now) === "finished" ? 1 : 0;
        const sb = matchStatus(b.kickoffUtc, now) === "finished" ? 1 : 0;
        if (sa !== sb) return sa - sb;
        return +new Date(a.kickoffUtc) - +new Date(b.kickoffUtc);
      }),
    [allMatches, selectedRound, now]
  );

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allMatches.filter((m) =>
      [m.homeName, m.awayName, m.homeNameAr, m.awayNameAr].some((n) => n.toLowerCase().includes(q))
    );
  }, [allMatches, query]);

  return (
    <>
      <SplashScreen />
      {showGate && <UsernameGate onDone={() => setShowGate(false)} />}
      {showAdmin && profile?.is_admin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {showPushPrompt && profile && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] bg-[var(--card)] border border-[var(--gold)]/40 rounded-2xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔔</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[var(--gold)] mb-1">فعّل الإشعارات</div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                ذكّرك قبل كل مباراة بساعة وأخبرك بنقاطك فور احتساب النتيجة.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={enablePush} disabled={pushBusy}
                  className="bg-[var(--gold)] text-[var(--primary-foreground)] px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50">
                  {pushBusy ? "..." : "تفعيل"}
                </button>
                <button onClick={() => dismissPushPrompt(true)}
                  className="border border-[var(--border)] text-[var(--muted-foreground)] px-3 py-1.5 rounded-lg text-xs">
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search overlay */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-[var(--background)]/95 backdrop-blur-sm">
          <div className="mx-auto max-w-[480px] p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)]">
                  <IconSearch className="w-4 h-4" />
                </span>
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن منتخب…"
                  className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] placeholder:text-[var(--text-3)]"
                />
              </div>
              <button
                onClick={() => { setShowSearch(false); setQuery(""); }}
                className="h-11 w-11 grid place-items-center rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"
                aria-label="إغلاق"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 max-h-[75vh] overflow-y-auto no-scrollbar pb-8">
              {!query.trim() ? (
                <div className="text-center text-[var(--text-3)] py-12 text-sm">اكتب اسم منتخب للبحث.</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center text-[var(--text-3)] py-12 text-sm">لا توجد نتائج.</div>
              ) : (
                searchResults.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    now={now}
                    userId={profile?.id ?? null}
                    prediction={predictions[m.id]}
                    result={results[m.id]}
                    onRequireLogin={() => setShowGate(true)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="app-shell bg-[var(--background)] text-[var(--foreground)]">
        <div className="content-area">
          <div className="mx-auto max-w-[480px] flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom))]">
          {/* Top bar */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0">
              <h1 className="font-extrabold text-lg text-[var(--foreground)] truncate">موعد</h1>
              <p className="text-[10px] font-[var(--font-display)] text-[var(--text-3)] tracking-widest">
                WORLD CUP · 2026
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSearch(true)}
                className="h-10 w-10 grid place-items-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--gold)] hover:border-[var(--gold)] transition-colors"
                aria-label="بحث"
              >
                <IconSearch className="w-4 h-4" />
              </button>
              {!loading && (
                profile ? (
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--gold)] transition-colors"
                  >
                    <span className="text-xs font-bold truncate max-w-[80px]">{profile.username}</span>
                    <span className="text-[10px] font-[var(--font-display)] font-bold text-[var(--gold)]">{myTotal}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowGate(true)}
                    className="h-10 px-4 rounded-xl border border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)] text-xs font-bold"
                  >
                    دخول
                  </button>
                )
              )}
            </div>
          </header>

          {menuOpen && profile && (
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between text-xs">
              <div>
                <div className="text-[var(--muted-foreground)]">مجموع نقاطك</div>
                <div className="font-[var(--font-display)] text-lg font-bold text-[var(--gold)]">{myTotal}</div>
              </div>
              <div className="flex gap-2">
                {profile.is_admin && (
                  <button onClick={() => { setShowAdmin(true); setMenuOpen(false); }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--gold-soft)] text-[var(--gold)] text-xs font-bold">
                    المشرف
                  </button>
                )}
                <button onClick={async () => { await signOut(); setMenuOpen(false); }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] text-xs">
                  خروج
                </button>
              </div>
            </div>
          )}

          {/* Screens */}
          <div className="flex-1 px-4 py-4">
            {screen === "home" && (
              <div key="home" className="tab-enter flex flex-col gap-5">
                {liveMatch ? (
                  <LiveHero match={liveMatch} result={results[liveMatch.id]} />
                ) : (
                  <CountdownCard target={nextMatch} />
                )}

                <RoundStepper now={now} selected={selectedRound} onSelect={setSelectedRound} />

                <div className="flex flex-col gap-3">
                  {roundMatches.length === 0 ? (
                    <div className="text-center text-[var(--text-3)] text-xs py-6 px-4 rounded-xl bg-[var(--card)] border border-dashed border-[var(--border)]">
                      لا توجد مباريات في هذا الدور بعد
                    </div>
                  ) : (
                    roundMatches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        now={now}
                        userId={profile?.id ?? null}
                        prediction={predictions[m.id]}
                        result={results[m.id]}
                        onRequireLogin={() => setShowGate(true)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {screen === "leaderboard" && (
              <div key="lb" className="tab-enter">
                <Leaderboard currentUserId={profile?.id ?? null} />
              </div>
            )}

            {screen === "stats" && (
              <div key="stats" className="tab-enter flex flex-col gap-4">
                <div className="flex bg-[var(--card)] border border-[var(--border)] rounded-2xl p-1">
                  {([
                    { key: "scorers", label: "الهدافون" },
                    { key: "bracket", label: "مخطط كأس العالم" },
                  ] as { key: StatsTab; label: string }[]).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setStatsTab(t.key)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        statsTab === t.key
                          ? "bg-[var(--gold)] text-[var(--primary-foreground)]"
                          : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {statsTab === "scorers" ? (
                  <ScorersView isAdmin={!!profile?.is_admin} />
                ) : (
                  <BracketView isAdmin={!!profile?.is_admin} />
                )}
              </div>
            )}
          </div>

          <footer className="px-4 py-3 text-center text-[10px] text-[var(--text-3)] space-y-1">
            <div>جميع التوقيتات بتوقيت دمشق (UTC+3)</div>
            <div>3 نقاط للنتيجة الدقيقة · 1 للفائز الصحيح · 0 للخطأ</div>
          </footer>
          </div>
        </div>

        {/* Bottom nav */}
        <nav className="bottom-nav border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur">
          <div className="mx-auto max-w-[480px] flex px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {([
              { key: "home", label: "الرئيسية", Icon: IconBall },
              { key: "leaderboard", label: "المتصدرون", Icon: IconCrown },
              { key: "stats", label: "الإحصائيات", Icon: IconChart },
            ] as { key: Screen; label: string; Icon: typeof IconBall }[]).map((n) => {
              const active = screen === n.key;
              return (
                <button
                  key={n.key}
                  onClick={() => setScreen(n.key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                    active ? "text-[var(--gold)]" : "text-[var(--text-3)]"
                  }`}
                >
                  <n.Icon className="w-5 h-5" />
                  <span className="text-[10px] font-bold">{n.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

    </>
  );
}
