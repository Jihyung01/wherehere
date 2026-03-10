'use client'

import React from 'react'
import Script from 'next/script'
import { useRouter } from 'next/navigation'

const LEVEL_BENEFITS: Record<number, { icon: string; title: string; desc: string; type: string }[]> = {
  1: [{ icon: '🗺️', title: '퀘스트 탐험', desc: '기본 역할 퀘스트 수락 가능', type: 'unlock' }],
  2: [{ icon: '💬', title: '동네 피드 작성', desc: '리뷰·이야기 게시글 작성 개방', type: 'unlock' }],
  3: [{ icon: '🎯', title: '챌린지 도전', desc: '일일·주간 챌린지 전체 참가 가능', type: 'unlock' }, { icon: '⚡', title: 'XP 보너스 +10%', desc: '모든 퀘스트 보상 10% 추가', type: 'bonus' }],
  5: [{ icon: '📸', title: '포토 미션 강화', desc: '사진 미션 완료 시 추가 XP +15', type: 'bonus' }],
  6: [{ icon: '🔮', title: '히든 퀘스트 해금', desc: '숨겨진 특별 장소 퀘스트 등장', type: 'unlock' }],
  8: [{ icon: '🔥', title: '스트릭 보너스', desc: '5일 연속 방문 시 XP 2배', type: 'bonus' }],
  10: [{ icon: '🗺️', title: '동네 정복 통계', desc: '구역별 정복률·히트맵 고급 분석 개방', type: 'unlock' }, { icon: '👑', title: '탐험가 칭호', desc: '프로필에 "베테랑 탐험가" 배지 표시', type: 'social' }],
  12: [{ icon: '🤝', title: '함께 도전 기능', desc: '친구를 퀘스트에 초대하고 함께 완료 가능', type: 'social' }],
  15: [{ icon: '✨', title: '프리미엄 AI 서사', desc: '더 깊고 개성 있는 장소 스토리 생성', type: 'unlock' }, { icon: '💰', title: 'XP 보너스 +25%', desc: '누적 보너스 적용, 레벨 3 포함', type: 'bonus' }],
  20: [{ icon: '🏆', title: '동네 명예의 전당', desc: '동네 최다 방문자 랭킹 노출', type: 'social' }, { icon: '🎁', title: '파트너 혜택', desc: '제휴 카페·식당 첫 방문 할인 쿠폰', type: 'unlock' }],
  25: [{ icon: '🌟', title: '크리에이터 뱃지', desc: '피드 게시글에 특별 아이콘 표시', type: 'social' }],
  30: [{ icon: '🗝️', title: '비밀 지역 해금', desc: '앱 내 VIP 전용 숨겨진 지역 퀘스트', type: 'unlock' }, { icon: '⚡', title: 'XP 보너스 +50%', desc: '레벨 3·15 포함 누적 적용', type: 'bonus' }],
  50: [{ icon: '👑', title: '레전드 탐험가', desc: '최고 등급 칭호 및 영구 프로필 뱃지', type: 'social' }],
}

function getLevelBenefits(currentLevel: number) {
  const current: { icon: string; title: string; desc: string; type: string }[] = []
  const upcoming: Array<{ level: number; benefits: { icon: string; title: string; desc: string; type: string }[] }> = []
  const levels = Object.keys(LEVEL_BENEFITS).map(Number).sort((a, b) => a - b)
  for (const lv of levels) {
    if (lv <= currentLevel) {
      current.push(...LEVEL_BENEFITS[lv])
    } else if (upcoming.length < 2) {
      upcoming.push({ level: lv, benefits: LEVEL_BENEFITS[lv] })
    }
  }
  return { current, upcoming }
}

export type HomeScreenContentRef = React.RefObject<HTMLDivElement | null>

export interface HomeScreenContentProps {
  setScreen: (s: string) => void
  setAcceptedQuest: (q: any) => void
  setHomeRefreshKey: (fn: (k: number) => number) => void
  homeData: { recommendations?: any[] } | undefined
  homeLoading: boolean
  friendPicks: any[]
  userStats: { level?: number; total_xp?: number; xp_to_next_level?: number } | undefined
  isLoggedIn: boolean
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
  accentColor: string
  accentRgba: (a: number) => string
  homeMapContainerRef: HomeScreenContentRef
  kakaoMapLoaded: boolean
  setKakaoMapLoaded: (v: boolean) => void
}

