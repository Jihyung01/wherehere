'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Script from 'next/script'
import { useAppContext, API_BASE } from '@/contexts/AppContext'
import { LocalHub } from '@/components/local/LocalHub'
import { LocalFeed } from '@/components/local/LocalFeed'
import { MOODS } from './constants'
import { MOVEMENT_LABELS, GHOST_LABELS } from '@/hooks/useLocationSharing'
import { makeStoryCard, makeFeedCard, blobToFile, shareOrDownload } from '@/lib/instagram-cards'
import { toast } from 'sonner'

declare global {
  interface Window {
    kakao?: { maps: { load: (cb: () => void) => void; Map: any; LatLng: any; Marker: any; InfoWindow: any; event: { addListener: (target: any, type: string, fn: () => void) => void } } }
  }
}

type SocialTab = 'feed' | 'friends'
export type PlaceToRecommend = { place_name: string; description?: string; image_url?: string; link_url: string }
type SocialScreenProps = {
  BottomNav?: React.ReactNode
  sharedPostId?: string | null
  /** 장소 추천 플로우: 설정 시 소셜 탭에서 친구 목록 모달을 연다 */
  placeToRecommendForKakao?: PlaceToRecommend | null
  onCloseRecommendPlace?: () => void
}

interface FriendActivity {
  user_id: string
  display_name?: string
  avatar_url?: string
  place_name?: string
  place_id?: string
  action_type?: string
  created_at?: string
  activity_data?: Record<string, unknown>
}

