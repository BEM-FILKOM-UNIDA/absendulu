-- ============================================
-- WEB ABSENSI - Database Schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Profiles (created by the BEM invite flow / auth trigger)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nim TEXT UNIQUE NOT NULL,
  email TEXT,
  division TEXT,
  phone TEXT,
  user_type TEXT NOT NULL DEFAULT 'mahasiswa' CHECK (user_type IN ('mahasiswa','dosen','tata_usaha')),
  account_status TEXT NOT NULL DEFAULT 'invited' CHECK (account_status IN ('invited','active','disabled')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin_bem','admin','user')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Events
CREATE TABLE events (
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

-- 3. Attendance Sessions (1 per event, with QR token)
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  qr_token TEXT NOT NULL UNIQUE,
  opened_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- 4. Attendances
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'hadir' CHECK (status IN ('hadir','terlambat','izin','alpha')),
  method TEXT DEFAULT 'QR_CODE' CHECK (method IN ('QR_CODE','MANUAL')),
  check_in_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(session_id, user_id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Helper to detect an active admin without recursive RLS on profiles
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

-- Profiles policies: only admin BEM may provision or change account fields.
CREATE POLICY "Admin full access profiles"
  ON profiles FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

-- Events policies
CREATE POLICY "Admin full access events"
  ON events FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Anyone read events"
  ON events FOR SELECT
  TO anon, authenticated
  USING (true);

-- Attendance sessions are admin-only because they contain QR tokens.
CREATE POLICY "Admin full access sessions"
  ON attendance_sessions FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Attendance rows are private to their owner and admins. Check-in is server-side.
CREATE POLICY "Admin full access attendances"
  ON attendances FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY "Users read own attendance"
  ON attendances FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Indexes for the primary list/count/check-in queries.
CREATE INDEX IF NOT EXISTS events_date_idx
  ON events (event_date DESC);
CREATE INDEX IF NOT EXISTS attendances_session_check_in_idx
  ON attendances (session_id, check_in_at DESC);
CREATE INDEX IF NOT EXISTS attendances_user_check_in_idx
  ON attendances (user_id, check_in_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS attendance_sessions_one_open_per_event_idx
  ON attendance_sessions (event_id)
  WHERE is_open = true;

REVOKE ALL ON TABLE profiles, events, attendance_sessions, attendances FROM anon, authenticated;
GRANT SELECT ON TABLE events TO anon, authenticated;
GRANT SELECT ON TABLE profiles, attendance_sessions, attendances TO authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================
-- TRIGGER: create an invited profile for an Auth user.
-- Public signups must remain disabled in Supabase Auth settings.
-- ============================================

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
    id, full_name, nim, email, user_type, account_status, role
  )
  VALUES (
    NEW.id,
    fallback_name,
    fallback_nim,
    NEW.email,
    COALESCE(NULLIF(BTRIM(NEW.raw_user_meta_data->>'user_type'), ''), 'mahasiswa'),
    'invited',
    'user'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE REALTIME on attendances table
-- ============================================

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
    ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
  END IF;
END
$$;

-- Bootstrap the first BEM admin explicitly after creating/inviting the account:
-- UPDATE public.profiles
-- SET role = 'admin_bem', account_status = 'active', is_active = true
-- WHERE email = 'admin-bem@example.org';
