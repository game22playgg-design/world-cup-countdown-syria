
-- Profiles table (username-only lightweight identity)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Match results (admin-entered)
CREATE TABLE public.match_results (
  match_id TEXT PRIMARY KEY,
  home_score INT NOT NULL CHECK (home_score >= 0),
  away_score INT NOT NULL CHECK (away_score >= 0),
  finished_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.match_results TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.match_results TO authenticated;
GRANT ALL ON public.match_results TO service_role;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_select_all" ON public.match_results FOR SELECT USING (true);
CREATE POLICY "results_admin_write" ON public.match_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Predictions
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL,
  home_score INT NOT NULL CHECK (home_score >= 0 AND home_score <= 20),
  away_score INT NOT NULL CHECK (away_score >= 0 AND away_score <= 20),
  points INT,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, match_id)
);
GRANT SELECT ON public.predictions TO anon, authenticated;
GRANT INSERT ON public.predictions TO authenticated;
GRANT UPDATE (points) ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions_select_all" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "predictions_insert_own" ON public.predictions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- No UPDATE/DELETE policy for users: predictions are locked after insert.

-- Scoring function
CREATE OR REPLACE FUNCTION public.calc_points(ph INT, pa INT, ah INT, aa INT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN ph = ah AND pa = aa THEN 3
    WHEN sign(ph - pa) = sign(ah - aa) THEN 1
    ELSE 0
  END;
$$;

-- Trigger: recalculate all prediction points when a match result changes
CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.predictions
  SET points = public.calc_points(home_score, away_score, NEW.home_score, NEW.away_score)
  WHERE match_id = NEW.match_id;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_match_results_points
AFTER INSERT OR UPDATE ON public.match_results
FOR EACH ROW EXECUTE FUNCTION public.update_prediction_points();

-- Leaderboard view: total + per-round breakdown + exact-count tiebreaker
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  pr.id AS user_id,
  pr.username,
  COALESCE(SUM(p.points), 0)::INT AS total_points,
  COUNT(*) FILTER (WHERE p.points = 3)::INT AS exact_count,
  COUNT(*) FILTER (WHERE p.points IS NOT NULL)::INT AS finished_count
FROM public.profiles pr
LEFT JOIN public.predictions p ON p.user_id = pr.id
GROUP BY pr.id, pr.username;

GRANT SELECT ON public.leaderboard TO anon, authenticated;
