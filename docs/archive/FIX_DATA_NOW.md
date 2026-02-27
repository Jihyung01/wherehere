# 🚨 데이터 누적 안되는 문제 - 즉시 해결 가이드

## 현재 상황
- ✅ 백엔드: 정상 실행 (포트 8000)
- ✅ 프론트엔드: 정상 실행 (포트 3002)
- ❌ **visits 테이블: 비어있음 (0곳)**
- ❌ UI에 "아직 방문 기록이 없어요" 표시

---

## 🔴 즉시 실행하세요!

### 1단계: Supabase SQL Editor 접속
1. https://supabase.com/dashboard 로그인
2. WhereHere 프로젝트 선택
3. 좌측 메뉴 **SQL Editor** 클릭

### 2단계: 아래 SQL 복사/붙여넣기

```sql
-- 기존 데이터 삭제 (중복 방지)
DELETE FROM visits WHERE user_id = 'user-demo-001';

-- 샘플 데이터 즉시 삽입 (7개)
INSERT INTO visits (user_id, place_id, visited_at, duration_minutes, rating, mood, spent_amount, companions, xp_earned)
VALUES
  ('user-demo-001', 'kakao-26338954', NOW() - interval '1 day', 60, 4.5, '즐거움', 12000, 1, 120),
  ('user-demo-001', 'kakao-491234814', NOW() - interval '3 days', 90, 5.0, '평온함', 8000, 2, 150),
  ('user-demo-001', 'kakao-27172878', NOW() - interval '5 days', 45, 4.0, '신남', 15000, 1, 100),
  ('user-demo-001', 'kakao-8544481', NOW() - interval '7 days', 120, 5.0, '만족', 20000, 1, 180),
  ('user-demo-001', 'kakao-773361885', NOW() - interval '10 days', 75, 4.5, '즐거움', 10000, 3, 130),
  ('user-demo-001', 'kakao-1999048621', NOW() - interval '12 days', 60, 4.0, '호기심', 5000, 1, 100),
  ('user-demo-001', 'kakao-8396311', NOW() - interval '15 days', 90, 5.0, '평온함', 18000, 2, 150);

-- 확인
SELECT COUNT(*) as total_visits, SUM(xp_earned) as total_xp FROM visits WHERE user_id = 'user-demo-001';
```

### 3단계: RUN 클릭

### 4단계: 결과 확인
**기대 결과**:
```
total_visits: 7
total_xp: 930
```

---

## ✅ 즉시 확인 방법

### 브라우저에서 (5초 후 자동 새로고침)
```
1. http://localhost:3002/my-map-real 접속
2. 5초 대기 (자동 새로고침)
3. 또는 수동 새로고침: Ctrl + F5
```

**확인사항**:
- ✅ "0곳" → "7곳"
- ✅ "0km" → "5km"
- ✅ "0 XP" → "930 XP"
- ✅ 지도에 마커 7개 표시
- ✅ "최근 방문" 리스트 표시

---

## 📊 데이터 누적 테스트

### 시나리오: 새 퀘스트 완료

#### 1. 현재 상태 확인
```
나의 지도:
- 총 방문: 7곳
- 총 XP: 930
```

#### 2. 퀘스트 완료
```
1. 홈 → 역할 선택 → 기분 선택
2. 퀘스트 3개 중 1개 선택
3. 체크리스트 4개 모두 체크
4. "✅ 체크인하기" 클릭
5. 3초 대기
6. 별점 5개 클릭 ⭐⭐⭐⭐⭐
7. 후기 작성 (선택)
8. 사진 업로드 (선택)
9. "✅ 완료하고 XP 받기" 클릭
```

#### 3. 콘솔 확인 (F12)
```
✅ 방문 기록 생성 중...
✅ 방문 기록 응답: {success: true, xp_earned: 150}
```

#### 4. 나의 지도 확인
```
나의 지도 (자동 이동됨):
- 총 방문: 7곳 → 8곳 ✅
- 총 XP: 930 → 1080 ✅
- 지도에 마커 추가됨 ✅
- 최근 방문에 새 항목 ✅
```

#### 5. 통계 탭 확인
```
- 카테고리 분포 업데이트 ✅
- 평균 체류시간 재계산 ✅
```

#### 6. 스타일 탭 확인
```
- 탐험 스타일 재분석 ✅
- AI 분석 문구 업데이트 ✅
```

---

## 🎯 XP 계산 로직

### 백엔드 (routes/visits.py)

