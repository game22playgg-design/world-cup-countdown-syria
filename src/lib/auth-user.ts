import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  username: string;
  is_admin: boolean;
}

export function useCurrentUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, is_admin")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      setProfile(data ?? null);
      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) fetchProfile(data.user.id);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        if (session?.user) fetchProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("id, username, is_admin")
      .eq("id", data.user.id)
      .maybeSingle();
    setProfile(p ?? null);
  };

  return { profile, loading, refresh };
}

export async function signUpWithUsername(usernameRaw: string): Promise<{ error?: string }> {
  const username = usernameRaw.trim();
  if (username.length < 2 || username.length > 24) {
    return { error: "اسم المستخدم يجب أن يكون بين 2 و 24 حرفاً" };
  }
  // Check availability first
  const { data: taken } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (taken) return { error: "الاسم مأخوذ، جرّب اسماً آخر" };

  // Anonymous sign-in
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
  if (authError || !authData.user) return { error: "تعذّر إنشاء الحساب، حاول مجدداً" };

  const { error: insErr } = await supabase.from("profiles").insert({
    id: authData.user.id,
    username,
  });
  if (insErr) {
    // race: username taken between check and insert
    await supabase.auth.signOut();
    return { error: "الاسم مأخوذ، جرّب اسماً آخر" };
  }
  return {};
}

export async function signOut() {
  await supabase.auth.signOut();
}
