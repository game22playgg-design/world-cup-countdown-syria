import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface BracketSlot {
  slot_id: string;
  flag: string | null;
  name_ar: string | null;
}

// Full knockout tree from R16 to Winner. Each round halves.
// r16: 16 slots (8 matches, 2 teams each) → qf: 8 → sf: 4 → f: 2 → w: 1
export const BRACKET_ROUNDS = [
  { key: "r16", label: "دور الـ16", slots: 16 },
  { key: "qf",  label: "ربع النهائي", slots: 8 },
  { key: "sf",  label: "نصف النهائي", slots: 4 },
  { key: "f",   label: "النهائي", slots: 2 },
  { key: "w",   label: "البطل", slots: 1 },
] as const;

export function slotId(round: string, idx: number) {
  return `${round}-${idx + 1}`;
}

export function useBracket() {
  const [slots, setSlots] = useState<Record<string, BracketSlot>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("bracket_slots").select("slot_id, flag, name_ar");
      if (!mounted || !data) return;
      const map: Record<string, BracketSlot> = {};
      data.forEach((r: any) => { map[r.slot_id] = r; });
      setSlots(map);
    };
    load();
    const ch = supabase
      .channel("bracket_slots_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "bracket_slots" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return slots;
}

export async function saveBracketSlot(slot_id: string, flag: string, name_ar: string) {
  return supabase.from("bracket_slots").upsert({
    slot_id,
    flag: flag.trim() || null,
    name_ar: name_ar.trim() || null,
  });
}

export async function clearBracketSlot(slot_id: string) {
  return supabase.from("bracket_slots").delete().eq("slot_id", slot_id);
}
