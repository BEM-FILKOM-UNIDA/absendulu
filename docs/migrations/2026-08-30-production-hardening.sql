-- Production hardening for Absendulu.
-- Applied after the existing remote migrations.

-- Keep attendance updates available to the admin realtime counter without failing on reruns.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'attendances'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;
  END IF;
END
$$;

-- Query indexes used by dashboard, event pages, QR counters and history.
CREATE INDEX IF NOT EXISTS events_date_idx
  ON public.events (event_date DESC);

CREATE INDEX IF NOT EXISTS attendances_session_check_in_idx
  ON public.attendances (session_id, check_in_at DESC);

CREATE INDEX IF NOT EXISTS attendances_user_check_in_idx
  ON public.attendances (user_id, check_in_at DESC);

-- Prevent two active QR sessions for one event under concurrent admin clicks.
-- Retire pre-existing duplicates before creating the unique partial index.
WITH ranked_open_sessions AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY event_id
      ORDER BY opened_at DESC NULLS LAST, id DESC
    ) AS row_number
  FROM public.attendance_sessions
  WHERE is_open = true
)
UPDATE public.attendance_sessions AS sessions
SET
  is_open = false,
  closed_at = COALESCE(sessions.closed_at, now())
FROM ranked_open_sessions AS ranked
WHERE sessions.id = ranked.id
  AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_one_open_per_event_idx
  ON public.attendance_sessions (event_id)
  WHERE is_open = true;

-- Ensure this migration is safe even if an older migration disabled RLS.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- Explicit table privileges: all writes go through server-side service_role routes.
REVOKE ALL ON TABLE public.profiles, public.events, public.attendance_sessions, public.attendances FROM anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles, public.attendance_sessions, public.attendances TO authenticated;

-- Keep the admin helper callable by authenticated policy evaluation only.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role IN ('admin_bem', 'admin')
      AND account_status = 'active'
      AND is_active = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Profiles: users can see only themselves; admins can manage all profiles.
DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Admin full access profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Events are public metadata; mutations remain admin-only.
DROP POLICY IF EXISTS "Admin full access events" ON public.events;
DROP POLICY IF EXISTS "Anyone read events" ON public.events;
CREATE POLICY "Admin full access events"
  ON public.events FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Anyone read events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (true);

-- QR tokens and session internals must never be exposed through the Data API.
DROP POLICY IF EXISTS "Admin full access sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Anyone read sessions" ON public.attendance_sessions;
CREATE POLICY "Admin full access sessions"
  ON public.attendance_sessions FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Users insert own attendance" ON public.attendances;
DROP POLICY IF EXISTS "Users update own attendance" ON public.attendances;
DROP POLICY IF EXISTS "Users delete own attendance" ON public.attendances;
DROP POLICY IF EXISTS "Admin full access attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users read own attendance" ON public.attendances;
DROP POLICY IF EXISTS "Anyone read attendances" ON public.attendances;
CREATE POLICY "Admin full access attendances"
  ON public.attendances FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Users read own attendance"
  ON public.attendances FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
