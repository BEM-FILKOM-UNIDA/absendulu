import { createMiddleware, createStart } from '@tanstack/react-start'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

type ApiRule = { pattern: RegExp; methods: readonly string[] }

const apiRules: ApiRule[] = [
  { pattern: /^\/api\/health$/, methods: ['GET'] },
  { pattern: /^\/api\/events$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/events\/[^/]+$/, methods: ['GET', 'DELETE'] },
  { pattern: /^\/api\/events\/[^/]+\/session$/, methods: ['GET'] },
  { pattern: /^\/api\/events\/[^/]+\/session\/(open|close)$/, methods: ['POST'] },
  { pattern: /^\/api\/members\/manual$/, methods: ['POST'] },
  { pattern: /^\/api\/members\/import$/, methods: ['POST'] },
  { pattern: /^\/api\/members\/[^/]+$/, methods: ['PATCH'] },
  { pattern: /^\/api\/profile$/, methods: ['PATCH'] },
  { pattern: /^\/api\/attendance\/check-in$/, methods: ['POST'] },
]

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value)
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
  return { ...result, response: withSecurityHeaders(result.response) }
})

export const startInstance = createStart(() => ({
  requestMiddleware: [requestMiddleware],
}))
