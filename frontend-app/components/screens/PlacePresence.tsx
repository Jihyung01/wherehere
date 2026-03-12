'use client'

import React, { useEffect, useState, useCallback } from 'react'

interface PresenceUser {
  user_id: string
  display_name: string
  avatar_url?: string
  checked_in_at: string
}

interface PlacePresenceProps {
  placeId: string
  placeName?: string
  userId: string
  isDarkMode: boolean
  accentColor: string
  cardBg: string
  borderColor: string
  textColor: string
  apiBase: string
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return '방금'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  return `${Math.floor(diff / 3600)}시간 전`
}

export function PlacePresence({
  placeId,
  placeName,
  userId,
  isDarkMode,
  accentColor,
  cardBg,
  borderColor,
  textColor,
  apiBase,
}: PlacePresenceProps) {
  const [users, setUsers] = useState<PresenceUser[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPresence = useCallback(async () => {
    if (!placeId) return
    try {
      const res = await fetch(
        `${apiBase}/api/v1/visits/presence/${encodeURIComponent(placeId)}?requester_id=${userId}&hours=3`
      )
      if (!res.ok) return
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [placeId, userId, apiBase])

  useEffect(() => {
    fetchPresence()
    const timer = setInterval(fetchPresence, 30_000)
    return () => clearInterval(timer)
  }, [fetchPresence])

  if (loading) return null
  if (users.length === 0) return null

  return (
    <div
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))'
          : 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
        border: `1px solid ${isDarkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)'}`,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10B981',
            boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
            animation: 'pulse 2s infinite',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: textColor }}>
          지금 {placeName ? `${placeName}에` : '여기에'} 함께 있는 사람
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: 'rgba(99,102,241,0.15)',
            color: '#6366F1',
            padding: '2px 8px',
            borderRadius: 999,
          }}
        >
          {users.length}명
        </span>
      </div>

      {/* 유저 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {users.slice(0, 5).map((u) => (
          <div
            key={u.user_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
              borderRadius: 10,
              border: `1px solid ${borderColor}`,
            }}
          >
            {/* 아바타 */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                color: '#fff',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (u.display_name || '?').slice(0, 1).toUpperCase()
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: textColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{u.display_name}
              </div>
              <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }}>
                {timeAgo(u.checked_in_at)} 체크인
              </div>
            </div>

            {/* 라이브 뱃지 */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#10B981',
                background: 'rgba(16,185,129,0.12)',
                padding: '3px 7px',
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              LIVE
            </div>
          </div>
        ))}
        {users.length > 5 && (
          <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', textAlign: 'center', paddingTop: 4 }}>
            외 {users.length - 5}명 더 있어요
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
      `}</style>
    </div>
  )
}
