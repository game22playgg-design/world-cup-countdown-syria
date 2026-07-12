import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MATCHES } from "@/lib/wc2026-data";

type DB = SupabaseClient<Database>;

// ============================================================
// Team name normalization: API-Football sometimes uses different
// English spellings than ours. Map both sides to a canonical key.
// ============================================================
const TEAM_ALIASES: Record<string, string> = {
  "usa": "united states",
  "united states of america": "united states",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "iran": "iran",
  "ir iran": "iran",
  "côte d'ivoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  "czechia": "czech republic",
  "türkiye": "turkey",
  "bosnia & herzegovina": "bosnia and herzegovina",
  "cabo verde": "cape verde",
  "dr congo": "dr congo",
  "congo dr": "dr congo",
  "great britain": "england",
  "united kingdom": "england",
};
function normTeam(name: string): string {
  const n = name.trim().toLowerCase().replace(/\./g, "");
  return TEAM_ALIASES[n] ?? n;
}
function pairKey(a: string, b: string): string {
  return [normTeam(a), normTeam(b)].sort().join("|");
}

// Nationality (English) -> Arabic name + flag emoji
const F = (a: string, b: string) =>
  String.fromCodePoint(0x1f1e6 + a.charCodeAt(0) - 65, 0x1f1e6 + b.charCodeAt(0) - 65);
const COUNTRIES_AR: Record<string, { ar: string; flag: string }> = {
  "argentina": { ar: "الأرجنتين", flag: F("A", "R") },
  "france": { ar: "فرنسا", flag: F("F", "R") },
  "spain": { ar: "إسبانيا", flag: F("E", "S") },
  "england": { ar: "إنكلترا", flag: F("G", "B") },
  "brazil": { ar: "البرازيل", flag: F("B", "R") },
  "germany": { ar: "ألمانيا", flag: F("D", "E") },
  "portugal": { ar: "البرتغال", flag: F("P", "T") },
  "netherlands": { ar: "هولندا", flag: F("N", "L") },
  "belgium": { ar: "بلجيكا", flag: F("B", "E") },
  "morocco": { ar: "المغرب", flag: F("M", "A") },
  "norway": { ar: "النرويج", flag: F("N", "O") },
  "switzerland": { ar: "سويسرا", flag: F("C", "H") },
  "croatia": { ar: "كرواتيا", flag: F("H", "R") },
  "japan": { ar: "اليابان", flag: F("J", "P") },
  "south korea": { ar: "كوريا الجنوبية", flag: F("K", "R") },
  "mexico": { ar: "المكسيك", flag: F("M", "X") },
  "united states": { ar: "الولايات المتحدة", flag: F("U", "S") },
  "canada": { ar: "كندا", flag: F("C", "A") },
  "colombia": { ar: "كولومبيا", flag: F("C", "O") },
  "ecuador": { ar: "الإكوادور", flag: F("E", "C") },
  "uruguay": { ar: "الأوروغواي", flag: F("U", "Y") },
  "senegal": { ar: "السنغال", flag: F("S", "N") },
  "ivory coast": { ar: "كوت ديفوار", flag: F("C", "I") },
  "egypt": { ar: "مصر", flag: F("E", "G") },
  "algeria": { ar: "الجزائر", flag: F("D", "Z") },
  "ghana": { ar: "غانا", flag: F("G", "H") },
  "cape verde": { ar: "الرأس الأخضر", flag: F("C", "V") },
  "dr congo": { ar: "الكونغو الديمقراطية", flag: F("C", "D") },
  "south africa": { ar: "جنوب أفريقيا", flag: F("Z", "A") },
  "australia": { ar: "أستراليا", flag: F("A", "U") },
  "sweden": { ar: "السويد", flag: F("S", "E") },
  "austria": { ar: "النمسا", flag: F("A", "T") },
  "paraguay": { ar: "باراغواي", flag: F("P", "Y") },
  "bosnia and herzegovina": { ar: "البوسنة والهرسك", flag: F("B", "A") },
  "italy": { ar: "إيطاليا", flag: F("I", "T") },
  "poland": { ar: "بولندا", flag: F("P", "L") },
  "denmark": { ar: "الدنمارك", flag: F("D", "K") },
  "serbia": { ar: "صربيا", flag: F("R", "S") },
  "turkey": { ar: "تركيا", flag: F("T", "R") },
  "nigeria": { ar: "نيجيريا", flag: F("N", "G") },
  "cameroon": { ar: "الكاميرون", flag: F("C", "M") },
  "tunisia": { ar: "تونس", flag: F("T", "N") },
};

// ============================================================
// API-Football (RapidAPI) — World Cup league id = 1
// ============================================================
const API_BASE = "https://api-football-v1.p.rapidapi.com/v3";
const LEAGUE_ID = 1;
const SEASON = 2026;

