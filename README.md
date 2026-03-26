# WhereHere 🗺️

**초개인화 장소 추천 및 서사 생성 시스템**

5가지 페르소나와 레벨 시스템 기반의 완전 맞춤형 장소 추천 플랫폼

---

## ✨ 주요 기능

### 🎭 5가지 역할 시스템
- **탐험가** 🧭: 히든스팟 발견, 넓은 행동반경
- **치유자** 🌿: 조용한 쉼터, 좁은 동네 중심
- **수집가** 📸: 미적 경험, 감각적 장소
- **연결자** 🤝: 사람과의 연결, 사교적 장소
- **달성자** 🏆: 목표 달성, 챌린지 스팟

### 🎯 핵심 시스템
- ✅ **AI 기반 추천**: PostGIS 공간 쿼리 + 다차원 스코어링
- ✅ **레벨 & XP**: 50레벨 시스템, 활동 기반 경험치
- ✅ **스트릭 보너스**: 연속 일수에 따른 보상 (3일/7일/30일/100일)
- ✅ **AI 서사 생성**: Claude 3.5 Sonnet 기반 개인화된 이야기
- ✅ **실시간 인증**: Supabase Auth (이메일 + 소셜 로그인)

### 💬 소셜 기능 (NEW)
- ✅ **좋아요 & 댓글**: 게시글 인터랙션 + 실시간 알림
- ✅ **카카오 친구 찾기**: 카카오톡 친구 중 앱 사용자 자동 매칭
- ✅ **함께 퀘스트**: 친구와 협동 미션 (최대 4명, 24시간 유효)
- ✅ **카카오톡 공유**: 친구 목록/메시지 API 연동 (사용자 정의 템플릿 지원)

---

## 🏗️ 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: TanStack Query (React Query)
- **Auth**: Supabase Auth Helpers
- **UI**: Custom components with CVA

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 14 + PostGIS 3.2
- **Auth**: Supabase + JWT
- **AI**: Anthropic Claude API
- **Async**: asyncpg, asyncio

### Infrastructure
- **Auth & DB**: Supabase
- **Deployment**: Docker + Docker Compose
- **Version Control**: Git

---

## 🚀 빠른 시작

> **⚡ 15분 안에 시작하기**: [QUICK_START.md](./QUICK_START.md) 참고  
> **배포(Vercel + 백엔드)**: [docs/DEPLOYMENT_CHECKLIST.md](./docs/DEPLOYMENT_CHECKLIST.md) · 로드맵 대비 구현 상태: [docs/ROADMAP_STATUS.md](./docs/ROADMAP_STATUS.md)

### 사전 요구사항
- ✅ Node.js 18+ (현재: v22.14.0)
- ✅ Python 3.10+ (현재: 3.10.0)
- ✅ Supabase 계정 (프로젝트 생성 완료)
- ⏳ Anthropic API 키 (Phase 2에서 필요)

### 3단계 시작 가이드

#### 1️⃣ 데이터베이스 마이그레이션 (5분)
```
Supabase SQL Editor에서 실행:
1. supabase/migrations/20260210_initial_schema_fixed.sql
2. supabase/seed.sql
```
📖 상세 가이드: [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)

#### 2️⃣ Backend 패키지 설치 (2분)
```powershell
cd backend
pip install -r requirements.txt
```

#### 3️⃣ 서버 실행 (1분)
```powershell
# 터미널 1 - Backend
.\start-backend.ps1

# 터미널 2 - Frontend
.\start-frontend.ps1
```

### 접속 URL
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 📚 문서 가이드

| 문서 | 설명 |
|------|------|
| **[docs/현재_상태_및_문서_가이드.md](./docs/현재_상태_및_문서_가이드.md)** | 📌 **현재 기능 정리 + 꼭 볼 문서만 정리** (여기서 시작) |
| **[TODO.md](./TODO.md)** | ✅ 작업 체크리스트 (구현됨/미구현) |
| **[QUICK_START.md](./QUICK_START.md)** | ⚡ 빠른 시작 |
| **[프로젝트_실행_가이드.md](./프로젝트_실행_가이드.md)** | 🚀 로컬 실행 방법 |
| **docs/SUPABASE_SOCIAL_LOGIN_SETUP.md** | 🔐 카카오/구글 로그인 설정 |
| **docs/KAKAO_MAP_SETUP.md** | 🗺️ 나의 지도 카카오맵 도메인 등록 |
| **docs/실데이터_설정_가이드.md** | 📊 실데이터 스키마·수집 스크립트 |

