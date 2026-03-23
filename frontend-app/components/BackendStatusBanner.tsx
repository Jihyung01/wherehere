'use client'

import { useCallback, useEffect, useState } from 'react'

const DISMISS_KEY = 'wherehere-backend-banner-dismissed'
const POLL_MS = 120_000

type HealthState = 'unknown' | 'ok' | 'down'

export function BackendStatusBanner() {
  const [state, setState] = useState<HealthState>('unknown')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  const check = useCallback(async () => {
    try {
      const r = await fetch('/api/health', { cache: 'no-store' })
      const j = await r.json().catch(() => ({}))
      setState(r.ok && j.ok === true ? 'ok' : 'down')
    } catch {
      setState('down')
    }
  }, [])

  useEffect(() => {
    check()
    const t = setInterval(check, POLL_MS)
    return () => clearInterval(t)
  }, [check])

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  if (dismissed || state === 'ok' || state === 'unknown') return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        background: 'linear-gradient(90deg, #B91C1C, #DC2626)',
        color: '#fff',
        padding: '10px 14px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        fontFamily: 'Pretendard, system-ui, sans-serif',
      }}
    >
      <span>
        서버에 연결할 수 없어요. 추천·동네 피드 등 일부 기능이 동작하지 않을 수 있어요. (백엔드 호스팅·
        <code style={{ opacity: 0.9 }}>NEXT_PUBLIC_API_URL</code> 확인)
      </span>
      <button
        type="button"
        onClick={() => {
          check()
        }}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,0.5)',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        다시 시도
      </button>
      <button
        type="button"
        onClick={dismiss}
        style={{
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'rgba(0,0,0,0.2)',
          color: '#fff',
          fontWeight: 600,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        이번 세션만 닫기
      </button>
    </div>
  )
}
