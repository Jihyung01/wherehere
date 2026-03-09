'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '@/lib/api-client'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ChallengeCard } from './challenge-card'
import { PersonalityProfile } from './personality-profile'
import { ShareButton } from './share-button'
import { LocalHub } from './local/LocalHub'
import { RoleScreen, MoodScreen, ROLES, MOODS, type RoleType, type MoodType } from './screens'
import { makeStoryCard, makeFeedCard, blobToFile, makeCaption, shareOrDownload } from '@/lib/instagram-cards'
import type { Mission } from './missions'
import { selectMissions } from './missions'
import { compressImageFile } from '@/lib/image-compress'
import { toast } from 'sonner'
import { ConfirmModal } from './ui/ConfirmModal'
import { Onboarding, shouldShowOnboarding } from './Onboarding'
import { QuestCompleteScreen } from './QuestCompleteScreen'

declare global {
  interface Window {
    kakao: any
  }
}

type Screen = 'home' | 'role' | 'mood' | 'quests' | 'accepted' | 'checkin' | 'review' | 'challenges' | 'profile' | 'social' | 'chat' | 'settings' | 'kakao-api-test'

// 브라우저에서는 같은 출처 사용 → Next API 프록시가 백엔드로 전달 (405/CORS 방지)
const API_BASE = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

/** 도착 인정 거리(미터): 이 거리 이내면 "장소 도착하기" 조건 충족 */
const ARRIVAL_THRESHOLD_METERS = 100

type ChallengeCategory = 'daily' | 'weekly' | 'achievement' | 'social' | 'explorer'
const CHALLENGE_CATEGORIES: { id: ChallengeCategory; label: string }[] = [
  { id: 'daily', label: '일일' },
  { id: 'weekly', label: '주간' },
  { id: 'achievement', label: '업적' },
  { id: 'social', label: '소셜' },
  { id: 'explorer', label: '탐험' },
]
const CHALLENGES_BY_CATEGORY: Record<ChallengeCategory, { id: string; icon: string; title: string; desc: string; total: number; rewardXP: number; tier?: 'bronze' | 'silver' | 'gold' }[]> = {
  daily: [
    { id: 'd1', icon: '☀️', title: '오늘의 탐험가', desc: '오늘 1곳 이상 방문', total: 1, rewardXP: 50 },
    { id: 'd2', icon: '📸', title: '오늘의 포토그래퍼', desc: '오늘 사진 미션 1개 완료', total: 1, rewardXP: 30 },
    { id: 'd3', icon: '✍️', title: '오늘의 리뷰어', desc: '오늘 리뷰 1개 작성', total: 1, rewardXP: 30 },
  ],
  weekly: [
    { id: 'w1', icon: '🔥', title: '주간 스트릭', desc: '이번 주 5일 연속 방문', total: 5, rewardXP: 200 },
    { id: 'w2', icon: '🗺️', title: '동네 탐험대', desc: '이번 주 서로 다른 장소 3곳', total: 3, rewardXP: 150 },
    { id: 'w3', icon: '🍽️', title: '미식 주간', desc: '이번 주 음식점 3곳 리뷰', total: 3, rewardXP: 150 },
    { id: 'w4', icon: '💬', title: '소셜 나비', desc: '이번 주 피드 게시글 3개 작성', total: 3, rewardXP: 100 },
  ],
  achievement: [
    { id: 'a1', icon: '🥉', title: '첫 발걸음', desc: '첫 번째 장소 방문', total: 1, rewardXP: 100, tier: 'bronze' },
    { id: 'a2', icon: '🥈', title: '동네 주민', desc: '10곳 방문 달성', total: 10, rewardXP: 300, tier: 'silver' },
    { id: 'a3', icon: '🥇', title: '동네 마스터', desc: '50곳 방문 달성', total: 50, rewardXP: 1000, tier: 'gold' },
    { id: 'a4', icon: '📷', title: '인증샷 장인', desc: '사진 미션 20개 완료', total: 20, rewardXP: 500, tier: 'silver' },
    { id: 'a5', icon: '🔥', title: '불꽃 스트릭', desc: '30일 연속 방문', total: 30, rewardXP: 2000, tier: 'gold' },
    { id: 'a6', icon: '⭐', title: '리뷰 달인', desc: '리뷰 30개 작성', total: 30, rewardXP: 800, tier: 'gold' },
    { id: 'a7', icon: '🏆', title: '올 역할 클리어', desc: '5개 역할 모두 퀘스트 완료', total: 5, rewardXP: 1500, tier: 'gold' },
  ],
  social: [
    { id: 's1', icon: '👥', title: '첫 친구', desc: '친구 1명 팔로우', total: 1, rewardXP: 50 },
    { id: 's2', icon: '💌', title: '공유왕', desc: '퀘스트 5번 공유', total: 5, rewardXP: 200 },
    { id: 's3', icon: '💬', title: '댓글 마스터', desc: '댓글 10개 작성', total: 10, rewardXP: 200 },
  ],
  explorer: [
    { id: 'e1', icon: '☕', title: '카페 헌터', desc: '카페 5곳 방문', total: 5, rewardXP: 200 },
    { id: 'e2', icon: '🌙', title: '야행성', desc: '저녁 8시 이후 3곳 방문', total: 3, rewardXP: 150 },
    { id: 'e3', icon: '🌅', title: '얼리버드', desc: '오전 9시 이전 3곳 방문', total: 3, rewardXP: 150 },
    { id: 'e4', icon: '🎨', title: '문화인', desc: '문화시설 3곳 방문', total: 3, rewardXP: 200 },
    { id: 'e5', icon: '🍺', title: '소셜 드링커', desc: '술집/바 3곳 방문', total: 3, rewardXP: 150 },
  ],
}

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatAccountDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
  } catch {
    return '—'
  }
}

