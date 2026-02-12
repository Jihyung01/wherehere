/**
 * Login Form Component
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const { signIn, loading } = useAuth()

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다'
    }

    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    await signIn({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        type="email"
        label="이메일"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        disabled={loading}
        autoComplete="email"
      />

      <Input
        type="password"
        label="비밀번호"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        disabled={loading}
        autoComplete="current-password"
      />

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-600">로그인 상태 유지</span>
        </label>

        <Link
          href="/forgot-password"
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          비밀번호 찾기
        </Link>
      </div>

      <Button type="submit" fullWidth loading={loading}>
        로그인
      </Button>

      <p className="text-center text-sm text-gray-600">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  )
}
