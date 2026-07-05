
-- Add highlights_url to match_results
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS highlights_url text;

-- Push subscriptions (per browser/device tied to user)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "push_own_select" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "push_own_insert" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_own_delete" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Track which matches already had "starting soon" reminders sent
CREATE TABLE IF NOT EXISTS public.match_reminders (
  match_id text PRIMARY KEY,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_reminders TO authenticated;
GRANT ALL ON public.match_reminders TO service_role;
ALTER TABLE public.match_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_read_all" ON public.match_reminders FOR SELECT USING (true);

-- Track which (user, match) points-earned pushes have been sent, to avoid duplicates
CREATE TABLE IF NOT EXISTS public.points_notifications (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id text NOT NULL,
  points integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, match_id)
);
GRANT SELECT ON public.points_notifications TO authenticated;
GRANT ALL ON public.points_notifications TO service_role;
ALTER TABLE public.points_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points_notif_read_own" ON public.points_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
