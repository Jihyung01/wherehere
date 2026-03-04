'use client'

import type { RoleType } from './constants'
import { ROLES } from './constants'

type RoleScreenProps = {
  setScreen: (s: string) => void
  setSelectedRole: (r: RoleType) => void
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
}

export function RoleScreen(props: RoleScreenProps) {
  const { setScreen, setSelectedRole, isDarkMode, cardBg, borderColor, textColor } = props
  return (
    <div style={{ padding: '60px 20px 120px' }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: 15, color: '#E8740C', fontWeight: 700, marginBottom: 8 }}>오늘의 장소에서 동네 커뮤니티까지</p>
        <button
          type="button"
          onClick={() => setScreen('social')}
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            border: '1px solid rgba(232,116,12,0.5)',
            background: isDarkMode ? 'rgba(232,116,12,0.15)' : 'rgba(232,116,12,0.1)',
            color: '#E8740C',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          동네 피드 보기 →
        </button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          WhereHere
        </h1>
        <p style={{ fontSize: 15, fontWeight: 600, color: isDarkMode ? 'rgba(255,255,255,0.9)' : '#374151', marginBottom: 6 }}>기분과 역할에 맞는 장소를 퀘스트로 받아보세요</p>
        <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 8 }}>예: 지금 피곤한 당신에게 조용한 카페 한 곳</p>
        <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>오늘은 어떤 역할로 탐험할까요?</p>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {ROLES.map((role) => (
          <div
            key={role.id}
            onClick={() => { setSelectedRole(role.id); setScreen('mood'); }}
            style={{
              background: isDarkMode ? `linear-gradient(135deg, ${role.color}15, ${role.color}05)` : cardBg,
              border: `1px solid ${role.color}30`,
              borderRadius: 16,
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: isDarkMode ? 'none' : '0 2px 4px rgba(0,0,0,0.05)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = `${role.color}60`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = `${role.color}30`; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 40 }}>{role.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{role.name}</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{role.description}</div>
              </div>
              <div style={{ fontSize: 20, color: role.color }}>→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
