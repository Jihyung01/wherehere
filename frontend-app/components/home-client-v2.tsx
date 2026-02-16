'use client'

/**
 * WhereHere - Production Ready Home Client
 * 실제 API 연동 + 상용화 수준 UI
 */

import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'

// ============================================================
// Types
// ============================================================

type RoleType = 'explorer' | 'healer' | 'archivist' | 'relation' | 'achiever'
type MoodType = 'curious' | 'tired' | 'excited' | 'lonely' | 'happy' | 'bored'
type Screen = 'home' | 'loading' | 'quests' | 'accepted'

interface Location {
  latitude: number
  longitude: number
}

interface Quest {
  place_id: string
  name: string
  address: string
  category: string
  distance_meters: number
  score: number
  score_breakdown: Record<string, number>
  reason: string
  estimated_cost: number
  vibe_tags: string[]
  average_rating: number
  is_hidden_gem: boolean
  typical_crowd_level: string
  narrative: string
  description: string
}

interface RecommendationResponse {
  recommendations: Quest[]
  role_type: string
  radius_used: number
  total_candidates: number
  generated_at: string
  weather?: {
    condition: string
    condition_kr: string
    temperature: number
    feels_like: number
    humidity: number
    icon: string
  }
  time_of_day?: string
  data_source: 'database' | 'mock'
}

// ============================================================
// Constants
// ============================================================

const ROLES = [
  {
    id: 'explorer' as RoleType,
    name: '탐험가',
    icon: '🧭',
    color: '#E8740C',
    gradient: 'linear-gradient(135deg, #E8740C 0%, #D4580A 100%)',
    bgLight: '#FFF3E8',
    desc: '새로운 발견을 추구하는 모험가',
    tagline: '지도 밖으로 나가볼까요?',
  },
  {
    id: 'healer' as RoleType,
    name: '치유자',
    icon: '🌿',
    color: '#2D9F5D',
    gradient: 'linear-gradient(135deg, #2D9F5D 0%, #1A7A42 100%)',
    bgLight: '#E8F7EE',
    desc: '쉼과 회복의 수호자',
    tagline: '오늘은 쉬어가도 괜찮아요',
  },
  {
    id: 'archivist' as RoleType,
    name: '수집가',
    icon: '📸',
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    bgLight: '#F3EEFF',
    desc: '감각의 큐레이터',
    tagline: '아름다운 순간을 포착하세요',
  },
  {
    id: 'relation' as RoleType,
    name: '연결자',
    icon: '🤝',
    color: '#E84393',
    gradient: 'linear-gradient(135deg, #E84393 0%, #C2185B 100%)',
    bgLight: '#FDE8F3',
    desc: '관계의 직조자',
    tagline: '함께라서 더 빛나는 시간',
  },
  {
    id: 'achiever' as RoleType,
    name: '달성자',
    icon: '🏆',
    color: '#D4A017',
    gradient: 'linear-gradient(135deg, #D4A017 0%, #B8860B 100%)',
    bgLight: '#FFF8E1',
    desc: '성취의 챔피언',
    tagline: '오늘도 한계를 넘어서',
  },
]

const MOODS = [
  { id: 'curious' as MoodType, emoji: '🔍', label: '호기심', intensity: 0.8 },
  { id: 'tired' as MoodType, emoji: '😮‍💨', label: '지침', intensity: 0.6 },
  { id: 'excited' as MoodType, emoji: '⚡', label: '활기찬', intensity: 0.9 },
  { id: 'lonely' as MoodType, emoji: '🌙', label: '외로운', intensity: 0.5 },
  { id: 'happy' as MoodType, emoji: '☀️', label: '행복한', intensity: 0.7 },
  { id: 'bored' as MoodType, emoji: '💤', label: '심심한', intensity: 0.4 },
]

// ============================================================
// Main Component
// ============================================================

