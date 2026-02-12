/**
 * Signup Form Component
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [username, setUsername] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
    username?: string
  }>({})
  const { signUp, loading } = useAuth()

  const validate = () => {
    const newErrors: any = {}

    // Email validation
    if (!email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다'
    }

    // Username validation
    if (!username) {
      newErrors.username = '사용자명을 입력해주세요'
    } else if (username.length < 3) {
      newErrors.username = '사용자명은 최소 3자 이상이어야 합니다'
    } else if (username.length > 20) {
      newErrors.username = '사용자명은 최대 20자까지 가능합니다'
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다'
    }

    // Password validation
    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다'
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    await signUp({ email, password, username })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        type="text"
        label="사용자명"
        placeholder="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={errors.username}
        disabled={loading}
        helperText="영문, 숫자, 언더스코어만 사용 가능 (3-20자)"
        autoComplete="username"
      />

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
        helperText="최소 8자 이상"
        autoComplete="new-password"
      />

      <Input
        type="password"
        label="비밀번호 확인"
        placeholder="••••••••"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={errors.confirmPassword}
        disabled={loading}
        autoComplete="new-password"
      />

      <div className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-gray-600">
          <Link href="/terms" className="text-blue-600 hover:underline">
            이용약관
          </Link>
          {' 및 '}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            개인정보처리방침
          </Link>
          에 동의합니다
        </span>
      </div>

      <Button type="submit" fullWidth loading={loading}>
        회원가입
      </Button>

      <p className="text-center text-sm text-gray-600">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700 hover:underline">
          로그인
        </Link>
      </p>
    </form>
  )
}
