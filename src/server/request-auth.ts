import { createAdminClient, createRequestSupabase } from './supabase-context'
import { isActiveAdminProfile } from '~/lib/auth/roles'

export { createRequestSupabase }

export async function getRequestUser(request: Request, responseCookies: string[]) {
  const supabase = createRequestSupabase(request, responseCookies)
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function getRequestAdmin(request: Request, responseCookies: string[]) {
  const { supabase, user } = await getRequestUser(request, responseCookies)
  if (!user) return { supabase, user: null, isAdmin: false }
  const { data: profile } = await createAdminClient().from('profiles').select('role, account_status, is_active').eq('id', user.id).maybeSingle()
  return { supabase, user, isAdmin: isActiveAdminProfile(profile) }
}

export function responseWithCookies(body: unknown, status: number, responseCookies: string[]) {
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  for (const cookie of responseCookies) headers.append('Set-Cookie', cookie)
  return Response.json(body, { status, headers })
}
