
CREATE OR REPLACE FUNCTION public.auto_admin_dev()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.username = 'المهندس حبيب الرحمن' THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.auto_admin_dev() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_auto_admin BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.auto_admin_dev();
