'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '@/lib/api-client'
import { useUser } from '@/hooks/useUser'
import { ChallengeCard } from './challenge-card'

type Screen = 'role' | 'mood' | 'quests' | 'accepted' | 'checkin' | 'review' | 'my-map' | 'social'
type RoleType = 'explorer' | 'healer' | 'artist' | 'foodie' | 'challenger'
type MoodType = 'curious' | 'tired' | 'creative' | 'hungry' | 'adventurous'

const ROLES = [
  { id: 'explorer' as RoleType, name: '탐험가', icon: '🧭', description: '숨겨진 보석을 찾아 떠나는 모험가', color: '#E8740C' },
  { id: 'healer' as RoleType, name: '힐러', icon: '🌿', description: '지친 마음을 달래는 휴식 전문가', color: '#10B981' },
  { id: 'artist' as RoleType, name: '예술가', icon: '🎨', description: '영감을 찾아 떠나는 창작자', color: '#8B5CF6' },
  { id: 'foodie' as RoleType, name: '미식가', icon: '🍜', description: '맛의 세계를 탐험하는 미각 전문가', color: '#F59E0B' },
  { id: 'challenger' as RoleType, name: '도전자', icon: '⚡', description: '한계를 넘어서는 도전 정신', color: '#EF4444' },
]

