/**
 * 친구 목록/메시지 추가 동의 전용 — 메인 로그인과 분리.
 * 카카오 OAuth로 이동 (scope=friends,talk_message), redirect_uri는 /api/auth/kakao-friends-callback
 */
import { NextRequest, NextResponse } from 'next/server'

const KAKAO_AUTH = 'https://kauth.kakao.com/oauth/authorize'

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') || request.nextUrl.host || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const origin = host ? `${proto}://${host}` : request.nextUrl.origin
  const returnTo = request.nextUrl.searchParams.get('return') || ''
  const redirectUri = `${origin}/api/auth/kakao-friends-callback`
  const clientId = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || process.env.KAKAO_REST_API_KEY

  if (!clientId) {
    return new NextResponse(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><title>설정 필요</title></head><body style="font-family:sans-serif;padding:2rem;max-width:480px;margin:0 auto;"><h2>카카오 API 키가 설정되지 않았습니다</h2><p>Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 에서 <strong>NEXT_PUBLIC_KAKAO_MAP_KEY</strong> 또는 <strong>KAKAO_REST_API_KEY</strong> 를 추가한 뒤 재배포하세요.</p><p><a href="${origin}/">앱으로 돌아가기</a></p></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  const scope = 'profile_nickname profile_image account_email friends talk_message'
  const url = new URL(KAKAO_AUTH)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', returnTo || 'friends-consent')
  url.searchParams.set('prompt', 'consent')
  return NextResponse.redirect(url.toString(), 302)
}
