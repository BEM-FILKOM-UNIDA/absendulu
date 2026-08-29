# Web Absensi + QR Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sistem manajemen absensi terpusat dengan QR Code check-in, reusable untuk berbagai acara organisasi.

**Architecture:** Next.js App Router (frontend + API routes) + Supabase (PostgreSQL + Auth + RLS + Realtime). Deploy: Vercel (free) + Supabase hosted (free).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase JS SDK, `qrcode` (npm, client-side QR generate), `html5-qrcode` (npm, client-side QR scan), Vercel (deploy)

## Global Constraints

- **FREE tier only:** Supabase free (500MB DB, 50K MAU), Vercel free (100GB bandwidth)
- **No paid dependencies:** Everything must work on free tiers
- **Indonesian UI:** All user-facing text in Bahasa Indonesia
- **Mobile-first:** Responsive design, works di HP
- **Reusable:** Satu aplikasi untuk banyak acara, bukan satu acara

## Grilling Decisions (Confirmed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| QR Token Strategy | Session token + auth validation | Token sharing gak berguna karena harus login |
| QR Token Rotation | Static per session | Simple, cukup aman untuk organisasi |
| Event Time Schema | event_date + start_time + end_time | Best of both: date + time tanpa timezone issue |
| Late Detection | Fixed 15 menit setelah start_time | Standard untuk organisasi |
| Realtime | Supabase Realtime | Gratis, 10 baris kode |
| QR Scanner Library | html5-qrcode | Populer, simpel, mobile-friendly |
| QR Generation | Client-side (npm `qrcode`) | Cepat, gak perlu extra API call |
| Race Condition | UNIQUE constraint (user_id, session_id) | Atomic, cukup untuk organisasi |
| Attendance Method | Add `method` field | Future-proof, 0 complexity |
| Scan Success UX | Toast + auto redirect | Modern, simpel |
| QR Display | Static QR per session | Simple, invalidate = tutup session |
| Status Setting | Auto (HADIR/TERLAMBAT) + admin override | Anggota gak perlu pilih status |
| Admin QR Info | Counter + 5 nama terakhir | Informatif tanpa overwhelming |
| Event Status | draft → active → completed/cancelled | Simple, cukup |
| Sessions per Event | 1 sesi aktif per event | Gak membingungkan |

---

## Database Schema (Supabase PostgreSQL)

### Entity Relationship

```
users (Supabase Auth)
  ├── id (UUID, PK, from auth.users)
  ├── email
  └── raw_user_meta_data: { full_name, nim, role: 'admin'|'anggota' }

profiles
  ├── id (UUID, PK → users.id)
  ├── full_name TEXT NOT NULL
  ├── nim TEXT UNIQUE NOT NULL
  ├── division TEXT
  ├── phone TEXT
  ├── is_active BOOLEAN DEFAULT true
  └── created_at TIMESTAMPTZ

events
  ├── id UUID PK DEFAULT gen_random_uuid()
  ├── name TEXT NOT NULL
  ├── description TEXT
  ├── event_date DATE NOT NULL
  ├── start_time TIME NOT NULL
  ├── end_time TIME
  ├── location TEXT
  ├── status TEXT DEFAULT 'draft' CHECK (status IN ('draft','active','completed','cancelled'))
  ├── created_by UUID → users.id
  └── created_at TIMESTAMPTZ

attendance_sessions
  ├── id UUID PK DEFAULT gen_random_uuid()
  ├── event_id UUID → events.id ON DELETE CASCADE NOT NULL
  ├── is_open BOOLEAN DEFAULT true
  ├── qr_token TEXT NOT NULL UNIQUE
  ├── opened_by UUID → users.id
  ├── opened_at TIMESTAMPTZ DEFAULT now()
  └── closed_at TIMESTAMPTZ

attendances
  ├── id UUID PK DEFAULT gen_random_uuid()
  ├── session_id UUID → attendance_sessions.id ON DELETE CASCADE NOT NULL
  ├── event_id UUID → events.id NOT NULL
  ├── user_id UUID → users.id NOT NULL
  ├── status TEXT DEFAULT 'hadir' CHECK (status IN ('hadir','terlambat','izin','alpha'))
  ├── method TEXT DEFAULT 'QR_CODE' CHECK (method IN ('QR_CODE','MANUAL'))
  ├── check_in_at TIMESTAMPTZ DEFAULT now()
  ├── notes TEXT
  └── UNIQUE(session_id, user_id)  ← prevents double check-in
```

