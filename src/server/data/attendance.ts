import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireActiveAuth } from '../auth-guard'
import { cached } from '~/lib/cache'
import { isAdminRole } from '~/lib/auth/roles'
import type { SupabaseClient } from '@supabase/supabase-js'

// ponytail: deep Attendance module — pure fetchHistory with injected client, per-user cache 20s
export async function fetchHistory(supabase: SupabaseClient, auth: Awaited<ReturnType<typeof requireActiveAuth>>) {
  const isAdmin = isAdminRole(auth.profile.role)
  const key = `history:${isAdmin ? 'admin' : auth.user.id}`
  return cached(key, 20_000, async () => {
    let query = supabase.from('attendances').select('id, user_id, status, method, check_in_at, notes, events(name)').order('check_in_at', { ascending: false }).limit(isAdmin ? 100 : 50)
    if (!isAdmin) query = query.eq('user_id', auth.user.id)
    const { data, error } = await query
    if (error) throw new Error(`Gagal memuat riwayat: ${error.message}`)
    const rows = data ?? []
    const userIds = isAdmin ? [...new Set(rows.map((item) => item.user_id))] : []
    const { data: profiles, error: profilesError } = userIds.length > 0 ? await supabase.from('profiles').select('id, full_name, nim').in('id', userIds) : { data: [], error: null }
    if (profilesError) throw new Error(`Gagal memuat profil: ${profilesError.message}`)
    const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]))
    return { isAdmin, attendances: rows.map((a) => ({ ...a, profiles: isAdmin ? profilesById.get(a.user_id) ?? null : null })) }
  })
}

export const getHistoryData = createServerFn({ method: 'GET' }).handler(async () => {
  const auth = await requireActiveAuth()
  return fetchHistory(createAdminClient(), auth)
})
