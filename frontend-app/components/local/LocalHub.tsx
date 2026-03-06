'use client'

import { useState, useCallback, useEffect } from 'react'
import { LocalMetrics } from './LocalMetrics'
import { LocalComposer } from './LocalComposer'
import { LocalFeed } from './LocalFeed'

type Post = {
  id: string
  type: string
  title: string
  body: string
  rating?: number
  meet_time?: string
  author_id: string
  created_at?: string
}

type LocalHubProps = {
  apiBase: string
  userId: string
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
  areaName: string
  myFriendCode: string
  friendQuery: string
  setFriendQuery: (q: string) => void
  searchFriends: () => void
  friendSearchLoading: boolean
  friendSearchResults: Array<{ user_id: string; display_name?: string; username?: string; avatar_url?: string; code?: string; is_following?: boolean }>
  toggleFollow: (targetUserId: string, isFollowing: boolean) => void
  openChatWithUser: (u: any) => void
  feedActivities: Array<{ id: string; user_id: string; type: string; place_name?: string; xp_earned?: number; content?: string; created_at?: string }>
  onShareKakao: (postOrNull: Post | null) => void
  onShareInstagramCard: (postOrNull: Post | null) => void
  onToast: (msg: string) => void
  BottomNav: React.ReactNode
  userAvatarUrl?: string
  /** Supabase 카카오 로그인 시 provider_token. 있으면 친구 목록/메시지 API에 사용 */
  kakaoAccessToken?: string | null
}