### Key Constraints

```sql
-- Prevent duplicate attendance per session
ALTER TABLE attendances ADD CONSTRAINT uq_attendance_session_user UNIQUE (session_id, user_id);

-- QR token must be unique
ALTER TABLE attendance_sessions ADD CONSTRAINT uq_session_qr_token UNIQUE (qr_token);
```

### RLS Policies

| Table | Admin | Anggota |
|-------|-------|---------|
| profiles | Full CRUD | Read all (for attendance list), Update own |
| events | Full CRUD | Read only (active/completed) |
| attendance_sessions | Full CRUD | Read only (for QR scan validation) |
| attendances | Full CRUD | Insert own (check-in), Read own |

---

## API Design

### Admin APIs

```
POST   /api/events                    → Create event
GET    /api/events                    → List events
GET    /api/events/:id                → Get event detail
PUT    /api/events/:id                → Update event

POST   /api/events/:id/session/open   → Open attendance session (generates QR token)
POST   /api/events/:id/session/close  → Close attendance session
GET    /api/events/:id/session        → Get current session + QR token + attendance count
```

### Member APIs

```
POST   /api/attendance/check-in       → Check-in with QR token
Body:  { "qrToken": "TOKEN_FROM_QR_CODE" }
Auth:  Required (from session/JWT)
Backend extracts user_id from auth, NOT from request body.
```

### Realtime Channels

```
Channel: attendance:${event_id}
Event: INSERT on attendances table
Payload: { new attendance record }
```

---

## User Flow

### Admin Flow
```
Login → Dashboard
→ Buat Event (nama, tanggal, waktu, lokasi)
→ Buka Detail Event
→ Klik "Buka Absensi" → Session dibuka, QR token generated
→ Halaman QR muncul (QR code + counter realtime)
→ Anggota scan QR → Counter naik realtime
→ Klik "Tutup Absensi" → Session ditutup, QR invalid
```

### Anggota Flow
```
Login → Buka "Scan QR"
→ Kamera aktif
→ Scan QR Code di layar admin
→ Frontend kirim token ke backend
→ Backend validasi (token valid? session open? sudah absen?)
→ Jika valid → Attendance created (HADIR/TERLAMBAT otomatis)
→ Toast "✅ Berhasil absen!" → Auto redirect ke home
```

---

## Project Structure

```
absen/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard home
│   │   ├── events/
│   │   │   ├── page.tsx                # Daftar acara
│   │   │   ├── new/page.tsx            # Buat acara baru
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Detail acara
│   │   │       └── qr/page.tsx         # QR display (admin)
│   │   ├── members/
│   │   │   └── page.tsx                # Daftar anggota (admin)
│   │   ├── scan/
│   │   │   └── page.tsx                # QR scanner (anggota)
│   │   ├── attendance/
│   │   │   └── history/page.tsx        # Riwayat (admin)
│   │   └── profile/page.tsx
│   └── api/
│       ├── events/
│       │   ├── route.ts                # GET, POST
│       │   └── [id]/
│       │       ├── route.ts            # GET, PUT
│       │       └── session/
│       │           ├── route.ts        # GET session
│       │           ├── open/route.ts   # POST open
│       │           └── close/route.ts  # POST close
│       └── attendance/
│           └── check-in/route.ts       # POST check-in
├── components/
│   ├── ui/                             # Button, Card, Input, Modal, Toast
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   ├── events/
│   │   ├── EventCard.tsx
│   │   └── EventForm.tsx
│   ├── attendance/
│   │   ├── QRDisplay.tsx               # QR code display for admin
│   │   ├── QRScanner.tsx               # QR scanner for members
│   │   ├── AttendanceTable.tsx
│   │   └── AttendanceCounter.tsx        # Realtime counter
│   └── members/
│       └── MemberCard.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils.ts
├── types/
│   └── database.ts
├── middleware.ts
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Implementation Plan

### Task 1: Project Setup & Supabase Init

**Files:**
- Create: Next.js project at `/home/alee/Destop/absen/`
- Create: `.env.local`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Step 1: Create Next.js project**

```bash
cd /home/alee/Destop/absen
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=no --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr qrcode html5-qrcode
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
git init && git add -A && git commit -m "feat: init project with Supabase + QR deps"
```

---

### Task 2: Database Schema (Supabase SQL Editor)

**Action:** Create tables via Supabase Dashboard → SQL Editor

- [ ] **Step 1: Create all tables**

```sql
-- Profiles (auto-created on signup via trigger)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nim TEXT UNIQUE NOT NULL,
  division TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Events
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

