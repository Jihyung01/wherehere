'use client'

type LocalMetricsProps = {
  areaName: string
  postCount: number
  gatheringCount: number
  reviewAvg: number
  commentCount: number
  isDarkMode: boolean
  cardBg: string
  borderColor: string
  textColor: string
}

export function LocalMetrics({
  areaName,
  postCount,
  gatheringCount,
  reviewAvg,
  commentCount,
  isDarkMode,
  cardBg,
  borderColor,
  textColor,
}: LocalMetricsProps) {
  const areaTitle = areaName || '내 주변 동네'
  const summary = `실제 피드 기준 ${postCount}개의 글과 ${gatheringCount}개의 모임 글이 열려 있습니다.`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${borderColor}`, padding: 16 }}>
        <p style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 4 }}>NEIGHBORHOOD PULSE</p>
        <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{areaTitle}</span>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginTop: 8, marginBottom: 4, color: textColor }}>
          {areaTitle}에서 지금 살아있는 동네 분위기
        </h3>
        <p style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>{summary}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { label: '오늘 게시글', value: String(postCount) },
          { label: '열린 모임', value: String(gatheringCount) },
          { label: '리뷰 평균', value: reviewAvg.toFixed(1) },
          { label: '활성 댓글', value: String(commentCount) },
        ].map((m, i) => (
          <div
            key={i}
            style={{
              background: cardBg,
              border: `1px solid ${borderColor}`,
              borderRadius: 12,
              padding: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.5)' : '#9CA3AF', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: textColor }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
