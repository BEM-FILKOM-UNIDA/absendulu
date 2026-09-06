import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireAdminAuth } from '../auth-guard'
import type { SupabaseClient } from '@supabase/supabase-js'

// ponytail: deep Members module — pure fetchMembers
export async function fetchMembers(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('profiles').select('id, full_name, nim, email, user_type, account_status, is_active').order('full_name').limit(1000)
  if (error) throw new Error(`Gagal memuat anggota: ${error.message}`)
  return data ?? []
}

export const getMembersData = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdminAuth()
  const members = await fetchMembers(createAdminClient())
  return { members }
})
