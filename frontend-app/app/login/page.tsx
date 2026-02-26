/**
 * Login Page – 카카오/구글 주력, 이메일 로그인은 접이식
 */

import Link from 'next/link'
import { LoginPageClient } from '@/components/auth/login-page-client'

export const metadata = {
  title: '로그인 - WhereHere',
  description: '로그인하고 맞춤형 장소 추천을 받아보세요',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12 text-gray-900">
      <div className="w-full max-w-md text-gray-900">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block text-gray-900">
            <h1 className="text-4xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                WhereHere
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">초개인화 장소 추천 서비스</p>
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl text-gray-900">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
            <p className="mt-2 text-sm text-gray-600">
              개성에 맞는 추천을 받아보세요
            </p>
          </div>

          <LoginPageClient />
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          © 2026 WhereHere. All rights reserved.
        </p>
      </div>
    </div>
  )
}