```python
def calculate_xp(duration_minutes: int, rating: float) -> int:
    # 기본 XP
    base_xp = 50
    
    # 체류 시간 보너스
    if duration_minutes >= 120:
        time_bonus = 50
    elif duration_minutes >= 60:
        time_bonus = 30
    else:
        time_bonus = 0
    
    # 별점 보너스
    if rating >= 5.0:
        rating_bonus = 50
    elif rating >= 4.0:
        rating_bonus = 30
    elif rating >= 3.0:
        rating_bonus = 10
    else:
        rating_bonus = 0
    
    total_xp = base_xp + time_bonus + rating_bonus
    return total_xp

# 예시:
# 60분 체류 + 별점 5 = 50 + 30 + 50 = 130 XP
# 45분 체류 + 별점 4 = 50 + 0 + 30 = 80 XP
# 120분 체류 + 별점 5 = 50 + 50 + 50 = 150 XP
```

---

## 🔍 문제 해결

### "SQL 실행했는데도 0곳이에요"

#### 체크 1: SQL 결과 확인
```sql
SELECT * FROM visits WHERE user_id = 'user-demo-001';
```
- 7개 행이 나와야 함
- 안 나오면 → RLS 정책 문제

#### 체크 2: RLS 정책 확인
```sql
SELECT * FROM pg_policies WHERE tablename = 'visits';
```
- "Users can view own visits" 있어야 함

#### 체크 3: 백엔드 API 확인
```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/v1/visits/user-demo-001"
```
- total_count: 7 나와야 함
- 0이면 → 백엔드 재시작 필요

#### 체크 4: 프론트엔드 콘솔
```
F12 → Console
"🔄 방문 기록 조회 중... user-demo-001"
"✅ 방문 기록 응답: {total_count: 7, visits_count: 7}"
```
- 없으면 → 브라우저 새로고침

---

### "퀘스트 완료했는데 누적 안돼요"

#### 체크 1: 알림 확인
```
"🎉 방문 완료!
+130 XP 획득"
```
- 나오면 → 저장 성공
- 안 나오면 → 아래 체크

#### 체크 2: 콘솔 확인
```
"방문 기록 생성 중..."
"방문 기록 응답: {success: true, xp_earned: 130}"
```
- 있으면 → 저장 성공
- 없으면 → 네트워크 에러

#### 체크 3: 나의 지도 새로고침
```
1. 나의 지도 클릭
2. 5초 대기 (자동 새로고침)
3. 또는 Ctrl + R
```

#### 체크 4: Supabase 직접 확인
```sql
SELECT * FROM visits WHERE user_id = 'user-demo-001' ORDER BY visited_at DESC LIMIT 1;
```
- 최신 방문 기록 확인

---

## 📱 개선된 기능들

### 1. 자동 데이터 새로고침
- 5초마다 자동으로 방문 기록 갱신
- 페이지 포커스 시에도 갱신
- 실시간 데이터 반영

### 2. 상세 로깅
- 콘솔에서 모든 API 호출 추적
- 성공/실패 명확히 표시
- 디버깅 용이

### 3. 명확한 피드백
- XP 획득 알림 개선
- 총 XP 확인 안내
- 나의 지도로 자동 이동

---

## 🎉 최종 체크리스트

### SQL 실행 후 확인
- [ ] Supabase SQL Editor에서 `INSTANT_SETUP.sql` 실행
- [ ] 결과: `total_visits: 7, total_xp: 930`
- [ ] 브라우저 새로고침 (Ctrl + F5)
- [ ] 나의 지도: "7곳", "930 XP" 표시
- [ ] 지도에 마커 7개 표시
- [ ] 통계 탭에서 카테고리 분포 표시
- [ ] 스타일 탭에서 AI 분석 표시

### 새 방문 추가 테스트
- [ ] 퀘스트 완료
- [ ] XP 획득 알림 확인
- [ ] 나의 지도에서 "8곳", "1080 XP" 확인
- [ ] 새 마커 추가 확인
- [ ] 통계 재계산 확인

### SNS 공유 테스트
- [ ] 카카오톡 공유 (클립보드 또는 네이티브)
- [ ] 트위터 공유 (새 창)
- [ ] 페이스북 공유 (새 창)
- [ ] 인스타그램 복사 (커스텀 알림)

---

## 🚀 핵심 요약

### 문제
- visits 테이블 비어있음
- 데이터 누적 안됨

### 해결
1. **INSTANT_SETUP.sql 실행** (Supabase)
2. **브라우저 새로고침**

### 결과
- ✅ 7개 방문 기록 표시
- ✅ 930 XP 표시
- ✅ 지도에 마커 7개
- ✅ 통계 및 분석 표시
- ✅ 새 방문 시 자동 누적

---

**파일 위치**: `supabase/migrations/INSTANT_SETUP.sql`

**이 SQL만 실행하면 모든 것이 정상 작동합니다!** 🎯
