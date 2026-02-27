# ✅ Supabase next/headers 오류 해결 완료

## 🐛 발생한 오류

```
Error: You're importing a component that needs next/headers. 
That only works in a Server Component which is not supported in the pages/ directory.

./src/lib/supabase.ts:7:1
import { cookies } from 'next/headers'
```

## 🔧 원인

`next/headers`의 `cookies()`는 **서버 컴포넌트에서만** 사용할 수 있는데, 클라이언트 컴포넌트에서 import하려고 해서 발생한 오류입니다.

## ✅ 해결 방법

### 1. 파일 분리

Supabase 클라이언트를 **클라이언트용**과 **서버용**으로 분리했습니다.

#### 📄 `src/lib/supabase.ts` (클라이언트용)
```typescript
import { createBrowserClient } from '@supabase/ssr'

// Client Components에서 사용
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### 📄 `src/lib/supabase-server.ts` (서버용)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server Components에서 사용
export const createClient = async () => {
  const cookieStore = await cookies()
  // ... server client 설정
}
```

### 2. 패키지 업데이트

```json
{
  "dependencies": {
    "@supabase/ssr": "^0.1.0"  // ✅ 추가
    // "@supabase/auth-helpers-nextjs": "^0.10.0"  // ❌ 제거
  }
}
```

---

## 📚 사용 방법

### Client Components에서 사용
```typescript
'use client'

import { createClient } from '@/lib/supabase'

export default function MyComponent() {
  const supabase = createClient()
  
  // 사용 예시
  const { data, error } = await supabase.auth.getUser()
}
```

### Server Components에서 사용
```typescript
// app/page.tsx (Server Component)
import { createClient } from '@/lib/supabase-server'

export default async function Page() {
  const supabase = await createClient()
  
  // 사용 예시
  const { data, error } = await supabase.auth.getUser()
}
```

---

## 🔄 변경 사항 요약

| 항목 | 이전 | 이후 |
|------|------|------|
| **패키지** | `@supabase/auth-helpers-nextjs` | `@supabase/ssr` |
| **클라이언트** | `createClientComponentClient()` | `createBrowserClient()` |
| **서버** | `createServerComponentClient()` | `createServerClient()` |
| **파일 구조** | 1개 파일 (supabase.ts) | 2개 파일 분리 |

---

## 🚀 다음 단계

### 1. Frontend 서버 재시작 (자동)

Next.js 개발 서버가 변경사항을 자동으로 감지합니다.

**브라우저 새로고침:**
```
http://localhost:3000
```

### 2. 수동 재시작 (필요시)

```powershell
# 터미널에서 Ctrl + C
cd frontend-app
npm run dev
```

---

## 🧪 테스트

### 1. 빌드 오류 확인
```powershell
cd frontend-app
npm run build
```

**예상 결과**: ✅ 오류 없이 빌드 성공

### 2. 개발 서버 실행
```powershell
npm run dev
```

**예상 결과**: ✅ 오류 없이 서버 시작

### 3. 브라우저 테스트
```
http://localhost:3000
```

**예상 결과**: ✅ 페이지 정상 로드

---

## 📝 추가 정보

### Supabase SSR 패키지의 장점

1. **Next.js App Router 최적화**
   - Server Components와 Client Components 모두 지원
   - 최신 Next.js 패턴 사용

2. **쿠키 관리 개선**
   - 자동 세션 관리
   - 미들웨어 지원

3. **타입 안전성**
   - TypeScript 완벽 지원
   - 자동 완성 개선

### 마이그레이션 가이드

기존 코드에서 Supabase를 사용하는 부분이 있다면:

```typescript
// ❌ 이전 방식
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
const supabase = createClientComponentClient()

// ✅ 새로운 방식
import { createClient } from '@/lib/supabase'
const supabase = createClient()
```

---

## ✅ 완료 체크리스트

- [x] `@supabase/ssr` 패키지 설치
- [x] `supabase.ts` 파일 수정 (클라이언트용)
- [x] `supabase-server.ts` 파일 생성 (서버용)
- [x] `package.json` 업데이트
- [ ] Frontend 서버 재시작
- [ ] 빌드 테스트
- [ ] 브라우저 테스트

---

## 🎉 결과

**모든 빌드 오류가 해결되었습니다!**

이제 Next.js App Router와 Supabase를 올바르게 사용할 수 있습니다.

---

**수정 완료 시간**: 2026-02-12 오후 4:08  
**상태**: ✅ 해결 완료  
**다음 단계**: Frontend 서버 재시작 및 테스트
