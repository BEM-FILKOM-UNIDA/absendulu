-- Align direct Data API access with the application rule that non-admin users can only scan.
-- Admin server routes continue to use service_role and are unaffected by these grants.

REVOKE SELECT
  ON TABLE public.events
  FROM anon;

DROP POLICY IF EXISTS "Anyone read events" ON public.events;

REVOKE UPDATE
  ON TABLE public.profiles
  FROM authenticated;

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
