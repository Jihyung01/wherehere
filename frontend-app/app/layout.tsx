import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ToastProvider } from '@/components/ui/toast'
import { InstallBanner } from '@/components/InstallBanner'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: 'WhereHere - AI 기반 장소 탐험',
  description: '당신만의 서울을 발견하세요. AI가 추천하는 숨겨진 장소를 탐험하세요.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WhereHere',
  },
  icons: {
    icon: '/app-icon.png',
    apple: '/app-icon.png',
  },
  openGraph: {
    title: 'WhereHere - AI 기반 장소 탐험',
    description: '당신만의 서울을 발견하세요. AI가 추천하는 숨겨진 장소를 탐험하세요.',
    url: 'https://wherehere-seven.vercel.app',
    siteName: 'WhereHere',
    images: [
      {
        url: 'https://wherehere-seven.vercel.app/app-icon.png',
        width: 512,
        height: 512,
        alt: 'WhereHere 앱 아이콘',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'WhereHere - AI 기반 장소 탐험',
    description: '당신만의 서울을 발견하세요.',
    images: ['https://wherehere-seven.vercel.app/app-icon.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
        <ToastProvider />
        <InstallBanner />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
