-- Normalize invalid Auth metadata before the profile constraint is evaluated.
-- This keeps OAuth/Magic Link account creation reliable while onboarding/API
-- validation remains strict for real identifiers.

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

  requested_type := NULLIF(BTRIM(NEW.raw_user_meta_data->>'user_type'), '');
  IF requested_type IS NULL OR requested_type NOT IN ('mahasiswa', 'dosen', 'tata_usaha') THEN
    requested_type := 'mahasiswa';
  END IF;

  requested_nim := NULLIF(UPPER(BTRIM(NEW.raw_user_meta_data->>'nim')), '');
  IF requested_nim IS NULL
     OR requested_nim LIKE 'AUTH-%'
     OR (requested_type = 'mahasiswa' AND requested_nim !~ '^I\.[0-9]{7}$')
     OR (requested_type <> 'mahasiswa' AND requested_nim !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$') THEN
    requested_nim := NULL;
  END IF;

  fallback_nim := COALESCE(
    requested_nim,
    'AUTH-' || REPLACE(UPPER(NEW.id::text), '-', '')
  );

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE nim = fallback_nim AND id <> NEW.id
  ) THEN
    fallback_nim := 'AUTH-' || REPLACE(UPPER(NEW.id::text), '-', '');
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
