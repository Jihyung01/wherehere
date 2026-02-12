/**
 * Signup Page
 */

import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'
import { SocialLogin } from '@/components/auth/social-login'

export const metadata = {
  title: '회원가입 - WhereHere',
  description: '회원가입하고 맞춤형 장소 추천을 받아보세요',
}

export default function SignupPage() {
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

        {/* Signup Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">회원가입</h2>
            <p className="mt-2 text-sm text-gray-600">
              새로운 계정을 만들고 탐험을 시작하세요
            </p>
          </div>

          <SignupForm />

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
