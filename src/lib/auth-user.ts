import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  username: string;
  is_admin: boolean;
  bonus_points: number;
}

// Deterministic email per username so we can auth via supabase email/password
// without exposing a real email. Non-ascii usernames are hashed to hex.
function usernameToEmail(username: string): string {
  const trimmed = username.trim();
  if (/^[A-Za-z0-9._-]+$/.test(trimmed)) {
    return `${trimmed.toLowerCase()}@moaid.local`;
  }
  let hash = 5381;
  for (let i = 0; i < trimmed.length; i++) {
    hash = ((hash << 5) + hash + trimmed.charCodeAt(i)) >>> 0;
  }
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
        .select("id, username, is_admin, bonus_points")
        .eq("id", userId)
        .maybeSingle();
      if (!mounted) return;
      setProfile((data as UserProfile | null) ?? null);
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

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "كلمة السر غير صحيحة";
  if (m.includes("password should be at least")) {
    const match = msg.match(/at least (\d+)/i);
    const n = match ? match[1] : "6";
    return `كلمة السر يجب ألا تقل عن ${n} أحرف`;
  }
  if (m.includes("user already registered") || m.includes("already been registered")) return "الاسم مأخوذ، جرّب اسماً آخر";
  if (m.includes("email rate limit")) return "محاولات كثيرة، انتظر قليلاً وحاول مجدداً";
  if (m.includes("network")) return "خطأ في الشبكة، تحقق من الاتصال";
  return msg;
}

async function isUsernameTaken(username: string): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  return !!data;
}

/** Suggest a free username by appending numbers to the base. */
export async function suggestUsername(base: string): Promise<string | null> {
  const trimmed = base.trim();
  if (!trimmed) return null;
  // Try a small pool of random 2-digit suffixes to make it feel varied
  const candidates: string[] = [];
  for (let i = 0; i < 8; i++) {
    const n = Math.floor(10 + Math.random() * 90);
    candidates.push(`${trimmed}${n}`);
  }
  // Fallback: try sequential 1..20
  for (let i = 1; i <= 20; i++) candidates.push(`${trimmed}${i}`);
  for (const c of candidates) {
    if (c.length > 24) continue;
    // Skip re-checking the same one twice
    if (!(await isUsernameTaken(c))) return c;
  }
  return null;
}

export interface AuthResult {
  error?: string;
  /** If provided, the username was taken and this is a free alternative to offer the user. */
  suggestion?: string;
}

export async function loginOrRegister(
  usernameRaw: string,
  password: string,
): Promise<AuthResult> {
  const username = usernameRaw.trim();
  if (username.length < 2 || username.length > 24) {
    return { error: "اسم المستخدم يجب أن يكون بين 2 و 24 حرفاً" };
  }
  if (password.length < 1) {
    return { error: "أدخل كلمة السر" };
  }

  // Check if username already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("username", username)
    .maybeSingle();

  if (existing) {
    // Try login. If wrong password, suggest a free alternative name.
    const email = existing.email ?? usernameToEmail(username);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
        const suggestion = await suggestUsername(username);
        return {
          error: "الاسم مأخوذ. اختر اسماً آخر أو استخدم الاقتراح.",
          suggestion: suggestion ?? undefined,
        };
      }
      return { error: translateAuthError(error.message) };
    }
    return {};
  }

  // Fresh registration
  const email = usernameToEmail(username);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (signUpError || !signUpData.user) {
    return { error: signUpError ? translateAuthError(signUpError.message) : "تعذّر إنشاء الحساب" };
  }

  // Make sure we have an authenticated session BEFORE inserting the profile
  // (RLS on profiles requires auth.uid() = id).
  if (!signUpData.session) {
    const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
    if (siErr) return { error: translateAuthError(siErr.message) };
  }

  const userId = signUpData.user.id;
  const { error: insErr } = await supabase.from("profiles").insert({
    id: userId,
    username,
    email,
  });
  if (insErr) {
    await supabase.auth.signOut();
    if (insErr.message.toLowerCase().includes("duplicate")) {
      const suggestion = await suggestUsername(username);
      return { error: "الاسم مأخوذ. اختر اسماً آخر أو استخدم الاقتراح.", suggestion: suggestion ?? undefined };
    }
    return { error: insErr.message };
  }

  // Nudge the auth listener so the freshly-created profile is fetched immediately
  // (SIGNED_IN fired before the profile row existed).
  try {
    await supabase.auth.updateUser({ data: { username } });
  } catch {
    // best-effort — profile will still load on next mount
  }

  return {};
}

export async function signOut() {
  await supabase.auth.signOut();
}
