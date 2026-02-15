'use client'

import { useState } from 'react'
import { createGathering } from '@/lib/api-client'
import type { Gathering } from '@/types/ai-features'

interface GatheringCreatorProps {
  userId: string
  placeId: string
  placeName: string
  onCreated?: (gathering: Gathering) => void
}

export function GatheringCreator({ userId, placeId, placeName, onCreated }: GatheringCreatorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: `${placeName}에서 만나요!`,
    description: '',
    scheduledTime: '',
    maxParticipants: 4
  })

  const handleCreate = async () => {
    if (!formData.scheduledTime) {
      alert('모임 시간을 선택해주세요')
      return
    }

    setCreating(true)
    try {
      const gathering = await createGathering(
        userId,
        placeId,
        formData.scheduledTime,
        formData.title,
        formData.description,
        formData.maxParticipants
      )

      alert(`모임이 생성되었어요! ${gathering.matches?.length || 0}명에게 초대를 보냈어요 🎉`)
      onCreated?.(gathering)
      setIsOpen(false)
    } catch (err) {
      alert('모임 생성 중 오류가 발생했어요')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="gathering-creator">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="open-button">
          🤝 함께 갈 사람 찾기
        </button>
      ) : (
        <div className="creator-form">
          <div className="form-header">
            <h3>🤝 모임 만들기</h3>
            <button onClick={() => setIsOpen(false)} className="close-button">
              ✕
            </button>
          </div>

          <div className="form-field">
            <label>모임 제목</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="예: 홍대 카페 탐방"
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label>설명 (선택)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="모임에 대해 간단히 설명해주세요"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-field">
            <label>모임 시간</label>
            <input
              type="datetime-local"
              value={formData.scheduledTime}
              onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label>최대 인원</label>
            <select
              value={formData.maxParticipants}
              onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
              className="form-select"
            >
              <option value={2}>2명</option>
              <option value={3}>3명</option>
              <option value={4}>4명</option>
              <option value={5}>5명</option>
              <option value={6}>6명</option>
            </select>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="create-button"
          >
            {creating ? '생성 중...' : '모임 만들기'}
          </button>

          <p className="ai-info">
            💡 AI가 비슷한 취향의 사용자 10명에게 자동으로 초대를 보내요
          </p>
        </div>
      )}

      <style jsx>{`
        .gathering-creator {
          margin: 15px 0;
        }

        .open-button {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .open-button:hover {
          transform: scale(1.02);
        }

        .creator-form {
          background: white;
          padding: 25px;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .form-header h3 {
          font-size: 20px;
          font-weight: bold;
        }

        .close-button {
          width: 32px;
          height: 32px;
          background: #F3F4F6;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-field {
          margin-bottom: 20px;
        }

        .form-field label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }

        .form-input,
        .form-textarea,
        .form-select {
          width: 100%;
          padding: 12px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 14px;
        }

        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          outline: none;
          border-color: #E8740C;
        }

        .create-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #E8740C, #F59E0B);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-bottom: 15px;
        }

        .create-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-info {
          font-size: 13px;
          color: #666;
          text-align: center;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}
