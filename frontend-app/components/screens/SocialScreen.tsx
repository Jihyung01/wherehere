'use client'

import React from 'react'
import { useAppContext, API_BASE } from '@/contexts/AppContext'
import { LocalHub } from '@/components/local/LocalHub'
import { MOODS } from './constants'
import { makeStoryCard, makeFeedCard, blobToFile, shareOrDownload } from '@/lib/instagram-cards'
import { toast } from 'sonner'

type SocialScreenProps = { BottomNav?: React.ReactNode; sharedPostId?: string | null }

export function SocialScreen({ BottomNav, sharedPostId }: SocialScreenProps = {}) {
  const {
    isDarkMode,
    bgColor,
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
        onToast={(msg: string) => toast(msg)}
        BottomNav={BottomNav}
        userAvatarUrl={userProfile?.profile_image_url}
        kakaoAccessToken={kakaoAccessToken}
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
      />
      {instagramShareModalEl}
    </div>
  )
}
