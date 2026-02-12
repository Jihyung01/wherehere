# ✅ WhereHere 작업 체크리스트

## 🎯 지금 바로 해야 할 일 (Phase 1 마무리)

### [ ] 1. 데이터베이스 마이그레이션 실행 (5분)

**URL**: https://supabase.com/dashboard/project/rftsnaoexvgjlhhfbsyt/sql

**실행 순서**:
1. SQL Editor 열기
2. `supabase/migrations/20260210_initial_schema_fixed.sql` 파일 내용 복사
3. SQL Editor에 붙여넣고 **Run** 클릭
4. `supabase/seed.sql` 파일 내용 복사
5. SQL Editor에 붙여넣고 **Run** 클릭

**확인**:
```sql
SELECT COUNT(*) FROM public.places;
-- 결과: 15개 장소가 나와야 함
```

---

### [ ] 2. Backend 패키지 설치 (2분)

**⚠️ 중요**: PowerShell을 **관리자 권한**으로 실행하세요!

```powershell
cd backend
pip install -r requirements.txt
```

**권한 오류가 발생하면** (추천):
```powershell
# 가상환경 생성 및 활성화
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**확인**:
```powershell
python -c "import fastapi; print('FastAPI OK')"
```

---

### [ ] 3. 서버 실행 테스트 (1분)

**Backend 실행**:
```powershell
.\start-backend.ps1
```

**확인**: http://localhost:8000/health 접속
- 예상 응답: `{"status": "healthy", ...}`

**Frontend 실행** (새 터미널):
```powershell
.\start-frontend.ps1
```

**확인**: http://localhost:3000 접속

---

### [ ] 4. 회원가입 테스트 (2분)

1. http://localhost:3000/signup 접속
2. 이메일/비밀번호 입력
3. 회원가입 완료
4. 이메일 인증 (Supabase 메일 확인)
5. 로그인 테스트

---

### [ ] 5. 온보딩 플로우 테스트 (2분)

1. 로그인 후 자동으로 `/onboarding`으로 이동
2. Step 1: 닉네임 입력
3. Step 2: 역할 선택 (5가지 중 1개)
4. Step 3: 환영 메시지 확인

---

## 🚀 Phase 2 작업 (마이그레이션 완료 후)

### [ ] 1. 추천 엔진 구현

**Backend**:
- [ ] `routes/recommendations.py` 생성
- [ ] PostGIS 공간 쿼리 함수
- [ ] 역할 기반 필터링 로직
- [ ] 스코어링 알고리즘

**Frontend**:
- [ ] 추천 페이지 (`app/recommendations/page.tsx`)
- [ ] 장소 카드 컴포넌트
- [ ] 지도 통합 (Kakao Map API)

---

### [ ] 2. 퀘스트 시스템

**Backend**:
- [ ] `routes/quests.py` 생성
- [ ] 퀘스트 생성 로직
- [ ] 체크인 검증 (Geofencing)
- [ ] XP 보상 계산

**Frontend**:
- [ ] 퀘스트 목록 페이지
- [ ] 퀘스트 상세 페이지
- [ ] 체크인 버튼 (위치 권한)

---

### [ ] 3. AI 서사 생성

**Backend**:
- [ ] `routes/narratives.py` 생성
- [ ] Claude API 통합
- [ ] 프롬프트 템플릿 (역할별)
- [ ] 컨텍스트 수집 로직

**Frontend**:
- [ ] 서사 보기 페이지
- [ ] 저장/공유 기능
- [ ] 평점 시스템

---

### [ ] 4. 레벨 & XP 시스템

**Backend**:
- [ ] XP 계산 함수 (`level_system.py` 활용)
- [ ] 레벨업 로직
- [ ] 스트릭 보너스 계산
- [ ] 업적 시스템

**Frontend**:
- [ ] 프로필 페이지
- [ ] 레벨 진행바
- [ ] 업적 배지
- [ ] 스트릭 표시

---

## 📋 Phase 3 계획 (Phase 2 완료 후)

- [ ] 실시간 알림 (Supabase Realtime)
- [ ] 소셜 기능 (친구, 팔로우)
- [ ] 크리에이터 모드 (장소 등록)
- [ ] 모바일 앱 (React Native)
- [ ] 관리자 대시보드

---

## 🐛 알려진 이슈

현재 없음

---

## 💡 개선 아이디어

- [ ] 다크 모드 지원
- [ ] 다국어 지원 (i18n)
- [ ] PWA 지원
- [ ] 오프라인 모드
- [ ] 성능 최적화 (이미지 lazy loading)

---

## 📝 메모

- Anthropic API 키는 나중에 발급받아서 추가
- 프로덕션 배포 시 환경변수 재설정 필요
- Supabase 무료 플랜 제한 확인 필요

---

**마지막 업데이트**: 2026-02-12  
**현재 우선순위**: Phase 1 마무리 (마이그레이션 실행)
