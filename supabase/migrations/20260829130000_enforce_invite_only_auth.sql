-- Enforce invite-only access for Auth users created outside the admin import flow.
-- Admin imports upsert the profile to active after Auth user creation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback_name TEXT;
  fallback_nim TEXT;
  requested_nim TEXT;
  requested_type TEXT;
BEGIN
  fallback_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(NEW.email), ''),
    'Pengguna'
  );

  requested_nim := NULLIF(BTRIM(NEW.raw_user_meta_data->>'nim'), '');
  fallback_nim := COALESCE(
    requested_nim,
    'AUTH-' || REPLACE(NEW.id::text, '-', '')
  );

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE nim = fallback_nim AND id <> NEW.id
  ) THEN
    fallback_nim := 'AUTH-' || REPLACE(NEW.id::text, '-', '');
  END IF;

  requested_type := NULLIF(BTRIM(NEW.raw_user_meta_data->>'user_type'), '');
  IF requested_type IS NULL OR requested_type NOT IN ('mahasiswa', 'dosen', 'tata_usaha') THEN
    requested_type := 'mahasiswa';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, nim, email, user_type, account_status, role
  )
  VALUES (
    NEW.id,
    fallback_name,
    fallback_nim,
    NEW.email,
    requested_type,
    'invited',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
