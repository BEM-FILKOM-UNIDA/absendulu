import { createServerFn } from '@tanstack/react-start'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { createAdminClient } from './supabase'
import { normalizeProfileAccess } from '~/lib/auth/profile-access'
import { isAdminRole } from '~/lib/auth/roles'

export type AuthProfile = {
  role: string | null
  account_status: 'invited' | 'active' | 'disabled'
  is_active: boolean
}

export type AuthSnapshot = {
  user: { id: string; email: string | null } | null
  profile: AuthProfile | null
}

function readCookies(request: Request) {
  return request.headers.get('cookie')?.split(';').filter(Boolean).map((item) => {
    const index = item.indexOf('=')
    return {
      name: (index >= 0 ? item.slice(0, index) : item).trim(),
      value: index >= 0 ? item.slice(index + 1).trim() : '',
    }
  }) ?? []
}

function serializeCookie(name: string, value: string, options: CookieOptions = {}) {
  const parts = [`${name}=${value}`, `Path=${options.path ?? '/'}`, `SameSite=${options.sameSite ?? 'lax'}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.httpOnly ?? true) parts.push('HttpOnly')
  if (options.secure ?? process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

async function readAuth(): Promise<AuthSnapshot> {
  const request = getRequest()
  const responseCookies: Array<{ name: string; value: string; options?: CookieOptions }> = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => readCookies(request),
        setAll: (cookies) => {
          responseCookies.push(...cookies)
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role, account_status, is_active').eq('id', user.id).maybeSingle()
    : { data: null }

  if (responseCookies.length > 0) {
    setResponseHeader('Set-Cookie', responseCookies.map(({ name, value, options }) => serializeCookie(name, value, options)))
  }

  return {
    user: user ? { id: user.id, email: user.email ?? null } : null,
    profile: normalizeProfileAccess(profile),
  }
}

export const getCurrentAuth = createServerFn({ method: 'GET' }).handler(readAuth)

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await readAuth()
  if (!auth.user || !auth.profile || auth.profile.account_status !== 'active' || !auth.profile.is_active) {
    throw new Error('Unauthorized')
  }

  const admin = createAdminClient()
  const [eventsResult, profilesResult, sessionsResult] = await Promise.all([
    admin.from('events').select('id, name, event_date, start_time, status, location').order('event_date', { ascending: false }).limit(4),
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('attendance_sessions').select('id').eq('is_open', true),
  ])
  const sessionIds = sessionsResult.data?.map((session) => session.id) ?? []
  const { count: checkIns } = sessionIds.length > 0
    ? await admin.from('attendances').select('id', { count: 'exact', head: true }).in('session_id', sessionIds)
    : { count: 0 }

  return {
    auth,
    isAdmin: isAdminRole(auth.profile.role),
    events: eventsResult.data ?? [],
    stats: [
      { label: 'Acara terdekat', value: eventsResult.data?.length ?? 0, note: 'tercatat di Absendulu' },
      { label: 'Mahasiswa', value: profilesResult.count ?? 0, note: 'terdaftar di FILKOM' },
      { label: 'Absensi aktif', value: sessionIds.length, note: 'sedang dibuka' },
      { label: 'Sudah hadir', value: checkIns ?? 0, note: 'di acara berjalan' },
    ],
  }
})

export const getStudentHomeData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await readAuth()
  if (!auth.user || !auth.profile || auth.profile.account_status !== 'active' || !auth.profile.is_active) {
    throw new Error('Unauthorized')
  }

  const admin = createAdminClient()
  const [{ data: profile }, { data: events }, { data: attendance }] = await Promise.all([
    admin.from('profiles').select('id, full_name, nim, role, account_status, is_active, email').eq('id', auth.user.id).maybeSingle(),
    admin.from('events').select('id, name, event_date, start_time, location').eq('status', 'active').order('event_date', { ascending: true }).order('start_time', { ascending: true }).limit(8),
    admin.from('attendances').select('id, status, method, check_in_at, events(name)').eq('user_id', auth.user.id).order('check_in_at', { ascending: false }).limit(5),
  ])
  const eventIds = events?.map((event) => event.id) ?? []
  const { data: openSessions } = eventIds.length > 0
    ? await admin.from('attendance_sessions').select('event_id').in('event_id', eventIds).eq('is_open', true)
    : { data: [] }

  return {
    auth,
    profile,
    events: events ?? [],
    openEventIds: (openSessions ?? []).map((session) => session.event_id),
    attendance: attendance ?? [],
  }
})