-- Attendance Sessions (1 per event, with QR token)
CREATE TABLE attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  is_open BOOLEAN DEFAULT true,
  qr_token TEXT NOT NULL UNIQUE,
  opened_by UUID REFERENCES auth.users(id),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Attendances
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
```

- [ ] **Step 2: Enable RLS + policies**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read all profiles" ON profiles FOR SELECT USING (true);

-- Events
CREATE POLICY "Admin full access events" ON events FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Anyone read events" ON events FOR SELECT USING (true);

-- Attendance sessions
CREATE POLICY "Admin full access sessions" ON attendance_sessions FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Anyone read sessions" ON attendance_sessions FOR SELECT USING (true);

-- Attendances
CREATE POLICY "Admin full access attendances" ON attendances FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Users insert own attendance" ON attendances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own attendance" ON attendances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone read attendances" ON attendances FOR SELECT USING (true);
```

- [ ] **Step 3: Create trigger for auto-create profile**

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

- [ ] **Step 4: Enable Realtime on attendances table**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE attendances;
```

- [ ] **Step 5: Commit schema docs**

```bash
git add -A && git commit -m "docs: add database schema plan"
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
  start_time: string
  end_time: string | null
  location: string | null
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  created_by: string
  created_at: string
}

export interface AttendanceSession {
  id: string
  event_id: string
  is_open: boolean
  qr_token: string
  opened_by: string
  opened_at: string
  closed_at: string | null
  events?: Event
}

export interface Attendance {
  id: string
  session_id: string
  event_id: string
  user_id: string
  status: 'hadir' | 'terlambat' | 'izin' | 'alpha'
  method: 'QR_CODE' | 'MANUAL'
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
- Create: `app/(auth)/layout.tsx`
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/page.tsx`

- [ ] **Step 1: Create auth layout**

`app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8">{children}</div>
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
    if (error) { setError(error.message); setLoading(false); return }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Login</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
  const [form, setForm] = useState({ fullName: '', nim: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName, nim: form.nim } }
    })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/login')
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold text-center mb-6">Daftar</h1>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
          <input type="text" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">NIM / Nomor Anggota</label>
          <input type="text" value={form.nim} onChange={(e) => setForm({ ...form, nim: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required minLength={6} />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
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

- [ ] **Step 1: Create sidebar**

`components/layout/Sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/events', label: 'Acara', icon: '📅' },
  { href: '/scan', label: 'Scan QR', icon: '📷' },
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
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${pathname === item.href ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            <span>{item.icon}</span><span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Create header**

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
      <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
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
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create dashboard home**

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
- Create: `app/api/events/route.ts`
- Create: `app/api/events/[id]/route.ts`

- [ ] **Step 1: Create EventCard**

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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>{event.status}</span>
        </div>
        <p className="text-gray-600 text-sm mb-2">{event.description}</p>
        <div className="text-sm text-gray-500">
          <p>📅 {event.event_date} • 🕐 {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</p>
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
        <Link href="/events/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">+ Buat Acara</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events?.map((event) => <EventCard key={event.id} event={event} />)}
      </div>
      {(!events || events.length === 0) && <p className="text-gray-500 text-center py-8">Belum ada acara</p>}
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
  const [form, setForm] = useState({ name: '', description: '', event_date: '', start_time: '', end_time: '', location: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('events').insert({ ...form, created_by: user?.id, status: 'active' })
    if (error) { alert('Gagal: ' + error.message); setLoading(false); return }
    router.push('/events')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Buat Acara Baru</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama Acara</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tanggal</label>
            <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Jam Mulai</label>
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Jam Selesai</label>
            <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Lokasi</label>
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
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

  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('*, attendances(*, profiles(*))')
    .eq('event_id', params.id)
    .eq('is_open', true)
    .single()

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-gray-600">{event.description}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
          {event.status}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>📅 <strong>Tanggal:</strong> {event.event_date}</div>
          <div>🕐 <strong>Waktu:</strong> {event.start_time}{event.end_time ? ` - ${event.end_time}` : ''}</div>
          <div>📍 <strong>Lokasi:</strong> {event.location}</div>
        </div>
      </div>

      {session ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-green-800 mb-2">✅ Sesi absensi aktif — {session.attendances?.length || 0} peserta hadir</p>
          <Link href={`/events/${event.id}/qr`} className="inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Lihat QR Code
          </Link>
        </div>
      ) : (
        <form action={`/api/events/${event.id}/session/open`} method="POST" className="mb-6">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Buka Sesi Absensi
          </button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create API routes**

`app/api/events/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return [] }, setAll() {} } })
  const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll() { return [] }, setAll() {} } })
  const body = await request.json()
  const { data, error } = await supabase.from('events').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

