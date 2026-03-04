'use client'

import { useState } from 'react'
import { compressImageFile } from '@/lib/image-compress'

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
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const compressed = await compressImageFile(file)
      const form = new FormData()
      form.append('file', compressed)
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${base}/api/upload`, { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        setImageUrl(data.url)
        onToast('사진이 추가됐어요.')
      } else {
        onToast(data.error || '사진 업로드에 실패했어요.')
      }
    } catch {
      onToast('사진 업로드 중 오류가 났어요.')
    } finally {
      setUploading(false)
    }
  }

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
      if (res.ok && data.success) {
        setTitle('')
        setBody('')
        setRating(0)
        setMeetTime('')
        setImageUrl('')
        onToast('동네 피드에 올렸어요.')
        onSuccess()
      } else {
        const msg = data.detail || data.message || (res.status === 503 ? '서버 DB 연결을 확인해 주세요.' : '작성에 실패했어요.')
        onToast(typeof msg === 'string' ? msg : '작성에 실패했어요.')
      }
    } catch {
      onToast('네트워크 오류가 났어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: cardBg, borderRadius: 20, border: `1px solid ${borderColor}`, padding: 20, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.06)' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: textColor, marginBottom: 4 }}>CREATE POST · 로컬 SNS 작성</h2>
        <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>주변 장소와 실제 피드를 연결했습니다.</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 사진 우선: 큰 업로드 영역 + 미리보기 */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textColor, marginBottom: 10 }}>📷 사진 (선택)</div>
          {imageUrl ? (
            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: `2px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#f3f4f6' }}>
              <img src={imageUrl} alt="미리보기" style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)' }} />
              <button type="button" onClick={() => setImageUrl('')} style={{ position: 'absolute', bottom: 12, right: 12, padding: '8px 14px', borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>사진 제거</button>
            </div>
          ) : (
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 180,
              borderRadius: 16,
              border: `2px dashed ${isDarkMode ? 'rgba(232,116,12,0.4)' : 'rgba(232,116,12,0.5)'}`,
              background: isDarkMode ? 'rgba(232,116,12,0.08)' : 'rgba(232,116,12,0.06)',
              color: '#E8740C',
              fontSize: 15,
              fontWeight: 600,
              cursor: uploading ? 'wait' : 'pointer',
              textAlign: 'center',
              padding: 24,
            }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ''; }}
              />
              {uploading ? '업로드 중…' : '📷 클릭해서 사진 추가'}
            </label>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(['story', 'review', 'gathering'] as const).map((t) => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} />
              <span style={{ fontSize: 14, color: textColor, fontWeight: 500 }}>{t === 'story' ? '동네 이야기' : t === 'review' ? '리뷰' : '모임'}</span>
            </label>
          ))}
        </div>
        {type === 'review' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: textColor, fontWeight: 600 }}>리뷰 별점</span>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ ...inputStyle, width: 'auto', minWidth: 100 }}>
              <option value={0}>리뷰 아님</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}점</option>
              ))}
            </select>
          </label>
        )}
        <input
          type="text"
          placeholder="예: 오늘 저녁 근처에서 같이 달릴 사람?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          style={inputStyle}
          required
        />
        <textarea
          placeholder="동네 정보, 리뷰, 모임 공지, 후기 등을 자유롭게 적어보세요."
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
            placeholder="모임 시간 (예: 오늘 8시 / 토요일 오전 10시)"
            value={meetTime}
            onChange={(e) => setMeetTime(e.target.value)}
            maxLength={40}
            style={inputStyle}
          />
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: 16,
            borderRadius: 14,
            border: 'none',
            background: 'linear-gradient(135deg, #E8740C, #C65D00)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 16,
            cursor: submitting ? 'not-allowed' : 'pointer',
            boxShadow: submitting ? 'none' : '0 4px 16px rgba(232,116,12,0.35)',
          }}
        >
          {submitting ? '올리는 중…' : '동네 피드에 올리기'}
        </button>
      </form>
    </div>
  )
}
