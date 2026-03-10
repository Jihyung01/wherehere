'use client'

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getRecommendations } from '@/lib/api-client'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { MOODS, type RoleType, type MoodType } from '@/components/screens'
import { selectMissions } from '@/components/missions'
import type { Mission } from '@/components/missions'
import { toast } from 'sonner'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type Screen = 'home' | 'role' | 'mood' | 'quests' | 'accepted' | 'checkin' | 'review' | 'challenges' | 'profile' | 'social' | 'chat' | 'settings' | 'kakao-api-test'
export type ThemeMode = 'light' | 'dark' | 'system'
export type ChallengeCategory = 'daily' | 'weekly' | 'achievement' | 'social' | 'explorer'

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
export const API_BASE = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
export const ARRIVAL_THRESHOLD_METERS = 100

export const CHALLENGE_CATEGORIES: { id: ChallengeCategory; label: string }[] = [
  { id: 'daily', label: '일일' },
  { id: 'weekly', label: '주간' },
  { id: 'achievement', label: '업적' },
  { id: 'social', label: '소셜' },
  { id: 'explorer', label: '탐험' },
]

export const CHALLENGES_BY_CATEGORY: Record<ChallengeCategory, { id: string; icon: string; title: string; desc: string; total: number; rewardXP: number; tier?: 'bronze' | 'silver' | 'gold' }[]> = {
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

export const LEVEL_BENEFITS: Record<number, { icon: string; title: string; desc: string; type: 'unlock' | 'bonus' | 'social' }[]> = {
  1:  [{ icon: '🗺️', title: '퀘스트 탐험', desc: '기본 역할 퀘스트 수락 가능', type: 'unlock' }],
  2:  [{ icon: '💬', title: '동네 피드 작성', desc: '리뷰·이야기 게시글 작성 개방', type: 'unlock' }],
  3:  [{ icon: '🎯', title: '챌린지 도전', desc: '일일·주간 챌린지 전체 참가 가능', type: 'unlock' }, { icon: '⚡', title: 'XP 보너스 +10%', desc: '모든 퀘스트 보상 10% 추가', type: 'bonus' }],
  5:  [{ icon: '📸', title: '포토 미션 강화', desc: '사진 미션 완료 시 추가 XP +15', type: 'bonus' }],
  6:  [{ icon: '🔮', title: '히든 퀘스트 해금', desc: '숨겨진 특별 장소 퀘스트 등장', type: 'unlock' }],
  8:  [{ icon: '🔥', title: '스트릭 보너스', desc: '5일 연속 방문 시 XP 2배', type: 'bonus' }],
  10: [{ icon: '🗺️', title: '동네 정복 통계', desc: '구역별 정복률·히트맵 고급 분석 개방', type: 'unlock' }, { icon: '👑', title: '탐험가 칭호', desc: '프로필에 "베테랑 탐험가" 배지 표시', type: 'social' }],
  12: [{ icon: '🤝', title: '함께 도전 기능', desc: '친구를 퀘스트에 초대하고 함께 완료 가능', type: 'social' }],
  15: [{ icon: '✨', title: '프리미엄 AI 서사', desc: '더 깊고 개성 있는 장소 스토리 생성', type: 'unlock' }, { icon: '💰', title: 'XP 보너스 +25%', desc: '누적 보너스 적용, 레벨 3 포함', type: 'bonus' }],
  20: [{ icon: '🏆', title: '동네 명예의 전당', desc: '동네 최다 방문자 랭킹 노출', type: 'social' }, { icon: '🎁', title: '파트너 혜택', desc: '제휴 카페·식당 첫 방문 할인 쿠폰', type: 'unlock' }],
  25: [{ icon: '🌟', title: '크리에이터 뱃지', desc: '피드 게시글에 특별 아이콘 표시', type: 'social' }],
  30: [{ icon: '🗝️', title: '비밀 지역 해금', desc: '앱 내 VIP 전용 숨겨진 지역 퀘스트', type: 'unlock' }, { icon: '⚡', title: 'XP 보너스 +50%', desc: '레벨 3·15 포함 누적 적용', type: 'bonus' }],
  50: [{ icon: '👑', title: '레전드 탐험가', desc: '최고 등급 칭호 및 영구 프로필 뱃지', type: 'social' }],
}

// ─────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────
export function getLevelBenefits(currentLevel: number) {
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

export function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
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

export function formatAccountDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
  } catch {
    return '—'
  }
}

