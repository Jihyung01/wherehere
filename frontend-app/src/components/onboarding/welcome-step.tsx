/**
 * Welcome Step Component
 * Final step of onboarding - welcome and completion
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { RoleType } from '@/types/api'

interface WelcomeStepProps {
  displayName: string
  role: RoleType
  onBack: () => void
}

const roleEmojis: Record<RoleType, string> = {
  explorer: '🧭',
  healer: '🌿',
  archivist: '📸',
  relation: '🤝',
  achiever: '🏆',
}

const roleNames: Record<RoleType, string> = {
  explorer: '탐험가',
  healer: '치유자',
  archivist: '수집가',
  relation: '연결자',
  achiever: '달성자',
}

export function WelcomeStep({ displayName, role, onBack }: WelcomeStepProps) {
  const router = useRouter()

  const handleStart = () => {
    router.push('/dashboard')
  }

  return (
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center space-y-6">
        <div className="text-8xl animate-bounce">{roleEmojis[role]}</div>
        
        <div>
          <h2 className="text-4xl font-bold text-gray-900">
            환영합니다, {displayName}님!
          </h2>
          <p className="mt-3 text-xl text-gray-600">
            당신은 이제 <span className="font-bold text-blue-600">{roleNames[role]}</span>입니다
          </p>
        </div>

        <div className="mx-auto max-w-lg rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            WhereHere와 함께 시작하세요
          </h3>
          <ul className="space-y-3 text-left">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">✨</span>
              <div>
                <p className="font-medium text-gray-900">맞춤형 장소 추천</p>
                <p className="text-sm text-gray-600">
                  당신의 역할에 딱 맞는 장소를 AI가 추천해드립니다
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">🎯</span>
              <div>
                <p className="font-medium text-gray-900">퀘스트 완료</p>
                <p className="text-sm text-gray-600">
                  장소를 방문하고 경험을 쌓아 레벨업하세요
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">📖</span>
              <div>
                <p className="font-medium text-gray-900">AI 서사 생성</p>
                <p className="text-sm text-gray-600">
                  당신만의 특별한 이야기가 만들어집니다
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 text-2xl">🔥</span>
              <div>
                <p className="font-medium text-gray-900">스트릭 유지</p>
                <p className="text-sm text-gray-600">
                  매일 활동하고 연속 일수 보너스를 받으세요
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          <svg
            className="mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 17l-5-5m0 0l5-5m-5 5h12"
            />
          </svg>
          이전
        </Button>
        <Button
          type="button"
          onClick={handleStart}
          fullWidth
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          시작하기 🚀
        </Button>
      </div>

      <div className="flex justify-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-300" />
        <div className="h-2 w-2 rounded-full bg-gray-300" />
        <div className="h-2 w-2 rounded-full bg-blue-600" />
      </div>
    </div>
  )
}
