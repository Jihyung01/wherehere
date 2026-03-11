'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CompleteApp } from '@/components/complete-app'

export function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <CompleteApp />
    </ErrorBoundary>
  )
}