// ─────────────────────────────────────────────
// Context type
// ─────────────────────────────────────────────
export interface AppContextValue {
  // Router
  router: ReturnType<typeof useRouter>
  // User
  user: any
  userId: string
  isLoggedIn: boolean
  signOut: () => void
  // Screen
  screen: Screen
  setScreen: (s: Screen) => void
  // Quest flow
  selectedRole: RoleType | null
  setSelectedRole: (r: RoleType | null) => void
  selectedMood: MoodType | null
  setSelectedMood: (m: MoodType | null) => void
  acceptedQuest: any
  setAcceptedQuest: (q: any) => void
  // Location
  userLocation: { lat: number; lng: number }
  setUserLocation: (loc: { lat: number; lng: number }) => void
  // CheckIn / Review
  checkInTime: Date | null
  setCheckInTime: (t: Date | null) => void
  reviewData: { rating: number; review: string; photos: string[] }
  setReviewData: (d: { rating: number; review: string; photos: string[] }) => void
  // Theme
  isDarkMode: boolean
  setIsDarkMode: (v: boolean) => void
  themeMode: ThemeMode
  setThemeMode: (m: ThemeMode) => void
  accentColor: string
  setAccentColor: (c: string) => void
  // Computed colors
  bgColor: string
  textColor: string
  cardBg: string
  borderColor: string
  accentRgba: (alpha: number) => string
  // Missions
  missionStates: Record<string, { completed: boolean; value?: string | number; photo?: string }>
  setMissionStates: React.Dispatch<React.SetStateAction<Record<string, { completed: boolean; value?: string | number; photo?: string }>>>
  currentMissions: Mission[]
  setCurrentMissions: (m: Mission[]) => void
  expandedMissionId: string | null
  setExpandedMissionId: (id: string | null) => void
  uploadedPhotos: string[]
  setUploadedPhotos: (p: string[]) => void
  // Settings panels
  showNotificationSettings: boolean
  setShowNotificationSettings: (v: boolean) => void
  showLocationSettings: boolean
  setShowLocationSettings: (v: boolean) => void
  showPrivacySettings: boolean
  setShowPrivacySettings: (v: boolean) => void
  showHelpSettings: boolean
  setShowHelpSettings: (v: boolean) => void
  showCreatorSettings: boolean
  setShowCreatorSettings: (v: boolean) => void
  // PWA
  installPrompt: any
  setInstallPrompt: (p: any) => void
  isAppInstalled: boolean
  setIsAppInstalled: (v: boolean) => void
  isIOSDevice: boolean
  // Place suggestion
  placeSuggestionForm: { name: string; address: string; category: string; description: string }
  setPlaceSuggestionForm: (f: { name: string; address: string; category: string; description: string }) => void
  placeSuggestionSubmitting: boolean
  placeSuggestionMessage: string | null
  submitPlaceSuggestion: () => Promise<void>
  // Arrival
  arrivalCheckLoading: boolean
  arrivalMessage: string | null
  setArrivalMessage: (m: string | null) => void
  handleArrivalCheck: () => void
  // Map
  kakaoMapLoaded: boolean
  setKakaoMapLoaded: (v: boolean) => void
  kakaoSdkLoaded: boolean
  setKakaoSdkLoaded: (v: boolean) => void
  routeMapContainerRef: React.RefObject<HTMLDivElement>
  homeMapContainerRef: React.RefObject<HTMLDivElement>
  // Onboarding
  showOnboarding: boolean
  setShowOnboarding: (v: boolean) => void
  finishOnboarding: () => void
  // Narrative
  narrativeLoading: boolean
  setNarrativeLoading: (v: boolean) => void
  // Friends / Social (shared)
  friendQuery: string
  setFriendQuery: (q: string) => void
  friendSearchResults: any[]
  setFriendSearchResults: (r: any[]) => void
  friendSearchLoading: boolean
  // Chat
  currentConversation: any | null
  setCurrentConversation: (c: any | null) => void
  chatMessages: any[]
  setChatMessages: React.Dispatch<React.SetStateAction<any[]>>
  chatLoading: boolean
  chatInput: string
  setChatInput: (v: string) => void
  // Demo
  demoAccepted: boolean
  setDemoAccepted: (v: boolean) => void
  showLoginGate: boolean
  // Profile
  selectedProfilePost: { id: string; title: string; body?: string; type?: string; image_url?: string; place_name?: string; rating?: number; created_at?: string; author_id?: string } | null
  setSelectedProfilePost: (p: any | null) => void
  profileCommentInput: string
  setProfileCommentInput: (v: string) => void
  userProfile: { display_name?: string; profile_image_url?: string } | null
  setUserProfile: React.Dispatch<React.SetStateAction<{ display_name?: string; profile_image_url?: string } | null>>
  nicknameInput: string
  setNicknameInput: (v: string) => void
  savingNickname: boolean
  displayName: string | null | undefined
  saveNickname: () => Promise<void>
  refetchUserProfile: () => Promise<void>
  // Instagram share
  showInstagramShareModal: boolean
  setShowInstagramShareModal: (v: boolean) => void
  instagramShareForm: {
    title: string; aiNarrative: string; userReview: string; place_name: string; place_address: string; image_url: string; mood: string; rating: number;
  }
  setInstagramShareForm: React.Dispatch<React.SetStateAction<{
    title: string; aiNarrative: string; userReview: string; place_name: string; place_address: string; image_url: string; mood: string; rating: number;
  }>>
  instagramShareSubmitting: boolean
  setInstagramShareSubmitting: (v: boolean) => void
  instagramNarrativeLoading: boolean
  setInstagramNarrativeLoading: (v: boolean) => void
  // Feed
  feedType: 'all' | 'hot' | 'gathering' | 'review'
  setFeedType: (t: 'all' | 'hot' | 'gathering' | 'review') => void
  // Quest complete
  questCompleteData: { xpEarned: number; locationVerified: boolean; placeName: string } | null
  setQuestCompleteData: (d: { xpEarned: number; locationVerified: boolean; placeName: string } | null) => void
  pendingFeedPost: (() => Promise<void>) | null
  setPendingFeedPost: React.Dispatch<React.SetStateAction<(() => Promise<void>) | null>>
  // ConfirmModal
  confirmModal: { message: string; subMessage?: string; confirmText?: string; onConfirm: () => void } | null
  setConfirmModal: (m: { message: string; subMessage?: string; confirmText?: string; onConfirm: () => void } | null) => void
  // Premium
  showPremiumModal: boolean
  setShowPremiumModal: (v: boolean) => void
  // Kakao tokens
  kakaoAccessToken: string | null
  kakaoFriendsToken: string | null
  setKakaoFriendsToken: (t: string | null) => void
  // Kakao API test
  kakaoTestFriendsError: '403' | null
  setKakaoTestFriendsError: (e: '403' | null) => void
  kakaoTestFriends: Array<{ uuid?: string; id?: string; profile_nickname?: string }>
  setKakaoTestFriends: (f: Array<{ uuid?: string; id?: string; profile_nickname?: string }>) => void
  kakaoTestFriendsLoading: boolean
  setKakaoTestFriendsLoading: (v: boolean) => void
  kakaoTestSentTo: string | null
  setKakaoTestSentTo: (v: string | null) => void
  kakaoTestSendingUuid: string | null
  setKakaoTestSendingUuid: (v: string | null) => void
  // Level up
  showLevelUpModal: boolean
  setShowLevelUpModal: (v: boolean) => void
  levelUpData: { newLevel: number; benefits: typeof LEVEL_BENEFITS[number] } | null
  // Challenge claims
  challengeClaims: Record<string, { claimed: boolean; completed_at?: string }>
  claimingChallenge: string | null
  claimChallengeReward: (challengeId: string, xpToAward: number) => Promise<void>
  // Friend compare
  friendCompareData: Array<{ user_id: string; display_name?: string; avatar_url?: string; total_places?: number; current_streak?: number; level?: number }>
  friendCompareLoading: boolean
  showFriendCompare: boolean
  setShowFriendCompare: (v: boolean) => void
  loadFriendCompare: () => Promise<void>
  // Derived / computed
  myFriendCode: string
  moodTextForApi: string
  requiredMissions: Mission[]
  essentialChecklistCompleted: boolean
  allRequiredCompleted: boolean
  completedMissionCount: number
  // Queries
  homeData: any
  homeLoading: boolean
  refetchHome: () => void
  homeRefreshKey: number
  setHomeRefreshKey: React.Dispatch<React.SetStateAction<number>>
  questsData: any
  questsLoading: boolean
  userStats: any
  refetchUserStats: () => void
  profilePosts: any[]
  profilePostComments: any[]
  refetchProfilePostComments: () => void
  notifications: any[]
  unreadCount: number
  showNotificationPanel: boolean
  setShowNotificationPanel: (v: boolean) => void
  refetchNotifications: () => void
  feedData: any
  feedActivities: any[]
  followingIds: string[]
  refetchFeed: () => void
  // Actions
  searchFriends: () => Promise<void>
  toggleFollow: (targetUserId: string, isFollowing: boolean) => Promise<void>
  openChatWithUser: (targetUser: any) => Promise<void>
  sendChatMessage: () => Promise<void>
  handleCheckIn: () => Promise<void>
  handleSubmitReview: () => Promise<void>
  handleShare: (platform: string) => Promise<void>
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────
const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────
export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useAuth()
  const userId = user?.id ?? 'user-demo-001'
  const isLoggedIn = !!user

