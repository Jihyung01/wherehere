'use client'

import { useState, useEffect } from 'react'

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
}

type Comment = {
  id: string
  post_id: string
  author_id: string
  body: string
  created_at?: string
}

type LocalFeedProps = {
  apiBase: string
  userId: string
  scope: 'neighborhood' | 'following'
  areaName: string
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
  onShareKakao?: (post: Post) => void
  onShareInstagram?: (post: Post) => void
  onToast: (msg: string) => void
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

export function LocalFeed({
  apiBase,
  userId,
  scope,
  areaName,
  isDarkMode,
  cardBg,
  borderColor,
  textColor,
  onShareKakao,
  onShareInstagram,
  onToast,
}: LocalFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState<string | null>(null)

  const fetchPosts = async () => {
    const params = new URLSearchParams({ scope, limit: '50' })
    if (scope === 'neighborhood' && areaName) params.set('area_name', areaName)
    if (scope === 'following') params.set('user_id', userId)
    const res = await fetch(`${apiBase}/api/v1/local/posts?${params}`)
    const data = await res.json().catch(() => ({ posts: [] }))
    setPosts(data.posts || [])
    return data.posts || []
  }

  const fetchComments = async (postId: string) => {
    const res = await fetch(`${apiBase}/api/v1/local/posts/${postId}/comments`)
    const data = await res.json().catch(() => ({ comments: [] }))
    return (data.comments || []) as Comment[]
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPosts().then((list) => {
      if (cancelled) return
      setLoading(false)
      list.forEach((p: Post) => {
        fetchComments(p.id).then((comments) => {
          if (!cancelled) setCommentsByPostId((prev) => ({ ...prev, [p.id]: comments }))
        })
      })
    })
    return () => { cancelled = true }
  }, [scope, areaName, userId, apiBase])

  const addComment = async (postId: string) => {
    const body = (commentInputs[postId] || '').trim()
    if (!body) {
      onToast('댓글을 입력하세요.')
      return
    }
    setSubmittingComment(postId)
    try {
      const res = await fetch(`${apiBase}/api/v1/local/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author_id: userId, body }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success && data.comment) {
        setCommentsByPostId((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }))
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
        onToast('댓글을 남겼어요.')
      } else {
        onToast('댓글 등록에 실패했어요.')
      }
    } catch {
      onToast('네트워크 오류가 났어요.')
    } finally {
      setSubmittingComment(null)
    }
  }

  const typeLabel = (t: string) => (t === 'review' ? '리뷰' : t === 'gathering' ? '모임' : '동네 이야기')

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: textColor }}>피드를 불러오는 중…</div>
    )
  }

  if (posts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
        <p style={{ fontSize: 15, color: textColor }}>아직 게시글이 없어요.</p>
        <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginTop: 8 }}>첫 글을 작성해보세요.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {posts.map((post) => (
        <div key={post.id} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: '#fff' }}>
              {(post as any).author_avatar_url ? (
                <img src={(post as any).author_avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                ((post as any).author_display_name || (post.author_id === userId ? '나' : post.author_id?.slice(0, 1) || '?')).slice(0, 1)
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{(post as any).author_display_name || (post.author_id === userId ? '나' : post.author_id?.slice(0, 8) + '…')}</div>
              <span style={{ fontSize: 11, color: '#E8740C', fontWeight: 600 }}>{typeLabel(post.type)}</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 4, marginBottom: 6, color: textColor }}>{post.title}</h3>
              <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.body}</p>
              {post.image_url && (
                <img src={post.image_url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 8, maxHeight: 200, objectFit: 'cover' }} />
              )}
              {post.rating != null && post.rating > 0 && (
                <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 6 }}>평점 {post.rating} / 5</p>
              )}
              {post.meet_time && (
                <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 4 }}>모임 시간: {post.meet_time}</p>
              )}
              {post.place_name && (
                <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginTop: 4 }}>장소: {post.place_name}</p>
              )}
              <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 8 }}>
                {relativeTime(post.created_at)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {onShareKakao && (
              <button type="button" onClick={() => onShareKakao(post)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 12, cursor: 'pointer' }}>
                카카오 공유
              </button>
            )}
            {onShareInstagram && (
              <button type="button" onClick={() => onShareInstagram(post)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${borderColor}`, background: 'transparent', color: textColor, fontSize: 12, cursor: 'pointer' }}>
                인스타 카드
              </button>
            )}
          </div>
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${borderColor}` }}>
            {(commentsByPostId[post.id] || []).map((c) => (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: 12, color: textColor }}>{c.author_id === userId ? '나' : c.author_id?.slice(0, 8)}</strong>
                <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginLeft: 6 }}>{relativeTime(c.created_at)}</span>
                <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', marginTop: 2 }}>{c.body}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="text"
                placeholder="댓글을 남겨보세요."
                value={commentInputs[post.id] || ''}
                onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                maxLength={160}
                style={{
                  flex: 1,
                  padding: 8,
                  borderRadius: 8,
                  border: `1px solid ${borderColor}`,
                  background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
                  color: textColor,
                  fontSize: 13,
                }}
              />
              <button
                type="button"
                onClick={() => addComment(post.id)}
                disabled={submittingComment === post.id}
                style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#E8740C', color: '#fff', fontWeight: 600, fontSize: 12, cursor: submittingComment === post.id ? 'not-allowed' : 'pointer' }}
              >
                {submittingComment === post.id ? '등록 중…' : '댓글 등록'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
