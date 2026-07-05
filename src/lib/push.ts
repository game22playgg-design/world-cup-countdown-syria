// Client-side push notification helpers.
// Only runs in the browser (guarded), never during SSR.

import { supabase } from "@/integrations/supabase/client";

// Public VAPID key — safe to ship to the client.
export const VAPID_PUBLIC_KEY =
  "BDaY2PauNEhFgGRXknTFXBzbcDyU6dGGdOB3_KnaNLoL9HV1azzSR6EIe7AfG0wCK2-CRePKa4iKDeY7YZUqkH4";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToBase64(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Register the SW (idempotent). */
async function ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration("/sw.js");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/** Ask permission + subscribe + save subscription to Supabase. */
export async function enablePushNotifications(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) return { ok: false, error: "المتصفح لا يدعم الإشعارات" };
  try {
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "لم يتم منح إذن الإشعارات" };

    const reg = await ensureRegistration();
    if (!reg) return { ok: false, error: "تعذّر تسجيل الخدمة" };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const json = sub.toJSON();
    const endpoint = sub.endpoint;
    const p256dh = json.keys?.p256dh ?? bufToBase64(sub.getKey("p256dh"));
    const auth = json.keys?.auth ?? bufToBase64(sub.getKey("auth"));

    if (!endpoint || !p256dh || !auth) {
      return { ok: false, error: "بيانات الاشتراك غير مكتملة" };
    }

    // Upsert by endpoint (unique). Delete-then-insert so the row is tied to this user.
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint,
      p256dh,
      auth,
    });
    if (error) return { ok: false, error: error.message };

    try {
      localStorage.setItem("moaid_push_enabled", "1");
    } catch {}
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "خطأ غير متوقع" };
  }
}

export function pushPermissionState(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported";
  return Notification.permission;
}
