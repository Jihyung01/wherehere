/**
 * Login Page
 */

import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'
import { SocialLogin } from '@/components/auth/social-login'

export const metadata = {
  title: '로그인 - WhereHere',
  description: '로그인하고 맞춤형 장소 추천을 받아보세요',
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                WhereHere
              </span>
            </h1>
            <p className="mt-2 text-sm text-gray-600">초개인화 장소 추천 서비스</p>
          </Link>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
            <p className="mt-2 text-sm text-gray-600">
              계정에 로그인하여 맞춤형 추천을 받아보세요
            </p>
          </div>

          <LoginForm />

          <div className="mt-6">
            <SocialLogin />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500">
          © 2026 WhereHere. All rights reserved.
        </p>
      </div>
    </div>
  )
}
