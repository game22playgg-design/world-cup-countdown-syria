
ALTER FUNCTION public.calc_points(INT, INT, INT, INT) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.update_prediction_points() FROM PUBLIC, anon, authenticated;