export function CompleteApp() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()
  const userId = user?.id ?? 'user-demo-001'
  const isLoggedIn = !!user
  const [kakaoSdkLoaded, setKakaoSdkLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<any>(null)
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [reviewData, setReviewData] = useState({ rating: 0, review: '', photos: [] as string[] })
  const [isDarkMode, setIsDarkMode] = useState(false)
  type ThemeMode = 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [missionStates, setMissionStates] = useState<Record<string, { completed: boolean; value?: string | number; photo?: string }>>({})
  const [currentMissions, setCurrentMissions] = useState<Mission[]>([])
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showLocationSettings, setShowLocationSettings] = useState(false)
  const [showPrivacySettings, setShowPrivacySettings] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isAppInstalled, setIsAppInstalled] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [showHelpSettings, setShowHelpSettings] = useState(false)
  const [showCreatorSettings, setShowCreatorSettings] = useState(false)
  const [placeSuggestionForm, setPlaceSuggestionForm] = useState({ name: '', address: '', category: '기타', description: '' })
  const [placeSuggestionSubmitting, setPlaceSuggestionSubmitting] = useState(false)
  const [placeSuggestionMessage, setPlaceSuggestionMessage] = useState<string | null>(null)
  const [arrivalCheckLoading, setArrivalCheckLoading] = useState(false)
  const [arrivalMessage, setArrivalMessage] = useState<string | null>(null)
  const [kakaoMapLoaded, setKakaoMapLoaded] = useState(false)
  const routeMapContainerRef = useRef<HTMLDivElement>(null)
  const homeMapContainerRef = useRef<HTMLDivElement>(null)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [friendQuery, setFriendQuery] = useState('')
  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([])
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [currentConversation, setCurrentConversation] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [demoAccepted, setDemoAccepted] = useState(false)
  const [selectedProfilePost, setSelectedProfilePost] = useState<{ id: string; title: string; body?: string; type?: string; image_url?: string; place_name?: string; rating?: number; created_at?: string; author_id?: string } | null>(null)
  const [profileCommentInput, setProfileCommentInput] = useState('')
  const [userProfile, setUserProfile] = useState<{ display_name?: string; profile_image_url?: string } | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  // 인스타 공유 폼 모달: 장소/기분/리뷰 등 반영해 스토리·피드 스타일 카드 생성
  const [showInstagramShareModal, setShowInstagramShareModal] = useState(false)
  const [instagramShareForm, setInstagramShareForm] = useState<{
    title: string; aiNarrative: string; userReview: string; place_name: string; place_address: string; image_url: string;
    mood: string; rating: number;
  }>({ title: '', aiNarrative: '', userReview: '', place_name: '', place_address: '', image_url: '', mood: '', rating: 0 })
  const [instagramShareSubmitting, setInstagramShareSubmitting] = useState(false)
  const [instagramNarrativeLoading, setInstagramNarrativeLoading] = useState(false)
  const [challengeCategory, setChallengeCategory] = useState<ChallengeCategory>('daily')
  // 피드 큐레이션 탭
  const [feedType, setFeedType] = useState<'all' | 'hot' | 'gathering' | 'review'>('all')
  // 퀘스트 완료 화면
  const [questCompleteData, setQuestCompleteData] = useState<{ xpEarned: number; locationVerified: boolean; placeName: string } | null>(null)
  const [pendingFeedPost, setPendingFeedPost] = useState<(() => Promise<void>) | null>(null)
  // ConfirmModal
  const [confirmModal, setConfirmModal] = useState<{ message: string; subMessage?: string; confirmText?: string; onConfirm: () => void } | null>(null)
  // 프리미엄 모달
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  // 카카오 친구/메시지 API용 토큰 (Supabase 카카오 로그인 시 provider_token)
  const [kakaoAccessToken, setKakaoAccessToken] = useState<string | null>(null)
  /** 추가 동의 플로우로 받은 토큰 (friends/talk_message scope). 3·4단계용 */
  const [kakaoFriendsToken, setKakaoFriendsToken] = useState<string | null>(null)
  const [kakaoTestFriendsError, setKakaoTestFriendsError] = useState<'403' | null>(null)
  // 카카오 API 테스트(심사용) 화면 상태
  const [kakaoTestFriends, setKakaoTestFriends] = useState<Array<{ uuid?: string; id?: string; profile_nickname?: string }>>([])
  const [kakaoTestFriendsLoading, setKakaoTestFriendsLoading] = useState(false)
  const [kakaoTestSentTo, setKakaoTestSentTo] = useState<string | null>(null)
  const [kakaoTestSendingUuid, setKakaoTestSendingUuid] = useState<string | null>(null)

  // displayName 계산: userProfile state 이후에 위치
  const displayName = userProfile?.display_name ?? user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.user_metadata?.user_name ?? user?.user_metadata?.kakao_account?.profile?.nickname ?? user?.email ?? (user ? '로그인한 사용자' : null)

  useEffect(() => {
    setNicknameInput(displayName || '')
  }, [displayName])

  // 로그인 유도: 비로그인 시 데모 수락 전에는 로그인 화면 강조
  const showLoginGate = !isLoggedIn && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('wherehere_demo_accepted') !== '1'

  // 퀘스트 수락 시 Role+Mood에 따라 동적 미션 선택
  useEffect(() => {
    if (!acceptedQuest) {
      setCurrentMissions([])
      setMissionStates({})
      setExpandedMissionId(null)
      return
    }
    const role: RoleType = selectedRole ?? 'explorer'
    const mood: MoodType = selectedMood ?? 'curious'
    const missions = selectMissions(role, mood)
    setCurrentMissions(missions)
    setMissionStates({})
    setExpandedMissionId(missions[0]?.id ?? null)
  }, [acceptedQuest, selectedRole, selectedMood])

  // PWA 설치 가능 여부 감지
  useEffect(() => {
    if (typeof window === 'undefined') return
    // 이미 설치된 앱으로 실행 중인지 확인
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true)
      return
    }
    // iOS Safari 감지
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setIsIOSDevice(true)
      return
    }
    // Android/Chrome: beforeinstallprompt 이벤트 캡처
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // 온보딩: 이미 본 적 있으면 건너뛰기
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('wherehere_onboarded') === 'true') {
        setShowOnboarding(false)
      }
    } catch (_) {}
  }, [])

  // 카카오 로그인 시 provider_token 저장 (친구 목록/메시지 API용)
  useEffect(() => {
    if (!user) {
      setKakaoAccessToken(null)
      return
    }
    const provider = (user as any).app_metadata?.provider
    if (provider !== 'kakao') {
      setKakaoAccessToken(null)
      return
    }
    createClient().auth.getSession().then(({ data: { session } }) => {
      const token = (session as any)?.provider_token ?? null
      setKakaoAccessToken(token)
    })
  }, [user?.id, user?.app_metadata?.provider])

  // 추가 동의 플로우 복귀: URL의 kakao_friends_token, return, error 처리 (한 번만 처리 후 URL 정리)
  // toast/setScreen는 다음 틱으로 미뤄서 React 418(렌더 중 다른 컴포넌트 업데이트) 방지
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const token = params.get('kakao_friends_token')
    const returnTo = params.get('return')
    const err = params.get('error')
    const kakaoDesc = params.get('kakao_desc') || ''

    const needsUrlClean = token || returnTo || err
    if (needsUrlClean) {
      const u = new URL(window.location.href)
      u.searchParams.delete('kakao_friends_token')
      u.searchParams.delete('return')
      u.searchParams.delete('error')
      u.searchParams.delete('kakao_error')
      u.searchParams.delete('kakao_desc')
      window.history.replaceState({}, '', u.pathname + (u.search || ''))
    }

    if (token) {
      setKakaoFriendsToken(token)
      try { sessionStorage.setItem('kakao_friends_token', token) } catch (_) {}
    } else {
      const stored = sessionStorage.getItem('kakao_friends_token')
      if (stored) setKakaoFriendsToken(stored)
    }

    if (returnTo === 'kakao-api-test') setScreen('kakao-api-test')
    else if (err === 'kakao_consent_exchange' || err === 'kakao.consent_exchange') setScreen('kakao-api-test')

    const msg =
      err === 'kakao_config'
        ? '동의창을 띄우려면 Vercel 환경 변수에 NEXT_PUBLIC_KAKAO_MAP_KEY(카카오 REST API 키)가 필요합니다.'
        : err === 'kakao_consent_denied' || err === 'kakao.consent_denied'
          ? '친구 목록 동의가 거부되었어요. 동의하지 않으면 친구 목록을 사용할 수 없어요.'
          : err === 'kakao_consent_no_code'
            ? '동의 후 돌아오는 과정에서 코드를 받지 못했어요. 다시 동의창부터 시도해 주세요.'
            : err === 'kakao_consent_exchange' || err === 'kakao.consent_exchange'
              ? /rate\s*limit|한도|exceeded/i.test(decodeURIComponent(kakaoDesc))
                ? '토큰 요청 한도를 초과했어요. 약 10분 후 다시 「동의창 띄우기」를 눌러 주세요.'
                : '동의 후 토큰 발급에 실패했어요. Redirect URI가 카카오 개발자 콘솔과 일치하는지 확인 후 다시 시도해 주세요.'
              : null
    if (msg) {
      const t = setTimeout(() => {
        toast.error(msg)
      }, 0)
      return () => clearTimeout(t)
    }
  }, [])

  const finishOnboarding = () => {
    try {
      localStorage.setItem('wherehere_onboarded', 'true')
    } catch (_) {}
    setShowOnboarding(false)
  }

  // 카카오 SDK 전역 로드
  useEffect(() => {
    // Share SDK는 JavaScript App Key 필요 (Map API Key와 별도)
    const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'
    if (typeof window === 'undefined' || kakaoSdkLoaded) return

    // 스크립트가 이미 로드되어 있는지 확인
    if ((window as any).Kakao) {
      if (!(window as any).Kakao.isInitialized?.()) {
        (window as any).Kakao.init(kakaoJsKey)
      }
      setKakaoSdkLoaded(true)
      return
    }

    // 스크립트 로드 (올바른 Kakao SDK CDN URL)
    const script = document.createElement('script')
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
    script.crossOrigin = 'anonymous'
    script.async = true
    script.onload = () => {
      if ((window as any).Kakao && !(window as any).Kakao.isInitialized?.()) {
        (window as any).Kakao.init(kakaoJsKey)
      }
      setKakaoSdkLoaded(true)
    }
    script.onerror = () => {
      console.error('카카오 SDK 로드 실패')
    }
    document.head.appendChild(script)
  }, [])

  const submitPlaceSuggestion = async () => {
    if (!placeSuggestionForm.name.trim()) {
      setPlaceSuggestionMessage('장소 이름을 입력해주세요.')
      return
    }
    setPlaceSuggestionMessage(null)
    setPlaceSuggestionSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/place-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          name: placeSuggestionForm.name.trim(),
          address: placeSuggestionForm.address.trim(),
          category: placeSuggestionForm.category || '기타',
          description: placeSuggestionForm.description.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        setPlaceSuggestionMessage('제안이 접수되었어요. 검수 후 반영됩니다.')
        setPlaceSuggestionForm({ name: '', address: '', category: '기타', description: '' })
      } else {
        setPlaceSuggestionMessage(data.message || '제출에 실패했어요.')
      }
    } catch (_) {
      setPlaceSuggestionMessage('네트워크 오류가 났어요.')
    } finally {
      setPlaceSuggestionSubmitting(false)
    }
  }

  // 테마 로드: wherehere_themeMode 우선, 없으면 기존 isDarkMode로 light/dark 복원
  useEffect(() => {
    const saved = localStorage.getItem('wherehere_themeMode') as ThemeMode | null
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      setThemeMode(saved)
    } else {
      const savedDark = localStorage.getItem('isDarkMode')
      if (savedDark !== null) setThemeMode(savedDark === 'true' ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    if (themeMode === 'system') {
      if (typeof window === 'undefined') return
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      setIsDarkMode(mq.matches)
      const handler = () => setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    setIsDarkMode(themeMode === 'dark')
  }, [themeMode])

  useEffect(() => {
    localStorage.setItem('wherehere_themeMode', themeMode)
    if (themeMode !== 'system') localStorage.setItem('isDarkMode', isDarkMode.toString())
  }, [themeMode, isDarkMode])

  // 프로필 정보 불러오기 (지속 반영: 포커스·화면 전환 시 재조회로 기본값 복귀 방지)
  const refetchUserProfile = useCallback(async () => {
    if (!userId || userId === 'user-demo-001') return
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
      const data = await res.json()
      if (data.profile) {
        setUserProfile((prev) => {
          const next = { ...data.profile, display_name: data.profile.display_name ?? prev?.display_name }
          const img = (data.profile as any).profile_image_url ?? (data.profile as any).avatar_url
          // DB에서 이미지 URL이 오면 우선 사용, null이면 로컬에서 설정한 값 보존
          if (img) {
            (next as any).profile_image_url = img
          } else {
            // DB에 아직 반영 안 됐거나 null인 경우 기존 값 유지
            (next as any).profile_image_url = prev?.profile_image_url ?? null
          }
          return next
        })
      } else {
        const supabase = createClient()
        const { data: row } = await (supabase as any)
          .from('users')
          .select('id,display_name,profile_image_url,username')
          .eq('id', userId)
          .maybeSingle()
        if (row) {
          setUserProfile((prev) => ({
            ...(prev || {}),
            ...row,
            display_name: row.display_name ?? prev?.display_name,
            profile_image_url: row.profile_image_url ?? prev?.profile_image_url,
          }))
        }
      }
    } catch (err) {
      console.error('프로필 조회 실패:', err)
    }
  }, [userId])

  useEffect(() => {
    refetchUserProfile()
  }, [refetchUserProfile])

  useEffect(() => {
    if (!userId || userId === 'user-demo-001') return
    const onFocus = () => refetchUserProfile()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [userId, refetchUserProfile])

  useEffect(() => {
    if ((screen === 'profile' || screen === 'social') && userId && userId !== 'user-demo-001') refetchUserProfile()
  }, [screen, userId, refetchUserProfile])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => console.log('위치 가져오기 실패:', error)
      )
    }
  }, [])

  // 퀘스트가 바뀌면 도착 인정 메시지 초기화
  useEffect(() => {
    setArrivalMessage(null)
  }, [acceptedQuest?.place_id])

  // 클릭한 퀘스트 상세에서만 서사 로드 (토큰 절감)
  useEffect(() => {
    if (screen !== 'accepted' || !acceptedQuest?.name || acceptedQuest.narrative || narrativeLoading) return
    const role = selectedRole || 'explorer'
    const moodText = selectedMood ? (MOODS.find((m) => m.id === selectedMood)?.name ?? selectedMood) : undefined
    setNarrativeLoading(true)
    fetch(`${API_BASE}/api/v1/recommendations/narrative`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place_name: acceptedQuest.name,
        category: acceptedQuest.category || '기타',
        role_type: role,
        user_mood: moodText,
        vibe_tags: acceptedQuest.vibe_tags || [],
        is_hidden_gem: acceptedQuest.is_hidden_gem ?? false,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.narrative) setAcceptedQuest((prev: any) => (prev ? { ...prev, narrative: data.narrative } : null))
      })
      .catch(() => {})
      .finally(() => setNarrativeLoading(false))
  }, [screen, acceptedQuest?.place_id, acceptedQuest?.name])

  // 앱 내 경로 지도: 출발(현재위치) → 목적지 마커 + 경로선
  useEffect(() => {
    if (screen !== 'accepted' || !acceptedQuest?.latitude || !acceptedQuest?.longitude || !kakaoMapLoaded || !routeMapContainerRef.current || !window.kakao?.maps) return
    const el = routeMapContainerRef.current
    while (el.firstChild) el.removeChild(el.firstChild)
    const startLat = userLocation.lat
    const startLng = userLocation.lng
    const endLat = acceptedQuest.latitude
    const endLng = acceptedQuest.longitude
    const centerLat = (startLat + endLat) / 2
    const centerLng = (startLng + endLng) / 2
    try {
      const map = new window.kakao.maps.Map(el, {
        center: new window.kakao.maps.LatLng(centerLat, centerLng),
        level: 5,
      })
      const startPos = new window.kakao.maps.LatLng(startLat, startLng)
      const endPos = new window.kakao.maps.LatLng(endLat, endLng)
      new window.kakao.maps.Marker({ position: startPos, map, title: '현재 위치' })
      new window.kakao.maps.Marker({ position: endPos, map, title: acceptedQuest.name || '목적지' })
      const path = [startPos, endPos]
      const polyline = new window.kakao.maps.Polyline({
        path,
        strokeWeight: 4,
        strokeColor: '#E8740C',
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
      })
      polyline.setMap(map)
    } catch (e) {
      console.warn('Route map init failed:', e)
    }
  }, [screen, acceptedQuest?.place_id, acceptedQuest?.latitude, acceptedQuest?.longitude, acceptedQuest?.name, userLocation.lat, userLocation.lng, kakaoMapLoaded])

  // 역할/기분 텍스트 (API로 전달할 한국어 이름)
  const moodTextForApi = selectedMood
    ? (MOODS.find((m) => m.id === selectedMood)?.name ?? selectedMood)
    : ''

  // 홈 화면: 오늘의 한 곳 (기본 역할/기분 기준)
  const defaultRoleForHome: RoleType = selectedRole || 'healer'
  const defaultMoodForHome: MoodType = selectedMood || 'tired'
  const defaultMoodTextForHome =
    MOODS.find((m) => m.id === defaultMoodForHome)?.name ?? defaultMoodForHome

  const [homeRefreshKey, setHomeRefreshKey] = useState(0)
  const { data: homeData, isLoading: homeLoading, refetch: refetchHome } = useQuery({
    queryKey: ['homeRecommendation', userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodForHome, homeRefreshKey],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodTextForHome),
    enabled: screen === 'home',
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10분간 고정 (탭 전환·스크롤에도 유지)
  })

  const { data: questsData, isLoading: questsLoading } = useQuery({
    queryKey: ['recommendations', userLocation.lat, userLocation.lng, selectedRole, selectedMood],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, selectedRole!, moodTextForApi || ''),
    enabled: !!selectedRole && !!selectedMood && screen === 'quests',
    retry: 1,
  })

  // 홈: 오늘의 한 곳 지도 (현재 위치 → 추천 장소 1곳)
  useEffect(() => {
    const first = homeData?.recommendations?.[0]
    if (screen !== 'home' || !first?.latitude || !first?.longitude || !kakaoMapLoaded || !homeMapContainerRef.current || !window.kakao?.maps) return
    const el = homeMapContainerRef.current
    while (el.firstChild) el.removeChild(el.firstChild)
    const startLat = userLocation.lat
    const startLng = userLocation.lng
    const endLat = first.latitude
    const endLng = first.longitude
    const centerLat = (startLat + endLat) / 2
    const centerLng = (startLng + endLng) / 2
    try {
      const map = new window.kakao.maps.Map(el, {
        center: new window.kakao.maps.LatLng(centerLat, centerLng),
        level: 5,
      })
      const startPos = new window.kakao.maps.LatLng(startLat, startLng)
      const endPos = new window.kakao.maps.LatLng(endLat, endLng)
      new window.kakao.maps.Marker({ position: startPos, map, title: '현재 위치' })
      new window.kakao.maps.Marker({ position: endPos, map, title: first.name || '오늘의 장소' })
      const path = [startPos, endPos]
      const polyline = new window.kakao.maps.Polyline({
        path,
        strokeWeight: 4,
        strokeColor: '#E8740C',
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
      })
      polyline.setMap(map)
    } catch (e) {
      console.warn('Home map init failed:', e)
    }
  }, [screen, homeData, userLocation.lat, userLocation.lng, kakaoMapLoaded])

  const { data: userStats, refetch: refetchUserStats } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/users/me/stats?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: (screen === 'profile' || screen === 'challenges' || screen === 'home') && !!userId,
  })

  const { data: profilePostsData } = useQuery({
    queryKey: ['profilePosts', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/local/posts?scope=user&author_id=${encodeURIComponent(userId)}&limit=100`)
      if (!res.ok) return { posts: [] }
      return res.json()
    },
    enabled: screen === 'profile' && !!userId,
  })
  const profilePosts = profilePostsData?.posts ?? []

  const { data: profilePostCommentsData, refetch: refetchProfilePostComments } = useQuery({
    queryKey: ['postComments', selectedProfilePost?.id],
    queryFn: async () => {
      if (!selectedProfilePost?.id) return { comments: [] }
      const res = await fetch(`${API_BASE}/api/v1/local/posts/${selectedProfilePost.id}/comments`)
      if (!res.ok) return { comments: [] }
      return res.json()
    },
    enabled: !!selectedProfilePost?.id,
  })
  const profilePostComments = profilePostCommentsData?.comments ?? []

  const { data: notificationsData, refetch: refetchNotifications } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/notifications?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) return { notifications: [], unread_count: 0 }
      return res.json()
    },
    enabled: !!userId,
  })
  const notifications = notificationsData?.notifications ?? []
  const unreadCount = notificationsData?.unread_count ?? 0
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)

  // Supabase Realtime: 알림 테이블 구독 → 새 알림 시 즉시 refetch
  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    if (typeof (supabase as any).channel !== 'function') return
    const channel = (supabase as any)
      .channel('notifications-' + userId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: 'user_id=eq.' + userId,
        },
        () => refetchNotifications()
      )
      .subscribe()
    return () => {
      (supabase as any).removeChannel(channel)
    }
  }, [userId, refetchNotifications])

  // Web Push: 권한 요청 후 구독 등록 (VAPID 공개키 설정 시에만)
  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!userId || !vapidKey || typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return
    const urlBase64ToUint8Array = (base64: string) => {
      const padding = '='.repeat((4 - (base64.length % 4)) % 4)
      const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
      const raw = atob(base64Safe)
      const out = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
      return out
    }
    const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }
    let cancelled = false
    navigator.serviceWorker.register('/sw.js')
      .then(() => Notification.requestPermission())
      .then((perm) => perm === 'granted' ? navigator.serviceWorker.ready : Promise.reject(new Error('denied')))
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (cancelled) return
        if (sub) return sub
        return navigator.serviceWorker.ready.then((reg) =>
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          })
        )
      })
      .then((sub) => {
        if (!sub || cancelled) return
        const payload = {
          user_id: userId,
          subscription: {
            endpoint: sub.endpoint,
            keys: {
              p256dh: arrayBufferToBase64Url(sub.getKey('p256dh')!),
              auth: arrayBufferToBase64Url(sub.getKey('auth')!),
            },
          },
        }
        return fetch(`${API_BASE}/api/v1/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      })
      .catch(() => { /* 권한 거부 등 무시 */ })
    return () => { cancelled = true }
  }, [userId])

  const { data: feedData, refetch: refetchFeed } = useQuery({
    queryKey: ['socialFeed', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/social/feed?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) return { activities: [], following_ids: [] }
      return res.json()
    },
    enabled: screen === 'social' && !!userId,
  })
  const feedActivities = feedData?.activities ?? []
  const followingIds: string[] = (feedData?.following_ids as string[] | undefined) ?? []
  const myFriendCode = userId.slice(0, 8)

  const searchFriends = async () => {
    if (!friendQuery.trim()) {
      setFriendSearchResults([])
      return
    }
    setFriendSearchLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/search-users?q=${encodeURIComponent(friendQuery.trim())}&user_id=${encodeURIComponent(userId)}`)
      const data = await res.json().catch(() => ({ results: [] }))
      setFriendSearchResults(data.results || [])
    } catch (_) {
      setFriendSearchResults([])
    } finally {
      setFriendSearchLoading(false)
    }
  }

  const toggleFollow = async (targetUserId: string, isFollowing: boolean) => {
    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const res = await fetch(`${API_BASE}/api/v1/social/follow?follower_id=${encodeURIComponent(userId)}&following_id=${encodeURIComponent(targetUserId)}`, { method })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        // 피드 & 검색 결과 동기화
        refetchFeed()
        setFriendSearchResults((prev) =>
          prev.map((u) => (u.user_id === targetUserId ? { ...u, is_following: !isFollowing } : u))
        )
      }
    } catch (_) {
      // noop
    }
  }

  // 채팅 메시지: Supabase Realtime 구독 또는 폴링
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const convId = currentConversation?.id
    const loadMessages = async () => {
      if (screen !== 'chat' || !convId) return
      try {
        const res = await fetch(`${API_BASE}/api/v1/social/chat/messages?conversation_id=${encodeURIComponent(convId)}&limit=50`)
        const data = await res.json().catch(() => ({ messages: [] }))
        const list = (data.messages || []).slice().reverse()
        setChatMessages(list)
      } catch (_) {
        // ignore
      }
    }
    if (screen === 'chat' && convId) {
      setChatLoading(true)
      loadMessages().finally(() => setChatLoading(false))
      const supabase = createClient()
      if (typeof (supabase as any).channel === 'function') {
        const channel = (supabase as any)
          .channel('messages-' + convId)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + convId },
            () => loadMessages()
          )
          .subscribe()
        return () => (supabase as any).removeChannel(channel)
      }
      timer = setInterval(loadMessages, 5000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [screen, currentConversation?.id])

  const openChatWithUser = async (targetUser: any) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/chat/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, target_id: targetUser.user_id }),
      })
      const conv = await res.json()
      if (!conv?.id) return
      setCurrentConversation({
        id: conv.id,
        user_a_id: conv.user_a_id,
        user_b_id: conv.user_b_id,
        other: {
          user_id: targetUser.user_id,
          display_name: targetUser.display_name || targetUser.username || '친구',
          avatar_url: targetUser.avatar_url,
          code: targetUser.code ?? String(targetUser.user_id).slice(0, 8),
        },
      })
      setScreen('chat')
    } catch (_) {
      // noop
    }
  }

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || !currentConversation?.id) return
    setChatInput('')
    try {
      await fetch(`${API_BASE}/api/v1/social/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          sender_id: userId,
          body: text,
        }),
      })
      // 낙관적 업데이트: 바로 리스트에 추가
      setChatMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          conversation_id: currentConversation.id,
          sender_id: userId,
          body: text,
          created_at: new Date().toISOString(),
        },
      ])
    } catch (_) {
      // 실패해도 치명적이진 않음
    }
  }

  const handleCheckIn = async () => {
    setCheckInTime(new Date())
    setScreen('checkin')
    setTimeout(() => setScreen('review'), 3000)
  }

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
          duration_minutes: Math.max(Number(missionStates['stay_minutes']?.value) || duration || 1, 1),
          rating: reviewData.rating,
          mood: selectedMood,
          spent_amount: null,
          companions: 1,
          user_latitude: userLocation.lat,
          user_longitude: userLocation.lng,
          place_name: acceptedQuest?.name || undefined,
          place_category: (acceptedQuest as any)?.primary_category || (acceptedQuest as any)?.category || undefined,
          place_latitude: (acceptedQuest as any)?.latitude || undefined,
          place_longitude: (acceptedQuest as any)?.longitude || undefined,
        })
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (response.status === 400 && data.detail) {
        toast.error(data.detail)
        return
      }

      if (data.success) {
        const xpEarned = data.xp_earned || 100
        const placeName = acceptedQuest?.name || '장소'
        const placeAddress = acceptedQuest?.address || ''
        const rating = reviewData.rating

        // 피드 포스팅 함수 (QuestCompleteScreen에서 호출)
        const doPostFeed = async () => {
          try {
            const missionLines = currentMissions
              .filter((m) => missionStates[m.id]?.completed && (missionStates[m.id]?.value != null || missionStates[m.id]?.photo != null || m.type === 'arrival'))
              .map((m) => {
                const question = m.prompt || m.title
                const val = missionStates[m.id]?.value
                const photo = missionStates[m.id]?.photo
                if (m.id === 'star_rating') return `⭐ ${m.title}: ${reviewData.rating}점`
                if (m.type === 'arrival') return `📍 ${m.title}: 완료`
                if (photo) return `📷 ${m.title}: 사진 첨부`
                if (val !== undefined && val !== '') return `Q. ${question}\nA. ${val}`
                return `✓ ${m.title}: 완료`
              })
            const bodyParts = [`${placeName} 방문했어요. 별점 ${rating}점!`, reviewData.review?.trim(), missionLines.length ? ['[미션 기록]', ...missionLines].join('\n') : ''].filter(Boolean)
            const uploadToCdn = async (dataUrl: string): Promise<string> => {
              try {
                const res = await fetch(dataUrl)
                const blob = await res.blob()
                const form = new FormData()
                form.append('file', new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' }))
                const up = await fetch(`${typeof window !== 'undefined' ? window.location.origin : ''}/api/upload`, { method: 'POST', body: form })
                const ud = await up.json().catch(() => ({}))
                if (up.ok && ud.url) return ud.url
              } catch {}
              return ''
            }
            const reviewCdnUrls = await Promise.all(
              (reviewData.photos || []).map((p) => p.startsWith('data:') ? uploadToCdn(p) : Promise.resolve(p))
            ).then((urls) => urls.filter(Boolean))
            const missionPhotos = [missionStates['best_angle']?.photo, missionStates['selfie']?.photo, missionStates['vibe_photo']?.photo, missionStates['food_photo']?.photo].filter(Boolean) as string[]
            const allPhotos = [...reviewCdnUrls, ...missionPhotos]
            const postRes = await fetch(`${API_BASE}/api/v1/local/posts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                author_id: userId,
                type: 'story',
                title: `퀘스트 완료: ${placeName}`,
                body: bodyParts.join('\n\n'),
                rating: rating,
                place_name: placeName,
                place_address: placeAddress,
                image_url: allPhotos.length > 0 ? allPhotos.join(',') : '',
                area_name: (acceptedQuest as any)?.region || (acceptedQuest as any)?.area || '내 주변',
              }),
            })
            const postData = await postRes.json().catch(() => ({}))
            if (postRes.ok && postData.success) {
              toast.success('동네 피드에 올렸어요!')
            }
          } catch {
            toast.error('피드 업로드에 실패했어요.')
          }
        }

        // 상태 초기화
        setReviewData({ rating: 0, review: '', photos: [] })
        setUploadedPhotos([])
        setCheckInTime(null)
        setMissionStates({})
        setCurrentMissions([])

        // 퀘스트 완료 화면 표시 (router.push 대신)
        setPendingFeedPost(() => doPostFeed)
        setQuestCompleteData({ xpEarned, locationVerified: data.location_verified || false, placeName })
        setScreen('home')
      } else {
        toast.error('방문 기록 저장에 실패했어요. 다시 시도해주세요.')
      }
    } catch (error) {
      console.error('방문 기록 생성 실패:', error)
      toast.error('네트워크 오류가 났어요. 인터넷 연결을 확인해주세요.')
    }
  }

  // 소셜 공유 함수 - 네이티브 앱 직접 연동
  const handleShare = async (platform: string) => {
    const shareTitle = `${acceptedQuest?.name || '멋진 장소'}를 발견했어요!`
    const shareUrl = `${window.location.origin}?quest=${acceptedQuest?.place_id || ''}`
    const placeName = acceptedQuest?.name || '멋진 장소'
    const placeAddress = acceptedQuest?.address || ''
    const placeImage = uploadedPhotos[0] || acceptedQuest?.image_url || ''
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    try {
      if (platform === 'kakao') {
        const kakao = typeof window !== 'undefined' ? (window as any).Kakao : undefined
        let sent = false
        if (kakao?.Share?.sendDefault) {
          try {
            kakao.Share.sendDefault({
              objectType: 'feed',
              content: {
                title: placeName,
                description: `🗺️ WhereHere에서 발견한 특별한 장소\n${placeAddress}`,
                imageUrl: placeImage || 'https://wherehere-seven.vercel.app/og-image.png',
                link: {
                  mobileWebUrl: shareUrl,
                  webUrl: shareUrl,
                },
              },
              buttons: [
                { title: 'WhereHere 열기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
              ],
            })
            sent = true
          } catch (err) {
            console.error('카카오톡 SDK 공유 실패:', err)
          }
        }
        if (!sent) {
          await navigator.clipboard.writeText(`${shareTitle}\n${placeName}\n${placeAddress}\n\n${shareUrl}`)
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
          if (isMobile) {
            try {
              window.location.href = 'kakaotalk://send?url=' + encodeURIComponent(shareUrl)
              setTimeout(() => { toast.success('카카오톡이 열리지 않으면 링크가 복사됐어요. 채팅창에 붙여넣기 하세요.') }, 500)
            } catch {
              toast.success('링크가 복사됐어요. 카카오톡 채팅창에 붙여넣기 하세요.')
            }
          } else {
            toast.success('링크가 복사됐어요. 카카오톡에서 붙여넣기 해주세요.')
          }
        }

      } else if (platform === 'instagram') {
        // 인스타 공유 폼 모달 열기 (AI 서사 + 리뷰 입력)
        const existingNarrative = acceptedQuest?.narrative || ''
        setInstagramShareForm({
          title: placeName,
          aiNarrative: existingNarrative,
          userReview: '',
          place_name: placeName,
          place_address: placeAddress,
          image_url: placeImage,
          mood: selectedMood ? (MOODS.find((m) => m.id === selectedMood)?.name ?? '') : '',
          rating: reviewData?.rating ?? 0,
        })
        setShowInstagramShareModal(true)
        // AI 서사가 없으면 자동 생성
        if (!existingNarrative && acceptedQuest?.name) {
          setInstagramNarrativeLoading(true)
          const role = selectedRole || 'explorer'
          const moodText = selectedMood ? (MOODS.find((m) => m.id === selectedMood)?.name ?? selectedMood) : undefined
          fetch(`${API_BASE}/api/v1/recommendations/narrative`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              place_name: acceptedQuest.name,
              category: acceptedQuest.category || '기타',
              role_type: role,
              user_mood: moodText,
              vibe_tags: acceptedQuest.vibe_tags || [],
              is_hidden_gem: acceptedQuest.is_hidden_gem ?? false,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.narrative) setInstagramShareForm((f) => ({ ...f, aiNarrative: data.narrative }))
            })
            .catch(() => {})
            .finally(() => setInstagramNarrativeLoading(false))
        }
        return
      } else if (platform === 'twitter') {
        // 트위터 - 실제 공유창
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle + '\n' + placeName)}&url=${encodeURIComponent(shareUrl)}&hashtags=WhereHere,여행,맛집`
        window.open(twitterUrl, '_blank', 'width=600,height=400,scrollbars=yes')

      } else if (platform === 'facebook') {
        // 페이스북 - 실제 공유창
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle + '\n' + placeName + '\n' + placeAddress)}`
        window.open(facebookUrl, '_blank', 'width=600,height=600,scrollbars=yes')
      }
    } catch (error) {
      console.error('공유 실패:', error)
      // 최종 대체: 텍스트 복사
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n${placeName}\n${placeAddress}\n\n${shareUrl}`)
        toast.success('링크가 복사됐어요!')
      } catch {
        toast.info(`이 링크를 복사해주세요: ${shareUrl}`)
      }
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

  const saveNickname = async () => {
    const name = nicknameInput.trim()
    if (!name || savingNickname || !isLoggedIn) return
    setSavingNickname(true)
    setUserProfile(prev => ({ ...prev, display_name: name, profile_image_url: prev?.profile_image_url }))
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, display_name: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        const supabase = createClient()
        const { error } = await (supabase as any)
          .from('users')
          .upsert({ id: userId, display_name: name }, { onConflict: 'id' })
        if (error) throw new Error(data?.message || 'API error')
      }
      await refetchUserProfile()
    } catch (_) {
      alert('닉네임 저장에 실패했어요. 다시 시도해주세요.')
      try {
        await refetchUserProfile()
      } catch {
        // noop
      }
    } finally {
      setSavingNickname(false)
    }
  }

  // 도착 인정: 현재 위치가 목적지 100m 이내면 "장소 도착하기" 체크
  const handleArrivalCheck = () => {
    const quest = acceptedQuest
    if (!quest || quest.latitude == null || quest.longitude == null) {
      setArrivalMessage('이 장소는 위치 정보가 없어 도착 인정을 사용할 수 없어요.')
      return
    }
    setArrivalMessage(null)
    setArrivalCheckLoading(true)
    if (!navigator.geolocation) {
      setArrivalMessage('위치 권한을 사용할 수 없어요.')
      setArrivalCheckLoading(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const dist = getDistanceMeters(lat, lng, quest.latitude, quest.longitude)
        setArrivalCheckLoading(false)
        if (dist <= ARRIVAL_THRESHOLD_METERS) {
          setMissionStates((prev) => ({ ...prev, arrival: { completed: true } }))
          setArrivalMessage(`도착 인정됐어요! (${Math.round(dist)}m 이내)`)
        } else {
          setArrivalMessage(`아직 멀어요. 약 ${Math.round(dist)}m 남았어요. (${ARRIVAL_THRESHOLD_METERS}m 이내에서 눌러주세요)`)
        }
      },
      () => {
        setArrivalCheckLoading(false)
        setArrivalMessage('위치를 가져올 수 없어요. 위치 권한을 확인해주세요.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  // 필수 미션 모두 완료 시 체크인 버튼 활성화 (arrival + star_rating 등)
  const requiredMissions = currentMissions.filter((m) => m.required)
  const essentialChecklistCompleted = requiredMissions.length > 0 && requiredMissions.every((m) => missionStates[m.id]?.completed)
  const allRequiredCompleted = requiredMissions.every((m) => missionStates[m.id]?.completed)
  const completedMissionCount = currentMissions.filter((m) => missionStates[m.id]?.completed).length

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
        { icon: '🏠', label: '홈', onClick: () => { setScreen('home'); setAcceptedQuest(null); } },
        { icon: '🗺️', label: '지도', onClick: () => router.push('/my-map-real') },
        { icon: '💬', label: '동네 피드', onClick: () => setScreen('social') },
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

  // 로그인 유도 화면: 비로그인 사용자에게 로그인 후 이용 유도
  if (showLoginGate) {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🗺️</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WhereHere</h1>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>로그인하고 나만의 추천을 받아보세요</p>
          <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>퀘스트, 지도, 소셜 피드가 계정에 저장돼요</p>
        </div>
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={() => router.push('/login')}
            style={{
              width: '100%',
              padding: 16,
              background: 'linear-gradient(135deg, #E8740C, #C65D00)',
              border: 'none',
              borderRadius: 14,
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            로그인 / 회원가입
          </button>
          <button
            onClick={() => {
              try { sessionStorage.setItem('wherehere_demo_accepted', '1') } catch (_) {}
              setDemoAccepted(true)
            }}
            style={{
              width: '100%',
              padding: 12,
              background: 'transparent',
              border: `1px solid ${borderColor}`,
              borderRadius: 14,
              color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#9CA3AF',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            데모로 체험하기
          </button>
        </div>
      </div>
    )
  }

  // 온보딩 (첫 방문 시 — 새 Onboarding 컴포넌트 사용)
  if (showOnboarding) {
    return <Onboarding onDone={finishOnboarding} />
  }

  // 홈 화면: 오늘의 한 곳 + 지도
  if (screen === 'home') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
          <button
            onClick={() => setShowNotificationPanel((v) => !v)}
            style={{
              position: 'relative',
              padding: '8px 12px',
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              color: textColor,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '8px 14px',
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(232,116,12,0.15)',
              border: '1px solid #E8740C',
              borderRadius: 10,
              color: '#E8740C',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            로그인
          </button>
        </div>
        {showNotificationPanel && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }} onClick={() => setShowNotificationPanel(false)}>
            <div style={{ width: '100%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto', background: bgColor, borderRadius: 16, border: `1px solid ${borderColor}`, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>알림</span>
                <button onClick={() => setShowNotificationPanel(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: textColor }}>×</button>
              </div>
              <div style={{ padding: 8 }}>
                {notifications.length === 0 ? (
                  <p style={{ padding: 24, textAlign: 'center', color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', fontSize: 14 }}>알림이 없어요</p>
                ) : (
                  notifications.slice(0, 30).map((n: { id: string; title: string; body?: string; read?: boolean; created_at?: string }) => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, background: n.read ? 'transparent' : (isDarkMode ? 'rgba(232,116,12,0.08)' : 'rgba(232,116,12,0.06)') }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>{n.body}</div>}
                      {n.created_at && <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{ padding: '60px 20px 120px' }}>
          {/* 레벨 바: 메인 상단 항상 노출 (게임화 강화) */}
          {isLoggedIn && (() => {
            const level = userStats?.level ?? 1
            const totalXP = userStats?.total_xp ?? 0
            const nextXP = userStats?.xp_to_next_level ?? 1000
            const progress = nextXP > 0 ? Math.min(100, (totalXP / nextXP) * 100) : 0
            return (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(232,116,12,0.08)', borderRadius: 14, border: `1px solid ${isDarkMode ? 'rgba(232,116,12,0.2)' : 'rgba(232,116,12,0.25)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#E8740C' }}>Lv.{level} 탐험가</span>
                  <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#78350F' }}>다음 레벨까지 {(nextXP - totalXP).toLocaleString()} XP</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #E8740C, #F59E0B)', borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            )
          })()}

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WhereHere
            </h1>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 8 }}>오늘의 한 곳에서 동네 커뮤니티까지 한 번에.</p>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
              홈 · 기분 맞춤 탐험 · 동네 피드
            </div>
          </div>

          {/* 동네 정복 지도 빠른 진입 (메인에서 접근 용이) */}
          <button
            type="button"
            onClick={() => router.push('/my-map-real')}
            style={{
              width: '100%',
              marginBottom: 20,
              padding: 16,
              borderRadius: 16,
              border: `1px solid ${borderColor}`,
              background: isDarkMode ? 'linear-gradient(135deg, rgba(232,116,12,0.12), rgba(232,116,12,0.04))' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
              color: textColor,
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: isDarkMode ? 'none' : '0 2px 12px rgba(232,116,12,0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 24 }}>🗺️</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#E8740C' }}>동네 정복 지도</span>
            </div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
              방문한 구역을 헥사곤으로 채워가며 탐험 완성도를 확인하세요
            </div>
          </button>

          {/* 1) 오늘의 한 곳 + 지도 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151' }}>오늘의 한 곳</div>
            <button onClick={() => setHomeRefreshKey((k) => k + 1)} disabled={homeLoading} style={{ background: 'none', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', cursor: homeLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', animation: homeLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span> 새로고침
              <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
            </button>
          </div>
          {homeLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div>
              <div style={{ fontSize: 15, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>근처 장소를 찾고 있어요...</div>
            </div>
          ) : homeData?.recommendations?.[0] ? (
            <>
              {(() => {
                const rec: any = homeData.recommendations[0]
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : cardBg,
                      border: `1px solid ${borderColor}`,
                      borderRadius: 18,
                      padding: 18,
                      boxShadow: isDarkMode ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#E8740C', fontWeight: 600, marginBottom: 4 }}>오늘의 한 곳</div>
                          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{rec.name}</div>
                          <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{rec.address}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#E8740C' }}>{rec.score}</div>
                          <div style={{ fontSize: 9, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>점수</div>
                          <div style={{ marginTop: 6, fontSize: 11 }}>
                            <span>📍 {rec.distance_meters}m</span>
                          </div>
                        </div>
                      </div>
                      {rec.reason && (
                        <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: 10 }}>{rec.reason}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => { setAcceptedQuest(rec); setScreen('accepted') }}
                        style={{
                          width: '100%',
                          padding: 12,
                          borderRadius: 12,
                          border: 'none',
                          background: 'linear-gradient(135deg, #E8740C, #C65D00)',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginTop: 4,
                        }}
                      >
                        경로 보기 →
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* 홈 지도: 카카오맵 스크립트는 홈에서도 로드 (accepted에만 있으면 홈에서 지도 안 나옴) */}
              {!kakaoMapLoaded && (
                <Script
                  src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'}&autoload=false`}
                  strategy="afterInteractive"
                  onLoad={() => {
                    if (typeof window !== 'undefined' && window.kakao?.maps?.load) {
                      window.kakao.maps.load(() => setKakaoMapLoaded(true))
                    }
                  }}
                />
              )}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>지도에서 오늘의 한 곳 보기</div>
                <div ref={homeMapContainerRef} style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.3)' : '#E5E7EB' }} />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 48, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>근처에서 추천할 장소를 찾지 못했어요.</p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>위치 권한을 허용하거나, 아래에서 기분 맞춤 탐험을 시도해보세요.</p>
            </div>
          )}

          {/* 2) 기분 맞춤 탐험 / 3) 동네 피드 — 3축 구조 */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setScreen('role')}
              style={{
                flex: 1,
                minWidth: 140,
                padding: 16,
                borderRadius: 14,
                border: `1px solid ${borderColor}`,
                background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                color: textColor,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>🎯</span>
              기분 맞춤 탐험
            </button>
            <button
              type="button"
              onClick={() => setScreen('social')}
              style={{
                flex: 1,
                minWidth: 140,
                padding: 16,
                borderRadius: 14,
                border: `1px solid ${borderColor}`,
                background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                color: textColor,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>💬</span>
              동네 피드
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 역할 선택 화면
  if (screen === 'role') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
          <button
            onClick={() => setShowNotificationPanel((v) => !v)}
            style={{
              position: 'relative',
              padding: '8px 12px',
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              color: textColor,
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </button>
          <button
            onClick={() => router.push('/login')}
            style={{
              padding: '8px 14px',
              background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(232,116,12,0.15)',
              border: '1px solid #E8740C',
              borderRadius: 10,
              color: '#E8740C',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            로그인
          </button>
        </div>
        {showNotificationPanel && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }} onClick={() => setShowNotificationPanel(false)}>
            <div style={{ width: '100%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto', background: bgColor, borderRadius: 16, border: `1px solid ${borderColor}`, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>알림</span>
                <button onClick={() => setShowNotificationPanel(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: textColor }}>×</button>
              </div>
              <div style={{ padding: 8 }}>
                {notifications.length === 0 ? (
                  <p style={{ padding: 24, textAlign: 'center', color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', fontSize: 14 }}>알림이 없어요</p>
                ) : (
                  notifications.slice(0, 30).map((n: { id: string; title: string; body?: string; read?: boolean; created_at?: string }) => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, background: n.read ? 'transparent' : (isDarkMode ? 'rgba(232,116,12,0.08)' : 'rgba(232,116,12,0.06)') }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
                      {n.body && <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>{n.body}</div>}
                      {n.created_at && <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
        <RoleScreen setScreen={setScreen} setSelectedRole={setSelectedRole} isDarkMode={isDarkMode} cardBg={cardBg} borderColor={borderColor} textColor={textColor} />
        <BottomNav />
      </div>
    )
  }

  // 기분 선택 화면
  if (screen === 'mood') {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <MoodScreen setScreen={setScreen} setSelectedMood={setSelectedMood} isDarkMode={isDarkMode} cardBg={cardBg} borderColor={borderColor} textColor={textColor} />
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
          ) : questsData?.recommendations?.length ? (
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
                  <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 6 }}>
                    <span>📍 {quest.distance_meters}m</span>
                    <span>⭐ {quest.average_rating || '-'}</span>
                    {quest.estimated_cost && <span>💰 {(quest.estimated_cost/1000).toFixed(0)}천원</span>}
                  </div>
                  {quest.reason && (
                    <p style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: 8 }}>{quest.reason}</p>
                  )}
                  <button type="button" onClick={(e) => { e.stopPropagation(); setAcceptedQuest(quest); setScreen('accepted'); }} style={{ fontSize: 12, color: '#E8740C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>경로 보기 →</button>
                </div>
              ))}
            </div>
          ) : questsData?.recommendations?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>조금 더 넓은 범위로 찾아볼까요?</p>
              <p style={{ fontSize: 13, marginBottom: 20 }}>역할·무드를 바꾸거나 위치를 허용하면 더 많은 퀘스트가 나와요</p>
              <button onClick={() => { setScreen('role'); setSelectedRole(null); setSelectedMood(null); }} style={{ padding: '12px 24px', background: '#E8740C', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>역할 다시 고르기</button>
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

  // 인스타 공유 모달 (스토리/피드 템플릿 폼) — accepted·social 양쪽에서 사용
  const instagramShareModalEl = showInstagramShareModal && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => !instagramShareSubmitting && setShowInstagramShareModal(false)}>
      <div style={{ background: isDarkMode ? '#1a1a2e' : '#fff', borderRadius: '20px 20px 0 0', padding: '0 0 env(safe-area-inset-bottom,16px)', maxWidth: 480, width: '100%', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.4)' }} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: isDarkMode ? '#1a1a2e' : '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📷</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: textColor }}>인스타그램 공유 카드</div>
              <div style={{ fontSize: 11, color: 'rgba(128,128,128,0.9)' }}>스토리 · 피드 · DM으로 공유</div>
            </div>
          </div>
          <button onClick={() => setShowInstagramShareModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'rgba(128,128,128,0.8)', padding: '4px 8px' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {/* 사진 */}
          <label style={{ display: 'block', borderRadius: 12, overflow: 'hidden', marginBottom: 14, cursor: 'pointer', position: 'relative' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onloadend = () => setInstagramShareForm((f) => ({ ...f, image_url: reader.result as string }))
                reader.readAsDataURL(file)
              }
            }} />
            {instagramShareForm.image_url ? (
              <div style={{ position: 'relative' }}>
                <img src={instagramShareForm.image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#fff' }}>📷 변경</div>
              </div>
            ) : (
              <div style={{ width: '100%', height: 100, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F3F4F6', border: `2px dashed ${borderColor}`, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 28 }}>📷</span>
                <span style={{ fontSize: 13, color: 'rgba(128,128,128,0.8)' }}>사진 추가 (선택)</span>
              </div>
            )}
          </label>

          {/* 제목 */}
          <input placeholder="제목" value={instagramShareForm.title} onChange={(e) => setInstagramShareForm((f) => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginBottom: 12, borderRadius: 10, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB', color: textColor, fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />

          {/* AI 서사 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#E8740C', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>✨ AI 서사</span>
                {instagramNarrativeLoading && <span style={{ fontSize: 11, color: 'rgba(128,128,128,0.8)' }}>생성 중…</span>}
              </div>
              {!instagramNarrativeLoading && (
                <button type="button" onClick={() => {
                  if (!acceptedQuest?.name) return
                  setInstagramNarrativeLoading(true)
                  const role = selectedRole || 'explorer'
                  const moodText = selectedMood ? (MOODS.find((m) => m.id === selectedMood)?.name ?? selectedMood) : undefined
                  fetch(`${API_BASE}/api/v1/recommendations/narrative`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      place_name: acceptedQuest?.name,
                      category: acceptedQuest?.category || '기타',
                      role_type: role,
                      user_mood: moodText,
                      vibe_tags: acceptedQuest?.vibe_tags || [],
                      is_hidden_gem: acceptedQuest?.is_hidden_gem ?? false,
                    }),
                  })
                    .then((res) => res.json())
                    .then((data) => { if (data.narrative) setInstagramShareForm((f) => ({ ...f, aiNarrative: data.narrative })) })
                    .catch(() => {})
                    .finally(() => setInstagramNarrativeLoading(false))
                }} style={{ background: 'none', border: `1px solid #E8740C`, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#E8740C', cursor: 'pointer', fontWeight: 600 }}>
                  🔄 재생성
                </button>
              )}
            </div>
            <textarea
              placeholder={instagramNarrativeLoading ? 'AI가 서사를 생성하는 중이에요…' : 'AI가 이 장소의 서사를 자동으로 작성해드려요'}
              value={instagramShareForm.aiNarrative}
              onChange={(e) => setInstagramShareForm((f) => ({ ...f, aiNarrative: e.target.value }))}
              rows={3}
              disabled={instagramNarrativeLoading}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${instagramNarrativeLoading ? borderColor : '#E8740C44'}`, background: isDarkMode ? 'rgba(232,116,12,0.06)' : '#FFF8F2', color: textColor, fontSize: 13, resize: 'none', boxSizing: 'border-box', lineHeight: 1.6, opacity: instagramNarrativeLoading ? 0.6 : 1 }}
            />
          </div>

          {/* 나의 리뷰 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: textColor, marginBottom: 6 }}>✏️ 나의 리뷰</div>
            <textarea
              placeholder="이 장소에서의 경험을 직접 적어보세요. 인스타 게시물에 함께 올라가요."
              value={instagramShareForm.userReview}
              onChange={(e) => setInstagramShareForm((f) => ({ ...f, userReview: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB', color: textColor, fontSize: 13, resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          </div>

          {/* 평점 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: textColor, marginBottom: 6 }}>⭐ 평점</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map((star) => (
                <button key={star} type="button" onClick={() => setInstagramShareForm((f) => ({ ...f, rating: star }))}
                  style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: 2, opacity: star <= instagramShareForm.rating ? 1 : 0.3, transition: 'opacity 0.15s' }}>⭐</button>
              ))}
            </div>
          </div>

          {/* 장소 정보 */}
          <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F3F4F6', borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span>📍</span>
              <span style={{ fontWeight: 600, color: textColor }}>{instagramShareForm.place_name || '장소 미지정'}</span>
            </div>
            {instagramShareForm.place_address && <div style={{ color: 'rgba(128,128,128,0.9)', paddingLeft: 20, fontSize: 12 }}>{instagramShareForm.place_address}</div>}
          </div>

          {/* 공유 버튼 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" disabled={instagramShareSubmitting} onClick={async () => {
              setInstagramShareSubmitting(true)
              try {
                const placeLine = [instagramShareForm.place_name, instagramShareForm.place_address].filter(Boolean).join(' · ')
                const cardBody = [instagramShareForm.aiNarrative, instagramShareForm.userReview].filter(Boolean).join('\n\n')
                const blob = await makeStoryCard({ title: instagramShareForm.title || 'WhereHere', body: cardBody, imageUrl: instagramShareForm.image_url || undefined, placeLine: placeLine || undefined, moodLine: instagramShareForm.mood || undefined, ratingLine: instagramShareForm.rating ? `⭐ ${instagramShareForm.rating}점` : undefined })
                const file = blobToFile(blob, 'wherehere-story.png')
                const caption = [instagramShareForm.title, instagramShareForm.userReview || instagramShareForm.aiNarrative, placeLine ? `📍 ${placeLine}` : '', '#wherehere #동네생활 #탐험', typeof window !== 'undefined' ? window.location.origin + '/' : ''].filter(Boolean).join('\n')
                await shareOrDownload({ file, caption, filename: 'wherehere-story.png', onToast: (m) => { toast.success(m); setShowInstagramShareModal(false) } })
              } catch (e) {
                console.error(e)
                toast.error('카드 생성에 실패했어요.')
              } finally {
                setInstagramShareSubmitting(false)
              }
            }} style={{ padding: '14px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: instagramShareSubmitting ? 'not-allowed' : 'pointer', opacity: instagramShareSubmitting ? 0.7 : 1 }}>
              {instagramShareSubmitting ? '만드는 중…' : '📱 스토리로 공유'}
            </button>
            <button type="button" disabled={instagramShareSubmitting} onClick={async () => {
              setInstagramShareSubmitting(true)
              try {
                const placeLine = [instagramShareForm.place_name, instagramShareForm.place_address].filter(Boolean).join(' · ')
                const cardBody = [instagramShareForm.aiNarrative, instagramShareForm.userReview].filter(Boolean).join('\n\n')
                const blob = await makeFeedCard({ title: instagramShareForm.title || 'WhereHere', body: cardBody, imageUrl: instagramShareForm.image_url || undefined, placeLine: placeLine || undefined, moodLine: instagramShareForm.mood || undefined, ratingLine: instagramShareForm.rating ? `⭐ ${instagramShareForm.rating}점` : undefined })
                const file = blobToFile(blob, 'wherehere-feed.png')
                const caption = [instagramShareForm.title, instagramShareForm.userReview || instagramShareForm.aiNarrative, placeLine ? `📍 ${placeLine}` : '', '#wherehere #동네생활 #탐험', typeof window !== 'undefined' ? window.location.origin + '/' : ''].filter(Boolean).join('\n')
                await shareOrDownload({ file, caption, filename: 'wherehere-feed.png', onToast: (m) => { toast.success(m); setShowInstagramShareModal(false) } })
              } catch (e) {
                console.error(e)
                toast.error('카드 생성에 실패했어요.')
              } finally {
                setInstagramShareSubmitting(false)
              }
            }} style={{ padding: '14px 0', borderRadius: 12, border: `1.5px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#fff', color: textColor, fontWeight: 700, fontSize: 14, cursor: instagramShareSubmitting ? 'not-allowed' : 'pointer', opacity: instagramShareSubmitting ? 0.7 : 1 }}>
              🖼️ 피드·DM 공유
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(128,128,128,0.7)', marginTop: 10 }}>
            카드 이미지가 저장되면 인스타그램 앱에서 스토리·피드·DM에 올려주세요
          </div>
        </div>
      </div>
    </div>
  )

  // 수락한 퀘스트 화면
  if (screen === 'accepted' && acceptedQuest) {
    return (
      <div>
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          <button onClick={() => setScreen('quests')} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '8px 16px', color: textColor, cursor: 'pointer', marginBottom: 24 }}>
            ← 뒤로
          </button>

          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{acceptedQuest.name}</h2>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', lineHeight: 1.6 }}>
              {narrativeLoading ? '서사 불러오는 중…' : (acceptedQuest.narrative || acceptedQuest.reason)}
            </p>
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

          {/* 경로 탐색: 앱 내 지도에 경로 표시 + 카카오맵 길찾기 + 도착 인정 */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: isDarkMode ? '#F59E0B' : '#B45309' }}>
              🧭 경로 탐색
            </div>
            {acceptedQuest?.latitude != null && acceptedQuest?.longitude != null ? (
              <>
                {/* 카카오맵 스크립트 (수락한 퀘스트 화면에서만 로드) */}
                {!kakaoMapLoaded && (
                  <Script
                    src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'}&autoload=false`}
                    strategy="afterInteractive"
                    onLoad={() => {
                      if (typeof window !== 'undefined' && window.kakao?.maps?.load) {
                        window.kakao.maps.load(() => setKakaoMapLoaded(true))
                      }
                    }}
                  />
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <button type="button" onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (p) => { setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setArrivalMessage(null); },
                        () => setArrivalMessage('위치를 가져올 수 없어요. 권한을 확인해주세요.')
                      )
                    }
                  }} style={{ padding: '8px 14px', fontSize: 12, background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB', border: `1px solid ${borderColor}`, borderRadius: 8, color: textColor, cursor: 'pointer', fontWeight: 600 }}>
                    📍 현재 위치 새로고침
                  </button>
                </div>
                {/* 앱 내 지도: 현재 위치 → 목적지 경로 표시 */}
                <div
                  ref={routeMapContainerRef}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: 12,
                    marginBottom: 12,
                    overflow: 'hidden',
                    background: isDarkMode ? '#1a1d24' : '#e5e7eb',
                    border: `1px solid ${borderColor}`,
                  }}
                />
                {kakaoMapLoaded && (
                  <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 10 }}>
                    지도 위 선: 현재 위치 → 목적지
                  </div>
                )}
                <a
                  href={`https://map.kakao.com/link/to/${encodeURIComponent(acceptedQuest.name)},${acceptedQuest.latitude},${acceptedQuest.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: 14,
                      background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#FFF',
                      border: `1px solid ${borderColor}`,
                      borderRadius: 12,
                      color: '#E8740C',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      marginBottom: 10,
                    }}
                  >
                    📍 카카오맵으로 길찾기
                  </button>
                </a>
                <button
                  type="button"
                  onClick={handleArrivalCheck}
                  disabled={arrivalCheckLoading || missionStates['arrival']?.completed}
                  style={{
                    width: '100%',
                    padding: 14,
                    background: missionStates['arrival']?.completed
                      ? (isDarkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5')
                      : 'linear-gradient(135deg, #E8740C, #C65D00)',
                    border: 'none',
                    borderRadius: 12,
                    color: missionStates['arrival']?.completed ? (isDarkMode ? '#6EE7B7' : '#059669') : '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: arrivalCheckLoading || missionStates['arrival']?.completed ? 'default' : 'pointer',
                    opacity: arrivalCheckLoading ? 0.8 : 1,
                  }}
                >
                  {missionStates['arrival']?.completed ? '✅ 장소 도착 완료' : arrivalCheckLoading ? '위치 확인 중...' : `도착했어요 (${ARRIVAL_THRESHOLD_METERS}m 이내)`}
                </button>
                {arrivalMessage && (
                  <div style={{ marginTop: 10, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                    {arrivalMessage}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                이 장소는 경로 탐색/도착 인정을 지원하지 않아요. 체크리스트에서 직접 완료해주세요.
              </p>
            )}
          </div>

          {/* 동적 미션 카드 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E8740C' }}>📋 미션</span>
              <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                {completedMissionCount}/{currentMissions.length}
              </span>
            </div>
            <div style={{ height: 6, background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ width: `${currentMissions.length ? (completedMissionCount / currentMissions.length) * 100 : 0}%`, height: '100%', background: 'linear-gradient(90deg, #E8740C, #F59E0B)', transition: 'width 0.3s' }} />
            </div>
            {currentMissions.map((m) => {
              const state = missionStates[m.id]
              const completed = state?.completed
              const isExpanded = expandedMissionId === m.id
              return (
                <div
                  key={m.id}
                  onClick={() => setExpandedMissionId(isExpanded ? null : m.id)}
                  style={{
                    background: cardBg,
                    border: `1px solid ${completed ? 'rgba(232,116,12,0.5)' : borderColor}`,
                    borderRadius: 12,
                    marginBottom: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{m.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: textColor, textDecoration: completed ? 'line-through' : 'none' }}>{m.title}</div>
                      {completed && state?.value != null && m.type !== 'arrival' && m.type !== 'photo' && (
                        <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 2 }}>{String(state.value)}</div>
                      )}
                      {completed && state?.photo && (m.type === 'photo' || m.type === 'photo_with_prompt') && (
                        <div style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', width: 48, height: 48 }}>
                          <img src={state.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 18 }}>{completed ? '✅' : isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && !completed && (
                    <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${borderColor}` }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 8, marginBottom: 8 }}>{m.description}</div>
                      {m.type === 'arrival' && (
                        <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>위의 「도착했어요」 버튼으로 인증하세요.</div>
                      )}
                      {(m.type === 'photo' || m.type === 'photo_with_prompt') && (
                        <>
                          {m.prompt && <div style={{ fontSize: 12, marginBottom: 6 }}>{m.prompt}</div>}
                          <label style={{ display: 'block', padding: 12, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px dashed ${borderColor}`, borderRadius: 8, textAlign: 'center', cursor: 'pointer', fontSize: 12 }}>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                const dataUrl = reader.result as string
                                setMissionStates((prev) => ({ ...prev, [m.id]: { completed: true, photo: dataUrl, value: prev[m.id]?.value } }))
                                const nextIdx = currentMissions.findIndex((x) => x.id === m.id) + 1
                                const next = currentMissions[nextIdx]
                                if (next) setExpandedMissionId(next.id)
                              }
                              reader.readAsDataURL(file)
                            }} />
                            📷 사진 올리기
                          </label>
                          {m.type === 'photo_with_prompt' && (
                            <input type="text" placeholder={m.prompt} value={state?.value as string ?? ''} onChange={(e) => setMissionStates((prev) => ({ ...prev, [m.id]: { ...prev[m.id], value: e.target.value } }))} style={{ width: '100%', marginTop: 8, padding: 10, border: `1px solid ${borderColor}`, borderRadius: 8, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', color: textColor, fontSize: 13 }} />
                          )}
                        </>
                      )}
                      {m.type === 'text_input' && (
                        <input type="text" placeholder={m.prompt} value={state?.value as string ?? ''} onChange={(e) => setMissionStates((prev) => ({ ...prev, [m.id]: { ...prev[m.id], value: e.target.value } }))} onBlur={(e) => e.target.value.trim() && setMissionStates((prev) => ({ ...prev, [m.id]: { ...prev[m.id], completed: true, value: e.target.value.trim() } }))} style={{ width: '100%', padding: 10, border: `1px solid ${borderColor}`, borderRadius: 8, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', color: textColor, fontSize: 13 }} />
                      )}
                      {m.type === 'choice' && m.choices && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {m.choices.map((c) => (
                            <button key={c} type="button" onClick={() => { setMissionStates((prev) => ({ ...prev, [m.id]: { completed: true, value: c } })); const nextIdx = currentMissions.findIndex((x) => x.id === m.id) + 1; if (currentMissions[nextIdx]) setExpandedMissionId(currentMissions[nextIdx].id) }} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: (state?.value === c) ? '#E8740C' : cardBg, color: (state?.value === c) ? '#fff' : textColor, fontSize: 12, cursor: 'pointer' }}>{c}</button>
                          ))}
                        </div>
                      )}
                      {m.type === 'number_input' && (
                        <input type="number" placeholder={m.prompt} value={state?.value as number ?? ''} onChange={(e) => { const v = e.target.value; const n = v === '' ? undefined : Number(v); setMissionStates((prev) => ({ ...prev, [m.id]: { ...prev[m.id], value: n, completed: n != null && !Number.isNaN(n) } })) }} style={{ width: '100%', padding: 10, border: `1px solid ${borderColor}`, borderRadius: 8, background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', color: textColor, fontSize: 13 }} />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {essentialChecklistCompleted && (
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
              🎉 필수 미션 완료! 이제 체크인하세요!
            </div>
          )}

          <button onClick={handleCheckIn} disabled={!essentialChecklistCompleted} style={{
            width: '100%', padding: 18, 
            background: essentialChecklistCompleted ? 'linear-gradient(135deg, #E8740C, #C65D00)' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
            border: 'none', borderRadius: 16, 
            color: essentialChecklistCompleted ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.3)' : '#9CA3AF'), 
            fontSize: 16, fontWeight: 700,
            cursor: essentialChecklistCompleted ? 'pointer' : 'not-allowed', 
            transition: 'all 0.3s', 
            boxShadow: essentialChecklistCompleted ? '0 4px 20px rgba(232,116,12,0.3)' : 'none',
            opacity: essentialChecklistCompleted ? 1 : 0.5,
          }} onMouseEnter={(e) => { if (essentialChecklistCompleted) e.currentTarget.style.transform = 'scale(1.02)'; }}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            {essentialChecklistCompleted ? '✅ 체크인하기' : '🔒 필수: 도착 + 리뷰 완료 후 체크인'}
          </button>
        </div>
        <BottomNav />
      </div>
      {instagramShareModalEl}
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
      <div>
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
      {instagramShareModalEl}
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

          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {CHALLENGE_CATEGORIES.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setChallengeCategory(cat.id)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${challengeCategory === cat.id ? '#E8740C' : borderColor}`, background: challengeCategory === cat.id ? 'rgba(232,116,12,0.15)' : cardBg, color: textColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{cat.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 16 }}>
            오늘 완료: {(CHALLENGES_BY_CATEGORY.daily.filter((c) => { const p = (userStats?.total_visits ?? 0) > 0 && c.id === 'd1' ? 1 : 0; return p >= c.total }).length)}/3 | 이번 주: {CHALLENGES_BY_CATEGORY.weekly.filter((c) => Math.min(userStats?.current_streak ?? 0, userStats?.total_places_visited ?? 0) >= c.total).length}/4 | 총 업적: {CHALLENGES_BY_CATEGORY.achievement.filter((c) => (c.id === 'a1' && (userStats?.total_visits ?? 0) >= 1) || (c.id === 'a2' && (userStats?.total_places_visited ?? 0) >= 10) || (c.id === 'a3' && (userStats?.total_places_visited ?? 0) >= 50) || (c.id === 'a5' && (userStats?.current_streak ?? 0) >= 30) || (c.id === 'a6' && (userStats?.total_reviews ?? userStats?.total_visits ?? 0) >= 30)).length}/7
          </div>
          <div style={{ display: 'grid', gap: 16 }}>
            {CHALLENGES_BY_CATEGORY[challengeCategory].map((c) => {
              const progress = (() => {
                const streak = userStats?.current_streak ?? 0
                const places = userStats?.total_places_visited ?? userStats?.unique_places ?? 0
                const visits = userStats?.total_visits ?? 0
                const reviews = userStats?.total_reviews ?? userStats?.total_visits ?? 0
                const following = (userStats?.following_count as number) ?? 0
                if (c.id === 'd1') return visits > 0 ? 1 : 0
                if (c.id === 'w1') return Math.min(streak, c.total)
                if (c.id === 'w2') return Math.min(places, c.total)
                if (c.id === 'a1') return visits >= 1 ? 1 : 0
                if (c.id === 'a2' || c.id === 'a3') return Math.min(places, c.total)
                if (c.id === 'a5') return Math.min(streak, c.total)
                if (c.id === 'a6') return Math.min(reviews, c.total)
                if (c.id === 's1') return Math.min(following, c.total)
                return 0
              })()
              const done = progress >= c.total
              const tierColor = c.tier === 'gold' ? '#F59E0B' : c.tier === 'silver' ? '#9CA3AF' : c.tier === 'bronze' ? '#D97706' : undefined
              return (
                <div key={c.id} style={{ background: done ? (isDarkMode ? 'rgba(232,116,12,0.15)' : 'rgba(232,116,12,0.08)') : cardBg, border: `1px solid ${done ? '#E8740C' : borderColor}`, borderRadius: 16, padding: 20, boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)', opacity: !done && c.tier ? 0.85 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 32 }}>{c.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{c.desc}</div>
                    </div>
                    {done && <span style={{ fontSize: 11, color: '#E8740C', fontWeight: 700 }}>✅ 완료! +{c.rewardXP} XP</span>}
                    {!done && c.tier && <span style={{ fontSize: 18 }} title="업적">🔒</span>}
                  </div>
                  <div style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span>{progress}/{c.total}</span>
                      <span style={{ color: '#E8740C', fontWeight: 600 }}>+{c.rewardXP} XP</span>
                    </div>
                    <div style={{ height: 6, background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${c.total ? (progress / c.total) * 100 : 0}%`, height: '100%', background: tierColor ? `linear-gradient(90deg, ${tierColor}, #F59E0B)` : 'linear-gradient(90deg, #E8740C, #F59E0B)', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  // 소셜 탭: 동네(홈/작성/피드) + 친구(기존 체크인 피드)
  if (screen === 'social') {
    const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '160238a590f3d2957230d764fb745322'
    const sharePostText = (post: { title: string; body?: string; place_name?: string; image_url?: string; place_address?: string } | null) => {
      if (!post) return
      
      const kakao = typeof window !== 'undefined' ? (window as any).Kakao : undefined
      const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : ''
      
      // 카카오톡 SDK로 공유
      if (kakao?.Share?.sendDefault) {
        try {
          const description = [
            post.body || '',
            post.place_name ? `📍 ${post.place_name}` : '',
            post.place_address ? `   ${post.place_address}` : ''
          ].filter(Boolean).join('\n')
          
          kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: post.title,
              description: description,
              imageUrl: (post.image_url || '').split(',')[0].trim() || appUrl + 'og.png',
              link: {
                webUrl: appUrl,
                mobileWebUrl: appUrl,
              },
            },
            buttons: [
              {
                title: 'WhereHere 열기',
                link: {
                  webUrl: appUrl,
                  mobileWebUrl: appUrl,
                },
              },
            ],
          })
          // 성공 - 카카오톡 친구 선택창이 열림
          return
        } catch (err) {
          console.error('카카오톡 공유 실패:', err)
          toast.error('카카오톡 공유에 실패했어요. 기본 공유를 시도합니다.')
        }
      }
      
      // 카카오 SDK 없으면 기본 공유
      const text = [post.title, post.body || '', post.place_name ? `📍 ${post.place_name}` : '', post.place_address ? `   ${post.place_address}` : '', '#동네생활 #wherehere', appUrl].filter(Boolean).join('\n')
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: post.title, text }).catch(() => { navigator.clipboard?.writeText(text); toast.success('공유 문구를 복사했어요.') })
      } else {
        navigator.clipboard?.writeText(text)
        toast.success('공유 문구를 복사했어요.')
      }
    }
    const sharePostInstagramCard = (post: { title: string; body?: string; place_name?: string; place_address?: string; image_url?: string; rating?: number } | null) => {
      if (!post) return
      setInstagramShareForm({
        title: post.title || '',
        body: (post.body || '').slice(0, 300),
        place_name: post.place_name || '',
        place_address: post.place_address || '',
        image_url: (post.image_url || '').split(',')[0].trim() || '',
        mood: '',
        rating: post.rating != null ? String(post.rating) : '',
      })
      setShowInstagramShareModal(true)
    }
    return (
      <div>
      <LocalHub
        apiBase={API_BASE}
        userId={userId}
        isDarkMode={isDarkMode}
        cardBg={cardBg}
        borderColor={borderColor}
        textColor={textColor}
        areaName=""
        myFriendCode={myFriendCode}
        friendQuery={friendQuery}
        setFriendQuery={setFriendQuery}
        searchFriends={searchFriends}
        friendSearchLoading={friendSearchLoading}
        friendSearchResults={friendSearchResults}
        toggleFollow={toggleFollow}
        openChatWithUser={openChatWithUser}
        feedActivities={feedActivities}
        onShareKakao={sharePostText}
        onShareInstagramCard={sharePostInstagramCard}
        onToast={(msg) => toast(msg)}
        BottomNav={<BottomNav />}
        userAvatarUrl={userProfile?.profile_image_url}
        kakaoAccessToken={kakaoAccessToken}
      />
      {instagramShareModalEl}
      </div>
    )
  }

  // 프로필 화면
  if (screen === 'profile') {
    const level = userStats?.level ?? 1
    const totalXP = userStats?.total_xp ?? 0
    const nextXP = userStats?.xp_to_next_level ?? 1000
    const xpProgress = nextXP > 0 ? Math.min(100, (totalXP / nextXP) * 100) : 0
    const streak = userStats?.current_streak ?? 0
    const longestStreak = userStats?.longest_streak ?? 0
    const completedQuests = userStats?.completed_quests ?? 0
    const placesVisited = userStats?.total_places_visited ?? 0
    const profileAvatarUrl = userProfile?.profile_image_url ?? user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? user?.user_metadata?.profile_image_url

    const submitProfileComment = async () => {
      if (!selectedProfilePost?.id || !profileCommentInput.trim()) return
      try {
        const res = await fetch(`${API_BASE}/api/v1/local/posts/${selectedProfilePost.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author_id: userId, body: profileCommentInput.trim() }),
        })
        if (!res.ok) throw new Error('API error')
        setProfileCommentInput('')
        refetchProfilePostComments()
      } catch (_) {
        toast.error('댓글 저장에 실패했어요. 네트워크를 확인해주세요.')
      }
    }

    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '60px 20px 120px' }}>
          {/* 프로필 헤더: 아바타, 닉네임, 아이디(친구코드) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', flexShrink: 0 }}>
              {profileAvatarUrl ? (
                <img src={profileAvatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff' }}>{(displayName || '?').slice(0, 1)}</div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{displayName || '이름 없음'}</div>
              <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>@{myFriendCode}</div>
              <button type="button" onClick={() => setScreen('settings')} style={{ marginTop: 8, fontSize: 12, color: '#E8740C', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>설정에서 프로필 수정</button>
            </div>
          </div>

          {/* 레벨 & XP 진행바 */}
          <div style={{
            background: isDarkMode ? 'linear-gradient(135deg, rgba(232,116,12,0.15), rgba(232,116,12,0.05))' : 'linear-gradient(135deg, #FEF3C7, #FFFBEB)',
            border: '1px solid rgba(232,116,12,0.3)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#E8740C' }}>레벨 & XP</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#E8740C' }}>Lv.{level}</span>
            </div>
            <div style={{
              height: 12,
              borderRadius: 6,
              background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.08)',
              overflow: 'hidden',
              marginBottom: 8,
            }}>
              <div style={{
                width: `${xpProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #E8740C, #F59E0B)',
                borderRadius: 6,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
              {totalXP.toLocaleString()} / {nextXP.toLocaleString()} XP
              {nextXP > totalXP && (
                <span style={{ marginLeft: 8 }}>· 다음 레벨까지 {(nextXP - totalXP).toLocaleString()} XP</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                🔥 연속 <strong style={{ color: textColor }}>{streak}</strong>일
              </span>
              <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                📍 방문 <strong style={{ color: textColor }}>{placesVisited}</strong>곳
              </span>
              <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                ✅ 퀘스트 <strong style={{ color: textColor }}>{completedQuests}</strong>개 완료
              </span>
            </div>
            {/* 업적 뱃지 */}
            {(userStats?.badges as { id: string; name: string; icon: string }[] | undefined)?.length ? (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 10 }}>업적 뱃지</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {(userStats.badges as { id: string; name: string; icon: string }[]).map((b) => (
                    <div key={b.id} title={b.name} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', borderRadius: 10, border: `1px solid ${borderColor}` }}>
                      <span style={{ fontSize: 18 }}>{b.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: textColor }}>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <PersonalityProfile userId={userId} />

          {/* 내 피드 (인스타 스타일 그리드) */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>내 피드</div>
            {profilePosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
                <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 8 }}>아직 게시글이 없어요</p>
                <button type="button" onClick={() => setScreen('social')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#E8740C', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>소셜에서 작성하기</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                {profilePosts.map((p: { id: string; title?: string; image_url?: string; type?: string }) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfilePost(p)}
                    style={{ aspectRatio: '1', padding: 0, border: 'none', borderRadius: 8, overflow: 'hidden', background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E5E7EB', cursor: 'pointer' }}
                  >
                    {(p.image_url ? (p.image_url as string).split(',').map((u) => u.trim()).filter(Boolean)[0] : null) ? (
                      <img src={(p.image_url as string).split(',').map((u) => u.trim()).filter(Boolean)[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📝</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 게시글 상세 모달 (댓글 포함) */}
          {selectedProfilePost && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setSelectedProfilePost(null)}>
              <div style={{ width: '100%', maxWidth: 400, maxHeight: '85vh', background: cardBg, borderRadius: 20, border: `1px solid ${borderColor}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>게시글</span>
                  <button type="button" onClick={() => setSelectedProfilePost(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: textColor }}>×</button>
                </div>
                <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
                  {(selectedProfilePost.image_url ? (selectedProfilePost.image_url as string).split(',').map((u) => u.trim()).filter(Boolean) : []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {(selectedProfilePost.image_url as string).split(',').map((u) => u.trim()).filter(Boolean).map((src, i) => (
                        <img key={i} src={src} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 240, objectFit: 'cover' }} />
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{selectedProfilePost.title}</div>
                  {selectedProfilePost.body && <div style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{selectedProfilePost.body}</div>}
                  {selectedProfilePost.place_name && <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 12 }}>📍 {selectedProfilePost.place_name}</div>}
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginBottom: 16 }}>댓글 {profilePostComments.length}개</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {profilePostComments.map((c: { id: string; body?: string; author_id?: string; created_at?: string }) => (
                      <div key={c.id} style={{ padding: 10, background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: 10, fontSize: 13 }}>
                        <span style={{ fontWeight: 600 }}>{c.author_id === userId ? '나' : (c.author_id?.slice(0, 8) ?? '') + '…'}</span>
                        <span style={{ marginLeft: 6 }}>{c.body}</span>
                        {c.created_at && <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 4 }}>{new Date(c.created_at).toLocaleString('ko-KR')}</div>}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 12, borderTop: `1px solid ${borderColor}`, display: 'flex', gap: 8 }}>
                  <input
                    placeholder="댓글 입력..."
                    value={profileCommentInput}
                    onChange={(e) => setProfileCommentInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitProfileComment()}
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, fontSize: 14 }}
                  />
                  <button type="button" onClick={submitProfileComment} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#E8740C', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>등록</button>
                </div>
              </div>
            </div>
          )}
        </div>
        <BottomNav />
      </div>
    )
  }

  // 채팅 화면
  if (screen === 'chat' && currentConversation) {
    const other = currentConversation.other
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '20px 16px 90px' }}>
          {/* 상단 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setScreen('social')}
              style={{ border: 'none', background: 'transparent', color: textColor, cursor: 'pointer', fontSize: 18 }}
            >
              ←
            </button>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #E8740C, #F59E0B)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {other?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatar_url} alt={other.display_name || 'avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 18, color: '#fff' }}>{(other?.display_name || '친구').slice(0, 1)}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {other?.display_name || '친구'}
              </div>
              <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                코드 {other?.code}
              </div>
            </div>
          </div>

          {/* 메시지 리스트 */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${borderColor}`,
              background: cardBg,
              padding: 12,
              height: 'calc(100vh - 180px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {chatLoading && chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 16 }}>메시지 불러오는 중...</div>
            )}
            {!chatLoading && chatMessages.length === 0 && (
              <div style={{ textAlign: 'center', fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 16 }}>
                아직 대화가 없어요. 첫 메시지를 보내보세요!
              </div>
            )}
            {chatMessages.map((m) => {
              const isMine = m.sender_id === userId
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '8px 12px',
                      borderRadius: 16,
                      background: isMine ? '#E8740C' : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#E5E7EB'),
                      color: isMine ? '#fff' : textColor,
                      fontSize: 13,
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.body}
                    {m.created_at && (
                      <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>
                        {new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 입력창 */}
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            maxWidth: 430,
            margin: '0 auto',
            padding: '10px 12px 16px',
            background: isDarkMode ? 'rgba(10,14,20,0.98)' : 'rgba(255,255,255,0.98)',
            borderTop: `1px solid ${borderColor}`,
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendChatMessage()
              }
            }}
            placeholder="메시지를 입력하세요"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 999,
              border: `1px solid ${borderColor}`,
              background: isDarkMode ? 'rgba(0,0,0,0.3)' : '#F9FAFB',
              color: textColor,
              fontSize: 13,
            }}
          />
          <button
            type="button"
            onClick={sendChatMessage}
            style={{
              padding: '10px 14px',
              borderRadius: 999,
              border: 'none',
              background: chatInput.trim() ? '#E8740C' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
              color: chatInput.trim() ? '#fff' : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF'),
              fontSize: 13,
              fontWeight: 600,
              cursor: chatInput.trim() ? 'pointer' : 'default',
            }}
          >
            전송
          </button>
        </div>
      </div>
    )
  }

  // 카카오 API 테스트 (심사 제출용) — 4단계 한 화면에 모아서 한 장 캡처
  if (screen === 'kakao-api-test') {
    const isKakaoLoggedIn = !!(user && (user as any).app_metadata?.provider === 'kakao')
    // 친구 목록/메시지 API는 동의창에서 돌아온 토큰만 사용. 로그인 토큰 쓰면 403.
    const tokenForFriends = kakaoFriendsToken ?? null
    const step2Done = kakaoTestFriends.length > 0
    const step4Done = !!kakaoTestSentTo
    const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : ''
    const inviteText = `WhereHere 초대\n친구 코드: ${myFriendCode}\n${appUrl}`

    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '50px 20px 100px' }}>
          <button type="button" onClick={() => setScreen('settings')} style={{ marginBottom: 16, background: 'none', border: 'none', color: '#E8740C', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>← 설정으로</button>
          <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>카카오톡 친구 목록 / 메시지 API 테스트</h2>
          <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 24 }}>아래 4단계를 순서대로 진행한 뒤, 이 화면 전체를 한 장 캡처해 심사에 제출하세요.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ① 카카오 로그인 */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>① 카카오 로그인</div>
              {isKakaoLoggedIn ? (
                <div style={{ fontSize: 13, color: '#16a34a' }}>✓ 완료 (카카오 계정으로 로그인됨)</div>
              ) : (
                <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>로그인 필요 · 설정에서 카카오로 로그인 후 다시 이 화면으로 오세요.</div>
              )}
            </div>

            {/* ② 친구목록 동의 */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>② 카카오톡 서비스 내 친구목록 동의</div>
              {step2Done ? (
                <div style={{ fontSize: 13, color: '#16a34a' }}>✓ 완료 (친구 목록 조회로 동의 확인됨)</div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 10 }}>동의가 필요하면 아래 버튼을 누르면 카카오 동의창이 열립니다. 동의 후 돌아오면 ③ 친구 목록 불러오기를 누르세요.</div>
                  <button
                    type="button"
                    onClick={() => { window.location.href = window.location.origin + '/api/auth/kakao-consent?return=kakao-api-test' }}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FEE500', color: '#3C1E1E', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >
                    카카오 동의창 띄우기 (친구 목록 권한 허용)
                  </button>
                </div>
              )}
            </div>

            {/* ③ 친구 목록 가져오기 */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>③ 친구 목록 가져오기</div>
              {kakaoTestFriendsLoading ? (
                <div style={{ fontSize: 13 }}>불러오는 중...</div>
              ) : kakaoTestFriends.length > 0 ? (
                <div>
                  <div style={{ fontSize: 13, color: '#16a34a', marginBottom: 8 }}>✓ 완료 — {kakaoTestFriends.length}명 조회됨</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                    {kakaoTestFriends.slice(0, 5).map((f, i) => (f.profile_nickname || f.uuid || f.id || '친구') + (i < kakaoTestFriends.length - 1 ? ', ' : '')).join('')}
                    {kakaoTestFriends.length > 5 && ' 외 ' + (kakaoTestFriends.length - 5) + '명'}
                  </div>
                </div>
              ) : (
                <>
                  {isKakaoLoggedIn && !tokenForFriends && (
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 10 }}>
                      ②에서 <b>카카오 동의창 띄우기</b>를 누르고, 카카오에서 동의한 뒤 이 페이지로 돌아오면 이 버튼을 누르세요.
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!tokenForFriends || !isKakaoLoggedIn}
                    onClick={async () => {
                      if (!isKakaoLoggedIn) { toast('카카오로 로그인 후 이용해 주세요.'); return }
                      if (!tokenForFriends) { toast('먼저 ②에서 "카카오 동의창 띄우기"를 누르고, 동의한 뒤 돌아오세요.'); return }
                      setKakaoTestFriendsLoading(true)
                      setKakaoTestFriendsError(null)
                      try {
                        const res = await fetch(`${API_BASE}/api/v1/social/kakao-friends`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ access_token: tokenForFriends }),
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.status === 403) {
                          setKakaoTestFriendsError('403')
                          toast('친구목록 동의가 필요해요. 아래 버튼으로 동의 후 다시 시도하세요.')
                          return
                        }
                        const elements = data.elements ?? []
                        setKakaoTestFriends(elements)
                        setKakaoTestFriendsError(null)
                        if (elements.length === 0) toast('친구 목록이 비어있거나 동의가 필요해요. 아래 동의하기를 눌러 다시 시도하세요.')
                      } catch {
                        toast('친구 목록을 불러오지 못했어요.')
                      } finally {
                        setKakaoTestFriendsLoading(false)
                      }
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: tokenForFriends && isKakaoLoggedIn ? '#FEE500' : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                      color: tokenForFriends && isKakaoLoggedIn ? '#3C1E1E' : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF'),
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: tokenForFriends && isKakaoLoggedIn ? 'pointer' : 'default',
                    }}
                  >
                    친구 목록 불러오기
                  </button>
                  {kakaoTestFriendsError === '403' && (
                    <div style={{ marginTop: 12, padding: 12, background: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEE2E2', borderRadius: 10, border: '1px solid #DC2626' }}>
                      <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 6 }}>403: 친구 목록 권한이 없습니다.</div>
                      <div style={{ fontSize: 11, color: '#B91C1C', lineHeight: 1.6, marginBottom: 10 }}>
                        아래 버튼을 누르면 카카오 동의창이 열립니다. 동의 후 돌아오면 <b>친구 목록 불러오기</b>를 다시 누르세요.
                      </div>
                      <button
                        type="button"
                        onClick={() => { window.location.href = window.location.origin + '/api/auth/kakao-consent?return=kakao-api-test' }}
                        style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#FEE500', color: '#3C1E1E', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                      >
                        친구 목록 권한 허용 (동의창 띄우기)
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ④ 친구에게 메시지 전송 */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>④ 친구에게 메시지 전송</div>
              {step4Done ? (
                <div style={{ fontSize: 13, color: '#16a34a' }}>✓ 완료 — {kakaoTestSentTo}에게 초대 메시지 전송함</div>
              ) : kakaoTestFriends.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 4 }}>한 명 선택 후 바로 보내기를 누르세요.</div>
                  {kakaoTestFriends.slice(0, 5).map((f) => {
                    const uid = f.uuid || f.id || ''
                    const name = f.profile_nickname || uid || '친구'
                    return (
                      <div key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${borderColor}` }}>
                        <span style={{ fontSize: 13 }}>{name}</span>
                        <button
                          type="button"
                          disabled={!!kakaoTestSendingUuid}
                          onClick={async () => {
                            if (!tokenForFriends || !uid) return
                            setKakaoTestSendingUuid(uid)
                            try {
                              const res = await fetch(`${API_BASE}/api/v1/social/kakao-friends/send-message`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  access_token: tokenForFriends,
                                  receiver_uuid: uid,
                                  text: inviteText,
                                  title: 'WhereHere 열기',
                                  link_url: appUrl,
                                }),
                              })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok && data.success !== false) {
                                setKakaoTestSentTo(name)
                                toast.success('메시지 전송 완료')
                              } else {
                                toast.error(data.detail || '전송 실패')
                              }
                            } catch {
                              toast.error('전송 실패')
                            } finally {
                              setKakaoTestSendingUuid(null)
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 999,
                            border: 'none',
                            background: kakaoTestSendingUuid === uid ? '#9CA3AF' : '#E8740C',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: kakaoTestSendingUuid ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {kakaoTestSendingUuid === uid ? '전송 중...' : '바로 보내기'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>③에서 친구 목록을 먼저 불러온 뒤, 한 명에게 메시지를 보내세요.</div>
              )}
            </div>
          </div>

          {(isKakaoLoggedIn && step2Done && step4Done) && (
            <div style={{ marginTop: 24, padding: 16, background: isDarkMode ? 'rgba(34,197,94,0.15)' : '#DCFCE7', borderRadius: 12, border: '1px solid #16a34a', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', marginBottom: 4 }}>캡처 준비 완료</div>
              <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#166534' }}>이 화면 전체를 한 장 스크린샷으로 찍어 카카오 개발자 콘솔 심사에 제출하세요.</div>
            </div>
          )}
        </div>
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
            {/* 앱 설치 */}
            {!isAppInstalled && (
              <div style={{
                background: 'linear-gradient(135deg, #E8740C 0%, #F59E0B 100%)',
                borderRadius: 16, padding: 20, color: '#fff',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📲</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>WhereHere 앱 설치</div>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {isIOSDevice ? 'Safari 공유 버튼으로 홈 화면에 추가하세요' : '홈 화면에 추가해 더 빠르게 실행하세요'}
                    </div>
                  </div>
                </div>
                {isIOSDevice ? (
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>iOS 설치 방법</div>
                    <div>① Safari 하단 <b>공유(□↑)</b> 버튼 탭</div>
                    <div>② <b>홈 화면에 추가</b> 선택</div>
                    <div>③ 오른쪽 상단 <b>추가</b> 탭</div>
                  </div>
                ) : installPrompt ? (
                  <button
                    onClick={async () => {
                      if (!installPrompt) return
                      installPrompt.prompt()
                      const { outcome } = await installPrompt.userChoice
                      if (outcome === 'accepted') {
                        setIsAppInstalled(true)
                        setInstallPrompt(null)
                        toast.success('앱이 홈 화면에 추가됐어요!')
                      }
                    }}
                    style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: '#fff', color: '#E8740C', fontWeight: 800, fontSize: 15, cursor: 'pointer', letterSpacing: -0.3 }}
                  >
                    📲 지금 설치하기
                  </button>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, opacity: 0.9 }}>
                    브라우저 주소창 오른쪽 설치(⊕) 아이콘을 탭하거나,<br />메뉴 → <b>홈 화면에 추가</b>를 선택하세요.
                  </div>
                )}
              </div>
            )}
            {isAppInstalled && (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28 }}>✅</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>앱 설치 완료</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>WhereHere가 홈 화면에 설치돼 있어요</div>
                </div>
              </div>
            )}

            {/* 테마: 라이트 / 다크 / 시스템 따라가기 */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>테마</div>
              <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 12 }}>시스템 설정 따라가기 권장</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button key={mode} onClick={() => setThemeMode(mode)} style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: `2px solid ${themeMode === mode ? '#E8740C' : borderColor}`,
                    background: themeMode === mode ? (isDarkMode ? 'rgba(232,116,12,0.2)' : 'rgba(232,116,12,0.1)') : 'transparent',
                    color: themeMode === mode ? '#E8740C' : textColor,
                    fontWeight: themeMode === mode ? 700 : 500,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}>
                    {mode === 'light' && '☀️ 라이트'}
                    {mode === 'dark' && '🌙 다크'}
                    {mode === 'system' && '🖥️ 시스템 따라가기'}
                  </button>
                ))}
              </div>
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
                          toast.success('위치가 업데이트됐어요!')
                        },
                        (error) => toast.error('위치 가져오기 실패: ' + error.message)
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

            {/* 카카오 연동 & 추가 동의 */}
            {isLoggedIn && (
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>카카오톡 연동</div>
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>친구에게 직접 공유하려면 추가 동의 필요</div>
                  </div>
                </div>
                <div style={{ background: isDarkMode ? 'rgba(254,229,0,0.08)' : '#FFFDE7', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>필요한 추가 동의 항목</div>
                  <div>• <b>카카오톡 친구 목록</b> — 앱 친구에게 장소 공유</div>
                  <div>• <b>카카오톡 메시지 발송</b> — 친구에게 퀘스트 초대</div>
                  <div style={{ marginTop: 6, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>아래 버튼으로 동의창만 띄워 권한을 받습니다. 메인 로그인은 건드리지 않습니다.</div>
                </div>
                <a
                  href={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/kakao-consent`}
                  onClick={(e) => {
                    e.preventDefault()
                    window.location.href = `${window.location.origin}/api/auth/kakao-consent`
                  }}
                  style={{ display: 'block', width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: '#FEE500', color: '#3C1E1E', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
                >
                  💬 카카오톡 친구 목록 권한 허용 (동의창 띄우기)
                </a>
              </div>
            )}

            {/* 카카오 API 테스트 (심사 제출용) — 한 장 캡처용 */}
            <div
              onClick={() => setScreen('kakao-api-test')}
              style={{
                background: isDarkMode ? 'rgba(254,229,0,0.12)' : '#FFFDE7',
                border: `2px solid #FEE500`,
                borderRadius: 16,
                padding: 20,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 24 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>카카오 API 테스트 (심사 제출용)</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>4단계 완료 후 한 장 캡처해서 제출</div>
                </div>
                <div style={{ fontSize: 16, color: '#E8740C' }}>→</div>
              </div>
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
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }} onClick={(e) => e.stopPropagation()}>
                  {isLoggedIn ? (
                    <>
                      {/* 현재 프로필 미리보기 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, background: isDarkMode ? 'rgba(232,116,12,0.1)' : '#FEF3C7', borderRadius: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', flexShrink: 0 }}>
                          {userProfile?.profile_image_url ? (
                            <img src={userProfile.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>{(displayName || '?').slice(0, 1)}</div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{displayName}</div>
                          <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>
                            ID: {userId.slice(0, 8)}… · {formatAccountDate(user?.created_at)}
                          </div>
                        </div>
                      </div>
                      {/* 소셜 프로필 수정 */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                          소셜 프로필 (표시 이름 · 프로필 이미지 URL)
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <input
                            placeholder="표시 이름"
                            value={nicknameInput}
                            onChange={(e) => setNicknameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                saveNickname()
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              border: `1px solid ${borderColor}`,
                              background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
                              color: textColor,
                              fontSize: 13,
                            }}
                          />
                          <button
                            type="button"
                            onClick={saveNickname}
                            disabled={savingNickname || !nicknameInput.trim()}
                            style={{
                              padding: '0 14px',
                              borderRadius: 8,
                              border: 'none',
                              background: savingNickname || !nicknameInput.trim() ? (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB') : '#E8740C',
                              color: savingNickname || !nicknameInput.trim() ? (isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF') : '#fff',
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: savingNickname || !nicknameInput.trim() ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {savingNickname ? '저장중' : '확인'}
                          </button>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, fontSize: 13, cursor: 'pointer' }}>
                            📷 사진 선택 (앨범/파일)
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              style={{ display: 'none' }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return

                                // 즉시 로컬 미리보기 (빠른 UX)
                                const reader = new FileReader()
                                reader.onload = (evt) => {
                                  const tempUrl = evt.target?.result as string
                                  setUserProfile(prev => ({
                                    ...prev,
                                    display_name: prev?.display_name || displayName || undefined,
                                    profile_image_url: tempUrl
                                  }))
                                }
                                reader.readAsDataURL(file)

                                try {
                                  const compressed = await compressImageFile(file)
                                  const form = new FormData()
                                  form.append('file', compressed)
                                  const base = typeof window !== 'undefined' ? window.location.origin : ''
                                  const res = await fetch(`${base}/api/upload`, { method: 'POST', body: form })
                                  const data = await res.json().catch(() => ({}))
                                  if (res.ok && data.url) {
                                    // 백엔드에 프로필 업데이트
                                    const updateRes = await fetch(`${API_BASE}/api/v1/social/profile`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ user_id: userId, avatar_url: data.url }),
                                    })

                                    if (updateRes.ok) {
                                      const absoluteUrl = data.url.startsWith('http') ? data.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${data.url.startsWith('/') ? '' : '/'}${data.url}`
                                      setUserProfile(prev => ({
                                        ...prev,
                                        display_name: prev?.display_name || displayName || undefined,
                                        profile_image_url: absoluteUrl
                                      }))
                                      // refetchUserProfile()은 DB write와 race condition이 생길 수 있어 제거
                                      // 대신 1.5초 후 refetch로 DB 반영 확인
                                      setTimeout(() => refetchUserProfile(), 1500)
                                      alert('프로필 사진이 저장되었어요!')
                                    } else {
                                      alert('프로필 업데이트에 실패했어요.')
                                    }
                                  } else {
                                    alert(data.error || '업로드 실패')
                                    // 실패 시 원래 프로필로 되돌림
                                    const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                                    const profileData = await profileRes.json()
                                    if (profileData.profile) {
                                      setUserProfile(profileData.profile)
                                    }
                                  }
                                } catch (err) {
                                  console.error('Upload error:', err)
                                  alert('업로드 중 오류가 났어요.')
                                  // 실패 시 원래 프로필로 되돌림
                                  const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                                  const profileData = await profileRes.json()
                                  if (profileData.profile) {
                                    setUserProfile(profileData.profile)
                                  }
                                }
                                e.target.value = ''
                              }}
                            />
                          </label>
                        </div>
                        <input
                          placeholder="또는 프로필 이미지 URL 입력 (선택)"
                          onBlur={async (e) => {
                            const url = e.target.value.trim()
                            try {
                              const res = await fetch(`${API_BASE}/api/v1/social/profile`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: userId, avatar_url: url || undefined }),
                              })
                              if (!res.ok) throw new Error('API error')
                              // 프로필 정보 다시 불러오기
                              const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                              const profileData = await profileRes.json()
                              if (profileData.profile) {
                                setUserProfile(profileData.profile)
                              }
                            } catch (_) {
                              alert('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.')
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: 10,
                            marginBottom: 4,
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
                            color: textColor,
                            fontSize: 13,
                          }}
                        />
                        <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                          위 정보는 친구 검색·소셜 피드에서 보여집니다.
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>데모 모드 (비로그인)</div>
                      <div style={{ fontSize: 12, marginBottom: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                        로그인하면 내 데이터로 이용할 수 있어요.
                      </div>
                    </>
                  )}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {!isLoggedIn ? (
                      <button onClick={(e) => {
                        e.stopPropagation()
                        router.push('/login')
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
                        로그인 / 회원가입
                      </button>
                    ) : (
                      <button onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('정말 로그아웃하시겠습니까?')) signOut()
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
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 크리에이터: 장소 제안하기 */}
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
              <div onClick={() => setShowCreatorSettings(!showCreatorSettings)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
                <div style={{ fontSize: 24 }}>✨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>장소 제안하기</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>새 장소를 등록해보세요 (검수 후 반영)</div>
                </div>
                <div style={{ fontSize: 16, color: '#E8740C' }}>{showCreatorSettings ? '▼' : '→'}</div>
              </div>
              {showCreatorSettings && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }} onClick={(e) => e.stopPropagation()}>
                  <input placeholder="장소 이름 *" value={placeSuggestionForm.name} onChange={(e) => setPlaceSuggestionForm((f) => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor }} />
                  <input placeholder="주소" value={placeSuggestionForm.address} onChange={(e) => setPlaceSuggestionForm((f) => ({ ...f, address: e.target.value }))} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor }} />
                  <select value={placeSuggestionForm.category} onChange={(e) => setPlaceSuggestionForm((f) => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor }}>
                    <option value="기타">기타</option>
                    <option value="카페">카페</option>
                    <option value="음식점">음식점</option>
                    <option value="술집/바">술집/바</option>
                    <option value="공원">공원</option>
                    <option value="문화시설">문화시설</option>
                  </select>
                  <textarea placeholder="설명 (선택)" value={placeSuggestionForm.description} onChange={(e) => setPlaceSuggestionForm((f) => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, resize: 'vertical' }} />
                  {placeSuggestionMessage && <p style={{ fontSize: 12, marginBottom: 8, color: '#E8740C' }}>{placeSuggestionMessage}</p>}
                  <button onClick={submitPlaceSuggestion} disabled={placeSuggestionSubmitting} style={{ width: '100%', padding: 12, background: '#E8740C', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: placeSuggestionSubmitting ? 'not-allowed' : 'pointer', opacity: placeSuggestionSubmitting ? 0.7 : 1 }}>{placeSuggestionSubmitting ? '제출 중…' : '제안 제출'}</button>
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

            {/* 회사 / 서비스 정보 (카카오 비즈니스 심사용: 사이트 내 사업자 정보 및 앱 정보 노출) */}
            <div style={{ marginTop: 24, paddingTop: 24, borderTop: `2px solid ${borderColor}` }}>
              <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>COMPANY / SERVICE</div>
              <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <img src="/app-icon.png" alt="WhereHere 앱 아이콘" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: `1px solid ${borderColor}` }} />
                  <div>
                    <div style={{ fontSize: 10, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginBottom: 4 }}>앱 이름</div>
                    <div style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WhereHere</div>
                  </div>
                </div>
                <div style={{ paddingTop: 12, borderTop: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: 10, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginBottom: 4 }}>사업자 정보</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: textColor }}>사업자등록번호 463-24-01865</div>
                  <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280', marginTop: 4 }}>비즈 앱 및 사업자등록증과 동일한 정보입니다.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return null
}
