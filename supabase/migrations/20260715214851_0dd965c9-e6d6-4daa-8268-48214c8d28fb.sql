CREATE OR REPLACE FUNCTION public.update_prediction_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.predictions p
  SET points = CASE
    WHEN NEW.match_id = 'sf-2' THEN
      CASE
        WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score THEN 5
        WHEN sign(p.home_score - p.away_score) = sign(NEW.home_score - NEW.away_score)
             AND NEW.home_score <> NEW.away_score AND p.home_score <> p.away_score THEN 3
        ELSE 0
      END
    WHEN NEW.match_id IN ('final-1','third-1') THEN
      CASE
        WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score THEN 8
        WHEN sign(p.home_score - p.away_score) = sign(NEW.home_score - NEW.away_score)
             AND NEW.home_score <> NEW.away_score AND p.home_score <> p.away_score THEN 5
        ELSE 0
      END
    ELSE public.calc_points_v2(
      p.home_score, p.away_score, p.advance_pick,
      NEW.home_score, NEW.away_score, NEW.advance_pick
    )
  END
  WHERE p.match_id = NEW.match_id;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;