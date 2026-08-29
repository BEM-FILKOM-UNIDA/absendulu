import type { NextRequest } from 'next/server'

/**
 * Cookie-authenticated mutations must originate from this application.
 * Missing Origin/Referer is allowed for trusted server-to-server calls.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (origin) return origin === request.nextUrl.origin

  const referer = request.headers.get('referer')
  if (referer) {
    try {
      return new URL(referer).origin === request.nextUrl.origin
    } catch {
      return false
    }
  }

  return true
}
