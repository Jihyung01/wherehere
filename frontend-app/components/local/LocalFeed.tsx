'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

type Post = {
  id: string
  type: string
  title: string
  body: string
  rating?: number
  meet_time?: string
  image_url?: string
  place_name?: string
  place_address?: string
  author_id: string
  area_name?: string
  created_at?: string
  like_count?: number
  liked_by_me?: boolean
}

type Comment = {
  id: string
  post_id: string
  author_id: string
  body: string
  created_at?: string
}

type FeedType = 'all' | 'hot' | 'gathering' | 'review'

type LocalFeedProps = {
  apiBase: string
  userId: string
  scope: 'neighborhood' | 'following'
  areaName: string
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
  feedType?: FeedType
  onShareKakao?: (post: Post) => void
  onShareInstagram?: (post: Post) => void
  onPlaceFilter?: (placeName: string) => void
}

function relativeTime(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const min = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000))
  if (min < 60) return `${min}분 전`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.round(h / 24)}일 전`
}

const PAGE_SIZE = 20

export function LocalFeed({
  apiBase, userId, scope, areaName,
  isDarkMode, cardBg, borderColor, textColor,
  feedType = 'all',
  onShareKakao, onShareInstagram, onPlaceFilter,
}: LocalFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)
  const [likingPost, setLikingPost] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)

  const fetchPosts = useCallback(async (pageNum: number, replace = false) => {
    const params = new URLSearchParams({
      scope,
      limit: String(PAGE_SIZE),
      offset: String(pageNum * PAGE_SIZE),
    })
    if (scope === 'neighborhood' && areaName) params.set('area_name', areaName)
    if (scope === 'following') params.set('user_id', userId)
    if (userId) params.set('user_id', userId)
    if (feedType === 'gathering') params.set('type', 'gathering')
    if (feedType === 'review') params.set('type', 'review')

    const res = await fetch(`${apiBase}/api/v1/local/posts?${params}`)
    const data = await res.json().catch(() => ({ posts: [] }))
    let list: Post[] = data.posts || []

    // 핫플 정렬: 좋아요+댓글 내림차순
    if (feedType === 'hot') {
      list = [...list].sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
    }

    if (replace) {
      setPosts(list)
    } else {
      setPosts(prev => [...prev, ...list])
    }
    setHasMore(list.length === PAGE_SIZE)
    return list
  }, [apiBase, scope, areaName, userId, feedType])

  const fetchComments = async (postId: string) => {
    const res = await fetch(`${apiBase}/api/v1/local/posts/${postId}/comments`)
    const data = await res.json().catch(() => ({ comments: [] }))
    return (data.comments || []) as Comment[]
  }

  // 초기 로드 & feedType/scope 변경 시 리셋
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPage(0)
    setPosts([])
    fetchPosts(0, true).then((list) => {
      if (cancelled) return
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [scope, areaName, userId, apiBase, feedType])

  // 무한스크롤 Intersection Observer
  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          setLoadingMore(true)
          fetchPosts(nextPage).finally(() => setLoadingMore(false))
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, loading, page, fetchPosts])

  const addComment = async (postId: string) => {
    const body = (commentInputs[postId] || '').trim()
    if (!body) { toast.error('댓글을 입력하세요.'); return }
    setSubmittingComment(postId)
    try {
      const res = await fetch(`${apiBase}/api/v1/local/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_id: userId, body }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success && data.comment) {
        setCommentsByPostId(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data.comment] }))
        setCommentInputs(prev => ({ ...prev, [postId]: '' }))
        toast.success('댓글을 남겼어요.')
      } else {
        toast.error('댓글 등록에 실패했어요.')
      }
    } catch {
      toast.error('네트워크 오류가 났어요.')
    } finally {
      setSubmittingComment(null)
    }
  }

  const toggleLike = async (post: Post) => {
    if (likingPost === post.id) return
    setLikingPost(post.id)
    // 낙관적 업데이트
    const wasLiked = post.liked_by_me
    setPosts(prev => prev.map(p => p.id === post.id ? {
      ...p,
      liked_by_me: !wasLiked,
      like_count: (p.like_count || 0) + (wasLiked ? -1 : 1),
    } : p))
    try {
      const res = await fetch(`${apiBase}/api/v1/local/posts/${post.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json().catch(() => null)
      if (data) {
        setPosts(prev => prev.map(p => p.id === post.id ? {
          ...p, liked_by_me: data.liked, like_count: data.like_count,
        } : p))
      }
    } catch {
      // 실패 시 롤백
      setPosts(prev => prev.map(p => p.id === post.id ? {
        ...p, liked_by_me: wasLiked, like_count: post.like_count,
      } : p))
    } finally {
      setLikingPost(null)
    }
  }

  const toggleComments = async (postId: string) => {
    const isOpen = openComments[postId]
    setOpenComments(prev => ({ ...prev, [postId]: !isOpen }))
    if (!isOpen && !commentsByPostId[postId]) {
      const comments = await fetchComments(postId)
      setCommentsByPostId(prev => ({ ...prev, [postId]: comments }))
    }
  }

  const typeLabel = (t: string) => t === 'review' ? '리뷰' : t === 'gathering' ? '모임' : '동네 이야기'
  const typeColor = (t: string) => t === 'review' ? '#E8740C' : t === 'gathering' ? '#8B5CF6' : '#10B981'

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 16,
            animation: 'pulse 1.5s ease infinite',
          }}>
            <div style={{ height: 16, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6', borderRadius: 8, marginBottom: 10, width: '60%' }} />
            <div style={{ height: 12, background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB', borderRadius: 8, width: '40%' }} />
          </div>
        ))}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          {feedType === 'hot' ? '🔥' : feedType === 'gathering' ? '👥' : feedType === 'review' ? '⭐' : '📭'}
        </div>
        <p style={{ fontSize: 15, color: textColor, fontWeight: 600 }}>
          {feedType === 'hot' ? '아직 핫플이 없어요' : '아직 게시글이 없어요.'}
        </p>
        <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 6 }}>첫 글을 작성해보세요!</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {posts.map((post) => {
        const photos = post.image_url
          ? post.image_url.split(',').map(u => u.trim()).filter(Boolean)
          : []
        const commentCount = (commentsByPostId[post.id] || []).length
        const isCommentsOpen = openComments[post.id]

        return (
          <div key={post.id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: 'linear-gradient(135deg, #E8740C, #F59E0B)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: '#fff',
                }}>
                  {(post as any).author_avatar_url
                    ? <img src={(post as any).author_avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : ((post as any).author_display_name || (post.author_id === userId ? '나' : post.author_id?.slice(0, 1) || '?')).slice(0, 1)
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
                    {(post as any).author_display_name || (post.author_id === userId ? '나' : post.author_id?.slice(0, 8) + '…')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: typeColor(post.type), fontWeight: 600, background: `${typeColor(post.type)}18`, padding: '2px 8px', borderRadius: 20 }}>
                      {typeLabel(post.type)}
                    </span>
                    {post.area_name && (
                      <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>· {post.area_name}</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF', whiteSpace: 'nowrap' }}>
                  {relativeTime(post.created_at)}
                </div>
              </div>

              {/* Title & Body */}
              <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor, marginBottom: 6, lineHeight: 1.4 }}>{post.title}</h3>
              {post.body && (
                <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.75)' : '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.65, marginBottom: 10 }}>
                  {post.body}
                </p>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: photos.length === 1 ? '1fr' : photos.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
                  gap: 4, marginBottom: 10, borderRadius: 10, overflow: 'hidden',
                }}>
                  {photos.slice(0, 6).map((src, i) => (
                    <div key={i} style={{ position: 'relative', paddingTop: photos.length === 1 ? '56%' : '100%', background: isDarkMode ? '#1a1a1a' : '#f3f4f6' }}>
                      <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      {photos.length > 6 && i === 5 && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                          +{photos.length - 6}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {post.rating != null && post.rating > 0 && (
                  <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>
                    {'⭐'.repeat(Math.round(post.rating))} {post.rating}/5
                  </span>
                )}
                {post.meet_time && (
                  <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>🕐 {post.meet_time}</span>
                )}
                {post.place_name && (
                  <button
                    type="button"
                    onClick={() => onPlaceFilter?.(post.place_name!)}
                    style={{
                      fontSize: 12, color: '#E8740C', fontWeight: 600,
                      background: 'rgba(232,116,12,0.1)', padding: '2px 8px', borderRadius: 20,
                      border: 'none', cursor: onPlaceFilter ? 'pointer' : 'default',
                    }}
                  >
                    📍 {post.place_name}
                  </button>
                )}
              </div>

              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingTop: 10, borderTop: `1px solid ${borderColor}` }}>
                {/* 좋아요 */}
                <button
                  type="button"
                  onClick={() => toggleLike(post)}
                  disabled={likingPost === post.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, border: 'none',
                    background: post.liked_by_me ? 'rgba(239,68,68,0.12)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18, filter: post.liked_by_me ? 'none' : 'grayscale(1)', transition: 'transform 0.15s', transform: likingPost === post.id ? 'scale(1.3)' : 'scale(1)' }}>
                    {post.liked_by_me ? '❤️' : '🤍'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: post.liked_by_me ? '#EF4444' : (isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280') }}>
                    {post.like_count || 0}
                  </span>
                </button>

                {/* 댓글 */}
                <button
                  type="button"
                  onClick={() => toggleComments(post.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 20, border: 'none',
                    background: isCommentsOpen ? (isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6') : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 16 }}>💬</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>
                    {commentCount || 0}
                  </span>
                </button>

                <div style={{ flex: 1 }} />

                {onShareKakao && (
                  <button type="button" onClick={() => onShareKakao(post)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 11, cursor: 'pointer' }}>
                    카카오
                  </button>
                )}
                {onShareInstagram && (
                  <button type="button" onClick={() => onShareInstagram(post)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 11, cursor: 'pointer' }}>
                    인스타
                  </button>
                )}
              </div>
            </div>

            {/* 댓글 영역 */}
            {isCommentsOpen && (
              <div style={{ padding: '12px 16px 16px', borderTop: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)' }}>
                {(commentsByPostId[post.id] || []).map((c) => (
                  <div key={c.id} style={{ marginBottom: 10, display: 'flex', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#E8740C,#F59E0B)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
                      {(c.author_id === userId ? '나' : c.author_id?.slice(0, 1) || '?')}
                    </div>
                    <div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
                        <strong style={{ fontSize: 12, color: textColor }}>{c.author_id === userId ? '나' : c.author_id?.slice(0, 8)}</strong>
                        <span style={{ fontSize: 10, color: isDarkMode ? 'rgba(255,255,255,0.35)' : '#9CA3AF' }}>{relativeTime(c.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', marginTop: 2, lineHeight: 1.5 }}>{c.body}</p>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="댓글을 남겨보세요."
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(post.id) } }}
                    maxLength={160}
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: 20,
                      border: `1px solid ${borderColor}`,
                      background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff',
                      color: textColor, fontSize: 13, outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => addComment(post.id)}
                    disabled={submittingComment === post.id}
                    style={{
                      padding: '8px 16px', borderRadius: 20, border: 'none',
                      background: '#E8740C', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {submittingComment === post.id ? '…' : '등록'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* 무한스크롤 트리거 */}
      <div ref={loaderRef} style={{ padding: 8, textAlign: 'center' }}>
        {loadingMore && <span style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>불러오는 중…</span>}
        {!hasMore && posts.length > 0 && (
          <span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.25)' : '#D1D5DB' }}>모든 게시글을 불러왔어요</span>
        )}
      </div>
    </div>
  )
}