`app/api/events/[id]/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return [] }, setAll() {} } })
  const { data, error } = await supabase.from('events').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add event management CRUD"
```

---

### Task 7: Attendance Session + QR Code (Admin)

**Files:**
- Create: `app/api/events/[id]/session/open/route.ts`
- Create: `app/api/events/[id]/session/close/route.ts`
- Create: `app/api/events/[id]/session/route.ts`
- Create: `app/(dashboard)/events/[id]/qr/page.tsx`
- Create: `components/attendance/QRDisplay.tsx`
- Create: `components/attendance/AttendanceCounter.tsx`

- [ ] **Step 1: Create open session API**

`app/api/events/[id]/session/open/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll() { return [] }, setAll() {} } })

  // Check if session already open
  const { data: existing } = await supabase
    .from('attendance_sessions')
    .select('id')
    .eq('event_id', params.id)
    .eq('is_open', true)
    .single()

  if (existing) return NextResponse.json({ error: 'Sesi sudah terbuka' }, { status: 400 })

  // Generate secure QR token
  const qrToken = crypto.randomBytes(32).toString('hex')

  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({ event_id: params.id, qr_token: qrToken, opened_by: '00000000-0000-0000-0000-000000000000' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 2: Create close session API**

`app/api/events/[id]/session/close/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { cookies: { getAll() { return [] }, setAll() {} } })

  const { data, error } = await supabase
    .from('attendance_sessions')
    .update({ is_open: false, closed_at: new Date().toISOString() })
    .eq('event_id', params.id)
    .eq('is_open', true)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 3: Create get session API**

`app/api/events/[id]/session/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll() { return [] }, setAll() {} } })

  const { data, error } = await supabase
    .from('attendance_sessions')
    .select('*, attendances(*, profiles(*))')
    .eq('event_id', params.id)
    .eq('is_open', true)
    .single()

  if (error) return NextResponse.json({ error: 'Tidak ada sesi aktif' }, { status: 404 })
  return NextResponse.json(data)
}
```

- [ ] **Step 4: Create QR Display component**

`components/attendance/QRDisplay.tsx`:
```tsx
'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export default function QRDisplay({ token, eventName }: { token: string; eventName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && token) {
      QRCode.toCanvas(canvasRef.current, token, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      })
    }
  }, [token])

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2">{eventName}</h2>
      <p className="text-gray-600 mb-4">Scan QR Code ini untuk absen</p>
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <canvas ref={canvasRef} />
      </div>
      <p className="text-xs text-gray-400 mt-2">Token: {token.substring(0, 8)}...</p>
    </div>
  )
}
```

- [ ] **Step 5: Create AttendanceCounter component (Realtime)**

