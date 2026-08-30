import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRole } from '@/lib/auth/roles'
import { normalizeProfileAccess } from '@/lib/auth/profile-access'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublic = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/auth/callback')
  if (isPublic) return NextResponse.next()

  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const userId = typeof claimsData.claims.sub === 'string' ? claimsData.claims.sub : null
  if (!userId) return supabaseResponse

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, account_status, is_active')
    .eq('id', userId)
    .maybeSingle()
  const access = normalizeProfileAccess(profile)

  if (access?.account_status === 'active' && access.is_active && !isAdminRole(access.role) && pathname !== '/scan') {
    return NextResponse.redirect(new URL('/scan', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
