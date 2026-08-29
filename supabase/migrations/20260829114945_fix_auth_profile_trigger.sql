-- Fix Auth trigger for users created from Supabase Dashboard.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_name TEXT;
  fallback_nim TEXT;
BEGIN
  fallback_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(NEW.email), ''),
    'Pengguna'
  );

  fallback_nim := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'nim'), ''),
    'AUTH-' || REPLACE(NEW.id::text, '-', '')
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    nim,
    email,
    user_type,
    account_status,
    role
  )
  VALUES (
    NEW.id,
    fallback_name,
    fallback_nim,
    NEW.email,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'user_type'), ''), 'mahasiswa'),
    'active',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