export function HomeClientV2() {
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedRole, setSelectedRole] = useState<RoleType>('explorer')
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [userLocation, setUserLocation] = useState<Location | null>(null)
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<Quest | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  
  // User stats (will be from backend later)
  const [userLevel] = useState(8)
  const [userXP, setUserXP] = useState(2450)
  const [nextLevelXP] = useState(3200)
  const [streak] = useState(7)
  const [completedToday, setCompletedToday] = useState(0)

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
          // Default location (Seoul City Hall)
          setUserLocation({
            latitude: 37.5665,
            longitude: 126.9780,
          })
        }
      )
    } else {
      // Default location
      setUserLocation({
        latitude: 37.5665,
        longitude: 126.9780,
      })
    }
  }, [])

  // Fetch recommendations
  const { data: recommendations, isLoading, error, refetch } = useQuery<RecommendationResponse>({
    queryKey: ['recommendations', selectedRole, userLocation, selectedMood],
    queryFn: async () => {
      if (!userLocation) return null as any
      
      const request = {
        user_id: 'user-123',
        role_type: selectedRole,
        user_level: userLevel,
        current_location: userLocation,
        mood: selectedMood ? {
          mood_text: selectedMood,
          intensity: MOODS.find(m => m.id === selectedMood)?.intensity || 0.5,
        } : undefined,
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
    enabled: !!userLocation && screen === 'quests',
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  const handleSelectRole = (roleId: RoleType) => {
    setSelectedRole(roleId)
    setScreen('loading')
    
    // Show loading animation then switch to quests
    setTimeout(() => {
      setScreen('quests')
      refetch()
    }, 1800)
  }

  const handleAcceptQuest = (quest: Quest) => {
    setAcceptedQuest(quest)
    setScreen('accepted')
  }

  const handleCompleteQuest = () => {
    if (acceptedQuest) {
      setShowConfetti(true)
      setUserXP(prev => prev + 150) // Add XP
      setCompletedToday(prev => prev + 1)
      
      setTimeout(() => {
        setShowConfetti(false)
        setAcceptedQuest(null)
        setScreen('home')
      }, 2500)
    }
  }

  const currentRole = ROLES.find(r => r.id === selectedRole)

  // Add global styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      @keyframes confetti {
        0% { transform: translateY(0) rotate(0deg); opacity: 1; }
        100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
      }
      @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: 0.6; }
        50% { transform: scale(1.08); opacity: 0.9; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
      }
      
      .wh-card-hover {
        transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .wh-card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.12);
      }
      .wh-card-hover:active {
        transform: translateY(-1px);
      }
      
      .wh-scroll::-webkit-scrollbar { display: none; }
      .wh-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      
      .wh-shimmer {
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  if (!userLocation) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16, animation: 'float 2s ease-in-out infinite' }}>🧭</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#FFF', marginBottom: 8 }}>
            위치 정보를 가져오는 중...
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            잠시만 기다려주세요
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      maxWidth: 430,
      margin: '0 auto',
      minHeight: '100vh',
      background: '#FAFAF8',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Noto Sans KR', sans-serif",
    }}>
      {showConfetti && <ConfettiEffect />}

      {screen === 'home' && (
        <HomeScreen
          userLevel={userLevel}
          userXP={userXP}
          nextLevelXP={nextLevelXP}
          streak={streak}
          completedToday={completedToday}
          selectedRole={selectedRole}
          selectedMood={selectedMood}
          setSelectedMood={setSelectedMood}
          onSelectRole={handleSelectRole}
        />
      )}

      {screen === 'loading' && (
        <LoadingScreen role={currentRole!} />
      )}

      {screen === 'quests' && (
        <QuestListScreen
          role={currentRole!}
          quests={recommendations?.recommendations || []}
          weather={recommendations?.weather}
          dataSource={recommendations?.data_source}
          isLoading={isLoading}
          error={error}
          expandedQuest={expandedQuest}
          setExpandedQuest={setExpandedQuest}
          onAccept={handleAcceptQuest}
          onBack={() => setScreen('home')}
          userLevel={userLevel}
        />
      )}

      {screen === 'accepted' && acceptedQuest && (
        <AcceptedQuestScreen
          quest={acceptedQuest}
          role={currentRole!}
          onComplete={handleCompleteQuest}
          onBack={() => setScreen('quests')}
        />
      )}
    </div>
  )
}

// ============================================================
// Home Screen
// ============================================================

