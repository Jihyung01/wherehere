# 카카오톡 소셜 기능 확장 가이드

카카오 Developer에서 **카카오톡 메시지 / 친구목록 동의항목 승인**을 받은 후, 앱 내에서 UX/UI적으로 추가하고 서비스적으로 카카오톡 공유 및 동기화를 확대한 기능들입니다.

---

## 🎯 구현된 기능 (B-A-C 순서)

### B. 친구 활동 피드 강화 ✅

#### 1. 좋아요 시스템
- **기능**: 게시글에 좋아요/좋아요 취소
- **UI**: 
  - 소셜 탭 → 피드에서 ❤️ 버튼 클릭
  - 좋아요 수 실시간 표시
  - 낙관적 업데이트로 즉각 반응
- **알림**: 게시글 작성자에게 "○○님이 좋아요를 눌렀어요" 알림 전송
- **API**:
  - `POST /api/v1/social/posts/like` - 좋아요 추가
  - `DELETE /api/v1/social/posts/like` - 좋아요 취소
  - `GET /api/v1/social/posts/{post_id}/likes` - 좋아요 목록 조회

#### 2. 댓글 시스템
- **기능**: 게시글에 댓글 작성/조회
- **UI**:
  - 소셜 탭 → 피드에서 💬 버튼 클릭
  - 댓글 입력창 (최대 160자)
  - 작성자 프로필 이미지 표시
- **알림**: 게시글 작성자에게 "○○님이 댓글을 남겼어요" 알림 전송
- **API**:
  - `POST /api/v1/social/posts/comment` - 댓글 작성
  - `GET /api/v1/social/posts/{post_id}/comments` - 댓글 목록 조회
  - `DELETE /api/v1/social/posts/comment/{comment_id}` - 댓글 삭제

#### 3. 실시간 알림
- **알림 타입**:
  - `post_like` - 좋아요 알림
  - `post_comment` - 댓글 알림
  - `group_quest_join` - 협동 퀘스트 참여 알림
  - `group_quest_invite` - 협동 퀘스트 초대 알림
  - `group_quest_complete` - 협동 퀘스트 완료 알림
- **푸시 알림**: 웹 푸시 자동 전송 (VAPID 설정 필요)

---

### A. 카카오 친구 자동 매칭 ✅

#### 1. 카카오 친구 찾기
- **기능**: 카카오톡 친구 중 WhereHere 앱을 사용하는 친구 자동 발견
- **UI**:
  - 소셜 탭 → 친구 탭 → "🔍 카카오 친구 찾기" 버튼
  - 매칭된 친구 목록 표시 (프로필, 팔로우 버튼)
- **동작 방식**:
  1. 카카오 로그인 시 사용자의 카카오 ID를 `kakao_user_mapping` 테이블에 자동 저장
  2. "카카오 친구 찾기" 클릭 → 카카오 친구 목록 조회
  3. 각 친구의 카카오 ID로 앱 사용자 매칭
  4. 매칭된 친구 표시 (팔로우 여부 포함)
- **API**:
  - `POST /api/v1/social/kakao-id/register` - 카카오 ID 등록 (자동)
  - `POST /api/v1/social/kakao-friends/match` - 카카오 친구 매칭

#### 2. 자동 등록
- 카카오 로그인 시 `provider_token`을 사용해 자동으로 카카오 ID 등록
- 백그라운드에서 실행되므로 사용자 경험에 영향 없음

---

### C. 함께 퀘스트 (협동 미션) ✅

#### 1. 협동 퀘스트 생성
- **기능**: 친구와 함께 도전하는 그룹 퀘스트
- **UI**:
  - 홈 화면 → "👥 함께 퀘스트" 버튼
  - 퀘스트 수락 화면 → "👥 함께 도전" 버튼
- **특징**:
  - 최대 4명까지 참여 가능
  - 24시간 유효
  - 모든 참여자가 체크인해야 완료

#### 2. 퀘스트 참여 & 체크인
- **UI**:
  - 활성 퀘스트 목록 (진행도 바 표시)
  - 참여자 목록 (체크인 상태 표시)
  - 체크인 버튼
- **알림**:
  - 친구 참여 시: "○○님이 함께 퀘스트에 참여했어요"
  - 모두 완료 시: "함께 퀘스트를 완료했어요!"

#### 3. 친구 초대
- **방법 1**: 카카오톡 메시지로 직접 초대
- **방법 2**: 앱 내 알림으로 초대
- **UI**: 퀘스트 상세 → "💬 친구 더 초대하기" 버튼

#### 4. API
- `POST /api/v1/social/group-quests/create` - 협동 퀘스트 생성
- `POST /api/v1/social/group-quests/join` - 퀘스트 참여
- `POST /api/v1/social/group-quests/checkin` - 체크인
- `GET /api/v1/social/group-quests/active` - 활성 퀘스트 목록
- `GET /api/v1/social/group-quests/{quest_id}` - 퀘스트 상세 정보
- `POST /api/v1/social/group-quests/{quest_id}/invite` - 친구 초대

---

## 🗄️ 데이터베이스 스키마

### 새로 추가된 테이블

