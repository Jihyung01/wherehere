import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

function IconSvg({ size }: { size: number }) {
  const r = Math.round(size * 0.2)
  const pinW = Math.round(size * 0.42)
  const pinH = Math.round(size * 0.5)
  const labelSize = Math.round(size * 0.155)
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#f97316',
        borderRadius: r,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
      }}
    >
      <svg width={pinW} height={pinH} viewBox="0 0 24 28" fill="none">
        <path
          d="M12 0C7.582 0 4 3.582 4 8c0 6 8 16 8 16s8-10 8-16c0-4.418-3.582-8-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
          fill="white"
        />
      </svg>
      <div
        style={{
          color: 'white',
          fontSize: labelSize,
          fontWeight: 900,
          letterSpacing: -1,
          marginTop: Math.round(size * -0.02),
        }}
      >
        here
      </div>
    </div>
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { params: string[] } }
) {
  const filename = params.params?.[0] ?? 'icon-512.png'

  let size = 512
  if (filename.includes('96')) size = 96
  else if (filename.includes('192')) size = 192
  else if (filename.includes('72')) size = 72
  else if (filename.includes('180')) size = 180

  return new ImageResponse(<IconSvg size={size} />, {
    width: size,
    height: size,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
