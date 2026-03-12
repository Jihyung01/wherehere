'use client'

import { useState, useEffect, type ReactNode } from 'react'

/**
 * 자식은 클라이언트 마운트 후에만 렌더합니다.
 * 서버·클라이언트 첫 페인트는 fallback으로 동일하게 맞춰 하이드레이션/초기화 오류를 방지합니다.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  if (!mounted) return <>{fallback}</>
  return <>{children}</>
}
