import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MATCHES, type Match } from "./wc2026-data";

export async function fetchUserPredictions(userId: string): Promise<Prediction[]> {
  const { data } = await supabase
    .from("predictions")
    .select("match_id, home_score, away_score, points, locked_at")
    .eq("user_id", userId);
  return (data ?? []) as Prediction[];
}


export interface Prediction {
  match_id: string;
  home_score: number;
  away_score: number;
  points: number | null;
  locked_at: string;
}
export interface MatchResult {
  match_id: string;
  home_score: number;
  away_score: number;
  highlights_url?: string | null;
}
export interface LeaderboardRow {
  user_id: string;
  username: string;
  total_points: number;
  exact_count: number;
  finished_count: number;
  per_round: Record<string, number>;
}

export function useMatchResults() {
  const [results, setResults] = useState<Record<string, MatchResult>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("match_results").select("match_id, home_score, away_score, highlights_url");
      const map: Record<string, MatchResult> = {};
      (data ?? []).forEach((r) => (map[r.match_id] = r as MatchResult));
      setResults(map);
    };
    load();
    const ch = supabase
      .channel(`match_results_ch_${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_results" }, load)
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return results;
}

export function useMyPredictions(userId: string | null) {
  const [preds, setPreds] = useState<Record<string, Prediction>>({});

  const load = useCallback(async () => {
    if (!userId) return setPreds({});
    const { data } = await supabase
      .from("predictions")
      .select("match_id, home_score, away_score, points, locked_at")
      .eq("user_id", userId);
    const map: Record<string, Prediction> = {};
    (data ?? []).forEach((p) => (map[p.match_id] = p as Prediction));
    setPreds(map);
  }, [userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    const ch = supabase
      .channel(`predictions_ch_${userId}_${Math.random().toString(36).slice(2)}`)

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions", filter: `user_id=eq.${userId}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, load]);

  return { predictions: preds, reload: load };
}

export async function submitPrediction(
  userId: string,
  matchId: string,
  home: number,
  away: number,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("predictions").insert({
    user_id: userId,
    match_id: matchId,
    home_score: home,
    away_score: away,
  });
  if (error) return { error: error.message.includes("duplicate") ? "التوقع مُسجّل مسبقاً" : "تعذّر الحفظ" };
  return {};
}

export async function upsertMatchResult(matchId: string, home: number, away: number) {
  const { error } = await supabase.from("match_results").upsert({
    match_id: matchId,
    home_score: home,
    away_score: away,
    updated_at: new Date().toISOString(),
  });
  return { error: error?.message };
}

export async function setHighlightsUrl(matchId: string, url: string | null) {
  const { error } = await supabase
    .from("match_results")
    .update({ highlights_url: url && url.trim() ? url.trim() : null })
    .eq("match_id", matchId);
  return { error: error?.message };
}

export async function deleteMatchResult(matchId: string) {
  const { error } = await supabase.from("match_results").delete().eq("match_id", matchId);
  return { error: error?.message };
}

export async function setUserBonusPoints(userId: string, bonus: number) {
  const { error } = await supabase.from("profiles").update({ bonus_points: bonus }).eq("id", userId);
  return { error: error?.message };
}

// Leaderboard: aggregate predictions per user + per round from all predictions
export function useLeaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    const stageByMatch: Record<string, Match["stage"]> = {};
    MATCHES.forEach((m) => (stageByMatch[m.id] = m.stage));

    const load = async () => {
      const [{ data: profiles }, { data: preds }] = await Promise.all([
        supabase.from("profiles").select("id, username, is_admin, bonus_points"),
        supabase.from("predictions").select("user_id, match_id, points"),
      ]);

      const byUser: Record<string, LeaderboardRow> = {};
      (profiles ?? []).forEach((p: any) => {
        // Exclude admins from the leaderboard entirely
        if (p.is_admin) return;
        byUser[p.id] = {
          user_id: p.id,
          username: p.username,
          total_points: p.bonus_points ?? 0,
          exact_count: 0,
          finished_count: 0,
          per_round: {},
        };
      });
      (preds ?? []).forEach((p) => {
        const row = byUser[p.user_id];
        if (!row) return;
        if (p.points == null) return;
        const stage = stageByMatch[p.match_id] ?? "r32";
        row.per_round[stage] = (row.per_round[stage] ?? 0) + p.points;
        row.total_points += p.points;
        row.finished_count += 1;
        if (p.points === 3) row.exact_count += 1;
      });

      const list = Object.values(byUser).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.exact_count - a.exact_count;
      });
      setRows(list);
    };

    load();
    const ch = supabase
      .channel("leaderboard_ch")
      .on("postgres_changes", { event: "*", schema: "public", table: "predictions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_results" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return rows;
}
