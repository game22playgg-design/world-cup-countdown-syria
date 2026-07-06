import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MATCHES, CURRENT_ROUND_AR, CURRENT_ROUND_DATES_AR, type Match } from "@/lib/wc2026-data";
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

type TabKey = "today" | "round" | "r32" | "bracket" | "scorers" | "leaderboard" | "search";

const SYRIA_TZ = "Asia/Damascus";

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
  const time = `${hour}:${minute} ${period}`;
  return { date, time };
}

function isSameSyriaDay(iso: string, now: Date) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: SYRIA_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(new Date(iso)) === fmt.format(now);
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

function Countdown({ target }: { target: Match | null }) {
  const now = useNow(1000);
  if (!target) {
    return (
      <div className="text-center py-10 px-4">
        <div className="font-[var(--font-display)] text-2xl text-[var(--gold)]">انتهى هذا الدور</div>
        <div className="text-xs text-[var(--muted-foreground)] mt-2 font-mono">بانتظار جدول الدور القادم</div>
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

  return (
    <div className="relative px-4 pt-6 pb-8">
      <div className="absolute inset-0 bg-gradient-to-b from-[#C9A227]/8 via-transparent to-transparent pointer-events-none" />
      <div className="relative text-center">
        <div className="text-xs tracking-[0.3em] text-[var(--muted-foreground)] font-mono mb-3">
          المباراة القادمة • بتوقيت دمشق
        </div>
        <div dir="ltr" className="flex items-center justify-center gap-1 sm:gap-2 select-none">
          {[
            { v: pad(d), label: "يوم" },
            { v: pad(h), label: "ساعة" },
            { v: pad(m), label: "دقيقة" },
            { v: pad(s), label: "ثانية" },
          ].map((seg, i) => (
            <div key={i} className="flex items-end">
              <div className="flex flex-col items-center">
                <div className="countdown-digit text-5xl sm:text-6xl font-bold leading-none tracking-tight">
                  {seg.v}
                </div>
                <div className="text-[10px] mt-2 text-[var(--muted-foreground)] font-mono uppercase tracking-widest">
                  {seg.label}
                </div>
              </div>
              {i < 3 && (
                <div className="countdown-digit text-5xl sm:text-6xl font-bold leading-none px-1 pb-5 opacity-60">:</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <span className="text-4xl">{target.homeFlag}</span>
            <span className="text-sm font-bold truncate w-full">{target.homeNameAr}</span>
          </div>
          <div className="text-[var(--stadium-red)] font-[var(--font-display)] text-2xl">VS</div>
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <span className="text-4xl">{target.awayFlag}</span>
            <span className="text-sm font-bold truncate w-full">{target.awayNameAr}</span>
          </div>
        </div>

        <div className="mt-5 font-mono text-xs text-[var(--muted-foreground)]">
          {date} • {time}
        </div>
      </div>
    </div>
  );
}

function LiveHero({ match, result }: { match: Match; result: { home_score: number; away_score: number } | undefined }) {
  return (
    <div className="relative px-4 pt-6 pb-8">
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--stadium-red)]/15 via-transparent to-transparent pointer-events-none" />
      <div className="relative text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[var(--stadium-red)] animate-pulse" />
          <span className="text-xs tracking-[0.3em] text-[var(--stadium-red)] font-mono">مباراة جارية الآن</span>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <span className="text-5xl">{match.homeFlag}</span>
            <span className="text-sm font-bold truncate w-full">{match.homeNameAr}</span>
          </div>
          <div dir="ltr" className="font-mono font-bold text-5xl text-[var(--gold)] whitespace-nowrap">
            {result ? `${result.home_score} - ${result.away_score}` : "— : —"}
          </div>
          <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
            <span className="text-5xl">{match.awayFlag}</span>
            <span className="text-sm font-bold truncate w-full">{match.awayNameAr}</span>
          </div>
        </div>
        <div className="mt-4 text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest">
          {STAGE_LABEL[match.stage]}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, hasResult }: { status: "upcoming" | "live" | "finished"; hasResult: boolean }) {
  const map = {
    upcoming: { label: "قادمة", cls: "bg-[var(--secondary)] text-[var(--muted-foreground)]" },
    live:     { label: "جارية", cls: "bg-[var(--stadium-red)] text-white animate-pulse" },
    finished: { label: hasResult ? "انتهت" : "بانتظار النتيجة", cls: "bg-transparent border border-[var(--border)] text-[var(--muted-foreground)]" },
  } as const;
  const s = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${s.cls}`}>{s.label}</span>;
}

const STAGE_LABEL: Record<Match["stage"], string> = {
  r32: "دور الـ32",
  r16: "ثمن النهائي",
  qf: "ربع النهائي",
  sf: "نصف النهائي",
  final: "النهائي",
};

/** Two-team score row aligned under each flag/name. Used for Final Result & Your Prediction. */
function ScoreRow({
  label, home, away, tone,
}: {
  label: string;
  home: number;
  away: number;
  tone: "gold" | "muted";
}) {
  const color = tone === "gold" ? "text-[var(--gold)]" : "text-[var(--foreground)]";
  const bg = tone === "gold" ? "bg-[var(--gold)]/8 border-[var(--gold)]/30" : "bg-[var(--background)] border-[var(--border)]";
  return (
    <div className={`mt-3 rounded-lg border ${bg} px-3 py-2`}>
      <div className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted-foreground)] text-center mb-1">
        {label}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className={`text-center font-mono font-bold text-2xl ${color}`}>{home}</div>
        <div className="text-[var(--muted-foreground)] font-bold">-</div>
        <div className={`text-center font-mono font-bold text-2xl ${color}`}>{away}</div>
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
    pts === 3 ? "text-[var(--gold)]" : pts === 1 ? "text-[#86ac6f]" : pts === 0 ? "text-[var(--stadium-red)]" : "text-[var(--muted-foreground)]";

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono tracking-widest text-[var(--gold)] uppercase">{STAGE_LABEL[match.stage]}</span>
        <StatusBadge status={status} hasResult={!!result} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-3xl">{match.homeFlag}</span>
          <span className="text-sm font-bold text-center truncate w-full">{match.homeNameAr}</span>
        </div>
        <div className="font-mono text-center">
          <div className="text-lg font-bold text-[var(--foreground)]">{time}</div>
          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{date}</div>
        </div>
        <div className="flex flex-col items-center gap-1 min-w-0">
          <span className="text-3xl">{match.awayFlag}</span>
          <span className="text-sm font-bold text-center truncate w-full">{match.awayNameAr}</span>
        </div>
      </div>

      {/* Final result block — replaces stadium line */}
      {result && (
        <>
          <ScoreRow label="النتيجة النهائية" home={result.home_score} away={result.away_score} tone="gold" />
          {result.highlights_url && (
            <a
              href={result.highlights_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-2 text-xs font-bold text-[var(--gold)] border border-[var(--gold)]/40 hover:bg-[var(--gold)]/10 rounded-lg py-2 transition-colors"
            >
              <span>▶</span>
              <span>مشاهدة ملخص المباراة</span>
            </a>
          )}
        </>
      )}

      {/* Your prediction (only when it exists — otherwise PredictionBox handles input/CTA) */}
      {prediction && (
        <>
          <ScoreRow label="توقعك" home={prediction.home_score} away={prediction.away_score} tone="muted" />
          {result && pts != null && (
            <div className={`text-center mt-2 font-[var(--font-display)] text-base tracking-wider ${ptsColor}`}>
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


function Index() {
  const [tab, setTab] = useState<TabKey>("round");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showGate, setShowGate] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const now = useNow(1000);
  const { profile, loading } = useCurrentUser();
  const results = useMatchResults();
  const { predictions } = useMyPredictions(profile?.id ?? null);

  // After login, offer to enable browser push notifications (only once per browser).
  useEffect(() => {
    if (!profile) return;
    if (!pushSupported()) return;
    const state = pushPermissionState();
    if (state !== "default") return;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem("moaid_push_dismissed") === "1";
    } catch {}
    if (dismissed) return;
    const t = setTimeout(() => setShowPushPrompt(true), 1500);
    return () => clearTimeout(t);
  }, [profile]);

  const dismissPushPrompt = (persist: boolean) => {
    setShowPushPrompt(false);
    if (persist) {
      try { localStorage.setItem("moaid_push_dismissed", "1"); } catch {}
    }
  };

  const enablePush = async () => {
    if (!profile) return;
    setPushBusy(true);
    const res = await enablePushNotifications(profile.id);
    setPushBusy(false);
    dismissPushPrompt(true);
    if (!res.ok && res.error) {
      // silent fail — user will just not receive notifications
      console.warn("push enable failed:", res.error);
    }
  };


  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // Sort: upcoming/live first (chronological), then finished at bottom (chronological).
  const allMatches = useMemo(() => {
    const byTime = [...MATCHES].sort((a, b) => +new Date(a.kickoffUtc) - +new Date(b.kickoffUtc));
    const active: Match[] = [];
    const done: Match[] = [];
    byTime.forEach((m) => {
      if (matchStatus(m.kickoffUtc, now) === "finished") done.push(m);
      else active.push(m);
    });
    return [...active, ...done];
  }, [now]);

  const liveMatch = useMemo(
    () => allMatches.find((m) => matchStatus(m.kickoffUtc, now) === "live") ?? null,
    [allMatches, now]
  );

  const nextMatch = useMemo(
    () => allMatches.find((m) => matchStatus(m.kickoffUtc, now) === "upcoming") ?? null,
    [allMatches, now]
  );

  // My points — sum of earned prediction points + admin-set bonus
  const myTotal = useMemo(() => {
    let t = profile?.bonus_points ?? 0;
    Object.values(predictions).forEach((p) => { if (p.points != null) t += p.points; });
    return t;
  }, [predictions, profile?.bonus_points]);

  const visible = useMemo(() => {
    if (tab === "today") return allMatches.filter((m) => isSameSyriaDay(m.kickoffUtc, now));
    if (tab === "round") return allMatches.filter((m) => m.stage === "r16");
    if (tab === "r32") return allMatches.filter((m) => m.stage === "r32");
    if (tab === "search") {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return allMatches.filter((m) =>
        [m.homeName, m.awayName, m.homeNameAr, m.awayNameAr].some((n) => n.toLowerCase().includes(q))
      );
    }
    return allMatches;
  }, [allMatches, tab, query, now]);


  const tabs: { key: TabKey; label: string }[] = [
    { key: "today",       label: "اليوم" },
    { key: "round",       label: CURRENT_ROUND_AR },
    { key: "r32",         label: "دور الـ32 (منتهي)" },
    { key: "bracket",     label: "المخطط" },
    { key: "scorers",     label: "الهدافون" },
    { key: "leaderboard", label: "المتصدرون" },
    { key: "search",      label: "بحث" },
  ];

  return (
    <>
      <SplashScreen />
      {showGate && <UsernameGate onDone={() => setShowGate(false)} />}
      {showAdmin && profile?.is_admin && <AdminPanel onClose={() => setShowAdmin(false)} />}
      {showPushPrompt && profile && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] bg-[var(--card)] border border-[var(--gold)]/40 rounded-2xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🔔</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[var(--gold)] mb-1">فعّل الإشعارات</div>
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                ذكّرك قبل كل مباراة بساعة وأخبرك بنقاطك فور احتساب النتيجة.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={enablePush}
                  disabled={pushBusy}
                  className="bg-[var(--gold)] text-[var(--primary-foreground)] px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {pushBusy ? "..." : "تفعيل"}
                </button>
                <button
                  onClick={() => dismissPushPrompt(true)}
                  className="border border-[var(--border)] text-[var(--muted-foreground)] px-3 py-1.5 rounded-lg text-xs"
                >
                  لاحقاً
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="mx-auto max-w-[480px] min-h-screen flex flex-col">
          {/* Top bar */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
            <div className="min-w-0">
              <h1 className="font-[var(--font-display)] tracking-wider text-xl text-[var(--foreground)] truncate">
                موعد
              </h1>
              <p className="text-[10px] font-mono text-[var(--muted-foreground)] tracking-widest">
                WORLD CUP · 2026 · {CURRENT_ROUND_DATES_AR}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* User status */}
              {!loading && (
                profile ? (
                  <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 h-9 px-3 rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--gold)] transition-colors"
                  >
                    <span className="text-xs font-bold truncate max-w-[80px]">{profile.username}</span>
                    <span className="text-[10px] font-mono text-[var(--gold)]">{myTotal}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowGate(true)}
                    className="h-9 px-3 rounded-full border border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)] text-xs font-bold"
                  >
                    دخول
                  </button>
                )
              )}
              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                className="h-9 w-9 grid place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--gold)] transition-colors"
                aria-label="تبديل الوضع"
              >
                {theme === "dark" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            </div>
          </header>

          {menuOpen && profile && (
            <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between text-xs">
              <div>
                <div className="text-[var(--muted-foreground)]">مجموع نقاطك</div>
                <div className="font-mono text-lg font-bold text-[var(--gold)]">{myTotal}</div>
              </div>
              <div className="flex gap-2">
                {profile.is_admin && (
                  <button onClick={() => { setShowAdmin(true); setMenuOpen(false); }}
                    className="px-3 py-1.5 rounded bg-[var(--gold)]/20 text-[var(--gold)] text-xs font-bold">
                    المشرف
                  </button>
                )}
                <button onClick={async () => { await signOut(); setMenuOpen(false); }}
                  className="px-3 py-1.5 rounded border border-[var(--border)] text-[var(--muted-foreground)] text-xs">
                  خروج
                </button>
              </div>
            </div>
          )}

          {/* Hero: live match takes precedence over countdown */}
          {liveMatch ? (
            <LiveHero match={liveMatch} result={results[liveMatch.id]} />
          ) : (
            <Countdown target={nextMatch} />
          )}


          {/* Tabs */}
          <nav className="px-3 sticky top-0 z-10 bg-[var(--background)]/95 backdrop-blur border-b border-[var(--border)]">
            <div className="flex gap-1 py-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-lg transition-colors ${
                    tab === t.key
                      ? "bg-[var(--gold)] text-[var(--primary-foreground)]"
                      : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </nav>

          {tab === "leaderboard" ? (
            <main key="lb" className="tab-enter flex-1 py-3">
              <Leaderboard currentUserId={profile?.id ?? null} />
            </main>
          ) : (
            <>
              {tab === "search" && (
                <div className="px-3 pt-3 tab-enter">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث عن منتخب (عربي أو إنجليزي)…"
                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[var(--gold)] placeholder:text-[var(--muted-foreground)]"
                  />
                </div>
              )}
              <main key={tab} className="px-3 py-4 flex flex-col gap-3 tab-enter flex-1">
                {tab === "r32" && (
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted-foreground)]">
                      هذا الدور <span className="text-[var(--gold)]">منتهي</span> — للاطلاع فقط
                    </span>
                  </div>
                )}
                {visible.length === 0 ? (
                  <div className="text-center text-[var(--muted-foreground)] py-12 text-sm">
                    {tab === "today"
                      ? "لا توجد مباريات اليوم."
                      : tab === "search" && !query
                      ? "اكتب اسم منتخب للبحث."
                      : "لا توجد مباريات."}
                  </div>
                ) : (
                  visible.map((m) => (
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
              </main>
            </>
          )}

          <footer className="px-4 py-5 text-center text-[10px] font-mono text-[var(--muted-foreground)] border-t border-[var(--border)] space-y-1">
            <div>جميع التوقيتات بتوقيت دمشق (UTC+3)</div>
            <div className="opacity-70">3 نقاط للنتيجة الدقيقة • 1 نقطة للفائز الصحيح • 0 للخطأ</div>
          </footer>
        </div>
      </div>
    </>
  );
}