export function LocalHub({
  apiBase,
  userId,
  isDarkMode,
  cardBg,
  borderColor,
  textColor,
  areaName,
  myFriendCode,
  friendQuery,
  setFriendQuery,
  searchFriends,
  friendSearchLoading,
  friendSearchResults,
  toggleFollow,
  openChatWithUser,
  feedActivities,
  onShareKakao,
  onShareInstagramCard,
  onToast,
  BottomNav,
  userAvatarUrl,
  kakaoAccessToken,
}: LocalHubProps) {
  const [topTab, setTopTab] = useState<'neighborhood' | 'friend'>('neighborhood')
  const [subTab, setSubTab] = useState<'home' | 'compose' | 'feed'>('compose')
  const [localPosts, setLocalPosts] = useState<Post[]>([])
  const [localPostsLoaded, setLocalPostsLoaded] = useState(false)
  const [kakaoFriendsOpen, setKakaoFriendsOpen] = useState(false)
  const [kakaoFriendsList, setKakaoFriendsList] = useState<Array<{ id?: string; uuid?: string; profile_nickname?: string; profile_thumbnail_image?: string }>>([])
  const [kakaoFriendsLoading, setKakaoFriendsLoading] = useState(false)
  const [kakaoSendingUuid, setKakaoSendingUuid] = useState<string | null>(null)

  const inviteText = typeof window !== 'undefined'
    ? `${window.location.origin}/\n친구 코드: ${myFriendCode}\n위 코드로 WhereHere 앱에서 나를 찾아줘!`
    : `친구 코드: ${myFriendCode}\n위 코드로 WhereHere 앱에서 나를 찾아줘!`

  const copyInviteAndToast = useCallback(() => {
    try {
      navigator.clipboard.writeText(inviteText)
      onToast('초대 링크가 복사됐어요. 카카오톡에서 친구에게 붙여넣기 하세요.')
    } catch {
      onToast('복사에 실패했어요.')
    }
  }, [inviteText, onToast])

  const openKakaoInvite = useCallback(async () => {
    const kakao = typeof window !== 'undefined' ? (window as any).Kakao : undefined
    const url = typeof window !== 'undefined' ? window.location.origin + '/' : ''
    // 1) 카카오 공유 SDK로 공유 창 열기 (친구 선택 후 보내기 가능)
    if (kakao?.Share?.sendDefault) {
      try {
        await kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: 'WhereHere 초대',
            description: `친구 코드: ${myFriendCode}\n위 코드로 WhereHere 앱에서 나를 찾아줘!`,
            imageUrl: url + 'og.png',
            link: { webUrl: url, mobileWebUrl: url },
          },
        })
        onToast('카카오톡으로 공유했어요.')
        return
      } catch (err) {
        // 공유 취소 등이면 그냥 링크 복사로
      }
    }
    // 2) 카카오 로그인 토큰 있으면 친구 목록 모달 (Supabase provider_token 우선, 없으면 Kakao SDK)
    const token = kakaoAccessToken ?? kakao?.Auth?.getAccessToken?.()
    if (token) {
      setKakaoFriendsLoading(true)
      setKakaoFriendsList([])
      setKakaoFriendsOpen(true)
      try {
        const res = await fetch(`${apiBase}/api/v1/social/kakao-friends`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: token }),
        })
        const data = await res.json().catch(() => ({}))
        const elements = data.elements ?? []
        setKakaoFriendsList(elements)
        if (elements.length === 0) {
          onToast('카카오톡 친구 목록이 비어있거나 권한이 없어요. 초대 링크를 복사해서 보내보세요.')
          copyInviteAndToast()
        }
      } catch {
        onToast('친구 목록을 불러오지 못했어요. 초대 링크를 복사해서 보내보세요.')
        copyInviteAndToast()
      } finally {
        setKakaoFriendsLoading(false)
      }
    } else {
      onToast('카카오로 로그인하면 친구 목록에서 바로 초대할 수 있어요. 지금은 초대 링크를 복사해 드릴게요.')
      copyInviteAndToast()
    }
  }, [apiBase, copyInviteAndToast, kakaoAccessToken, myFriendCode, onToast])

  const sendKakaoInviteToFriend = useCallback(async (friendUuid?: string) => {
    if (!friendUuid) {
      onToast('친구 식별 정보가 없어 전송할 수 없어요.')
      return
    }
    const kakao = typeof window !== 'undefined' ? (window as any).Kakao : undefined
    const token = kakaoAccessToken ?? kakao?.Auth?.getAccessToken?.()
    if (!token) {
      onToast('카카오 로그인 토큰을 찾지 못했어요. 다시 로그인 후 시도해 주세요.')
      copyInviteAndToast()
      return
    }

    const appUrl = typeof window !== 'undefined' ? window.location.origin + '/' : ''
    const text = [
      'WhereHere 초대',
      `친구 코드: ${myFriendCode}`,
      '앱에서 코드 입력하고 바로 친구가 되어 보세요.',
      appUrl,
    ].join('\n')

    setKakaoSendingUuid(friendUuid)
    try {
      const res = await fetch(`${apiBase}/api/v1/social/kakao-friends/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: token,
          receiver_uuid: friendUuid,
          text,
          title: 'WhereHere 열기',
          link_url: appUrl,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.detail || 'send failed')
      }
      onToast('카카오톡으로 초대 메시지를 바로 보냈어요.')
    } catch {
      onToast('바로 전송에 실패했어요. 복사 링크로 대체합니다.')
      copyInviteAndToast()
    } finally {
      setKakaoSendingUuid(null)
    }
  }, [apiBase, copyInviteAndToast, kakaoAccessToken, myFriendCode, onToast])

  const fetchLocalPosts = useCallback(async () => {
    const params = new URLSearchParams({ scope: 'neighborhood', limit: '100' })
    if (areaName) params.set('area_name', areaName)
    const res = await fetch(`${apiBase}/api/v1/local/posts?${params}`)
    const data = await res.json().catch(() => ({ posts: [] }))
    setLocalPosts(data.posts || [])
    setLocalPostsLoaded(true)
    return data.posts || []
  }, [apiBase, areaName])

  const onLocalSuccess = useCallback(() => {
    fetchLocalPosts()
  }, [fetchLocalPosts])

  useEffect(() => {
    if (topTab === 'neighborhood' && !localPostsLoaded) fetchLocalPosts()
  }, [topTab, localPostsLoaded, fetchLocalPosts])

  const gatherings = localPosts.filter((p) => p.type === 'gathering')
  const reviews = localPosts.filter((p) => p.type === 'review' && (p.rating ?? 0) > 0)
  const reviewAvg = reviews.length ? reviews.reduce((s, p) => s + (p.rating ?? 0), 0) / reviews.length : 0

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: isDarkMode ? '#0A0E14' : '#FFFFFF', color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ padding: '60px 20px 120px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>소셜</h2>
          <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>동네 피드와 친구 소식</p>
        </div>

        {/* 탑 탭: 동네 | 친구 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => { setTopTab('neighborhood'); if (!localPostsLoaded) fetchLocalPosts(); setSubTab('home'); }}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: topTab === 'neighborhood' ? '2px solid #E8740C' : `1px solid ${borderColor}`,
              background: topTab === 'neighborhood' ? (isDarkMode ? 'rgba(232,116,12,0.15)' : 'rgba(232,116,12,0.1)') : 'transparent',
              color: textColor,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            동네
          </button>
          <button
            type="button"
            onClick={() => setTopTab('friend')}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              border: topTab === 'friend' ? '2px solid #E8740C' : `1px solid ${borderColor}`,
              background: topTab === 'friend' ? (isDarkMode ? 'rgba(232,116,12,0.15)' : 'rgba(232,116,12,0.1)') : 'transparent',
              color: textColor,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            친구
          </button>
        </div>

        {topTab === 'neighborhood' && (
          <>
            {/* 서브 탭: 홈 | 작성 | 피드 */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {(['home', 'compose', 'feed'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSubTab(t); if (t !== 'compose' && !localPostsLoaded) fetchLocalPosts(); }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: subTab === t ? '1px solid #E8740C' : `1px solid ${borderColor}`,
                    background: subTab === t ? (isDarkMode ? 'rgba(232,116,12,0.2)' : 'rgba(232,116,12,0.08)') : 'transparent',
                    color: textColor,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {t === 'home' ? '홈' : t === 'compose' ? '작성' : '피드'}
                </button>
              ))}
            </div>

            {subTab === 'home' && (
              <LocalMetrics
                areaName={areaName || '내 주변 동네'}
                postCount={localPosts.length}
                gatheringCount={gatherings.length}
                reviewAvg={reviewAvg}
                commentCount={0}
                isDarkMode={isDarkMode}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
              />
            )}

            {subTab === 'compose' && (
              <LocalComposer
                apiBase={apiBase}
                userId={userId}
                areaName={areaName || '내 주변'}
                isDarkMode={isDarkMode}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
                onSuccess={onLocalSuccess}
                onToast={onToast}
              />
            )}

            {subTab === 'feed' && (
              <LocalFeed
                apiBase={apiBase}
                userId={userId}
                scope="neighborhood"
                areaName={areaName}
                isDarkMode={isDarkMode}
                cardBg={cardBg}
                borderColor={borderColor}
                textColor={textColor}
                onShareKakao={(p) => onShareKakao(p)}
                onShareInstagram={(p) => onShareInstagramCard(p)}
                onToast={onToast}
              />
            )}
          </>
        )}

        {topTab === 'friend' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}`, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>내 친구 코드</div>
                  <button
                    type="button"
                    onClick={() => { try { navigator.clipboard.writeText(myFriendCode); onToast('친구 코드가 복사되었어요'); } catch (_) {} }}
                    style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999, border: `1px solid ${borderColor}`, background: 'transparent', cursor: 'pointer', color: textColor }}
                  >
                    복사
                  </button>
                </div>
                <div style={{ fontSize: 20, fontFamily: 'ui-monospace, monospace', letterSpacing: 2 }}>{myFriendCode}</div>
                <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 6 }}>카카오톡/인스타 DM으로 이 코드를 보내서 친구를 초대해 보세요.</div>
              </div>
              <button
                type="button"
                onClick={openKakaoInvite}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 16,
                  border: `1px solid ${borderColor}`,
                  background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FAFAFA',
                  color: textColor,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>💬</span> 카카오 친구에게 초대하기
              </button>
              <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}`, padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>친구 찾기</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input
                    placeholder="닉네임 또는 아이디 일부"
                    value={friendQuery}
                    onChange={(e) => setFriendQuery(e.target.value)}
                    style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, fontSize: 13 }}
                  />
                  <button type="button" onClick={searchFriends} style={{ padding: '10px 14px', borderRadius: 10, border: 'none', background: '#E8740C', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    검색
                  </button>
                </div>
                {friendSearchLoading && <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>검색 중...</p>}
                {!friendSearchLoading && friendQuery.trim() && friendSearchResults.length === 0 && <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>일치하는 사용자를 찾지 못했어요.</p>}
                {!friendSearchLoading && friendSearchResults.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {friendSearchResults.map((u) => (
                      <div key={u.user_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 18, color: '#fff' }}>{(u.display_name || u.username || '친구').slice(0, 1)}</span>}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{u.display_name || u.username || '친구'}</div>
                            <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>@{u.username || 'user'} · 코드 {u.code}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                          <button type="button" onClick={() => toggleFollow(u.user_id, !!u.is_following)} style={{ padding: '6px 12px', borderRadius: 999, border: u.is_following ? `1px solid ${borderColor}` : 'none', background: u.is_following ? 'transparent' : '#E8740C', color: u.is_following ? textColor : '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            {u.is_following ? '팔로잉' : '팔로우'}
                          </button>
                          <button type="button" onClick={() => openChatWithUser(u)} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            채팅
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {feedActivities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                  <p style={{ fontSize: 15, marginBottom: 8 }}>아직 소식이 없어요</p>
                  <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>퀘스트를 완료하거나 친구를 팔로우하면 체크인 소식이 쌓여요</p>
                </div>
              ) : (
                feedActivities.map((a) => (
                  <div key={a.id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                          {a.user_id === userId ? '나' : a.user_id.slice(0, 8) + '…'}님이 {a.place_name || '장소'}에서 체크인했어요
                        </p>
                        {a.xp_earned != null && <span style={{ fontSize: 12, color: '#E8740C', fontWeight: 600 }}>+{a.xp_earned} XP</span>}
                        {a.created_at && <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 6 }}>{new Date(a.created_at).toLocaleString('ko-KR')}</div>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* 카카오 친구 초대 모달 */}
      {kakaoFriendsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setKakaoFriendsOpen(false)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: 20,
              border: `1px solid ${borderColor}`,
              maxWidth: 400,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>카카오 친구에게 초대하기</h3>
              <button type="button" onClick={() => setKakaoFriendsOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: textColor }}>×</button>
            </div>
            <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
              {kakaoFriendsLoading ? (
                <p style={{ textAlign: 'center', color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', fontSize: 14 }}>친구 목록 불러오는 중...</p>
              ) : kakaoFriendsList.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {kakaoFriendsList.map((f) => (
                    <div key={f.uuid || f.id || f.profile_nickname || ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', flexShrink: 0 }}>
                          {f.profile_thumbnail_image ? <img src={f.profile_thumbnail_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 18, color: '#fff' }}>👤</span>}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{f.profile_nickname || '친구'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => sendKakaoInviteToFriend(f.uuid || f.id)}
                        disabled={kakaoSendingUuid === (f.uuid || f.id)}
                        style={{ padding: '8px 14px', borderRadius: 999, border: 'none', background: '#E8740C', color: '#fff', fontSize: 12, fontWeight: 600, cursor: kakaoSendingUuid === (f.uuid || f.id) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: kakaoSendingUuid === (f.uuid || f.id) ? 0.7 : 1 }}
                      >
                        {kakaoSendingUuid === (f.uuid || f.id) ? '전송 중...' : '바로 보내기'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 12 }}>초대 링크를 복사해서 카카오톡으로 보내보세요.</p>
                  <button type="button" onClick={() => { copyInviteAndToast(); setKakaoFriendsOpen(false); }} style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: '#E8740C', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>초대 링크 복사</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {BottomNav}
    </div>
  )
}
