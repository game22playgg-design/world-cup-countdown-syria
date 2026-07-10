
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS advance_pick text
  CHECK (advance_pick IN ('home','away'));
ALTER TABLE public.match_results ADD COLUMN IF NOT EXISTS advance_pick text
  CHECK (advance_pick IN ('home','away'));

CREATE OR REPLACE FUNCTION public.calc_points_v2(
  ph int, pa int, p_adv text,
  ah int, aa int, a_adv text
) RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  p_draw boolean := (ph = pa);
  a_draw boolean := (ah = aa);
  p_side text;
  a_side text;
  base int;
BEGIN
  p_side := CASE WHEN p_draw THEN p_adv
                 WHEN ph > pa THEN 'home' ELSE 'away' END;
  a_side := CASE WHEN a_draw THEN a_adv
                 WHEN ah > aa THEN 'home' ELSE 'away' END;

  IF NOT a_draw AND NOT p_draw THEN
    IF ph = ah AND pa = aa THEN RETURN 3;
    ELSIF sign(ph - pa) = sign(ah - aa) THEN RETURN 1;
    ELSE RETURN 0;
    END IF;
  ELSIF a_draw AND p_draw THEN
    base := CASE WHEN ph = ah AND pa = aa THEN 2 ELSE 1 END;
    IF p_side IS NOT NULL AND a_side IS NOT NULL AND p_side = a_side THEN
      RETURN base + 1;
    END IF;
    RETURN base;
  ELSE
    IF p_side IS NOT NULL AND a_side IS NOT NULL AND p_side = a_side THEN
      RETURN 1;
    END IF;
    RETURN 0;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_prediction_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.predictions p
  SET points = public.calc_points_v2(
    p.home_score, p.away_score, p.advance_pick,
    NEW.home_score, NEW.away_score, NEW.advance_pick
  )
  WHERE p.match_id = NEW.match_id;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_prediction_points ON public.match_results;
CREATE TRIGGER trg_update_prediction_points
BEFORE INSERT OR UPDATE ON public.match_results
FOR EACH ROW EXECUTE FUNCTION public.update_prediction_points();