function HomeScreen({
  userLevel,
  userXP,
  nextLevelXP,
  streak,
  completedToday,
  selectedRole,
  selectedMood,
  setSelectedMood,
  onSelectRole,
}: {
  userLevel: number
  userXP: number
  nextLevelXP: number
  streak: number
  completedToday: number
  selectedRole: RoleType
  selectedMood: MoodType | null
  setSelectedMood: (mood: MoodType | null) => void
  onSelectRole: (role: RoleType) => void
}) {
  const xpProgress = (userXP / nextLevelXP) * 100
  const hour = new Date().getHours()
  const greeting =
    hour < 6
      ? '고요한 밤이에요'
      : hour < 12
      ? '좋은 아침이에요'
      : hour < 18
      ? '활기찬 오후예요'
      : '편안한 저녁이에요'

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        padding: '48px 24px 36px',
        borderRadius: '0 0 32px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background orbs */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,116,12,0.15) 0%, transparent 70%)',
          animation: 'breathe 4s ease-in-out infinite',
        }} />

        {/* Top row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
          position: 'relative',
          zIndex: 1,
        }}>
          <div>
            <div style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: 2,
              textTransform: 'uppercase',
              fontFamily: "'Space Grotesk', sans-serif",
              marginBottom: 4,
            }}>
              WhereHere
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#FFF' }}>
              {greeting} ✨
            </div>
          </div>

          {/* Streak badge */}
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: 16,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: 18 }}>🔥</span>
            <span style={{
              color: '#FF9F43',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {streak}
            </span>
          </div>
        </div>

        {/* Level & XP */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                background: 'linear-gradient(135deg, #E8740C, #FFB347)',
                borderRadius: 10,
                padding: '4px 10px',
                fontSize: 13,
                fontWeight: 700,
                color: '#FFF',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                Lv.{userLevel}
              </div>
              <span style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.4)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                {userXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              오늘 {completedToday}개 완료
            </span>
          </div>

          {/* XP Bar */}
          <div style={{
            height: 6,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${xpProgress}%`,
              background: 'linear-gradient(90deg, #E8740C, #FFB347)',
              borderRadius: 3,
              transition: 'width 1s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 20px' }}>
        {/* Mood Selector */}
        <div>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1A1A2E',
            marginBottom: 14,
          }}>
            지금 기분은 어때요?
          </div>
          <div className="wh-scroll" style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            paddingBottom: 4,
          }}>
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(selectedMood === mood.id ? null : mood.id)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  padding: '10px 16px',
                  borderRadius: 16,
                  border: selectedMood === mood.id ? '2px solid #E8740C' : '2px solid #EEEDE9',
                  background: selectedMood === mood.id ? '#FFF3E8' : '#FFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 22 }}>{mood.emoji}</span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: selectedMood === mood.id ? '#E8740C' : '#888',
                }}>
                  {mood.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Role Selector */}
        <div style={{ marginTop: 32 }}>
          <div style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#1A1A2E',
            marginBottom: 6,
          }}>
            오늘의 역할을 선택하세요
          </div>
          <div style={{
            fontSize: 12,
            color: '#999',
            marginBottom: 16,
          }}>
            역할에 따라 AI가 맞춤형 장소를 추천합니다
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ROLES.map((role, i) => (
              <button
                key={role.id}
                className="wh-card-hover"
                onClick={() => onSelectRole(role.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '18px 20px',
                  borderRadius: 20,
                  border: '1px solid #EEEDE9',
                  background: '#FFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  animation: `fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${0.25 + i * 0.06}s backwards`,
                }}
              >
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: role.bgLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0,
                }}>
                  {role.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#1A1A2E',
                    marginBottom: 2,
                  }}>
                    {role.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {role.tagline}
                  </div>
                </div>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: role.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontSize: 16,
                  flexShrink: 0,
                }}>
                  →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Loading Screen
// ============================================================

function LoadingScreen({ role }: { role: typeof ROLES[0] }) {
  const [dots, setDots] = useState('')
  
  useEffect(() => {
    const iv = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
      padding: 40,
    }}>
      <div style={{
        width: 88,
        height: 88,
        borderRadius: 28,
        background: role.bgLight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        marginBottom: 32,
        animation: 'float 2s ease-in-out infinite',
      }}>
        {role.icon}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 600,
        color: '#FFF',
        marginBottom: 8,
        textAlign: 'center',
      }}>
        {role.name} 퀘스트 생성 중{dots}
      </div>
      <div style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        AI가 당신의 위치와 기분을 분석하여
        <br />
        최적의 장소를 찾고 있어요
      </div>

      {/* Progress bar */}
      <div style={{
        width: 200,
        height: 4,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 2,
        marginTop: 32,
        overflow: 'hidden',
      }}>
        <div className="wh-shimmer" style={{
          width: '100%',
          height: '100%',
          background: `linear-gradient(90deg, transparent, ${role.color}, transparent)`,
          backgroundSize: '200% 100%',
        }} />
      </div>
    </div>
  )
}

// ============================================================
// Quest List Screen  
// ============================================================

function QuestListScreen({
  role,
  quests,
  weather,
  dataSource,
  isLoading,
  error,
  expandedQuest,
  setExpandedQuest,
  onAccept,
  onBack,
  userLevel,
}: {
  role: typeof ROLES[0]
  quests: Quest[]
  weather?: any
  dataSource?: string
  isLoading: boolean
  error: any
  expandedQuest: string | null
  setExpandedQuest: (id: string | null) => void
  onAccept: (quest: Quest) => void
  onBack: () => void
  userLevel: number
}) {
  return (
    <div style={{ paddingBottom: 40, minHeight: '100vh', background: '#FAFAF8' }}>
      {/* Header */}
      <div style={{
        background: role.gradient,
        padding: '48px 24px 28px',
        borderRadius: '0 0 28px 28px',
        position: 'relative',
      }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: 12,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: 18,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
          }}
        >
          ←
        </button>

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{role.icon}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#FFF', marginBottom: 4 }}>
            {role.name} 퀘스트
          </div>
          {weather && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              fontSize: 13,
              color: 'rgba(255,255,255,0.9)',
              marginTop: 8,
            }}>
              <span>{weather.condition_kr}</span>
              <span>·</span>
              <span>{weather.temperature}°C</span>
            </div>
          )}
        </div>

        {/* Data source badge */}
        {dataSource && (
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            padding: '4px 10px',
            borderRadius: 8,
            background: dataSource === 'database' ? 'rgba(45, 159, 93, 0.2)' : 'rgba(255, 159, 67, 0.2)',
            backdropFilter: 'blur(10px)',
            fontSize: 10,
            fontWeight: 600,
            color: '#FFF',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            {dataSource === 'database' ? '🟢 실시간 DB' : '📦 Mock'}
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            width: 48,
            height: 48,
            border: '4px solid #F0F0F0',
            borderTopColor: role.color,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ marginTop: 16, color: '#888', fontSize: 14 }}>
            추천 장소를 찾는 중...
          </p>
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: '20px 16px' }}>
          <div style={{
            background: '#FFF',
            border: '1px solid #FFE5E5',
            borderRadius: 20,
            padding: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#E53E3E', marginBottom: 8 }}>
              추천을 가져올 수 없습니다
            </p>
            <p style={{ fontSize: 13, color: '#999' }}>
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </p>
          </div>
        </div>
      )}

      {/* Quest Cards */}
      {!isLoading && !error && quests.length > 0 && (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>
            {quests.length}개의 미션이 준비되었어요
          </div>
          {quests.map((quest, i) => (
            <QuestCard
              key={quest.place_id}
              quest={quest}
              role={role}
              index={i}
              isExpanded={expandedQuest === quest.place_id}
              onToggle={() => setExpandedQuest(expandedQuest === quest.place_id ? null : quest.place_id)}
              onAccept={() => onAccept(quest)}
              userLevel={userLevel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Quest Card Component
// ============================================================

function QuestCard({
  quest,
  role,
  index,
  isExpanded,
  onToggle,
  onAccept,
  userLevel,
}: {
  quest: Quest
  role: typeof ROLES[0]
  index: number
  isExpanded: boolean
  onToggle: () => void
  onAccept: () => void
  userLevel: number
}) {
  const distanceText =
    quest.distance_meters >= 1000
      ? `${(quest.distance_meters / 1000).toFixed(1)}km`
      : `${quest.distance_meters}m`

  const xpReward = Math.round(50 + (quest.score / 100) * 150)

  return (
    <div
      className="wh-card-hover"
      style={{
        background: '#FFF',
        borderRadius: 24,
        overflow: 'hidden',
        border: '1px solid #EEEDE9',
        animation: `fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + index * 0.08}s backwards`,
      }}
    >
      {/* Card header */}
      <div onClick={onToggle} style={{ padding: '20px 20px 16px', cursor: 'pointer' }}>
        {/* Top badges */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}>
          {quest.is_hidden_gem && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#7B4F00',
              letterSpacing: 0.5,
            }}>
              ✨ 히든
            </span>
          )}
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 8,
            background: role.bgLight,
            color: role.color,
          }}>
            +{xpReward} XP
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 8,
            background: '#F5F5F0',
            color: '#666',
          }}>
            ⭐ {quest.average_rating}
          </span>
        </div>

        {/* Title & distance */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 17,
              fontWeight: 700,
              color: '#1A1A2E',
              marginBottom: 4,
              lineHeight: 1.3,
            }}>
              {quest.name}
            </div>
            <div style={{ fontSize: 12, color: '#999' }}>
              {quest.category} · {quest.address}
            </div>
          </div>
          <div style={{
            flexShrink: 0,
            background: '#F5F5F0',
            borderRadius: 12,
            padding: '6px 10px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1A1A2E',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              {distanceText}
            </div>
          </div>
        </div>

        {/* Narrative */}
        {quest.narrative && (
          <div style={{
            marginTop: 14,
            padding: '12px 16px',
            borderRadius: 14,
            background: '#FAFAF8',
            borderLeft: `3px solid ${role.color}`,
            fontSize: 13,
            color: '#555',
            lineHeight: 1.7,
            fontStyle: 'italic',
          }}>
            "{quest.narrative}"
          </div>
        )}

        {/* Expand indicator */}
        <div style={{
          textAlign: 'center',
          marginTop: 8,
          fontSize: 18,
          color: '#CCC',
          transition: 'transform 0.3s ease',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ⌄
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div style={{
          padding: '0 20px 20px',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 16,
          }}>
            <InfoChip
              label="예상 비용"
              value={quest.estimated_cost === 0 ? '무료' : `${quest.estimated_cost.toLocaleString()}원`}
            />
            <InfoChip
              label="혼잡도"
              value={{
                'very_low': '매우 한적',
                'low': '한적',
                'medium': '보통',
                'high': '붐빔'
              }[quest.typical_crowd_level] || '보통'}
            />
          </div>

          {/* Vibe tags */}
          <div style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}>
            {quest.vibe_tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  padding: '4px 10px',
                  borderRadius: 10,
                  background: role.bgLight,
                  color: role.color,
                  fontWeight: 500,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Reason */}
          <div style={{
            fontSize: 12,
            color: '#777',
            marginBottom: 16,
            lineHeight: 1.6,
          }}>
            💡 {quest.reason}
          </div>

          {/* Accept button */}
          <button
            onClick={onAccept}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 16,
              border: 'none',
              background: role.gradient,
              color: '#FFF',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            퀘스트 수락하기 ⚡
          </button>
        </div>
      )}
    </div>
  )
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#FAFAF8',
      borderRadius: 12,
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: 10, color: '#AAA', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{value}</div>
    </div>
  )
}

// ============================================================
// Accepted Quest Screen
// ============================================================

function AcceptedQuestScreen({
  quest,
  role,
  onComplete,
  onBack,
}: {
  quest: Quest
  role: typeof ROLES[0]
  onComplete: () => void
  onBack: () => void
}) {
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [checkedMissions, setCheckedMissions] = useState<boolean[]>([false, false, false])

  useEffect(() => {
    const iv = setInterval(() => setTimeElapsed(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const xpReward = Math.round(50 + (quest.score / 100) * 150)
  const allChecked = checkedMissions.every(Boolean)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Map placeholder */}
      <div style={{
        height: 280,
        background: 'linear-gradient(160deg, #1A1A2E, #16213E)',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: 12,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF',
            fontSize: 18,
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            zIndex: 2,
          }}
        >
          ←
        </button>

        <div style={{ textAlign: 'center', opacity: 0.6 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📍</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            {quest.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            {(quest.distance_meters / 1000).toFixed(1)}km 거리
          </div>
        </div>

        {/* Timer overlay */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(10px)',
          borderRadius: 14,
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#FF4757',
            animation: 'pulse 1.5s infinite',
          }} />
          <span style={{
            color: '#FFF',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {formatTime(timeElapsed)}
          </span>
        </div>
      </div>

      {/* Quest Details */}
      <div style={{
        flex: 1,
        marginTop: -24,
        borderRadius: '24px 24px 0 0',
        background: '#FFF',
        padding: '28px 20px 120px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 16,
        }}>
          <div style={{
            padding: '4px 10px',
            borderRadius: 8,
            background: role.bgLight,
            fontSize: 11,
            fontWeight: 600,
            color: role.color,
          }}>
            {role.icon} {role.name} 퀘스트 진행 중
          </div>
        </div>

        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#1A1A2E',
          marginBottom: 8,
          lineHeight: 1.3,
        }}>
          {quest.name}
        </h2>

        <p style={{ fontSize: 13, color: '#999', marginBottom: 20 }}>
          {quest.address}
        </p>

        {/* Narrative */}
        {quest.narrative && (
          <div style={{
            padding: '16px 20px',
            borderRadius: 16,
            background: '#FAFAF8',
            borderLeft: `3px solid ${role.color}`,
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 11, color: '#AAA', marginBottom: 6 }}>
              AI 서사
            </div>
            <div style={{
              fontSize: 14,
              color: '#444',
              lineHeight: 1.8,
              fontStyle: 'italic',
            }}>
              "{quest.narrative}"
            </div>
          </div>
        )}

        {/* Mission checklist */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E', marginBottom: 12 }}>
            미션 체크리스트
          </div>
          {['장소에 도착하기', '30분 이상 체류하기', '사진 1장 촬영하기'].map((item, i) => (
            <div
              key={i}
              onClick={() => {
                const newChecked = [...checkedMissions]
                newChecked[i] = !newChecked[i]
                setCheckedMissions(newChecked)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid #F5F5F0',
                cursor: 'pointer',
              }}
            >
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                border: `2px solid ${checkedMissions[i] ? role.color : '#DDD'}`,
                background: checkedMissions[i] ? role.color : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#FFF',
                transition: 'all 0.2s ease',
              }}>
                {checkedMissions[i] && '✓'}
              </div>
              <span style={{
                fontSize: 14,
                color: checkedMissions[i] ? '#1A1A2E' : '#555',
                textDecoration: checkedMissions[i] ? 'line-through' : 'none',
                transition: 'all 0.2s ease',
              }}>
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* Reward preview */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 24,
        }}>
          <div style={{
            flex: 1,
            padding: '14px',
            borderRadius: 16,
            background: role.bgLight,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>⚡</div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: role.color,
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              +{xpReward} XP
            </div>
          </div>
          <div style={{
            flex: 1,
            padding: '14px',
            borderRadius: 16,
            background: '#FFF8E1',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: '#D4A017',
              fontFamily: "'Space Grotesk', sans-serif",
            }}>
              스트릭 유지
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        padding: '16px 20px 32px',
        background: 'linear-gradient(to top, #FFF 80%, transparent)',
      }}>
        <button
          onClick={onComplete}
          disabled={!allChecked}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: 18,
            border: 'none',
            background: allChecked ? role.gradient : '#CCC',
            color: '#FFF',
            fontSize: 17,
            fontWeight: 700,
            cursor: allChecked ? 'pointer' : 'not-allowed',
            fontFamily: "'Noto Sans KR', sans-serif",
            boxShadow: allChecked ? `0 8px 24px ${role.color}44` : 'none',
            transition: 'all 0.3s ease',
            opacity: allChecked ? 1 : 0.5,
          }}
        >
          {allChecked ? '퀘스트 완료! 🎉' : '미션을 완료해주세요'}
        </button>
      </div>
    </div>
  )
}

// ============================================================
// Confetti Effect
// ============================================================

function ConfettiEffect() {
  const colors = ['#E8740C', '#2D9F5D', '#8B5CF6', '#E84393', '#FFD700', '#FF6B6B']
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 8,
    duration: 1.5 + Math.random() * 1,
  }))

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      pointerEvents: 'none',
      overflow: 'hidden',
    }}>
      {/* Success message */}
      <div style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        animation: 'fadeIn 0.5s ease',
        zIndex: 10,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <div style={{
          fontSize: 28,
          fontWeight: 900,
          color: '#1A1A2E',
          marginBottom: 8,
        }}>
          퀘스트 완료!
        </div>
        <div style={{ fontSize: 16, color: '#888' }}>
          경험치가 적립되었어요
        </div>
      </div>

      {/* Confetti particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            bottom: '30%',
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            animation: `confetti ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  )
}
