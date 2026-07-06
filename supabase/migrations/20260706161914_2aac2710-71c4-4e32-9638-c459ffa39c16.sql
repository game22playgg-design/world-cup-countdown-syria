
-- Bracket slots
CREATE TABLE public.bracket_slots (
  slot_id text PRIMARY KEY,
  flag text,
  name_ar text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bracket_slots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bracket_slots TO authenticated;
GRANT ALL ON public.bracket_slots TO service_role;
ALTER TABLE public.bracket_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY bracket_read_all ON public.bracket_slots FOR SELECT USING (true);
CREATE POLICY bracket_admin_write ON public.bracket_slots FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Top scorers
CREATE TABLE public.top_scorers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  country_flag text,
  country_ar text,
  goals integer NOT NULL DEFAULT 0,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.top_scorers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.top_scorers TO authenticated;
GRANT ALL ON public.top_scorers TO service_role;
ALTER TABLE public.top_scorers ENABLE ROW LEVEL SECURITY;
CREATE POLICY scorers_read_all ON public.top_scorers FOR SELECT USING (true);
CREATE POLICY scorers_admin_write ON public.top_scorers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- updated_at trigger (shared)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER bracket_slots_touch BEFORE UPDATE ON public.bracket_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER top_scorers_touch BEFORE UPDATE ON public.top_scorers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
