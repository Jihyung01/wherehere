'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '@/lib/api-client'
import { ChallengeCard } from './challenge-card'
import { PersonalityProfile } from './personality-profile'
import { ShareButton } from './share-button'

type Screen = 'role' | 'mood' | 'quests' | 'accepted' | 'checkin' | 'review' | 'challenges' | 'profile' | 'social' | 'settings'
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

export function CompleteApp() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('role')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<any>(null)
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [userId] = useState('user-demo-001')
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [reviewData, setReviewData] = useState({ rating: 0, review: '', photos: [] as string[] })
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [checklist, setChecklist] = useState([false, false, false, false])
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showLocationSettings, setShowLocationSettings] = useState(false)
  const [showPrivacySettings, setShowPrivacySettings] = useState(false)
  const [showHelpSettings, setShowHelpSettings] = useState(false)

  // 테마 로드 및 저장
  useEffect(() => {
    const savedTheme = localStorage.getItem('isDarkMode');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('isDarkMode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
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

  const handleCheckIn = async () => {
    setCheckInTime(new Date())
    setScreen('checkin')
    setTimeout(() => setScreen('review'), 3000)
  }

  const handleSubmitReview = async () => {
    if (!acceptedQuest || !checkInTime) return
    const duration = Math.floor((new Date().getTime() - checkInTime.getTime()) / 1000 / 60)
    
    try {
      console.log('방문 기록 생성 중...', {
        user_id: userId,
        place_id: acceptedQuest.place_id || acceptedQuest.id,
        place_name: acceptedQuest.name,
        rating: reviewData.rating,
        duration_minutes: Math.max(duration, 30)
      })
      
      const response = await fetch('http://localhost:8000/api/v1/visits', {
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
      console.log('방문 기록 응답:', data)
      
      if (data.success) {
        // 성공 알림 - 더 명확하게
        const xpEarned = data.xp_earned || 100
        alert(`🎉 방문 완료!\n\n+${xpEarned} XP 획득\n총 XP는 "나의 지도"에서 확인하세요!`)
        
        // 상태 초기화
        setReviewData({ rating: 0, review: '', photos: [] })
        setUploadedPhotos([])
        setCheckInTime(null)
        setChecklist([false, false, false, false])
        
        // 나의 지도로 이동
        router.push('/my-map-real')
      } else {
        alert('❌ 방문 기록 저장 실패\n다시 시도해주세요.')
      }
    } catch (error) {
      console.error('방문 기록 생성 실패:', error)
      alert('❌ 네트워크 오류\n인터넷 연결을 확인해주세요.')
    }
  }

  // 소셜 공유 함수 - Web Share API + 네이티브 공유
  const handleShare = async (platform: string) => {
    const shareTitle = `🗺️ WhereHere`
    const shareText = `${acceptedQuest?.name || '멋진 장소'}를 발견했어요!`
    const shareUrl = `${window.location.origin}?quest=${acceptedQuest?.place_id || ''}`
    const fullText = `${shareText}\n\n${shareUrl}`
    
    try {
      if (platform === 'kakao') {
        // 카카오톡 - Web Share API 시도
        if (navigator.share) {
          try {
            await navigator.share({
              title: shareTitle,
              text: fullText,
            })
            console.log('공유 성공')
            return
          } catch (shareError: any) {
            if (shareError.name !== 'AbortError') {
              console.log('Web Share 실패, 대체 방법 사용')
            } else {
              return // 사용자가 취소함
            }
          }
        }
        
        // 대체: 클립보드 복사
        await navigator.clipboard.writeText(fullText)
        alert('📋 링크가 복사되었습니다!\n카카오톡에서 붙여넣기 해주세요.')
        
      } else if (platform === 'twitter') {
        // 트위터 - 실제 공유창
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}&hashtags=WhereHere,여행,맛집`
        window.open(twitterUrl, '_blank', 'width=600,height=400,scrollbars=yes')
        
      } else if (platform === 'facebook') {
        // 페이스북 - 실제 공유창
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
        window.open(facebookUrl, '_blank', 'width=600,height=600,scrollbars=yes')
        
      } else if (platform === 'instagram') {
        // 인스타그램 - Web Share API 또는 클립보드
        if (navigator.share) {
          try {
            await navigator.share({
              title: shareTitle,
              text: fullText,
            })
            return
          } catch (shareError: any) {
            if (shareError.name === 'AbortError') return
          }
        }
        
        // 클립보드 복사
        try {
          await navigator.clipboard.writeText(fullText)
          // 사용자 친화적 알림
          const notification = document.createElement('div')
          notification.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#fff;padding:20px 30px;border-radius:12px;z-index:10000;font-size:14px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
          notification.innerHTML = '📋 링크가 복사되었습니다!<br><small style="opacity:0.8;margin-top:8px;display:block;">인스타그램 스토리/DM에서 붙여넣기 해주세요</small>'
          document.body.appendChild(notification)
          setTimeout(() => document.body.removeChild(notification), 3000)
        } catch (err) {
          alert('📋 링크: ' + fullText)
        }
      }
    } catch (error) {
      console.error('공유 실패:', error)
      // 최종 대체: 텍스트 표시
      alert(`📋 이 링크를 복사해주세요:\n\n${fullText}`)
    }
  }

  // 사진 업로드 핸들러
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newPhotos: string[] = []
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          newPhotos.push(reader.result as string)
          if (newPhotos.length === files.length) {
            setUploadedPhotos([...uploadedPhotos, ...newPhotos])
            setReviewData({...reviewData, photos: [...reviewData.photos, ...newPhotos]})
          }
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // 체크리스트 토글
  const toggleChecklistItem = (index: number) => {
    const newChecklist = [...checklist]
    newChecklist[index] = !newChecklist[index]
    setChecklist(newChecklist)
  }

  // 모든 체크리스트 완료 확인
  const allChecklistCompleted = checklist.every(item => item)

  const bgColor = isDarkMode ? '#0A0E14' : '#FFFFFF'
  const textColor = isDarkMode ? '#FFFFFF' : '#1F2937'
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'

  // 하단 네비게이션
  const BottomNav = () => (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: isDarkMode ? 'rgba(10,14,20,0.95)' : 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${borderColor}`,
      display: 'flex', padding: '8px 0 24px', zIndex: 100,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
    }}>
      {[
        { icon: '🏠', label: '홈', onClick: () => { setScreen('role'); setAcceptedQuest(null); } },
        { icon: '🗺️', label: '나의 지도', onClick: () => router.push('/my-map-real') },
        { icon: '🎯', label: '챌린지', onClick: () => setScreen('challenges') },
        { icon: '👤', label: '프로필', onClick: () => setScreen('profile') },
        { icon: '⚙️', label: '설정', onClick: () => setScreen('settings') },
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
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WhereHere
            </h1>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>오늘은 어떤 역할로 탐험할까요?</p>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {ROLES.map((role, i) => (
              <div key={role.id} onClick={() => { setSelectedRole(role.id); setScreen('mood'); }}
                style={{
                  background: isDarkMode ? `linear-gradient(135deg, ${role.color}15, ${role.color}05)` : cardBg,
                  border: `1px solid ${role.color}30`,
                  borderRadius: 16, padding: 20, cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = `${role.color}60`; }}
                   onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = `${role.color}30`; }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: 40 }}>{role.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{role.name}</div>
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{role.description}</div>
                  </div>
                  <div style={{ fontSize: 20, color: role.color }}>→</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 기분 선택 화면
  if (screen === 'mood') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('role')} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '8px 16px', color: textColor, cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💭</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>지금 기분은 어때요?</h2>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>당신의 감정에 맞는 장소를 추천해드릴게요</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {MOODS.map((mood, i) => (
              <div key={mood.id} onClick={() => { setSelectedMood(mood.id); setScreen('quests'); }}
                style={{
                  background: isDarkMode ? `linear-gradient(135deg, ${mood.color}15, ${mood.color}05)` : cardBg,
                  border: `1px solid ${mood.color}30`,
                  borderRadius: 16, padding: 24, cursor: 'pointer', textAlign: 'center',
                  transition: 'all 0.3s',
                  boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
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
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('mood')} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '8px 16px', color: textColor, cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>AI가 추천하는 퀘스트</h2>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>당신을 위한 특별한 장소 3곳</p>
          </div>

          {questsLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔮</div>
              <div style={{ fontSize: 16, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>AI가 분석 중...</div>
            </div>
          ) : questsData?.recommendations ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {questsData.recommendations.map((quest: any, i: number) => (
                <div key={i} onClick={() => { setAcceptedQuest(quest); setScreen('accepted'); }}
                  style={{
                    background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 16, padding: 20, cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                  }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#E8740C60'}
                     onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#E8740C', fontWeight: 600, marginBottom: 4 }}>{quest.category}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{quest.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#E8740C' }}>{quest.score}</div>
                      <div style={{ fontSize: 9, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>점수</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 12 }}>{quest.address}</div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                    <span>📍 {quest.distance_meters}m</span>
                    <span>⭐ {quest.average_rating || '-'}</span>
                    {quest.estimated_cost && <span>💰 {(quest.estimated_cost/1000).toFixed(0)}천원</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 60, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
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
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('quests')} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '8px 16px', color: textColor, cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{acceptedQuest.name}</h2>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', lineHeight: 1.6 }}>{acceptedQuest.narrative || acceptedQuest.reason}</p>
          </div>

          {/* 소셜 공유 */}
          <div style={{ background: isDarkMode ? 'rgba(232,116,12,0.1)' : '#FEF3C7', border: '1px solid rgba(232,116,12,0.3)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#E8740C' }}>📢 친구에게 공유하기</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: '💬', name: '카카오톡', platform: 'kakao' },
                { icon: '📷', name: '인스타', platform: 'instagram' },
                { icon: '🐦', name: '트위터', platform: 'twitter' },
                { icon: '📘', name: '페이스북', platform: 'facebook' },
              ].map((social, i) => (
                <button key={i} onClick={() => handleShare(social.platform)} style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12, padding: '12px 8px', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: textColor,
                  transition: 'all 0.2s',
                }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{social.icon}</div>
                  {social.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: isDarkMode ? 'rgba(232,116,12,0.1)' : '#FEF3C7', border: '1px solid rgba(232,116,12,0.3)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#E8740C' }}>
              📋 미션 체크리스트 ({checklist.filter(c => c).length}/4)
            </div>
            {['장소 도착하기', '사진 찍기', '특별한 순간 기록하기', '리뷰 남기기'].map((mission, i) => (
              <div key={i} onClick={() => toggleChecklistItem(i)} style={{ 
                padding: '12px', 
                borderBottom: i < 3 ? `1px solid ${borderColor}` : 'none', 
                fontSize: 13, 
                color: checklist[i] ? '#E8740C' : (isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280'),
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s',
                fontWeight: checklist[i] ? 600 : 400,
              }} onMouseEnter={(e) => e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.03)' : 'rgba(232,116,12,0.05)'}
                 onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 16 }}>{checklist[i] ? '✅' : '☐'}</span>
                <span style={{ textDecoration: checklist[i] ? 'line-through' : 'none' }}>{mission}</span>
              </div>
            ))}
          </div>

          {allChecklistCompleted && (
            <div style={{ 
              background: 'linear-gradient(135deg, #10B981, #059669)', 
              border: 'none', 
              borderRadius: 16, 
              padding: 16, 
              marginBottom: 16,
              textAlign: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              🎉 모든 미션 완료! 이제 체크인하세요!
            </div>
          )}

          <button onClick={handleCheckIn} disabled={!allChecklistCompleted} style={{
            width: '100%', padding: 18, 
            background: allChecklistCompleted ? 'linear-gradient(135deg, #E8740C, #C65D00)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
            border: 'none', borderRadius: 16, 
            color: allChecklistCompleted ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF'), 
            fontSize: 16, fontWeight: 700,
            cursor: allChecklistCompleted ? 'pointer' : 'not-allowed', 
            transition: 'all 0.3s', 
            boxShadow: allChecklistCompleted ? '0 4px 20px rgba(232,116,12,0.3)' : 'none',
            opacity: allChecklistCompleted ? 1 : 0.5,
          }} onMouseEnter={(e) => { if (allChecklistCompleted) e.currentTarget.style.transform = 'scale(1.02)'; }}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            {allChecklistCompleted ? '✅ 체크인하기' : '🔒 미션을 완료하세요'}
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 체크인 완료 화면
  if (screen === 'checkin') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'bounce 1s ease infinite' }}>🎉</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>체크인 완료!</h2>
          <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>잠시 후 리뷰 작성 화면으로 이동합니다...</p>
        </div>
        <style jsx>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
      </div>
    )
  }

  // 리뷰 작성 화면
  if (screen === 'review') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⭐</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>방문은 어떠셨나요?</h2>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>소중한 경험을 기록해주세요</p>
          </div>

          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              별점 선택 {reviewData.rating === 0 && <span style={{ color: '#EF4444', fontSize: 11 }}>(필수)</span>}
            </div>
            {reviewData.rating > 0 && (
              <div style={{ fontSize: 11, color: '#E8740C', marginBottom: 8 }}>
                ⭐ {reviewData.rating}점 선택됨
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <div key={star} onClick={() => setReviewData({...reviewData, rating: star})}
                  style={{ 
                    fontSize: 40, 
                    cursor: 'pointer', 
                    transition: 'all 0.2s', 
                    color: star <= reviewData.rating ? '#F59E0B' : (isDarkMode ? 'rgba(255,255,255,0.2)' : '#D1D5DB'),
                    filter: star <= reviewData.rating ? 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.3)'
                    e.currentTarget.style.filter = 'drop-shadow(0 0 12px rgba(245,158,11,0.8))'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.filter = star <= reviewData.rating ? 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' : 'none'
                  }}>
                  ⭐
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>후기 작성 (선택)</div>
            <textarea value={reviewData.review} onChange={(e) => setReviewData({...reviewData, review: e.target.value})}
              placeholder="이 장소에서의 특별한 순간을 기록해주세요..."
              style={{
                width: '100%', minHeight: 100, padding: 12, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
                border: `1px solid ${borderColor}`, borderRadius: 12, color: textColor,
                fontSize: 14, fontFamily: 'inherit', resize: 'vertical', marginBottom: 16,
              }} />

            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>사진 업로드 (선택)</div>
            <label style={{
              display: 'block',
              width: '100%',
              padding: 20,
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
              border: `2px dashed ${borderColor}`,
              borderRadius: 12,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: uploadedPhotos.length > 0 ? 12 : 0,
            }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#E8740C'}
               onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
              <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                클릭해서 사진 추가
              </div>
            </label>

            {uploadedPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                {uploadedPhotos.map((photo, i) => (
                  <div key={i} style={{ position: 'relative', paddingTop: '100%', borderRadius: 8, overflow: 'hidden', border: `1px solid ${borderColor}` }}>
                    <img src={photo} alt={`upload-${i}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => {
                      const newPhotos = uploadedPhotos.filter((_, idx) => idx !== i)
                      setUploadedPhotos(newPhotos)
                      setReviewData({...reviewData, photos: newPhotos})
                    }} style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)', border: 'none',
                      color: '#fff', fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {reviewData.rating === 0 && (
            <div style={{
              background: isDarkMode ? 'rgba(239,68,68,0.1)' : '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              textAlign: 'center',
              color: '#EF4444',
              fontSize: 13,
              fontWeight: 600,
            }}>
              ⚠️ 별점을 선택해주세요
            </div>
          )}

          <button onClick={handleSubmitReview} disabled={reviewData.rating === 0} style={{
            width: '100%', padding: 18, 
            background: reviewData.rating > 0 ? 'linear-gradient(135deg, #E8740C, #C65D00)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
            border: 'none', borderRadius: 16, 
            color: reviewData.rating > 0 ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF'), 
            fontSize: 16, fontWeight: 700,
            cursor: reviewData.rating > 0 ? 'pointer' : 'not-allowed', 
            transition: 'all 0.3s',
            opacity: reviewData.rating > 0 ? 1 : 0.5,
            boxShadow: reviewData.rating > 0 ? '0 4px 20px rgba(232,116,12,0.3)' : 'none',
          }} onMouseEnter={(e) => { if (reviewData.rating > 0) e.currentTarget.style.transform = 'scale(1.02)'; }}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            {reviewData.rating > 0 ? '✅ 완료하고 XP 받기' : '🔒 별점을 선택하세요'}
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 챌린지 화면
  if (screen === 'challenges') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>챌린지</h2>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>도전 과제를 완료하고 보상을 받으세요</p>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { icon: '🔥', title: '7일 연속 방문', desc: '7일 동안 매일 새로운 장소 방문', progress: 3, total: 7, reward: '500 XP' },
              { icon: '🗺️', title: '지역 탐험가', desc: '서울 5개 구역 방문', progress: 2, total: 5, reward: '300 XP' },
              { icon: '⭐', title: '별점 마스터', desc: '10개 장소에 리뷰 작성', progress: 4, total: 10, reward: '200 XP' },
            ].map((challenge, i) => (
              <div key={i} style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 16, padding: 20,
                boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 32 }}>{challenge.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{challenge.title}</div>
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{challenge.desc}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span>{challenge.progress}/{challenge.total}</span>
                    <span style={{ color: '#E8740C', fontWeight: 600 }}>{challenge.reward}</span>
                  </div>
                  <div style={{ height: 6, background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(challenge.progress / challenge.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #E8740C, #F59E0B)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 프로필 화면
  if (screen === 'profile') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <PersonalityProfile userId={userId} />
        </div>
        <BottomNav />
      </div>
    )
  }

  // 설정 화면
  if (screen === 'settings') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>설정</h2>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {/* 다크모드 토글 */}
            <div style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 16, padding: 20,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                  {isDarkMode ? '🌙' : '☀️'} {isDarkMode ? '다크 모드' : '라이트 모드'}
                </div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                  테마 변경
                </div>
              </div>
              <button onClick={() => setIsDarkMode(!isDarkMode)} style={{
                width: 60, height: 32, borderRadius: 16,
                background: isDarkMode ? '#E8740C' : '#E5E7EB',
                border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'all 0.3s',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#FFFFFF',
                  position: 'absolute',
                  top: 2,
                  left: isDarkMode ? 30 : 2,
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            {/* 알림 설정 */}
            <div onClick={() => setShowNotificationSettings(!showNotificationSettings)} style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 16, padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 24 }}>🔔</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>알림 설정</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>푸시 알림 관리</div>
                </div>
                <div style={{ fontSize: 16, color: '#E8740C' }}>{showNotificationSettings ? '▼' : '→'}</div>
              </div>
              {showNotificationSettings && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                  {['새 퀘스트 알림', '챌린지 완료 알림', '친구 활동 알림'].map((notif, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                      <span style={{ fontSize: 13 }}>{notif}</span>
                      <input type="checkbox" defaultChecked style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 위치 서비스 */}
            <div onClick={() => setShowLocationSettings(!showLocationSettings)} style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 16, padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 24 }}>🗺️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>위치 서비스</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>GPS 권한 관리</div>
                </div>
                <div style={{ fontSize: 16, color: '#E8740C' }}>{showLocationSettings ? '▼' : '→'}</div>
              </div>
              {showLocationSettings && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: 13, marginBottom: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                    현재 위치: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                  </div>
                  <button onClick={(e) => {
                    e.stopPropagation()
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
                          alert('위치가 업데이트되었습니다!')
                        },
                        (error) => alert('위치 가져오기 실패: ' + error.message)
                      )
                    }
                  }} style={{
                    padding: '8px 16px',
                    background: '#E8740C',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    위치 새로고침
                  </button>
                </div>
              )}
            </div>

            {/* 개인정보 */}
            <div onClick={() => setShowPrivacySettings(!showPrivacySettings)} style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 16, padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 24 }}>🔒</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>개인정보</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>계정 및 보안</div>
                </div>
                <div style={{ fontSize: 16, color: '#E8740C' }}>{showPrivacySettings ? '▼' : '→'}</div>
              </div>
              {showPrivacySettings && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>사용자 ID: {userId}</div>
                  <div style={{ fontSize: 13, marginBottom: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                    계정 생성일: 2024년 1월
                  </div>
                  <button onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('정말 로그아웃하시겠습니까?')) {
                      alert('로그아웃되었습니다.')
                      setScreen('role')
                    }
                  }} style={{
                    padding: '8px 16px',
                    background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                    border: 'none',
                    borderRadius: 8,
                    color: textColor,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>

            {/* 도움말 */}
            <div onClick={() => setShowHelpSettings(!showHelpSettings)} style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 16, padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 24 }}>❓</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>도움말</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>사용 가이드</div>
                </div>
                <div style={{ fontSize: 16, color: '#E8740C' }}>{showHelpSettings ? '▼' : '→'}</div>
              </div>
              {showHelpSettings && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                    <p style={{ marginBottom: 8 }}>📍 <strong>퀘스트 시작:</strong> 역할과 기분을 선택하면 AI가 맞춤 장소를 추천합니다.</p>
                    <p style={{ marginBottom: 8 }}>✅ <strong>체크인:</strong> 장소에 도착하면 미션을 완료하고 체크인하세요.</p>
                    <p style={{ marginBottom: 8 }}>⭐ <strong>리뷰 작성:</strong> 방문 후 별점과 후기를 남기면 XP를 획득합니다.</p>
                    <p>🗺️ <strong>나의 지도:</strong> 방문 기록과 통계를 확인하세요.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return null
}
