# Web Absensi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistem manajemen absensi terpusat yang reusable untuk berbagai acara organisasi.

**Architecture:** Next.js App Router (frontend + API routes) + Supabase (PostgreSQL + Auth + RLS). Single deployment di Vercel (free) + Supabase hosted (free).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase JS SDK, Vercel (deploy)

## Global Constraints

- **FREE tier only:** Supabase free (500MB DB, 50K MAU), Vercel free (100GB bandwidth)
- **No paid dependencies:** Everything must work on free tiers
- **Indonesian UI:** All user-facing text in Bahasa Indonesia
- **Mobile-first:** Responsive design, works di HP
- **Reusable:** Satu aplikasi untuk banyak acara, bukan satu acara

---

## Database Schema (Supabase PostgreSQL)

### Entity Relationship

```
users (Supabase Auth)
  ├── id (UUID, PK, from auth.users)
  ├── email
  └── role: 'admin' | 'anggota'

profiles
  ├── id (UUID, PK → users.id)
  ├── full_name
  ├── nim (Nomor Induk Mahasiswa / Nomor Anggota)
  ├── division (Divisi/Jabatan)
  ├── phone (optional)
  ├── is_active: boolean
  └── created_at

events
  ├── id (UUID, PK)
  ├── name
  ├── description
  ├── event_date: date
  ├── event_time: time
  ├── location
  ├── status: 'draft' | 'active' | 'completed' | 'cancelled'
  ├── created_by → users.id
  └── created_at

attendance_sessions
  ├── id (UUID, PK)
  ├── event_id → events.id
  ├── is_open: boolean
  ├── opened_by → users.id
  ├── opened_at: timestamptz
  └── closed_at: timestamptz

attendances
  ├── id (UUID, PK)
  ├── session_id → attendance_sessions.id
  ├── user_id → users.id
  ├── status: 'hadir' | 'terlambat' | 'izin' | 'alpha'
  ├── check_in_at: timestamptz
  └── notes (optional)
```

### Row Level Security (RLS) Rules

| Table | Admin | Anggota |
|-------|-------|---------|
| profiles | Full CRUD | Read own, Update own |
| events | Full CRUD | Read only |
| attendance_sessions | Full CRUD | Read only |
| attendances | Full CRUD | Insert own (check-in), Read own |

---

## User Flow

### Admin Flow
1. Login → Dashboard
2. Kelola Anggota (CRUD profiles)
3. Buat Acara (create event)
4. Buka Sesi Absensi (open attendance session)
5. Lihat Rekap Kehadiran (view attendance summary)
6. Tutup Sesi Absensi (close session)

### Anggota Flow
1. Login → Lihat Daftar Acara
2. Pilih Acara yang Aktif
3. Check-in (absen) → Status otomatis (Hadir/Terlambat)
4. Lihat Riwayat Kehadiran Sendiri

---

## Project Structure

```
absen/
├── app/
│   ├── layout.tsx              # Root layout dengan auth provider
│   ├── page.tsx                # Landing / redirect
│   ├── (auth)/
│   │   ├── login/page.tsx      # Halaman login
│   │   └── register/page.tsx   # Halaman register
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard layout (sidebar)
│   │   ├── page.tsx            # Dashboard home
│   │   ├── events/
│   │   │   ├── page.tsx        # Daftar acara
│   │   │   ├── [id]/page.tsx   # Detail acara
│   │   │   └── new/page.tsx    # Buat acara baru
│   │   ├── members/
│   │   │   ├── page.tsx        # Daftar anggota (admin)
│   │   │   └── [id]/page.tsx   # Detail anggota
│   │   ├── attendance/
│   │   │   ├── [eventId]/page.tsx  # Sesi absensi
│   │   │   └── history/page.tsx    # Riwayat (admin)
│   │   └── profile/page.tsx    # Profil sendiri
│   └── api/
│       └── check-in/route.ts   # API check-in
├── components/
│   ├── ui/                     # Button, Card, Input, Modal
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   └── EventForm.tsx
│   ├── members/
│   │   ├── MemberCard.tsx
│   │   └── MemberForm.tsx
│   └── attendance/
│       ├── CheckInButton.tsx
│       └── AttendanceTable.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   ├── server.ts           # Server client
│   │   └── middleware.ts       # Auth middleware
│   └── utils.ts                # Helper functions
├── types/
│   └── database.ts             # TypeScript types
├── middleware.ts                # Next.js middleware (auth guard)
├── .env.local                  # Supabase credentials
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Implementation Plan

### Task 1: Project Setup & Supabase Init

**Files:**
- Create: `absen/` (Next.js project)
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd /home/alee/Destop/absen
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Install Supabase dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 3: Create .env.local**

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

- [ ] **Step 4: Create Supabase client files**

`lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

