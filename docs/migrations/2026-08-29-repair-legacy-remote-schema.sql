-- Repair the remote project that still uses the original profiles schema.
-- Run this entire file in Supabase Dashboard -> SQL Editor.
-- It is safe to run more than once.

-- 1) Drop the old role constraint before normalizing legacy role values.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2) Extend the old profiles table used by the current remote project.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'mahasiswa',
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

-- Backfill email and normalize values before adding constraints.
UPDATE public.profiles AS profiles
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id
  AND profiles.email IS NULL;

UPDATE public.profiles
SET role = CASE role
  WHEN 'admin' THEN 'admin_bem'
  WHEN 'anggota' THEN 'user'
  ELSE role
END;

UPDATE public.profiles
SET user_type = CASE
  WHEN user_type IN ('mahasiswa', 'dosen', 'tata_usaha') THEN user_type
  ELSE 'mahasiswa'
END,
account_status = CASE
  WHEN account_status IN ('invited', 'active', 'disabled') THEN account_status
  ELSE 'active'
END;

-- 3) Replace old constraints with the current application vocabulary.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  DROP CONSTRAINT IF EXISTS profiles_user_type_check,
  DROP CONSTRAINT IF EXISTS profiles_account_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin_bem', 'user')),
  ADD CONSTRAINT profiles_user_type_check
    CHECK (user_type IN ('mahasiswa', 'dosen', 'tata_usaha')),
  ADD CONSTRAINT profiles_account_status_check
    CHECK (account_status IN ('invited', 'active', 'disabled'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_idx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

-- 4) Create profiles for any existing Auth users that do not have one.
INSERT INTO public.profiles (id, full_name, nim, email, user_type, account_status, role)
SELECT
  users.id,
  COALESCE(NULLIF(BTRIM(users.raw_user_meta_data->>'full_name'), ''), NULLIF(BTRIM(users.email), ''), 'Pengguna'),
  'AUTH-' || REPLACE(users.id::TEXT, '-', ''),
  users.email,
  'mahasiswa',
  'active',
  'user'
FROM auth.users AS users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles AS profiles WHERE profiles.id = users.id
);

-- 5) Keep admin detection compatible with the current app.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin_bem', 'admin')
      AND account_status <> 'disabled'
  );
$$;

-- 6) Replace the old Auth trigger with a null-safe, idempotent trigger.
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
  requested_nim TEXT;
  fallback_nim TEXT;
  requested_type TEXT;
BEGIN
  email_value := NULLIF(BTRIM(NEW.email), '');
  fallback_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    email_value,
    'Pengguna'
  );

  requested_nim := NULLIF(BTRIM(NEW.raw_user_meta_data->>'nim'), '');
  fallback_nim := COALESCE(requested_nim, 'AUTH-' || REPLACE(NEW.id::TEXT, '-', ''));

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE nim = fallback_nim AND id <> NEW.id
  ) THEN
    fallback_nim := 'AUTH-' || REPLACE(NEW.id::TEXT, '-', '');
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
    email_value,
    requested_type,
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

-- 7) Verify the repaired schema and trigger.
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

SELECT
  tg.tgname AS trigger_name,
  proc.oid::REGPROCEDURE AS trigger_function
FROM pg_trigger AS tg
JOIN pg_proc AS proc ON proc.oid = tg.tgfoid
WHERE tg.tgrelid = 'auth.users'::REGCLASS
  AND NOT tg.tgisinternal;
