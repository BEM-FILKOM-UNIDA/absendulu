-- Allow authenticated users to maintain their own attendance identity.
-- Email, role, account status, and activation flags remain admin/server controlled.

GRANT UPDATE (full_name, nim, division, phone)
  ON TABLE public.profiles
  TO authenticated;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);
