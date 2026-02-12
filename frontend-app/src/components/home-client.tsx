'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  RoleSelector, 
  PlaceCard, 
  LevelProgressBar, 
  StreakDisplay 
} from '@/lib/components'
import type { 
  RoleType, 
  Location, 
  RecommendationRequest 
} from '@/lib/components'

export function HomeClient() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('explorer')
  const [userLevel] = useState(8)
  const [currentXP] = useState(2450)
  const [nextLevelXP] = useState(3000)
  const [streak] = useState(7)
  const [userLocation, setUserLocation] = useState<Location | null>(null)

  // Get current location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
        },
        (error) => {
          console.error('Location error:', error)
          // Default location (Gangnam)
          setUserLocation({
            latitude: 37.4979,
            longitude: 127.0276,
          })
        }
      )
    } else {
      // Default location
      setUserLocation({
        latitude: 37.4979,
        longitude: 127.0276,
      })
    }
  }, [])

  // Get recommendations
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['recommendations', selectedRole, userLocation],
    queryFn: async () => {
      if (!userLocation) return null
      
      const request: RecommendationRequest = {
        user_id: 'user-123',
        role_type: selectedRole,
        user_level: userLevel,
        current_location: userLocation,
        mood: {
          mood_text: 'curious',
          intensity: 0.8,
        },
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      return response.json()
    },
    enabled: !!userLocation,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })

  if (!userLocation) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🧭</div>
          <h2 className="text-2xl font-bold mb-2">위치 정보를 가져오는 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요</p>
        </div>
      </main>
    )
  }

  const roleEmojis: Record<RoleType, string> = {
    explorer: '🧭',
    healer: '🌿',
    archivist: '📸',
    relation: '🤝',
    achiever: '🏆',
  }

  const roleTitles: Record<RoleType, string> = {
    explorer: '탐험가 추천',
    healer: '치유자 추천',
    archivist: '수집가 추천',
    relation: '연결자 추천',
    achiever: '달성자 추천',
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                WhereHere 🗺️
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                역할 기반 페르소나로 맞춤형 장소 추천
              </p>
            </div>
            <StreakDisplay streak={streak} />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Level Progress Bar */}
        <section>
          <LevelProgressBar
            level={userLevel}
            currentXP={currentXP}
            nextLevelXP={nextLevelXP}
          />
        </section>

        {/* Role Selection */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            오늘의 역할을 선택하세요
          </h2>
          <RoleSelector
            currentRole={selectedRole}
            onRoleChange={setSelectedRole}
          />
        </section>

        {/* Recommended Places */}
        <section>
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            {roleEmojis[selectedRole]} {roleTitles[selectedRole]}
          </h2>

          {isLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">추천 장소를 찾는 중...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-600">
                ⚠️ 추천을 가져올 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.
              </p>
              <p className="text-sm text-red-500 mt-2">
                {error instanceof Error ? error.message : '알 수 없는 오류'}
              </p>
            </div>
          )}

          {recommendations?.recommendations && (
            <>
              <div className="mb-4 text-sm text-gray-600">
                반경 {(recommendations.radius_used / 1000).toFixed(1)}km 내에서{' '}
                {recommendations.recommendations.length}개의 장소를 찾았습니다
                {' '}(총 {recommendations.total_candidates}개 후보 중)
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {recommendations.recommendations.map((place: any) => (
                  <PlaceCard key={place.place_id} place={place} />
                ))}
              </div>
            </>
          )}

          {recommendations?.recommendations?.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-700">
                근처에서 장소를 찾을 수 없습니다. 다른 역할을 선택해보세요!
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
