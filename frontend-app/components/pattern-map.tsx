'use client'

import { useEffect, useState } from 'react'
import { analyzePattern } from '@/lib/api-client'
import type { PatternAnalysis } from '@/types/ai-features'

interface PatternMapProps {
  userId: string
}

export function PatternMap({ userId }: PatternMapProps) {
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPattern()
  }, [userId])

  const loadPattern = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await analyzePattern(userId, 90)
      setAnalysis(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="pattern-map-loading">
        <div className="loading-spinner"></div>
        <p>당신의 탐험 패턴을 분석하고 있어요...</p>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="pattern-map-error">
        <p>⚠️ {error || '데이터를 불러올 수 없어요'}</p>
        <button onClick={loadPattern}>다시 시도</button>
      </div>
    )
  }

  if (!analysis.stats || !analysis.ai_analysis || analysis.insufficient_data) {
    return (
      <div className="pattern-map-insufficient">
        <h3>🗺️ 당신만의 서울 지도</h3>
        <p>{analysis.message}</p>
        <p>더 많은 장소를 탐험하고 돌아오세요!</p>
      </div>
    )
  }

  const { stats, ai_analysis } = analysis

  return (
    <div className="pattern-map-container">
      {/* 헤더 */}
      <div className="pattern-header">
        <h2 className="pattern-title">
          {ai_analysis?.style_emoji || '🗺️'} {ai_analysis?.style_name || '탐험가'}
        </h2>
        <p className="pattern-description">{ai_analysis?.style_description || '당신의 탐험 스타일을 분석했어요'}</p>
      </div>

      {/* 통계 대시보드 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total_visits || 0}회</div>
          <div className="stat-label">총 방문</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{(stats?.total_distance_km || 0).toFixed(1)}km</div>
          <div className="stat-label">총 이동 거리</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.avg_duration || 0}분</div>
          <div className="stat-label">평균 체류</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{(stats?.avg_budget || 0).toLocaleString()}원</div>
          <div className="stat-label">평균 예산</div>
        </div>
      </div>

      {/* 성격 특징 */}
      {ai_analysis?.characteristics && ai_analysis.characteristics.length > 0 && (
        <div className="characteristics-section">
          <h3>🎯 당신의 탐험 스타일</h3>
          <div className="characteristics-list">
            {ai_analysis.characteristics.map((char, i) => (
              <div key={i} className="characteristic-item">
                <span className="characteristic-bullet">•</span>
                <span>{char}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 분포 */}
      {stats?.category_distribution && Object.keys(stats.category_distribution).length > 0 && (
        <div className="category-section">
          <h3>📊 선호 카테고리</h3>
          <div className="category-bars">
            {Object.entries(stats.category_distribution).map(([category, percentage]) => (
            <div key={category} className="category-bar-item">
              <div className="category-label">
                <span>{category}</span>
                <span className="category-percentage">{percentage}</span>
              </div>
              <div className="category-bar-bg">
                <div 
                  className="category-bar-fill"
                  style={{ width: percentage }}
                />
              </div>
            </div>
            ))}
          </div>
        </div>
      )}

      {/* 시간대 선호 */}
      {stats?.time_preference && Object.keys(stats.time_preference).length > 0 && (
        <div className="time-section">
        <h3>⏰ 선호 시간대</h3>
        <div className="time-bars">
          {Object.entries(stats.time_preference).map(([time, percentage]) => (
            <div key={time} className="time-bar-item">
              <div className="time-label">
                <span>{time}</span>
                <span className="time-percentage">{percentage}</span>
              </div>
              <div className="time-bar-bg">
                <div 
                  className="time-bar-fill"
                  style={{ width: percentage }}
                />
              </div>
            </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 추천 장소 */}
      {ai_analysis?.recommendations && ai_analysis.recommendations.length > 0 && (
        <div className="recommendations-section">
        <h3>✨ AI가 추천하는 다음 장소</h3>
        <div className="recommendations-grid">
          {ai_analysis.recommendations.map((rec, i) => (
            <div key={i} className="recommendation-card">
              <div className="rec-header">
                <h4>{rec.place_name}</h4>
                <div className="rec-category">{rec.category}</div>
              </div>
              <div className="rec-match">
                <div className="match-score">
                  매칭 {(rec.match_probability * 100).toFixed(0)}%
                </div>
                <div className="match-bar">
                  <div 
                    className="match-bar-fill"
                    style={{ width: `${rec.match_probability * 100}%` }}
                  />
                </div>
              </div>
              <p className="rec-reason">{rec.reason}</p>
              <p className="rec-why">{rec.why_match}</p>
            </div>
            ))}
          </div>
        </div>
      )}

      {/* 지도 플레이스홀더 (Kakao Maps 통합 예정) */}
      <div className="map-section">
        <h3>🗺️ 당신의 탐험 지도</h3>
        <div className="map-placeholder">
          <p>📍 {stats?.main_region || '서울'} 중심</p>
          <p>🎯 탐험 반경: {(stats?.exploration_radius_km || 0).toFixed(1)}km</p>
          <p>🚶 총 이동: {(stats?.total_distance_km || 0).toFixed(1)}km</p>
          <div className="map-coming-soon">
            Kakao Maps 통합 예정
          </div>
        </div>
      </div>

      <style jsx>{`
        .pattern-map-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .pattern-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .pattern-title {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #E8740C, #C65D00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .pattern-description {
          font-size: 18px;
          color: #666;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 30px;
          border-radius: 16px;
          text-align: center;
          color: white;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .stat-value {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          opacity: 0.9;
        }

        .characteristics-section,
        .category-section,
        .time-section,
        .recommendations-section,
        .map-section {
          background: white;
          padding: 30px;
          border-radius: 16px;
          margin-bottom: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        }

        .characteristics-section h3,
        .category-section h3,
        .time-section h3,
        .recommendations-section h3,
        .map-section h3 {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 20px;
        }

        .characteristics-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .characteristic-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 16px;
          line-height: 1.6;
        }

        .characteristic-bullet {
          color: #E8740C;
          font-weight: bold;
          font-size: 20px;
        }

        .category-bars,
        .time-bars {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .category-bar-item,
        .time-bar-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .category-label,
        .time-label {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 600;
        }

        .category-bar-bg,
        .time-bar-bg {
          height: 12px;
          background: #f0f0f0;
          border-radius: 6px;
          overflow: hidden;
        }

        .category-bar-fill,
        .time-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #E8740C, #F59E0B);
          transition: width 0.5s ease;
        }

        .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .recommendation-card {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
          border-radius: 12px;
          transition: transform 0.2s;
        }

        .recommendation-card:hover {
          transform: translateY(-4px);
        }

        .rec-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }

        .rec-header h4 {
          font-size: 18px;
          font-weight: bold;
        }

        .rec-category {
          background: rgba(232, 116, 12, 0.2);
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: #E8740C;
        }

        .rec-match {
          margin-bottom: 15px;
        }

        .match-score {
          font-size: 14px;
          font-weight: 600;
          color: #10B981;
          margin-bottom: 5px;
        }

        .match-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .match-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #10B981, #059669);
          transition: width 0.5s ease;
        }

        .rec-reason {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }

        .rec-why {
          font-size: 13px;
          color: #666;
          line-height: 1.5;
        }

        .map-placeholder {
          background: #f9f9f9;
          padding: 60px;
          border-radius: 12px;
          text-align: center;
          border: 2px dashed #ddd;
        }

        .map-placeholder p {
          font-size: 16px;
          margin-bottom: 10px;
          color: #666;
        }

        .map-coming-soon {
          margin-top: 20px;
          padding: 12px 24px;
          background: #E8740C;
          color: white;
          border-radius: 8px;
          display: inline-block;
          font-weight: 600;
        }

        .pattern-map-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px;
          text-align: center;
        }

        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #E8740C;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .pattern-map-error {
          text-align: center;
          padding: 40px;
        }

        .pattern-map-error button {
          margin-top: 20px;
          padding: 12px 24px;
          background: #E8740C;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
        }

        .pattern-map-insufficient {
          text-align: center;
          padding: 60px;
          background: #f9f9f9;
          border-radius: 16px;
        }

        .pattern-map-insufficient h3 {
          font-size: 24px;
          margin-bottom: 15px;
        }
      `}</style>
    </div>
  )
}
