/**
 * Role Selection Step Component
 * Second step of onboarding - choose your role
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { RoleType } from '@/types/api'

interface RoleSelectionStepProps {
  onNext: (role: RoleType) => void
  onBack: () => void
}

const roles = [
  {
    id: 'explorer' as RoleType,
    name: '탐험가',
    emoji: '🧭',
    description: '히든스팟을 발견하고 새로운 경험을 추구합니다',
    traits: ['넓은 행동반경', '호기심', '모험심'],
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'healer' as RoleType,
    name: '치유자',
    emoji: '🌿',
    description: '조용한 쉼터에서 평화와 치유를 찾습니다',
    traits: ['좁은 동네 중심', '평온함', '자기돌봄'],
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'archivist' as RoleType,
    name: '수집가',
    emoji: '📸',
    description: '미적 경험을 수집하고 기록합니다',
    traits: ['감각적 장소', '사진', '기록'],
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: 'relation' as RoleType,
    name: '연결자',
    emoji: '🤝',
    description: '사람들과의 연결과 교류를 중시합니다',
    traits: ['사교적 장소', '모임', '네트워킹'],
    color: 'from-orange-500 to-red-500',
  },
  {
    id: 'achiever' as RoleType,
    name: '달성자',
    emoji: '🏆',
    description: '목표를 설정하고 달성하는 것에서 보람을 느낍니다',
    traits: ['목표 지향', '챌린지', '성취감'],
    color: 'from-yellow-500 to-amber-500',
  },
]

export function RoleSelectionStep({ onNext, onBack }: RoleSelectionStepProps) {
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)

  const handleSubmit = () => {
    if (selectedRole) {
      onNext(selectedRole)
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900">당신의 역할을 선택하세요</h2>
        <p className="mt-2 text-gray-600">
          역할에 따라 맞춤형 장소를 추천해드립니다 (나중에 변경 가능)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`
              group relative overflow-hidden rounded-2xl border-2 p-6 text-left transition-all
              ${
                selectedRole === role.id
                  ? 'border-blue-600 bg-blue-50 shadow-lg scale-105'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            {/* Gradient background */}
            <div
              className={`
                absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity
                ${role.color}
                ${selectedRole === role.id ? 'opacity-10' : 'group-hover:opacity-5'}
              `}
            />

            {/* Content */}
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-4xl">{role.emoji}</span>
                {selectedRole === role.id && (
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">{role.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{role.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {role.traits.map((trait) => (
                  <span
                    key={trait}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
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
          onClick={handleSubmit}
          disabled={!selectedRole}
          fullWidth
          size="lg"
        >
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

      <div className="flex justify-center gap-2">
        <div className="h-2 w-2 rounded-full bg-gray-300" />
        <div className="h-2 w-2 rounded-full bg-blue-600" />
        <div className="h-2 w-2 rounded-full bg-gray-300" />
      </div>
    </div>
  )
}