`lib/supabase/server.ts`:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: '', ...options }) },
      }
    }
  )
}
```

- [ ] **Step 5: Commit**

```bash
git init && git add -A && git commit -m "feat: init project with Supabase"
```

---

### Task 2: Database Schema (Supabase Dashboard)

**Action:** Create tables via Supabase SQL Editor

- [ ] **Step 1: Create profiles table**

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nim TEXT UNIQUE NOT NULL,
  division TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Create events table**

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Create attendance_sessions table**

```sql
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  opened_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 4: Create attendances table**

```sql
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT DEFAULT 'hadir' CHECK (status IN ('hadir', 'terlambat', 'izin', 'alpha')),
  check_in_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  UNIQUE(session_id, user_id)
);

ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 5: Create RLS policies**

```sql
-- Profiles: admin full access, anggota read own
CREATE POLICY "Admin can do everything on profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events: admin full access, anggota read only
CREATE POLICY "Admin can do everything on events" ON events FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);

-- Attendance sessions: admin full access
CREATE POLICY "Admin can do everything on sessions" ON attendance_sessions FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Anyone can read sessions" ON attendance_sessions FOR SELECT USING (true);

-- Attendances: admin full access, anggota insert own + read own
CREATE POLICY "Admin can do everything on attendances" ON attendances FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users can insert own attendance" ON attendances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own attendance" ON attendances FOR SELECT USING (auth.uid() = user_id);
```

- [ ] **Step 6: Create trigger for auto-create profile on signup**

```sql
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
```

---

### Task 3: Types & Middleware

**Files:**
- Create: `types/database.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create TypeScript types**

`types/database.ts`:
```typescript
export interface Profile {
  id: string
  full_name: string
  nim: string
  division: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface Event {
  id: string
  name: string
  description: string | null
  event_date: string
  event_time: string
  location: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
}

export interface AttendanceSession {
  id: string
  event_id: string
  is_open: boolean
  opened_by: string
  opened_at: string
  closed_at: string | null
  events?: Event
}

export interface Attendance {
  id: string
  session_id: string
  user_id: string
  status: 'hadir' | 'terlambat' | 'izin' | 'alpha'
  check_in_at: string
  notes: string | null
  profiles?: Profile
}

export type UserRole = 'admin' | 'anggota'
```

- [ ] **Step 2: Create auth middleware**

`middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, ...options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add types and auth middleware"
```

---

### Task 4: Auth Pages (Login & Register)

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/layout.tsx`

- [ ] **Step 1: Create auth layout**

`app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create login page**

`app/(auth)/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
      <p className="text-center mt-4 text-sm text-gray-600">
        Belum punya akun? <a href="/register" className="text-blue-600 hover:underline">Daftar</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create register page**

`app/(auth)/register/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [nim, setNim] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, nim }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Daftar</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NIM / Nomor Anggota</label>
          <input
            type="text"
            value={nim}
            onChange={(e) => setNim(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Daftar'}
        </button>
      </form>
      <p className="text-center mt-4 text-sm text-gray-600">
        Sudah punya akun? <a href="/login" className="text-blue-600 hover:underline">Login</a>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add login and register pages"
```

---

### Task 5: Dashboard Layout & Home

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/page.tsx`
- Create: `components/layout/Sidebar.tsx`
- Create: `components/layout/Header.tsx`

- [ ] **Step 1: Create sidebar component**

`components/layout/Sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/events', label: 'Acara', icon: '📅' },
  { href: '/members', label: 'Anggota', icon: '👥' },
  { href: '/attendance/history', label: 'Riwayat', icon: '📋' },
  { href: '/profile', label: 'Profil', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="text-xl font-bold mb-8 px-3">📋 Absensi</div>
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${
              pathname === item.href
                ? 'bg-blue-600'
                : 'hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Create header component**

`components/layout/Header.tsx`:
```tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
      <h2 className="text-lg font-semibold text-gray-800">Sistem Absensi</h2>
      <button
        onClick={handleLogout}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Logout
      </button>
    </header>
  )
}
```

- [ ] **Step 3: Create dashboard layout**

`app/(dashboard)/layout.tsx`:
```tsx
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create dashboard home page**

