import { isSameOrigin } from '~/lib/http/request-security'
import { getRequestAdmin, responseWithCookies } from './request-auth'

type WithAdminApiOptions = {
  parseBody?: boolean
  requireSameOrigin?: boolean
  forbiddenMessage?: string
  invalidBodyMessage?: string
}

type AdminApiContext = {
  isAdmin: true
  user: NonNullable<Awaited<ReturnType<typeof getRequestAdmin>>['user']>
  body: unknown
  cookies: string[]
}

export async function withAdminApi(request: Request, options: WithAdminApiOptions = {}): Promise<Response | AdminApiContext> {
  const cookies: string[] = []
  if (options.requireSameOrigin !== false && !isSameOrigin(request)) {
    return responseWithCookies({ error: 'Origin request tidak valid.' }, 403, cookies)
  }
  const admin = await getRequestAdmin(request, cookies)
  if (!admin.isAdmin || !admin.user) {
    return responseWithCookies({ error: options.forbiddenMessage ?? 'Akses ditolak' }, 403, cookies)
  }
  if (options.parseBody === false) {
    return { isAdmin: true, user: admin.user, body: undefined, cookies }
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return responseWithCookies({ error: options.invalidBodyMessage ?? 'Body request tidak valid.' }, 400, cookies)
  }
  return { isAdmin: true, user: admin.user, body, cookies }
}
