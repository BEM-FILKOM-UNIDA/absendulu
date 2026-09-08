import { createMiddleware, createStart } from '@tanstack/react-start'

const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-XSS-Protection': '0',
}

const productionOnlyHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
}

type ApiRule = { pattern: RegExp; methods: readonly string[] }

const apiRules: ApiRule[] = [
  { pattern: /^\/api\/health$/, methods: ['GET'] },
  { pattern: /^\/api\/events$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/events\/[^/]+$/, methods: ['GET', 'PATCH', 'DELETE'] },
  { pattern: /^\/api\/events\/[^/]+\/session$/, methods: ['GET'] },
  { pattern: /^\/api\/events\/[^/]+\/session\/(open|close)$/, methods: ['POST'] },
  { pattern: /^\/api\/members\/manual$/, methods: ['POST'] },
  { pattern: /^\/api\/members\/import$/, methods: ['POST'] },
  { pattern: /^\/api\/members\/[^/]+$/, methods: ['PATCH'] },
  { pattern: /^\/api\/profile$/, methods: ['PATCH'] },
  { pattern: /^\/api\/attendance\/check-in$/, methods: ['POST'] },
]

function withSecurityHeaders(response: Response, pathname?: string) {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value)
  if (process.env.NODE_ENV === 'production') {
    for (const [name, value] of Object.entries(productionOnlyHeaders)) headers.set(name, value)
  }
  // ponytail: CSP minimal tanpa break inline data: img for QR — satu header, 1 line
  if (!headers.has('Content-Security-Policy')) {
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; media-src 'self' blob:; frame-ancestors 'none'")
  }
  // ponytail: API no-store — pathname dari middleware lebih reliable dari response.url
  if (pathname?.startsWith('/api/')) headers.set('Cache-Control', 'no-store')
  // ponytail: body may be null for redirects/204, new Response handles it
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function getApiRule(pathname: string) {
  return apiRules.find(({ pattern }) => pattern.test(pathname))
}

const requestMiddleware = createMiddleware().server(async ({ next, request, pathname }) => {
  if (pathname.startsWith('/api/')) {
    const rule = getApiRule(pathname)
    if (rule && !rule.methods.includes(request.method)) {
      return withSecurityHeaders(Response.json(
        { error: 'Method tidak diizinkan.' },
        { status: 405, headers: { Allow: rule.methods.join(', ') } },
      ))
    }
  }

  const result = await next()
  if (!result.response) return result
  return { ...result, response: withSecurityHeaders(result.response, pathname) }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [requestMiddleware],
}))
