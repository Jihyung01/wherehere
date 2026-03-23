# 배포 체크리스트 (Vercel + 백엔드)

## Vercel (Next.js — `frontend-app` 루트)

- [ ] **Root Directory**: `frontend-app` (모노레포인 경우)
- [ ] `NEXT_PUBLIC_API_URL` = 백엔드 **루트만** (예: `https://xxx.up.railway.app`) — **`/api/v1` 붙이지 않기**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] 카카오: `NEXT_PUBLIC_KAKAO_MAP_KEY`, `KAKAO_REST_API_KEY` / 시크릿 등 (기능별)
- [ ] (선택) `NEXT_PUBLIC_KAKAO_INVITE_TEMPLATE_ID` — 친구 초대 카드 템플릿
- [ ] 환경 변수 수정 후 **Redeploy** (`NEXT_PUBLIC_*`는 빌드에 포함)

## 백엔드 (Railway / Render / 기타)

- [ ] 서비스 **Running** (트라이얼 만료 시 오프라인 → API 전부 실패)
- [ ] 동일하게 `SUPABASE_URL`, `SUPABASE_ANON_KEY` (또는 서비스 롤 키) 설정
- [ ] `GET {백엔드}/health` → `{"status":"healthy",...}` 확인
- [ ] CORS: 프론트는 보통 **같은 출처** `/api/v1/*` 프록시 사용 — 백엔드 직접 호출 시에만 CORS 필요

## 배포 후 검증

1. 브라우저: `{프론트}/api/health` → `ok: true` 및 백엔드 `status`
2. 브라우저: `{프론트}/api/v1/recommendations?lat=37.5&lng=127` (GET) → JSON 추천 또는 mock
3. (선택) [UptimeRobot](https://uptimerobot.com) 등으로 `{백엔드}/health` 5분 간격 모니터링

## 흔한 실패

| 증상 | 원인 |
|------|------|
| `/api/v1/*` 전부 404 | Vercel 루트가 잘못됐거나 프록시 라우트 미배포 |
| 404이지만 JSON `detail: Not Found` | `NEXT_PUBLIC_API_URL`에 `/api/v1` 중복 |
| 무한 로딩·빈 데이터 | 백엔드 다운 또는 Supabase 일시 중지 |
