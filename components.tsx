/**
 * WH Core Logic - Frontend Integration
 * React + TypeScript + TanStack Query
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================
// Type Definitions
// ============================================================

type RoleType = 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever';

interface Location {
  latitude: number;
  longitude: number;
}

interface RecommendationRequest {
  user_id: string;
  role_type: RoleType;
  user_level: number;
  current_location: Location;
  mood?: {
    mood_text: string;
    intensity: number;
  };
  weather?: string;
  time_of_day?: string;
}

interface PlaceRecommendation {
  place_id: string;
  name: string;
  address: string;
  category: string;
  distance_meters: number;
  score: number;
  score_breakdown: Record<string, number>;
  reason: string;
  estimated_cost?: number;
  vibe_tags: string[];
}

interface RecommendationResponse {
  recommendations: PlaceRecommendation[];
  role_type: string;
  radius_used: number;
  total_candidates: number;
  generated_at: string;
}

interface NarrativeResponse {
  title: string;
  body: string;
  insight: string;
  role_type: string;
  generation_time_ms: number;
}

// ============================================================
// API Client
// ============================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class WHCoreAPI {
  static async getRecommendations(
    request: RecommendationRequest
  ): Promise<RecommendationResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  static async generateNarrative(
    placeId: string,
    questId: string
  ): Promise<NarrativeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/narratives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ place_id: placeId, quest_id: questId }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  static async completeQuest(
    questId: string,
    duration: number
  ): Promise<{ xp_earned: number; new_level?: number }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/quests/${questId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ duration_minutes: duration }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

// ============================================================
// Custom Hooks
// ============================================================

/**
 * 장소 추천 Hook
 */
export function useRecommendations(request: RecommendationRequest) {
  return useQuery({
    queryKey: ['recommendations', request],
    queryFn: () => WHCoreAPI.getRecommendations(request),
    staleTime: 5 * 60 * 1000, // 5분
    retry: 2,
  });
}

/**
 * 서사 생성 Hook
 */
export function useNarrativeGeneration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      placeId,
      questId,
    }: {
      placeId: string;
      questId: string;
    }) => WHCoreAPI.generateNarrative(placeId, questId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['narratives'] });
    },
  });
}

/**
 * 퀘스트 완료 Hook
 */
export function useQuestCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questId,
      duration,
    }: {
      questId: string;
      duration: number;
    }) => WHCoreAPI.completeQuest(questId, duration),
    onSuccess: (data) => {
      // 레벨업 시 축하 모달
      if (data.new_level) {
        // 레벨업 애니메이션 트리거
        console.log(`🎉 레벨업! Lv.${data.new_level}`);
      }

      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
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
  currentRole: RoleType;
  onRoleChange: (role: RoleType) => void;
}) {
  const roles: Array<{
    id: RoleType;
    name: string;
    emoji: string;
    description: string;
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
  ];

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
  );
}

/**
 * 추천 장소 카드
 */
export function PlaceCard({ place }: { place: PlaceRecommendation }) {
  const distanceKm = (place.distance_meters / 1000).toFixed(1);

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
  );
}

/**
 * 서사 표시 컴포넌트
 */
export function NarrativeDisplay({ narrative }: { narrative: NarrativeResponse }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 shadow-xl">
      {/* 제목 */}
      <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
        {narrative.title}
      </h2>

      {/* 본문 */}
      <div className="text-lg text-gray-700 leading-relaxed mb-6 whitespace-pre-line">
        {narrative.body}
      </div>

      {/* 통찰 */}
      <div className="border-t-2 border-purple-200 pt-4">
        <p className="text-sm text-purple-600 italic text-center">
          "{narrative.insight}"
        </p>
      </div>

      {/* 메타 정보 */}
      <div className="mt-4 text-xs text-gray-400 text-right">
        생성 시간: {narrative.generation_time_ms}ms
      </div>
    </div>
  );
}

/**
 * 레벨 진행바
 */
export function LevelProgressBar({
  level,
  currentXP,
  nextLevelXP,
}: {
  level: number;
  currentXP: number;
  nextLevelXP: number;
}) {
  const progress = (currentXP / nextLevelXP) * 100;

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
  );
}

/**
 * 스트릭 표시
 */
export function StreakDisplay({ streak }: { streak: number }) {
  const getStreakEmoji = (days: number) => {
    if (days >= 100) return '🔥🔥🔥';
    if (days >= 30) return '🔥🔥';
    if (days >= 7) return '🔥';
    return '⭐';
  };

  return (
    <div className="inline-flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
      <span className="text-2xl">{getStreakEmoji(streak)}</span>
      <div>
        <div className="text-lg font-bold text-orange-600">{streak}일 연속</div>
        <div className="text-xs text-orange-500">매일의 작은 모험</div>
      </div>
    </div>
  );
}

// ============================================================
// Main App Example
// ============================================================

export function QuestFlow() {
  const [selectedRole, setSelectedRole] = useState<RoleType>('explorer');
  const [userLevel] = useState(8);
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  // 현재 위치 가져오기
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      });
    }
  }, []);

  // 추천 받기
  const { data: recommendations, isLoading } = useRecommendations({
    user_id: 'user-123',
    role_type: selectedRole,
    user_level: userLevel,
    current_location: userLocation || { latitude: 37.5, longitude: 127.0 },
    mood: {
      mood_text: '호기심 넘치는',
      intensity: 0.8,
    },
  });

  if (!userLocation) {
    return <div>위치 정보를 가져오는 중...</div>;
  }

  if (isLoading) {
    return <div>추천 장소를 찾는 중...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* 역할 선택 */}
      <section>
        <h2 className="text-2xl font-bold mb-4">오늘의 역할을 선택하세요</h2>
        <RoleSelector currentRole={selectedRole} onRoleChange={setSelectedRole} />
      </section>

      {/* 추천 장소 */}
      <section>
        <h2 className="text-2xl font-bold mb-4">추천 장소</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {recommendations?.recommendations.map((place) => (
            <PlaceCard key={place.place_id} place={place} />
          ))}
        </div>
      </section>
    </div>
  );
}
