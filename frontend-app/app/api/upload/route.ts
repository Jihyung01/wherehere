/**
 * 이미지 업로드 API (Supabase Storage)
 * POST /api/upload with FormData { file: File }
 * 반환: { url: string } 또는 4xx/5xx
 * Supabase 대시보드에서 Storage > "uploads" 버킷(public) 생성 필요.
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const BUCKET = 'uploads'

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Route Handler only
          }
        },
      },
    }
  )
}

// Vercel serverless body limit 4.5MB — keep under 4MB
const MAX_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function userFriendlyUploadError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('bucket') || m.includes('not found') || m.includes('does not exist')) {
    return '사진 저장소가 설정되지 않았어요. Supabase 대시보드 > Storage에서 "uploads" 버킷을 public으로 만들어 주세요.'
  }
  if (m.includes('policy') || m.includes('row level')) {
    return '업로드 권한이 없어요. Storage 버킷 정책을 확인해 주세요.'
  }
  return message || '사진 업로드에 실패했어요.'
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl?.trim() || !supabaseAnon?.trim()) {
    return NextResponse.json(
      { error: '사진 저장소가 연결되지 않았어요. NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해 주세요.' },
      { status: 503 }
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '파일 크기는 4MB 이하여야 합니다. 더 작은 사진을 선택하거나 압축 후 올려주세요.' }, { status: 400 })
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'JPEG, PNG, GIF, WebP만 업로드할 수 있습니다.' }, { status: 400 })
    }

    const supabase = await getSupabase()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      const status = error.message?.toLowerCase().includes('bucket') || error.message?.toLowerCase().includes('not found') ? 503 : 500
      return NextResponse.json(
        { error: userFriendlyUploadError(error.message) },
        { status }
      )
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e) {
    console.error('Upload route error:', e)
    return NextResponse.json(
      { error: '사진 업로드 중 오류가 났어요. 잠시 후 다시 시도해 주세요.' },
      { status: 500 }
    )
  }
}
