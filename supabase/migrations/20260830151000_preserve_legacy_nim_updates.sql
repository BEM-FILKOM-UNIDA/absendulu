-- Preserve legacy identifiers while keeping new writes strict.
-- The application validates new Mahasiswa identifiers as I.####### and new
-- staff identifiers with the shared alphanumeric identifier format.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nim_format_legacy BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET nim_format_legacy = true
WHERE nim_format_legacy = false
  AND (
    (user_type = 'mahasiswa'
      AND UPPER(nim) NOT LIKE 'AUTH-%'
      AND nim !~ '^I\.[0-9]{7}$')
    OR (user_type <> 'mahasiswa'
      AND (UPPER(nim) LIKE 'AUTH-%' OR nim !~ '^[A-Za-z0-9][A-Za-z0-9._/-]{2,63}$'))
  );

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_mahasiswa_nim_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_mahasiswa_nim_format_check
  CHECK (
    user_type <> 'mahasiswa'
    OR nim_format_legacy
    OR UPPER(nim) LIKE 'AUTH-%'
    OR nim ~ '^I\.[0-9]{7}$'
  ) NOT VALID;
