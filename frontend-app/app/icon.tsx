import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#f97316',
          borderRadius: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        {/* 위치 핀 아이콘 */}
        <div
          style={{
            width: 220,
            height: 220,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="220"
            height="260"
            viewBox="0 0 24 28"
            fill="none"
          >
            <path
              d="M12 0C7.582 0 4 3.582 4 8c0 6 8 16 8 16s8-10 8-16c0-4.418-3.582-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
              fill="white"
            />
          </svg>
        </div>
        <div
          style={{
            color: 'white',
            fontSize: 80,
            fontWeight: 900,
            letterSpacing: -2,
            marginTop: -10,
          }}
        >
          here
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
