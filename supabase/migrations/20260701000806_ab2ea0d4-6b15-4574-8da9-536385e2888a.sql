
DROP VIEW IF EXISTS public.leaderboard;
CREATE VIEW public.leaderboard WITH (security_invoker = true) AS
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
