'use client'

import { useState } from 'react'
import { createShareLink } from '@/lib/api-client'

interface ShareButtonProps {
  userId: string
  questId: string
  placeId: string
  questData: {
    place_name: string
    narrative: string
    xp: number
    role_type: string
  }
}

export function ShareButton({ userId, questId, placeId, questData }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)

  const handleShare = async () => {
    setSharing(true)
    try {
      const share = await createShareLink(userId, questId, placeId, questData)
      setShareLink(share.share_url)

      // Web Share API 지원 확인
      if (navigator.share) {
        try {
          await navigator.share({
            title: share.title,
            text: share.description,
            url: share.share_url
          })
        } catch (err) {
          // 사용자가 취소한 경우 무시
          if ((err as Error).name !== 'AbortError') {
            console.error('Share failed:', err)
          }
        }
      } else {
        // Web Share API 미지원 시 링크 복사
        await navigator.clipboard.writeText(share.share_url)
        alert('공유 링크가 클립보드에 복사되었어요! 📋')
      }
    } catch (err) {
      alert('공유 링크 생성 중 오류가 발생했어요')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="share-button-container">
      <button
        onClick={handleShare}
        disabled={sharing}
        className="share-button"
      >
        {sharing ? (
          <>
            <span className="spinner"></span>
            공유 준비 중...
          </>
        ) : (
          <>
            📤 공유하기
          </>
        )}
      </button>

      {shareLink && (
        <div className="share-success">
          <p>✅ 공유 링크가 생성되었어요!</p>
          <div className="share-link-box">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="share-link-input"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareLink)
                alert('링크가 복사되었어요!')
              }}
              className="copy-button"
            >
              복사
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .share-button-container {
          margin: 15px 0;
        }

        .share-button {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.2s;
        }

        .share-button:hover:not(:disabled) {
          transform: scale(1.02);
        }

        .share-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .share-success {
          margin-top: 15px;
          padding: 15px;
          background: #D1FAE5;
          border-radius: 12px;
        }

        .share-success p {
          font-size: 14px;
          font-weight: 600;
          color: #059669;
          margin-bottom: 10px;
        }

        .share-link-box {
          display: flex;
          gap: 10px;
        }

        .share-link-input {
          flex: 1;
          padding: 10px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 13px;
          background: white;
        }

        .copy-button {
          padding: 10px 20px;
          background: #10B981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .copy-button:hover {
          background: #059669;
        }
      `}</style>
    </div>
  )
}