### 🏆 정부 지원사업 문서
| 문서 | 설명 |
|------|------|
| **[docs/예비창업패키지_사업계획서.md](./docs/예비창업패키지_사업계획서.md)** | 📋 **예비창업패키지 지원 사업계획서** (완전판) |
| **[docs/예비창업패키지_요약본.md](./docs/예비창업패키지_요약본.md)** | 📄 **5분 읽기 요약본** |
| **[docs/예비창업패키지_발표자료.md](./docs/예비창업패키지_발표자료.md)** | 🎤 **10분 발표 스크립트** (슬라이드 형식) |
| **[docs/예비창업패키지_체크리스트.md](./docs/예비창업패키지_체크리스트.md)** | ✅ **심사 체크리스트 & 합격 전략** |

---

## 📂 프로젝트 구조

```
WhereHere/
├── frontend-app/              # Next.js 프론트엔드
│   ├── src/
│   │   ├── app/              # App Router 페이지
│   │   ├── components/       # React 컴포넌트
│   │   ├── hooks/            # Custom Hooks
│   │   ├── lib/              # 유틸리티 & 클라이언트
│   │   └── types/            # TypeScript 타입
│   └── public/               # 정적 파일
│
├── backend/                   # FastAPI 백엔드
│   ├── core/                 # 핵심 설정 & 보안
│   ├── models/               # Pydantic 모델
│   ├── routes/               # API 라우트
│   └── main.py               # FastAPI 앱
│
├── supabase/                  # 데이터베이스
│   ├── migrations/           # SQL 마이그레이션
│   └── seed.sql              # 샘플 데이터
│
└── docs/                      # 문서
    ├── SETUP_INSTRUCTIONS.md
    ├── PROGRESS.md
    └── INTEGRATION_GUIDE.md
```

---

## 🎮 사용 방법

### 1. 회원가입 & 온보딩
1. `/signup`에서 계정 생성
2. 이메일 인증
3. 온보딩 플로우:
   - 닉네임 설정
   - 역할 선택
   - 환영 화면

### 2. 장소 추천 받기
1. 대시보드에서 현재 위치 허용
2. 역할에 맞는 장소 추천 확인
3. 퀘스트 수락

### 3. 퀘스트 완료
1. 추천된 장소 방문
2. 체크인 (Geofencing)
3. XP 획득 및 레벨업

### 4. AI 서사 생성
1. 퀘스트 완료 시 자동 생성
2. 개인화된 이야기 확인
3. 저장 및 공유

---

## 📊 데이터베이스 스키마

### 주요 테이블
- `users`: 사용자 프로필 & 레벨 시스템
- `places`: 장소 정보 (PostGIS)
- `quests`: 퀘스트 & 추천
- `activity_logs`: 활동 기록
- `narratives`: AI 생성 서사

### 공간 쿼리 예시
```sql
-- 반경 5km 내 장소 검색
SELECT * FROM get_places_within_radius(37.4979, 127.0276, 5000);
```

---

## 🔐 인증 플로우

1. **회원가입**: Supabase Auth (이메일 + 비밀번호)
2. **소셜 로그인**: Kakao, Google OAuth
3. **JWT 검증**: 백엔드에서 Supabase JWT 검증
4. **세션 관리**: React Query + Supabase Client

---

## 🧪 테스트

### Backend 테스트
```bash
cd backend
pytest tests/ -v
```

### Frontend 테스트
```bash
cd frontend-app
npm test
```

---

## 📈 로드맵

### ✅ Phase 1 (완료)
- [x] 인증 시스템
- [x] 사용자 프로필
- [x] 온보딩 플로우
- [x] 기본 UI/UX

### 🔄 Phase 2 (진행 중)
- [ ] 추천 엔진 통합
- [ ] 퀘스트 시스템
- [ ] AI 서사 생성
- [ ] 레벨 & XP 로직

### 📋 Phase 3 (계획)
- [ ] 실시간 알림
- [ ] 소셜 기능 (친구, 공유)
- [ ] 크리에이터 모드
- [ ] 모바일 앱 (React Native)

---

## 🤝 기여하기

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 라이선스

This project is licensed under the MIT License.

---

## 👥 팀

- **Lead Developer**: WhereHere Team
- **Backend**: FastAPI + PostgreSQL
- **Frontend**: Next.js + TypeScript
- **AI**: Claude 3.5 Sonnet

---

## 📞 문의

- **Email**: dev@wherehere.com
- **Documentation**: [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)
- **Issues**: GitHub Issues

---

**Version**: 1.0.0  
**Last Updated**: 2026-02-10  
**Status**: Phase 1 Complete ✅
