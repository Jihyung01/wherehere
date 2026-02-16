'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '@/lib/api-client'
import { PatternMap } from './pattern-map'
import { ChallengeGenerator } from './challenge-generator'
import { ChallengeCard } from './challenge-card'
import { PersonalityProfile } from './personality-profile'
import { ShareButton } from './share-button'
import { GatheringCreator } from './gathering-creator'

type Screen = 'role' | 'mood' | 'quests' | 'accepted' | 'pattern' | 'challenges' | 'profile'
type RoleType = 'explorer' | 'healer' | 'artist' | 'foodie' | 'challenger'
type MoodType = 'curious' | 'tired' | 'creative' | 'hungry' | 'adventurous'

const ROLES = [
  {
    id: 'explorer' as RoleType,
    name: '탐험가',
    icon: '🧭',
    description: '숨겨진 보석을 찾아 떠나는 모험가',
    color: '#E8740C',
    colorDark: '#C65D00',
  },
  {
    id: 'healer' as RoleType,
    name: '힐러',
    icon: '🌿',
    description: '지친 마음을 달래는 휴식 전문가',
    color: '#10B981',
    colorDark: '#059669',
  },
  {
    id: 'artist' as RoleType,
    name: '예술가',
    icon: '🎨',
    description: '영감을 찾아 떠나는 창작자',
    color: '#8B5CF6',
    colorDark: '#7C3AED',
  },
  {
    id: 'foodie' as RoleType,
    name: '미식가',
    icon: '🍜',
    description: '맛의 세계를 탐험하는 미각 전문가',
    color: '#F59E0B',
    colorDark: '#D97706',
  },
  {
    id: 'challenger' as RoleType,
    name: '도전자',
    icon: '⚡',
    description: '한계를 넘어서는 도전 정신',
    color: '#EF4444',
    colorDark: '#DC2626',
  },
]

const MOODS = [
  { id: 'curious' as MoodType, name: '호기심 가득', icon: '🔍', color: '#E8740C' },
  { id: 'tired' as MoodType, name: '지쳐있어요', icon: '😴', color: '#10B981' },
  { id: 'creative' as MoodType, name: '영감 필요', icon: '✨', color: '#8B5CF6' },
  { id: 'hungry' as MoodType, name: '배고파요', icon: '🍽️', color: '#F59E0B' },
  { id: 'adventurous' as MoodType, name: '모험 준비됨', icon: '🚀', color: '#EF4444' },
]

