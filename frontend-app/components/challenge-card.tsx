'use client'

import { useEffect, useState } from 'react'
import { getChallengeProgress, completeChallenge } from '@/lib/api-client'
import type { ChallengeProgress } from '@/types/ai-features'

interface ChallengeCardProps {
  challengeId: string
  userId: string
  onComplete?: () => void
}

export function ChallengeCard({ challengeId, userId, onComplete }: ChallengeCardProps) {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    loadProgress()
    const interval = setInterval(loadProgress, 30000) // 30초마다 갱신
    return () => clearInterval(interval)
  }, [challengeId, userId])

  const loadProgress = async () => {
    try {
      const data = await getChallengeProgress(challengeId, userId)
      setProgress(data)
    } catch (err) {
      console.error('Failed to load challenge progress:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!progress || progress.progress < 1.0) return
    
    setCompleting(true)
    try {
      const result = await completeChallenge(challengeId, userId)
      if (result.success) {
        alert(result.completion_message)
        onComplete?.()
      }
    } catch (err) {
      alert('챌린지 완료 처리 중 오류가 발생했어요')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return <div className="challenge-loading">로딩 중...</div>
  }

  if (!progress) {
    return <div className="challenge-error">챌린지를 불러올 수 없어요</div>
  }

  const { challenge, completed_count, total_places, days_left, ai_comment, next_recommendation } = progress
  const progressPercent = (progress.progress || 0) * 100

  // challenge 데이터가 없으면 로딩 표시
  if (!challenge) {
    return (
      <div className="challenge-card">
        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
          챌린지를 불러오는 중...
        </div>
      </div>
    )
  }

  return (
    <div className="challenge-card">
      {/* 헤더 */}
      <div className="challenge-header">
        <div className="challenge-icon">🏆</div>
        <div className="challenge-info">
          <h3 className="challenge-title">{challenge.title || '챌린지'}</h3>
          <p className="challenge-description">{challenge.description || ''}</p>
        </div>
        <div className={`challenge-difficulty difficulty-${challenge.difficulty || 'medium'}`}>
          {challenge.difficulty === 'easy' ? '쉬움' : 
           challenge.difficulty === 'medium' ? '보통' : '어려움'}
        </div>
      </div>

      {/* 진행 바 */}
      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-text">
            {completed_count} / {total_places} 완료
          </span>
          <span className="progress-percent">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* AI 코멘트 */}
      <div className="ai-comment-box">
        <div className="ai-avatar">🤖</div>
        <div className="ai-comment">{ai_comment}</div>
      </div>

      {/* 남은 시간 */}
      <div className="time-left">
        <span className="time-icon">⏰</span>
        <span className="time-text">
          {days_left > 0 ? `${days_left}일 남음` : '오늘까지!'}
        </span>
      </div>

      {/* 장소 목록 */}
      <div className="places-list">
        <h4>📍 챌린지 장소</h4>
        <div className="places-grid">
          {(challenge.places || []).map((place, i) => (
            <div 
              key={i} 
              className={`place-item ${place.completed ? 'completed' : ''}`}
            >
              <div className="place-number">{place.order || i + 1}</div>
              <div className="place-info">
                <div className="place-name">{place.name || '장소'}</div>
                <div className="place-category">{place.category || '기타'}</div>
                {place.why && <div className="place-why">{place.why}</div>}
              </div>
              <div className="place-status">
                {place.completed ? '✅' : '⬜'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 다음 추천 */}
      {next_recommendation && (
        <div className="next-recommendation">
          <h4>🎯 다음 장소</h4>
          <div className="next-place">
            <div className="next-place-name">{next_recommendation.name}</div>
            <div className="next-place-why">{next_recommendation.why}</div>
          </div>
        </div>
      )}

      {/* 보상 */}
      <div className="rewards-section">
        <h4>🎁 보상</h4>
        <div className="rewards-grid">
          <div className="reward-item">
            <span className="reward-icon">⭐</span>
            <span className="reward-text">+{challenge.rewards?.xp || 0} XP</span>
          </div>
          <div className="reward-item">
            <span className="reward-icon">🏅</span>
            <span className="reward-text">{challenge.rewards?.badge_name || '뱃지'}</span>
          </div>
          {challenge.rewards?.unlock && (
            <div className="reward-item">
              <span className="reward-icon">🔓</span>
              <span className="reward-text">{challenge.rewards.unlock}</span>
            </div>
          )}
        </div>
      </div>

      {/* 완료 버튼 */}
      {progressPercent >= 100 && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="complete-button"
        >
          {completing ? '처리 중...' : '🎉 챌린지 완료하기'}
        </button>
      )}

      <style jsx>{`
        .challenge-card {
          background: white;
          border-radius: 20px;
          padding: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .challenge-header {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          margin-bottom: 30px;
        }

        .challenge-icon {
          font-size: 48px;
        }

        .challenge-info {
          flex: 1;
        }

        .challenge-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .challenge-description {
          font-size: 14px;
          color: #666;
        }

        .challenge-difficulty {
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .difficulty-easy {
          background: #D1FAE5;
          color: #059669;
        }

        .difficulty-medium {
          background: #FEF3C7;
          color: #D97706;
        }

        .difficulty-hard {
          background: #FEE2E2;
          color: #DC2626;
        }

        .progress-section {
          margin-bottom: 25px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
          font-weight: 600;
        }

        .progress-percent {
          color: #E8740C;
        }

        .progress-bar-bg {
          height: 16px;
          background: #f0f0f0;
          border-radius: 8px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #E8740C, #F59E0B);
          transition: width 0.5s ease;
          border-radius: 8px;
        }

        .ai-comment-box {
          display: flex;
          gap: 12px;
          background: linear-gradient(135deg, #FEF3C7, #FDE68A);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .ai-avatar {
          font-size: 32px;
        }

        .ai-comment {
          flex: 1;
          font-size: 16px;
          line-height: 1.6;
          color: #333;
        }

        .time-left {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: #F3F4F6;
          border-radius: 8px;
          margin-bottom: 25px;
          font-weight: 600;
        }

        .time-icon {
          font-size: 20px;
        }

        .places-list h4,
        .next-recommendation h4,
        .rewards-section h4 {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 15px;
        }

        .places-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .place-item {
          display: flex;
          gap: 15px;
          align-items: center;
          padding: 15px;
          background: #F9FAFB;
          border-radius: 12px;
          transition: all 0.3s;
        }

        .place-item.completed {
          background: #D1FAE5;
          opacity: 0.7;
        }

        .place-number {
          width: 32px;
          height: 32px;
          background: #E8740C;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          flex-shrink: 0;
        }

        .place-item.completed .place-number {
          background: #10B981;
        }

        .place-info {
          flex: 1;
        }

        .place-name {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .place-category {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }

        .place-why {
          font-size: 13px;
          color: #888;
          font-style: italic;
        }

        .place-status {
          font-size: 24px;
        }

        .next-recommendation {
          background: linear-gradient(135deg, #E0E7FF, #C7D2FE);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .next-place {
          margin-top: 10px;
        }

        .next-place-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .next-place-why {
          font-size: 14px;
          color: #555;
        }

        .rewards-section {
          background: linear-gradient(135deg, #FEF3C7, #FDE68A);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .rewards-grid {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .reward-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border-radius: 8px;
          font-weight: 600;
        }

        .reward-icon {
          font-size: 20px;
        }

        .complete-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .complete-button:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .complete-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