`components/attendance/AttendanceCounter.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Attendance } from '@/types/database'

export default function AttendanceCounter({ sessionId, eventId, initialCount }: {
  sessionId: string; eventId: string; initialCount: number
}) {
  const [count, setCount] = useState(initialCount)
  const [recent, setRecent] = useState<Attendance[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial recent attendances
    supabase.from('attendances')
      .select('*, profiles(*)')
      .eq('session_id', sessionId)
      .order('check_in_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecent(data) })

    // Subscribe to realtime
    const channel = supabase
      .channel(`attendance:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendances', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setCount(c => c + 1)
          setRecent(prev => [payload.new as Attendance, ...prev].slice(0, 5))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [sessionId, eventId, supabase])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-5xl font-bold text-green-600 text-center mb-2">{count}</div>
      <div className="text-gray-600 text-center mb-4">peserta hadir</div>
      {recent.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-500 mb-2">Terakhir scan:</p>
          {recent.map((a) => (
            <p key={a.id} className="text-sm text-gray-700">✅ {a.profiles?.full_name} — {new Date(a.check_in_at).toLocaleTimeString('id')}</p>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create QR display page**

`app/(dashboard)/events/[id]/qr/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import QRDisplay from '@/components/attendance/QRDisplay'
import AttendanceCounter from '@/components/attendance/AttendanceCounter'

export default async function QRPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: event } = await supabase.from('events').select('*').eq('id', params.id).single()
  if (!event) notFound()

  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('event_id', params.id)
    .eq('is_open', true)
    .single()

  if (!session) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Tidak ada sesi absensi aktif</h1>
        <a href={`/events/${params.id}`} className="text-blue-600 hover:underline">Kembali ke detail acara</a>
      </div>
    )
  }

  const { count } = await supabase.from('attendances').select('*', { count: 'exact', head: true }).eq('session_id', session.id).then(r => ({ count: r.count || 0 }))

  return (
    <div className="max-w-2xl mx-auto">
      <QRDisplay token={session.qr_token} eventName={event.name} />
      <div className="mt-6">
        <AttendanceCounter sessionId={session.id} eventId={event.id} initialCount={count} />
      </div>
      <div className="mt-4 text-center">
        <form action={`/api/events/${params.id}/session/close`} method="POST">
          <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">
            Tutup Sesi Absensi
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add QR code display, session management, realtime counter"
```

---

### Task 8: QR Scanner (Member)

**Files:**
- Create: `app/(dashboard)/scan/page.tsx`
- Create: `components/attendance/QRScanner.tsx`
- Create: `app/api/attendance/check-in/route.ts`

- [ ] **Step 1: Create check-in API**

`app/api/attendance/check-in/route.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return request.cookies.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { qrToken } = await request.json()
  if (!qrToken) return NextResponse.json({ error: 'QR token diperlukan' }, { status: 400 })

  // Find session by QR token
  const { data: session } = await supabase
    .from('attendance_sessions')
    .select('*, events(*)')
    .eq('qr_token', qrToken)
    .eq('is_open', true)
    .single()

  if (!session) return NextResponse.json({ error: 'QR Code tidak valid atau sesi sudah ditutup' }, { status: 400 })

  // Check if already checked in
  const { data: existing } = await supabase
    .from('attendances')
    .select('id')
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Sudah melakukan absensi' }, { status: 400 })

  // Determine status: HADIR or TERLAMBAT
  const event = session.events
  const now = new Date()
  const startTime = event.start_time // "HH:MM:SS"
  const [startH, startM] = startTime.split(':').map(Number)
  const eventStart = new Date()
  eventStart.setHours(startH, startM, 0, 0)
  const diffMinutes = (now.getTime() - eventStart.getTime()) / (1000 * 60)
  const status = diffMinutes > 15 ? 'terlambat' : 'hadir'

  const { error } = await supabase.from('attendances').insert({
    session_id: session.id,
    event_id: session.event_id,
    user_id: user.id,
    status,
    method: 'QR_CODE',
    check_in_at: now.toISOString()
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status, eventName: event.name })
}
```

- [ ] **Step 2: Create QR Scanner component**

`components/attendance/QRScanner.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QRScanner({ onScan }: { onScan: (token: string) => void }) {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    if (!containerRef.current) return
    setScanning(true)
    setError('')

    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {})
          onScan(decodedText)
        },
        () => {} // ignore errors during scanning
      )
    } catch (err) {
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.')
      setScanning(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div id="qr-reader" ref={containerRef} className="w-full max-w-sm mb-4" />
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {!scanning && (
        <button onClick={startScanning}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
          📷 Mulai Scan QR
        </button>
      )}
      {scanning && <p className="text-gray-600">Memindai... Arahkan kamera ke QR Code</p>}
    </div>
  )
}
```

- [ ] **Step 3: Create scan page**

`app/(dashboard)/scan/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import QRScanner from '@/components/attendance/QRScanner'

export default function ScanPage() {
  const [result, setResult] = useState<{ status?: string; error?: string; eventName?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleScan = async (token: string) => {
    setLoading(true)
    const res = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrToken: token })
    })
    const data = await res.json()
    setResult(data)
    setLoading(false)

    if (data.success) {
      setTimeout(() => { window.location.href = '/' }, 2000)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Scan QR Absensi</h1>

      {result?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
          <p className="text-4xl mb-2">✅</p>
          <p className="text-green-800 font-bold text-lg">Berhasil Absen!</p>
          <p className="text-green-600">{result.eventName} — {result.status}</p>
        </div>
      )}

      {result?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">❌ {result.error}</p>
        </div>
      )}

      {!result?.success && !loading && <QRScanner onScan={handleScan} />}

      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Memproses absensi...</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add QR scanner for members with check-in API"
```

---

### Task 9: Member Management & Attendance History

**Files:**
- Create: `app/(dashboard)/members/page.tsx`
- Create: `app/(dashboard)/attendance/history/page.tsx`

- [ ] **Step 1: Create members page**

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
            {members?.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{m.full_name}</td>
                <td className="px-4 py-3">{m.nim}</td>
                <td className="px-4 py-3">{m.division || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {m.is_active ? 'Aktif' : 'Nonaktif'}
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

- [ ] **Step 2: Create attendance history page**

`app/(dashboard)/attendance/history/page.tsx`:
```tsx
import { createClient } from '@/lib/supabase/server'

export default async function AttendanceHistoryPage() {
  const supabase = createClient()

  const { data: attendances } = await supabase
    .from('attendances')
    .select('*, profiles(*), events(*)')
    .order('check_in_at', { ascending: false })
    .limit(100)

  const byEvent = attendances?.reduce((acc, a) => {
    const name = a.events?.name || 'Unknown'
    if (!acc[name]) acc[name] = []
    acc[name].push(a)
    return acc
  }, {} as Record<string, typeof attendances>) || {}

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Riwayat Kehadiran</h1>
      {Object.entries(byEvent).map(([name, atts]) => (
        <div key={name} className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-semibold text-lg mb-2">{name}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">Nama</th>
                <th className="py-2">NIM</th>
                <th className="py-2">Status</th>
                <th className="py-2">Metode</th>
                <th className="py-2">Waktu</th>
              </tr>
            </thead>
            <tbody>
              {atts.map((a) => (
                <tr key={a.id} className="border-b">
                  <td className="py-2">{a.profiles?.full_name}</td>
                  <td className="py-2">{a.profiles?.nim}</td>
                  <td className="py-2 font-medium">{a.status}</td>
                  <td className="py-2">{a.method}</td>
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

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add member management and attendance history"
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
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div><label className="text-sm text-gray-500">Nama</label><p className="font-medium">{profile?.full_name}</p></div>
        <div><label className="text-sm text-gray-500">NIM</label><p className="font-medium">{profile?.nim}</p></div>
        <div><label className="text-sm text-gray-500">Divisi</label><p className="font-medium">{profile?.division || '-'}</p></div>
        <div><label className="text-sm text-gray-500">Email</label><p className="font-medium">{user?.email}</p></div>
        <div><label className="text-sm text-gray-500">Status</label><p className="font-medium">{profile?.is_active ? '✅ Aktif' : '❌ Nonaktif'}</p></div>
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

### Task 11: Deploy

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/absen-app.git
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to vercel.com → Import GitHub repo
2. Add env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
3. Deploy

- [ ] **Step 3: Set first admin**

```sql
-- After first user registers
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

---

## Edge Cases & Security

| Risk | Mitigation |
|------|------------|
| Double check-in | UNIQUE(session_id, user_id) constraint |
| Late check-in | Auto-detect >15 min → 'terlambat' |
| Fake QR token | crypto.randomBytes(32) = 64 char hex, impossible to guess |
| Token from closed session | Backend checks `is_open: true` before insert |
| Race condition (double scan) | UNIQUE constraint = atomic reject |
| Session reuse | Token tied to session, session tied to event |
| Auth bypass | Backend extracts user_id from JWT, not request body |
| Free tier limits | 500MB DB ≈ 50K events + 500K attendances |

## Future Improvements

1. **Export to Excel** — Download rekap kehadiran
2. **Notification** — Email/WhatsApp reminder sebelum acara
3. **Offline PWA** — Absen tanpa internet, sync saat online
4. **GPS validation** — Hanya bisa absen dari lokasi acara
5. **Multi-organization** — Satu instansi, banyak organisasi
