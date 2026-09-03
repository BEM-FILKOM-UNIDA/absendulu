import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth, requireAdminAuth } from '../auth-guard'

export const getEventsData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  let query = createAdminClient().from('events').select('id, name, description, event_date, start_time, end_time, location, status').order('event_date', { ascending: !isAdmin }).order('start_time', { ascending: true }).limit(100)
  if (!isAdmin) query = query.eq('status', 'active')
  const { data } = await query
  return { isAdmin, events: data ?? [] }
})

export const getEventDetailData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  const admin = createAdminClient()
  let eventQuery = admin.from('events').select('id, name, description, event_date, start_time, end_time, location, status').eq('id', data.id)
  if (!isAdmin) eventQuery = eventQuery.eq('status', 'active')
  const { data: event } = await eventQuery.maybeSingle()
  if (!event) throw new Error('Event not found')
  const { data: session } = isAdmin ? await admin.from('attendance_sessions').select('id, event_id, is_open').eq('event_id', data.id).eq('is_open', true).maybeSingle() : { data: null }
  const { count } = isAdmin && session ? await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id) : { count: 0 }
  return { event, isAdmin, session, attendanceCount: count ?? 0 }
})

export const getQrData = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
  await requireAdminAuth()
  const admin = createAdminClient()
  const { data: event } = await admin.from('events').select('id, name, event_date, start_time, end_time, location, status').eq('id', data.id).maybeSingle()
  if (!event) throw new Error('Event not found')
  const { data: session } = await admin.from('attendance_sessions').select('id, event_id, is_open, qr_token').eq('event_id', data.id).eq('is_open', true).maybeSingle()
  if (!session) return { event, session: null, attendanceCount: 0 }
  const { count } = await admin.from('attendances').select('id', { count: 'exact', head: true }).eq('session_id', session.id)
  return { event, session, attendanceCount: count ?? 0 }
})
