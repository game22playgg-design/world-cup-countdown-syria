import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MATCHES, CURRENT_ROUND_AR, CURRENT_ROUND_DATES_AR, type Match } from "@/lib/wc2026-data";
import SplashScreen from "@/components/SplashScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "موعد — مباريات كأس العالم 2026" },
      { name: "description", content: "جميع مباريات كأس العالم 2026 القادمة بتوقيت سوريا (UTC+3) مع عداد تنازلي مباشر." },
      { property: "og:title", content: "موعد — كأس العالم 2026" },
      { property: "og:description", content: "مواعيد كأس العالم 2026 بتوقيت سوريا." },
    ],
  }),
  component: Index,
});

type TabKey = "today" | "round" | "search";

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
        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
          {target.stadiumAr} — {target.cityAr}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "upcoming" | "live" | "finished" }) {
  const map = {
    upcoming: { label: "قادمة", cls: "bg-[var(--secondary)] text-[var(--muted-foreground)]" },
    live:     { label: "جارية", cls: "bg-[var(--stadium-red)] text-white animate-pulse" },
    finished: { label: "انتهت", cls: "bg-transparent border border-[var(--border)] text-[var(--muted-foreground)]" },
  } as const;
  const s = map[status];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${s.cls}`}>{s.label}</span>
  );
}

const STAGE_LABEL: Record<Match["stage"], string> = {
  r32: "دور الـ32",
  r16: "ثمن النهائي",
  qf: "ربع النهائي",
  sf: "نصف النهائي",
  final: "النهائي",
};

function MatchCard({ match, now }: { match: Match; now: Date }) {
  const { date, time } = fmtSyria(match.kickoffUtc);
  const status = matchStatus(match.kickoffUtc, now);

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono tracking-widest text-[var(--gold)] uppercase">{STAGE_LABEL[match.stage]}</span>
        <StatusBadge status={status} />
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

      <div className="mt-3 pt-3 border-t border-[var(--border)] text-[11px] text-[var(--muted-foreground)] text-center font-mono">
        {match.stadiumAr} • {match.cityAr}
      </div>
    </div>
  );
}

function Index() {
  const [tab, setTab] = useState<TabKey>("round");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const now = useNow(1000);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  // Hide finished matches everywhere (per user request).
  const upcoming = useMemo(() => {
    return [...MATCHES]
      .filter((m) => matchStatus(m.kickoffUtc, now) !== "finished")
      .sort((a, b) => +new Date(a.kickoffUtc) - +new Date(b.kickoffUtc));
  }, [now]);

  const nextMatch = useMemo(
    () => upcoming.find((m) => matchStatus(m.kickoffUtc, now) === "upcoming") ?? upcoming[0] ?? null,
    [upcoming, now]
  );

  const visible = useMemo(() => {
    if (tab === "today") return upcoming.filter((m) => isSameSyriaDay(m.kickoffUtc, now));
    if (tab === "search") {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return upcoming.filter((m) =>
        [m.homeName, m.awayName, m.homeNameAr, m.awayNameAr].some((n) => n.toLowerCase().includes(q))
      );
    }
    return upcoming;
  }, [upcoming, tab, query, now]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "today",  label: "اليوم" },
    { key: "round",  label: CURRENT_ROUND_AR },
    { key: "search", label: "بحث" },
  ];

  return (
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
          <button
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            className="shrink-0 h-9 w-9 grid place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--gold)] transition-colors"
            aria-label="تبديل الوضع"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
        </header>

        {/* Hero countdown */}
        <Countdown target={nextMatch} />

        {/* Tabs */}
        <nav className="px-3 sticky top-0 z-10 bg-[var(--background)]/95 backdrop-blur border-b border-[var(--border)]">
          <div className="flex gap-1 py-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-colors ${
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

        {/* Search */}
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

        {/* Match list */}
        <main key={tab} className="px-3 py-4 flex flex-col gap-3 tab-enter flex-1">
          {visible.length === 0 ? (
            <div className="text-center text-[var(--muted-foreground)] py-12 text-sm">
              {tab === "today"
                ? "لا توجد مباريات اليوم."
                : tab === "search" && !query
                ? "اكتب اسم منتخب للبحث."
                : "لا توجد مباريات قادمة."}
            </div>
          ) : (
            visible.map((m) => <MatchCard key={m.id} match={m} now={now} />)
          )}
        </main>

        <footer className="px-4 py-5 text-center text-[10px] font-mono text-[var(--muted-foreground)] border-t border-[var(--border)] space-y-1">
          <div>جميع التوقيتات بتوقيت دمشق (UTC+3)</div>
          <div className="opacity-70">سيتم تحديث الجدول بمباريات الدور القادم فور انتهاء {CURRENT_ROUND_AR}</div>
        </footer>
      </div>
    </div>
  );
}
