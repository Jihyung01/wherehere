/**
 * 구글 Redirect URI가 /api/auth/callback/google 로 설정된 경우
 * Supabase용 콜백(/auth/callback)으로 쿼리 그대로 넘깁니다.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const redirectUrl = new URL('/auth/callback', request.url)
  searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value)
  })
  return NextResponse.redirect(redirectUrl.toString())
}
