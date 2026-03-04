'use client'

import { useState } from 'react'

type LocalComposerProps = {
  apiBase: string
  userId: string
  areaName: string
  placeName?: string
  placeAddress?: string
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
  onSuccess: () => void
  onToast: (msg: string) => void
}

export function LocalComposer({
  apiBase,
  userId,
  areaName,
  placeName,
  placeAddress,
  isDarkMode,
  cardBg,
  borderColor,
  textColor,
  onSuccess,
  onToast,
}: LocalComposerProps) {
  const [type, setType] = useState<'story' | 'review' | 'gathering'>('story')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [rating, setRating] = useState(0)
  const [meetTime, setMeetTime] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const inputStyle = {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    border: `1px solid ${borderColor}`,
    background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
    color: textColor,
    fontSize: 14,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      onToast('제목과 내용을 입력하세요.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/local/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: userId,
          type,
          title: title.trim(),
          body: body.trim(),
          rating: type === 'review' ? rating : 0,
          meet_time: type === 'gathering' ? meetTime.trim() : undefined,
          image_url: imageUrl.trim() || undefined,
          place_name: placeName,
          place_address: placeAddress,
          area_name: areaName || '내 주변',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        setTitle('')
        setBody('')
        setRating(0)
        setMeetTime('')
        setImageUrl('')
        onToast('동네 피드에 올렸어요.')
        onSuccess()
      } else {
        onToast('작성에 실패했어요.')
      }
    } catch {
      onToast('네트워크 오류가 났어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}`, padding: 16 }}>
      <p style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 8 }}>CREATE POST</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['story', 'review', 'gathering'] as const).map((t) => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} />
              <span style={{ fontSize: 13, color: textColor }}>{t === 'story' ? '동네 이야기' : t === 'review' ? '리뷰' : '모임'}</span>
            </label>
          ))}
        </div>
        {type === 'review' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: textColor }}>별점</span>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={inputStyle}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n === 0 ? '선택' : `${n}점`}</option>
              ))}
            </select>
          </label>
        )}
        <input
          type="text"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          style={inputStyle}
          required
        />
        <textarea
          placeholder="내용"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={600}
          style={{ ...inputStyle, resize: 'vertical' }}
          required
        />
        {type === 'gathering' && (
          <input
            type="text"
            placeholder="모임 시간 (예: 오늘 8시)"
            value={meetTime}
            onChange={(e) => setMeetTime(e.target.value)}
            maxLength={40}
            style={inputStyle}
          />
        )}
        <input
          type="text"
          placeholder="이미지 URL (선택)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: 14,
            borderRadius: 12,
            border: 'none',
            background: '#E8740C',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '올리는 중…' : '동네 피드에 올리기'}
        </button>
      </form>
    </div>
  )
}
