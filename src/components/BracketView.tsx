import { useMemo } from "react";
import { MATCHES, type Match } from "@/lib/wc2026-data";
import { useMatchResults, type MatchResult } from "@/lib/predictions";

// Bracket definition — R16 → Final only.
// Each "node" is a match slot. R16 slots reference a real match id from MATCHES.
// QF/SF/Final slots derive their two teams from the winners of the two feeder nodes.
type TeamRef = { flag: string; name_ar: string; name: string } | null;

type Node = {
  id: string;              // synthetic id for this slot
  matchId?: string;        // real match id if scheduled in MATCHES
  from?: [string, string]; // feeder node ids (previous round)
};

const R16_IDS = ["r16-1","r16-2","r16-3","r16-4","r16-5","r16-6","r16-7","r16-8"];

// QF pairings match the real qf-1..qf-4 fixtures already in wc2026-data.
const BRACKET: { key: string; label: string; nodes: Node[] }[] = [
  {
    key: "r16",
    label: "ثمن النهائي",
    nodes: R16_IDS.map((id) => ({ id, matchId: id })),
  },
  {
    key: "qf",
    label: "ربع النهائي",
    nodes: [
      { id: "qf-1", matchId: "qf-1", from: ["r16-1", "r16-2"] },
      { id: "qf-2", matchId: "qf-2", from: ["r16-5", "r16-6"] },
      { id: "qf-3", matchId: "qf-3", from: ["r16-3", "r16-4"] },
      { id: "qf-4", matchId: "qf-4", from: ["r16-7", "r16-8"] },
    ],
  },
  {
    key: "sf",
    label: "نصف النهائي",
    nodes: [
      { id: "sf-1", from: ["qf-1", "qf-3"] },
      { id: "sf-2", from: ["qf-2", "qf-4"] },
    ],
  },
  {
    key: "final",
    label: "النهائي",
    nodes: [{ id: "final-1", from: ["sf-1", "sf-2"] }],
  },
];

function teamFromMatch(side: "home" | "away", m: Match): TeamRef {
  return side === "home"
    ? { flag: m.homeFlag, name_ar: m.homeNameAr, name: m.homeName }
    : { flag: m.awayFlag, name_ar: m.awayNameAr, name: m.awayName };
}

export default function BracketView(_: { isAdmin: boolean }) {
  const results = useMatchResults();

  const matchById = useMemo(() => {
    const m: Record<string, Match> = {};
    MATCHES.forEach((x) => (m[x.id] = x));
    return m;
  }, []);

  // Compute teams for every node. Real fixtures already have both teams;
  // synthetic nodes derive them from feeder winners.
  const nodeTeams = useMemo(() => {
    const teams: Record<string, { home: TeamRef; away: TeamRef }> = {};

    const winnerOf = (nodeId: string): TeamRef => {
      // Real scheduled match: pull winner from results if available.
      const match = Object.values(matchById).find((m) => m.id === nodeId);
      if (match) {
        const r = results[nodeId];
        if (!r) return null;
        if (r.home_score > r.away_score) return teamFromMatch("home", match);
        if (r.away_score > r.home_score) return teamFromMatch("away", match);
        return null;
      }
      // Synthetic node — winner is derived from its own team pair + (future) result.
      // We don't yet have real match_results ids for sf/final so winner stays null.
      return null;
    };

    // Fill R16 (real matches).
    for (const id of R16_IDS) {
      const m = matchById[id];
      if (m) teams[id] = { home: teamFromMatch("home", m), away: teamFromMatch("away", m) };
    }

    // Fill QF: prefer the scheduled qf-* matches (real teams), else derive.
    for (const node of BRACKET[1].nodes) {
      const m = node.matchId ? matchById[node.matchId] : undefined;
      if (m) {
        teams[node.id] = { home: teamFromMatch("home", m), away: teamFromMatch("away", m) };
      } else if (node.from) {
        teams[node.id] = { home: winnerOf(node.from[0]), away: winnerOf(node.from[1]) };
      }
    }

    // SF & Final: derive from previous round winners.
    for (const node of BRACKET[2].nodes) {
      if (!node.from) continue;
      teams[node.id] = { home: winnerOf(node.from[0]), away: winnerOf(node.from[1]) };
    }
    for (const node of BRACKET[3].nodes) {
      if (!node.from) continue;
      teams[node.id] = { home: winnerOf(node.from[0]), away: winnerOf(node.from[1]) };
    }

    return teams;
  }, [matchById, results]);

  const champion: TeamRef = useMemo(() => {
    const finalNode = BRACKET[3].nodes[0];
    const finalMatchId = finalNode.matchId;
    const t = nodeTeams[finalNode.id];
    if (!t?.home || !t?.away) return null;
    // If a real final match result exists, use it; otherwise null.
    if (finalMatchId) {
      const r = results[finalMatchId];
      if (!r) return null;
      if (r.home_score > r.away_score) return t.home;
      if (r.away_score > r.home_score) return t.away;
    }
    return null;
  }, [nodeTeams, results]);

  return (
    <div className="px-2 py-3 flex flex-col gap-5">
      <div className="text-center">
        <div className="font-[var(--font-display)] text-2xl text-[var(--gold)] tracking-wider">
          مخطط كأس العالم
        </div>
        <div className="text-[10px] font-mono text-[var(--muted-foreground)] tracking-widest mt-1">
          FROM ROUND OF 16 TO THE CHAMPION
        </div>
      </div>

      {BRACKET.map((round) => (
        <div key={round.key}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--gold)]/40" />
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--gold)] px-2">
              {round.label}
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--gold)]/40" />
          </div>

          <div
            className={`grid gap-2 ${
              round.nodes.length >= 8 ? "grid-cols-2" :
              round.nodes.length >= 4 ? "grid-cols-2" :
              round.nodes.length >= 2 ? "grid-cols-2" :
                                        "grid-cols-1"
            }`}
          >
            {round.nodes.map((node) => {
              const pair = nodeTeams[node.id];
              const result = node.matchId ? results[node.matchId] : undefined;
              return (
                <MatchSlot
                  key={node.id}
                  home={pair?.home ?? null}
                  away={pair?.away ?? null}
                  result={result}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Champion cell */}
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--gold)]/40" />
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--gold)] px-2">
            البطل
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--gold)]/40" />
        </div>
        <div className="grid grid-cols-1">
          <ChampionCell team={champion} />
        </div>
      </div>
    </div>
  );
}

