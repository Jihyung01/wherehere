'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { LoginForm } from './login-form'
import Link from 'next/link'

export function LoginPageClient() {
  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const { signInWithOAuth, loading } = useAuth()

  return (
    <div className="space-y-6 text-gray-900">
      {/* 주력: 카카오 / 구글 */}
      <div className="space-y-3">
        <Button
          type="button"
          fullWidth
          onClick={() => signInWithOAuth('kakao')}
          disabled={loading}
          className="h-12 gap-3 bg-[#FEE500] text-[#191919] hover:bg-[#FDD835] border-0 text-base font-medium"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3C6.477 3 2 6.477 2 10.75c0 2.833 1.958 5.292 4.833 6.625l-.625 2.292c-.042.166.125.291.292.208l2.708-1.833c.583.083 1.167.125 1.792.125 5.523 0 10-3.477 10-7.75S17.523 3 12 3z"
              fill="#3C1E1E"
            />
          </svg>
          카카오로 계속하기
        </Button>
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => signInWithOAuth('google')}
          disabled={loading}
          className="h-12 gap-3 border-2 border-gray-300 text-gray-800 hover:bg-gray-50 text-base font-medium"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google로 계속하기
        </Button>
      </div>

      {/* 구분선 + 이메일 로그인 접기 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <button
            type="button"
            onClick={() => setShowEmailLogin((v) => !v)}
            className="bg-white px-4 text-gray-500 hover:text-gray-700"
          >
            {showEmailLogin ? '이메일 로그인 접기' : '이메일로 로그인'}
          </button>
        </div>
      </div>

      {showEmailLogin && (
        <div className="pt-2 [color:inherit]">
          <LoginForm />
        </div>
      )}

      <p className="text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}
