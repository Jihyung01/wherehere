/**
 * Nickname Step Component
 * First step of onboarding - set username and display name
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NicknameStepProps {
  onNext: (data: { username: string; displayName: string }) => void
}

export function NicknameStep({ onNext }: NicknameStepProps) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errors, setErrors] = useState<{ username?: string; displayName?: string }>({})

  const validate = () => {
    const newErrors: { username?: string; displayName?: string } = {}

    // Username validation
    if (!username) {
      newErrors.username = '사용자명을 입력해주세요'
    } else if (username.length < 3) {
      newErrors.username = '사용자명은 최소 3자 이상이어야 합니다'
    } else if (username.length > 20) {
      newErrors.username = '사용자명은 최대 20자까지 가능합니다'
    } else if (!/^[a-zA-Z0-9_가-힣]+$/.test(username)) {
      newErrors.username = '사용자명은 영문, 숫자, 한글, 언더스코어만 사용 가능합니다'
    }

    // Display name validation
    if (!displayName) {
      newErrors.displayName = '닉네임을 입력해주세요'
    } else if (displayName.length < 2) {
      newErrors.displayName = '닉네임은 최소 2자 이상이어야 합니다'
    } else if (displayName.length > 20) {
      newErrors.displayName = '닉네임은 최대 20자까지 가능합니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext({ username, displayName })
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <div className="mb-4 text-6xl">👋</div>
        <h2 className="text-3xl font-bold text-gray-900">환영합니다!</h2>
        <p className="mt-2 text-gray-600">
          먼저 당신을 어떻게 불러드릴까요?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="text"
          label="사용자명 (ID)"
          placeholder="username123"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
          helperText="다른 사용자들에게 보여지는 고유 ID입니다"
        />

        <Input
          type="text"
          label="닉네임 (표시 이름)"
          placeholder="멋진 탐험가"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.displayName}
          helperText="프로필에 표시될 이름입니다 (나중에 변경 가능)"
        />

        <div className="flex gap-3">
          <Button type="submit" fullWidth size="lg">
            다음
            <svg
              className="ml-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Button>
        </div>
      </form>

      <div className="flex justify-center gap-2">
        <div className="h-2 w-2 rounded-full bg-blue-600" />
        <div className="h-2 w-2 rounded-full bg-gray-300" />
        <div className="h-2 w-2 rounded-full bg-gray-300" />
      </div>
    </div>
  )
}
