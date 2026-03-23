'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

type GroupQuest = {
  id: string
  creator_id: string
  place_id: string
  place_name: string
  place_address?: string
  max_participants: number
  current_participants: number
  checked_in_count: number
  status: string
  created_at: string
  expires_at?: string
  is_joined?: boolean
}

type QuestParticipant = {
  user_id: string
  joined_at: string
  checked_in: boolean
  checked_in_at?: string
  user_info?: {
    id: string
    display_name?: string
    username?: string
    profile_image_url?: string
  }
}

type GroupQuestScreenProps = {
  apiBase: string
  userId: string
  isDarkMode: boolean
  bgColor: string
  textColor: string
  cardBg: string
  borderColor: string
  accentColor: string
  accentRgba: (opacity: number) => string
  BottomNav?: React.ReactNode
  onBack: () => void
  /** 카카오 친구에게 초대 메시지 전송 */
  onInviteKakaoFriends?: (questId: string, placeName: string) => void
}

export function GroupQuestScreen({
  apiBase,
  userId,
  isDarkMode,
  bgColor,
  textColor,
  cardBg,
  borderColor,
  accentColor,
  accentRgba,
  BottomNav,
  onBack,
  onInviteKakaoFriends,
}: GroupQuestScreenProps) {
  const [activeQuests, setActiveQuests] = useState<GroupQuest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuest, setSelectedQuest] = useState<GroupQuest | null>(null)
  const [questDetails, setQuestDetails] = useState<{ quest: GroupQuest; participants: QuestParticipant[] } | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [joiningQuest, setJoiningQuest] = useState<string | null>(null)
  const [checkingIn, setCheckingIn] = useState(false)

  const fetchActiveQuests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/social/group-quests/active?user_id=${userId}&limit=30`)
      const data = await res.json().catch(() => ({ quests: [] }))
      setActiveQuests(data.quests || [])
    } catch {
      toast.error('퀘스트 목록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [apiBase, userId])

  const fetchQuestDetails = useCallback(async (questId: string) => {
    setDetailsLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/social/group-quests/${questId}`)
      const data = await res.json().catch(() => null)
      if (data && data.quest) {
        setQuestDetails(data)
      }
    } catch {
      toast.error('퀘스트 정보를 불러오지 못했어요.')
    } finally {
      setDetailsLoading(false)
    }
  }, [apiBase])

  useEffect(() => {
    fetchActiveQuests()
  }, [fetchActiveQuests])

  useEffect(() => {
    if (selectedQuest) {
      fetchQuestDetails(selectedQuest.id)
    } else {
      setQuestDetails(null)
    }
  }, [selectedQuest, fetchQuestDetails])

  const joinQuest = async (questId: string) => {
    setJoiningQuest(questId)
    try {
      const res = await fetch(`${apiBase}/api/v1/social/group-quests/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_quest_id: questId, user_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        toast.success('퀘스트에 참여했어요!')
        fetchActiveQuests()
        if (selectedQuest?.id === questId) {
          fetchQuestDetails(questId)
        }
      } else {
        toast.error(data.message || '참여에 실패했어요.')
      }
    } catch {
      toast.error('네트워크 오류가 났어요.')
    } finally {
      setJoiningQuest(null)
    }
  }

  const checkIn = async (questId: string) => {
    setCheckingIn(true)
    try {
      const res = await fetch(`${apiBase}/api/v1/social/group-quests/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_quest_id: questId, user_id: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.success) {
        if (data.all_completed) {
          toast.success('🎉 모두 체크인 완료! 퀘스트 성공!')
        } else {
          toast.success('체크인 완료! 다른 친구들을 기다려주세요.')
        }
        fetchActiveQuests()
        if (selectedQuest?.id === questId) {
          fetchQuestDetails(questId)
        }
      } else {
        toast.error('체크인에 실패했어요.')
      }
    } catch {
      toast.error('네트워크 오류가 났어요.')
    } finally {
      setCheckingIn(false)
    }
  }

  const relativeTime = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const min = Math.max(1, Math.round((Date.now() - d.getTime()) / 60000))
    if (min < 60) return `${min}분 전`
    const h = Math.round(min / 60)
    if (h < 24) return `${h}시간 전`
    return `${Math.round(h / 24)}일 전`
  }

  return (
    <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100vh', background: bgColor, color: textColor, fontFamily: 'Pretendard, sans-serif' }}>
      <div style={{ padding: '60px 20px 120px' }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            onClick={onBack}
            style={{
              padding: 8,
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: textColor,
            }}
          >
            ←
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>👥</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>함께 퀘스트</h2>
            <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280', margin: '4px 0 0' }}>
              친구와 함께 장소를 탐험하세요
            </p>
          </div>
        </div>

        {/* 활성 퀘스트 목록 */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <p style={{ fontSize: 14, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
              퀘스트를 불러오는 중...
            </p>
          </div>
        ) : activeQuests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}` }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>아직 활성 퀘스트가 없어요</p>
            <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
              퀘스트 화면에서 "친구와 함께" 옵션으로 시작해보세요
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeQuests.map((quest) => {
              const progress = quest.max_participants > 0 
                ? (quest.checked_in_count / quest.max_participants) * 100 
                : 0
              const isExpired = quest.expires_at && new Date(quest.expires_at) < new Date()
              
              return (
                <div
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  style={{
                    background: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 16,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    opacity: isExpired ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => !isExpired && (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        flexShrink: 0,
                      }}
                    >
                      👥
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{quest.place_name}</h3>
                      {quest.place_address && (
                        <p style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280', marginBottom: 6 }}>
                          📍 {quest.place_address}
                        </p>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: quest.is_joined ? '#10B981' : accentColor,
                            background: quest.is_joined ? 'rgba(16,185,129,0.12)' : accentRgba(0.12),
                            padding: '3px 8px',
                            borderRadius: 20,
                          }}
                        >
                          {quest.is_joined ? '참여 중' : '초대됨'}
                        </span>
                        <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>
                          {quest.current_participants}/{quest.max_participants}명
                        </span>
                        <span style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>
                          · {relativeTime(quest.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 진행도 바 */}
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        width: '100%',
                        height: 6,
                        background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${accentColor}, #F59E0B)`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280', marginTop: 4 }}>
                      {quest.checked_in_count}/{quest.max_participants}명 체크인 완료
                    </p>
                  </div>

                  {isExpired && (
                    <div
                      style={{
                        fontSize: 11,
                        color: '#EF4444',
                        background: 'rgba(239,68,68,0.1)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      ⏰ 만료됨
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 퀘스트 상세 모달 */}
      {selectedQuest && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setSelectedQuest(null)}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: 20,
              border: `1px solid ${borderColor}`,
              maxWidth: 400,
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ padding: 16, borderBottom: `1px solid ${borderColor}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                    {selectedQuest.place_name}
                  </h3>
                  {selectedQuest.place_address && (
                    <p style={{ margin: 0, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                      📍 {selectedQuest.place_address}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedQuest(null)}
                  style={{
                    flexShrink: 0,
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: textColor,
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
              {detailsLoading ? (
                <p style={{ textAlign: 'center', color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                  불러오는 중...
                </p>
              ) : questDetails ? (
                <>
                  {/* 진행 상태 */}
                  <div
                    style={{
                      background: isDarkMode ? accentRgba(0.12) : accentRgba(0.08),
                      border: `1px solid ${accentColor}40`,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>진행 상황</span>
                      <span style={{ fontSize: 12, color: accentColor, fontWeight: 600 }}>
                        {questDetails.quest.checked_in_count}/{questDetails.quest.max_participants}명 완료
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: 8,
                        background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        borderRadius: 4,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${(questDetails.quest.checked_in_count / questDetails.quest.max_participants) * 100}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${accentColor}, #F59E0B)`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>

                  {/* 참여자 목록 */}
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>참여자</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {questDetails.participants.map((p) => {
                        const name = p.user_info?.display_name || p.user_info?.username || p.user_id.slice(0, 8)
                        const avatar = p.user_info?.profile_image_url
                        const isMe = p.user_id === userId

                        return (
                          <div
                            key={p.user_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: 10,
                              background: isDarkMode ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                              borderRadius: 10,
                              border: `1px solid ${borderColor}`,
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                overflow: 'hidden',
                                background: 'linear-gradient(135deg, #E8740C, #F59E0B)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {avatar ? (
                                <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                name.slice(0, 1)
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>
                                {name} {isMe && '(나)'}
                              </div>
                              <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#6B7280' }}>
                                {relativeTime(p.joined_at)}
                              </div>
                            </div>
                            {p.checked_in ? (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: '#10B981',
                                  background: 'rgba(16,185,129,0.12)',
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                }}
                              >
                                ✓ 완료
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: isDarkMode ? 'rgba(255,255,255,0.4)' : '#9CA3AF',
                                  background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                  padding: '4px 10px',
                                  borderRadius: 999,
                                }}
                              >
                                대기 중
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!selectedQuest.is_joined ? (
                      <button
                        onClick={() => joinQuest(selectedQuest.id)}
                        disabled={joiningQuest === selectedQuest.id}
                        style={{
                          width: '100%',
                          padding: 14,
                          borderRadius: 12,
                          border: 'none',
                          background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`,
                          color: '#fff',
                          fontSize: 15,
                          fontWeight: 700,
                          cursor: joiningQuest === selectedQuest.id ? 'not-allowed' : 'pointer',
                          opacity: joiningQuest === selectedQuest.id ? 0.7 : 1,
                        }}
                      >
                        {joiningQuest === selectedQuest.id ? '참여 중...' : '🚀 퀘스트 참여하기'}
                      </button>
                    ) : (
                      <>
                        {questDetails.participants.find((p) => p.user_id === userId)?.checked_in ? (
                          <div
                            style={{
                              padding: 14,
                              borderRadius: 12,
                              background: 'rgba(16,185,129,0.12)',
                              border: '1px solid #10B981',
                              color: '#10B981',
                              fontSize: 14,
                              fontWeight: 700,
                              textAlign: 'center',
                            }}
                          >
                            ✓ 체크인 완료! 다른 친구들을 기다려주세요
                          </div>
                        ) : (
                          <button
                            onClick={() => checkIn(selectedQuest.id)}
                            disabled={checkingIn}
                            style={{
                              width: '100%',
                              padding: 14,
                              borderRadius: 12,
                              border: 'none',
                              background: `linear-gradient(135deg, ${accentColor}, #F59E0B)`,
                              color: '#fff',
                              fontSize: 15,
                              fontWeight: 700,
                              cursor: checkingIn ? 'not-allowed' : 'pointer',
                              opacity: checkingIn ? 0.7 : 1,
                            }}
                          >
                            {checkingIn ? '체크인 중...' : '✓ 체크인하기'}
                          </button>
                        )}
                        {onInviteKakaoFriends && (
                          <button
                            onClick={() => {
                              setSelectedQuest(null)
                              onInviteKakaoFriends(selectedQuest.id, selectedQuest.place_name)
                            }}
                            style={{
                              width: '100%',
                              padding: 12,
                              borderRadius: 12,
                              border: `1px solid ${borderColor}`,
                              background: 'transparent',
                              color: textColor,
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            💬 친구 더 초대하기
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {BottomNav}
    </div>
  )
}
