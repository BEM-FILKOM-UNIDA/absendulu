import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type SessionCookie = {
  name: string
  value: string
  options?: CookieOptions
}

export async function GET(request: NextRequest) {
  const oauthError = request.nextUrl.searchParams.get('error')
  if (oauthError) return NextResponse.redirect(new URL('/login?error=google', request.url))

  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login?error=invalid', request.url))

  const sessionCookies: SessionCookie[] = []
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          sessionCookies.push(...cookiesToSet)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        },
      },
    },
  )

  const redirectWithSession = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url))
    sessionCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) return redirectWithSession('/login?error=expired')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirectWithSession('/login?error=invalid')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('account_status, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return redirectWithSession('/login?error=profile')

  if (!profile || profile.account_status === 'disabled' || !profile.is_active) {
    await supabase.auth.signOut()
    return redirectWithSession('/login?disabled=1')
  }

  if (profile.account_status !== 'active') {
    await supabase.auth.signOut()
    return redirectWithSession('/login?pending=1')
  }

  return redirectWithSession('/dashboard')
}