#### 1. `post_likes` - 게시글 좋아요
```sql
CREATE TABLE post_likes (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
```

#### 2. `post_comments` - 게시글 댓글
```sql
CREATE TABLE post_comments (
    id UUID PRIMARY KEY,
    post_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `kakao_user_mapping` - 카카오 ID 매칭
```sql
CREATE TABLE kakao_user_mapping (
    user_id TEXT PRIMARY KEY,
    kakao_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `group_quests` - 협동 퀘스트
```sql
CREATE TABLE group_quests (
    id UUID PRIMARY KEY,
    creator_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    place_address TEXT,
    max_participants INT DEFAULT 4,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);
```

#### 5. `group_quest_participants` - 협동 퀘스트 참여자
```sql
CREATE TABLE group_quest_participants (
    id UUID PRIMARY KEY,
    group_quest_id UUID NOT NULL REFERENCES group_quests(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    UNIQUE(group_quest_id, user_id)
);
```

### 마이그레이션 실행

```bash
# Supabase CLI 사용
supabase db push

# 또는 Supabase 대시보드에서 SQL Editor로 실행
# 파일: supabase/migrations/20260323_social_likes_comments.sql
```

---

## 🎨 UX/UI 개선 사항

### 1. 소셜 피드 인터랙션
- **좋아요 애니메이션**: 하트 아이콘 스케일 효과
- **댓글 토글**: 부드러운 펼침/접힘 애니메이션
- **낙관적 업데이트**: 서버 응답 전에 UI 먼저 업데이트 (빠른 반응)

### 2. 카카오 친구 찾기
- **자동 매칭**: 로그인만 하면 백그라운드에서 카카오 ID 등록
- **시각적 구분**: 카카오 프로필 사진 + 앱 프로필 정보 함께 표시
- **원클릭 팔로우**: 매칭된 친구를 바로 팔로우 가능

### 3. 협동 퀘스트
- **진행도 바**: 체크인 현황을 시각적으로 표시
- **실시간 업데이트**: 친구가 체크인하면 즉시 반영
- **만료 표시**: 24시간 후 자동 만료 (회색 처리)

---

## 🔄 사용자 플로우

### 플로우 1: 좋아요 & 댓글
```
1. 소셜 탭 → 피드 진입
2. 게시글 보기
3. ❤️ 버튼 클릭 → 좋아요 (작성자에게 알림)
4. 💬 버튼 클릭 → 댓글창 열림
5. 댓글 입력 후 "등록" → 댓글 추가 (작성자에게 알림)
```

### 플로우 2: 카카오 친구 찾기
```
1. 카카오로 로그인 (카카오 ID 자동 등록)
2. 소셜 탭 → 친구 탭
3. "🔍 카카오 친구 찾기" 클릭
4. 동의창 팝업 (friends, talk_message)
5. 매칭된 친구 목록 표시
6. "팔로우" 버튼으로 앱 내 친구 추가
```

### 플로우 3: 함께 퀘스트
```
1. 홈 → "👥 함께 퀘스트" 또는 퀘스트 수락 → "👥 함께 도전"
2. 협동 퀘스트 생성 (24시간 유효)
3. "💬 친구 더 초대하기" → 카카오톡으로 초대 메시지 전송
4. 친구들이 참여
5. 장소 도착 후 각자 체크인
6. 모두 체크인 완료 → 🎉 퀘스트 성공! (전원에게 알림)
```

---

## 📱 화면별 기능 정리

### 홈 화면
- **새 버튼**: "👥 함께 퀘스트" (협동 퀘스트 목록으로 이동)

### 소셜 탭
- **친구 탭**:
  - "💬 친구 초대" - 카카오톡으로 초대 메시지 전송
  - "🔍 카카오 친구 찾기" - 카카오 친구 중 앱 사용자 매칭
- **피드**:
  - ❤️ 좋아요 버튼 (좋아요 수 표시)
  - 💬 댓글 버튼 (댓글 수 표시)
  - 댓글창 (작성자 프로필 이미지 포함)

### 함께 퀘스트 화면 (새로 추가)
- **활성 퀘스트 목록**:
  - 진행도 바 (체크인 현황)
  - 참여 인원 표시
  - 만료 시간 표시
- **퀘스트 상세**:
  - 참여자 목록 (체크인 상태)
  - "🚀 퀘스트 참여하기" 버튼
  - "✓ 체크인하기" 버튼
  - "💬 친구 더 초대하기" 버튼

### 퀘스트 수락 화면
- **새 버튼**: "👥 함께 도전" - 협동 퀘스트로 변환

### 설정 화면
- **카카오톡 연동**: 추가 동의 버튼 (기존)
- **카카오 API 테스트**: 심사 제출용 (기존)

---

## 🔧 기술 구현 세부사항

### 1. 좋아요/댓글 API

#### 좋아요 추가
```typescript
POST /api/v1/social/posts/like
{
  "post_id": "uuid",
  "user_id": "user-id"
}
```

#### 댓글 작성
```typescript
POST /api/v1/social/posts/comment
{
  "post_id": "uuid",
  "user_id": "user-id",
  "body": "댓글 내용"
}
```

### 2. 카카오 친구 매칭 API

#### 카카오 ID 등록 (자동)
```typescript
POST /api/v1/social/kakao-id/register?user_id={user_id}&access_token={token}
```

#### 카카오 친구 매칭
```typescript
POST /api/v1/social/kakao-friends/match
{
  "access_token": "kakao_access_token",
  "user_id": "user-id"
}

// Response
{
  "matched_friends": [
    {
      "user_id": "app-user-id",
      "display_name": "앱 닉네임",
      "kakao_nickname": "카카오 닉네임",
      "kakao_thumbnail": "https://...",
      "is_following": false
    }
  ],
  "total_kakao_friends": 50,
  "matched_count": 3
}
```

### 3. 협동 퀘스트 API

#### 퀘스트 생성
```typescript
POST /api/v1/social/group-quests/create
{
  "creator_id": "user-id",
  "place_id": "place-id",
  "place_name": "장소명",
  "place_address": "주소",
  "max_participants": 4
}
```

#### 퀘스트 참여
```typescript
POST /api/v1/social/group-quests/join
{
  "group_quest_id": "quest-uuid",
  "user_id": "user-id"
}
```

#### 체크인
```typescript
POST /api/v1/social/group-quests/checkin
{
  "group_quest_id": "quest-uuid",
  "user_id": "user-id"
}

// Response
{
  "success": true,
  "all_completed": true  // 모두 체크인 완료 여부
}
```

---

## 🚀 배포 체크리스트

### 1. 데이터베이스 마이그레이션
- [ ] `supabase/migrations/20260323_social_likes_comments.sql` 실행
- [ ] Supabase 대시보드에서 테이블 생성 확인
- [ ] RLS 정책 활성화 확인

### 2. 환경 변수 (변경 없음)
기존 카카오 설정 그대로 사용:
- `NEXT_PUBLIC_KAKAO_MAP_KEY` - 카카오 REST API 키
- `KAKAO_CLIENT_SECRET` - 카카오 Client Secret

### 3. 카카오 Developer 설정
- [ ] **동의항목** 승인 확인:
  - 카카오톡 서비스 내 친구목록 ✅
  - 카카오톡 메시지 전송 ✅
- [ ] **Redirect URI** 등록 확인:
  - `https://your-domain.com/api/auth/kakao-friends-callback`
  - Supabase 콜백 URI

### 4. 테스트
- [ ] 좋아요 추가/취소 동작 확인
- [ ] 댓글 작성/조회 확인
- [ ] 알림 수신 확인
- [ ] 카카오 친구 찾기 동작 확인
- [ ] 협동 퀘스트 생성/참여/완료 확인

---

## 📊 기대 효과

### 1. 사용자 참여 증대
- **좋아요/댓글**: 소셜 인터랙션 활성화 → 재방문율 증가
- **실시간 알림**: 친구 활동 알림 → 앱 재진입 유도

### 2. 바이럴 성장
- **카카오 친구 찾기**: 앱 내 친구 네트워크 자동 구축
- **협동 퀘스트**: 친구와 함께 → 자연스러운 초대 유도

### 3. 리텐션 개선
- **협동 미션**: 친구와 약속 → 재방문 동기 부여
- **소셜 피드**: 친구 활동 확인 → 일일 활성 사용자(DAU) 증가

---

## 🎯 다음 단계 제안

### 1. 초대 보상 시스템
- 친구 초대 시 양쪽 모두 XP 보상
- 레퍼럴 코드 추적
- 누적 초대 수에 따른 배지

### 2. 리더보드
- 주간 XP 랭킹 (친구 vs 전체)
- 지역별 랭킹
- 협동 퀘스트 완료 수 랭킹

### 3. 소셜 챌린지
- 친구와 함께 달성하는 장기 챌린지
- 팀 배지 시스템
- 그룹 보상

### 4. 카카오톡 공유 카드 고도화
- 사용자 정의 템플릿 다양화
- 동적 OG 이미지 생성
- 딥링크 최적화

---

## 🐛 문제 해결

### 좋아요/댓글이 표시되지 않음
- 마이그레이션 실행 확인: `supabase/migrations/20260323_social_likes_comments.sql`
- RLS 정책 활성화 확인
- 브라우저 콘솔에서 API 에러 확인

### 카카오 친구 찾기가 작동하지 않음
- 카카오 로그인 확인 (provider_token 필요)
- 친구 목록 동의 확인
- `kakao_user_mapping` 테이블에 데이터 확인

### 협동 퀘스트 생성 실패
- `group_quests` 테이블 생성 확인
- 백엔드 API 연결 확인
- 브라우저 콘솔에서 에러 로그 확인

---

## 📚 관련 문서

- [카카오 친구/메시지 API 심사 가이드](./KAKAO_FRIENDS_MESSAGE.md)
- [소셜 기능 사용법](./소셜_기능_사용법.md)
- [로드맵 상태](./ROADMAP_STATUS.md)

---

**구현 완료일**: 2026-03-23  
**구현 순서**: B (피드 강화) → A (카카오 친구 매칭) → C (협동 퀘스트)
