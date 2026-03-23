/**
 * 프론트 도메인에서 백엔드 생존 여부 확인 (프록시와 동일 BACKEND URL).
 * UptimeRobot 등은 백엔드 /health 를 직접 쳐도 됨.
 */
import { NextResponse } from 'next/server'

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
)

export async function GET() {
  try {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 8000)
    const r = await fetch(`${BACKEND}/health`, {
      cache: 'no-store',
      signal: ac.signal,
    }).finally(() => clearTimeout(timer))
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      return NextResponse.json(
        { ok: false, backend: data, message: 'Backend returned non-OK' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, backend: data })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return NextResponse.json(
      { ok: false, message: 'Backend unreachable', detail: message },
      { status: 503 }
    )
  }
}
