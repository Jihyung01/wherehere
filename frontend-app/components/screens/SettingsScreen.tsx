'use client'

import React from 'react'
import { useAppContext, API_BASE } from '@/contexts/AppContext'
import { toast } from 'sonner'
import { compressImageFile } from '@/lib/image-compress'

function formatAccountDate(iso?: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
  } catch {
    return '—'
  }
}

type SettingsScreenProps = { BottomNav?: React.ReactNode }

export function SettingsScreen({ BottomNav }: SettingsScreenProps = {}) {
  const {
    isDarkMode,
    bgColor,
    textColor,
    cardBg,
    borderColor,
    accentColor,
    accentRgba,
    themeMode,
    setThemeMode,
    setAccentColor,
    installPrompt,
    setInstallPrompt,
    isAppInstalled,
    setIsAppInstalled,
    isIOSDevice,
    showNotificationSettings,
    setShowNotificationSettings,
    showLocationSettings,
    setShowLocationSettings,
    showPrivacySettings,
    setShowPrivacySettings,
    showHelpSettings,
    setShowHelpSettings,
    showCreatorSettings,
    setShowCreatorSettings,
    placeSuggestionForm,
    setPlaceSuggestionForm,
    placeSuggestionSubmitting,
    placeSuggestionMessage,
    submitPlaceSuggestion,
    userProfile,
    setUserProfile,
    nicknameInput,
    setNicknameInput,
    savingNickname,
    saveNickname,
    displayName,
    user,
    userId,
    isLoggedIn,
    userLocation,
    setUserLocation,
    signOut,
    router,
    refetchUserProfile,
    setScreen,
  } = useAppContext() as any

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ padding: '60px 20px 120px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚙️</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>설정</h2>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* 앱 설치 */}
          {!isAppInstalled && (
            <div style={{
              background: 'linear-gradient(135deg, #E8740C 0%, #F59E0B 100%)',
              borderRadius: 16, padding: 20, color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📲</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>WhereHere 앱 설치</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {isIOSDevice ? 'Safari 공유 버튼으로 홈 화면에 추가하세요' : '홈 화면에 추가해 더 빠르게 실행하세요'}
                  </div>
                </div>
              </div>
              {isIOSDevice ? (
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>iOS 설치 방법</div>
                  <div>① Safari 하단 <b>공유(□↑)</b> 버튼 탭</div>
                  <div>② <b>홈 화면에 추가</b> 선택</div>
                  <div>③ 오른쪽 상단 <b>추가</b> 탭</div>
                </div>
              ) : installPrompt ? (
                <button
                  onClick={async () => {
                    if (!installPrompt) return
                    installPrompt.prompt()
                    const { outcome } = await installPrompt.userChoice
                    if (outcome === 'accepted') {
                      setIsAppInstalled(true)
                      setInstallPrompt(null)
                      toast.success('앱이 홈 화면에 추가됐어요!')
                    }
                  }}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: '#fff', color: accentColor, fontWeight: 800, fontSize: 15, cursor: 'pointer', letterSpacing: -0.3 }}
                >
                  📲 지금 설치하기
                </button>
              ) : (
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, opacity: 0.9 }}>
                  브라우저 주소창 오른쪽 설치(⊕) 아이콘을 탭하거나,<br />메뉴 → <b>홈 화면에 추가</b>를 선택하세요.
                </div>
              )}
            </div>
          )}
          {isAppInstalled && (
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>앱 설치 완료</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>WhereHere가 홈 화면에 설치돼 있어요</div>
              </div>
            </div>
          )}

          {/* 테마: 라이트 / 다크 / 시스템 따라가기 */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>테마</div>
            <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', marginBottom: 12 }}>시스템 설정 따라가기 권장</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['light', 'dark', 'system'] as const).map((mode) => (
                <button key={mode} onClick={() => setThemeMode(mode)} style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: `2px solid ${themeMode === mode ? accentColor : borderColor}`,
                  background: themeMode === mode ? (isDarkMode ? accentRgba(0.2) : accentRgba(0.1)) : 'transparent',
                  color: themeMode === mode ? accentColor : textColor,
                  fontWeight: themeMode === mode ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}>
                  {mode === 'light' && '☀️ 라이트'}
                  {mode === 'dark' && '🌙 다크'}
                  {mode === 'system' && '🖥️ 시스템 따라가기'}
                </button>
              ))}
            </div>
            {/* 강조 색상 선택 */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>강조 색상</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {['#E8740C', '#2563EB', '#16A34A', '#9333EA', '#DC2626', '#0891B2'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setAccentColor(preset)}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: preset, border: `3px solid ${accentColor === preset ? textColor : 'transparent'}`,
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                    }}
                  />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    style={{ width: 28, height: 28, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0, background: 'none' }}
                    title="색상 선택"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => {
                      const v = e.target.value
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setAccentColor(v)
                    }}
                    onBlur={e => {
                      if (!/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setAccentColor('#E8740C')
                    }}
                    placeholder="#E8740C"
                    style={{
                      width: 80, padding: '4px 8px', borderRadius: 8, border: `1px solid ${borderColor}`,
                      background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, fontSize: 12, fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 알림 설정 */}
          <div onClick={() => setShowNotificationSettings(!showNotificationSettings)} style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 16, padding: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24 }}>🔔</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>알림 설정</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>푸시 알림 관리</div>
              </div>
              <div style={{ fontSize: 16, color: accentColor }}>{showNotificationSettings ? '▼' : '→'}</div>
            </div>
            {showNotificationSettings && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                {['새 퀘스트 알림', '챌린지 완료 알림', '친구 활동 알림'].map((notif, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
                    <span style={{ fontSize: 13 }}>{notif}</span>
                    <input type="checkbox" defaultChecked style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 위치 서비스 */}
          <div onClick={() => setShowLocationSettings(!showLocationSettings)} style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 16, padding: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24 }}>🗺️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>위치 서비스</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>GPS 권한 관리</div>
              </div>
              <div style={{ fontSize: 16, color: accentColor }}>{showLocationSettings ? '▼' : '→'}</div>
            </div>
            {showLocationSettings && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 13, marginBottom: 12, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                  현재 위치: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                </div>
                <button onClick={(e) => {
                  e.stopPropagation()
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
                        toast.success('위치가 업데이트됐어요!')
                      },
                      (error) => toast.error('위치 가져오기 실패: ' + error.message)
                    )
                  }
                }} style={{
                  padding: '8px 16px',
                  background: accentColor,
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}>
                  위치 새로고침
                </button>
              </div>
            )}
          </div>

          {/* 카카오 연동 & 추가 동의 */}
          {isLoggedIn && (
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE500', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💬</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>카카오톡 연동</div>
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>친구에게 직접 공유하려면 추가 동의 필요</div>
                </div>
              </div>
              <div style={{ background: isDarkMode ? 'rgba(254,229,0,0.08)' : '#FFFDE7', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>필요한 추가 동의 항목</div>
                <div>• <b>카카오톡 친구 목록</b> — 앱 친구에게 장소 공유</div>
                <div>• <b>카카오톡 메시지 발송</b> — 친구에게 퀘스트 초대</div>
                <div style={{ marginTop: 6, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>아래 버튼으로 동의창만 띄워 권한을 받습니다. 메인 로그인은 건드리지 않습니다.</div>
              </div>
              <a
                href={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/kakao-consent`}
                onClick={(e) => {
                  e.preventDefault()
                  window.location.href = `${window.location.origin}/api/auth/kakao-consent`
                }}
                style={{ display: 'block', width: '100%', padding: '12px 0', borderRadius: 12, border: 'none', background: '#FEE500', color: '#3C1E1E', fontWeight: 700, fontSize: 14, cursor: 'pointer', textAlign: 'center', textDecoration: 'none' }}
              >
                💬 카카오톡 친구 목록 권한 허용 (동의창 띄우기)
              </a>
            </div>
          )}

          {/* 카카오 API 테스트 (심사 제출용) — 한 장 캡처용 */}
          <div
            onClick={() => setScreen('kakao-api-test')}
            style={{
              background: isDarkMode ? 'rgba(254,229,0,0.12)' : '#FFFDE7',
              border: `2px solid #FEE500`,
              borderRadius: 16,
              padding: 20,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24 }}>📋</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>카카오 API 테스트 (심사 제출용)</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>4단계 완료 후 한 장 캡처해서 제출</div>
              </div>
              <div style={{ fontSize: 16, color: accentColor }}>→</div>
            </div>
          </div>

          {/* 개인정보 */}
          <div onClick={() => setShowPrivacySettings(!showPrivacySettings)} style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 16, padding: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24 }}>🔒</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>개인정보</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>계정 및 보안</div>
              </div>
              <div style={{ fontSize: 16, color: accentColor }}>{showPrivacySettings ? '▼' : '→'}</div>
            </div>
            {showPrivacySettings && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }} onClick={(e) => e.stopPropagation()}>
                {isLoggedIn ? (
                  <>
                    {/* 현재 프로필 미리보기 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: 12, background: isDarkMode ? accentRgba(0.1) : '#FEF3C7', borderRadius: 12 }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg, #E8740C, #F59E0B)', flexShrink: 0 }}>
                        {userProfile?.profile_image_url ? (
                          <img src={userProfile.profile_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>{(displayName || '?').slice(0, 1)}</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>
                          ID: {userId.slice(0, 8)}… · {formatAccountDate(user?.created_at)}
                        </div>
                      </div>
                    </div>
                    {/* 소셜 프로필 수정 */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                        소셜 프로필 (표시 이름 · 프로필 이미지 URL)
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                          placeholder="표시 이름"
                          value={nicknameInput}
                          onChange={(e) => setNicknameInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              saveNickname()
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: 10,
                            borderRadius: 8,
                            border: `1px solid ${borderColor}`,
                            background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
                            color: textColor,
                            fontSize: 13,
                          }}
                        />
                        <button
                          type="button"
                          onClick={saveNickname}
                          disabled={savingNickname || !nicknameInput.trim()}
                          style={{
                            padding: '0 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: savingNickname || !nicknameInput.trim() ? (isDarkMode ? 'rgba(255,255,255,0.12)' : '#E5E7EB') : accentColor,
                            color: savingNickname || !nicknameInput.trim() ? (isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF') : '#fff',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: savingNickname || !nicknameInput.trim() ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {savingNickname ? '저장중' : '확인'}
                        </button>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ display: 'inline-block', padding: '8px 14px', borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, fontSize: 13, cursor: 'pointer' }}>
                          📷 사진 선택 (앨범/파일)
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return

                              // 즉시 로컬 미리보기 (빠른 UX)
                              const reader = new FileReader()
                              reader.onload = (evt) => {
                                const tempUrl = evt.target?.result as string
                                setUserProfile((prev: any) => ({
                                  ...prev,
                                  display_name: prev?.display_name || displayName || undefined,
                                  profile_image_url: tempUrl
                                }))
                              }
                              reader.readAsDataURL(file)

                              try {
                                const compressed = await compressImageFile(file)
                                const form = new FormData()
                                form.append('file', compressed)
                                const base = typeof window !== 'undefined' ? window.location.origin : ''
                                const res = await fetch(`${base}/api/upload`, { method: 'POST', body: form })
                                const data = await res.json().catch(() => ({}))
                                if (res.ok && data.url) {
                                  // 백엔드에 프로필 업데이트
                                  const updateRes = await fetch(`${API_BASE}/api/v1/social/profile`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ user_id: userId, avatar_url: data.url }),
                                  })

                                  if (updateRes.ok) {
                                    const absoluteUrl = data.url.startsWith('http') ? data.url : `${typeof window !== 'undefined' ? window.location.origin : ''}${data.url.startsWith('/') ? '' : '/'}${data.url}`
                                    setUserProfile((prev: any) => ({
                                      ...prev,
                                      display_name: prev?.display_name || displayName || undefined,
                                      profile_image_url: absoluteUrl
                                    }))
                                    // refetchUserProfile()은 DB write와 race condition이 생길 수 있어 제거
                                    // 대신 1.5초 후 refetch로 DB 반영 확인
                                    setTimeout(() => refetchUserProfile(), 1500)
                                    alert('프로필 사진이 저장되었어요!')
                                  } else {
                                    alert('프로필 업데이트에 실패했어요.')
                                  }
                                } else {
                                  alert(data.error || '업로드 실패')
                                  // 실패 시 원래 프로필로 되돌림
                                  const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                                  const profileData = await profileRes.json()
                                  if (profileData.profile) {
                                    setUserProfile(profileData.profile)
                                  }
                                }
                              } catch (err) {
                                console.error('Upload error:', err)
                                alert('업로드 중 오류가 났어요.')
                                // 실패 시 원래 프로필로 되돌림
                                const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                                const profileData = await profileRes.json()
                                if (profileData.profile) {
                                  setUserProfile(profileData.profile)
                                }
                              }
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                      <input
                        placeholder="또는 프로필 이미지 URL 입력 (선택)"
                        onBlur={async (e) => {
                          const url = e.target.value.trim()
                          try {
                            const res = await fetch(`${API_BASE}/api/v1/social/profile`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ user_id: userId, avatar_url: url || undefined }),
                            })
                            if (!res.ok) throw new Error('API error')
                            // 프로필 정보 다시 불러오기
                            const profileRes = await fetch(`${API_BASE}/api/v1/social/profile/${userId}`)
                            const profileData = await profileRes.json()
                            if (profileData.profile) {
                              setUserProfile(profileData.profile)
                            }
                          } catch (_) {
                            alert('저장에 실패했어요. 네트워크를 확인하고 다시 시도해주세요.')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: 10,
                          marginBottom: 4,
                          borderRadius: 8,
                          border: `1px solid ${borderColor}`,
                          background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff',
                          color: textColor,
                          fontSize: 13,
                        }}
                      />
                      <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                        위 정보는 친구 검색·소셜 피드에서 보여집니다.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, marginBottom: 8 }}>데모 모드 (비로그인)</div>
                    <div style={{ fontSize: 12, marginBottom: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
                      로그인하면 내 데이터로 이용할 수 있어요.
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {!isLoggedIn ? (
                    <button onClick={(e) => {
                      e.stopPropagation()
                      router.push('/login')
                    }} style={{
                      padding: '8px 16px',
                      background: accentColor,
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      로그인 / 회원가입
                    </button>
                  ) : (
                    <button onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('정말 로그아웃하시겠습니까?')) signOut()
                    }} style={{
                      padding: '8px 16px',
                      background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                      border: 'none',
                      borderRadius: 8,
                      color: textColor,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}>
                      로그아웃
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 크리에이터: 장소 제안하기 */}
          <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
            <div onClick={() => setShowCreatorSettings(!showCreatorSettings)} style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}>
              <div style={{ fontSize: 24 }}>✨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>장소 제안하기</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>새 장소를 등록해보세요 (검수 후 반영)</div>
              </div>
              <div style={{ fontSize: 16, color: accentColor }}>{showCreatorSettings ? '▼' : '→'}</div>
            </div>
            {showCreatorSettings && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }} onClick={(e) => e.stopPropagation()}>
                <input placeholder="장소 이름 *" value={placeSuggestionForm.name} onChange={(e) => setPlaceSuggestionForm((f: any) => ({ ...f, name: e.target.value }))} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor }} />
                <input placeholder="주소" value={placeSuggestionForm.address} onChange={(e) => setPlaceSuggestionForm((f: any) => ({ ...f, address: e.target.value }))} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor }} />
                <select value={placeSuggestionForm.category} onChange={(e) => setPlaceSuggestionForm((f: any) => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor }}>
                  <option value="기타">기타</option>
                  <option value="카페">카페</option>
                  <option value="음식점">음식점</option>
                  <option value="술집/바">술집/바</option>
                  <option value="공원">공원</option>
                  <option value="문화시설">문화시설</option>
                </select>
                <textarea placeholder="설명 (선택)" value={placeSuggestionForm.description} onChange={(e) => setPlaceSuggestionForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: `1px solid ${borderColor}`, background: isDarkMode ? 'rgba(0,0,0,0.2)' : '#fff', color: textColor, resize: 'vertical' }} />
                {placeSuggestionMessage && <p style={{ fontSize: 12, marginBottom: 8, color: accentColor }}>{placeSuggestionMessage}</p>}
                <button onClick={submitPlaceSuggestion} disabled={placeSuggestionSubmitting} style={{ width: '100%', padding: 12, background: accentColor, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: placeSuggestionSubmitting ? 'not-allowed' : 'pointer', opacity: placeSuggestionSubmitting ? 0.7 : 1 }}>{placeSuggestionSubmitting ? '제출 중…' : '제안 제출'}</button>
              </div>
            )}
          </div>

          {/* 도움말 */}
          <div onClick={() => setShowHelpSettings(!showHelpSettings)} style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 16, padding: 20,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
             onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 24 }}>❓</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>도움말</div>
                <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>사용 가이드</div>
              </div>
              <div style={{ fontSize: 16, color: accentColor }}>{showHelpSettings ? '▼' : '→'}</div>
            </div>
            {showHelpSettings && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 13, lineHeight: 1.8, color: isDarkMode ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>
                  <p style={{ marginBottom: 8 }}>📍 <strong>퀘스트 시작:</strong> 역할과 기분을 선택하면 AI가 맞춤 장소를 추천합니다.</p>
                  <p style={{ marginBottom: 8 }}>✅ <strong>체크인:</strong> 장소에 도착하면 미션을 완료하고 체크인하세요.</p>
                  <p style={{ marginBottom: 8 }}>⭐ <strong>리뷰 작성:</strong> 방문 후 별점과 후기를 남기면 XP를 획득합니다.</p>
                  <p>🗺️ <strong>나의 지도:</strong> 방문 기록과 통계를 확인하세요.</p>
                </div>
              </div>
            )}
          </div>

          {/* 회사 / 서비스 정보 (카카오 비즈니스 심사용: 사이트 내 사업자 정보 및 앱 정보 노출) */}
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `2px solid ${borderColor}` }}>
            <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>COMPANY / SERVICE</div>
            <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <img src="/app-icon.png" alt="WhereHere 앱 아이콘" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', border: `1px solid ${borderColor}` }} />
                <div>
                  <div style={{ fontSize: 10, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginBottom: 4 }}>앱 이름</div>
                  <div style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(90deg, #E8740C, #F59E0B)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WhereHere</div>
                </div>
              </div>
              <div style={{ paddingTop: 12, borderTop: `1px solid ${borderColor}` }}>
                <div style={{ fontSize: 10, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF', marginBottom: 4 }}>사업자 정보</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: textColor }}>사업자등록번호 463-24-01865</div>
                <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280', marginTop: 4 }}>비즈 앱 및 사업자등록증과 동일한 정보입니다.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {BottomNav}
    </div>
  )
}
