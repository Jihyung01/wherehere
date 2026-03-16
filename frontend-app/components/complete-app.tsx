'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { useQuery } from '@tanstack/react-query'
import { getRecommendations, getFriendPicks } from '@/lib/api-client'
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
import { SettingsScreen } from './screens/SettingsScreen'
import { SocialScreen } from './screens/SocialScreen'
import { MyMapScreen } from './screens/MyMapScreen'

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

// 레벨 1~10 보상 체계 (백엔드 XP 곡선과 동기화: 0, 150, 400, 750, 1200, 1750, 2400, 3150, 4000, 5000)
const LEVEL_BENEFITS: Record<number, { icon: string; title: string; desc: string; type: 'unlock' | 'bonus' | 'social' }[]> = {
  1:  [{ icon: '🗺️', title: '퀘스트 탐험', desc: '기본 역할 퀘스트 수락 가능', type: 'unlock' }],
  2:  [{ icon: '💬', title: '동네 피드 작성', desc: '리뷰·이야기 게시글 작성 개방', type: 'unlock' }],
  3:  [{ icon: '🎯', title: '챌린지 도전', desc: '일일·주간 챌린지 참가 가능', type: 'unlock' }, { icon: '⚡', title: 'XP 보너스 +10%', desc: '퀘스트 보상 10% 추가', type: 'bonus' }],
  4:  [{ icon: '📊', title: '행동 패턴 분석', desc: 'AI 성격·행동 패턴 프로필 열람', type: 'unlock' }],
  5:  [{ icon: '📸', title: '포토 미션 강화', desc: '사진 미션 완료 시 추가 XP +15', type: 'bonus' }, { icon: '🎁', title: 'Lv.5 달성 뱃지', desc: '프로필에 "활발한 탐험가" 표시', type: 'social' }],
  6:  [{ icon: '🔮', title: '히든 퀘스트 해금', desc: '숨겨진 특별 장소 퀘스트 등장', type: 'unlock' }],
  7:  [{ icon: '🤝', title: '친구 비교 강화', desc: '친구와 방문지·레벨 상세 비교', type: 'social' }],
  8:  [{ icon: '🔥', title: '스트릭 보너스', desc: '5일 연속 방문 시 XP 2배', type: 'bonus' }],
  9:  [{ icon: '✨', title: '프리미엄 AI 서사', desc: '더 깊은 장소 스토리 생성', type: 'unlock' }],
  10: [{ icon: '🗺️', title: '동네 정복 통계', desc: '구역별 정복률·고급 분석 개방', type: 'unlock' }, { icon: '👑', title: '탐험가 칭호', desc: '프로필 "베테랑 탐험가" 배지', type: 'social' }],
}