const MOODS = [
  { id: 'curious' as MoodType, name: '호기심 가득', icon: '🔍', color: '#E8740C' },
  { id: 'tired' as MoodType, name: '지쳐있어요', icon: '😴', color: '#10B981' },
  { id: 'creative' as MoodType, name: '영감 필요', icon: '✨', color: '#8B5CF6' },
  { id: 'hungry' as MoodType, name: '배고파요', icon: '🍽️', color: '#F59E0B' },
  { id: 'adventurous' as MoodType, name: '모험 준비됨', icon: '🚀', color: '#EF4444' },
]

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export function UnifiedApp() {
  const router = useRouter()
  const { user } = useUser()
  const userId = user?.id ?? 'user-demo-001'
  const [screen, setScreen] = useState<Screen>('role')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<any>(null)
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [reviewData, setReviewData] = useState({ rating: 0, review: '', photos: [] as string[] })

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        },
        (error) => console.log('위치 가져오기 실패:', error)
      )
    }
  }, [])

  const { data: questsData, isLoading: questsLoading } = useQuery({
    queryKey: ['recommendations', userLocation.lat, userLocation.lng, selectedRole, selectedMood],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, selectedRole!, selectedMood!),
    enabled: !!selectedRole && !!selectedMood && screen === 'quests',
    retry: 1,
  })

  // Phase 1: 체크인 핸들러
  const handleCheckIn = async () => {
    setCheckInTime(new Date())
    setScreen('checkin')
    
    // 3초 후 리뷰 화면으로
    setTimeout(() => {
      setScreen('review')
    }, 3000)
  }

  // Phase 1 & 2: 리뷰 제출 핸들러
  const handleSubmitReview = async () => {
    if (!acceptedQuest || !checkInTime) return

    const duration = Math.floor((new Date().getTime() - checkInTime.getTime()) / 1000 / 60)
    
    try {
      const response = await fetch(`${API_BASE}/api/v1/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          place_id: acceptedQuest.place_id || acceptedQuest.id,
          duration_minutes: Math.max(duration, 30),
          rating: reviewData.rating,
          mood: selectedMood,
          spent_amount: null,
          companions: 1
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`🎉 +${data.xp_earned} XP 획득!`)
        router.push('/my-map-real')
      }
    } catch (error) {
      console.error('방문 기록 생성 실패:', error)
      alert('방문 기록 저장에 실패했습니다.')
    }
  }

  // 하단 네비게이션 바
  const BottomNav = () => (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: 'rgba(10,14,20,0.95)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', padding: '8px 0 24px', zIndex: 100,
    }}>
      {[
        { icon: '🏠', label: '홈', onClick: () => { setScreen('role'); setAcceptedQuest(null); } },
        { icon: '🗺️', label: '나의 지도', onClick: () => router.push('/my-map-real') },
        { icon: '🧭', label: '탐험', onClick: () => setScreen('role') },
        { icon: '👥', label: '소셜', onClick: () => setScreen('social') },
      ].map((n, i) => (
        <div key={i} onClick={n.onClick} style={{
          flex: 1, textAlign: 'center', cursor: 'pointer',
          opacity: 0.7, transition: 'opacity 0.2s',
        }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
           onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}>
          <div style={{ fontSize: 20 }}>{n.icon}</div>
          <div style={{ fontSize: 9, marginTop: 2, color: '#E8740C', fontWeight: 600 }}>{n.label}</div>
        </div>
      ))}
    </div>
  )

  // 역할 선택 화면
  if (screen === 'role') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(90deg, #fff, #E8740C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WhereHere
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>오늘은 어떤 역할로 탐험할까요?</p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {ROLES.map((role, i) => (
              <div key={role.id} onClick={() => { setSelectedRole(role.id); setScreen('mood'); }}
                style={{
                  background: `linear-gradient(135deg, ${role.color}15, ${role.color}05)`,
                  border: `1px solid ${role.color}30`,
                  borderRadius: 16, padding: 20, cursor: 'pointer',
                  transition: 'all 0.3s', animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = `${role.color}60`; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = `${role.color}30`; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 40 }}>{role.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{role.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{role.description}</div>
                  </div>
                  <div style={{ fontSize: 20, color: role.color }}>→</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
        <style jsx global>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    )
  }

  // 기분 선택 화면
  if (screen === 'mood') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('role')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💭</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>지금 기분은 어때요?</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>당신의 감정에 맞는 장소를 추천해드릴게요</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {MOODS.map((mood, i) => (
              <div key={mood.id} onClick={() => { setSelectedMood(mood.id); setScreen('quests'); }}
                style={{
                  background: `linear-gradient(135deg, ${mood.color}15, ${mood.color}05)`,
                  border: `1px solid ${mood.color}30`,
                  borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.3s', animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = `${mood.color}60`; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = `${mood.color}30`; }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{mood.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{mood.name}</div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 퀘스트 목록 화면
  if (screen === 'quests') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('mood')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>AI가 추천하는 퀘스트</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>당신을 위한 특별한 장소 3곳</p>
          </div>

          {questsLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔮</div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>AI가 분석 중...</div>
            </div>
          ) : questsData?.recommendations ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {questsData.recommendations.map((quest: any, i: number) => (
                <div key={i} onClick={() => { setAcceptedQuest(quest); setScreen('accepted'); }}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16, padding: 20, cursor: 'pointer',
                    transition: 'all 0.3s', animation: `fadeIn 0.4s ease ${i * 0.15}s both`,
                  }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#E8740C60'}
                     onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#E8740C', fontWeight: 600, marginBottom: 4 }}>{quest.category}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{quest.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#E8740C' }}>{quest.score}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>점수</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>{quest.address}</div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                    <span>📍 {quest.distance_meters}m</span>
                    <span>⭐ {quest.average_rating || '-'}</span>
                    {quest.estimated_cost && <span>💰 {(quest.estimated_cost/1000).toFixed(0)}천원</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.5)' }}>
              추천 장소를 불러오지 못했습니다.
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    )
  }

  // 수락한 퀘스트 화면
  if (screen === 'accepted' && acceptedQuest) {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('quests')} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 12, padding: '8px 16px', color: '#fff', cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{acceptedQuest.name}</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{acceptedQuest.narrative || acceptedQuest.reason}</p>
          </div>

          <div style={{ background: 'rgba(232,116,12,0.1)', border: '1px solid rgba(232,116,12,0.3)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#E8740C' }}>📋 미션 체크리스트</div>
            {['장소 도착하기', '사진 찍기', '특별한 순간 기록하기', '리뷰 남기기'].map((mission, i) => (
              <div key={i} style={{ padding: '12px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                ☐ {mission}
              </div>
            ))}
          </div>

          <button onClick={handleCheckIn} style={{
            width: '100%', padding: 18, background: 'linear-gradient(135deg, #E8740C, #C65D00)',
            border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 4px 20px rgba(232,116,12,0.3)',
          }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            ✅ 체크인하기
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Phase 1: 체크인 완료 화면
  if (screen === 'checkin') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'bounce 1s ease infinite' }}>🎉</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>체크인 완료!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>잠시 후 리뷰 작성 화면으로 이동합니다...</p>
        </div>
        <style jsx>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
      </div>
    )
  }

  // Phase 2: 리뷰 작성 화면
  if (screen === 'review') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>방문은 어떠셨나요?</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>소중한 경험을 기록해주세요</p>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>별점 선택</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <div key={star} onClick={() => setReviewData({...reviewData, rating: star})}
                  style={{ fontSize: 32, cursor: 'pointer', transition: 'all 0.2s', color: star <= reviewData.rating ? '#F59E0B' : 'rgba(255,255,255,0.2)' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  ⭐
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>후기 작성 (선택)</div>
            <textarea value={reviewData.review} onChange={(e) => setReviewData({...reviewData, review: e.target.value})}
              placeholder="이 장소에서의 특별한 순간을 기록해주세요..."
              style={{
                width: '100%', minHeight: 100, padding: 12, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff',
                fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
              }} />
          </div>

          <button onClick={handleSubmitReview} disabled={reviewData.rating === 0} style={{
            width: '100%', padding: 18, background: reviewData.rating > 0 ? 'linear-gradient(135deg, #E8740C, #C65D00)' : 'rgba(255,255,255,0.1)',
            border: 'none', borderRadius: 16, color: '#fff', fontSize: 16, fontWeight: 700,
            cursor: reviewData.rating > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.3s',
            opacity: reviewData.rating > 0 ? 1 : 0.5,
          }} onMouseEnter={(e) => { if (reviewData.rating > 0) e.currentTarget.style.transform = 'scale(1.02)'; }}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            완료하고 XP 받기
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // Phase 4: 소셜 화면
  if (screen === 'social') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#0A0E14', color: '#fff', fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>소셜</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>친구들과 탐험을 공유하세요</p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { icon: '🌟', title: '친구 초대하기', desc: '함께 탐험할 친구를 초대하세요', color: '#E8740C' },
              { icon: '📊', title: '탐험 스타일 비교', desc: '친구와 나의 스타일을 비교해보세요', color: '#8B5CF6' },
              { icon: '🗺️', title: '공유된 장소', desc: '친구들이 추천한 장소를 확인하세요', color: '#10B981' },
              { icon: '🏆', title: '리더보드', desc: '이번 달 탐험 랭킹을 확인하세요', color: '#F59E0B' },
            ].map((item, i) => (
              <div key={i} style={{
                background: `linear-gradient(135deg, ${item.color}15, ${item.color}05)`,
                border: `1px solid ${item.color}30`,
                borderRadius: 16, padding: 20, cursor: 'pointer',
                transition: 'all 0.3s', animation: `fadeIn 0.4s ease ${i * 0.1}s both`,
              }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = `${item.color}60`; }}
                 onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = `${item.color}30`; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 32 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{item.desc}</div>
                  </div>
                  <div style={{ fontSize: 16, color: item.color }}>→</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return null
}
