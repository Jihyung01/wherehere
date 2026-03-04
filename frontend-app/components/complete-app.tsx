'use client'

import { useState, useEffect, useRef } from 'react'
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
import { makeStoryCard, blobToFile, makeCaption, shareOrDownload } from '@/lib/instagram-cards'
import { compressImageFile } from '@/lib/image-compress'

declare global {
  interface Window {
    kakao: any
  }
}

type Screen = 'home' | 'role' | 'mood' | 'quests' | 'accepted' | 'checkin' | 'review' | 'challenges' | 'profile' | 'social' | 'chat' | 'settings'

// 브라우저에서는 같은 출처 사용 → Next API 프록시가 백엔드로 전달 (405/CORS 방지)
const API_BASE = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

/** 도착 인정 거리(미터): 이 거리 이내면 "장소 도착하기" 조건 충족 */
const ARRIVAL_THRESHOLD_METERS = 100

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
  const [checklist, setChecklist] = useState([false, false, false, false])
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showLocationSettings, setShowLocationSettings] = useState(false)
  const [showPrivacySettings, setShowPrivacySettings] = useState(false)
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

  // displayName 계산: userProfile state 이후에 위치
  const displayName = userProfile?.display_name ?? user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.user_metadata?.user_name ?? user?.user_metadata?.kakao_account?.profile?.nickname ?? user?.email ?? (user ? '로그인한 사용자' : null)

  // 로그인 유도: 비로그인 시 데모 수락 전에는 로그인 화면 강조
  const showLoginGate = !isLoggedIn && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('wherehere_demo_accepted') !== '1'

  // 온보딩: 이미 본 적 있으면 건너뛰기
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('wherehere_onboarded') === 'true') {
        setShowOnboarding(false)
      }
    } catch (_) {}
  }, [])

  const finishOnboarding = () => {
    try {
      localStorage.setItem('wherehere_onboarded', 'true')
    } catch (_) {}
    setShowOnboarding(false)
  }

  // 카카오 SDK 전역 로드
  useEffect(() => {
    const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'
    if (typeof window === 'undefined' || kakaoSdkLoaded) return

    // 스크립트가 이미 로드되어 있는지 확인
    if ((window as any).Kakao) {
      if (!(window as any).Kakao.isInitialized?.()) {
        (window as any).Kakao.init(kakaoJsKey)
      }
      setKakaoSdkLoaded(true)
      return
    }

    // 스크립트 로드
    const script = document.createElement('script')
    script.src = `https://t1.kakao.com/sdk/js/kakao.js?appkey=${kakaoJsKey}`
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

  // 프로필 정보 불러오기
  useEffect(() => {
    if (!userId || userId === 'user-demo-001') return
    
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
        const data = await res.json()
        if (data.profile) {
          setUserProfile(data.profile)
        }
      } catch (err) {
        console.error('프로필 조회 실패:', err)
      }
    }
    
    fetchProfile()
  }, [userId])

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

  const { data: homeData, isLoading: homeLoading } = useQuery({
    queryKey: ['homeRecommendation', userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodForHome],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodTextForHome),
    enabled: screen === 'home',
    retry: 1,
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
    enabled: (screen === 'profile' || screen === 'challenges') && !!userId,
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
          duration_minutes: Math.max(duration, 30),
          rating: reviewData.rating,
          mood: selectedMood,
          spent_amount: null,
          companions: 1,
          user_latitude: userLocation.lat,
          user_longitude: userLocation.lng,
        })
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (response.status === 400 && data.detail) {
        alert(data.detail)
        return
      }
      
      if (data.success) {
        // 성공 알림
        const xpEarned = data.xp_earned || 100
        const locBonus = data.location_verified ? '\n📍 위치 인증 보너스 적용!' : ''
        alert(`🎉 방문 완료!\n\n+${xpEarned} XP 획득${locBonus}\n총 XP는 프로필에서 확인하세요!`)
        
        // 옵트인: 동네 피드에 퀘스트 완료 스토리 올리기
        const placeName = acceptedQuest?.name || '장소'
        const placeAddress = acceptedQuest?.address || ''
        const rating = reviewData.rating
        const postToFeed = window.confirm('이 퀘스트를 동네 피드에 올릴까요?')
        if (postToFeed) {
          try {
            const postRes = await fetch(`${API_BASE}/api/v1/local/posts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                author_id: userId,
                type: 'story',
                title: `퀘스트 완료: ${placeName}`,
                body: `${placeName} 방문했어요. 별점 ${rating}점!`,
                rating: rating,
                place_name: placeName,
                place_address: placeAddress,
                image_url: reviewData.photos?.[0] || '',
                area_name: (acceptedQuest as any)?.region || (acceptedQuest as any)?.area || '내 주변',
              }),
            })
            const postData = await postRes.json().catch(() => ({}))
            if (postRes.ok && postData.success) {
              alert('동네 피드에 올렸어요.')
            }
          } catch {
            // 실패해도 방문 완료는 유지
          }
        }
        
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
        // 카카오톡 SDK - 친구 선택창 열기
        const kakao = typeof window !== 'undefined' ? (window as any).Kakao : undefined
        if (kakao?.Share?.sendDefault) {
          try {
            kakao.Share.sendDefault({
              objectType: 'location',
              address: placeAddress,
              addressTitle: placeName,
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
                {
                  title: 'WhereHere 열기',
                  link: {
                    mobileWebUrl: shareUrl,
                    webUrl: shareUrl,
                  },
                },
              ],
            })
            // 성공 - 카카오톡 친구 선택창이 열림
            return
          } catch (err) {
            console.error('카카오톡 SDK 공유 실패:', err)
          }
        }

        // 대체: 클립보드 복사
        await navigator.clipboard.writeText(`${shareTitle}\n${placeName}\n${placeAddress}\n\n${shareUrl}`)
        alert('📋 링크가 복사되었습니다!\n카카오톡에서 붙여넣기 해주세요.')

      } else if (platform === 'instagram') {
        // 인스타그램 - 스토리 카드 생성 후 공유
        try {
          // 스토리 카드 생성
          const storyBlob = await makeStoryCard({
            title: placeName,
            body: `${placeAddress}\n\n🗺️ WhereHere에서 발견한 특별한 장소`,
            imageUrl: placeImage,
            placeLine: `📍 ${placeName}${placeAddress ? '\n' + placeAddress : ''}`,
          })
          const storyFile = blobToFile(storyBlob, 'wherehere-story.png')
          const caption = `${placeName}\n${placeAddress}\n\n#WhereHere #맛집 #카페 #여행\n${shareUrl}`

          if (isMobile) {
            // 모바일: Web Share API로 인스타그램 직접 공유
            if (navigator.share && navigator.canShare({ files: [storyFile] })) {
              try {
                await navigator.share({
                  files: [storyFile],
                  title: placeName,
                  text: caption,
                })
                return
              } catch (shareErr: any) {
                if (shareErr.name === 'AbortError') return
                console.error('Web Share 실패:', shareErr)
              }
            }

            // 대체: 다운로드 + 인스타그램 앱 열기
            const url = URL.createObjectURL(storyFile)
            const a = document.createElement('a')
            a.href = url
            a.download = 'wherehere-story.png'
            a.click()
            URL.revokeObjectURL(url)

            // 캡션 복사
            await navigator.clipboard.writeText(caption)

            // 인스타그램 앱 열기
            setTimeout(() => {
              window.location.href = 'instagram://story-camera'
            }, 500)

            alert('📸 이미지를 저장했어요!\n인스타그램 스토리에서 업로드하고 캡션을 붙여넣기 해주세요.')
          } else {
            // 데스크톱: 다운로드 + 캡션 복사
            await shareOrDownload({
              file: storyFile,
              caption,
              filename: 'wherehere-story.png',
              onToast: (msg) => {
                const notification = document.createElement('div')
                notification.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000;color:#fff;padding:20px 30px;border-radius:12px;z-index:10000;font-size:14px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
                notification.textContent = msg
                document.body.appendChild(notification)
                setTimeout(() => document.body.removeChild(notification), 3000)
              },
            })
          }
        } catch (err) {
          console.error('인스타그램 카드 생성 실패:', err)
          // 대체: 클립보드 복사
          await navigator.clipboard.writeText(`${shareTitle}\n${placeName}\n${placeAddress}\n\n${shareUrl}\n\n#WhereHere #${placeName.replace(/\s/g, '')} #맛집 #카페`)
          alert('📋 링크가 복사되었습니다!\n인스타그램에서 붙여넣기 해주세요.')
        }

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
        alert(`📋 링크가 복사되었습니다!`)
      } catch {
        alert(`📋 이 링크를 복사해주세요:\n\n${shareUrl}`)
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

  // 체크리스트 토글
  const toggleChecklistItem = (index: number) => {
    const newChecklist = [...checklist]
    newChecklist[index] = !newChecklist[index]
    setChecklist(newChecklist)
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
          setChecklist((prev) => {
            const next = [...prev]
            next[0] = true
            return next
          })
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

  // 필수 체크리스트만: 도착(0) + 리뷰(3). 사진·특별한 순간은 선택
  const essentialChecklistCompleted = checklist[0] && checklist[3]
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

  // 온보딩 (첫 방문 시 2~3장, 건너뛰기 가능)
  if (showOnboarding) {
    const steps = [
      {
        title: '오늘의 역할을 골라보세요',
        desc: '탐험가, 힐러, 예술가, 미식가, 도전자 중에서\n나에게 맞는 역할을 선택하면 AI가 장소를 추천해요.',
        icon: '🧭',
      },
      {
        title: '퀘스트를 받고 떠나보세요',
        desc: '기분과 역할에 맞는 특별한 장소 3곳을 추천받아\n마음에 드는 한 곳을 골라 도전해보세요.',
        icon: '🎯',
      },
      {
        title: '도착하면 인정받고, 지도에 쌓아요',
        desc: '장소 100m 이내에서 "도착했어요"를 누르면\n미션이 완료되고 XP가 쌓여 나만의 지도가 완성돼요.',
        icon: '🗺️',
      },
    ]
    const step = steps[onboardingStep]
    const isLast = onboardingStep === steps.length - 1
    return (
      <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', display: 'flex', flexDirection: 'column', padding: '48px 24px 32px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>{step.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>{step.title}</h2>
          <p style={{ fontSize: 15, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{step.desc}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          <button
            onClick={() => { if (isLast) finishOnboarding(); else setOnboardingStep((s) => s + 1); }}
            style={{
              flex: 1,
              padding: 16,
              background: isLast ? 'linear-gradient(135deg, #E8740C, #C65D00)' : cardBg,
              border: `1px solid ${isLast ? 'transparent' : borderColor}`,
              borderRadius: 14,
              color: isLast ? '#fff' : textColor,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {isLast ? '시작하기' : '다음'}
          </button>
          {!isLast && (
            <button
              onClick={finishOnboarding}
              style={{
                padding: '16px 20px',
                background: 'transparent',
                border: `1px solid ${borderColor}`,
                borderRadius: 14,
                color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#9CA3AF',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              건너뛰기
            </button>
          )}
        </div>
        {isLast && (
          <button
            onClick={finishOnboarding}
            style={{
              marginTop: 12,
              padding: 12,
              background: 'transparent',
              border: 'none',
              color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            건너뛰기
          </button>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: i === onboardingStep ? '#E8740C' : (isDarkMode ? 'rgba(255,255,255,0.2)' : '#E5E7EB'),
              }}
            />
          ))}
        </div>
      </div>
    )
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
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WhereHere
            </h1>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 8 }}>오늘의 한 곳에서 동네 커뮤니티까지 한 번에.</p>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
              홈 · 기분 맞춤 탐험 · 동네 피드
            </div>
          </div>

          {/* 1) 오늘의 한 곳 + 지도 */}
          <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', marginBottom: 10 }}>오늘의 한 곳</div>
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
                  disabled={arrivalCheckLoading || checklist[0]}
                  style={{
                    width: '100%',
                    padding: 14,
                    background: checklist[0]
                      ? (isDarkMode ? 'rgba(16,185,129,0.2)' : '#D1FAE5')
                      : 'linear-gradient(135deg, #E8740C, #C65D00)',
                    border: 'none',
                    borderRadius: 12,
                    color: checklist[0] ? (isDarkMode ? '#6EE7B7' : '#059669') : '#fff',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: arrivalCheckLoading || checklist[0] ? 'default' : 'pointer',
                    opacity: arrivalCheckLoading ? 0.8 : 1,
                  }}
                >
                  {checklist[0] ? '✅ 장소 도착 완료' : arrivalCheckLoading ? '위치 확인 중...' : `도착했어요 (${ARRIVAL_THRESHOLD_METERS}m 이내)`}
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

          <div style={{ background: isDarkMode ? 'rgba(232,116,12,0.1)' : '#FEF3C7', border: '1px solid rgba(232,116,12,0.3)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#E8740C' }}>
              📋 미션 체크리스트 (필수: 도착 + 리뷰)
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
            {(() => {
              const streak = userStats?.current_streak ?? 0
              const places = userStats?.total_places_visited ?? userStats?.unique_places ?? 0
              const quests = userStats?.completed_quests ?? userStats?.total_visits ?? 0
              const challenges = [
                { icon: '🔥', title: '7일 연속 방문', desc: '7일 동안 매일 새로운 장소 방문', progress: Math.min(streak, 7), total: 7, reward: '500 XP' },
                { icon: '🗺️', title: '5곳 방문', desc: '서로 다른 장소 5곳 방문', progress: Math.min(places, 5), total: 5, reward: '300 XP' },
                { icon: '⭐', title: '퀘스트 10개 완료', desc: '10개 퀘스트 완료하고 리뷰 작성', progress: Math.min(quests, 10), total: 10, reward: '200 XP' },
              ]
              return challenges
            })().map((challenge, i) => (
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
              imageUrl: post.image_url || appUrl + 'og.png',
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
          alert('카카오톡 공유에 실패했어요. 기본 공유를 시도합니다.')
        }
      }
      
      // 카카오 SDK 없으면 기본 공유
      const text = [post.title, post.body || '', post.place_name ? `📍 ${post.place_name}` : '', post.place_address ? `   ${post.place_address}` : '', '#동네생활 #wherehere', appUrl].filter(Boolean).join('\n')
      if (typeof navigator !== 'undefined' && navigator.share) {
        navigator.share({ title: post.title, text }).catch(() => { navigator.clipboard?.writeText(text); alert('공유 문구를 복사했어요.') })
      } else {
        navigator.clipboard?.writeText(text)
        alert('공유 문구를 복사했어요.')
      }
    }
    const sharePostInstagramCard = async (post: { title: string; body?: string; place_name?: string; place_address?: string; image_url?: string } | null) => {
      if (!post) return
      const caption = makeCaption(post)
      try {
        const placeLine = [
          post.place_name ? `📍 ${post.place_name}` : '',
          post.place_address ? post.place_address : ''
        ].filter(Boolean).join(' · ')
        
        const blob = await makeStoryCard({
          title: post.title,
          body: (post.body || '').slice(0, 200),
          imageUrl: post.image_url,
          placeLine: placeLine || undefined,
        })
        const file = blobToFile(blob, 'wherehere-story.png')
        await shareOrDownload({ file, caption, filename: 'wherehere-story.png', onToast: (msg) => alert(msg) })
      } catch (e) {
        console.error(e)
        try {
          await navigator.clipboard.writeText(caption)
          alert('캡션을 복사했어요. 카드 생성에 실패했을 수 있어요.')
        } catch {
          alert('공유 준비에 실패했어요.')
        }
      }
    }
    return (
      <>
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
        onToast={(msg) => alert(msg)}
        BottomNav={<BottomNav />}
        userAvatarUrl={userProfile?.profile_image_url}
      />
      </>
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
        alert('댓글 저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.')
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
                    {p.image_url ? (
                      <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                  {selectedProfilePost.image_url && (
                    <img src={selectedProfilePost.image_url} alt="" style={{ width: '100%', borderRadius: 12, marginBottom: 12, maxHeight: 240, objectFit: 'cover' }} />
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
                        <input
                          placeholder="표시 이름"
                          defaultValue={displayName || ''}
                          onBlur={async (e) => {
                            const name = e.target.value.trim()
                            if (!name) return

                            // 즉시 로컬 state 업데이트 (빠른 UX)
                            setUserProfile(prev => ({
                              ...prev,
                              display_name: name,
                              profile_image_url: prev?.profile_image_url
                            }))

                            try {
                              const res = await fetch(`${API_BASE}/api/v1/social/profile`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ user_id: userId, display_name: name }),
                              })
                              if (res.ok) {
                                // 성공 시 백엔드에서 최신 데이터 가져오기
                                const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                                const profileData = await profileRes.json()
                                if (profileData.profile) {
                                  setUserProfile(profileData.profile)
                                }
                              } else {
                                throw new Error('API error')
                              }
                            } catch (_) {
                              alert('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.')
                              // 실패 시 원래 프로필로 되돌림
                              const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                              const profileData = await profileRes.json()
                              if (profileData.profile) {
                                setUserProfile(profileData.profile)
                              }
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: 10,
                            marginBottom: 8,
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
                            color: textColor,
                            fontSize: 13,
                          }}
                        />
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
                                      // 실제 업로드된 URL로 state 업데이트
                                      setUserProfile(prev => ({
                                        ...prev,
                                        display_name: prev?.display_name || displayName || undefined,
                                        profile_image_url: data.url
                                      }))
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
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return null
}
