-- Invite-only provisioning for BEM-managed accounts.
-- Run after the original docs/schema.sql. This migration preserves attendance rows.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'mahasiswa',
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';

UPDATE public.profiles
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE public.profiles.id = auth_users.id
  AND public.profiles.email IS NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;

UPDATE public.profiles
SET role = CASE role
  WHEN 'admin' THEN 'admin_bem'
  WHEN 'anggota' THEN 'user'
  ELSE role
END;

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

DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read all profiles" ON public.profiles;
CREATE POLICY "Admin full access profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
