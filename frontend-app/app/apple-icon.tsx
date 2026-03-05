import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#f97316',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <svg width="80" height="96" viewBox="0 0 24 28" fill="none">
          <path
            d="M12 0C7.582 0 4 3.582 4 8c0 6 8 16 8 16s8-10 8-16c0-4.418-3.582-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
            fill="white"
          />
        </svg>
        <div style={{ color: 'white', fontSize: 28, fontWeight: 900, marginTop: -4 }}>
          here
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
