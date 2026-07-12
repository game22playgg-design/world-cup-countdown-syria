import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { MATCHES } from "@/lib/wc2026-data";

type DB = SupabaseClient<Database>;

// ============================================================
// Team name normalization: Football-Data.org sometimes uses
// different English spellings than ours. Map both sides to a
// canonical key.
// ============================================================
const TEAM_ALIASES: Record<string, string> = {
  "usa": "united states",
  "united states of america": "united states",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "ir iran": "iran",
  "côte d'ivoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  "czechia": "czech republic",
  "türkiye": "turkey",
  "turkiye": "turkey",
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
  "iran": { ar: "إيران", flag: F("I", "R") },
};

// ============================================================
// Football-Data.org — Free tier
// Competition code for FIFA World Cup = "WC"
// Auth via X-Auth-Token header. 10 requests/min free.
// ============================================================
const API_BASE = "https://api.football-data.org/v4";
const COMPETITION = "WC";

async function apiGet(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "X-Auth-Token": token },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data ${path} [${res.status}]: ${body}`);
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
  supabase: DB,
  token: string,
): Promise<Pick<SyncResult, "fixtures_fetched" | "results_upserted" | "unmatched" | "errors">> {
  const errors: string[] = [];
  const unmatched: string[] = [];
  let upserted = 0;

  const data = await apiGet(`/competitions/${COMPETITION}/matches?status=FINISHED`, token);
  const fixtures: any[] = data?.matches ?? [];

  const matchByPair = new Map<string, { id: string; homeNorm: string }>();
  for (const m of MATCHES) {
    if (m.homeName === "TBD" || m.awayName === "TBD") continue;
    matchByPair.set(pairKey(m.homeName, m.awayName), {
      id: m.id,
      homeNorm: normTeam(m.homeName),
    });
  }

  for (const f of fixtures) {
    const homeApi: string = f?.homeTeam?.name ?? f?.homeTeam?.shortName ?? "";
    const awayApi: string = f?.awayTeam?.name ?? f?.awayTeam?.shortName ?? "";
    if (!homeApi || !awayApi) continue;

    // Full-time score (includes ET goals but excludes penalties per FD spec)
    const ft = f?.score?.fullTime ?? {};
    const et = f?.score?.extraTime ?? {};
    const pens = f?.score?.penalties ?? {};

    const goalsHome: number | null =
      et.home != null ? et.home : ft.home != null ? ft.home : null;
    const goalsAway: number | null =
      et.away != null ? et.away : ft.away != null ? ft.away : null;
    if (goalsHome == null || goalsAway == null) continue;

    const key = pairKey(homeApi, awayApi);
    const our = matchByPair.get(key);
    if (!our) {
      unmatched.push(`${homeApi} vs ${awayApi}`);
      continue;
    }

    const apiHomeIsOurHome = normTeam(homeApi) === our.homeNorm;
    const home = apiHomeIsOurHome ? goalsHome : goalsAway;
    const away = apiHomeIsOurHome ? goalsAway : goalsHome;

    // Advance pick from penalty winner (only meaningful when regulation+ET draw)
    let advance_pick: "home" | "away" | null = null;
    if (home === away) {
      const winnerSide: string | null = f?.score?.winner ?? null; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW"
      if (winnerSide === "HOME_TEAM" || winnerSide === "AWAY_TEAM") {
        const apiWinnerIsHome = winnerSide === "HOME_TEAM";
        advance_pick = apiWinnerIsHome === apiHomeIsOurHome ? "home" : "away";
      } else if (pens.home != null && pens.away != null && pens.home !== pens.away) {
        const apiWinnerIsHome = pens.home > pens.away;
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
  supabase: DB,
  token: string,
): Promise<{ scorers_upserted: number; errors: string[] }> {
  const errors: string[] = [];
  const data = await apiGet(`/competitions/${COMPETITION}/scorers?limit=20`, token);
  const list: any[] = data?.scorers ?? [];

  let upserted = 0;

  const currentNames = list.map((r) => r?.player?.name).filter(Boolean);
  if (currentNames.length > 0) {
    const { error: delErr } = await supabase
      .from("top_scorers")
      .delete()
      .not("name_en", "is", null)
      .not("name_en", "in", `(${currentNames.map((n) => `"${n.replace(/"/g, "")}"`).join(",")})`);
    if (delErr) errors.push(`cleanup: ${delErr.message}`);
  }

  for (const row of list) {
    const nameEn: string = row?.player?.name ?? "";
    const nationality: string = (row?.player?.nationality ?? row?.team?.name ?? "").toString();
    const goals: number = row?.goals ?? 0;
    if (!nameEn || !goals) continue;

    const natKey = normTeam(nationality);
    const arInfo = COUNTRIES_AR[natKey];

    const { error } = await supabase.from("top_scorers").upsert(
      {
        name_en: nameEn,
        name_ar: nameEn,
        country_ar: arInfo?.ar ?? nationality,
        country_flag: arInfo?.flag ?? null,
        goals,
        photo_url: null,
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
        const url = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const fdToken = process.env.FOOTBALL_DATA_TOKEN;

        if (!url || !anonKey || !serviceKey) {
          return new Response(JSON.stringify({ error: "Supabase env missing" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        if (!fdToken) {
          return new Response(
            JSON.stringify({ error: "FOOTBALL_DATA_TOKEN not configured" }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }

        const caller = request.headers.get("apikey");
        if (caller !== anonKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient<Database>(url, serviceKey, {
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
          const fx = await syncFixtures(supabase, fdToken);
          result.fixtures_fetched = fx.fixtures_fetched;
          result.results_upserted = fx.results_upserted;
          result.unmatched = fx.unmatched;
          result.errors.push(...fx.errors);
        } catch (e: any) {
          result.errors.push(`fixtures: ${e?.message ?? e}`);
        }

        try {
          const sc = await syncTopScorers(supabase, fdToken);
          result.scorers_upserted = sc.scorers_upserted;
          result.errors.push(...sc.errors);
        } catch (e: any) {
          result.errors.push(`scorers: ${e?.message ?? e}`);
        }

        return new Response(
          JSON.stringify({ ok: result.errors.length === 0, ...result }, null, 2),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      },
    },
  },
});
