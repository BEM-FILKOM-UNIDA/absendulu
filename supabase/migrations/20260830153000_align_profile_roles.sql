-- Keep the database role contract aligned with application authorization.
-- Existing legacy roles were normalized by earlier migrations; this preserves
-- both supported admin role names for current and future profiles.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL
   OR role NOT IN ('admin_bem', 'admin', 'user');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin_bem', 'admin', 'user'));
