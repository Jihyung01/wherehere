# SQL 실행 가이드 (Supabase)

Supabase 대시보드 → **SQL Editor**에서 아래 순서대로 실행하세요.  
이미 적용된 마이그레이션이 있으면 해당 파일은 건너뛰어도 됩니다. (대부분 `CREATE TABLE IF NOT EXISTS` 사용)

---

## 1. 기본 스키마 (최초 1회)

**파일:** `supabase/migrations/20260210_initial_schema.sql`  
- `public.users`, `places`, `quests`, `activity_logs`, `narratives` 등  
- **처음 DB 세팅할 때만** 실행. 이미 프로젝트에 users/places가 있으면 생략 가능.

---

## 2. 알림·소셜·장소 제안

**파일:** `supabase/migrations/20260227_notifications_social.sql`  
- `notifications` — 앱 알림 + 푸시 연동  
- `follows` — 팔로우  
- `feed_activities` — 피드 활동(체크인 등)  
- `place_suggestions` — UGC 장소 제안  

**실행:** SQL Editor에 파일 내용 붙여넣기 후 Run.

---

## 3. 채팅 (DM)

**파일:** `supabase/migrations/20260301_chat.sql`  
- `conversations` — 대화방  
- `messages` — 메시지  
- `auth.users(id)` FK 사용 (Supabase Auth 연동)

**실행:** SQL Editor에 파일 내용 붙여넣기 후 Run.

---

## 4. Web Push 구독

**파일:** `supabase/migrations/20260302_push_subscriptions.sql`  
- `push_subscriptions` — 브라우저 푸시 구독 저장

**실행:** SQL Editor에 파일 내용 붙여넣기 후 Run.

---

## 5. Realtime (알림·메시지 실시간 구독)

**파일:** `supabase/migrations/20260302_realtime_publication.sql`  
- `notifications`, `messages` 테이블을 Realtime publication에 추가  
- **먼저** `notifications`, `messages` 테이블이 있어야 함 (2, 3번 실행 후)

**실행:** SQL Editor에 파일 내용 붙여넣기 후 Run.

---

## 6. 로컬 피드 (동네 게시글·댓글)

**파일:** `supabase/migrations/20260303_local_posts_comments.sql`  
- `local_posts` — 동네/친구 게시글 (story, review, gathering)  
- `local_comments` — 게시글 댓글  
- 프로필 피드·소셜 탭에서 사용

**실행:** SQL Editor에 파일 내용 붙여넣기 후 Run.

---

## 요약 표

| 순서 | 파일 | 내용 |
|------|------|------|
| 1 | `20260210_initial_schema.sql` | users, places, quests 등 (최초 1회) |
| 2 | `20260227_notifications_social.sql` | notifications, follows, feed_activities, place_suggestions |
| 3 | `20260301_chat.sql` | conversations, messages |
| 4 | `20260302_push_subscriptions.sql` | push_subscriptions |
| 5 | `20260302_realtime_publication.sql` | Realtime에 notifications, messages 추가 |
| 6 | `20260303_local_posts_comments.sql` | local_posts, local_comments |

---

## 이미 DB가 있는 경우

- **알림·소셜·채팅·푸시·로컬 피드만 추가**하려면: **2 → 3 → 4 → 5 → 6** 순서로 실행.
- **Realtime**은 2, 3번으로 테이블 생성한 뒤 5번 실행.

파일 경로는 프로젝트 루트 기준입니다. (`supabase/migrations/` 아래)

---

## 이미지 업로드 (피드/프로필 사진)

피드·프로필에서 **파일/앨범 업로드**를 쓰려면 Supabase **Storage**에 버킷이 필요합니다.

1. Supabase 대시보드 → **Storage** → **New bucket**
2. 이름: `uploads`, Public bucket 체크 (또는 RLS 정책으로 읽기 허용)
3. 정책: `INSERT`는 인증된 사용자 또는 anon 허용 (프로젝트 정책에 맞게 설정)

버킷이 없으면 업로드 시 "Storage 버킷 uploads를 생성해 주세요" 오류가 납니다.