// 현재 레벨에서 달성된 혜택 + 다음 레벨 혜택 가져오기
function getLevelBenefits(currentLevel: number) {
  const current: typeof LEVEL_BENEFITS[number] = []
  const upcoming: Array<{ level: number; benefits: typeof LEVEL_BENEFITS[number] }> = []
  const levels = Object.keys(LEVEL_BENEFITS).map(Number).sort((a, b) => a - b)
  for (const lv of levels) {
    if (lv <= currentLevel) {
      current.push(...LEVEL_BENEFITS[lv])
    } else if (upcoming.length < 2) {
      upcoming.push({ level: lv, benefits: LEVEL_BENEFITS[lv] })
    }
  }
  return { current, upcoming }
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
  const [sharedPostId, setSharedPostId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<any>(null)
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [reviewData, setReviewData] = useState({ rating: 0, review: '', photos: [] as string[] })
  const [isDarkMode, setIsDarkMode] = useState(false)
  type ThemeMode = 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [accentColor, setAccentColor] = useState('#E8740C')
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
  /** 카카오 친구에게 장소 추천 시: 소셜 탭으로 이동 후 친구 목록 모달에 전달 */
  const [placeToRecommendForKakao, setPlaceToRecommendForKakao] = useState<{ place_name: string; description?: string; image_url?: string; link_url: string } | null>(null)
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
  // 레벨업 축하 모달
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; benefits: typeof LEVEL_BENEFITS[number] } | null>(null)
  const prevLevelRef = React.useRef<number | null>(null)
  // 클라이언트 마운트 후에만 본문 렌더 (하이드레이션/초기화 오류 방지)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  // 챌린지 보상 수령 상태 (로컬 + 서버 동기)
  const [challengeClaims, setChallengeClaims] = useState<Record<string, { claimed: boolean; completed_at?: string }>>({})
  const [claimingChallenge, setClaimingChallenge] = useState<string | null>(null)
  // 친구 비교 데이터
  const [friendCompareData, setFriendCompareData] = useState<Array<{ user_id: string; display_name?: string; avatar_url?: string; total_places?: number; current_streak?: number; level?: number }>>([])
  const [friendCompareLoading, setFriendCompareLoading] = useState(false)
  const [showFriendCompare, setShowFriendCompare] = useState(false)
  // 프로필 상단 탭 (프로필 | 지도 | 챌린지)
  const [profileTab, setProfileTab] = useState<'profile' | 'map' | 'challenges'>('profile')
  // 체크인 장소 동행자 감지
  const [checkinPresence, setCheckinPresence] = useState<Array<{ user_id: string; display_name: string; avatar_url?: string; checked_in_at: string }>>([])
  const [checkinPresenceLoading, setCheckinPresenceLoading] = useState(false)

  // accentColor rgba 헬퍼
  const accentRgba = (alpha: number): string => {
    try {
      const r = parseInt(accentColor.slice(1, 3), 16)
      const g = parseInt(accentColor.slice(3, 5), 16)
      const b = parseInt(accentColor.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${alpha})`
    } catch { return `rgba(232,116,12,${alpha})` }
  }

  // displayName: 백엔드(사용자가 설정한 이름) 우선 → 카카오/메타데이터 fallback (이름 변경이 403이어도 백엔드만 반영하면 됨)
  const displayName = userProfile?.display_name ?? user?.user_metadata?.display_name ?? user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.user_metadata?.user_name ?? user?.user_metadata?.kakao_account?.profile?.nickname ?? user?.email ?? (user ? '로그인한 사용자' : null)

  useEffect(() => {
    setNicknameInput(displayName || '')
  }, [displayName])

  // 로그인 유도: 비로그인 시 데모 수락 전에는 로그인 화면 강조
  // sessionStorage는 useEffect에서만 읽어야 hydration 에러(#418) 방지됨
  useEffect(() => {
    try { setDemoAccepted(sessionStorage.getItem('wherehere_demo_accepted') === '1') } catch (_) {}
  }, [])
  const showLoginGate = !isLoggedIn && !demoAccepted

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
    const screenParam = params.get('screen')
    const postIdParam = params.get('post_id')
    if (screenParam === 'social') setScreen('social')
    if (postIdParam) setSharedPostId(postIdParam)
    if (screenParam || postIdParam) {
      const u = new URL(window.location.href)
      u.searchParams.delete('screen')
      u.searchParams.delete('post_id')
      window.history.replaceState({}, '', u.pathname + (u.search || ''))
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const token = params.get('kakao_friends_token')
    const returnTo = params.get('return')
    const err = params.get('error')
    const kakaoDesc = params.get('kakao_desc') || ''
    const kakaoReason = params.get('reason') || ''

    const needsUrlClean = token || returnTo || err
    if (needsUrlClean) {
      const u = new URL(window.location.href)
      u.searchParams.delete('kakao_friends_token')
      u.searchParams.delete('return')
      u.searchParams.delete('error')
      u.searchParams.delete('kakao_error')
      u.searchParams.delete('kakao_desc')
      u.searchParams.delete('reason')
      u.searchParams.delete('screen')
      u.searchParams.delete('post_id')
      window.history.replaceState({}, '', u.pathname + (u.search || ''))
    }

    if (token) {
      if (typeof window !== 'undefined' && window.opener) {
        try { window.opener.postMessage({ type: 'kakao_friends_token', token }, window.location.origin) } catch (_) {}
        window.close()
        return
      }
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
          ? `카카오 동의 거부/오류${kakaoReason ? ` (${kakaoReason})` : ''}. 카카오 개발자 콘솔 → 동의항목에서 "카카오톡 친구 목록"과 "카카오톡 메시지 전송"을 선택 동의로 활성화하세요.`
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
    const savedAccent = localStorage.getItem('wherehere_accentColor')
    if (savedAccent) setAccentColor(savedAccent)
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
    try { localStorage.setItem('wherehere_accentColor', accentColor) } catch (_) {}
  }, [themeMode, isDarkMode, accentColor])

  // userStats는 레벨업 감지·프로필·챌린지에서 사용하므로 useQuery를 먼저 선언
  const { data: userStats, refetch: refetchUserStats } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/users/me/stats?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: (screen === 'profile' || screen === 'home') && !!userId,
  })

  // 레벨업 감지: userStats.level 변화 시 축하 모달 표시
  const userStatsLevel = (userStats as any)?.level ?? null
  useEffect(() => {
    if (userStatsLevel == null) return
    if (prevLevelRef.current !== null && userStatsLevel > prevLevelRef.current) {
      const newLevel = userStatsLevel as number
      const benefits = LEVEL_BENEFITS[newLevel] || []
      setLevelUpData({ newLevel, benefits })
      setShowLevelUpModal(true)
    }
    prevLevelRef.current = userStatsLevel
  }, [userStatsLevel])

  // 챌린지 보상 수령 현황 서버에서 로드 (로그인 시)
  useEffect(() => {
    if (!userId || userId === 'user-demo-001') return
    // localStorage 기존 데이터 로드
    try {
      const saved = localStorage.getItem(`wherehere_challenge_claims_${userId}`)
      if (saved) setChallengeClaims(JSON.parse(saved))
    } catch (_) {}
    // 서버 동기화
    fetch(`${API_BASE}/api/v1/challenges/user/${userId}/all-progress`)
      .then((r) => r.json())
      .then((data) => {
        if (data.claims) {
          setChallengeClaims((prev) => ({ ...prev, ...data.claims }))
        }
      })
      .catch(() => {})
  }, [userId])

  // 친구 비교 데이터 로드 (API는 following_ids만 반환 → ID로 프로필·통계 병렬 조회)
  const loadFriendCompare = async () => {
    if (!userId || userId === 'user-demo-001') return
    setFriendCompareLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/following?user_id=${encodeURIComponent(userId)}`)
      const data = await res.json().catch(() => ({ following_ids: [] }))
      const followingIds: string[] = Array.isArray(data.following_ids) ? data.following_ids : []
      if (followingIds.length === 0) {
        setFriendCompareData([])
        return
      }
      const idsToLoad = followingIds.slice(0, 10)
      const results = await Promise.all(
        idsToLoad.map(async (uid) => {
          try {
            const [profileRes, statsRes] = await Promise.all([
              fetch(`${API_BASE}/api/v1/social/profile/${encodeURIComponent(uid)}`),
              fetch(`${API_BASE}/api/v1/users/me/stats?user_id=${encodeURIComponent(uid)}`),
            ])
            const profileData = await profileRes.json().catch(() => ({}))
            const sd = await statsRes.json().catch(() => ({}))
            const profile = profileData.profile || profileData
            return {
              user_id: uid,
              display_name: profile.display_name || profile.username || uid.slice(0, 8) || '친구',
              avatar_url: profile.profile_image_url ?? profile.avatar_url,
              total_places: sd.total_places_visited ?? 0,
              current_streak: sd.current_streak ?? 0,
              level: sd.level ?? 1,
            }
          } catch {
            return null
          }
        })
      )
      setFriendCompareData(results.filter(Boolean) as any[])
    } catch (_) {
    } finally {
      setFriendCompareLoading(false)
    }
  }

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

  // 로그인 시 카카오/ auth 메타데이터를 백엔드 users 테이블에 동기화 → 피드에 실제 이름·프로필 사진 반영
  useEffect(() => {
    if (!user || !userId || userId === 'user-demo-001') return
    const meta = user.user_metadata || {}
    const kakao = meta.kakao_account?.profile
    const nameFromMeta = meta.display_name ?? meta.name ?? meta.full_name ?? meta.user_name ?? kakao?.nickname ?? meta.nickname ?? null
    const avatar = meta.avatar_url ?? meta.profile_image_url ?? meta.picture ?? kakao?.profile_image_url ?? kakao?.thumbnail_image_url ?? null
    const emailPrefix = (user?.email ?? '').split('@')[0]
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
        const data = await res.json()
        const profile = data?.profile
        const currentName = profile?.display_name ?? ''
        const currentAvatar = (profile?.profile_image_url ?? profile?.avatar_url ?? '').trim()
        // 이름: DB 비었거나 Explorer일 때만 메타데이터로 채움
        const defaultName = 'Explorer'
        const needNameSync = !profile || !currentName || currentName === defaultName || (nameFromMeta && nameFromMeta !== currentName)
        // 프로필 사진: 백엔드에 이미 사용자가 설정한 값이 있으면 카카오로 덮어쓰지 않음
        const needAvatarSync = avatar && !currentAvatar
        if (!needNameSync && !needAvatarSync) return
        const nextName = nameFromMeta || (currentName !== defaultName ? currentName : null) || emailPrefix || userId.slice(0, 8)
        const nextAvatar = needAvatarSync ? avatar : currentAvatar || undefined
        await fetch(`${API_BASE}/api/v1/social/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            display_name: nextName,
            ...(nextAvatar && { avatar_url: nextAvatar }),
          }),
        })
        refetchUserProfile()
      } catch (_) {}
    })()
  }, [user?.id, userId, refetchUserProfile])

  useEffect(() => {
    if (!userId || userId === 'user-demo-001') return
    const onFocus = () => refetchUserProfile()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [userId, refetchUserProfile])

  useEffect(() => {
    if ((screen === 'profile' || screen === 'social') && userId && userId !== 'user-demo-001') refetchUserProfile()
    // 챌린지 화면 직접 접근 → 프로필 챌린지 탭으로 리다이렉트
    if (screen === 'challenges') {
      setScreen('profile')
      setProfileTab('challenges')
    }
    // 체크인 화면 진입 시 동행자 초기화
    if (screen === 'checkin') {
      setCheckinPresence([])
      setCheckinPresenceLoading(false)
    }
  }, [screen, userId, refetchUserProfile])

  // 체크인 화면 진입 시 동행자 조회 (별도 effect)
  useEffect(() => {
    if (screen !== 'checkin') return
    const placeId = acceptedQuest?.place_id
    if (!placeId) return
    setCheckinPresenceLoading(true)
    fetch(`${API_BASE}/api/v1/visits/presence/${encodeURIComponent(placeId)}?requester_id=${userId}&hours=3`)
      .then(r => r.json())
      .then(d => setCheckinPresence(d.users || []))
      .catch(() => {})
      .finally(() => setCheckinPresenceLoading(false))
  }, [screen, acceptedQuest?.place_id])

  // 피드/소셜 화면 진입 시: 이름만 필요 시 백엔드에 반영. 프로필 사진은 사용자가 설정한 값이 있으면 카카오로 덮어쓰지 않음
  useEffect(() => {
    if (screen !== 'social' || !userId || userId === 'user-demo-001') return
    const meta = user?.user_metadata || {}
    const kakao = meta.kakao_account?.profile
    const nameFromMeta = meta.display_name ?? meta.name ?? meta.full_name ?? meta.user_name ?? kakao?.nickname ?? meta.nickname ?? null
    const backendName = userProfile?.display_name
    const backendAvatar = (userProfile?.profile_image_url ?? '').trim()
    const nameToSync = nameFromMeta || (backendName && backendName !== 'Explorer' ? backendName : null) || (user?.email ?? '').split('@')[0] || null
    if (!nameToSync) return
    ;(async () => {
      try {
        const avatarFromMeta = meta.avatar_url ?? meta.profile_image_url ?? meta.picture ?? kakao?.profile_image_url ?? kakao?.thumbnail_image_url ?? null
        // 사용자가 이미 프로필 사진을 설정했으면(백엔드에 값 있음) 카카오 URL로 덮어쓰지 않음
        const avatarToSync = backendAvatar ? undefined : (avatarFromMeta || undefined)
        await fetch(`${API_BASE}/api/v1/social/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            display_name: nameToSync,
            ...(avatarToSync && { avatar_url: avatarToSync }),
          }),
        })
        refetchUserProfile()
      } catch (_) {}
    })()
  }, [screen, userId, user?.user_metadata, user?.email, userProfile?.display_name, userProfile?.profile_image_url])

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
        strokeColor: accentColor,
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
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodTextForHome, userId),
    enabled: screen === 'home',
    retry: 1,
    staleTime: 1000 * 60 * 10, // 10분간 고정 (탭 전환·스크롤에도 유지)
  })

  const { data: friendPicksData } = useQuery({
    queryKey: ['friendPicks', userId, userLocation.lat, userLocation.lng],
    queryFn: () => getFriendPicks(userId, userLocation.lat, userLocation.lng, 5),
    enabled: screen === 'home' && !!userId && userId !== 'user-demo-001',
    retry: 1,
    staleTime: 1000 * 60 * 5,
  })
  const friendPicks = friendPicksData?.friend_picks ?? []

  const { data: questsData, isLoading: questsLoading } = useQuery({
    queryKey: ['recommendations', userLocation.lat, userLocation.lng, selectedRole, selectedMood],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, selectedRole!, moodTextForApi || '', userId),
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
        strokeColor: accentColor,
        strokeOpacity: 0.9,
        strokeStyle: 'solid',
      })
      polyline.setMap(map)
    } catch (e) {
      console.warn('Home map init failed:', e)
    }
  }, [screen, homeData, userLocation.lat, userLocation.lng, kakaoMapLoaded])

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

  const claimChallengeReward = async (challengeId: string, xpToAward: number) => {
    if (claimingChallenge === challengeId) return
    const alreadyClaimed = challengeClaims[challengeId]?.claimed
    if (alreadyClaimed) {
      toast('이미 수령한 보상이에요.')
      return
    }
    setClaimingChallenge(challengeId)
    try {
      const res = await fetch(`${API_BASE}/api/v1/challenges/claim-reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, challenge_id: challengeId, xp_to_award: xpToAward }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.already_claimed) {
        toast('이미 수령한 보상이에요.')
      } else if (data.success) {
        const newClaims = { ...challengeClaims, [challengeId]: { claimed: true, completed_at: data.completed_at } }
        setChallengeClaims(newClaims)
        try { localStorage.setItem(`wherehere_challenge_claims_${userId}`, JSON.stringify(newClaims)) } catch (_) {}
        toast.success(`🎉 보상 수령 완료! +${xpToAward} XP`)
      } else {
        toast.error('보상 수령에 실패했어요.')
      }
    } catch (_) {
      toast.error('네트워크 오류가 났어요.')
    } finally {
      setClaimingChallenge(null)
    }
  }

  const saveNickname = async () => {
    const name = nicknameInput.trim()
    if (!name || savingNickname || !isLoggedIn) return
    setSavingNickname(true)
    setUserProfile(prev => ({ ...prev, display_name: name, profile_image_url: prev?.profile_image_url }))
    try {
      // 백엔드에 먼저 저장 (카카오 로그인 시 auth.updateUser는 403 나올 수 있음 — 무시하고 백엔드만 사용)
      const res = await fetch(`${API_BASE}/api/v1/social/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, display_name: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.message || '저장 실패')
      refetchUserProfile()
      toast.success('이름이 변경되었어요.')
      // Auth는 가능하면 갱신 (403이어도 무시)
      createClient().auth.updateUser({ data: { display_name: name, name } }).catch(() => {})
    } catch (_) {
      toast.error('이름 변경에 실패했어요. 다시 시도해주세요.')
      setUserProfile(prev => ({ ...prev, display_name: displayName || undefined }))
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

  // 강조색을 배경 톤에 미묘하게 반영
  const _accentRGB = (() => {
    try {
      return {
        r: parseInt(accentColor.slice(1, 3), 16),
        g: parseInt(accentColor.slice(3, 5), 16),
        b: parseInt(accentColor.slice(5, 7), 16),
      }
    } catch { return { r: 232, g: 116, b: 12 } }
  })()
  const _mix = (base: number, accent: number, t: number) => Math.round(base * (1 - t) + accent * t)
  const { r: _ar, g: _ag, b: _ab } = _accentRGB
  const bgColor = isDarkMode
    ? `rgb(${_mix(10, _ar, 0.08)},${_mix(14, _ag, 0.08)},${_mix(20, _ab, 0.08)})`
    : `rgb(${_mix(255, _ar, 0.04)},${_mix(255, _ag, 0.04)},${_mix(255, _ab, 0.04)})`
  const textColor = isDarkMode ? '#FFFFFF' : '#1F2937'
  const cardBg = isDarkMode
    ? `rgba(${_ar},${_ag},${_ab},0.08)`
    : `rgb(${_mix(249, _ar, 0.06)},${_mix(250, _ag, 0.06)},${_mix(251, _ab, 0.06)})`
  const borderColor = isDarkMode
    ? `rgba(${_ar},${_ag},${_ab},0.18)`
    : `rgba(${_ar},${_ag},${_ab},0.15)`

  // 하단 네비게이션 (4탭: 홈 | 소셜 | 프로필 | 설정)
  const BottomNav = () => {
    const tabs = [
      { icon: '🏠', label: '홈', active: screen === 'home' || screen === 'role' || screen === 'mood' || screen === 'quests' || screen === 'accepted' || screen === 'checkin' || screen === 'review', onClick: () => { setScreen('home'); setAcceptedQuest(null); } },
      { icon: '💬', label: '소셜', active: screen === 'social', onClick: () => setScreen('social') },
      { icon: '👤', label: '프로필', active: screen === 'profile', onClick: () => { setScreen('profile'); setProfileTab('profile'); } },
      { icon: '⚙️', label: '설정', active: screen === 'settings', onClick: () => setScreen('settings') },
    ]
    return (
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: isDarkMode ? 'rgba(10,14,20,0.96)' : 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        borderTop: `1px solid ${borderColor}`,
        display: 'flex', padding: '8px 0 max(24px, env(safe-area-inset-bottom))', zIndex: 100,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
      }}>
        {tabs.map((n, i) => (
          <div key={i} onClick={n.onClick} style={{
            flex: 1, textAlign: 'center', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>{n.icon}</div>
            <div style={{ fontSize: 10, marginTop: 3, fontWeight: 700, color: n.active ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF') }}>{n.label}</div>
            {n.active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor, margin: '3px auto 0' }} />}
          </div>
        ))}
      </div>
    )
  }

  // 마운트 전: 서버·클라이언트 동일한 플레이스홀더로 하이드레이션/초기화 오류 방지
  if (!mounted) {
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: '#FFFFFF', color: '#1F2937', fontFamily: 'Pretendard, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 18, color: '#6B7280' }}>로딩 중...</div>
      </div>
    )
  }

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
          {isLoggedIn ? (
            <button
              onClick={() => setScreen('profile')}
              style={{
                padding: '6px 12px',
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : accentRgba(0.1),
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                color: textColor,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>👤</span>
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || '프로필'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '8px 14px',
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : accentRgba(0.15),
                border: '1px solid #E8740C',
                borderRadius: 10,
                color: accentColor,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              로그인
            </button>
          )}
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
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, background: n.read ? 'transparent' : (isDarkMode ? accentRgba(0.08) : accentRgba(0.06)) }}>
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
          {isLoggedIn && (() => {
            const lvl = userStats?.level ?? 1
            const totalXP = userStats?.total_xp ?? 0
            const xpToNextLevel = userStats?.xp_to_next_level ?? 170
            const currentLevelMinXP = (userStats as any)?.current_level_min_xp ?? 0
            const nextLevelAt = totalXP + xpToNextLevel
            const segmentSize = nextLevelAt - currentLevelMinXP
            const progress = segmentSize > 0 ? Math.min(100, ((totalXP - currentLevelMinXP) / segmentSize) * 100) : 100
            const xpLeft = Math.max(0, xpToNextLevel)
            const { upcoming } = getLevelBenefits(lvl)
            const nextBenefit = upcoming[0]?.benefits[0]
            const nextBenefitLevel = upcoming[0]?.level
            return (
              <div style={{ marginBottom: 20, padding: '14px 16px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : accentRgba(0.08), borderRadius: 16, border: `1px solid ${isDarkMode ? accentRgba(0.2) : accentRgba(0.25)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>{lvl}</div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>Lv.{lvl} 탐험가</span>
                  </div>
                  <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#78350F' }}>{xpLeft > 0 ? `다음 레벨까지 ${xpLeft.toLocaleString()} XP` : 'Lv.10 달성!'}</span>
                </div>
                <div style={{ height: 10, borderRadius: 5, background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)', overflow: 'hidden', marginBottom: nextBenefit ? 8 : 0 }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${accentColor}, #F59E0B)`, borderRadius: 5, transition: 'width 0.4s ease' }} />
                </div>
                {nextBenefit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#78350F' }}>
                    <span>🔜 Lv.{nextBenefitLevel}:</span>
                    <span style={{ fontWeight: 600 }}>{nextBenefit.icon} {nextBenefit.title}</span>
                  </div>
                )}
              </div>
            )
          })()}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WhereHere</h1>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 8 }}>오늘의 한 곳에서 동네 커뮤니티까지 한 번에.</p>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>홈 · 기분 맞춤 탐험 · 동네 피드</div>
          </div>
          <button type="button" onClick={() => { setScreen('profile'); setProfileTab('map'); }} style={{ width: '100%', marginBottom: 20, padding: 16, borderRadius: 16, border: `1px solid ${borderColor}`, background: isDarkMode ? 'linear-gradient(135deg, rgba(232,116,12,0.12), rgba(232,116,12,0.04))' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', color: textColor, textAlign: 'left', cursor: 'pointer', boxShadow: isDarkMode ? 'none' : '0 2px 12px rgba(232,116,12,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}><span style={{ fontSize: 24 }}>🗺️</span><span style={{ fontSize: 16, fontWeight: 800, color: accentColor }}>동네 정복 지도</span></div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>방문한 구역을 헥사곤으로 채워가며 탐험 완성도를 확인하세요</div>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151' }}>오늘의 한 곳</div>
            <button onClick={() => setHomeRefreshKey((k) => k + 1)} disabled={homeLoading} style={{ background: 'none', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', cursor: homeLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', animation: homeLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span> 새로고침<style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style></button>
          </div>
          {homeLoading ? (
            <div style={{ textAlign: 'center', padding: 60 }}><div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div><div style={{ fontSize: 15, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>근처 장소를 찾고 있어요...</div></div>
          ) : homeData?.recommendations?.[0] ? (
            <>
              {(() => {
                const rec: any = homeData.recommendations[0]
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : cardBg, border: `1px solid ${borderColor}`, borderRadius: 18, padding: 18, boxShadow: isDarkMode ? 'none' : '0 4px 16px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div><div style={{ fontSize: 11, color: accentColor, fontWeight: 600, marginBottom: 4 }}>오늘의 한 곳</div><div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{rec.name}</div><div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{rec.address}</div></div>
                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>{rec.score}</div><div style={{ fontSize: 9, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>점수</div><div style={{ marginTop: 6, fontSize: 11 }}><span>📍 {rec.distance_meters}m</span></div></div>
                      </div>
                      {rec.reason && <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: 10 }}>{rec.reason}</p>}
                      <button type="button" onClick={() => { setAcceptedQuest(rec); setScreen('accepted') }} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #E8740C, #C65D00)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>경로 보기 →</button>
                    </div>
                  </div>
                )
              })()}
              {!kakaoMapLoaded && (
                <Script src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'}&autoload=false`} strategy="afterInteractive" onLoad={() => { if (typeof window !== 'undefined' && window.kakao?.maps?.load) { window.kakao.maps.load(() => setKakaoMapLoaded(true)) } }} />
              )}
              <div style={{ marginBottom: 24 }}><div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>지도에서 오늘의 한 곳 보기</div><div ref={homeMapContainerRef} style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.3)' : '#E5E7EB' }} /></div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 48, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}><div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div><p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>근처에서 추천할 장소를 찾지 못했어요.</p><p style={{ fontSize: 13, marginBottom: 16 }}>위치 권한을 허용하거나, 아래에서 기분 맞춤 탐험을 시도해보세요.</p></div>
          )}
          {friendPicks.length > 0 && (
            <div style={{ marginTop: 24, marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', marginBottom: 10 }}>👥 친구들이 좋아한 곳</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friendPicks.slice(0, 5).map((pick, idx) => {
                  const payload = { name: pick.place_name, address: pick.address, place_id: pick.place_id, latitude: pick.latitude, longitude: pick.longitude, category: pick.category, reason: pick.label }
                  return (
                    <button key={pick.place_id || idx} type="button" onClick={() => { setAcceptedQuest(payload); setScreen('accepted') }} style={{ width: '100%', padding: 14, textAlign: 'left', background: isDarkMode ? 'rgba(255,255,255,0.06)' : cardBg, border: `1px solid ${borderColor}`, borderRadius: 14, color: textColor, cursor: 'pointer', boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{pick.place_name}</div>
                      <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 4 }}>{pick.label}</div>
                      {pick.address ? <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{pick.address}</div> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setScreen('role')} style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 14, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left', boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}><span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>🎯</span>기분 맞춤 탐험</button>
            <button type="button" onClick={() => setScreen('social')} style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 14, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left', boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}><span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>💬</span>동네 피드</button>
          </div>
        </div>
        {/* 레벨업 축하 모달 — position:fixed 오버레이, 어느 화면에서도 표시 */}
        {showLevelUpModal && levelUpData && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowLevelUpModal(false)}>
            <div style={{ background: isDarkMode ? 'linear-gradient(135deg, #1a0e00, #2d1a00)' : 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', border: `2px solid ${accentColor}`, borderRadius: 24, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: `0 0 60px ${accentColor}60`, position: 'relative', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
                {['✨', '🎉', '⭐', '🌟', '🎊'].map((emoji, i) => (
                  <span key={i} style={{ position: 'absolute', fontSize: 20, top: `${10 + i * 18}%`, left: `${5 + i * 20}%`, opacity: 0.4, animation: `float${i} 3s ease-in-out infinite` }}>{emoji}</span>
                ))}
              </div>
              <style>{`
                @keyframes float0{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(10deg)}}
                @keyframes float1{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(-8deg)}}
                @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
                @keyframes float3{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-10px) rotate(12deg)}}
                @keyframes float4{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
                @keyframes levelUpPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
              `}</style>
              <div style={{ fontSize: 64, marginBottom: 8, animation: 'levelUpPop 0.6s ease forwards' }}>🏆</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, letterSpacing: 2, marginBottom: 8 }}>LEVEL UP!</div>
              <div style={{ fontSize: 56, fontWeight: 900, background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>Lv.{levelUpData.newLevel}</div>
              <div style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 24 }}>레벨업을 축하해요! 🎊</div>
              {levelUpData.benefits.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, marginBottom: 12 }}>🎁 이번 레벨 혜택</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {levelUpData.benefits.map((b, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(232,116,12,0.08)', border: `1px solid ${accentColor}30`, textAlign: 'left' }}>
                        <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? '#fff' : '#1F2937' }}>{b.title}</div>
                          <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{b.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button type="button" onClick={() => setShowLevelUpModal(false)} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: `0 4px 16px ${accentColor}60` }}>
                계속 탐험하기 →
              </button>
            </div>
          </div>
        )}
        {/* 퀘스트 완료 시 동네 피드 올리기 물어보는 오버레이 */}
        {questCompleteData && (
          <QuestCompleteScreen
            isOpen={true}
            placeName={questCompleteData.placeName}
            xpEarned={questCompleteData.xpEarned}
            locationVerified={questCompleteData.locationVerified}
            onViewMap={() => {
              setQuestCompleteData(null)
              setPendingFeedPost(null)
              setScreen('profile')
              setProfileTab('map')
            }}
            onPostFeed={async () => {
              const fn = pendingFeedPost
              setQuestCompleteData(null)
              setPendingFeedPost(null)
              if (fn) await fn()
            }}
            onHome={() => {
              setQuestCompleteData(null)
              setPendingFeedPost(null)
            }}
          />
        )}
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
          {isLoggedIn ? (
            <button
              onClick={() => setScreen('profile')}
              style={{
                padding: '6px 12px',
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : accentRgba(0.1),
                border: `1px solid ${borderColor}`,
                borderRadius: 10,
                color: textColor,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <span style={{ fontSize: 14 }}>👤</span>
              <span style={{ maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || '프로필'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '8px 14px',
                background: isDarkMode ? 'rgba(255,255,255,0.1)' : accentRgba(0.15),
                border: '1px solid #E8740C',
                borderRadius: 10,
                color: accentColor,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              로그인
            </button>
          )}
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
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, background: n.read ? 'transparent' : (isDarkMode ? accentRgba(0.08) : accentRgba(0.06)) }}>
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
                      <div style={{ fontSize: 10, color: accentColor, fontWeight: 600, marginBottom: 4 }}>{quest.category}</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{quest.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>{quest.score}</div>
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
                  <button type="button" onClick={(e) => { e.stopPropagation(); setAcceptedQuest(quest); setScreen('accepted'); }} style={{ fontSize: 12, color: accentColor, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>경로 보기 →</button>
                </div>
              ))}
            </div>
          ) : questsData?.recommendations?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>조금 더 넓은 범위로 찾아볼까요?</p>
              <p style={{ fontSize: 13, marginBottom: 20 }}>역할·무드를 바꾸거나 위치를 허용하면 더 많은 퀘스트가 나와요</p>
              <button onClick={() => { setScreen('role'); setSelectedRole(null); setSelectedMood(null); }} style={{ padding: '12px 24px', background: accentColor, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>역할 다시 고르기</button>
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
              <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, display: 'flex', alignItems: 'center', gap: 4 }}>
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
                }} style={{ background: 'none', border: `1px solid #E8740C`, borderRadius: 6, padding: '3px 8px', fontSize: 11, color: accentColor, cursor: 'pointer', fontWeight: 600 }}>
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
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${instagramNarrativeLoading ? borderColor : '#E8740C44'}`, background: isDarkMode ? accentRgba(0.06) : '#FFF8F2', color: textColor, fontSize: 13, resize: 'none', boxSizing: 'border-box', lineHeight: 1.6, opacity: instagramNarrativeLoading ? 0.6 : 1 }}
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
          <div style={{ background: isDarkMode ? accentRgba(0.1) : '#FEF3C7', border: '1px solid rgba(232,116,12,0.3)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: accentColor }}>📢 친구에게 공유하기</div>
            <button
              type="button"
              onClick={() => {
                const origin = typeof window !== 'undefined' ? window.location.origin : ''
                const placeId = acceptedQuest?.place_id || acceptedQuest?.id || ''
                setPlaceToRecommendForKakao({
                  place_name: acceptedQuest?.name || '장소',
                  description: acceptedQuest?.narrative || acceptedQuest?.reason || undefined,
                  image_url: (acceptedQuest as any)?.image_url || undefined,
                  link_url: `${origin.replace(/\/$/, '')}/?screen=accepted&place_id=${encodeURIComponent(placeId)}`,
                })
                setScreen('social')
              }}
              style={{
                width: '100%',
                marginBottom: 12,
                padding: 14,
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #E8740C, #C65D00)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              💬 친구에게 이 장소 추천하기
            </button>
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
                      color: accentColor,
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
              <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>📋 미션</span>
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
                    border: `1px solid ${completed ? accentRgba(0.5) : borderColor}`,
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
                            <button key={c} type="button" onClick={() => { setMissionStates((prev) => ({ ...prev, [m.id]: { completed: true, value: c } })); const nextIdx = currentMissions.findIndex((x) => x.id === m.id) + 1; if (currentMissions[nextIdx]) setExpandedMissionId(currentMissions[nextIdx].id) }} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: (state?.value === c) ? accentColor : cardBg, color: (state?.value === c) ? '#fff' : textColor, fontSize: 12, cursor: 'pointer' }}>{c}</button>
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
    const checkinPlaceId = acceptedQuest?.place_id
    const checkinPlaceName = acceptedQuest?.name

    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 80, marginBottom: 24, animation: 'bounce 1s ease infinite' }}>🎉</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>체크인 완료!</h2>
          <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>잠시 후 리뷰 작성 화면으로 이동합니다...</p>
        </div>

        {/* 동행자 감지 */}
        {(checkinPresence.length > 0 || checkinPresenceLoading) && (
          <div style={{
            width: '100%', maxWidth: 360,
            background: isDarkMode ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))' : 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
            border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'}`,
            borderRadius: 18, padding: 18, marginTop: 8,
          }}>
            {checkinPresenceLoading ? (
              <div style={{ textAlign: 'center', fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                주변 사람 확인 중…
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.25)', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>
                    {checkinPlaceName ? `${checkinPlaceName}에` : '여기에'} 함께 있는 사람
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#6366F1', padding: '2px 8px', borderRadius: 999 }}>
                    {checkinPresence.length}명
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {checkinPresence.slice(0, 3).map((u) => (
                    <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.9)', borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                        {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name || '?').slice(0, 1)}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>@{u.display_name}</div>
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 999 }}>LIVE</span>
                    </div>
                  ))}
                  {checkinPresence.length > 3 && (
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', textAlign: 'center' }}>
                      외 {checkinPresence.length - 3}명 더 있어요
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

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
              <div style={{ fontSize: 11, color: accentColor, marginBottom: 8 }}>
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
            }} onMouseEnter={(e) => e.currentTarget.style.borderColor = accentColor}
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

  // 챌린지 화면 → 프로필의 챌린지 탭으로 리다이렉트 (렌더 중 상태 업데이트 방지)
  // [MERGED - 프로필 탭 내 챌린지로 통합됨]
  if (false && screen === 'challenges') {
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
              <button key={cat.id} type="button" onClick={() => setChallengeCategory(cat.id)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${challengeCategory === cat.id ? accentColor : borderColor}`, background: challengeCategory === cat.id ? accentRgba(0.15) : cardBg, color: textColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{cat.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 16 }}>
            오늘 완료: {(CHALLENGES_BY_CATEGORY.daily.filter((c) => { const p = (userStats?.total_visits ?? 0) > 0 && c.id === 'd1' ? 1 : 0; return p >= c.total }).length)}/3 | 이번 주: {CHALLENGES_BY_CATEGORY.weekly.filter((c) => Math.min(userStats?.current_streak ?? 0, userStats?.total_places_visited ?? 0) >= c.total).length}/4 | 총 업적: {CHALLENGES_BY_CATEGORY.achievement.filter((c) => (c.id === 'a1' && (userStats?.total_visits ?? 0) >= 1) || (c.id === 'a2' && (userStats?.total_places_visited ?? 0) >= 10) || (c.id === 'a3' && (userStats?.total_places_visited ?? 0) >= 50) || (c.id === 'a5' && (userStats?.current_streak ?? 0) >= 30) || (c.id === 'a6' && (userStats?.total_reviews ?? userStats?.total_visits ?? 0) >= 30)).length}/7
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {CHALLENGES_BY_CATEGORY[challengeCategory].map((c) => {
              const progress = (() => {
                const streak = userStats?.current_streak ?? 0
                const places = userStats?.total_places_visited ?? (userStats as any)?.unique_places ?? 0
                const visits = (userStats as any)?.total_visits ?? 0
                const reviews = (userStats as any)?.total_reviews ?? (userStats as any)?.total_visits ?? 0
                const following = (userStats as any)?.following_count ?? 0
                const photoMissions = (userStats as any)?.photo_missions ?? 0
                if (c.id === 'd1') return visits > 0 ? 1 : 0
                if (c.id === 'd2') return photoMissions > 0 ? 1 : 0
                if (c.id === 'd3') return visits > 0 ? 1 : 0
                if (c.id === 'w1') return Math.min(streak, c.total)
                if (c.id === 'w2') return Math.min(places, c.total)
                if (c.id === 'w3') return Math.min(visits, c.total)
                if (c.id === 'w4') return Math.min((userStats as any)?.post_count ?? 0, c.total)
                if (c.id === 'a1') return visits >= 1 ? 1 : 0
                if (c.id === 'a2' || c.id === 'a3') return Math.min(places, c.total)
                if (c.id === 'a4') return Math.min(photoMissions, c.total)
                if (c.id === 'a5') return Math.min(streak, c.total)
                if (c.id === 'a6') return Math.min(reviews, c.total)
                if (c.id === 'a7') return Math.min((userStats as any)?.role_count ?? 0, c.total)
                if (c.id === 's1') return Math.min(following, c.total)
                if (c.id === 's2') return Math.min((userStats as any)?.share_count ?? 0, c.total)
                if (c.id === 's3') return Math.min((userStats as any)?.comment_count ?? 0, c.total)
                if (c.id === 'e1') return Math.min((userStats as any)?.cafe_count ?? 0, c.total)
                if (c.id === 'e2') return Math.min((userStats as any)?.night_visits ?? 0, c.total)
                if (c.id === 'e3') return Math.min((userStats as any)?.morning_visits ?? 0, c.total)
                if (c.id === 'e4') return Math.min((userStats as any)?.culture_count ?? 0, c.total)
                if (c.id === 'e5') return Math.min((userStats as any)?.bar_count ?? 0, c.total)
                return 0
              })()
              const done = progress >= c.total
              const claimed = challengeClaims[c.id]?.claimed ?? false
              const isClaiming = claimingChallenge === c.id
              const tierColor = c.tier === 'gold' ? '#F59E0B' : c.tier === 'silver' ? '#9CA3AF' : c.tier === 'bronze' ? '#D97706' : undefined
              const progressPct = c.total ? Math.min(100, (progress / c.total) * 100) : 0

              return (
                <div key={c.id} style={{
                  background: claimed
                    ? (isDarkMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
                    : done
                      ? (isDarkMode ? accentRgba(0.15) : accentRgba(0.08))
                      : cardBg,
                  border: `1.5px solid ${claimed ? '#10B981' : done ? accentColor : borderColor}`,
                  borderRadius: 16, padding: 18,
                  boxShadow: done && !claimed ? `0 0 0 3px ${accentRgba(0.15)}` : (isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.04)'),
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                    <div style={{
                      fontSize: 30, lineHeight: 1,
                      filter: claimed ? 'none' : done ? 'none' : 'grayscale(0.2)',
                    }}>{c.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: textColor }}>{c.title}</div>
                      <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', lineHeight: 1.4 }}>{c.desc}</div>
                    </div>
                    {/* 상태 뱃지 */}
                    {claimed ? (
                      <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700, background: 'rgba(16,185,129,0.12)', padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>✅ 수령 완료</span>
                    ) : done ? (
                      <span style={{ fontSize: 11, color: accentColor, fontWeight: 700, background: accentRgba(0.15), padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>🎁 수령 가능</span>
                    ) : c.tier ? (
                      <span style={{ fontSize: 18 }} title="달성 전 잠금">🔒</span>
                    ) : null}
                  </div>

                  {/* 진행 바 */}
                  <div style={{ marginBottom: done && !claimed ? 12 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                      <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{progress} / {c.total}</span>
                      <span style={{ color: accentColor, fontWeight: 700 }}>+{c.rewardXP} XP</span>
                    </div>
                    <div style={{ height: 8, background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                      <div style={{
                        width: `${progressPct}%`, height: '100%',
                        background: claimed
                          ? 'linear-gradient(90deg, #10B981, #34D399)'
                          : tierColor
                            ? `linear-gradient(90deg, ${tierColor}, #F59E0B)`
                            : `linear-gradient(90deg, ${accentColor}, #F59E0B)`,
                        borderRadius: 4,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                    {done && progressPct === 100 && !claimed && (
                      <div style={{ marginTop: 4, fontSize: 10, color: accentColor, fontWeight: 600, textAlign: 'right' }}>🎯 목표 달성!</div>
                    )}
                  </div>

                  {/* 완료 보상 받기 버튼 */}
                  {done && !claimed && (
                    <button
                      type="button"
                      disabled={isClaiming}
                      onClick={() => claimChallengeReward(c.id, c.rewardXP)}
                      style={{
                        width: '100%', marginTop: 12, padding: '11px 0',
                        borderRadius: 12, border: 'none',
                        background: isClaiming
                          ? (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB')
                          : `linear-gradient(135deg, ${accentColor}, #F59E0B)`,
                        color: isClaiming ? (isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF') : '#fff',
                        fontWeight: 800, fontSize: 14, cursor: isClaiming ? 'not-allowed' : 'pointer',
                        boxShadow: isClaiming ? 'none' : `0 3px 12px ${accentRgba(0.45)}`,
                        transition: 'all 0.15s',
                        letterSpacing: 0.3,
                      }}
                    >
                      {isClaiming ? '처리 중…' : `🎁 보상 받기 (+${c.rewardXP} XP)`}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <BottomNav />
      </div>
    )
  } // end if(false && challenges)

  // 소셜 탭
  if (screen === 'social') {
    return (
      <SocialScreen
        BottomNav={<BottomNav />}
        sharedPostId={sharedPostId}
        placeToRecommendForKakao={placeToRecommendForKakao}
        onCloseRecommendPlace={() => setPlaceToRecommendForKakao(null)}
      />
    )
  }

  // 프로필 화면
  if (screen === 'profile') {
    const level = userStats?.level ?? 1
    const totalXP = userStats?.total_xp ?? 0
    const xpToNextLevel = userStats?.xp_to_next_level ?? 170
    const currentLevelMinXP = (userStats as any)?.current_level_min_xp ?? 0
    const nextLevelAt = totalXP + xpToNextLevel
    const segmentSize = nextLevelAt - currentLevelMinXP
    const xpProgress = segmentSize > 0 ? Math.min(100, ((totalXP - currentLevelMinXP) / segmentSize) * 100) : 100
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

    // ── 챌린지 탭 내부 콘텐츠 (프로필 화면 안에서 렌더링)
    const ChallengesTabContent = () => (
      <div style={{ padding: '16px 0 40px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {CHALLENGE_CATEGORIES.map((cat) => (
            <button key={cat.id} type="button" onClick={() => setChallengeCategory(cat.id)} style={{ padding: '8px 14px', borderRadius: 10, border: `1px solid ${challengeCategory === cat.id ? accentColor : borderColor}`, background: challengeCategory === cat.id ? accentRgba(0.15) : cardBg, color: textColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{cat.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 16 }}>
          오늘 완료: {(CHALLENGES_BY_CATEGORY.daily.filter((c) => { const p = (userStats?.total_visits ?? 0) > 0 && c.id === 'd1' ? 1 : 0; return p >= c.total }).length)}/3 | 이번 주: {CHALLENGES_BY_CATEGORY.weekly.filter((c) => Math.min(userStats?.current_streak ?? 0, userStats?.total_places_visited ?? 0) >= c.total).length}/4 | 총 업적: {CHALLENGES_BY_CATEGORY.achievement.filter((c) => (c.id === 'a1' && (userStats?.total_visits ?? 0) >= 1) || (c.id === 'a2' && (userStats?.total_places_visited ?? 0) >= 10) || (c.id === 'a3' && (userStats?.total_places_visited ?? 0) >= 50) || (c.id === 'a5' && (userStats?.current_streak ?? 0) >= 30) || (c.id === 'a6' && (userStats?.total_reviews ?? userStats?.total_visits ?? 0) >= 30)).length}/7
        </div>
        <div style={{ display: 'grid', gap: 14 }}>
          {CHALLENGES_BY_CATEGORY[challengeCategory].map((c) => {
            const progress = (() => {
              const streak = userStats?.current_streak ?? 0
              const places = userStats?.total_places_visited ?? (userStats as any)?.unique_places ?? 0
              const visits = (userStats as any)?.total_visits ?? 0
              const reviews = (userStats as any)?.total_reviews ?? (userStats as any)?.total_visits ?? 0
              const following = (userStats as any)?.following_count ?? 0
              const photoMissions = (userStats as any)?.photo_missions ?? 0
              if (c.id === 'd1') return visits > 0 ? 1 : 0
              if (c.id === 'd2') return photoMissions > 0 ? 1 : 0
              if (c.id === 'd3') return visits > 0 ? 1 : 0
              if (c.id === 'w1') return Math.min(streak, c.total)
              if (c.id === 'w2') return Math.min(places, c.total)
              if (c.id === 'w3') return Math.min(visits, c.total)
              if (c.id === 'w4') return Math.min((userStats as any)?.post_count ?? 0, c.total)
              if (c.id === 'a1') return visits >= 1 ? 1 : 0
              if (c.id === 'a2' || c.id === 'a3') return Math.min(places, c.total)
              if (c.id === 'a4') return Math.min(photoMissions, c.total)
              if (c.id === 'a5') return Math.min(streak, c.total)
              if (c.id === 'a6') return Math.min(reviews, c.total)
              if (c.id === 'a7') return Math.min((userStats as any)?.role_count ?? 0, c.total)
              if (c.id === 's1') return Math.min(following, c.total)
              if (c.id === 's2') return Math.min((userStats as any)?.share_count ?? 0, c.total)
              if (c.id === 's3') return Math.min((userStats as any)?.comment_count ?? 0, c.total)
              if (c.id === 'e1') return Math.min((userStats as any)?.cafe_count ?? 0, c.total)
              if (c.id === 'e2') return Math.min((userStats as any)?.night_visits ?? 0, c.total)
              if (c.id === 'e3') return Math.min((userStats as any)?.morning_visits ?? 0, c.total)
              if (c.id === 'e4') return Math.min((userStats as any)?.culture_count ?? 0, c.total)
              if (c.id === 'e5') return Math.min((userStats as any)?.bar_count ?? 0, c.total)
              return 0
            })()
            const done = progress >= c.total
            const claimed = challengeClaims[c.id]?.claimed ?? false
            const isClaiming = claimingChallenge === c.id
            const progressPct = c.total ? Math.min(100, (progress / c.total) * 100) : 0
            return (
              <div key={c.id} style={{ background: claimed ? (isDarkMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)') : done ? (isDarkMode ? accentRgba(0.15) : accentRgba(0.08)) : cardBg, border: `1.5px solid ${claimed ? '#10B981' : done ? accentColor : borderColor}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 28, lineHeight: 1 }}>{c.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{c.desc}</div>
                  </div>
                  {claimed ? (
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 700, flexShrink: 0 }}>완료 ✓</span>
                  ) : done ? (
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: accentRgba(0.15), color: accentColor, fontWeight: 700, flexShrink: 0 }}>보상 대기</span>
                  ) : (
                    <span style={{ fontSize: 10, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', flexShrink: 0 }}>{progress}/{c.total}</span>
                  )}
                </div>
                <div style={{ height: 6, borderRadius: 3, background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 10 }}>
                  <div style={{ width: `${progressPct}%`, height: '100%', background: claimed ? '#10B981' : 'linear-gradient(90deg, #E8740C, #F59E0B)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>+{c.rewardXP} XP</span>
                  {done && !claimed && (
                    <button type="button" disabled={isClaiming} onClick={async () => {
                      setClaimingChallenge(c.id)
                      try {
                        const res = await fetch(`${API_BASE}/api/v1/challenges/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, challenge_id: c.id, xp_reward: c.rewardXP }) })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok || data.success !== false) {
                          setChallengeClaims((prev) => ({ ...prev, [c.id]: { claimed: true, completed_at: new Date().toISOString() } }))
                          toast.success(`🎉 +${c.rewardXP} XP 획득!`)
                        } else toast.error(data.detail || '보상 수령 실패')
                      } catch { toast.error('네트워크 오류') } finally { setClaimingChallenge(null) }
                    }} style={{ padding: '6px 14px', borderRadius: 10, border: 'none', background: isClaiming ? '#9CA3AF' : accentColor, color: '#fff', fontSize: 12, fontWeight: 700, cursor: isClaiming ? 'not-allowed' : 'pointer' }}>
                      {isClaiming ? '처리 중…' : `🎁 보상 받기`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )

    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        {/* 상단 탭 바 */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: isDarkMode ? 'rgba(10,14,20,0.96)' : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex', padding: '0 20px',
        }}>
          {([
            { id: 'profile' as const, label: '프로필', icon: '👤' },
            { id: 'map' as const, label: '지도', icon: '🗺️' },
            { id: 'challenges' as const, label: '챌린지', icon: '🎯' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setProfileTab(t.id)}
              style={{
                flex: 1, padding: '14px 0', background: 'none', border: 'none',
                fontSize: 13, fontWeight: profileTab === t.id ? 700 : 500,
                color: profileTab === t.id ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.45)' : '#9CA3AF'),
                cursor: 'pointer',
                borderBottom: profileTab === t.id ? `2px solid ${accentColor}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 20px 120px' }}>
          {/* 프로필 탭: 기존 프로필 콘텐츠 */}
          {profileTab === 'profile' && (
            <>
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
              <button type="button" onClick={() => setScreen('settings')} style={{ marginTop: 8, fontSize: 12, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>설정에서 프로필 수정</button>
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
              <span style={{ fontSize: 14, fontWeight: 700, color: accentColor }}>레벨 & XP</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: accentColor }}>Lv.{level}</span>
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
              {totalXP.toLocaleString()} XP
              {xpToNextLevel > 0 && (
                <span style={{ marginLeft: 8 }}>· 다음 레벨까지 {xpToNextLevel.toLocaleString()} XP</span>
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

          {/* 레벨 혜택 패널 — 레벨업이 실질적으로 주는 것들 */}
          {(() => {
            const { current: currentBenefits, upcoming } = getLevelBenefits(level)
            return (
              <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB', border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>🎁 레벨 혜택</div>
                  <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>Lv.{level} 기준</span>
                </div>
                {/* 현재 획득한 혜택 */}
                {currentBenefits.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginBottom: 8 }}>✅ 현재 활성화된 혜택</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {currentBenefits.slice(-4).map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isDarkMode ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                          <span style={{ fontSize: 18 }}>{b.icon}</span>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981' }}>{b.title}</div>
                            <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>{b.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* 다음 레벨 예고 */}
                {upcoming.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, marginBottom: 8 }}>🔜 다음 레벨 미리보기</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {upcoming.map(({ level: lv, benefits }) => (
                        benefits.slice(0, 2).map((b, i) => (
                          <div key={`${lv}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isDarkMode ? accentRgba(0.06) : accentRgba(0.05), borderRadius: 10, border: `1px solid ${accentRgba(0.2)}` }}>
                            <span style={{ fontSize: 18, filter: 'grayscale(0.5)' }}>{b.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: textColor }}>{b.title}</div>
                              <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>{b.desc}</div>
                            </div>
                            <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, whiteSpace: 'nowrap', background: accentRgba(0.12), padding: '2px 6px', borderRadius: 6 }}>Lv.{lv}</span>
                          </div>
                        ))
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 친구와 동네 정복률 비교 */}
          <div style={{ background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB', border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>👥 친구와 비교</div>
              <button
                type="button"
                onClick={() => {
                  setShowFriendCompare((v) => {
                    if (!v && friendCompareData.length === 0) loadFriendCompare()
                    return !v
                  })
                }}
                style={{ fontSize: 12, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                {showFriendCompare ? '접기' : '펼치기'}
              </button>
            </div>
            {!showFriendCompare ? (
              <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                팔로우 친구와 방문지·레벨을 비교해보세요
              </div>
            ) : friendCompareLoading ? (
              <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>
                친구 정보 불러오는 중…
              </div>
            ) : friendCompareData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🤝</div>
                <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 12 }}>
                  아직 팔로우하는 친구가 없어요
                </div>
                <button type="button" onClick={() => setScreen('social')} style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: accentColor, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  친구 찾기 →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* 나 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: accentRgba(0.1), borderRadius: 12, border: `1px solid ${accentRgba(0.3)}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', flexShrink: 0, fontWeight: 700 }}>
                    {(displayName || 'N').slice(0, 1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>나 · Lv.{level}</div>
                    <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>📍 {placesVisited}곳 · 🔥 {streak}일 연속</div>
                  </div>
                  <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, background: accentRgba(0.15), padding: '3px 8px', borderRadius: 6 }}>나</span>
                </div>
                {/* 친구들 */}
                {friendCompareData
                  .sort((a, b) => (b.total_places || 0) - (a.total_places || 0))
                  .map((f, i) => {
                    const isAhead = (f.total_places || 0) > placesVisited
                    return (
                      <div key={f.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fff', borderRadius: 12, border: `1px solid ${borderColor}` }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', flexShrink: 0, fontWeight: 700 }}>
                          {f.avatar_url ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (f.display_name || '친').slice(0, 1)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{f.display_name || '친구'} · Lv.{f.level || 1}</div>
                          <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>📍 {f.total_places || 0}곳 · 🔥 {f.current_streak || 0}일 연속</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: isAhead ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: isAhead ? '#EF4444' : '#10B981' }}>
                          {isAhead ? `${(f.total_places||0)-placesVisited}곳 앞서요` : placesVisited === (f.total_places||0) ? '동점!' : `${placesVisited-(f.total_places||0)}곳 앞서요`}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>

          <PersonalityProfile userId={userId} />

          {/* 내 피드 (인스타 스타일 그리드) */}
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>내 피드</div>
            {profilePosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
                <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 8 }}>아직 게시글이 없어요</p>
                <button type="button" onClick={() => setScreen('social')} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: accentColor, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>소셜에서 작성하기</button>
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
                  <button type="button" onClick={submitProfileComment} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: accentColor, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>등록</button>
                </div>
              </div>
            </div>
          )}
            </>
          )}

          {/* 지도 탭: 나의 지도 UI 임베드 (같은 도메인, 리로드 없음) */}
          {profileTab === 'map' && <MyMapScreen isEmbedded isDarkMode={isDarkMode} onGoHome={() => setScreen('home')} />}

          {/* 챌린지 탭 */}
          {profileTab === 'challenges' && <ChallengesTabContent />}
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
                      background: isMine ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#E5E7EB'),
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
              background: chatInput.trim() ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
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

  // 카카오 API 테스트 (심사 제출용) — 친구 목록 확인 및 메시지 발송 구현 확인 화면
  if (screen === 'kakao-api-test') {
    const isKakaoLoggedIn = !!(user && (user as any).app_metadata?.provider === 'kakao')
    const tokenForFriends = kakaoFriendsToken ?? null
    const step2Done = kakaoTestFriends.length > 0
    const step4Done = !!kakaoTestSentTo
    const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : ''
    const inviteText = `WhereHere 초대\n친구 코드: ${myFriendCode}\n${appUrl}`

    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
        <div style={{ padding: '50px 20px 100px' }}>
          <button type="button" onClick={() => setScreen('settings')} style={{ marginBottom: 16, background: 'none', border: 'none', color: accentColor, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>← 설정으로</button>

          {/* 심사 제출용 명확 표기: 친구 목록 확인 및 메시지 발송 */}
          <div style={{ marginBottom: 24, padding: 20, background: isDarkMode ? 'rgba(254,229,0,0.15)' : '#FFFDE7', border: '2px solid #FEE500', borderRadius: 16 }}>
            <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 6 }}>카카오 개발자 콘솔 · 친구 목록/메시지 API 심사 제출용</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: isDarkMode ? '#fff' : '#1F2937' }}>
              카카오톡 친구 목록 확인 및 메시지 발송
            </h2>
            <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: 1.6, marginBottom: 12 }}>
              본 화면은 <strong>친구 목록 조회</strong>와 <strong>친구에게 메시지 발송</strong> 기능의 구현 확인을 위한 테스트 화면입니다. 아래 4단계를 순서대로 진행한 뒤, 이 화면 전체를 캡처해 심사에 제출해 주세요.
            </p>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', lineHeight: 1.7 }}>
              <strong>사용 시나리오:</strong><br />
              ① 카카오 로그인 → ② 친구 목록 동의(동의창) → ③ 친구 목록 불러오기(API) → ④ 선택한 친구에게 초대 메시지 전송(API)
            </div>
            <a
              href="https://devtalk.kakao.com/t/api-api/116052"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: '#0066FF', textDecoration: 'underline' }}
            >
              카카오톡 친구 목록 / 메시지 API 사용 안내 (데브톡)
            </a>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ① 카카오 로그인 */}
            <div style={{ background: cardBg, border: `2px solid ${isKakaoLoggedIn ? '#16a34a' : borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>① 카카오 로그인</div>
              {isKakaoLoggedIn ? (
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ 완료 — 카카오 계정으로 로그인됨 (친구 목록/메시지 API 사용 가능)</div>
              ) : (
                <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>로그인 필요 · 설정에서 카카오로 로그인 후 다시 이 화면으로 오세요.</div>
              )}
            </div>

            {/* ② 친구목록 동의 — Step 2: 친구 목록 권한 요청 시스템 팝업 + 이용 중 동의 설명 */}
            <div style={{ background: cardBg, border: `2px solid ${step2Done ? '#16a34a' : borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>② 카카오톡 서비스 내 친구목록 동의</div>
              <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280', marginBottom: 8 }}>이용 중 동의를 통해 부족한 권한을 획득하는 과정</div>
              {step2Done ? (
                <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ 완료 — 친구 목록 동의 완료 (동의창에서 권한 허용 후 복귀)</div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 10 }}>아래 버튼을 누르면 친구 목록 권한 요청 시스템 팝업창이 뜹니다. 「카카오톡 친구 목록」「카카오톡 메시지 전송」에 동의해 주세요. 동의 후 이 페이지로 돌아오면 ③번을 진행합니다.</div>
                  <a
                    href="/api/auth/kakao-consent?return=kakao-api-test"
                    style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 10, background: '#FEE500', color: '#3C1E1E', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}
                  >
                    카카오 동의창 띄우기 (친구 목록 · 메시지 권한 허용)
                  </a>
                </div>
              )}
            </div>

            {/* ③ 친구 목록 가져오기 — "친구 목록 확인" 구현 */}
            <div style={{ background: cardBg, border: `2px solid ${kakaoTestFriends.length > 0 ? '#16a34a' : borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>③ 친구 목록 확인 (API: 친구 목록 조회)</div>
              {kakaoTestFriendsLoading ? (
                <div style={{ fontSize: 13 }}>불러오는 중...</div>
              ) : kakaoTestFriends.length > 0 ? (
                <div>
                  <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 8 }}>✓ 친구 목록 확인 완료 — {kakaoTestFriends.length}명 조회됨</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: 4 }}>조회된 친구 (닉네임):</div>
                  <div style={{ fontSize: 13, padding: '8px 12px', background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#F3F4F6', borderRadius: 8 }}>
                    {kakaoTestFriends.slice(0, 5).map((f, i, arr) => (f.profile_nickname || f.uuid || f.id || '친구') + (i < arr.length - 1 ? ', ' : '')).join('')}
                    {kakaoTestFriends.length > 5 && ' 외 ' + (kakaoTestFriends.length - 5) + '명'}
                  </div>
                </div>
              ) : (
                <>
                  {isKakaoLoggedIn && !tokenForFriends && (
                    <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 10 }}>
                      ②에서 <b>카카오 동의창 띄우기</b>를 누르고, 카카오에서 동의한 뒤 이 페이지로 돌아오면 아래 버튼을 누르세요.
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
                          setKakaoFriendsToken(null)
                          try { sessionStorage.removeItem('kakao_friends_token') } catch (_) {}
                          toast.error('친구 목록 권한이 없어요. 카카오 개발자 콘솔 → 동의항목에서 "카카오톡 친구 목록"을 선택 동의로 활성화한 뒤 ②번 동의창을 다시 눌러 주세요.')
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
                    친구 목록 불러오기 (API 호출)
                  </button>
                  {kakaoTestFriendsError === '403' && (
                    <div style={{ marginTop: 12, padding: 12, background: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEE2E2', borderRadius: 10, border: '1px solid #DC2626' }}>
                      <div style={{ fontSize: 12, color: '#B91C1C', marginBottom: 6 }}>403: 친구 목록 권한이 없습니다.</div>
                      <div style={{ fontSize: 11, color: '#B91C1C', lineHeight: 1.6, marginBottom: 10 }}>
                        아래 버튼을 누르면 카카오 동의창이 열립니다. 동의 후 돌아오면 <b>친구 목록 불러오기</b>를 다시 누르세요.
                      </div>
                      <a
                        href="/api/auth/kakao-consent?return=kakao-api-test"
                        style={{ display: 'inline-block', padding: '10px 16px', borderRadius: 10, background: '#FEE500', color: '#3C1E1E', fontWeight: 600, fontSize: 13, cursor: 'pointer', textDecoration: 'none' }}
                      >
                        친구 목록 권한 허용 (동의창 띄우기)
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ④ 친구에게 메시지 전송 — "메시지 발송" 구현 */}
            <div style={{ background: cardBg, border: `2px solid ${step4Done ? '#16a34a' : borderColor}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>④ 메시지 발송 (API: 친구에게 메시지 전송)</div>
              {step4Done ? (
                <div>
                  <div style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>✓ 메시지 발송 완료</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563' }}>전송 대상: {kakaoTestSentTo} · 초대 메시지(WhereHere 링크) 전송됨</div>
                </div>
              ) : kakaoTestFriends.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 4 }}>한 명을 선택한 뒤 「바로 보내기」를 누르면 해당 친구에게 초대 메시지가 전송됩니다.</div>
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
                            background: kakaoTestSendingUuid === uid ? '#9CA3AF' : accentColor,
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
                <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>③에서 친구 목록을 먼저 불러온 뒤, 한 명을 선택해 메시지를 보내세요.</div>
              )}
            </div>
          </div>

          {/* 캡처 안내 — 4단계 완료 후 제출 */}
          <div style={{ marginTop: 24, padding: 20, background: isDarkMode ? 'rgba(34,197,94,0.15)' : '#DCFCE7', borderRadius: 12, border: '2px solid #16a34a' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>📸 심사 제출용 캡처 안내</div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.85)' : '#166534', lineHeight: 1.7 }}>
              • 위에서 <strong>① 카카오 로그인</strong>, <strong>② 친구 목록 동의</strong>, <strong>③ 친구 목록 확인</strong>, <strong>④ 메시지 발송</strong>이 모두 완료된 상태로 이 화면 전체를 스크린샷으로 캡처해 주세요.<br />
              • 캡처 시 「친구 목록 확인 완료 — N명 조회됨」과 「메시지 발송 완료 — 전송 대상: OOO」 문구가 보이도록 스크롤하여 포함해 주세요.<br />
              • 카카오 개발자 콘솔 → 카카오톡 친구 목록/메시지 → 심사 신청 시 위 캡처를 첨부해 주세요.
            </div>
            {(isKakaoLoggedIn && step2Done && step4Done) && (
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>✓ 이 화면 상태로 캡처 후 제출하시면 됩니다.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 설정 화면
  if (screen === 'settings') {
    return (
      <SettingsScreen
        BottomNav={<BottomNav />}
        onOpenKakaoApiTest={() => setScreen('kakao-api-test')}
      />
    )
  }

  return null
}
