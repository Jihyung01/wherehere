'use client'

import React from 'react'
import { useAppContext } from '@/contexts/AppContext'

export function QuestsScreen({ BottomNav }: { BottomNav: React.ReactNode }) {
  const {
    isDarkMode,
    bgColor,
    textColor,
    cardBg,
    borderColor,
    accentColor,
    accentRgba,
    questsData,
    questsLoading,
    setAcceptedQuest,
    setScreen,
    setSelectedRole,
    setSelectedMood,
  } = useAppContext()

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ padding: '60px 20px 120px' }}>
        <button onClick={() => setScreen('mood')} style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '8px 16px', color: textColor, cursor: 'pointer', marginBottom: 24 }}>
          ← 뒤로
        </button>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>AI가 추천하는 퀘스트</h2>
          <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>당신을 위한 특별한 장소 3곳</p>
        </div>

        {questsLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔮</div>
            <div style={{ fontSize: 16, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>AI가 분석 중...</div>
          </div>
        ) : questsData?.recommendations?.length ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {questsData.recommendations.map((quest: any, i: number) => (
              <div key={i} onClick={() => { setAcceptedQuest(quest); setScreen('accepted'); }}
                style={{
                  background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 16, padding: 20, cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#E8740C60'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: accentColor, fontWeight: 600, marginBottom: 4 }}>{quest.category}</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{quest.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>{quest.score}</div>
                    <div style={{ fontSize: 9, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>점수</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 12 }}>{quest.address}</div>
                <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 6 }}>
                  <span>📍 {quest.distance_meters}m</span>
                  <span>⭐ {quest.average_rating || '-'}</span>
                  {quest.estimated_cost && <span>💰 {(quest.estimated_cost/1000).toFixed(0)}천원</span>}
                </div>
                {quest.reason && (
                  <p style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: 8 }}>{quest.reason}</p>
                )}
                <button type="button" onClick={(e) => { e.stopPropagation(); setAcceptedQuest(quest); setScreen('accepted'); }} style={{ fontSize: 12, color: accentColor, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>경로 보기 →</button>
              </div>
            ))}
          </div>
        ) : questsData?.recommendations?.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>조금 더 넓은 범위로 찾아볼까요?</p>
            <p style={{ fontSize: 13, marginBottom: 20 }}>역할·무드를 바꾸거나 위치를 허용하면 더 많은 퀘스트가 나와요</p>
            <button onClick={() => { setScreen('role'); setSelectedRole(null); setSelectedMood(null); }} style={{ padding: '12px 24px', background: accentColor, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>역할 다시 고르기</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
            추천 장소를 불러오지 못했습니다.
          </div>
        )}
      </div>
      {BottomNav}
    </div>
  )
}
