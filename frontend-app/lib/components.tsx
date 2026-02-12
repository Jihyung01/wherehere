/**
 * WH Core Logic - Frontend Components (Next.js Adapted)
 * React + TypeScript + TanStack Query
 */

'use client'

import { useState } from 'react'

// ============================================================
// Type Definitions
// ============================================================

export type RoleType = 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'

export interface Location {
  latitude: number
  longitude: number
}

export interface RecommendationRequest {
  user_id: string
  role_type: RoleType
  user_level: number
  current_location: Location
  mood?: {
    mood_text: string
    intensity: number
  }
  weather?: string
  time_of_day?: string
}

export interface PlaceRecommendation {
  place_id: string
  name: string
  address: string
  category: string
  distance_meters: number
  score: number
  score_breakdown: Record<string, number>
  reason: string
  estimated_cost?: number
  vibe_tags: string[]
}

export interface RecommendationResponse {
  recommendations: PlaceRecommendation[]
  role_type: string
  radius_used: number
  total_candidates: number
  generated_at: string
}

// ============================================================
// React Components
// ============================================================

/**
 * 역할 선택 컴포넌트
 */
export function RoleSelector({
  currentRole,
  onRoleChange,
}: {
  currentRole: RoleType
  onRoleChange: (role: RoleType) => void
}) {
  const roles: Array<{
    id: RoleType
    name: string
    emoji: string
    description: string
  }> = [
    {
      id: 'explorer',
      name: '탐험가',
      emoji: '🧭',
      description: '새로운 발견을 추구하는 모험가',
    },
    {
      id: 'healer',
      name: '치유자',
      emoji: '🌿',
      description: '쉼과 회복을 추구하는 평온의 수호자',
    },
    {
      id: 'archivist',
      name: '수집가',
      emoji: '📸',
      description: '미적 경험을 수집하는 감각의 큐레이터',
    },
    {
      id: 'relation',
      name: '연결자',
      emoji: '🤝',
      description: '따뜻한 연결을 추구하는 관계의 직조자',
    },
    {
      id: 'achiever',
      name: '달성자',
      emoji: '🏆',
      description: '목표를 향해 전진하는 성취의 챔피언',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {roles.map((role) => (
        <button
          key={role.id}
          onClick={() => onRoleChange(role.id)}
          className={`
            p-4 rounded-xl border-2 transition-all
            ${
              currentRole === role.id
                ? 'border-blue-500 bg-blue-50 scale-105'
                : 'border-gray-200 hover:border-gray-300'
            }
          `}
        >
          <div className="text-4xl mb-2">{role.emoji}</div>
          <div className="font-bold text-sm">{role.name}</div>
          <div className="text-xs text-gray-500 mt-1">{role.description}</div>
        </button>
      ))}
    </div>
  )
}

/**
 * 추천 장소 카드
 */
export function PlaceCard({ place }: { place: PlaceRecommendation }) {
  const distanceKm = (place.distance_meters / 1000).toFixed(1)

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xl font-bold">{place.name}</h3>
        <div className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
          {distanceKm}km
        </div>
      </div>

      {/* 카테고리 & 태그 */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
          {place.category}
        </span>
        {place.vibe_tags.map((tag) => (
          <span key={tag} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
            #{tag}
          </span>
        ))}
      </div>

      {/* 주소 */}
      <p className="text-sm text-gray-600 mb-3">{place.address}</p>

      {/* 추천 이유 */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-3">
        <p className="text-sm text-gray-700">{place.reason}</p>
      </div>

      {/* 비용 */}
      {place.estimated_cost && (
        <div className="text-sm text-gray-500">
          예상 비용: {place.estimated_cost.toLocaleString()}원
        </div>
      )}

      {/* 점수 분해 (개발자 모드) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-3 text-xs text-gray-400">
          <summary className="cursor-pointer">점수 상세</summary>
          <pre className="mt-2 overflow-auto">
            {JSON.stringify(place.score_breakdown, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

/**
 * 레벨 진행바
 */
export function LevelProgressBar({
  level,
  currentXP,
  nextLevelXP,
}: {
  level: number
  currentXP: number
  nextLevelXP: number
}) {
  const progress = (currentXP / nextLevelXP) * 100

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-gray-600">Lv.{level}</span>
        <span className="text-sm text-gray-500">
          {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500 text-right">
        다음 레벨까지 {(nextLevelXP - currentXP).toLocaleString()} XP
      </div>
    </div>
  )
}

/**
 * 스트릭 표시
 */
export function StreakDisplay({ streak }: { streak: number }) {
  const getStreakEmoji = (days: number) => {
    if (days >= 100) return '🔥🔥🔥'
    if (days >= 30) return '🔥🔥'
    if (days >= 7) return '🔥'
    return '⭐'
  }

  return (
    <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
      <span className="text-2xl">{getStreakEmoji(streak)}</span>
      <div>
        <div className="text-lg font-bold text-orange-600">{streak}일 연속</div>
        <div className="text-xs text-orange-500">매일의 작은 모험</div>
      </div>
    </div>
  )
}
