
-- Wipe all existing users and their predictions
DELETE FROM public.predictions;
DELETE FROM public.profiles;

-- Add email lookup + bonus points columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS bonus_points integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uidx ON public.profiles (username);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_uidx ON public.profiles (email);

-- Update admin trigger: 'admin' username is admin
CREATE OR REPLACE FUNCTION public.auto_admin_dev()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.username = 'admin' OR NEW.username = 'المهندس حبيب الرحمن' THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_auto_admin ON public.profiles;
CREATE TRIGGER profiles_auto_admin
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_admin_dev();

-- Allow admins to update bonus_points and other admin-managed columns on any profile
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
CREATE POLICY profiles_admin_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin = true));