function timeAgoFriend(iso?: string): string {
  if (!iso) return ''
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

export function SocialScreen({ BottomNav, sharedPostId, placeToRecommendForKakao, onCloseRecommendPlace }: SocialScreenProps = {}) {
  const [socialTab, setSocialTab] = useState<SocialTab>('feed')
  const [friendActivities, setFriendActivities] = useState<FriendActivity[]>([])
  const [friendActLoading, setFriendActLoading] = useState(false)
  /** 친구 위치/피드에서 프로필 클릭 시 → 해당 친구 프로필 피드 모달 */
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<{ user_id: string; display_name?: string; avatar_url?: string } | null>(null)

  const {
    isDarkMode,
    bgColor,
    // Zenly realtime
    userLocation,
    friendLocations,
    locationIsConnected,
    movementStatus,
    speedKmh,
    ghostLevel,
    locationSharingEnabled,
    textColor,
    cardBg,
    borderColor,
    accentColor,
    accentRgba,
    isLoggedIn,
    userId,
    feedActivities,
    myFriendCode,
    friendQuery,
    setFriendQuery,
    searchFriends,
    friendSearchLoading,
    friendSearchResults,
    toggleFollow,
    openChatWithUser,
    setScreen,
    setAcceptedQuest,
    userProfile,
    kakaoAccessToken,
    kakaoFriendsToken,
    setKakaoFriendsToken,
    showInstagramShareModal,
    setShowInstagramShareModal,
    instagramShareForm,
    setInstagramShareForm,
    instagramShareSubmitting,
    setInstagramShareSubmitting,
    instagramNarrativeLoading,
    setInstagramNarrativeLoading,
    acceptedQuest,
    selectedRole,
    selectedMood,
  } = useAppContext() as any

  const kakaoJsKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '160238a590f3d2957230d764fb745322'
  const friendsMapContainerRef = useRef<HTMLDivElement>(null)
  const [kakaoFriendsMapLoaded, setKakaoFriendsMapLoaded] = useState(false)

  // 친구 위치 지도: 내 위치 + 친구들 마커
  useEffect(() => {
    if (socialTab !== 'friends' || !kakaoFriendsMapLoaded || !friendsMapContainerRef.current || !window.kakao?.maps) return
    const el = friendsMapContainerRef.current
    const me = userLocation || { lat: 37.5665, lng: 126.978 }
    const friends = friendLocations || []
    const hasAny = friends.length > 0
    const centerLat = hasAny ? (me.lat + friends.reduce((s, f) => s + f.lat, 0)) / (1 + friends.length) : me.lat
    const centerLng = hasAny ? (me.lng + friends.reduce((s, f) => s + f.lng, 0)) / (1 + friends.length) : me.lng
    while (el.firstChild) el.removeChild(el.firstChild)
    try {
      const map = new window.kakao.maps.Map(el, {
        center: new window.kakao.maps.LatLng(centerLat, centerLng),
        level: hasAny ? 5 : 7,
      })
      const kakao = window.kakao.maps
      new kakao.Marker({
        position: new kakao.LatLng(me.lat, me.lng),
        map,
        title: '나',
      })
      friends.forEach((f) => {
        const pos = new kakao.LatLng(f.lat, f.lng)
        const marker = new kakao.Marker({
          position: pos,
          map,
          title: f.display_name || f.user_id?.slice(0, 8) || '친구',
        })
        const content = `<div style="padding:8px 10px;min-width:100px;background:#fff;color:#1f2937;border-radius:8px;border:1px solid #E8740C;font-size:12px;font-weight:600;">${(f.display_name || '친구').replace(/</g, '&lt;')}</div>`
        const infowindow = new kakao.InfoWindow({ content })
        window.kakao.maps.event.addListener(marker, 'click', () => { infowindow.open(map, marker) })
      })
      if (map.relayout) setTimeout(() => map.relayout(), 300)
    } catch (err) {
      console.warn('[친구 위치 지도] init error:', err)
    }
  }, [socialTab, kakaoFriendsMapLoaded, userLocation?.lat, userLocation?.lng, friendLocations])

  // 친구 최근 활동(체크인) 조회
  const loadFriendActivities = useCallback(async () => {
    if (!userId || userId === 'user-demo-001') return
    setFriendActLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/local/posts?area=all&limit=50&user_id=${userId}`)
      if (!res.ok) return
      const data = await res.json()
      const posts: any[] = data.posts || data || []
      // checkin 타입만 필터링
      const checkins = posts.filter((p: any) => p.type === 'checkin' || p.action_type === 'checkin')
      setFriendActivities(checkins.slice(0, 30))
    } catch { /* silent */ } finally {
      setFriendActLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (socialTab === 'friends') loadFriendActivities()
  }, [socialTab, loadFriendActivities])

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
                reader.onloadend = () => setInstagramShareForm((f: any) => ({ ...f, image_url: reader.result as string }))
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
          <input placeholder="제목" value={instagramShareForm.title} onChange={(e) => setInstagramShareForm((f: any) => ({ ...f, title: e.target.value }))} style={{ width: '100%', padding: '10px 12px', marginBottom: 12, borderRadius: 10, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB', color: textColor, fontSize: 14, fontWeight: 600, boxSizing: 'border-box' }} />

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
                  const moodText = selectedMood ? (MOODS.find((m: any) => m.id === selectedMood)?.name ?? selectedMood) : undefined
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
                    .then((data) => { if (data.narrative) setInstagramShareForm((f: any) => ({ ...f, aiNarrative: data.narrative })) })
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
              onChange={(e) => setInstagramShareForm((f: any) => ({ ...f, aiNarrative: e.target.value }))}
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
              onChange={(e) => setInstagramShareForm((f: any) => ({ ...f, userReview: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F9FAFB', color: textColor, fontSize: 13, resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
            />
          </div>

          {/* 평점 */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: textColor, marginBottom: 6 }}>⭐ 평점</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1,2,3,4,5].map((star) => (
                <button key={star} type="button" onClick={() => setInstagramShareForm((f: any) => ({ ...f, rating: star }))}
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
                await shareOrDownload({ file, caption, filename: 'wherehere-story.png', onToast: (m: string) => { toast.success(m); setShowInstagramShareModal(false) } })
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
                await shareOrDownload({ file, caption, filename: 'wherehere-feed.png', onToast: (m: string) => { toast.success(m); setShowInstagramShareModal(false) } })
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

  // 친구 위치 탭 UI (Supabase Realtime Presence + 지도 마커 + 폴백 체크인 피드)
  const FriendLocationsTab = () => {
    // Realtime 연결된 사용자 (채널에 있는 모든 사용자)
    const realtimeFriends: any[] = friendLocations || []
    // 폴백: 최근 체크인 피드 (Realtime 친구 없을 때만)
    const fallbackList = realtimeFriends.length === 0 ? friendActivities : []

    return (
      <div style={{ padding: '16px 16px 120px', minHeight: '100vh', background: bgColor }}>
        {/* 카카오맵: 내 위치 + 친구 위치 마커 */}
        {socialTab === 'friends' && (
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&autoload=false`}
            strategy="afterInteractive"
            onLoad={() => {
              if (typeof window !== 'undefined' && window.kakao?.maps?.load) {
                window.kakao.maps.load(() => setKakaoFriendsMapLoaded(true))
              } else if (window.kakao?.maps) {
                setKakaoFriendsMapLoaded(true)
              }
            }}
          />
        )}
        {/* 지도 영역: 내 위치 + 친구 마커 */}
        <div style={{ position: 'relative', width: '100%', height: 280, marginBottom: 16 }}>
          <div
            ref={friendsMapContainerRef}
            style={{
              width: '100%',
              height: 280,
              borderRadius: 16,
              overflow: 'hidden',
              border: `1px solid ${borderColor}`,
              background: isDarkMode ? '#1a1d24' : '#e5e7eb',
            }}
          />
          {!kakaoFriendsMapLoaded && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)', color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#6b7280', fontSize: 14 }}>
              지도 로딩 중...
            </div>
          )}
        </div>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: textColor, marginBottom: 2 }}>친구 위치</div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }}>
              {locationIsConnected ? '실시간 연결됨' : '연결 중...'}
            </div>
          </div>
          {/* 내 상태 뱃지 */}
          {locationSharingEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6', border: `1px solid ${borderColor}` }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: locationIsConnected ? '#10B981' : '#F59E0B' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>
                {(MOVEMENT_LABELS as any)[movementStatus] || '🟢 정지'}
              </span>
              {speedKmh !== null && speedKmh > 0 && (
                <span style={{ fontSize: 10, color: accentColor, fontWeight: 600 }}>{speedKmh}km/h</span>
              )}
            </div>
          )}
        </div>

        {/* 연결 상태 배너 */}
        {!locationIsConnected && (
          <div style={{ padding: '10px 14px', marginBottom: 14, background: isDarkMode ? 'rgba(245,158,11,0.1)' : '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#92400E' }}>
            🔄 Supabase Realtime 연결 중... 앱을 새로고침하거나 잠시 기다려주세요
          </div>
        )}

        {/* Realtime 친구 목록 */}
        {realtimeFriends.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              지금 온라인 · {realtimeFriends.length}명
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {realtimeFriends.map((f) => {
                const ghostInfo = (GHOST_LABELS as any)[f.ghost_level] || GHOST_LABELS.visible
                const movLabel = (MOVEMENT_LABELS as any)[f.movement_status] || '🟢 정지'
                const isBlurred = f.ghost_level === 'blur'
                const isFrozen = f.ghost_level === 'frozen'
                const minsAgo = Math.floor((Date.now() - new Date(f.online_at).getTime()) / 60000)

                return (
                  <div
                    key={f.user_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedFriendProfile({ user_id: f.user_id, display_name: f.display_name, avatar_url: f.avatar_url })}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedFriendProfile({ user_id: f.user_id, display_name: f.display_name, avatar_url: f.avatar_url })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 14px', borderRadius: 16,
                      background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fff',
                      border: `1.5px solid ${isDarkMode ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.15)'}`,
                      boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    {/* 아바타 */}
                    <div style={{ width: 46, height: 46, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', fontWeight: 700, flexShrink: 0, filter: isBlurred ? 'blur(3px)' : 'none' }}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (f.display_name || '?').slice(0, 1).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>
                          @{f.display_name}
                        </span>
                        {isFrozen && <span style={{ fontSize: 10, color: '#6366F1', background: 'rgba(99,102,241,0.12)', padding: '1px 6px', borderRadius: 999 }}>🧊 고정됨</span>}
                        {isBlurred && <span style={{ fontSize: 10, color: '#8B5CF6', background: 'rgba(139,92,246,0.12)', padding: '1px 6px', borderRadius: 999 }}>🌫️ 흐림</span>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                          {movLabel}
                        </span>
                        {f.speed_kmh != null && f.speed_kmh > 0 && (
                          <span style={{ fontSize: 11, color: accentColor, fontWeight: 600 }}>{f.speed_kmh}km/h</span>
                        )}
                        <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>
                          {minsAgo < 1 ? '방금' : `${minsAgo}분 전`}
                        </span>
                      </div>

                      {/* 위치 표시 (흐림이면 대략적으로) */}
                      {!isBlurred && (
                        <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 2 }}>
                          📍 {f.lat.toFixed(3)}, {f.lng.toFixed(3)}
                        </div>
                      )}
                      {isBlurred && (
                        <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 2 }}>
                          📍 위치 흐림 처리됨
                        </div>
                      )}
                    </div>

                    {/* 라이브 닷 */}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.22)' }} />
                      <span style={{ fontSize: 8, fontWeight: 700, color: '#10B981' }}>LIVE</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* 폴백: 최근 체크인 피드 */}
        {fallbackList.length > 0 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              최근 체크인
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fallbackList.map((act, i) => (
                <div
                  key={(act.user_id || '') + i}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedFriendProfile({ user_id: act.user_id || '', display_name: act.display_name, avatar_url: act.avatar_url })}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedFriendProfile({ user_id: act.user_id || '', display_name: act.display_name, avatar_url: act.avatar_url })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${borderColor}`, cursor: 'pointer' }}
                >
                  <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                    {act.avatar_url
                      ? <img src={act.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (act.display_name || '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: textColor, marginBottom: 2 }}>@{act.display_name || act.user_id?.slice(0, 8) || '사용자'}</div>
                    {act.place_name && <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.65)' : '#374151', marginBottom: 1 }}>📍 {act.place_name}</div>}
                    <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>{timeAgoFriend(act.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 빈 상태 */}
        {realtimeFriends.length === 0 && fallbackList.length === 0 && !friendActLoading && (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderRadius: 16, border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>👻</div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>온라인 친구가 없어요</div>
            <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#9CA3AF', lineHeight: 1.7, marginBottom: 12 }}>
              친구도 WhereHere 앱을 켜서 위치 공유를 활성화하면 여기서 실시간으로 보여요.
            </div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF', lineHeight: 1.6 }}>
              현재는 앱을 켜 둔 상태에서만 위치가 공유돼요.
            </div>
          </div>
        )}

        {/* 내 고스트 상태 힌트 */}
        <div style={{ marginTop: 20, padding: '10px 14px', background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB', borderRadius: 10, border: `1px solid ${borderColor}`, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{(GHOST_LABELS as any)[ghostLevel]?.icon || '👁️'}</span>
          <span>내 상태: {(GHOST_LABELS as any)[ghostLevel]?.label || '위치 공유 중'} · 설정에서 변경하세요</span>
        </div>

        {BottomNav}
      </div>
    )
  }

  return (
    <div>
      {/* 상단 탭 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: isDarkMode ? 'rgba(10,14,20,0.96)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${borderColor}`,
        display: 'flex', padding: '0 16px',
      }}>
        {([
          { id: 'feed' as SocialTab, label: '동네 피드', icon: '💬' },
          { id: 'friends' as SocialTab, label: '친구 위치', icon: '📍' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setSocialTab(t.id)}
            style={{
              flex: 1, padding: '14px 0', background: 'none', border: 'none',
              fontSize: 14, fontWeight: socialTab === t.id ? 700 : 500,
              color: socialTab === t.id ? accentColor : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF'),
              cursor: 'pointer',
              borderBottom: socialTab === t.id ? `2px solid ${accentColor}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {socialTab === 'friends' ? (
        <FriendLocationsTab />
      ) : (
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
        onToast={(msg: string) => toast(msg)}
        BottomNav={BottomNav}
        userAvatarUrl={userProfile?.profile_image_url}
        kakaoAccessToken={kakaoAccessToken}
        kakaoFriendsToken={kakaoFriendsToken}
        accentColor={accentColor}
        sharedPostId={sharedPostId}
        onAcceptQuest={(post: any) => {
          // 피드에서 "나도 도전" 클릭 → 해당 장소로 퀘스트 수락 화면 이동
          const questFromFeed = {
            name: post.place_name || post.title || '장소',
            address: post.place_address || '',
            place_id: `feed-${Date.now()}`,
            category: '기타',
            reason: `피드에서 도전! ${post.title || ''}`,
            narrative: `피드에서 ${post.place_name || '이 장소'}에 도전을 시작했어요.`,
          }
          setAcceptedQuest(questFromFeed)
          setScreen('accepted')
          toast(`🚀 ${questFromFeed.name} 도전 시작!`)
        }}
        placeToRecommend={placeToRecommendForKakao ?? undefined}
        onCloseRecommendPlace={onCloseRecommendPlace}
        onKakaoFriendsToken={(token) => setKakaoFriendsToken(token)}
      />
      {instagramShareModalEl}
        </div>
      )}

      {/* 친구 프로필 피드 모달 — 친구 위치/폴백에서 프로필 클릭 시 */}
      {selectedFriendProfile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: isDarkMode ? '#0D1117' : '#F9FAFB', display: 'flex', flexDirection: 'column', fontFamily: 'Pretendard, sans-serif' }}>
          <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12, background: cardBg }}>
            <button type="button" onClick={() => setSelectedFriendProfile(null)} style={{ padding: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 20 }}>←</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff', flexShrink: 0 }}>
                {selectedFriendProfile.avatar_url ? <img src={selectedFriendProfile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (selectedFriendProfile.display_name || selectedFriendProfile.user_id?.slice(0, 1) || '?').slice(0, 1)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: textColor }}>{selectedFriendProfile.display_name || selectedFriendProfile.user_id?.slice(0, 8) + '…'}</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>프로필 피드</div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <LocalFeed
              apiBase={API_BASE}
              userId={userId}
              scope="user"
              authorId={selectedFriendProfile.user_id}
              areaName=""
              isDarkMode={isDarkMode}
              cardBg={cardBg}
              borderColor={borderColor}
              textColor={textColor}
              accentColor={accentColor}
              onShareKakao={sharePostText}
              onShareInstagram={sharePostInstagramCard}
              onAcceptQuest={(post: any) => {
                const q = { name: post.place_name || post.title || '장소', address: post.place_address || '', place_id: `feed-${Date.now()}`, category: '기타', reason: post.body || '', narrative: post.body || '' }
                setAcceptedQuest(q)
                setScreen('accepted')
                toast(`🚀 ${q.name} 도전 시작!`)
              }}
              onAuthorClick={(authorId, displayName, avatarUrl) => {
                if (authorId !== selectedFriendProfile.user_id) setSelectedFriendProfile({ user_id: authorId, display_name: displayName, avatar_url: avatarUrl })
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
