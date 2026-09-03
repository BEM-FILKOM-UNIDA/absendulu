import type { SupabaseClient, User } from '@supabase/supabase-js'

const MAX_PAGES = 50
const PER_PAGE = 1000

/**
 * Paginate through all Supabase Auth users.
 * Has a safety limit of MAX_PAGES to prevent infinite loops.
 */
export async function listAllAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = []
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE })
    if (result.error) throw result.error
    users.push(...result.data.users)
    if (result.data.users.length < PER_PAGE) return users
  }
  return users
}