export function HomeScreenContent({
  setScreen,
  setAcceptedQuest,
  setHomeRefreshKey,
  homeData,
  homeLoading,
  friendPicks,
  userStats,
  isLoggedIn,
  isDarkMode,
  cardBg,
  borderColor,
  textColor,
  accentColor,
  accentRgba,
  homeMapContainerRef,
  kakaoMapLoaded,
  setKakaoMapLoaded,
}: HomeScreenContentProps) {
  const router = useRouter()
  const Root = 'div'

  const content = (
    <Root style={{ padding: '60px 20px 120px' }}>
      {/* 레벨 바 */}
      {isLoggedIn && (() => {
        const lvl = userStats?.level ?? 1
        const totalXP = userStats?.total_xp ?? 0
        const nextXP = userStats?.xp_to_next_level ?? 1000
        const progress = nextXP > 0 ? Math.min(100, (totalXP / nextXP) * 100) : 0
        const xpLeft = Math.max(0, nextXP - totalXP)
        const { upcoming } = getLevelBenefits(lvl)
        const nextBenefit = upcoming[0]?.benefits[0]
        const nextBenefitLevel = upcoming[0]?.level
        return (
          <div style={{ marginBottom: 20, padding: '14px 16px', background: isDarkMode ? 'rgba(255,255,255,0.06)' : accentRgba(0.08), borderRadius: 16, border: `1px solid ${isDarkMode ? accentRgba(0.2) : accentRgba(0.25)}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#fff',
                }}>
                  {lvl}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>Lv.{lvl} 탐험가</span>
              </div>
              <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#78350F' }}>
                {xpLeft > 0 ? `다음 레벨까지 ${xpLeft.toLocaleString()} XP` : '레벨업 준비 완료!'}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)', overflow: 'hidden', marginBottom: nextBenefit ? 8 : 0 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: `linear-gradient(90deg, ${accentColor}, #F59E0B)`, borderRadius: 5, transition: 'width 0.4s ease' }} />
            </div>
            {nextBenefit && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#78350F' }}>
                <span>🔜 Lv.{nextBenefitLevel}:</span>
                <span style={{ fontWeight: 600 }}>{nextBenefit.icon} {nextBenefit.title}</span>
              </div>
            )}
          </div>
        )
      })()}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          WhereHere
        </h1>
        <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 8 }}>오늘의 한 곳에서 동네 커뮤니티까지 한 번에.</p>
        <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
          홈 · 기분 맞춤 탐험 · 동네 피드
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push('/my-map-real')}
        style={{
          width: '100%',
          marginBottom: 20,
          padding: 16,
          borderRadius: 16,
          border: `1px solid ${borderColor}`,
          background: isDarkMode ? 'linear-gradient(135deg, rgba(232,116,12,0.12), rgba(232,116,12,0.04))' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
          color: textColor,
          textAlign: 'left',
          cursor: 'pointer',
          boxShadow: isDarkMode ? 'none' : '0 2px 12px rgba(232,116,12,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 24 }}>🗺️</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: accentColor }}>동네 정복 지도</span>
        </div>
        <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
          방문한 구역을 헥사곤으로 채워가며 탐험 완성도를 확인하세요
        </div>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151' }}>오늘의 한 곳</div>
        <button onClick={() => setHomeRefreshKey((k) => k + 1)} disabled={homeLoading} style={{ background: 'none', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', cursor: homeLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', animation: homeLoading ? 'spin 1s linear infinite' : 'none' }}>🔄</span> 새로고침
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </button>
      </div>
      {homeLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔮</div>
          <div style={{ fontSize: 15, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>근처 장소를 찾고 있어요...</div>
        </div>
      ) : homeData?.recommendations?.[0] ? (
        <>
          {(() => {
            const rec: any = homeData.recommendations[0]
            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  background: isDarkMode ? 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))' : cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 18,
                  padding: 18,
                  boxShadow: isDarkMode ? 'none' : '0 4px 16px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: accentColor, fontWeight: 600, marginBottom: 4 }}>오늘의 한 곳</div>
                      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{rec.name}</div>
                      <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{rec.address}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: accentColor }}>{rec.score}</div>
                      <div style={{ fontSize: 9, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>점수</div>
                      <div style={{ marginTop: 6, fontSize: 11 }}>
                        <span>📍 {rec.distance_meters}m</span>
                      </div>
                    </div>
                  </div>
                  {rec.reason && (
                    <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: 10 }}>{rec.reason}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => { setAcceptedQuest(rec); setScreen('accepted') }}
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #E8740C, #C65D00)',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    경로 보기 →
                  </button>
                </div>
              </div>
            )
          })()}

          {!kakaoMapLoaded && (
            <Script
              src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || '160238a590f3d2957230d764fb745322'}&autoload=false`}
              strategy="afterInteractive"
              onLoad={() => {
                if (typeof window !== 'undefined' && (window as any).kakao?.maps?.load) {
                  (window as any).kakao.maps.load(() => setKakaoMapLoaded(true))
                }
              }}
            />
          )}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>지도에서 오늘의 한 곳 보기</div>
            <div ref={homeMapContainerRef} style={{ width: '100%', height: 220, borderRadius: 16, overflow: 'hidden', border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.3)' : '#E5E7EB' }} />
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>근처에서 추천할 장소를 찾지 못했어요.</p>
          <p style={{ fontSize: 13, marginBottom: 16 }}>위치 권한을 허용하거나, 아래에서 기분 맞춤 탐험을 시도해보세요.</p>
        </div>
      )}

      {friendPicks.length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', marginBottom: 10 }}>
            👥 친구들이 좋아한 곳
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {friendPicks.slice(0, 5).map((pick: any, idx: number) => (
              <button
                key={pick.place_id || idx}
                type="button"
                onClick={() => {
                  setAcceptedQuest({
                    name: pick.place_name,
                    address: pick.address,
                    place_id: pick.place_id,
                    latitude: pick.latitude,
                    longitude: pick.longitude,
                    category: pick.category,
                    reason: pick.label,
                  })
                  setScreen('accepted')
                }}
                style={{
                  width: '100%',
                  padding: 14,
                  textAlign: 'left',
                  background: isDarkMode ? 'rgba(255,255,255,0.06)' : cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 14,
                  color: textColor,
                  cursor: 'pointer',
                  boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{pick.place_name}</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 4 }}>{pick.label}</div>
                {pick.address && <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>{pick.address}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setScreen('role')}
          style={{
            flex: 1,
            minWidth: 140,
            padding: 16,
            borderRadius: 14,
            border: `1px solid ${borderColor}`,
            background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
            color: textColor,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>🎯</span>
          기분 맞춤 탐험
        </button>
        <button
          type="button"
          onClick={() => setScreen('social')}
          style={{
            flex: 1,
            minWidth: 140,
            padding: 16,
            borderRadius: 14,
            border: `1px solid ${borderColor}`,
            background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
            color: textColor,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>💬</span>
          동네 피드
        </button>
      </div>
    </Root>
  )
  return content
}
