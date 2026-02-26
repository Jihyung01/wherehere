# Supabase + 카카오/구글 로그인 설정 가이드

## 1. Supabase URL·Anon Key 발급 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

### 1-1. Supabase 가입 및 프로젝트 생성

1. **https://supabase.com** 접속 후 회원가입/로그인
2. **New Project** 클릭
3. **Organization** 선택(없으면 생성), **Project name** 입력(예: wherehere), **Database Password** 설정 후 **Create new project** 클릭
4. 프로젝트가 생성될 때까지 1~2분 대기

### 1-2. URL과 Anon Key 찾기

1. 왼쪽 메뉴에서 **Project Settings**(톱니바퀴 아이콘) 클릭
2. **API** 메뉴 클릭
3. **Project URL** → 이게 `NEXT_PUBLIC_SUPABASE_URL` 값
   - 예: `https://abcdefghijk.supabase.co`
4. **Project API keys** 섹션에서 **anon public** 키 복사 → 이게 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 값
   - (참고: `service_role` 키는 서버 전용, 프론트에는 **anon** 만 사용)

### 1-3. Vercel에 환경 변수 등록

1. **https://vercel.com** → 해당 프로젝트(wherehere) 선택
2. **Settings** → **Environment Variables**
3. 아래 두 개 추가:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | 1-2에서 복사한 **Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 1-2에서 복사한 **anon public** 키 |

4. **Save** 후 **Redeploy** 한 번 실행

---

## 2. Supabase URL Configuration (Site URL / Redirect URLs)

1. Supabase 대시보드 → **Authentication** → **URL Configuration**
2. 다음만 설정하면 됩니다.

| 항목 | 입력값 |
|------|--------|
| **Site URL** | `https://wherehere-seven.vercel.app/auth/callback` |
| **Redirect URLs** | 한 줄에 하나씩 두 개 추가:<br>• `https://wherehere-seven.vercel.app`<br>• `https://wherehere-seven.vercel.app/auth/callback` |

3. **Save** 클릭

- **Site URL을 `/auth/callback`까지 넣는 이유**: 카카오 로그인 시 `redirectTo`를 생략해 Kakao 요청에 `redirect_uri`가 한 번만 전달되도록 했습니다. 이때 로그인 성공 후 Supabase가 사용자를 보내는 기본 주소가 Site URL이므로, **Site URL = 우리 앱의 /auth/callback**으로 두면 됩니다.
- 다른 도메인 쓰면 위 예시를 해당 도메인으로 바꾸면 됩니다.

---

## 3. 카카오 / 구글 Redirect URI – “Supabase 콜백 URL” 쓰는 방법 (쉬운 순서)

우리 앱 주소가 아니라 **Supabase가 주는 콜백 URL**을 카카오/구글에 등록해야 합니다.

### 3-1. Supabase에서 “쓸 콜백 URL” 확인하기

1. Supabase 대시보드 → **Authentication** → **Providers**
2. **Kakao** 또는 **Google** 클릭
3. **Callback URL (for OAuth)** 이라고 적힌 URL을 복사  
   - 형태: `https://<프로젝트ID>.supabase.co/auth/v1/callback`  
   - 예: `https://abcdefghijk.supabase.co/auth/v1/callback`

이 URL을 **카카오/구글 개발자 콘솔의 Redirect URI**에 그대로 붙여넣으면 됩니다.

---

### 3-2. 카카오 개발자 콘솔에서 설정

1. **https://developers.kakao.com** 로그인
2. **내 애플리케이션** → 사용할 앱 선택(또는 새로 만들기)
3. **앱 설정** → **플랫폼** → **Web** 플랫폼 추가(이미 있으면 수정)
4. **사이트 도메인**에 `https://wherehere-seven.vercel.app` 추가 후 저장
5. **카카오 로그인** 메뉴 → **활성화 설정** ON
6. **Redirect URI** 설정:
   - **Redirect URI** 란에 **Supabase에서 복사한 Callback URL** 붙여넣기  
     → `https://<프로젝트ID>.supabase.co/auth/v1/callback`
   - **등록** 클릭
7. **동의 항목**에서 필요한 항목(프로필, 이메일 등) 켜기
8. **REST API 키**는 Supabase Kakao 설정에서 필요하면 복사해 둠

Supabase 쪽 Kakao 설정:
- **Authentication** → **Providers** → **Kakao**
- **Kakao Client ID**: 카카오 앱 **REST API 키** 입력
- **Kakao Client Secret**: (카카오에서 발급 시) 해당 시크릿 입력 후 저장

---

### 3-3. 구글 개발자 콘솔에서 설정

1. **https://console.cloud.google.com** 로그인
2. 프로젝트 선택(또는 새 프로젝트 생성)
3. **API 및 서비스** → **사용자 인증 정보**
4. **+ 사용자 인증 정보 만들기** → **OAuth 클라이언트 ID**
5. 애플리케이션 유형: **웹 애플리케이션**
6. **승인된 리디렉션 URI**에 **Supabase에서 복사한 Callback URL** 한 개 추가  
   → `https://<프로젝트ID>.supabase.co/auth/v1/callback`
7. **만들기** 후 **클라이언트 ID**와 **클라이언트 보안 비밀** 복사

Supabase 쪽 Google 설정:
- **Authentication** → **Providers** → **Google**
- **Client ID** / **Client Secret** 에 위에서 복사한 값 입력 후 저장

---

## 요약 체크리스트

- [ ] Supabase 프로젝트 생성 후 **Project URL** = `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Supabase **anon public** 키 = `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Vercel 환경 변수 두 개 등록 후 재배포
- [ ] Supabase **URL Configuration**: Site URL + Redirect URLs 두 개만 설정
- [ ] 카카오/구글 **Redirect URI** = Supabase **Callback URL** (`.../auth/v1/callback`) 하나만 등록
- [ ] Supabase **Providers**에서 Kakao/Google에 각각 Client ID·Secret 입력

이 순서대로 하면 카카오/구글 로그인이 동작합니다.
