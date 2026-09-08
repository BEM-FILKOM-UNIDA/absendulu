import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth, requireAdminAuth } from '../auth-guard'
import { cached, TTL } from '~/lib/cache'
import { isAdminRole } from '~/lib/auth/roles'
import type { SupabaseClient } from '@supabase/supabase-js'

// ponytail: deep Events module — single seam for all event queries, error not swallowed
// listEvents/getEventDetail are pure (supabase injected) so tests use fake client, no real DB

export type EventRow = {
  id: string
  name: string
  description: string | null
  event_date: string
  start_time: string
  end_time: string | null
  location: string | null
  status: string
}

export async function listEvents(supabase: SupabaseClient, isAdmin: boolean) {
  return cached(`events:${isAdmin ? 'admin' : 'user'}`, TTL.events, async () => {
    let query = supabase
      .from('events')
      .select('id, name, description, event_date, start_time, end_time, location, status')
      .order('event_date', { ascending: !isAdmin })
      .order('start_time', { ascending: true })
      .limit(100)
    if (!isAdmin) query = query.eq('status', 'active')
    const { data, error } = await query
    if (error) throw new Error(`Gagal memuat acara: ${error.message}`)
    return (data ?? []) as EventRow[]
  })
}

export async function getEventRow(supabase: SupabaseClient, id: string, isAdmin: boolean) {
  let q = supabase.from('events').select('id, name, description, event_date, start_time, end_time, location, status').eq('id', id)
  if (!isAdmin) q = q.eq('status', 'active')
  const { data, error } = await q.maybeSingle()
  if (error) throw new Error(`Gagal memuat acara: ${error.message}`)
  return data
}

export const getEventsData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = isAdminRole(auth.profile.role)
  const events = await listEvents(createAdminClient(), isAdmin)
  return { isAdmin, events }
})

export const getEventDetailData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const auth = await requireActiveAuth()
    const isAdmin = isAdminRole(auth.profile.role)
    const admin = createAdminClient()
    const event = await getEventRow(admin, data.id, isAdmin)
    if (!event) throw new Error('Event not found')
    const { data: session, error: sessionError } = isAdmin
      ? await admin.from('attendance_sessions').select('id, event_id, is_open').eq('event_id', data.id).eq('is_open', true).maybeSingle()
      : { data: null, error: null }
    if (sessionError) throw new Error(`Gagal memuat sesi: ${sessionError.message}`)
    const { count, error: countError } = isAdmin && session ? await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id) : { count: 0, error: null }
    if (countError) throw new Error(`Gagal menghitung kehadiran: ${countError.message}`)
    return { event, isAdmin, session, attendanceCount: count ?? 0 }
  })

export const getQrData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    await requireAdminAuth()
    const admin = createAdminClient()
    const { data: event, error: eventError } = await admin.from('events').select('id, name, event_date, start_time, end_time, location, status').eq('id', data.id).maybeSingle()
    if (eventError) throw new Error(`Gagal memuat acara: ${eventError.message}`)
    if (!event) throw new Error('Event not found')
    const { data: session, error: sessionError } = await admin.from('attendance_sessions').select('id, event_id, is_open, qr_token').eq('event_id', data.id).eq('is_open', true).maybeSingle()
    if (sessionError) throw new Error(`Gagal memuat sesi: ${sessionError.message}`)
    if (!session) return { event, session: null, attendanceCount: 0 }
    const { count, error: countError } = await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
    if (countError) throw new Error(`Gagal menghitung kehadiran: ${countError.message}`)
    return { event, session, attendanceCount: count ?? 0 }
  })
