'use client'

import { useEffect } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  message: string
  subMessage?: string
  confirmText?: string
  cancelText?: string
  confirmColor?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  message,
  subMessage,
  confirmText = '확인',
  cancelText = '취소',
  confirmColor = '#E8740C',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 430,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 40px',
          animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div style={{ width: 36, height: 4, background: '#E5E7EB', borderRadius: 2, margin: '0 auto 24px' }} />
        <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: subMessage ? 8 : 28, lineHeight: 1.5 }}>
          {message}
        </p>
        {subMessage && (
          <p style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
            {subMessage}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12,
              border: '1px solid #E5E7EB', background: '#F9FAFB',
              color: '#374151', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: '14px 0', borderRadius: 12,
              border: 'none', background: confirmColor,
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}
