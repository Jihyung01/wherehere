'use client'

import type { MoodType } from './constants'
import { MOODS } from './constants'

type MoodScreenProps = {
  setScreen: (s: string) => void
  setSelectedMood: (m: MoodType) => void
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
}

/** 기분 선택 화면: "지금 이 화면은 기분 고르기"가 드러나도록 단일 책임 */
export function MoodScreen({
  setScreen,
  setSelectedMood,
  isDarkMode,
  cardBg,
  borderColor,
  textColor,
}: MoodScreenProps) {
  return (
    <div style={{ padding: '60px 20px 120px' }}>
      <button
        type="button"
        onClick={() => setScreen('role')}
        style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '8px 16px', color: textColor, cursor: 'pointer', marginBottom: 24 }}
      >
        ← 뒤로
      </button>

      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💭</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>지금 기분은 어때요?</h2>
        <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>당신의 감정에 맞는 장소를 추천해드릴게요</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {MOODS.map((mood) => (
          <div
            key={mood.id}
            onClick={() => { setSelectedMood(mood.id); setScreen('quests'); }}
            style={{
              background: isDarkMode ? `linear-gradient(135deg, ${mood.color}15, ${mood.color}05)` : cardBg,
              border: `1px solid ${mood.color}30`,
              borderRadius: 16,
              padding: 24,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.3s',
              boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = `${mood.color}60`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = `${mood.color}30`; }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>{mood.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{mood.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
