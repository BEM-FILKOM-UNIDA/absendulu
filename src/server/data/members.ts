import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../supabase-context'
import { requireAdminAuth } from '../auth-guard'

export const getMembersData = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdminAuth()
  const { data: members } = await createAdminClient().from('profiles').select('id, full_name, nim, email, user_type, account_status, is_active').order('full_name').limit(1000)
  return { members: members ?? [] }
})
