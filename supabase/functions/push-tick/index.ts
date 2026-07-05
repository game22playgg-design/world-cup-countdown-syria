// Cron-triggered push dispatcher.
// - Sends "match starting soon" reminders 60 minutes before kickoff
//   to users who haven't predicted that match yet.
// - Sends "you scored points" notifications when a finished match's
//   results have been posted and a user earned >= 1 point.
//
// Invoked every few minutes by pg_cron via net.http_post.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webPush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@moaid.app";

webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supa = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Kickoff schedule (UTC) — kept in sync with src/lib/wc2026-data.ts.
// Only unfinished rounds strictly need to be here (r32 is already over).
const KICKOFFS: Record<string, string> = {
  "r16-1": "2026-07-04T17:00:00Z",
  "r16-2": "2026-07-04T21:00:00Z",
  "r16-3": "2026-07-05T20:00:00Z",
  "r16-4": "2026-07-06T00:00:00Z",
  "r16-5": "2026-07-06T19:00:00Z",
  "r16-6": "2026-07-07T00:00:00Z",
  "r16-7": "2026-07-07T16:00:00Z",
  "r16-8": "2026-07-07T20:00:00Z",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Sub {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendOne(sub: Sub, payload: Record<string, unknown>): Promise<boolean> {
  try {
    await webPush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 6 },
    );
    return true;
  } catch (err: any) {
    const code = err?.statusCode ?? 0;
    // 404/410 = subscription is dead — clean it up
    if (code === 404 || code === 410) {
      await supa.from("push_subscriptions").delete().eq("id", sub.id);
    } else {
      console.error("push send failed", code, err?.body ?? err?.message);
    }
    return false;
  }
}

async function sendToUsers(userIds: string[], payload: Record<string, unknown>) {
  if (userIds.length === 0) return { sent: 0, subs: 0 };
  const { data: subs, error } = await supa
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (error || !subs) return { sent: 0, subs: 0 };
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      if (await sendOne(s as Sub, payload)) sent++;
    }),
  );
  return { sent, subs: subs.length };
}

// -------- 1. Match-starting-soon reminders --------
async function processReminders(now: Date) {
  const summary: Record<string, unknown> = {};
  const inHourStart = now.getTime() + 55 * 60 * 1000;
  const inHourEnd = now.getTime() + 70 * 60 * 1000;

  // Which matches are 55-70 minutes away?
  const dueMatchIds = Object.entries(KICKOFFS)
    .filter(([, iso]) => {
      const t = new Date(iso).getTime();
      return t >= inHourStart && t <= inHourEnd;
    })
    .map(([id]) => id);

  if (dueMatchIds.length === 0) {
    summary.due = 0;
    return summary;
  }

  // Skip matches we've already sent for
  const { data: alreadySent } = await supa
    .from("match_reminders")
    .select("match_id")
    .in("match_id", dueMatchIds);
  const sentSet = new Set((alreadySent ?? []).map((r) => r.match_id as string));
  const toProcess = dueMatchIds.filter((id) => !sentSet.has(id));

  const perMatch: Record<string, unknown> = {};
  for (const matchId of toProcess) {
    // All users
    const { data: allUsers } = await supa.from("profiles").select("id");
    // Users who already predicted this match
    const { data: predicted } = await supa
      .from("predictions")
      .select("user_id")
      .eq("match_id", matchId);
    const predictedSet = new Set((predicted ?? []).map((p) => p.user_id as string));
    const targets = (allUsers ?? [])
      .map((u) => u.id as string)
      .filter((id) => !predictedSet.has(id));

    const r = await sendToUsers(targets, {
      title: "موعد",
      body: "اللعبة ستبدأ قريباً، توقع النتيجة الآن!",
      tag: `reminder-${matchId}`,
      url: "/",
    });

    // Mark sent even if no subscriptions — we only want one attempt per match
    await supa.from("match_reminders").upsert({ match_id: matchId, sent_at: new Date().toISOString() });
    perMatch[matchId] = { targets: targets.length, ...r };
  }
  summary.due = dueMatchIds.length;
  summary.processed = perMatch;
  return summary;
}

// -------- 2. You-scored-points notifications --------
async function processPointsNotifications() {
  // All finished results
  const { data: results } = await supa.from("match_results").select("match_id");
  const finishedIds = (results ?? []).map((r) => r.match_id as string);
  if (finishedIds.length === 0) return { pointsSent: 0 };

  // All predictions that earned points on those matches
  const { data: preds } = await supa
    .from("predictions")
    .select("user_id, match_id, points")
    .in("match_id", finishedIds)
    .not("points", "is", null)
    .gte("points", 1);

  if (!preds || preds.length === 0) return { pointsSent: 0 };

  // Filter out ones we've already notified
  const { data: alreadyNotif } = await supa
    .from("points_notifications")
    .select("user_id, match_id");
  const doneKey = new Set((alreadyNotif ?? []).map((n) => `${n.user_id}::${n.match_id}`));
  const pending = preds.filter((p) => !doneKey.has(`${p.user_id}::${p.match_id}`));

  let pointsSent = 0;
  for (const p of pending) {
    const points = p.points as number;
    const body =
      points === 3
        ? "🔥🎯 توقعت النتيجة بالمظبوط! حصلت على 3 نقاط"
        : "🔥✅ توقعت الفائز صح! حصلت على نقطة";

    const r = await sendToUsers([p.user_id as string], {
      title: "موعد",
      body,
      tag: `points-${p.match_id}`,
      url: "/",
    });
    if (r.sent > 0) pointsSent++;

    // Mark as notified regardless — otherwise we'd retry forever for users with no subscription
    await supa.from("points_notifications").upsert({
      user_id: p.user_id,
      match_id: p.match_id,
      points,
      sent_at: new Date().toISOString(),
    });
  }

  return { pointsSent, pending: pending.length };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const now = new Date();
  const [reminders, points] = await Promise.all([
    processReminders(now).catch((e) => ({ error: String(e) })),
    processPointsNotifications().catch((e) => ({ error: String(e) })),
  ]);

  return new Response(
    JSON.stringify({ ok: true, now: now.toISOString(), reminders, points }, null, 2),
    { headers: { "Content-Type": "application/json", ...CORS } },
  );
});
