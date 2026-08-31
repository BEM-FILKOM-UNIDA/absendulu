import type { NextRequest } from 'next/server'

/**
 * Cookie-authenticated mutations must originate from this application.
 *
 * Browsers send Origin for fetch requests and normally send Referer for HTML
 * form submissions. A missing header is rejected because accepting it turns
 * this check into a bypass for clients that intentionally omit both headers.
 * Server-to-server callers should use a separate authenticated integration,
 * not a user's cookie session.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (origin) return origin === request.nextUrl.origin

  const referer = request.headers.get('referer')
  if (!referer) return false

  try {
    return new URL(referer).origin === request.nextUrl.origin
  } catch {
    return false
  }
}
