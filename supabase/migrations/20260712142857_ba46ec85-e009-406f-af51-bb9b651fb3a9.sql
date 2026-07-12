ALTER TABLE public.top_scorers ADD COLUMN IF NOT EXISTS name_en TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS top_scorers_name_en_unique ON public.top_scorers (name_en) WHERE name_en IS NOT NULL;