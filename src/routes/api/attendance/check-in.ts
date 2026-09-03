import { createFileRoute } from '@tanstack/react-router'
import { createAdminClient } from '~/server/supabase'
import { createRequestSupabase } from '~/server/supabase-context'
import { normalizeProfileAccess } from '~/lib/auth/profile-access'
import { getSchedulePosition } from '~/lib/events/schedule'
import { isSameOrigin } from '~/lib/http/request-security'

function failure(error: string, status: number, errorCode: string, cookies: string[]) {
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return Response.json({ error, errorCode }, { status, headers })
}

function getJakartaDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` }
}

export const Route = createFileRoute('/api/attendance/check-in')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const responseCookies: string[] = []
        if (!isSameOrigin(request)) return failure('Origin request tidak valid.', 403, 'ORIGIN_INVALID', responseCookies)

        const supabase = createRequestSupabase(request, responseCookies)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return failure('Sesi login tidak ditemukan. Silakan login ulang.', 401, 'UNAUTHENTICATED', responseCookies)

        const admin = createAdminClient()
        const { data: profile, error: profileError } = await admin.from('profiles').select('account_status, is_active').eq('id', user.id).maybeSingle()
        if (profileError) return failure('Profil pengguna gagal diperiksa. Coba lagi.', 500, 'PROFILE_LOOKUP_FAILED', responseCookies)
        const access = normalizeProfileAccess(profile)
        if (!access || access.account_status !== 'active' || !access.is_active) return failure('Akun belum aktif atau sudah dinonaktifkan.', 403, 'ACCOUNT_INACTIVE', responseCookies)

        let body: unknown
        try { body = await request.json() } catch { return failure('Body request tidak valid.', 400, 'INVALID_REQUEST_BODY', responseCookies) }
        const qrToken = body && typeof body === 'object' && 'qrToken' in body && typeof body.qrToken === 'string' ? body.qrToken.trim() : ''
        if (qrToken.length < 16 || qrToken.length > 128) return failure('QR token tidak valid.', 400, 'INVALID_QR_TOKEN', responseCookies)

        const { data: session, error: sessionError } = await admin.from('attendance_sessions').select('id, event_id, is_open, events!inner(name, event_date, start_time, end_time, status)').eq('qr_token', qrToken).eq('is_open', true).maybeSingle()
        if (sessionError) return failure('Sesi QR gagal diperiksa. Coba lagi.', 500, 'SESSION_LOOKUP_FAILED', responseCookies)
        if (!session) return failure('QR Code tidak valid atau sesi sudah ditutup.', 400, 'QR_SESSION_INVALID', responseCookies)

        const event = Array.isArray(session.events) ? session.events[0] : session.events
        if (!event || event.status !== 'active') return failure('Acara tidak sedang aktif.', 400, 'EVENT_INACTIVE', responseCookies)

        const { data: existing, error: existingError } = await admin.from('attendances').select('id').eq('event_id', session.event_id).eq('user_id', user.id).limit(1).maybeSingle()
        if (existingError) return failure('Riwayat absensi gagal diperiksa. Coba lagi.', 500, 'ATTENDANCE_LOOKUP_FAILED', responseCookies)
        if (existing) return failure('Sudah melakukan absensi untuk acara ini.', 409, 'ALREADY_CHECKED_IN', responseCookies)

        const jakartaNow = getJakartaDateTime()
        const schedule = getSchedulePosition(event.event_date, event.start_time, event.end_time, jakartaNow.date, jakartaNow.time)
        if (!schedule || schedule.nowMinutes < schedule.startMinutes) return failure('Absensi belum dibuka. Tunggu sampai waktu acara dimulai.', 400, 'EVENT_NOT_STARTED', responseCookies)
        if (schedule.endMinutes !== null && schedule.nowMinutes > schedule.endMinutes) return failure('Waktu absensi acara sudah berakhir.', 400, 'EVENT_ENDED', responseCookies)
        if (schedule.endMinutes === null && jakartaNow.date !== event.event_date) return failure('Waktu absensi acara sudah berakhir.', 400, 'EVENT_ENDED', responseCookies)

        const status = schedule.nowMinutes - schedule.startMinutes > 15 ? 'terlambat' : 'hadir'
        const { error } = await admin.from('attendances').insert({ session_id: session.id, event_id: session.event_id, user_id: user.id, status, method: 'QR_CODE', check_in_at: new Date().toISOString() })
        if (error) {
          if (error.code === '23505') return failure('Sudah melakukan absensi.', 409, 'ALREADY_CHECKED_IN', responseCookies)
          return failure('Gagal mencatat kehadiran.', 500, 'ATTENDANCE_INSERT_FAILED', responseCookies)
        }

        const headers = new Headers({ 'Cache-Control': 'no-store' })
        for (const cookie of responseCookies) headers.append('Set-Cookie', cookie)
        return Response.json({ success: true, status, eventName: event.name }, { headers })
      },
    },
  },
})
