/**
 * OAuth 콜백 (카카오/구글 로그인 후 Supabase가 리다이렉트하는 URL)
 * code를 세션으로 교환하고 홈 또는 온보딩으로 보냄
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const isOnboarded = (user?.user_metadata?.is_onboarded as boolean) ?? false
      const redirectTo = isOnboarded ? next : '/onboarding'
      response.headers.set('location', `${origin}${redirectTo}`)
      response.headers.set('Cache-Control', 'no-store, no-cache')
      return response
    }

    console.error('OAuth exchange error:', error.message)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
