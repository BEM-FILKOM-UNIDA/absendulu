-- Student workspace integrity for Absendulu.
-- This migration preserves legacy identifiers and attendance history.

-- Public event browsing and personal attendance history use these indexes.
CREATE INDEX IF NOT EXISTS events_public_schedule_idx
  ON public.events (status, event_date ASC, start_time ASC);

CREATE INDEX IF NOT EXISTS attendances_event_user_check_in_idx
  ON public.attendances (event_id, user_id, check_in_at DESC);

-- Enforce one new check-in per event/user without deleting legacy duplicate rows.
-- The transaction advisory lock closes the check-then-insert race between scans.
CREATE OR REPLACE FUNCTION public.prevent_duplicate_event_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.event_id::text || ':' || NEW.user_id::text, 0)
  );

  IF EXISTS (
    SELECT 1
    FROM public.attendances
    WHERE event_id = NEW.event_id
      AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Attendance already exists for this event and user'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_event_attendance_trigger ON public.attendances;
CREATE TRIGGER prevent_duplicate_event_attendance_trigger
  BEFORE INSERT ON public.attendances
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_event_attendance();

REVOKE ALL ON FUNCTION public.prevent_duplicate_event_attendance() FROM PUBLIC;

-- Keep the query fast when the server checks whether a participant already
-- checked in to an event. Do not delete or rewrite legacy attendance rows.
-- A unique constraint cannot be added safely while legacy duplicates exist;
-- the trigger and check-in route enforce the event-level rule for new requests.

-- Keep the user profile readable through the Data API only for its owner;
-- profile writes continue through the server-side API/service role.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Students may see public event metadata, but not QR/session internals.
DROP POLICY IF EXISTS "Anyone read events" ON public.events;
DROP POLICY IF EXISTS "Public read active events" ON public.events;
CREATE POLICY "Public read active events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (status = 'active');
