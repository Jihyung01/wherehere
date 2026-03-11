import { AppProvider } from '@/contexts/AppContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CompleteApp } from '@/components/complete-app'

export default function Home() {
  return (
    <AppProvider>
      <ErrorBoundary>
        <CompleteApp />
      </ErrorBoundary>
    </AppProvider>
  )
}
