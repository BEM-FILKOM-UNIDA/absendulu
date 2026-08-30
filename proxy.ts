import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRole } from '@/lib/auth/roles'
import { isProfileComplete } from '@/lib/auth/identity'
import { normalizeProfileAccess } from '@/lib/auth/profile-access'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isPublic = pathname === '/' || pathname === '/login' || pathname === '/auth/callback'
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
    .select('role, user_type, nim, full_name, account_status, is_active')
    .eq('id', userId)
    .maybeSingle()
  const access = normalizeProfileAccess(profile)

  if (!access || !access.is_active || access.account_status === 'disabled') {
    if (pathname !== '/account-disabled') return NextResponse.redirect(new URL('/account-disabled', request.url))
    return supabaseResponse
  }

  if (access.account_status === 'invited') {
    const onboardingPath = isProfileComplete(profile) ? '/waiting-approval' : '/complete-profile'
    const allowed = pathname === '/complete-profile' || pathname === '/waiting-approval'
    if (!allowed || pathname !== onboardingPath) return NextResponse.redirect(new URL(onboardingPath, request.url))
    return supabaseResponse
  }

  if (!isAdminRole(access.role)) {
    if (pathname === '/dashboard') return NextResponse.redirect(new URL('/mahasiswa', request.url))
    const isStudentRoute = pathname === '/mahasiswa'
      || pathname === '/scan'
      || pathname === '/events'
      || pathname.startsWith('/events/')
      || pathname === '/attendance/history'
      || pathname.startsWith('/attendance/history/')
      || pathname === '/profile'
    if (!isStudentRoute) return NextResponse.redirect(new URL('/mahasiswa', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
