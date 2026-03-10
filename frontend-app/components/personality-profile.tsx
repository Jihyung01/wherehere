'use client'

import { useEffect, useState } from 'react'
import { getPersonality, analyzePersonality } from '@/lib/api-client'
import type { UserProfile } from '@/types/ai-features'

interface PersonalityProfileProps {
  userId: string
}

export function PersonalityProfile({ userId }: PersonalityProfileProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [userId])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const data = await getPersonality(userId)
      setProfile(data)
    } catch (err) {
      console.error('Failed to load personality:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await analyzePersonality(userId)
      if (result.success) {
        setProfile({
          personality: result.personality,
          companion_style: result.companion_style,
          preferred_categories: [],
          behavior_stats: { total_visits: 0, avg_duration: 60, social_ratio: 0.5 }
        })
        alert('성격 분석이 완료되었어요! 🎉')
      }
    } catch (err) {
      alert('성격 분석 중 오류가 발생했어요')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return <div className="profile-loading">프로필 로딩 중...</div>
  }

  const hasPersonality = profile?.personality && Object.keys(profile.personality).length > 0

  return (
    <div className="personality-profile">
      <div className="profile-header">
        <h2>👤 나의 성격 프로필</h2>
        {!hasPersonality && (
          <p className="profile-subtitle">
            3개 이상의 장소를 방문하면 AI가 당신의 성격을 분석해요
          </p>
        )}
      </div>

      {!hasPersonality ? (
        <div className="no-personality">
          <div className="no-personality-icon">🔍</div>
          <p>아직 성격 분석 데이터가 없어요</p>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="analyze-button"
          >
            {analyzing ? 'AI 분석 중...' : '지금 분석하기'}
          </button>
        </div>
      ) : (
        <>
          {/* Big Five 성격 */}
          <div className="big-five-section">
            <h3>🧠 Big Five 성격 분석</h3>
            <div className="personality-bars">
              <PersonalityBar
                label="개방성 (Openness)"
                value={profile.personality.openness}
                description="새로운 경험 추구, 창의성"
              />
              <PersonalityBar
                label="성실성 (Conscientiousness)"
                value={profile.personality.conscientiousness}
                description="계획성, 조직성"
              />
              <PersonalityBar
                label="외향성 (Extraversion)"
                value={profile.personality.extraversion}
                description="사교성, 활동성"
              />
              <PersonalityBar
                label="친화성 (Agreeableness)"
                value={profile.personality.agreeableness}
                description="협조성, 공감"
              />
              <PersonalityBar
                label="신경성 (Neuroticism)"
                value={profile.personality.neuroticism}
                description="불안, 스트레스 민감도"
              />
            </div>
          </div>

          {/* AI 동행자 스타일 */}
          <div className="companion-section">
            <h3>🤖 나만의 AI 동행자</h3>
            <div className="companion-grid">
              <div className="companion-item">
                <span className="companion-label">말투</span>
                <span className="companion-value">{profile.companion_style.tone}</span>
              </div>
              <div className="companion-item">
                <span className="companion-label">이모지 사용</span>
                <span className="companion-value">{profile.companion_style.emoji_usage}</span>
              </div>
              <div className="companion-item">
                <span className="companion-label">격식</span>
                <span className="companion-value">{profile.companion_style.formality}</span>
              </div>
              <div className="companion-item">
                <span className="companion-label">격려 수준</span>
                <span className="companion-value">
                  {(profile.companion_style.encouragement_level * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* 행동 통계 */}
          <div className="behavior-section">
            <h3>📊 행동 패턴</h3>
            <div className="behavior-grid">
              <div className="behavior-item">
                <div className="behavior-value">{profile.behavior_stats.total_visits}</div>
                <div className="behavior-label">총 방문</div>
              </div>
              <div className="behavior-item">
                <div className="behavior-value">{profile.behavior_stats.avg_duration}분</div>
                <div className="behavior-label">평균 체류</div>
              </div>
              <div className="behavior-item">
                <div className="behavior-value">
                  {(profile.behavior_stats.social_ratio * 100).toFixed(0)}%
                </div>
                <div className="behavior-label">함께 방문</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="reanalyze-button"
            aria-busy={analyzing}
          >
            {analyzing ? '🔄 AI 분석 중...' : '🔄 재분석하기'}
          </button>
        </>
      )}

      <style jsx>{`
        .personality-profile {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .profile-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .profile-header h2 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .profile-subtitle {
          font-size: 14px;
          color: #666;
        }

        .no-personality {
          text-align: center;
          padding: 60px 20px;
          background: #F9FAFB;
          border-radius: 16px;
        }

        .no-personality-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }

        .no-personality p {
          font-size: 16px;
          color: #666;
          margin-bottom: 25px;
        }

        .analyze-button {
          padding: 14px 32px;
          background: linear-gradient(135deg, #E8740C, #F59E0B);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .big-five-section,
        .companion-section,
        .behavior-section {
          background: white;
          padding: 25px;
          border-radius: 16px;
          margin-bottom: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .big-five-section h3,
        .companion-section h3,
        .behavior-section h3 {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
        }

        .personality-bars {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .companion-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
        }

        .companion-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 15px;
          background: #F9FAFB;
          border-radius: 12px;
        }

        .companion-label {
          font-size: 12px;
          color: #666;
          font-weight: 600;
        }

        .companion-value {
          font-size: 16px;
          font-weight: bold;
          color: #E8740C;
        }

        .behavior-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }

        .behavior-item {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .behavior-value {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .behavior-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .reanalyze-button {
          width: 100%;
          padding: 12px;
          background: #F3F4F6;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
          z-index: 1;
        }

        .reanalyze-button:hover:not(:disabled) {
          background: #E5E7EB;
        }

        .reanalyze-button:disabled {
          cursor: not-allowed;
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}

function PersonalityBar({ label, value, description }: { label: string; value: number; description: string }) {
  const percentage = value * 100
  const level = value > 0.7 ? '높음' : value > 0.4 ? '보통' : '낮음'
  const color = value > 0.7 ? '#10B981' : value > 0.4 ? '#F59E0B' : '#6B7280'

  return (
    <div className="personality-bar">
      <div className="bar-header">
        <span className="bar-label">{label}</span>
        <span className="bar-level" style={{ color }}>{level}</span>
      </div>
      <div className="bar-description">{description}</div>
      <div className="bar-bg">
        <div 
          className="bar-fill"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
      <div className="bar-value">{percentage.toFixed(0)}%</div>

      <style jsx>{`
        .personality-bar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .bar-label {
          font-size: 15px;
          font-weight: 600;
        }

        .bar-level {
          font-size: 13px;
          font-weight: 600;
        }

        .bar-description {
          font-size: 12px;
          color: #888;
        }

        .bar-bg {
          height: 12px;
          background: #f0f0f0;
          border-radius: 6px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          transition: width 0.5s ease;
          border-radius: 6px;
        }

        .bar-value {
          font-size: 12px;
          color: #666;
          text-align: right;
        }
      `}</style>
    </div>
  )
}
