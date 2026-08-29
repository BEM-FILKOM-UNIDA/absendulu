-- ============================================
-- WEB ABSENSI - Database Schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nim TEXT UNIQUE NOT NULL,
  division TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
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

-- Profiles policies
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read all profiles" ON profiles FOR SELECT USING (true);

-- Events policies
CREATE POLICY "Admin full access events" ON events FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Anyone read events" ON events FOR SELECT USING (true);

-- Attendance sessions policies
CREATE POLICY "Admin full access sessions" ON attendance_sessions FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Anyone read sessions" ON attendance_sessions FOR SELECT USING (true);

-- Attendances policies
CREATE POLICY "Admin full access attendances" ON attendances FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users insert own attendance" ON attendances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own attendance" ON attendances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone read attendances" ON attendances FOR SELECT USING (true);

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, nim)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nim');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE REALTIME on attendances table
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