async function apiGet(path: string, apiKey: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API-Football ${path} failed [${res.status}]: ${body}`);
  }
  return res.json();
}

interface SyncResult {
  fixtures_fetched: number;
  results_upserted: number;
  scorers_upserted: number;
  unmatched: string[];
  errors: string[];
}

async function syncFixtures(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
): Promise<Pick<SyncResult, "fixtures_fetched" | "results_upserted" | "unmatched" | "errors">> {
  const errors: string[] = [];
  const unmatched: string[] = [];
  let upserted = 0;

  const data = await apiGet(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`, apiKey);
  const fixtures: any[] = data?.response ?? [];

  // Build lookup: pair key -> our match id (with team-order preservation).
  const matchByPair = new Map<string, { id: string; homeNorm: string }>();
  for (const m of MATCHES) {
    if (m.homeName === "TBD" || m.awayName === "TBD") continue;
    matchByPair.set(pairKey(m.homeName, m.awayName), {
      id: m.id,
      homeNorm: normTeam(m.homeName),
    });
  }

  const FINISHED = new Set(["FT", "AET", "PEN"]);

  for (const f of fixtures) {
    const status: string = f?.fixture?.status?.short ?? "";
    if (!FINISHED.has(status)) continue;

    const homeApi: string = f?.teams?.home?.name ?? "";
    const awayApi: string = f?.teams?.away?.name ?? "";
    if (!homeApi || !awayApi) continue;

    const goalsHome: number | null = f?.goals?.home ?? null;
    const goalsAway: number | null = f?.goals?.away ?? null;
    if (goalsHome == null || goalsAway == null) continue;

    const key = pairKey(homeApi, awayApi);
    const our = matchByPair.get(key);
    if (!our) {
      unmatched.push(`${homeApi} vs ${awayApi}`);
      continue;
    }

    // Align to our home/away ordering.
    const apiHomeIsOurHome = normTeam(homeApi) === our.homeNorm;
    const home = apiHomeIsOurHome ? goalsHome : goalsAway;
    const away = apiHomeIsOurHome ? goalsAway : goalsHome;

    // Advance pick: penalty winner if draw, else null.
    let advance_pick: "home" | "away" | null = null;
    if (home === away) {
      const winnerId = f?.teams?.home?.winner
        ? f?.teams?.home?.id
        : f?.teams?.away?.winner
        ? f?.teams?.away?.id
        : null;
      if (winnerId != null) {
        const homeId = f?.teams?.home?.id;
        const apiWinnerIsHome = winnerId === homeId;
        // Convert to our ordering.
        advance_pick = apiWinnerIsHome === apiHomeIsOurHome ? "home" : "away";
      }
    }

    const { error } = await supabase.from("match_results").upsert(
      {
        match_id: our.id,
        home_score: home,
        away_score: away,
        advance_pick,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "match_id" },
    );
    if (error) errors.push(`upsert ${our.id}: ${error.message}`);
    else upserted++;
  }

  return { fixtures_fetched: fixtures.length, results_upserted: upserted, unmatched, errors };
}

async function syncTopScorers(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
): Promise<{ scorers_upserted: number; errors: string[] }> {
  const errors: string[] = [];
  const data = await apiGet(`/players/topscorers?league=${LEAGUE_ID}&season=${SEASON}`, apiKey);
  const list: any[] = data?.response ?? [];

  let upserted = 0;
  const top = list.slice(0, 20);

  // Remove auto-managed rows that dropped out of the top list.
  const currentNames = top.map((r) => r?.player?.name).filter(Boolean);
  if (currentNames.length > 0) {
    const { error: delErr } = await supabase
      .from("top_scorers")
      .delete()
      .not("name_en", "is", null)
      .not("name_en", "in", `(${currentNames.map((n) => `"${n.replace(/"/g, "")}"`).join(",")})`);
    if (delErr) errors.push(`cleanup: ${delErr.message}`);
  }

  for (const row of top) {
    const nameEn: string = row?.player?.name ?? "";
    const photo: string | null = row?.player?.photo ?? null;
    const nationality: string = (row?.player?.nationality ?? "").toString();
    const goals: number = row?.statistics?.[0]?.goals?.total ?? 0;
    if (!nameEn || !goals) continue;

    const natKey = normTeam(nationality);
    const arInfo = COUNTRIES_AR[natKey];

    const { error } = await supabase.from("top_scorers").upsert(
      {
        name_en: nameEn,
        name_ar: nameEn, // fallback; admin can override manually
        country_ar: arInfo?.ar ?? nationality,
        country_flag: arInfo?.flag ?? null,
        goals,
        photo_url: photo,
      },
      { onConflict: "name_en" },
    );
    if (error) errors.push(`scorer ${nameEn}: ${error.message}`);
    else upserted++;
  }

  return { scorers_upserted: upserted, errors };
}

export const Route = createFileRoute("/api/public/hooks/sync-football")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require the Supabase anon apikey header (pg_cron sets it).
        const url = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const rapidKey = process.env.RAPIDAPI_KEY;

        if (!url || !anonKey || !serviceKey) {
          return new Response(JSON.stringify({ error: "Supabase env missing" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        if (!rapidKey) {
          return new Response(JSON.stringify({ error: "RAPIDAPI_KEY not configured" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }

        const caller = request.headers.get("apikey");
        if (caller !== anonKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const result: SyncResult = {
          fixtures_fetched: 0,
          results_upserted: 0,
          scorers_upserted: 0,
          unmatched: [],
          errors: [],
        };

        try {
          const fx = await syncFixtures(supabase, rapidKey);
          result.fixtures_fetched = fx.fixtures_fetched;
          result.results_upserted = fx.results_upserted;
          result.unmatched = fx.unmatched;
          result.errors.push(...fx.errors);
        } catch (e: any) {
          result.errors.push(`fixtures: ${e?.message ?? e}`);
        }

        try {
          const sc = await syncTopScorers(supabase, rapidKey);
          result.scorers_upserted = sc.scorers_upserted;
          result.errors.push(...sc.errors);
        } catch (e: any) {
          result.errors.push(`scorers: ${e?.message ?? e}`);
        }

        return new Response(
          JSON.stringify({ ok: result.errors.length === 0, ...result }, null, 2),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      },
    },
  },
});