  // ── Core state ──
  const [kakaoSdkLoaded, setKakaoSdkLoaded] = useState(false)
  const [screen, setScreen] = useState<Screen>('home')
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null)
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [acceptedQuest, setAcceptedQuest] = useState<any>(null)
  const [userLocation, setUserLocation] = useState({ lat: 37.5665, lng: 126.9780 })
  const [checkInTime, setCheckInTime] = useState<Date | null>(null)
  const [reviewData, setReviewData] = useState({ rating: 0, review: '', photos: [] as string[] })
  const [isDarkMode, setIsDarkMode] = useState(false)
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
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [friendQuery, setFriendQuery] = useState('')
  const [friendSearchResults, setFriendSearchResults] = useState<any[]>([])
  const [friendSearchLoading, setFriendSearchLoading] = useState(false)
  const [currentConversation, setCurrentConversation] = useState<any | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [demoAccepted, setDemoAccepted] = useState(false)
  const [selectedProfilePost, setSelectedProfilePost] = useState<any | null>(null)
  const [profileCommentInput, setProfileCommentInput] = useState('')
  const [userProfile, setUserProfile] = useState<{ display_name?: string; profile_image_url?: string } | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')
  const [savingNickname, setSavingNickname] = useState(false)
  const [showInstagramShareModal, setShowInstagramShareModal] = useState(false)
  const [instagramShareForm, setInstagramShareForm] = useState<{
    title: string; aiNarrative: string; userReview: string; place_name: string; place_address: string; image_url: string; mood: string; rating: number;
  }>({ title: '', aiNarrative: '', userReview: '', place_name: '', place_address: '', image_url: '', mood: '', rating: 0 })
  const [instagramShareSubmitting, setInstagramShareSubmitting] = useState(false)
  const [instagramNarrativeLoading, setInstagramNarrativeLoading] = useState(false)
  const [feedType, setFeedType] = useState<'all' | 'hot' | 'gathering' | 'review'>('all')
  const [questCompleteData, setQuestCompleteData] = useState<{ xpEarned: number; locationVerified: boolean; placeName: string } | null>(null)
  const [pendingFeedPost, setPendingFeedPost] = useState<(() => Promise<void>) | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ message: string; subMessage?: string; confirmText?: string; onConfirm: () => void } | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [kakaoAccessToken, setKakaoAccessToken] = useState<string | null>(null)
  const [kakaoFriendsToken, setKakaoFriendsToken] = useState<string | null>(null)
  const [kakaoTestFriendsError, setKakaoTestFriendsError] = useState<'403' | null>(null)
  const [kakaoTestFriends, setKakaoTestFriends] = useState<Array<{ uuid?: string; id?: string; profile_nickname?: string }>>([])
  const [kakaoTestFriendsLoading, setKakaoTestFriendsLoading] = useState(false)
  const [kakaoTestSentTo, setKakaoTestSentTo] = useState<string | null>(null)
  const [kakaoTestSendingUuid, setKakaoTestSendingUuid] = useState<string | null>(null)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false)
  const [levelUpData, setLevelUpData] = useState<{ newLevel: number; benefits: typeof LEVEL_BENEFITS[number] } | null>(null)
  const prevLevelRef = React.useRef<number | null>(null)
  const [challengeClaims, setChallengeClaims] = useState<Record<string, { claimed: boolean; completed_at?: string }>>({})
  const [claimingChallenge, setClaimingChallenge] = useState<string | null>(null)
  const [friendCompareData, setFriendCompareData] = useState<Array<{ user_id: string; display_name?: string; avatar_url?: string; total_places?: number; current_streak?: number; level?: number }>>([])
  const [friendCompareLoading, setFriendCompareLoading] = useState(false)
  const [showFriendCompare, setShowFriendCompare] = useState(false)
  const [showNotificationPanel, setShowNotificationPanel] = useState(false)
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)

  // ── Computed colors ──
  const accentRgba = (alpha: number): string => {
    try {
      const r = parseInt(accentColor.slice(1, 3), 16)
      const g = parseInt(accentColor.slice(3, 5), 16)
      const b = parseInt(accentColor.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${alpha})`
    } catch { return `rgba(232,116,12,${alpha})` }
  }
  const bgColor = isDarkMode ? '#0A0E14' : '#FFFFFF'
  const textColor = isDarkMode ? '#FFFFFF' : '#1F2937'
  const cardBg = isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'

  // ── Display name ──
  const displayName = user?.user_metadata?.display_name ?? userProfile?.display_name ?? user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.user_metadata?.user_name ?? user?.user_metadata?.kakao_account?.profile?.nickname ?? user?.email ?? (user ? '로그인한 사용자' : null)

  // ── Derived ──
  const myFriendCode = userId.slice(0, 8)
  const moodTextForApi = selectedMood ? (MOODS.find((m) => m.id === selectedMood)?.name ?? selectedMood) : ''
  const requiredMissions = currentMissions.filter((m) => m.required)
  const essentialChecklistCompleted = requiredMissions.length > 0 && requiredMissions.every((m) => missionStates[m.id]?.completed)
  const allRequiredCompleted = requiredMissions.every((m) => missionStates[m.id]?.completed)
  const completedMissionCount = currentMissions.filter((m) => missionStates[m.id]?.completed).length
  const showLoginGate = !isLoggedIn && !demoAccepted

  // ── Effects ──
  useEffect(() => {
    setNicknameInput(displayName || '')
  }, [displayName])

  useEffect(() => {
    try { setDemoAccepted(sessionStorage.getItem('wherehere_demo_accepted') === '1') } catch (_) {}
  }, [])

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

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true)
      return
    }
    const ua = navigator.userAgent
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setIsIOSDevice(true)
      return
    }
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('wherehere_onboarded') === 'true') {
        setShowOnboarding(false)
      }
    } catch (_) {}
  }, [])

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
          ? `카카오 동의 거부/오류${kakaoReason ? ` (${kakaoReason})` : ''}. 카카오 개발자 콘솔 → 동의항목에서 "카카오톡 친구 목록"과 "카카오톡 메시지 전송"을 선택 동의로 활성화하세요.`
          : err === 'kakao_consent_no_code'
            ? '동의 후 돌아오는 과정에서 코드를 받지 못했어요. 다시 동의창부터 시도해 주세요.'
            : err === 'kakao_consent_exchange' || err === 'kakao.consent_exchange'
              ? /rate\s*limit|한도|exceeded/i.test(decodeURIComponent(kakaoDesc))
                ? '토큰 요청 한도를 초과했어요. 약 10분 후 다시 「동의창 띄우기」를 눌러 주세요.'
                : '동의 후 토큰 발급에 실패했어요. Redirect URI가 카카오 개발자 콘솔과 일치하는지 확인 후 다시 시도해 주세요.'
              : null
    if (msg) {
      const t = setTimeout(() => { toast.error(msg) }, 0)
      return () => clearTimeout(t)
    }
  }, [])

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

  // Level up detection
  const { data: userStats, refetch: refetchUserStats } = useQuery({
    queryKey: ['userStats', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/users/me/stats?user_id=${encodeURIComponent(userId)}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: (screen === 'profile' || screen === 'challenges' || screen === 'home') && !!userId,
  })

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

  // Challenge claims
  useEffect(() => {
    if (!userId || userId === 'user-demo-001') return
    try {
      const saved = localStorage.getItem(`wherehere_challenge_claims_${userId}`)
      if (saved) setChallengeClaims(JSON.parse(saved))
    } catch (_) {}
    fetch(`${API_BASE}/api/v1/challenges/user/${userId}/all-progress`)
      .then((r) => r.json())
      .then((data) => {
        if (data.claims) {
          setChallengeClaims((prev) => ({ ...prev, ...data.claims }))
        }
      })
      .catch(() => {})
  }, [userId])

  // Profile fetch
  const refetchUserProfile = useCallback(async () => {
    if (!userId || userId === 'user-demo-001') return
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
      const data = await res.json()
      if (data.profile) {
        setUserProfile((prev) => {
          const next = { ...data.profile, display_name: data.profile.display_name ?? prev?.display_name }
          const img = (data.profile as any).profile_image_url ?? (data.profile as any).avatar_url
          if (img) {
            (next as any).profile_image_url = img
          } else {
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

  useEffect(() => { refetchUserProfile() }, [refetchUserProfile])

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

  useEffect(() => {
    setArrivalMessage(null)
  }, [acceptedQuest?.place_id])

  // Narrative load
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

  // Kakao SDK
  useEffect(() => {
    const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY || process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'
    if (typeof window === 'undefined' || kakaoSdkLoaded) return
    if ((window as any).Kakao) {
      if (!(window as any).Kakao.isInitialized?.()) {
        (window as any).Kakao.init(kakaoJsKey)
      }
      setKakaoSdkLoaded(true)
      return
    }
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
    script.onerror = () => { console.error('카카오 SDK 로드 실패') }
    document.head.appendChild(script)
  }, [])

  // Web Push
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
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId])

  // Supabase realtime notifications
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

  useEffect(() => {
    if (!userId) return
    const supabase = createClient()
    if (typeof (supabase as any).channel !== 'function') return
    const channel = (supabase as any)
      .channel('notifications-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + userId }, () => refetchNotifications())
      .subscribe()
    return () => { (supabase as any).removeChannel(channel) }
  }, [userId, refetchNotifications])

  // Queries
  const defaultRoleForHome: RoleType = selectedRole || 'healer'
  const defaultMoodForHome: MoodType = selectedMood || 'tired'
  const defaultMoodTextForHome = MOODS.find((m) => m.id === defaultMoodForHome)?.name ?? defaultMoodForHome

  const { data: homeData, isLoading: homeLoading, refetch: refetchHome } = useQuery({
    queryKey: ['homeRecommendation', userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodForHome, homeRefreshKey],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, defaultRoleForHome, defaultMoodTextForHome),
    enabled: screen === 'home',
    retry: 1,
    staleTime: 1000 * 60 * 10,
  })

  const { data: questsData, isLoading: questsLoading } = useQuery({
    queryKey: ['recommendations', userLocation.lat, userLocation.lng, selectedRole, selectedMood],
    queryFn: () => getRecommendations(userLocation.lat, userLocation.lng, selectedRole!, moodTextForApi || ''),
    enabled: !!selectedRole && !!selectedMood && screen === 'quests',
    retry: 1,
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

  // Chat realtime
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
      } catch (_) {}
    }
    if (screen === 'chat' && convId) {
      setChatLoading(true)
      loadMessages().finally(() => setChatLoading(false))
      const supabase = createClient()
      if (typeof (supabase as any).channel === 'function') {
        const channel = (supabase as any)
          .channel('messages-' + convId)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + convId }, () => loadMessages())
          .subscribe()
        return () => (supabase as any).removeChannel(channel)
      }
      timer = setInterval(loadMessages, 5000)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [screen, currentConversation?.id])

  // ── Actions ──
  const finishOnboarding = () => {
    try { localStorage.setItem('wherehere_onboarded', 'true') } catch (_) {}
    setShowOnboarding(false)
  }

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

  const searchFriends = async () => {
    if (!friendQuery.trim()) { setFriendSearchResults([]); return }
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
        refetchFeed()
        setFriendSearchResults((prev) => prev.map((u) => (u.user_id === targetUserId ? { ...u, is_following: !isFollowing } : u)))
      }
    } catch (_) {}
  }

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
    } catch (_) {}
  }

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || !currentConversation?.id) return
    setChatInput('')
    try {
      await fetch(`${API_BASE}/api/v1/social/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: currentConversation.id, sender_id: userId, body: text }),
      })
      setChatMessages((prev) => [...prev, {
        id: `local-${Date.now()}`,
        conversation_id: currentConversation.id,
        sender_id: userId,
        body: text,
        created_at: new Date().toISOString(),
      }])
    } catch (_) {}
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

        setReviewData({ rating: 0, review: '', photos: [] })
        setUploadedPhotos([])
        setCheckInTime(null)
        setMissionStates({})
        setCurrentMissions([])
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

  const handleShare = async (platform: string) => {
    const shareTitle = `${acceptedQuest?.name || '멋진 장소'}를 발견했어요!`
    const shareUrl = `${window.location.origin}?quest=${acceptedQuest?.place_id || ''}`
    const placeName = acceptedQuest?.name || '멋진 장소'
    const placeAddress = acceptedQuest?.address || ''
    const placeImage = uploadedPhotos[0] || acceptedQuest?.image_url || ''

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
                link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
              },
              buttons: [{ title: 'WhereHere 열기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }],
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
            .then((data) => { if (data.narrative) setInstagramShareForm((f) => ({ ...f, aiNarrative: data.narrative })) })
            .catch(() => {})
            .finally(() => setInstagramNarrativeLoading(false))
        }
        return
      } else if (platform === 'twitter') {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle + '\n' + placeName)}&url=${encodeURIComponent(shareUrl)}&hashtags=WhereHere,여행,맛집`
        window.open(twitterUrl, '_blank', 'width=600,height=400,scrollbars=yes')
      } else if (platform === 'facebook') {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle + '\n' + placeName + '\n' + placeAddress)}`
        window.open(facebookUrl, '_blank', 'width=600,height=600,scrollbars=yes')
      }
    } catch (error) {
      console.error('공유 실패:', error)
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n${placeName}\n${placeAddress}\n\n${shareUrl}`)
        toast.success('링크가 복사됐어요!')
      } catch {
        toast.info(`이 링크를 복사해주세요: ${shareUrl}`)
      }
    }
  }

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
    if (alreadyClaimed) { toast('이미 수령한 보상이에요.'); return }
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
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ data: { display_name: name, name } })
      if (error) throw new Error(error.message)
      fetch(`${API_BASE}/api/v1/social/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, display_name: name }),
      }).catch(() => {})
      toast.success('이름이 변경되었어요.')
    } catch (_) {
      toast.error('이름 변경에 실패했어요. 다시 시도해주세요.')
      setUserProfile(prev => ({ ...prev, display_name: displayName || undefined }))
    } finally {
      setSavingNickname(false)
    }
  }

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

  const loadFriendCompare = async () => {
    if (!userId || userId === 'user-demo-001') return
    setFriendCompareLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/social/following?user_id=${encodeURIComponent(userId)}&limit=5`)
      const data = await res.json().catch(() => ({ following: [] }))
      const following = data.following || []
      const statsPromises = following.slice(0, 5).map(async (f: any) => {
        try {
          const sr = await fetch(`${API_BASE}/api/v1/users/me/stats?user_id=${encodeURIComponent(f.user_id || f.id)}`)
          const sd = await sr.json().catch(() => ({}))
          return {
            user_id: f.user_id || f.id,
            display_name: f.display_name || f.username || '친구',
            avatar_url: f.avatar_url,
            total_places: sd.total_places_visited ?? 0,
            current_streak: sd.current_streak ?? 0,
            level: sd.level ?? 1,
          }
        } catch { return null }
      })
      const results = (await Promise.all(statsPromises)).filter(Boolean) as any[]
      setFriendCompareData(results)
    } catch (_) {
    } finally {
      setFriendCompareLoading(false)
    }
  }

  const value: AppContextValue = {
    router,
    user,
    userId,
    isLoggedIn,
    signOut,
    screen,
    setScreen,
    selectedRole,
    setSelectedRole,
    selectedMood,
    setSelectedMood,
    acceptedQuest,
    setAcceptedQuest,
    userLocation,
    setUserLocation,
    checkInTime,
    setCheckInTime,
    reviewData,
    setReviewData,
    isDarkMode,
    setIsDarkMode,
    themeMode,
    setThemeMode,
    accentColor,
    setAccentColor,
    bgColor,
    textColor,
    cardBg,
    borderColor,
    accentRgba,
    missionStates,
    setMissionStates,
    currentMissions,
    setCurrentMissions,
    expandedMissionId,
    setExpandedMissionId,
    uploadedPhotos,
    setUploadedPhotos,
    showNotificationSettings,
    setShowNotificationSettings,
    showLocationSettings,
    setShowLocationSettings,
    showPrivacySettings,
    setShowPrivacySettings,
    showHelpSettings,
    setShowHelpSettings,
    showCreatorSettings,
    setShowCreatorSettings,
    installPrompt,
    setInstallPrompt,
    isAppInstalled,
    setIsAppInstalled,
    isIOSDevice,
    placeSuggestionForm,
    setPlaceSuggestionForm,
    placeSuggestionSubmitting,
    placeSuggestionMessage,
    submitPlaceSuggestion,
    arrivalCheckLoading,
    arrivalMessage,
    setArrivalMessage,
    handleArrivalCheck,
    kakaoMapLoaded,
    setKakaoMapLoaded,
    kakaoSdkLoaded,
    setKakaoSdkLoaded,
    routeMapContainerRef,
    homeMapContainerRef,
    showOnboarding,
    setShowOnboarding,
    finishOnboarding,
    narrativeLoading,
    setNarrativeLoading,
    friendQuery,
    setFriendQuery,
    friendSearchResults,
    setFriendSearchResults,
    friendSearchLoading,
    currentConversation,
    setCurrentConversation,
    chatMessages,
    setChatMessages,
    chatLoading,
    chatInput,
    setChatInput,
    demoAccepted,
    setDemoAccepted,
    showLoginGate,
    selectedProfilePost,
    setSelectedProfilePost,
    profileCommentInput,
    setProfileCommentInput,
    userProfile,
    setUserProfile,
    nicknameInput,
    setNicknameInput,
    savingNickname,
    displayName,
    saveNickname,
    refetchUserProfile,
    showInstagramShareModal,
    setShowInstagramShareModal,
    instagramShareForm,
    setInstagramShareForm,
    instagramShareSubmitting,
    setInstagramShareSubmitting,
    instagramNarrativeLoading,
    setInstagramNarrativeLoading,
    feedType,
    setFeedType,
    questCompleteData,
    setQuestCompleteData,
    pendingFeedPost,
    setPendingFeedPost,
    confirmModal,
    setConfirmModal,
    showPremiumModal,
    setShowPremiumModal,
    kakaoAccessToken,
    kakaoFriendsToken,
    setKakaoFriendsToken,
    kakaoTestFriendsError,
    setKakaoTestFriendsError,
    kakaoTestFriends,
    setKakaoTestFriends,
    kakaoTestFriendsLoading,
    setKakaoTestFriendsLoading,
    kakaoTestSentTo,
    setKakaoTestSentTo,
    kakaoTestSendingUuid,
    setKakaoTestSendingUuid,
    showLevelUpModal,
    setShowLevelUpModal,
    levelUpData,
    challengeClaims,
    claimingChallenge,
    claimChallengeReward,
    friendCompareData,
    friendCompareLoading,
    showFriendCompare,
    setShowFriendCompare,
    loadFriendCompare,
    myFriendCode,
    moodTextForApi,
    requiredMissions,
    essentialChecklistCompleted,
    allRequiredCompleted,
    completedMissionCount,
    homeData,
    homeLoading,
    refetchHome,
    homeRefreshKey,
    setHomeRefreshKey,
    questsData,
    questsLoading,
    userStats,
    refetchUserStats,
    profilePosts,
    profilePostComments,
    refetchProfilePostComments,
    notifications,
    unreadCount,
    showNotificationPanel,
    setShowNotificationPanel,
    refetchNotifications,
    feedData,
    feedActivities,
    followingIds,
    refetchFeed,
    searchFriends,
    toggleFollow,
    openChatWithUser,
    sendChatMessage,
    handleCheckIn,
    handleSubmitReview,
    handleShare,
    handlePhotoUpload,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
