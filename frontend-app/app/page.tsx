import { CompleteApp } from '@/components/complete-app'
import { AppProvider } from '@/contexts/AppContext'

export default function Home() {
  return <AppProvider><CompleteApp /></AppProvider>
}
