-- Diagnose and repair Auth -> profiles provisioning.
-- Run this whole file in Supabase Dashboard -> SQL Editor.
-- Do not use Authentication -> Add user again until this query succeeds.

-- 1) Inspect all non-system triggers attached to auth.users.
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
ORDER BY trigger_name;

-- 2) Recreate the project trigger with null-safe values.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_value TEXT;
  fallback_name TEXT;
  fallback_nim TEXT;
BEGIN
  email_value := NULLIF(BTRIM(NEW.email), '');
  fallback_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    email_value,
    'Pengguna'
  );
  fallback_nim := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'nim'), ''),
    'AUTH-' || REPLACE(NEW.id::TEXT, '-', '')
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
    email_value,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'user_type'), ''), 'mahasiswa'),
    'active',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.profiles.email);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3) Verify the exact function and trigger now installed.
SELECT pg_get_functiondef('public.handle_new_user()'::REGPROCEDURE);
SELECT
  tg.tgname AS trigger_name,
  pg_get_triggerdef(tg.oid) AS trigger_definition,
  proc.oid::REGPROCEDURE AS trigger_function
FROM pg_trigger AS tg
JOIN pg_proc AS proc ON proc.oid = tg.tgfoid
WHERE tg.tgrelid = 'auth.users'::REGCLASS
  AND NOT tg.tgisinternal;
