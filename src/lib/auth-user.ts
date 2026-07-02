import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  username: string;
  is_admin: boolean;
}

// Deterministic email per username so we can auth via supabase email/password
// without exposing a real email. Non-ascii usernames are hashed to hex.
function usernameToEmail(username: string): string {
  const trimmed = username.trim();
  // If pure ascii alnum + . _ -, use it directly
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    return `${trimmed.toLowerCase()}@moaid.local`;
  }
  // Hash to hex for arabic / unicode names
  let hash = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    hash = ((hash << 5) + hash + trimmed.charCodeAt(i)) >>> 0;
  }
  // Add length + first char code for extra uniqueness
  const suffix = `${hash.toString(16)}${trimmed.length.toString(16)}`;
  return `u_${suffix}@moaid.local`;
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

  return { profile, loading };
}

export async function loginOrRegister(
  usernameRaw: string,
  password: string,
): Promise<{ error?: string }> {
  const username = usernameRaw.trim();
  if (username.length < 2 || username.length > 24) {
    return { error: "اسم المستخدم يجب أن يكون بين 2 و 24 حرفاً" };
  }
  if (password.length < 4) {
    return { error: "كلمة السر يجب ألا تقل عن 4 أحرف" };
  }

  // Check if username already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    // Sign in with stored email
    const email = existing.email ?? usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "كلمة السر غير صحيحة" };
    return {};
  }

  // Register: sign up new account
  const email = usernameToEmail(username);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError || !signUpData.user) {
    return { error: "تعذّر إنشاء الحساب، حاول لاحقاً" };
  }

  // Ensure session (in case email confirmation is off, signUp returns a session)
  if (!signUpData.session) {
    const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    if (siErr) return { error: "تم إنشاء الحساب — سجّل الدخول الآن" };
  }

  const userId = signUpData.user.id;
  const { error: insErr } = await supabase.from("profiles").insert({
    id: userId,
    username,
    email,
  });
  if (insErr) {
    await supabase.auth.signOut();
    return { error: "الاسم مأخوذ، جرّب اسماً آخر" };
  }
  return {};
}

export async function signOut() {
  await supabase.auth.signOut();
}
