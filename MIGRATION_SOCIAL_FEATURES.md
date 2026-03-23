# 소셜 기능 마이그레이션 가이드

카카오톡 연동 확장 기능(좋아요/댓글/카카오 친구 찾기/협동 퀘스트)을 배포하기 위한 마이그레이션 가이드입니다.

---

## 🗄️ 데이터베이스 마이그레이션

### 방법 1: Supabase Dashboard (권장)

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **SQL Editor** 메뉴 클릭
4. **New Query** 클릭
5. 아래 파일 내용을 복사해서 붙여넣기:
   - `supabase/migrations/20260323_social_likes_comments.sql`
6. **Run** 버튼 클릭
7. 성공 메시지 확인: "Social features schema created."

### 방법 2: Supabase CLI

```bash
# Supabase CLI 설치 (처음 한 번만)
npm install -g supabase

# 프로젝트 링크 (처음 한 번만)
supabase link --project-ref your-project-ref

# 마이그레이션 실행
supabase db push
```

---

## ✅ 마이그레이션 확인

### 1. 테이블 생성 확인

Supabase Dashboard → **Table Editor**에서 다음 테이블이 생성되었는지 확인:

- ✅ `post_likes` - 게시글 좋아요
- ✅ `post_comments` - 게시글 댓글
- ✅ `kakao_user_mapping` - 카카오 ID 매칭
- ✅ `group_quests` - 협동 퀘스트
- ✅ `group_quest_participants` - 협동 퀘스트 참여자

### 2. RLS 정책 확인

각 테이블의 **Policies** 탭에서 정책이 활성화되었는지 확인:

#### post_likes
- ✅ "Anyone can view likes" (SELECT)
- ✅ "Users can add likes" (INSERT)
- ✅ "Users can remove own likes" (DELETE)

#### post_comments
- ✅ "Anyone can view comments" (SELECT)
- ✅ "Users can add comments" (INSERT)
- ✅ "Users can update own comments" (UPDATE)
- ✅ "Users can delete own comments" (DELETE)

#### kakao_user_mapping
- ✅ "Users can view kakao mapping" (SELECT)
- ✅ "Users can insert own mapping" (INSERT)

#### group_quests
- ✅ "Anyone can view active group quests" (SELECT)
- ✅ "Users can create group quests" (INSERT)
- ✅ "Creators can update own quests" (UPDATE)

#### group_quest_participants
- ✅ "Anyone can view participants" (SELECT)
- ✅ "Users can join quests" (INSERT)
- ✅ "Users can update own participation" (UPDATE)

---

## 🔧 백엔드 재시작

마이그레이션 후 백엔드를 재시작해야 합니다.

### 로컬 개발
```bash
cd backend
# Ctrl+C로 기존 서버 종료 후
python main.py
```

### Railway/Render 등 호스팅
- 자동 재배포되거나
- 수동으로 "Redeploy" 버튼 클릭

---

## 🧪 기능 테스트

### 1. 좋아요 테스트
1. 소셜 탭 → 피드 진입
2. 게시글 하단 ❤️ 버튼 클릭
3. 좋아요 수 증가 확인
4. 다시 클릭 → 좋아요 취소 확인

### 2. 댓글 테스트
1. 소셜 탭 → 피드
2. 게시글 하단 💬 버튼 클릭
3. 댓글 입력 후 "등록" 클릭
4. 댓글이 목록에 표시되는지 확인
5. 작성자 프로필 이미지 표시 확인

### 3. 카카오 친구 찾기 테스트
1. 카카오로 로그인
2. 소셜 탭 → 친구 탭
3. "🔍 카카오 친구 찾기" 클릭
4. 동의창에서 승인
5. 매칭된 친구 목록 확인
6. "팔로우" 버튼 동작 확인

### 4. 협동 퀘스트 테스트
1. 홈 → "👥 함께 퀘스트" 클릭
2. 퀘스트 수락 → "👥 함께 도전" 클릭
3. 협동 퀘스트 생성 확인
4. 친구 초대 (카카오톡 메시지)
5. 친구가 참여 후 체크인
6. 모두 체크인 시 완료 알림 확인

---

## 🐛 문제 해결

### "post_likes does not exist" 에러
- 마이그레이션이 실행되지 않았습니다.
- Supabase Dashboard → SQL Editor에서 마이그레이션 파일 실행

### 좋아요/댓글이 작동하지 않음
- 브라우저 콘솔(F12)에서 API 에러 확인
- 백엔드가 재시작되었는지 확인
- `/api/v1/social/posts/like` 엔드포인트 접근 가능 확인

### 카카오 친구 찾기가 비어있음
1. 카카오 Developer Console 확인:
   - 친구 목록 동의항목 승인 확인
   - Redirect URI 등록 확인
2. 카카오 로그인 확인 (provider_token 필요)
3. 친구도 앱에 로그인하고 동의했는지 확인

### 협동 퀘스트 생성 실패
- `group_quests` 테이블 생성 확인
- 백엔드 로그 확인
- API 엔드포인트 `/api/v1/social/group-quests/create` 접근 가능 확인

---

## 📊 성능 최적화

### 1. 인덱스 확인
마이그레이션에서 자동으로 생성된 인덱스:
- `post_likes`: post_id, user_id, created_at
- `post_comments`: post_id, user_id, created_at
- `kakao_user_mapping`: kakao_id
- `group_quests`: creator_id, place_id, status, expires_at
- `group_quest_participants`: group_quest_id, user_id

### 2. 쿼리 최적화
- 좋아요 수 조회: `Content-Range` 헤더 사용 (카운트만)
- 댓글 조회: 작성자 정보 배치 조회 (N+1 방지)
- 협동 퀘스트: 참여자 정보 한 번에 조회

---

## 🔐 보안 체크리스트

- ✅ RLS 정책 활성화 (모든 테이블)
- ✅ 본인만 좋아요 추가/삭제 가능
- ✅ 본인만 댓글 수정/삭제 가능
- ✅ 카카오 ID는 매칭 전용 (개인정보 최소화)
- ✅ 협동 퀘스트는 모두 조회 가능 (공개)

---

## 📈 모니터링

### 주요 지표
- 좋아요 수 (게시글당 평균)
- 댓글 수 (게시글당 평균)
- 카카오 친구 매칭률 (매칭 수 / 카카오 친구 수)
- 협동 퀘스트 완료율 (완료 / 생성)

### 쿼리 예시
```sql
-- 좋아요 통계
SELECT COUNT(*) as total_likes, COUNT(DISTINCT post_id) as posts_with_likes
FROM post_likes;

-- 댓글 통계
SELECT COUNT(*) as total_comments, COUNT(DISTINCT post_id) as posts_with_comments
FROM post_comments;

-- 카카오 매칭 통계
SELECT COUNT(*) as total_kakao_users
FROM kakao_user_mapping;

-- 협동 퀘스트 통계
SELECT 
  status,
  COUNT(*) as count,
  AVG(current_participants) as avg_participants
FROM group_quests
GROUP BY status;
```

---

## 🎉 완료!

모든 마이그레이션이 완료되었습니다. 이제 다음 기능들을 사용할 수 있습니다:

1. ❤️ 게시글 좋아요/댓글
2. 🔍 카카오 친구 중 앱 사용자 찾기
3. 👥 친구와 협동 퀘스트

자세한 사용법은 [KAKAO_SOCIAL_EXPANSION.md](./docs/KAKAO_SOCIAL_EXPANSION.md)를 참고하세요.
