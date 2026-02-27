# 알려진 오류 및 제한사항

## 🔴 심각한 문제

### 없음
현재 심각한 문제는 없습니다. 모든 핵심 기능이 작동합니다.

## 🟡 중간 우선순위

### 1. PostGIS 공간 쿼리 미지원
**상태**: 제한적 작동
**설명**: REST API는 PostGIS 함수를 직접 호출할 수 없음
**영향**: 
- 거리 기반 정확한 필터링 불가
- 현재는 모든 장소를 가져온 후 애플리케이션에서 처리
**해결 방법**:
```sql
-- Supabase에서 RPC 함수 생성 필요
CREATE OR REPLACE FUNCTION nearby_places(
  lat FLOAT,
  lng FLOAT,
  radius INT,
  limit_count INT
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  address TEXT,
  -- ... 기타 필드
  distance_meters FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.address,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM places p
  WHERE ST_DWithin(
    p.location,
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
    radius
  )
  ORDER BY distance_meters
  LIMIT limit_count;
END;
$$;
```

### 2. AI 서사 생성 미구현
**상태**: 기본 텍스트 사용
**설명**: Anthropic API 호출이 구현되지 않음
**영향**: 추천 장소에 대한 AI 생성 서사가 단순 텍스트
**해결 방법**: `services/ai_narrative.py`에서 실제 Claude API 호출 구현

### 3. 사용자 인증 미완성
**상태**: 테스트 사용자만 사용 가능
**설명**: Supabase Auth 통합이 부분적
**영향**: 실제 사용자 로그인/회원가입 불가
**해결 방법**: 프론트엔드에 Supabase Auth 통합

## 🟢 낮은 우선순위

### 1. 프론트엔드 포트 충돌
**상태**: 자동 해결됨
**설명**: 포트 3000-3002가 사용 중
**영향**: 포트 3003 사용 (문제 없음)

### 2. Next.js lockfile 경고
**상태**: 무시 가능
**설명**: `patchIncorrectLockfile` 경고
**영향**: 없음 (앱 정상 작동)

### 3. Windows 인코딩 문제
**상태**: 해결됨
**설명**: 한글 출력 시 `cp949` 인코딩 오류
**영향**: 로그에 한글이 깨져 보임 (기능에는 영향 없음)

## 🔧 개선 필요 사항

### 1. 에러 핸들링
- [ ] REST API 실패 시 재시도 로직
- [ ] 더 자세한 에러 메시지
- [ ] 사용자 친화적인 오류 표시

### 2. 성능 최적화
- [ ] Redis 캐싱 추가
- [ ] DB 쿼리 최적화
- [ ] 이미지 최적화

### 3. 테스트
- [ ] 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] E2E 테스트 추가

### 4. 문서화
- [ ] API 문서 자동 생성
- [ ] 개발자 가이드 작성
- [ ] 배포 가이드 작성

## 📊 테스트 결과

### 백엔드 API
- ✅ `/health` - 200 OK
- ✅ `/api/v1/recommendations` - 200 OK (실제 DB 데이터)
- ⚠️ `/api/v1/challenges/generate` - 500 (해결됨)
- ⚠️ `/api/v1/ai/pattern/analyze` - 500 (해결됨)

### 프론트엔드
- ✅ 메인 페이지 로드
- ✅ 추천 장소 표시
- ⚠️ AI 기능 UI 미완성

## 🎯 우선순위 로드맵

1. **즉시** (1-2일)
   - Supabase RPC 함수 생성
   - 거리 기반 필터링 구현

2. **단기** (1주)
   - AI 서사 생성 구현
   - 사용자 인증 완성
   - 에러 핸들링 강화

3. **중기** (2-4주)
   - 성능 최적화
   - 테스트 추가
   - 문서화 완성

4. **장기** (1-3개월)
   - 프로덕션 배포
   - 모니터링 시스템
   - CI/CD 파이프라인
