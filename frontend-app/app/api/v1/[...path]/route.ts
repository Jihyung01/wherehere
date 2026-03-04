/**
 * /api/v1/* → 백엔드( Railway 등 ) 프록시.
 * 같은 출처로 호출해 405/CORS 방지.
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function buildBackendUrl(path: string[], request: NextRequest): string {
  const base = BACKEND.replace(/\/$/, '')
  const pathStr = path.length ? path.join('/') : ''
  const q = request.nextUrl.searchParams.toString()
  return q ? `${base}/api/v1/${pathStr}?${q}` : `${base}/api/v1/${pathStr}`
}

async function proxy(
  request: NextRequest,
  path: string[]
): Promise<NextResponse> {
  const url = buildBackendUrl(path, request)
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.delete('connection')
  const init: RequestInit = {
    method: request.method,
    headers,
    duplex: 'half',
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      init.body = await request.arrayBuffer()
    } catch {
      // no body
    }
  }
  try {
    const res = await fetch(url, init)
    const text = await res.text()
    const contentType = res.headers.get('content-type') || 'application/json'
    if (contentType.includes('application/json')) {
      let data: unknown = text
      try {
        data = JSON.parse(text)
      } catch {
        data = { detail: text }
      }
      return NextResponse.json(data, { status: res.status })
    }
    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    })
  } catch (e) {
    console.error('API proxy error:', e)
    return NextResponse.json(
      { detail: 'Backend unreachable. Check NEXT_PUBLIC_API_URL.' },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxy(request, path || [])
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  return proxy(request, path || [])
}
