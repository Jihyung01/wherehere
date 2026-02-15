'use client'

import { useState } from 'react'
import { generateChallenge } from '@/lib/api-client'
import type { Challenge } from '@/types/ai-features'

interface ChallengeGeneratorProps {
  userId: string
  onChallengeGenerated?: (challenge: Challenge) => void
}

export function ChallengeGenerator({ userId, onChallengeGenerated }: ChallengeGeneratorProps) {
  const [generating, setGenerating] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(null)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const data = await generateChallenge(userId)
      setChallenge(data)
      onChallengeGenerated?.(data)
    } catch (err) {
      alert('챌린지 생성 중 오류가 발생했어요')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="challenge-generator">
      {!challenge ? (
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="generate-button"
        >
          {generating ? (
            <>
              <span className="spinner"></span>
              AI가 챌린지를 생성하고 있어요...
            </>
          ) : (
            <>
              🏆 이번 주 챌린지 생성하기
            </>
          )}
        </button>
      ) : (
        <div className="challenge-preview">
          <div className="preview-header">
            <h3>🎉 새 챌린지가 생성되었어요!</h3>
          </div>
          <div className="preview-content">
            <h4>{challenge.title}</h4>
            <p>{challenge.description}</p>
            <div className="preview-stats">
              <span>📍 {challenge.places?.length || 0}개 장소</span>
              <span>⏰ {challenge.duration_days || 7}일</span>
              <span>⭐ +{challenge.rewards?.xp || 0} XP</span>
            </div>
          </div>
          <button onClick={() => setChallenge(null)} className="new-challenge-button">
            다른 챌린지 생성
          </button>
        </div>
      )}

      <style jsx>{`
        .challenge-generator {
          margin: 20px 0;
        }

        .generate-button {
          width: 100%;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s;
        }

        .generate-button:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .generate-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .challenge-preview {
          background: white;
          border-radius: 16px;
          padding: 25px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .preview-header h3 {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 20px;
          text-align: center;
        }

        .preview-content h4 {
          font-size: 22px;
          font-weight: bold;
          margin-bottom: 10px;
        }

        .preview-content p {
          font-size: 14px;
          color: #666;
          margin-bottom: 15px;
        }

        .preview-stats {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .preview-stats span {
          padding: 8px 16px;
          background: #F3F4F6;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
        }

        .new-challenge-button {
          width: 100%;
          padding: 12px;
          background: #E8740C;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