export function MainAppV3() {
  const [screen, setScreen] = useState<Screen>('role')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<any>(null)
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [userId] = useState('demo-user-' + Date.now())
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null)

  // 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.log('위치 가져오기 실패, 서울 시청 사용:', error)
        }
      )
    }
  }, [])

  // 퀘스트 데이터
  const { data: questsData, isLoading: questsLoading, error: questsError } = useQuery({
    queryKey: ['recommendations', userLocation.lat, userLocation.lng, selectedRole, selectedMood],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, selectedRole!, selectedMood!),
    enabled: !!selectedRole && !!selectedMood && screen === 'quests',
    retry: 1,
  })

  const currentRole = ROLES.find((r) => r.id === selectedRole)

  // 네비게이션 바
  const NavBar = () => (
    <div className="nav-bar">
      <button
        onClick={() => setScreen('quests')}
        className={screen === 'quests' ? 'nav-active' : ''}
      >
        🎯 퀘스트
      </button>
      <button
        onClick={() => setScreen('challenges')}
        className={screen === 'challenges' ? 'nav-active' : ''}
      >
        🏆 챌린지
      </button>
      <button
        onClick={() => window.location.href = '/my-map-real'}
        className={screen === 'pattern' ? 'nav-active' : ''}
      >
        🗺️ 나의 지도
      </button>
      <button
        onClick={() => setScreen('profile')}
        className={screen === 'profile' ? 'nav-active' : ''}
      >
        👤 프로필
      </button>

      <style jsx>{`
        .nav-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          background: white;
          border-top: 1px solid #E5E7EB;
          padding: 10px;
          gap: 5px;
          z-index: 100;
        }

        .nav-bar button {
          flex: 1;
          padding: 12px 8px;
          background: transparent;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          color: #6B7280;
        }

        .nav-bar button:hover {
          background: #F3F4F6;
        }

        .nav-active {
          background: #FEF3C7 !important;
          color: #E8740C !important;
        }
      `}</style>
    </div>
  )

  // 역할 선택 화면
  if (screen === 'role') {
    return (
      <div className="role-screen">
        <div className="role-header">
          <h1 className="role-title">WhereHere</h1>
          <p className="role-subtitle">당신은 어떤 탐험가인가요?</p>
        </div>

        <div className="roles-grid">
          {ROLES.map((role) => (
            <div
              key={role.id}
              onClick={() => {
                setSelectedRole(role.id)
                setScreen('mood')
              }}
              className="role-card"
              style={{
                background: `linear-gradient(135deg, ${role.color}, ${role.colorDark})`,
              }}
            >
              <div className="role-icon">{role.icon}</div>
              <div className="role-name">{role.name}</div>
              <div className="role-desc">{role.description}</div>
            </div>
          ))}
        </div>

        <style jsx>{`
          .role-screen {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
          }

          .role-header {
            text-align: center;
            margin-bottom: 50px;
          }

          .role-title {
            font-size: 48px;
            font-weight: bold;
            color: white;
            margin-bottom: 15px;
            font-family: 'Space Grotesk', sans-serif;
          }

          .role-subtitle {
            font-size: 20px;
            color: rgba(255,255,255,0.9);
          }

          .roles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            max-width: 1200px;
            margin: 0 auto;
          }

          .role-card {
            padding: 40px 30px;
            border-radius: 20px;
            color: white;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
            text-align: center;
          }

          .role-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.2);
          }

          .role-icon {
            font-size: 64px;
            margin-bottom: 15px;
          }

          .role-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }

          .role-desc {
            font-size: 14px;
            opacity: 0.9;
            line-height: 1.5;
          }
        `}</style>
      </div>
    )
  }

  // 기분 선택 화면
  if (screen === 'mood') {
    return (
      <div className="mood-screen">
        <button onClick={() => setScreen('role')} className="back-button">
          ← 뒤로
        </button>

        <div className="mood-header">
          <h2>지금 기분이 어때요?</h2>
          <p>당신의 기분에 맞는 장소를 추천해드릴게요</p>
        </div>

        <div className="moods-grid">
          {MOODS.map((mood) => (
            <div
              key={mood.id}
              onClick={() => {
                setSelectedMood(mood.id)
                setScreen('quests')
              }}
              className="mood-card"
              style={{ borderColor: mood.color }}
            >
              <div className="mood-icon">{mood.icon}</div>
              <div className="mood-name">{mood.name}</div>
            </div>
          ))}
        </div>

        <style jsx>{`
          .mood-screen {
            min-height: 100vh;
            background: #F9FAFB;
            padding: 40px 20px;
          }

          .back-button {
            padding: 10px 20px;
            background: white;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 30px;
            font-weight: 600;
          }

          .mood-header {
            text-align: center;
            margin-bottom: 40px;
          }

          .mood-header h2 {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
          }

          .mood-header p {
            font-size: 16px;
            color: #666;
          }

          .moods-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            max-width: 900px;
            margin: 0 auto;
          }

          .mood-card {
            background: white;
            padding: 40px 20px;
            border-radius: 16px;
            border: 3px solid transparent;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
          }

          .mood-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          }

          .mood-icon {
            font-size: 48px;
            margin-bottom: 15px;
          }

          .mood-name {
            font-size: 18px;
            font-weight: 600;
          }
        `}</style>
      </div>
    )
  }

  // 퀘스트 목록 화면
  if (screen === 'quests') {
    return (
      <div className="quests-screen">
        <NavBar />
        
        <div className="quests-content">
          <div className="quests-header">
            <h2>🎯 추천 퀘스트</h2>
            <div className="role-badge" style={{ background: currentRole?.color }}>
              {currentRole?.icon} {currentRole?.name}
            </div>
          </div>

          {questsLoading ? (
            <div className="loading">로딩 중...</div>
          ) : questsError ? (
            <div className="error-message">
              <p>⚠️ 퀘스트를 불러올 수 없어요</p>
              <p>백엔드 서버가 실행 중인지 확인해주세요</p>
            </div>
          ) : !questsData?.recommendations || questsData.recommendations.length === 0 ? (
            <div className="no-quests">
              <p>🔍 추천 퀘스트가 없어요</p>
              <p>다른 역할이나 기분을 선택해보세요</p>
            </div>
          ) : (
            <div className="quests-grid">
              {questsData.recommendations.map((quest: any, i: number) => (
                <div key={i} className="quest-card" onClick={() => {
                  setAcceptedQuest(quest)
                  setScreen('accepted')
                }}>
                  <h3>{quest.name}</h3>
                  <p className="quest-narrative">{quest.narrative}</p>
                  <div className="quest-meta">
                    <span>📍 {quest.distance_meters || 0}m</span>
                    <span>⭐ {quest.average_rating || 0}</span>
                    <span>💰 {(quest.estimated_cost || 0).toLocaleString()}원</span>
                  </div>
                  {quest.vibe_tags && quest.vibe_tags.length > 0 && (
                    <div className="quest-tags">
                      {quest.vibe_tags.map((tag: string) => (
                        <span key={tag} className="tag">#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          .quests-screen {
            min-height: 100vh;
            background: #F9FAFB;
            padding: 20px 20px 80px 20px;
          }

          .quests-content {
            max-width: 1200px;
            margin: 0 auto;
          }

          .quests-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
          }

          .quests-header h2 {
            font-size: 28px;
            font-weight: bold;
          }

          .role-badge {
            padding: 8px 16px;
            border-radius: 20px;
            color: white;
            font-weight: 600;
          }

          .quests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 20px;
          }

          .quest-card {
            background: white;
            padding: 25px;
            border-radius: 16px;
            cursor: pointer;
            transition: transform 0.2s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }

          .quest-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          }

          .quest-card h3 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 12px;
          }

          .quest-narrative {
            font-size: 14px;
            color: #666;
            line-height: 1.6;
            margin-bottom: 15px;
          }

          .quest-meta {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #888;
          }

          .quest-tags {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .tag {
            padding: 4px 10px;
            background: #F3F4F6;
            border-radius: 12px;
            font-size: 12px;
            color: #666;
          }

          .loading, .error-message, .no-quests {
            text-align: center;
            padding: 60px 20px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          }

          .error-message p, .no-quests p {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
          }

          .error-message p:first-child, .no-quests p:first-child {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
        `}</style>
      </div>
    )
  }

  // 수락한 퀘스트 화면
  if (screen === 'accepted' && acceptedQuest) {
    return (
      <div className="accepted-screen">
        <NavBar />
        
        <div className="accepted-content">
          <button onClick={() => setScreen('quests')} className="back-button">
            ← 퀘스트 목록
          </button>

          <div className="quest-detail">
            <h2>{acceptedQuest.name}</h2>
            <p className="narrative">{acceptedQuest.narrative}</p>

            {/* 소셜 공유 버튼 */}
            <ShareButton
              userId={userId}
              questId={acceptedQuest.id || 'quest-' + Date.now()}
              placeId={acceptedQuest.id || 'place-' + Date.now()}
              questData={{
                place_name: acceptedQuest.name,
                narrative: acceptedQuest.narrative,
                xp: 100,
                role_type: selectedRole || 'explorer'
              }}
            />

            {/* 모임 생성 버튼 */}
            <GatheringCreator
              userId={userId}
              placeId={acceptedQuest.id || 'place-' + Date.now()}
              placeName={acceptedQuest.name}
            />

            {/* 미션 체크리스트 */}
            <div className="missions-section">
              <h3>📋 미션 체크리스트</h3>
              <div className="missions-list">
                <MissionItem title="장소에 도착하기" />
                <MissionItem title="30분 이상 체류하기" />
                <MissionItem title="사진 1장 촬영하기" />
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .accepted-screen {
            min-height: 100vh;
            background: #F9FAFB;
            padding: 20px 20px 80px 20px;
          }

          .accepted-content {
            max-width: 800px;
            margin: 0 auto;
          }

          .back-button {
            padding: 10px 20px;
            background: white;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 20px;
            font-weight: 600;
          }

          .quest-detail {
            background: white;
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }

          .quest-detail h2 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 15px;
          }

          .narrative {
            font-size: 16px;
            line-height: 1.8;
            color: #555;
            margin-bottom: 25px;
            padding: 20px;
            background: #F9FAFB;
            border-radius: 12px;
            border-left: 4px solid #E8740C;
          }

          .missions-section {
            margin-top: 30px;
          }

          .missions-section h3 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
          }

          .missions-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
        `}</style>
      </div>
    )
  }

  // 패턴 분석 화면
  if (screen === 'pattern') {
    return (
      <div className="pattern-screen">
        <NavBar />
        <PatternMap userId={userId} />
      </div>
    )
  }

  // 챌린지 화면
  if (screen === 'challenges') {
    return (
      <div className="challenges-screen">
        <NavBar />
        
        <div className="challenges-content">
          <h2>🏆 챌린지</h2>
          
          <ChallengeGenerator
            userId={userId}
            onChallengeGenerated={(challenge) => {
              if (challenge.challenge_id) {
                setActiveChallengeId(challenge.challenge_id)
              }
            }}
          />

          {activeChallengeId && (
            <ChallengeCard
              challengeId={activeChallengeId}
              userId={userId}
              onComplete={() => {
                alert('축하합니다! 챌린지를 완료했어요! 🎉')
                setActiveChallengeId(null)
              }}
            />
          )}
        </div>

        <style jsx>{`
          .challenges-screen {
            min-height: 100vh;
            background: #F9FAFB;
            padding: 20px 20px 80px 20px;
          }

          .challenges-content {
            max-width: 1000px;
            margin: 0 auto;
          }

          .challenges-content h2 {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 20px;
          }
        `}</style>
      </div>
    )
  }

  // 프로필 화면
  if (screen === 'profile') {
    return (
      <div className="profile-screen">
        <NavBar />
        <PersonalityProfile userId={userId} />
      </div>
    )
  }

  return null
}

function MissionItem({ title }: { title: string }) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="mission-item" onClick={() => setChecked(!checked)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => {}}
        className="mission-checkbox"
      />
      <span className={checked ? 'mission-text-checked' : 'mission-text'}>
        {title}
      </span>

      <style jsx>{`
        .mission-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: #F9FAFB;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .mission-item:hover {
          background: #F3F4F6;
        }

        .mission-checkbox {
          width: 24px;
          height: 24px;
          cursor: pointer;
        }

        .mission-text {
          font-size: 16px;
          font-weight: 500;
        }

        .mission-text-checked {
          font-size: 16px;
          font-weight: 500;
          text-decoration: line-through;
          color: #9CA3AF;
        }
      `}</style>
    </div>
  )
}
