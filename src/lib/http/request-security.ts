export function isSameOrigin(request: Request): boolean {
  const requestOrigin = new URL(request.url).origin
  const origin = request.headers.get('origin')
  if (origin) return origin === requestOrigin

  const referer = request.headers.get('referer')
  if (!referer) return false

  try {
    return new URL(referer).origin === requestOrigin
  } catch {
    return false
  }
}
