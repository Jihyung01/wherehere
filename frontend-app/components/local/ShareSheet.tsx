import { useState } from 'react'

interface ShareOption {
  id: 'kakao-friends' | 'kakao-default' | 'link-copy' | 'web-share'
  icon: string
  label: string
  desc: string
}

interface ShareSheetProps {
  isOpen: boolean
  onClose: () => void
  onSelectOption: (optionId: ShareOption['id']) => void
  isDarkMode?: boolean
  content: {
    title: string
    description?: string
    imageUrl?: string
    linkUrl?: string
  }
}

export function ShareSheet({ isOpen, onClose, onSelectOption, isDarkMode = false, content }: ShareSheetProps) {
  const shareOptions: ShareOption[] = [
    {
      id: 'kakao-friends',
      icon: '💬',
      label: '카카오 친구에게',
      desc: '친구를 선택해서 보내기',
    },
    {
      id: 'kakao-default',
      icon: '📱',
      label: '카카오톡으로 공유',
      desc: '대화방 선택해서 보내기',
    },
    {
      id: 'link-copy',
      icon: '🔗',
      label: '링크 복사',
      desc: '어디든 붙여넣기',
    },
    {
      id: 'web-share',
      icon: '📤',
      label: '다른 앱으로 공유',
      desc: '시스템 공유 메뉴',
    },
  ]

  if (!isOpen) return null

  const bgColor = isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)'
  const cardBg = isDarkMode ? '#1F2937' : '#FFFFFF'
  const textColor = isDarkMode ? '#F9FAFB' : '#111827'
  const descColor = isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280'
  const borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : '#E5E7EB'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: bgColor,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '0 16px 16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: '20px 20px 0 0',
          width: '100%',
          maxWidth: 500,
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: 16,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textColor }}>공유하기</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: descColor }}>
              공유 방법을 선택하세요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: textColor,
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* 미리보기 */}
        {content.imageUrl && (
          <div
            style={{
              padding: 16,
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 12,
                padding: 12,
                background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                borderRadius: 12,
              }}
            >
              {content.imageUrl && (
                <img
                  src={content.imageUrl}
                  alt=""
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    objectFit: 'cover',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: textColor,
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {content.title}
                </div>
                {content.description && (
                  <div
                    style={{
                      fontSize: 12,
                      color: descColor,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {content.description}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 공유 옵션 */}
        <div style={{ padding: 16, overflow: 'auto' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {shareOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onSelectOption(option.id)
                  onClose()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 16,
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                  border: `1px solid ${borderColor}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode
                    ? 'rgba(255,255,255,0.1)'
                    : '#F3F4F6'
                  e.currentTarget.style.transform = 'scale(1.02)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isDarkMode
                    ? 'rgba(255,255,255,0.05)'
                    : '#F9FAFB'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <div style={{ fontSize: 32, flexShrink: 0 }}>{option.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: textColor,
                      marginBottom: 2,
                    }}
                  >
                    {option.label}
                  </div>
                  <div style={{ fontSize: 12, color: descColor }}>{option.desc}</div>
                </div>
                <div style={{ fontSize: 18, color: descColor }}>›</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
