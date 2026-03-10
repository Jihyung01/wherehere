'use client'

import React from 'react'
import Script from 'next/script'
import { useAppContext } from '@/contexts/AppContext'
import { getLevelBenefits } from '@/contexts/AppContext'

export function HomeScreen() {
  const {
    router,
    isDarkMode,
    bgColor,
    textColor,
    cardBg,
    borderColor,
    accentColor,
    accentRgba,
    isLoggedIn,
    showNotificationPanel,
    setShowNotificationPanel,
    notifications,
    unreadCount,
    userStats,
    homeData,
    homeLoading,
    homeRefreshKey,
    setHomeRefreshKey,
    setAcceptedQuest,
    setScreen,
    kakaoMapLoaded,
    setKakaoMapLoaded,
    homeMapContainerRef,
    userLocation,
    showLevelUpModal,
    setShowLevelUpModal,
    levelUpData,
    questCompleteData,
    setQuestCompleteData,
    pendingFeedPost,
    setPendingFeedPost,
    BottomNav,
  } = useAppContext() as any

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <button
          onClick={() => setShowNotificationPanel((v: boolean) => !v)}
          style={{
            position: 'relative',
            padding: '8px 12px',
            background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            border: `1px solid ${borderColor}`,
            borderRadius: 10,
            color: textColor,
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
        <button
          onClick={() => router.push('/login')}
          style={{
            padding: '8px 14px',
            background: isDarkMode ? 'rgba(255,255,255,0.1)' : accentRgba(0.15),
            border: '1px solid #E8740C',
            borderRadius: 10,
            color: accentColor,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          로그인
        </button>
      </div>
      {showNotificationPanel && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }} onClick={() => setShowNotificationPanel(false)}>
          <div style={{ width: '100%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto', background: bgColor, borderRadius: 16, border: `1px solid ${borderColor}`, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>알림</span>
              <button onClick={() => setShowNotificationPanel(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: textColor }}>×</button>
            </div>
            <div style={{ padding: 8 }}>
              {notifications.length === 0 ? (
                <p style={{ padding: 24, textAlign: 'center', color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', fontSize: 14 }}>알림이 없어요</p>
              ) : (
                notifications.slice(0, 30).map((n: { id: string; title: string; body?: string; read?: boolean; created_at?: string }) => (
                  <div key={n.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${borderColor}`, background: n.read ? 'transparent' : (isDarkMode ? accentRgba(0.08) : accentRgba(0.06)) }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>{n.body}</div>}
                    {n.created_at && <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: '60px 20px 120px' }}>
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
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff' }}>
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

        {/* 동네 정복 지도 */}
        <button
          type="button"
          onClick={() => router.push('/my-map-real')}
          style={{
            width: '100%', marginBottom: 20, padding: 16, borderRadius: 16,
            border: `1px solid ${borderColor}`,
            background: isDarkMode ? 'linear-gradient(135deg, rgba(232,116,12,0.12), rgba(232,116,12,0.04))' : 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
            color: textColor, textAlign: 'left', cursor: 'pointer',
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

        {/* 오늘의 한 곳 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151' }}>오늘의 한 곳</div>
            {homeData?.has_personalization && (
              <div style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                background: isDarkMode ? accentRgba(0.2) : accentRgba(0.12),
                color: accentColor, border: `1px solid ${accentRgba(0.3)}`,
                display: 'flex', alignItems: 'center', gap: 3,
              }}>
                🎯 내 취향 반영
              </div>
            )}
          </div>
          <button onClick={() => setHomeRefreshKey((k: number) => k + 1)} disabled={homeLoading} style={{ background: 'none', border: `1px solid ${borderColor}`, borderRadius: 8, padding: '4px 10px', fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', cursor: homeLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
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
              const prefBonus = rec.score_breakdown?.preference ?? 0
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
                      <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#4B5563', marginBottom: prefBonus > 0 ? 6 : 10 }}>{rec.reason}</p>
                    )}
                    {prefBonus > 0 && (
                      <div style={{ fontSize: 11, color: accentColor, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        ✨ 방문 기록 기반 +{prefBonus.toFixed(0)}점 보너스
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAcceptedQuest(rec); setScreen('accepted') }}
                      style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #E8740C, #C65D00)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}
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
                  if (typeof window !== 'undefined' && window.kakao?.maps?.load) {
                    window.kakao.maps.load(() => setKakaoMapLoaded(true))
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

        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setScreen('role')}
            style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 14, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left', boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>🎯</span>
            기분 맞춤 탐험
          </button>
          <button
            type="button"
            onClick={() => setScreen('social')}
            style={{ flex: 1, minWidth: 140, padding: 16, borderRadius: 14, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFFFFF', color: textColor, fontSize: 14, fontWeight: 700, cursor: 'pointer', textAlign: 'left', boxShadow: isDarkMode ? 'none' : '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            <span style={{ display: 'block', fontSize: 22, marginBottom: 6 }}>💬</span>
            동네 피드
          </button>
        </div>
      </div>

      {/* 레벨업 축하 모달 */}
      {showLevelUpModal && levelUpData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setShowLevelUpModal(false)}>
          <div style={{ background: isDarkMode ? 'linear-gradient(135deg, #1a0e00, #2d1a00)' : 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', border: `2px solid ${accentColor}`, borderRadius: 24, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: `0 0 60px ${accentColor}60`, position: 'relative', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              {['✨', '🎉', '⭐', '🌟', '🎊'].map((emoji, i) => (
                <span key={i} style={{ position: 'absolute', fontSize: 20, top: `${10 + i * 18}%`, left: `${5 + i * 20}%`, opacity: 0.4, animation: `float${i} 3s ease-in-out infinite` }}>{emoji}</span>
              ))}
            </div>
            <style>{`
              @keyframes float0{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(10deg)}}
              @keyframes float1{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-12px) rotate(-8deg)}}
              @keyframes float2{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
              @keyframes float3{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-10px) rotate(12deg)}}
              @keyframes float4{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
              @keyframes levelUpPop{0%{transform:scale(0.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}
            `}</style>
            <div style={{ fontSize: 64, marginBottom: 8, animation: 'levelUpPop 0.6s ease forwards' }}>🏆</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: accentColor, letterSpacing: 2, marginBottom: 8 }}>LEVEL UP!</div>
            <div style={{ fontSize: 56, fontWeight: 900, background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 4 }}>Lv.{levelUpData.newLevel}</div>
            <div style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280', marginBottom: 24 }}>레벨업을 축하해요! 🎊</div>
            {levelUpData.benefits.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, marginBottom: 12 }}>🎁 이번 레벨 혜택</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {levelUpData.benefits.map((b: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(232,116,12,0.08)', border: `1px solid ${accentColor}30`, textAlign: 'left' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isDarkMode ? '#fff' : '#1F2937' }}>{b.title}</div>
                        <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={() => setShowLevelUpModal(false)} style={{ width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`, color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: `0 4px 16px ${accentColor}60` }}>
              계속 탐험하기 →
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
