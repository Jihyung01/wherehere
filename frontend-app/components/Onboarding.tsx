'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'wherehere_onboarded'

const SLIDES = [
  {
    emoji: '🗺️',
    title: '내 동네를 RPG처럼\n탐험해봐',
    desc: '주변 숨겨진 장소들을 발견하고\n나만의 탐험 지도를 채워가세요',
    bg: 'linear-gradient(160deg, #1a0a00 0%, #3d1a00 50%, #0D1117 100%)',
    accent: '#E8740C',
    visual: (
      <div style={{ position: 'relative', width: 220, height: 180, margin: '0 auto' }}>
        {[
          { top: 30, left: 60, emoji: '📍', delay: 0, size: 32 },
          { top: 80, left: 140, emoji: '☕', delay: 0.3, size: 28 },
          { top: 120, left: 40, emoji: '🍜', delay: 0.6, size: 28 },
          { top: 50, left: 170, emoji: '🏛️', delay: 0.9, size: 26 },
          { top: 140, left: 120, emoji: '🌿', delay: 1.2, size: 26 },
        ].map((m, i) => (
          <div key={i} style={{
            position: 'absolute', top: m.top, left: m.left, fontSize: m.size,
            animation: `floatPin 2s ease-in-out ${m.delay}s infinite alternate`,
            filter: 'drop-shadow(0 4px 12px rgba(232,116,12,0.6))',
          }}>{m.emoji}</div>
        ))}
        <style>{`@keyframes floatPin { from{transform:translateY(0)} to{transform:translateY(-10px)} }`}</style>
      </div>
    ),
  },
  {
    emoji: '⚡',
    title: '퀘스트 완료 →\nXP 획득 → 레벨업',
    desc: '미션을 수행하고 XP를 쌓아\n탐험왕 레벨에 도달하세요',
    bg: 'linear-gradient(160deg, #0a001a 0%, #1a0038 50%, #0D1117 100%)',
    accent: '#8B5CF6',
    visual: (
      <div style={{ padding: '0 20px' }}>
        {[
          { label: '레벨 1 탐험가', xp: 100, color: '#6B7280' },
          { label: '레벨 3 탐험가', xp: 60, color: '#E8740C' },
          { label: '레벨 7 탐험왕', xp: 30, color: '#8B5CF6' },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>XP</span>
            </div>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${item.xp}%`, background: item.color,
                borderRadius: 5,
                animation: `growBar 1.2s ease ${i * 0.3}s both`,
              }} />
            </div>
          </div>
        ))}
        <style>{`@keyframes growBar { from{width:0} }`}</style>
      </div>
    ),
  },
  {
    emoji: '🧭',
    title: '나만의 탐험가\n타입을 골라봐',
    desc: '역할에 맞는 맞춤 퀘스트를\n추천받아 더 특별한 탐험을 하세요',
    bg: 'linear-gradient(160deg, #001a0a 0%, #003820 50%, #0D1117 100%)',
    accent: '#10B981',
    visual: (
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', padding: '0 10px' }}>
        {[
          { icon: '🗺️', name: '탐험가', color: '#E8740C' },
          { icon: '🍽️', name: '푸디', color: '#EF4444' },
          { icon: '🎨', name: '아티스트', color: '#8B5CF6' },
          { icon: '💪', name: '도전자', color: '#3B82F6' },
          { icon: '🌿', name: '힐러', color: '#10B981' },
        ].map((r, i) => (
          <div key={i} style={{
            padding: '10px 16px', borderRadius: 20,
            background: `${r.color}22`,
            border: `1.5px solid ${r.color}66`,
            display: 'flex', alignItems: 'center', gap: 6,
            animation: `popIn 0.4s ease ${i * 0.1}s both`,
          }}>
            <span style={{ fontSize: 18 }}>{r.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{r.name}</span>
          </div>
        ))}
        <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }`}</style>
      </div>
    ),
  },
]

interface OnboardingProps {
  onDone: () => void
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [slide, setSlide] = useState(0)
  const [exiting, setExiting] = useState(false)
  const current = SLIDES[slide]

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    onDone()
  }

  const next = () => {
    if (slide < SLIDES.length - 1) {
      setExiting(true)
      setTimeout(() => { setSlide(s => s + 1); setExiting(false) }, 220)
    } else {
      finish()
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: current.bg,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Pretendard, sans-serif',
      transition: 'background 0.5s ease',
    }}>
      {/* Skip */}
      <div style={{ padding: '56px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={finish} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
          건너뛰기
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 24px 24px',
        opacity: exiting ? 0 : 1, transform: exiting ? 'translateX(-20px)' : 'translateX(0)',
        transition: 'opacity 0.22s ease, transform 0.22s ease',
      }}>
        <div style={{ fontSize: 72, marginBottom: 24, filter: `drop-shadow(0 0 24px ${current.accent}88)` }}>
          {current.emoji}
        </div>
        <div style={{ marginBottom: 28, width: '100%' }}>
          {current.visual}
        </div>
        <h2 style={{
          fontSize: 28, fontWeight: 900, color: '#fff',
          textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.3, marginBottom: 14,
        }}>
          {current.title}
        </h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.7 }}>
          {current.desc}
        </p>
      </div>

      {/* Bottom */}
      <div style={{ padding: '0 24px 48px' }}>
        {/* Dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: i === slide ? 24 : 8, height: 8, borderRadius: 4,
              background: i === slide ? current.accent : 'rgba(255,255,255,0.2)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
        <button
          onClick={next}
          style={{
            width: '100%', padding: '18px 0', borderRadius: 16, border: 'none',
            background: current.accent,
            color: '#fff', fontSize: 17, fontWeight: 800, cursor: 'pointer',
            boxShadow: `0 8px 32px ${current.accent}55`,
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        >
          {slide < SLIDES.length - 1 ? '다음' : '탐험 시작하기 🚀'}
        </button>
      </div>
    </div>
  )
}

export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem(STORAGE_KEY)
}
