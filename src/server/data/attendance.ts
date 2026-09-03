import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth } from '../auth-guard'

export const getHistoryData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  const isAdmin = auth.profile.role === 'admin' || auth.profile.role === 'admin_bem'
  let query = createAdminClient().from('attendances').select('id, user_id, status, method, check_in_at, notes, events(name)').order('check_in_at', { ascending: false }).limit(isAdmin ? 100 : 50)
  if (!isAdmin) query = query.eq('user_id', auth.user.id)
  const { data } = await query
  const rows = data ?? []
  const userIds = isAdmin ? [...new Set(rows.map((item) => item.user_id))] : []
  const { data: profiles } = userIds.length > 0 ? await createAdminClient().from('profiles').select('id, full_name, nim').in('id', userIds) : { data: [] }
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return { isAdmin, attendances: rows.map((attendance) => ({ ...attendance, profiles: isAdmin ? profilesById.get(attendance.user_id) ?? null : null })) }
})
