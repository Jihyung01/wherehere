/**
 * 카카오 Redirect URI가 /api/auth/callback/kakao 로 설정된 경우
 * Supabase용 콜백(/auth/callback)으로 쿼리 그대로 넘깁니다.
 * (Supabase 사용 시에는 카카오 개발자 콘솔 Redirect URI를
 *  Supabase 제공 URL로 설정하는 것을 권장합니다.)
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
