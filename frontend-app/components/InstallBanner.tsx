'use client'

import { useState, useEffect } from 'react'

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DAYS = 7

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 이미 최근에 닫은 경우 표시 안 함
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const daysPassed = (Date.now() - Number(dismissed)) / 86400000
      if (daysPassed < DISMISS_DAYS) return
    }

    // 이미 standalone(설치된 앱)으로 실행 중이면 표시 안 함
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((window.navigator as any).standalone) return

    // iOS Safari 감지
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    if (ios) {
      setIsIOS(true)
      setShow(true)
      return
    }

    // Android / Chrome Desktop: beforeinstallprompt 이벤트 대기
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    setShow(false)
    if (outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  if (!show) return null

  return (
    <div
      style={{ bottom: '76px' }}
      className="fixed left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-2xl"
    >
      {/* 아이콘 */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-orange-500 text-2xl">
        📍
      </div>

      {/* 텍스트 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">WhereHere 앱 설치</p>
        {isIOS ? (
          <p className="mt-0.5 text-xs text-gray-500">
            Safari 하단 <strong>공유(□↑)</strong> 버튼 → <strong>홈 화면에 추가</strong>
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-gray-500">홈 화면에 추가하면 더 빠르게 실행돼요</p>
        )}
      </div>

      {/* 설치 버튼 (iOS 제외) */}
      {!isIOS && (
        <button
          onClick={handleInstall}
          className="flex-shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600"
        >
          설치
        </button>
      )}

      {/* 닫기 */}
      <button
        onClick={handleDismiss}
        aria-label="닫기"
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </div>
  )
}
