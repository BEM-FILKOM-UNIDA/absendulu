/**
 * CSRF origin check for state-mutating API routes (POST, PATCH, DELETE).
 *
 * All our mutation endpoints are called via fetch() from JavaScript, so browsers
 * always send the Origin header for those requests. We rely on Origin alone and
 * do NOT fall back to Referer: the Referer header is optional, can be stripped by
 * privacy tools or proxies, and is weaker than Origin as a CSRF signal.
 *
 * Same-origin fetch() calls also send Origin (set to the page origin), so
 * legitimate first-party requests are never rejected by this check.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  return origin === new URL(request.url).origin
}
