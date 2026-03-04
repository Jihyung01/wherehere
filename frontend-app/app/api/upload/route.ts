/**
 * 이미지 업로드 API (Supabase Storage)
 * POST /api/upload with FormData { file: File }
 * 반환: { url: string } 또는 4xx/5xx
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

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { error: error.message || '업로드 실패. Storage 버킷 "uploads"를 생성해 주세요.' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (e) {
    console.error('Upload route error:', e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