function MatchSlot({
  home, away, result,
}: {
  home: TeamRef;
  away: TeamRef;
  result?: MatchResult;
}) {
  const played = !!result;
  const homeWin = played && result!.home_score > result!.away_score;
  const awayWin = played && result!.away_score > result!.home_score;

  return (
    <div className="rounded-lg border border-[var(--gold)]/30 bg-[var(--card)] overflow-hidden">
      <TeamRow team={home} score={result?.home_score} winner={homeWin} loser={played && !homeWin && !awayWin ? false : played && awayWin} />
      <div className="h-px bg-[var(--border)]" />
      <TeamRow team={away} score={result?.away_score} winner={awayWin} loser={played && !awayWin && !homeWin ? false : played && homeWin} />
    </div>
  );
}

function TeamRow({
  team, score, winner, loser,
}: {
  team: TeamRef;
  score?: number;
  winner: boolean;
  loser: boolean;
}) {
  const empty = !team;
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 min-h-[34px] ${
        winner ? "bg-[var(--gold)]/15" : loser ? "opacity-50" : ""
      }`}
    >
      <span className="text-lg leading-none shrink-0">
        {empty ? "🏳️" : team!.flag}
      </span>
      <span
        className={`text-[11px] leading-tight truncate flex-1 ${
          winner ? "font-bold text-[var(--gold)]" : empty ? "text-[var(--muted-foreground)]" : "font-medium"
        }`}
      >
        {empty ? "—" : team!.name_ar}
      </span>
      {score != null && (
        <span
          dir="ltr"
          className={`font-mono text-xs shrink-0 ${winner ? "text-[var(--gold)] font-bold" : ""}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function ChampionCell({ team }: { team: TeamRef }) {
  return (
    <div className="rounded-xl border border-[var(--gold)] bg-gradient-to-br from-[var(--gold)]/25 to-[var(--gold)]/5 min-h-[80px] px-3 py-3 flex flex-col items-center justify-center gap-1">
      {team ? (
        <>
          <span className="text-4xl">{team.flag}</span>
          <span className="font-bold text-[var(--gold)] text-base">{team.name_ar}</span>
        </>
      ) : (
        <>
          <span className="text-3xl">🏆</span>
          <span className="text-[10px] font-mono text-[var(--muted-foreground)] tracking-widest">
            في انتظار البطل
          </span>
        </>
      )}
    </div>
  );
}
