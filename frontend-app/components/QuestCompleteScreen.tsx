'use client'

import { useEffect, useState } from 'react'

interface QuestCompleteScreenProps {
  isOpen: boolean
  placeName: string
  xpEarned: number
  locationVerified: boolean
  onViewMap: () => void
  onPostFeed: () => void
  onHome: () => void
}

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) { setVal(0); return }
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, active, duration])
  return val
}

export function QuestCompleteScreen({
  isOpen, placeName, xpEarned, locationVerified,
  onViewMap, onPostFeed, onHome,
}: QuestCompleteScreenProps) {
  const [show, setShow] = useState(false)
  const xp = useCountUp(xpEarned, show)

  useEffect(() => {
    if (isOpen) setTimeout(() => setShow(true), 50)
    else setShow(false)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99998,
      background: 'linear-gradient(160deg, #0D1117 0%, #1a0d00 50%, #0D1117 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Pretendard, sans-serif', padding: '24px',
    }}>
      {/* Confetti particles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: '-10px',
            width: 8, height: 8,
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            background: ['#E8740C', '#F59E0B', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444'][i % 6],
            animation: `confettiFall ${1.5 + Math.random() * 2}s ease ${Math.random() * 0.8}s both`,
          }} />
        ))}
      </div>

      {/* Main content */}
      <div style={{
        textAlign: 'center',
        opacity: show ? 1 : 0, transform: show ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
        transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ fontSize: 96, marginBottom: 8, animation: 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both' }}>
          🎉
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8 }}>퀘스트 완료!</h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32 }}>
          {placeName} 탐험 성공
        </p>

        {/* XP 카드 */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(232,116,12,0.2), rgba(232,116,12,0.05))',
          border: '1px solid rgba(232,116,12,0.4)',
          borderRadius: 20, padding: '24px 40px', marginBottom: 12,
          animation: 'popIn 0.5s ease 0.3s both',
        }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>획득 XP</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: '#E8740C', lineHeight: 1 }}>
            +{xp}
          </div>
          {locationVerified && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#10B981', fontWeight: 600 }}>
              📍 위치 인증 보너스 포함
            </div>
          )}
        </div>

        {/* 버튼들 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320, margin: '24px auto 0' }}>
          <button
            onClick={onPostFeed}
            style={{
              padding: '16px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #E8740C, #C65D00)',
              color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(232,116,12,0.35)',
            }}
          >
            📢 동네 피드에 올리기
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onViewMap}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              🗺️ 내 지도 확인
            </button>
            <button
              onClick={onHome}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              🏠 홈으로
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes bounceIn {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  )
}
