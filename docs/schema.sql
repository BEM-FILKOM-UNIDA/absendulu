-- ============================================
-- ABSENDULU - Current Supabase schema baseline
-- Apply the ordered files in supabase/migrations/ for an existing project.
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nim TEXT UNIQUE NOT NULL,
  nim_format_legacy BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  division TEXT,
  phone TEXT,
  user_type TEXT NOT NULL DEFAULT 'mahasiswa' CHECK (user_type IN ('mahasiswa','dosen','tata_usaha')),
  account_status TEXT NOT NULL DEFAULT 'invited' CHECK (account_status IN ('invited','active','disabled')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin_bem','admin','user')),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT profiles_mahasiswa_nim_format_check CHECK (
    user_type <> 'mahasiswa'
    OR nim_format_legacy
    OR UPPER(nim) LIKE 'AUTH-%'
    OR nim ~ '^I\.[0-9]{7}$'
  )
);

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  qr_token TEXT NOT NULL UNIQUE,
  opened_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'hadir' CHECK (status IN ('hadir','terlambat','izin','alpha')),
  method TEXT DEFAULT 'QR_CODE' CHECK (method IN ('QR_CODE','MANUAL')),
  check_in_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Admin full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Admin full access profiles"
  ON public.profiles FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Admin full access events" ON public.events;
DROP POLICY IF EXISTS "Anyone read events" ON public.events;
DROP POLICY IF EXISTS "Public read active events" ON public.events;
CREATE POLICY "Admin full access events"
  ON public.events FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Public read active events"
  ON public.events FOR SELECT TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Admin full access sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Anyone read sessions" ON public.attendance_sessions;
CREATE POLICY "Admin full access sessions"
  ON public.attendance_sessions FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "Admin full access attendances" ON public.attendances;
DROP POLICY IF EXISTS "Users read own attendance" ON public.attendances;
CREATE POLICY "Admin full access attendances"
  ON public.attendances FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Users read own attendance"
  ON public.attendances FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS events_date_idx
  ON public.events (event_date DESC);
CREATE INDEX IF NOT EXISTS events_public_schedule_idx
  ON public.events (status, event_date ASC, start_time ASC);
CREATE INDEX IF NOT EXISTS attendances_session_check_in_idx
  ON public.attendances (session_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS attendances_user_check_in_idx
  ON public.attendances (user_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS attendances_event_user_check_in_idx
  ON public.attendances (event_id, user_id, check_in_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_one_open_per_event_idx
  ON public.attendance_sessions (event_id)
  WHERE is_open = true;

REVOKE ALL ON TABLE public.profiles, public.events, public.attendance_sessions, public.attendances FROM anon, authenticated;
GRANT SELECT ON TABLE public.events TO anon, authenticated;
GRANT SELECT ON TABLE public.profiles, public.attendance_sessions, public.attendances TO authenticated;

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
    SELECT 1 FROM public.attendances
    WHERE event_id = NEW.event_id AND user_id = NEW.user_id
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
  FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_event_attendance();
REVOKE ALL ON FUNCTION public.prevent_duplicate_event_attendance() FROM PUBLIC;

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
  fallback_nim := COALESCE(requested_nim, 'AUTH-' || REPLACE(UPPER(NEW.id::text), '-', ''));
  IF EXISTS (SELECT 1 FROM public.profiles WHERE nim = fallback_nim AND id <> NEW.id) THEN
    fallback_nim := 'AUTH-' || REPLACE(UPPER(NEW.id::text), '-', '');
  END IF;
  INSERT INTO public.profiles (id, full_name, nim, email, user_type, account_status, role)
  VALUES (NEW.id, fallback_name, fallback_nim, NEW.email, requested_type, 'invited', 'user')
  ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'attendances'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;
  END IF;
END
$$;
