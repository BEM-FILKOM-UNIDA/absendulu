import type { CookieOptions } from '@supabase/ssr'

/**
 * Parse raw cookie header string into name/value pairs.
 * Used by server-side Supabase clients to read cookies from incoming requests.
 */
export function readCookies(request: Request): Array<{ name: string; value: string }> {
  return request.headers
    .get('cookie')
    ?.split(';')
    .filter(Boolean)
    .map((item) => {
      const index = item.indexOf('=')
      return {
        name: (index >= 0 ? item.slice(0, index) : item).trim(),
        value: index >= 0 ? item.slice(index + 1).trim() : '',
      }
    }) ?? []
}

/**
 * Serialize a cookie into a Set-Cookie header value.
 * URL-encodes the value to prevent header injection from special characters.
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`, `SameSite=${options.sameSite ?? 'lax'}`]
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.httpOnly ?? true) parts.push('HttpOnly')
  if (options.secure ?? process.env.NODE_ENV === 'production') parts.push('Secure')
  if (options.priority) parts.push(`Priority=${options.priority}`)
  if (options.partitioned) parts.push('Partitioned')
  return parts.join('; ')
}