`app/(dashboard)/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: events } = await supabase.from('events').select('*')
  const { data: profiles } = await supabase.from('profiles').select('*')
  const { data: sessions } = await supabase.from('attendance_sessions').select('*, attendances(*)').eq('is_open', true)

  const totalEvents = events?.length || 0
  const totalMembers = profiles?.length || 0
  const activeSessions = sessions?.length || 0
  const totalCheckIns = sessions?.reduce((acc, s) => acc + (s.attendances?.length || 0), 0) || 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">{totalEvents}</div>
          <div className="text-gray-600">Total Acara</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">{totalMembers}</div>
          <div className="text-gray-600">Total Anggota</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-yellow-600">{activeSessions}</div>
          <div className="text-gray-600">Sesi Aktif</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-purple-600">{totalCheckIns}</div>
          <div className="text-gray-600">Check-in Hari Ini</div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add dashboard layout with sidebar and stats"
```

---

### Task 6: Event Management (CRUD)

**Files:**
- Create: `app/(dashboard)/events/page.tsx`
- Create: `app/(dashboard)/events/new/page.tsx`
- Create: `app/(dashboard)/events/[id]/page.tsx`
- Create: `components/events/EventCard.tsx`
- Create: `components/events/EventForm.tsx`

- [ ] **Step 1: Create EventCard component**

`components/events/EventCard.tsx`:
```tsx
import Link from 'next/link'
import { Event } from '@/types/database'

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function EventCard({ event }: { event: Event }) {
  return (
    <Link href={`/events/${event.id}`}>
      <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition cursor-pointer">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{event.name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
            {event.status}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-2">{event.description}</p>
        <div className="text-sm text-gray-500">
          <p>📅 {event.event_date} • 🕐 {event.event_time}</p>
          <p>📍 {event.location}</p>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create events list page**

`app/(dashboard)/events/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import EventCard from '@/components/events/EventCard'
import Link from 'next/link'

