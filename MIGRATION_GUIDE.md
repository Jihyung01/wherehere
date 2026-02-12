# 🗄️ Supabase 마이그레이션 가이드

## 📋 현재 상태
- ✅ Supabase 프로젝트 생성 완료
- ✅ 환경변수 설정 완료
- ✅ 마이그레이션 파일 준비 완료
- ⏳ 데이터베이스 스키마 실행 필요

## 🚀 마이그레이션 실행 방법

### 방법 1: Supabase Dashboard (추천)

1. **Supabase Dashboard 접속**
   - URL: https://supabase.com/dashboard
   - 프로젝트 선택: `rftsnaoexvgjlhhfbsyt`

2. **SQL Editor 열기**
   - 왼쪽 메뉴에서 `SQL Editor` 클릭
   - 또는 직접 URL: https://supabase.com/dashboard/project/rftsnaoexvgjlhhfbsyt/sql

3. **스키마 마이그레이션 실행**
   ```sql
   -- 파일: supabase/migrations/20260210_initial_schema_fixed.sql
   -- 전체 내용을 복사하여 SQL Editor에 붙여넣고 실행 (Run 버튼)
   ```

4. **Seed 데이터 실행**
   ```sql
   -- 파일: supabase/seed.sql
   -- 전체 내용을 복사하여 SQL Editor에 붙여넣고 실행 (Run 버튼)
   ```

5. **확인**
   ```sql
   -- 테이블 생성 확인
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';

   -- 장소 데이터 확인
   SELECT COUNT(*) FROM public.places;
   ```

### 방법 2: Supabase CLI (선택사항)

```bash
# Supabase CLI 설치 (아직 설치 안 했다면)
npm install -g supabase

# 프로젝트 링크
supabase link --project-ref rftsnaoexvgjlhhfbsyt

# 마이그레이션 실행
supabase db push

# 또는 직접 실행
supabase db execute -f supabase/migrations/20260210_initial_schema_fixed.sql
supabase db execute -f supabase/seed.sql
```

## 📊 생성되는 테이블

1. **users** - 사용자 프로필 및 레벨 시스템
2. **places** - 장소 정보 (PostGIS 지원)
3. **quests** - 퀘스트 및 추천
4. **activity_logs** - 활동 기록
5. **narratives** - AI 생성 서사

## 🔐 Row Level Security (RLS)

모든 테이블에 RLS가 자동으로 활성화됩니다:
- ✅ 사용자는 자신의 데이터만 조회/수정 가능
- ✅ 장소는 모든 사용자가 조회 가능
- ✅ Supabase Auth와 자동 연동

## 🧪 마이그레이션 확인

마이그레이션 완료 후 다음 쿼리로 확인:

```sql
-- 1. 확장 기능 확인
SELECT extname FROM pg_extension 
WHERE extname IN ('postgis', 'pg_trgm', 'btree_gist', 'uuid-ossp');

-- 2. 테이블 확인
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 3. 샘플 장소 데이터 확인
SELECT name, primary_category, price_tier 
FROM public.places 
LIMIT 5;

-- 4. 함수 확인
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_places_within_radius';

-- 5. RLS 정책 확인
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## ⚠️ 문제 해결

### 에러: "extension postgis does not exist"
```sql
-- Supabase Dashboard > Database > Extensions에서 PostGIS 활성화
-- 또는 SQL Editor에서:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 에러: "permission denied for schema auth"
- 정상입니다. Supabase가 자동으로 auth 스키마를 관리합니다.
- `handle_new_user()` 트리거는 SECURITY DEFINER로 실행됩니다.

### 테이블이 보이지 않음
```sql
-- public 스키마 확인
SET search_path TO public;
\dt
```

## ✅ 다음 단계

마이그레이션 완료 후:

1. **패키지 설치**
   ```bash
   # Frontend
   cd frontend-app
   npm install

   # Backend
   cd ../backend
   pip install -r requirements.txt
   ```

2. **서버 실행**
   ```bash
   # Backend (터미널 1)
   cd backend
   python main.py

   # Frontend (터미널 2)
   cd frontend-app
   npm run dev
   ```

3. **테스트**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health

## 📝 참고사항

- 마이그레이션은 한 번만 실행하면 됩니다
- Seed 데이터는 필요시 여러 번 실행 가능 (중복 방지 로직 없음)
- 프로덕션 환경에서는 Supabase CLI를 사용하는 것을 권장합니다

---

**작성일**: 2026-02-12  
**프로젝트**: WhereHere v1.0.0
