# 🚀 WhereHere MVP 배포 가이드

WhereHere를 Vercel과 Railway에 배포하여 피드백을 받을 준비가 완료되었습니다!

---

## 📁 배포 관련 파일

### 프론트엔드 (Vercel)
- ✅ `frontend-app/vercel.json` - Vercel 설정
- ✅ `frontend-app/.env.example` - 환경 변수 예시

### 백엔드 (Railway)
- ✅ `backend/Procfile` - 시작 명령어
- ✅ `backend/runtime.txt` - Python 버전
- ✅ `backend/railway.json` - Railway 설정
- ✅ `backend/nixpacks.toml` - 빌드 설정
- ✅ `backend/.env.example` - 환경 변수 예시

### 문서
- ✅ `QUICK_DEPLOY.md` - **5분 빠른 배포 가이드** (여기서 시작!)
- ✅ `VERCEL_DEPLOYMENT.md` - 상세 배포 가이드
- ✅ `VERCEL_ENV_VARIABLES.md` - 환경 변수 상세 설명
- ✅ `DEPLOYMENT_SECRETS.txt` - **실제 환경 변수 값** (Git 제외됨)

---

## ⚡ 빠른 시작 (5분)

### 1. 환경 변수 확인
`DEPLOYMENT_SECRETS.txt` 파일을 열어서 실제 환경 변수 값을 확인하세요.

### 2. 백엔드 배포 (Railway)
1. https://railway.app 접속
2. GitHub 계정으로 로그인
3. "New Project" → "Deploy from GitHub repo"
4. `Jihyung01/wherehere` 선택
5. Settings → Root Directory: `backend`
6. Variables → RAW Editor → `DEPLOYMENT_SECRETS.txt`의 "RAILWAY RAW EDITOR용" 섹션 복사/붙여넣기
7. 배포 완료 후 URL 확인 (예: `https://xxx.railway.app`)

### 3. 프론트엔드 배포 (Vercel)
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. "Add New..." → "Project"
4. `Jihyung01/wherehere` 선택
5. Root Directory: `frontend-app`
6. Environment Variables 추가:
   - `NEXT_PUBLIC_KAKAO_MAP_KEY`: 카카오 JavaScript 키
   - `NEXT_PUBLIC_API_URL`: Railway URL (위에서 확인한 URL)
7. Deploy 클릭

### 4. CORS 업데이트
1. Railway Dashboard → Variables
2. `ALLOWED_ORIGINS`에 Vercel URL 추가
3. 예: `https://wherehere.vercel.app,https://*.vercel.app`
4. Redeploy

---

## 📋 체크리스트

### 배포 전
- [ ] `DEPLOYMENT_SECRETS.txt` 파일 확인
- [ ] 카카오 JavaScript API 키 준비
- [ ] Railway 계정 생성
- [ ] Vercel 계정 생성

### 백엔드 배포 (Railway)
- [ ] GitHub repo 연결
- [ ] Root Directory: `backend` 설정
- [ ] 환경 변수 13개 추가
- [ ] 배포 성공 확인
- [ ] Health check: `/health` 접속

### 프론트엔드 배포 (Vercel)
- [ ] GitHub repo 연결
- [ ] Root Directory: `frontend-app` 설정
- [ ] 환경 변수 2개 추가
- [ ] 배포 성공 확인
- [ ] 브라우저에서 접속 테스트

### 배포 후
- [ ] CORS 설정 업데이트
- [ ] 기능 테스트 (추천, 퀘스트, 체크인)
- [ ] 콘솔 에러 확인 (F12)
- [ ] 모바일 테스트

---

## 🧪 배포 확인

### 1. 백엔드 Health Check
```
https://your-backend.railway.app/health
```
예상 응답:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### 2. 프론트엔드 접속
```
https://your-frontend.vercel.app
```

### 3. 기능 테스트
- ✅ 메인 페이지 로딩
- ✅ 추천 장소 표시
- ✅ 퀘스트 수락
- ✅ 체크인 → 리뷰 → XP 획득
- ✅ 나의 지도 페이지

---

## 🐛 문제 해결

### "Failed to fetch"
→ `NEXT_PUBLIC_API_URL` 확인, Railway URL과 일치하는지

### "Kakao Map not loading"
→ JavaScript 키 확인 (REST API 키 아님!)

### CORS 에러
→ `ALLOWED_ORIGINS`에 Vercel URL 추가

### 빌드 실패
→ 로컬에서 `npm run build` 테스트

---

## 📱 피드백 받기

### 공유 링크
```
https://wherehere.vercel.app
```

### 피드백 요청 사항
1. 첫 인상 및 UI/UX
2. 추천 장소의 유용성
3. 퀘스트 완료 플로우
4. 개선이 필요한 부분
5. 가장 마음에 드는 기능

---

## 🔄 업데이트 배포

코드 수정 후:
```bash
git add .
git commit -m "feat: 피드백 반영"
git push origin main
```

→ Vercel과 Railway가 자동으로 재배포됩니다!

---

## 📚 추가 문서

- **빠른 배포**: `QUICK_DEPLOY.md`
- **상세 가이드**: `VERCEL_DEPLOYMENT.md`
- **환경 변수**: `VERCEL_ENV_VARIABLES.md`
- **실제 값**: `DEPLOYMENT_SECRETS.txt` (Git 제외)

---

## 🎉 배포 완료!

- ✅ 프론트엔드: Vercel
- ✅ 백엔드: Railway
- ✅ 데이터베이스: Supabase
- ✅ MVP 배포 완료!

**이제 피드백을 받고 개선하세요!** 🚀

---

## 📞 도움말

- Railway: https://docs.railway.app
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Kakao: https://developers.kakao.com

**성공적인 배포를 기원합니다!** 🎊