export default async function EventsPage() {
  const supabase = createClient()
  const { data: events } = await supabase.from('events').select('*').order('event_date', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Acara</h1>
        <Link
          href="/events/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Buat Acara
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events?.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
      {(!events || events.length === 0) && (
        <p className="text-gray-500 text-center py-8">Belum ada acara</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create new event page**

`app/(dashboard)/events/new/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function NewEventPage() {
  const [form, setForm] = useState({
    name: '', description: '', event_date: '', event_time: '', location: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('events').insert({
      ...form,
      created_by: user?.id
    })

    if (error) {
      alert('Gagal membuat acara: ' + error.message)
      setLoading(false)
      return
    }

    router.push('/events')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Buat Acara Baru</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Acara</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Waktu</label>
            <input
              type="time"
              value={form.event_time}
              onChange={(e) => setForm({ ...form, event_time: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Lokasi</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Menyimpan...' : 'Buat Acara'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Create event detail page**

`app/(dashboard)/events/[id]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: event } = await supabase.from('events').select('*').eq('id', params.id).single()

  if (!event) notFound()

  const { data: sessions } = await supabase
    .from('attendance_sessions')
    .select('*, attendances(*, profiles(*))')
    .eq('event_id', params.id)

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-gray-600">{event.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {event.status}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>📅 <strong>Tanggal:</strong> {event.event_date}</div>
          <div>🕐 <strong>Waktu:</strong> {event.event_time}</div>
          <div>📍 <strong>Lokasi:</strong> {event.location}</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Sesi Absensi</h2>
      {sessions?.map((session) => (
        <div key={session.id} className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Sesi {new Date(session.opened_at).toLocaleString('id')}</span>
            <span className={`px-2 py-1 rounded text-xs ${session.is_open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {session.is_open ? 'Terbuka' : 'Tertutup'}
            </span>
          </div>
          <p className="text-sm text-gray-600">{session.attendances?.length || 0} peserta hadir</p>
        </div>
      ))}

      <Link href={`/attendance/${event.id}`} className="inline-block mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
        Buka Sesi Absensi
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add event management CRUD"
```

---

### Task 7: Attendance Check-in

**Files:**
- Create: `app/(dashboard)/attendance/[eventId]/page.tsx`
- Create: `components/attendance/CheckInButton.tsx`
- Create: `components/attendance/AttendanceTable.tsx`
- Create: `app/api/check-in/route.ts`

- [ ] **Step 1: Create check-in API route**

`app/api/check-in/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { session_id } = await request.json()

  // Check if already checked in
  const { data: existing } = await supabase
    .from('attendances')
    .select('id')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Sudah melakukan absensi' }, { status: 400 })
  }

  // Check if session is open
  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('*, events(*)')
    .eq('id', session_id)
    .single()

  if (!session?.is_open) {
    return NextResponse.json({ error: 'Sesi absensi sudah ditutup' }, { status: 400 })
  }

  // Determine status (terlambat if > 15 min after event start)
  const eventTime = new Date(`1970-01-01T${session.events.event_time}`)
  const now = new Date()
  const checkInTime = new Date(`1970-01-01T${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`)
  const diffMinutes = (checkInTime.getTime() - eventTime.getTime()) / (1000 * 60)
  const status = diffMinutes > 15 ? 'terlambat' : 'hadir'

  const { error } = await supabase.from('attendances').insert({
    session_id,
    user_id: user.id,
    status,
    check_in_at: now.toISOString()
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status })
}
```

- [ ] **Step 2: Create CheckInButton component**

`components/attendance/CheckInButton.tsx`:
```tsx
'use client'

import { useState } from 'react'

export default function CheckInButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ status?: string; error?: string } | null>(null)

  const handleCheckIn = async () => {
    setLoading(true)
    const res = await fetch('/api/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)
  }

  if (result?.error) return <p className="text-red-500 text-sm">{result.error}</p>
  if (result?.status) return <p className="text-green-600 font-medium">✅ Berhasil absen: {result.status}</p>

  return (
    <button
      onClick={handleCheckIn}
      disabled={loading}
      className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
    >
      {loading ? 'Memproses...' : '📍 Check-in Sekarang'}
    </button>
  )
}
```

- [ ] **Step 3: Create attendance page for event**

`app/(dashboard)/attendance/[eventId]/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import CheckInButton from '@/components/attendance/CheckInButton'
import AttendanceTable from '@/components/attendance/AttendanceTable'

export default async function AttendancePage({ params }: { params: { eventId: string } }) {
  const supabase = createClient()

  const { data: event } = await supabase.from('events').select('*').eq('id', params.eventId).single()
  const { data: sessions } = await supabase
    .from('attendance_sessions')
    .select('*, attendances(*, profiles(*))')
    .eq('event_id', params.eventId)
    .order('opened_at', { ascending: false })

  const openSession = sessions?.find(s => s.is_open)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Absensi: {event?.name}</h1>
      <p className="text-gray-600 mb-6">{event?.event_date} • {event?.event_time} • {event?.location}</p>

      {openSession && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-green-800 mb-2">Sesi absensi sedang dibuka</p>
          <CheckInButton sessionId={openSession.id} />
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Riwayat Sesi</h2>
      {sessions?.map((session) => (
        <div key={session.id} className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">
              Sesi {new Date(session.opened_at).toLocaleString('id')}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${
              session.is_open ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {session.is_open ? 'Terbuka' : 'Tertutup'}
            </span>
          </div>
          <AttendanceTable attendances={session.attendances || []} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create AttendanceTable component**

`components/attendance/AttendanceTable.tsx`:
```tsx
import { Attendance } from '@/types/database'

const statusColors = {
  hadir: 'text-green-600',
  terlambat: 'text-yellow-600',
  izin: 'text-blue-600',
  alpha: 'text-red-600',
}

export default function AttendanceTable({ attendances }: { attendances: Attendance[] }) {
  if (attendances.length === 0) {
    return <p className="text-sm text-gray-500">Belum ada yang absen</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="py-2">Nama</th>
          <th className="py-2">NIM</th>
          <th className="py-2">Status</th>
          <th className="py-2">Waktu</th>
        </tr>
      </thead>
      <tbody>
        {attendances.map((a) => (
          <tr key={a.id} className="border-b">
            <td className="py-2">{a.profiles?.full_name}</td>
            <td className="py-2">{a.profiles?.nim}</td>
            <td className={`py-2 font-medium ${statusColors[a.status]}`}>{a.status}</td>
            <td className="py-2">{new Date(a.check_in_at).toLocaleTimeString('id')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add attendance check-in system"
```

---

### Task 8: Member Management (Admin)

**Files:**
- Create: `app/(dashboard)/members/page.tsx`
- Create: `app/(dashboard)/members/[id]/page.tsx`
- Create: `components/members/MemberCard.tsx`

- [ ] **Step 1: Create members list page**

`app/(dashboard)/members/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function MembersPage() {
  const supabase = createClient()
  const { data: members } = await supabase.from('profiles').select('*').order('full_name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Daftar Anggota</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nama</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">NIM</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Divisi</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members?.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{member.full_name}</td>
                <td className="px-4 py-3">{member.nim}</td>
                <td className="px-4 py-3">{member.division}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {member.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add member management page"
```

---

### Task 9: Attendance History & Reports

**Files:**
- Create: `app/(dashboard)/attendance/history/page.tsx`

- [ ] **Step 1: Create history page**

`app/(dashboard)/attendance/history/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function AttendanceHistoryPage() {
  const supabase = createClient()

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, profiles(*), attendance_sessions(*, events(*))')
    .order('check_in_at', { ascending: false })
    .limit(100)

  // Group by event
  const byEvent = attendances?.reduce((acc, a) => {
    const eventName = a.attendance_sessions?.events?.name || 'Unknown'
    if (!acc[eventName]) acc[eventName] = []
    acc[eventName].push(a)
    return acc
  }, {} as Record<string, typeof attendances>) || {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Riwayat Kehadiran</h1>
      {Object.entries(byEvent).map(([eventName, atts]) => (
        <div key={eventName} className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold text-lg mb-2">{eventName}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Nama</th>
                <th className="py-2">NIM</th>
                <th className="py-2">Status</th>
                <th className="py-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {atts.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.profiles?.full_name}</td>
                  <td className="py-2">{a.profiles?.nim}</td>
                  <td className="py-2 font-medium">{a.status}</td>
                  <td className="py-2">{new Date(a.check_in_at).toLocaleString('id')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add attendance history page"
```

---

### Task 10: Profile Page

**Files:**
- Create: `app/(dashboard)/profile/page.tsx`

- [ ] **Step 1: Create profile page**

`app/(dashboard)/profile/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profil Saya</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500">Nama</label>
            <p className="font-medium">{profile?.full_name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">NIM</label>
            <p className="font-medium">{profile?.nim}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Divisi</label>
            <p className="font-medium">{profile?.division || '-'}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Status</label>
            <p className="font-medium">{profile?.is_active ? '✅ Aktif' : '❌ Nonaktif'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add profile page"
```

---

### Task 11: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/absen-app.git
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to https://vercel.com
2. Import GitHub repo
3. Add environment variables (Supabase URL, keys)
4. Deploy

- [ ] **Step 3: Set first admin user**

In Supabase SQL Editor:
```sql
-- After first user registers, promote them to admin
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

- [ ] **Step 4: Verify deployment**

Visit your Vercel URL, login, and test the full flow.

---

## Edge Cases & Risks

| Risk | Mitigation |
|------|------------|
| Double check-in | UNIQUE constraint on (session_id, user_id) |
| Late check-in | Auto-detect >15 min after event time → status 'terlambat' |
| Session not closed | Auto-close after 24 hours via Supabase Edge Function |
| RLS bypass | Always use server-side Supabase client with service role for admin ops |
| Free tier limits | 500MB DB is ~50K events + 500K attendances,足够 use |
| No internet during check-in | Must be online; offline mode would need PWA (future improvement) |

## Future Improvements

1. **QR Code Check-in** — Generate QR per session, scan to absen
2. **Export to Excel** — Download rekap kehadiran
3. **Notification** — Email/WhatsApp reminder sebelum acara
4. **Offline PWA** — Absen tanpa internet, sync saat online
5. **Multi-organization** — Satu instansi, banyak organisasi
6. **Photo check-in** — Upload selfie saat absen
7. **GPS validation** — Hanya bisa absen dari lokasi acara
