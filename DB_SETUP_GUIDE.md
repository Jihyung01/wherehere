# 🗄️ 실제 DB 연결 가이드

## 현재 상태
- ❌ Mock 모드로 실행 중 (임의 데이터 반환)
- ✅ 백엔드 코드 준비 완료
- ⚠️ DB 테이블 생성 필요

---

## 📋 Step 1: Supabase에서 테이블 생성

### 1-1. Supabase 대시보드 접속
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: `rftsnaoexvgjlhhfbsyt`

### 1-2. SQL Editor 열기
1. 왼쪽 메뉴에서 **SQL Editor** 클릭
2. **New query** 버튼 클릭

### 1-3. SQL 실행
아래 파일의 내용을 복사해서 붙여넣고 실행:

**파일 경로**: `supabase/migrations/20260213_no_fk.sql`

또는 아래 SQL을 직접 복사:

```sql
-- 1. 기본 테이블 생성 (places 테이블이 없다면)
CREATE TABLE IF NOT EXISTS places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id TEXT UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    location GEOGRAPHY(POINT, 4326),
    primary_category TEXT,
    secondary_categories TEXT[],
    vibe_tags TEXT[],
    description TEXT,
    average_rating FLOAT DEFAULT 0,
    is_hidden_gem BOOLEAN DEFAULT FALSE,
    typical_crowd_level TEXT DEFAULT 'medium',
    average_price INT,
    price_tier TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. AI 기능 테이블 생성
-- (supabase/migrations/20260213_no_fk.sql 파일의 전체 내용 실행)
```

### 1-4. 실행 확인
- 에러 없이 "Success. No rows returned" 메시지가 나오면 성공!
- 왼쪽 메뉴에서 **Table Editor** 클릭하여 테이블 생성 확인

---

## 📋 Step 2: 샘플 장소 데이터 추가

테이블이 비어있으면 추천이 작동하지 않으므로 샘플 데이터를 추가합니다.

### 2-1. SQL Editor에서 실행

```sql
-- 샘플 장소 데이터 추가
INSERT INTO places (
    place_id, name, address, location, 
    primary_category, vibe_tags, description,
    average_rating, is_hidden_gem, average_price
) VALUES
(
    'place-001',
    '연남동 숨은 카페',
    '서울 마포구 연남동',
    ST_SetSRID(ST_MakePoint(126.9250, 37.5665), 4326)::geography,
    '카페',
    ARRAY['조용한', '아늑한', '힙한'],
    '연남동의 숨겨진 보석 같은 카페. 조용하고 아늑한 분위기.',
    4.5,
    true,
    12000
),
(
    'place-002',
    '성수동 루프탑 바',
    '서울 성동구 성수동',
    ST_SetSRID(ST_MakePoint(127.0557, 37.5443), 4326)::geography,
    '바',
    ARRAY['뷰맛집', '루프탑', '감성'],
    '성수동의 핫플레이스. 석양이 아름다운 루프탑 바.',
    4.7,
    false,
    25000
),
(
    'place-003',
    '이태원 북카페',
    '서울 용산구 이태원동',
    ST_SetSRID(ST_MakePoint(126.9942, 37.5347), 4326)::geography,
    '카페',
    ARRAY['책', '조용한', '독서'],
    '책과 함께하는 여유로운 시간. 독서하기 좋은 북카페.',
    4.3,
    true,
    10000
),
(
    'place-004',
    '홍대 보드게임 카페',
    '서울 마포구 홍대',
    ST_SetSRID(ST_MakePoint(126.9250, 37.5563), 4326)::geography,
    '카페',
    ARRAY['보드게임', '친구', '재미'],
    '친구들과 즐기기 좋은 보드게임 카페.',
    4.4,
    false,
    15000
),
(
    'place-005',
    '강남 갤러리 카페',
    '서울 강남구 신사동',
    ST_SetSRID(ST_MakePoint(127.0205, 37.5172), 4326)::geography,
    '카페',
    ARRAY['예술', '전시', '감성'],
    '예술 작품을 감상하며 커피를 즐길 수 있는 갤러리 카페.',
    4.6,
    true,
    18000
);
```

---

## 📋 Step 3: 백엔드 DB 연결 확인

### 3-1. 백엔드 재시작

현재 백엔드를 중지하고 재시작:

```bash
# 터미널에서 Ctrl+C로 백엔드 중지
# 그 다음 재시작
cd backend
python -m uvicorn main:app --reload
```

### 3-2. 연결 확인

백엔드 로그에서 다음 메시지 확인:
- ✅ `Database connected` → DB 연결 성공!
- ⚠️ `Running in mock mode` → DB 연결 실패 (아래 트러블슈팅 참고)

---

## 🔧 트러블슈팅

### 문제 1: "Database connection failed"

**원인**: Supabase 연결 정보가 잘못되었거나 네트워크 문제

**해결**:
1. `.env` 파일의 `DATABASE_URL` 확인
2. Supabase 대시보드에서 Connection String 재확인
   - Settings → Database → Connection string → Session mode
3. 방화벽/VPN 확인

### 문제 2: "relation does not exist"

**원인**: 테이블이 생성되지 않음

**해결**:
1. Supabase SQL Editor에서 테이블 생성 SQL 재실행
2. Table Editor에서 테이블 존재 확인

### 문제 3: "No recommendations found"

**원인**: `places` 테이블이 비어있음

**해결**:
1. 위의 샘플 데이터 SQL 실행
2. Table Editor에서 데이터 확인

---

## ✅ 성공 확인 체크리스트

- [ ] Supabase에서 테이블 생성 완료
- [ ] 샘플 장소 데이터 추가 완료
- [ ] 백엔드 로그에 "Database connected" 표시
- [ ] 프론트엔드에서 퀘스트 추천 작동
- [ ] AI 서사 생성 작동 (Anthropic API 호출)
- [ ] 챌린지 생성 작동
- [ ] 패턴 분석 작동

---

## 🤖 AI 기능 작동 확인

DB 연결 후 다음 기능들이 **실제 AI**를 사용합니다:

1. **퀘스트 추천** - AI가 장소별 서사 생성
2. **성격 분석** - Big Five 모델로 사용자 성격 분석
3. **챌린지 생성** - AI가 맞춤형 챌린지 생성
4. **패턴 분석** - AI가 사용자 패턴 분석 및 추천

모든 기능은 `ANTHROPIC_API_KEY`를 사용하여 실제 Claude AI를 호출합니다.

---

## 📊 비용 모니터링

Anthropic Console에서 API 사용량 확인:
- https://console.anthropic.com/settings/usage

예상 비용:
- 퀘스트 서사 생성: ~$0.005/회
- 성격 분석: ~$0.01/회
- 챌린지 생성: ~$0.02/회
- 패턴 분석: ~$0.015/회
