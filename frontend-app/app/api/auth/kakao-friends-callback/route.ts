/**
 * 친구/메시지 동의 후 콜백 — code를 토큰으로 교환 후 앱으로 리다이렉트 (kakao_friends_token 전달).
 * 메인 로그인(auth/callback)과 무관.
 */
import { NextRequest, NextResponse } from 'next/server'

const KAKAO_TOKEN = 'https://kauth.kakao.com/oauth/token'

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.nextUrl.host || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = host ? `${proto}://${host}` : request.nextUrl.origin
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const kakaoError = searchParams.get('error')
  if (kakaoError) {
    return NextResponse.redirect(origin + `/?error=kakao_consent_denied&reason=${encodeURIComponent(kakaoError)}`)
  }

  const state = searchParams.get('state') || ''
  const redirectToApp = (token: string) => {
    const url = new URL('/', origin)
    url.searchParams.set('kakao_friends_token', token)
    if (state) url.searchParams.set('return', state)
    return NextResponse.redirect(url.toString())
  }

  if (!code) {
    return NextResponse.redirect(origin + '/?error=kakao_consent_no_code')
  }

  const redirectUri = `${origin}/api/auth/kakao-friends-callback`
  const clientId = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || process.env.KAKAO_REST_API_KEY
  const clientSecret = process.env.KAKAO_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(origin + '/?error=kakao_config')
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  })

  try {
    const res = await fetch(KAKAO_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await res.json()
    const token = data.access_token
    if (token) return redirectToApp(token)
    const errCode = data.error ? encodeURIComponent(data.error) : ''
    const errDesc = data.error_description ? encodeURIComponent(data.error_description) : ''
    return NextResponse.redirect(origin + `/?error=kakao_consent_exchange${errCode ? `&kakao_error=${errCode}` : ''}${errDesc ? `&kakao_desc=${errDesc}` : ''}`)
  } catch (_) {}

  return NextResponse.redirect(origin + '/?error=kakao_consent_exchange')
}
