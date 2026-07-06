import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Scorer {
  id: string;
  name_ar: string;
  country_flag: string | null;
  country_ar: string | null;
  goals: number;
  photo_url: string | null;
}

export function useScorers() {
  const [scorers, setScorers] = useState<Scorer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("top_scorers")
        .select("id, name_ar, country_flag, country_ar, goals, photo_url")
        .order("goals", { ascending: false })
        .order("name_ar", { ascending: true });
      if (!mounted) return;
      setScorers((data as Scorer[]) ?? []);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("top_scorers_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "top_scorers" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return { scorers, loading };
}

export async function upsertScorer(s: Partial<Scorer> & { name_ar: string; goals: number }) {
  const payload = {
    ...(s.id ? { id: s.id } : {}),
    name_ar: s.name_ar,
    country_flag: s.country_flag?.trim() || null,
    country_ar: s.country_ar?.trim() || null,
    goals: s.goals,
    photo_url: s.photo_url?.trim() || null,
  };
  return supabase.from("top_scorers").upsert(payload);
}

export async function deleteScorer(id: string) {
  return supabase.from("top_scorers").delete().eq("id", id);
}
