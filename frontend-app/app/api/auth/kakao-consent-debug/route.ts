/**
 * 배포 환경에서 카카오 consent 설정이 적용되는지 확인용. 브라우저에서 이 URL 열어보면 됨.
 * GET /api/auth/kakao-consent-debug
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.nextUrl.host || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = host ? `${proto}://${host}` : request.nextUrl.origin
  const clientId = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || process.env.KAKAO_REST_API_KEY
  const redirectUri = `${origin}/api/auth/kakao-friends-callback`

  const body = {
    clientIdSet: !!clientId,
    clientIdPrefix: clientId ? clientId.slice(0, 8) + '...' : null,
    redirectUri,
    consentUrl: clientId
      ? `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile_nickname%20profile_image%20account_email%20friends%20talk_message&state=kakao-api-test&prompt=consent`
      : null,
  }

  return NextResponse.json(body, { status: 200 })
}
