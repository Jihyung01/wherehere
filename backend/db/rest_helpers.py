# -*- coding: utf-8 -*-
"""
Supabase REST API 기반 DB 헬퍼
asyncpg 대신 HTTP API 사용
"""

import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import quote
from core.config import settings


class RestDatabaseHelpers:
    """Supabase REST API를 통한 DB 작업"""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.api_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def get_places_nearby(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 3000,
        limit: int = 200
    ) -> List[Dict[str, Any]]:
        """주변 장소 조회 (추천 3곳 채우기 위해 기본 200건)"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "is_active": "eq.true",
                "limit": limit
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            return []
    
    async def get_user_visits(self, user_id: str, days: int = 90) -> List[Dict[str, Any]]:
        """사용자 방문 기록 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/visits"
            params = {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "order": "visited_at.desc",
                "limit": 100
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            return []
    
    async def get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """사용자 프로필 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_personality"
            params = {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "limit": 1
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else {}
            return {}
    
    async def update_user_personality(
        self,
        user_id: str,
        personality: Dict[str, float],
        companion_style: Dict[str, Any]
    ) -> bool:
        """성격 분석 결과 저장"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/user_personality"
            
            data = {
                "user_id": user_id,
                "openness": personality.get("openness", 0.5),
                "conscientiousness": personality.get("conscientiousness", 0.5),
                "extraversion": personality.get("extraversion", 0.5),
                "agreeableness": personality.get("agreeableness", 0.5),
                "neuroticism": personality.get("neuroticism", 0.5),
                "analyzed_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert
            headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
            response = await client.post(url, headers=headers, json=data)
            
            return response.status_code in [200, 201]
    
    async def insert_visit(self, visit_data: Dict[str, Any]) -> Dict[str, Any]:
        """방문 기록 저장 (visits 테이블 사용 - REAL_DATA_SCHEMA와 일치)"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/visits"
            headers = {**self.headers, "Prefer": "return=representation"}
            response = await client.post(url, headers=headers, json=visit_data)
            if response.status_code in [200, 201]:
                results = response.json()
                return results[0] if results else {}
            return {}
    
    async def create_challenge(self, challenge_data: Dict[str, Any]) -> Dict[str, Any]:
        """챌린지 생성"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/challenges"
            
            response = await client.post(url, headers=self.headers, json=challenge_data)
            
            if response.status_code in [200, 201]:
                return response.json()[0] if response.json() else {}
            return {}
    
    async def get_challenge(self, challenge_id: str) -> Optional[Dict[str, Any]]:
        """챌린지 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/challenges"
            params = {
                "select": "*",
                "id": f"eq.{challenge_id}",
                "limit": 1
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else None
            return None
    
    async def get_completed_places(self, user_id: str) -> List[str]:
        """사용자가 완료한 장소 ID 목록"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/visits"
            params = {
                "select": "place_id",
                "user_id": f"eq.{user_id}"
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                visits = response.json()
                return [v["place_id"] for v in visits if v.get("place_id")]
            return []
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """사용자 통계 (기본)"""
        visits = await self.get_user_visits(user_id, 365)
        return {
            "total_visits": len(visits),
            "unique_places": len(set(v.get("place_id") for v in visits if v.get("place_id"))),
            "total_xp": sum(v.get("xp_earned", 0) for v in visits)
        }

    @staticmethod
    def _compute_streak(visited_dates: list) -> tuple:
        """visited_dates: list of date strings (YYYY-MM-DD), sorted desc. Returns (current_streak, longest_streak)."""
        if not visited_dates:
            return 0, 0
        from datetime import datetime, timedelta
        try:
            dates = sorted(set(visited_dates), reverse=True)
            # longest streak
            longest = 1
            current = 1
            for i in range(1, len(dates)):
                d_prev = datetime.strptime(dates[i - 1], "%Y-%m-%d").date()
                d_curr = datetime.strptime(dates[i], "%Y-%m-%d").date()
                if (d_prev - d_curr).days == 1:
                    current += 1
                else:
                    longest = max(longest, current)
                    current = 1
            longest = max(longest, current)
            # current streak: from today or most recent visit
            today = datetime.utcnow().date()
            first_d = datetime.strptime(dates[0], "%Y-%m-%d").date()
            if (today - first_d).days > 1:
                return 0, longest
            cur = 1
            for i in range(1, len(dates)):
                d_prev = datetime.strptime(dates[i - 1], "%Y-%m-%d").date()
                d_curr = datetime.strptime(dates[i], "%Y-%m-%d").date()
                if (d_prev - d_curr).days == 1:
                    cur += 1
                else:
                    break
            return cur, longest
        except Exception:
            return 0, 0

    async def get_user_stats_full(self, user_id: str) -> Dict[str, Any]:
        """레벨/XP/스트릭 등 상세 통계 (visits 기반 실데이터)"""
        visits = await self.get_user_visits(user_id, 365)
        total_xp = sum(v.get("xp_earned", 0) for v in visits)
        unique_places = len(set(v.get("place_id") for v in visits if v.get("place_id")))
        # 레벨: 1레벨당 1000 XP 필요, 레벨 N = (N-1)*1000 ~ N*1000-1
        xp_per_level = 1000
        level = max(1, 1 + total_xp // xp_per_level)
        xp_to_next_level = max(0, level * xp_per_level - total_xp)
        if xp_to_next_level == 0:
            xp_to_next_level = xp_per_level  # 다음 레벨까지
        # 스트릭: 방문일 기준
        visited_dates = []
        for v in visits:
            at = v.get("visited_at")
            if at:
                if isinstance(at, str) and "T" in at:
                    visited_dates.append(at[:10])
                else:
                    visited_dates.append(str(at)[:10])
        current_streak, longest_streak = self._compute_streak(visited_dates)
        # 업적 뱃지: 첫 방문, 7일 연속, 10곳 방문
        badges = []
        if len(visits) >= 1:
            badges.append({"id": "first_visit", "name": "첫 방문", "icon": "🌟"})
        if longest_streak >= 7:
            badges.append({"id": "streak_7", "name": "7일 연속", "icon": "🔥"})
        if unique_places >= 10:
            badges.append({"id": "places_10", "name": "10곳 방문", "icon": "📍"})
        return {
            "level": level,
            "total_xp": total_xp,
            "xp_to_next_level": xp_to_next_level,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "completed_quests": len(visits),
            "total_places_visited": unique_places,
            "total_visits": len(visits),
            "unique_places": unique_places,
            "badges": badges,
        }
    
    async def upsert_place_minimal(
        self, place_id: str, name: str, primary_category: str = "기타",
        latitude: float = 37.5665, longitude: float = 126.9780
    ) -> bool:
        """장소 id/이름/카테고리만으로 places 테이블 upsert (Kakao 등 외부 장소용)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            payload = {
                "id": place_id,
                "name": name,
                "primary_category": primary_category,
                "is_active": True,
                "latitude": latitude,
                "longitude": longitude,
            }
            headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
            resp = await client.post(url, headers=headers, json=payload)
            return resp.status_code in (200, 201)

    async def get_place_by_id(self, place_id: str) -> Optional[Dict[str, Any]]:
        """장소 상세 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "id": f"eq.{place_id}",
                "limit": 1
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                results = response.json()
                return results[0] if results else None
            return None
    
    async def get_all_places(self, limit: int = 100) -> List[Dict[str, Any]]:
        """모든 장소 조회"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = f"{self.base_url}/rest/v1/places"
            params = {
                "select": "*",
                "is_active": "eq.true",
                "limit": limit
            }
            
            response = await client.get(url, headers=self.headers, params=params)
            
            if response.status_code == 200:
                return response.json()
            return []

    # ---------- 알림 ----------
    async def get_notifications(self, user_id: str, limit: int = 50, unread_only: bool = False) -> List[Dict[str, Any]]:
        """사용자 알림 목록"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"{self.base_url}/rest/v1/notifications"
            params = {
                "select": "*",
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc",
                "limit": limit
            }
            if unread_only:
                params["read"] = "eq.false"
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                return response.json()
            return []

    async def create_notification(self, user_id: str, type_: str, title: str, body: str = "", extra: Optional[Dict] = None) -> Optional[Dict]:
        """알림 생성"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/notifications"
            payload = {
                "user_id": user_id,
                "type": type_,
                "title": title,
                "body": body or "",
                "read": False,
                "extra": extra or {}
            }
            response = await client.post(url, headers=self.headers, json=payload)
            if response.status_code in (200, 201):
                out = response.json()
                return out[0] if isinstance(out, list) else out
            return None

    async def mark_notification_read(self, notification_id: str) -> bool:
        """알림 읽음 처리"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/notifications?id=eq.{notification_id}"
            response = await client.patch(url, headers=self.headers, json={"read": True})
            return response.status_code in (200, 204)

    # ---------- Web Push 구독 ----------
    async def get_push_subscriptions(self, user_id: str) -> List[Dict[str, Any]]:
        """사용자 푸시 구독 목록"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/push_subscriptions"
            params = {"user_id": f"eq.{user_id}", "select": "endpoint,p256dh,auth"}
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                return response.json()
            return []

    async def save_push_subscription(
        self, user_id: str, endpoint: str, p256dh: str, auth: str
    ) -> bool:
        """푸시 구독 저장 (endpoint 기준 upsert)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 기존 동일 endpoint 있으면 삭제 후 삽입 (간단 upsert)
            del_url = f"{self.base_url}/rest/v1/push_subscriptions?endpoint=eq.{quote(endpoint, safe='')}"
            await client.delete(del_url, headers=self.headers)
            url = f"{self.base_url}/rest/v1/push_subscriptions"
            payload = {
                "user_id": user_id,
                "endpoint": endpoint,
                "p256dh": p256dh,
                "auth": auth,
            }
            response = await client.post(url, headers=self.headers, json=payload)
            return response.status_code in (200, 201)

    # ---------- 소셜: 팔로우 ----------
    async def follow_user(self, follower_id: str, following_id: str) -> bool:
        """팔로우 추가 (자기 자신은 불가)"""
        if follower_id == following_id:
            return False
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/follows"
            response = await client.post(url, headers=self.headers, json={"follower_id": follower_id, "following_id": following_id})
            return response.status_code in (200, 201)

    async def unfollow_user(self, follower_id: str, following_id: str) -> bool:
        """팔로우 해제"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/follows?follower_id=eq.{follower_id}&following_id=eq.{following_id}"
            response = await client.delete(url, headers=self.headers)
            return response.status_code in (200, 204)

    async def get_following_ids(self, user_id: str) -> List[str]:
        """내가 팔로우하는 사람 ID 목록"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/follows"
            params = {"select": "following_id", "follower_id": f"eq.{user_id}"}
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                rows = response.json()
                return [r["following_id"] for r in rows if r.get("following_id")]
            return []

    async def get_follower_count(self, user_id: str) -> int:
        """팔로워 수"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/follows"
            params = {"select": "id", "following_id": f"eq.{user_id}", "limit": 1}
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                return 0
            return len(response.json())

    # ---------- 소셜: 피드 활동 ----------
    async def create_feed_activity(self, user_id: str, type_: str, place_id: Optional[str] = None, place_name: Optional[str] = None, xp_earned: Optional[int] = None, content: Optional[str] = None) -> Optional[Dict]:
        """피드 활동 생성 (체크인 시 호출)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/feed_activities"
            payload = {"user_id": user_id, "type": type_, "place_id": place_id or "", "place_name": place_name or "", "xp_earned": xp_earned, "content": content or ""}
            response = await client.post(url, headers=self.headers, json=payload)
            if response.status_code in (200, 201):
                out = response.json()
                return out[0] if isinstance(out, list) else out
            return None

    async def get_feed_activities(self, user_ids: List[str], limit: int = 50) -> List[Dict[str, Any]]:
        """여러 사용자의 피드 활동 (팔로우 피드용)"""
        if not user_ids:
            return []
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"{self.base_url}/rest/v1/feed_activities"
            # PostgREST: user_id=in.(id1,id2,id3)
            in_val = "in.(" + ",".join(user_ids) + ")"
            params = {
                "select": "*",
                "order": "created_at.desc",
                "limit": limit,
                "user_id": in_val,
            }
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                return []
            return response.json()

    # ---------- 로컬 피드: local_posts / local_comments ----------
    async def create_local_post(
        self,
        author_id: str,
        type_: str,
        title: str,
        body: str = "",
        rating: int = 0,
        meet_time: Optional[str] = None,
        image_url: Optional[str] = None,
        place_name: Optional[str] = None,
        place_address: Optional[str] = None,
        area_name: str = "",
    ) -> Optional[Dict[str, Any]]:
        """동네 게시글 생성 (story/review/gathering)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/local_posts"
            payload = {
                "author_id": author_id,
                "type": type_,
                "title": title,
                "body": body or "",
                "rating": max(0, min(5, rating)),
                "meet_time": meet_time or "",
                "image_url": image_url or "",
                "place_name": place_name or "",
                "place_address": place_address or "",
                "area_name": area_name or "",
            }
            response = await client.post(url, headers=self.headers, json=payload)
            if response.status_code in (200, 201):
                out = response.json()
                return out[0] if isinstance(out, list) else out
            return None

    async def list_local_posts(
        self,
        scope: str = "neighborhood",
        area_name: Optional[str] = None,
        user_id: Optional[str] = None,
        following_ids: Optional[List[str]] = None,
        author_id: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        scope=neighborhood: area_name 기준 (비어 있으면 전체)
        scope=following: user_id + following_ids 작성 글만
        scope=user + author_id: 해당 사용자 작성 글만 (프로필 피드)
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            url = f"{self.base_url}/rest/v1/local_posts"
            params = {"select": "*", "order": "created_at.desc", "limit": limit}
            if scope == "neighborhood" and area_name:
                params["area_name"] = f"eq.{area_name}"
            elif scope == "following" and user_id and following_ids is not None:
                author_ids = list(set([user_id] + following_ids))
                params["author_id"] = "in.(" + ",".join(author_ids) + ")"
            elif (scope == "user" or scope == "profile") and author_id:
                params["author_id"] = f"eq.{author_id}"
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                return []
            return response.json()

    async def create_local_comment(self, post_id: str, author_id: str, body: str) -> Optional[Dict[str, Any]]:
        """댓글 생성"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/local_comments"
            payload = {"post_id": post_id, "author_id": author_id, "body": body}
            response = await client.post(url, headers=self.headers, json=payload)
            if response.status_code in (200, 201):
                out = response.json()
                return out[0] if isinstance(out, list) else out
            return None

    async def list_local_comments(self, post_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """게시글별 댓글 목록 (시간순)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/local_comments"
            params = {
                "select": "*",
                "post_id": f"eq.{post_id}",
                "order": "created_at.asc",
                "limit": limit,
            }
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                return []
            return response.json()

    # ---------- 소셜: 채팅 (conversations / messages) ----------

    async def get_or_create_conversation(self, user_a_id: str, user_b_id: str) -> Optional[Dict[str, Any]]:
        """
        두 사용자 사이의 대화를 가져오거나 없으면 생성.
        conversations 테이블은 (user_a_id, user_b_id) 쌍으로 한 번만 존재한다고 가정.
        """
        if not user_a_id or not user_b_id or user_a_id == user_b_id:
            return None
        async with httpx.AsyncClient(timeout=10.0) as client:
            base = f"{self.base_url}/rest/v1/conversations"
            # 1) (user_a_id, user_b_id) 조합 검색
            async def _find(a: str, b: str) -> Optional[Dict[str, Any]]:
                params = {
                    "select": "*",
                    "user_a_id": f"eq.{a}",
                    "user_b_id": f"eq.{b}",
                    "limit": 1,
                }
                resp = await client.get(base, headers=self.headers, params=params)
                if resp.status_code == 200:
                    rows = resp.json()
                    return rows[0] if rows else None
                return None

            existing = await _find(user_a_id, user_b_id)
            if not existing:
                existing = await _find(user_b_id, user_a_id)
            if existing:
                return existing

            # 없으면 새 대화 생성
            payload = {
                "user_a_id": user_a_id,
                "user_b_id": user_b_id,
            }
            resp = await client.post(base, headers=self.headers, json=payload)
            if resp.status_code in (200, 201):
                out = resp.json()
                return out[0] if isinstance(out, list) else out
            return None

    async def get_conversation(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """대화 한 건 조회"""
        if not conversation_id:
            return None
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/conversations"
            params = {"select": "*", "id": f"eq.{conversation_id}", "limit": 1}
            resp = await client.get(url, headers=self.headers, params=params)
            if resp.status_code != 200:
                return None
            rows = resp.json()
            return rows[0] if rows else None

    async def get_messages(self, conversation_id: str, limit: int = 50, before: Optional[str] = None) -> List[Dict[str, Any]]:
        """대화의 메시지 목록"""
        if not conversation_id:
            return []
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/messages"
            params: Dict[str, Any] = {
                "select": "*",
                "conversation_id": f"eq.{conversation_id}",
                "order": "created_at.desc",
                "limit": limit,
            }
            if before:
                params["created_at"] = f"lt.{before}"
            resp = await client.get(url, headers=self.headers, params=params)
            if resp.status_code != 200:
                return []
            return resp.json()

    async def insert_message(self, conversation_id: str, sender_id: str, body: str) -> Optional[Dict[str, Any]]:
        """메시지 한 건 저장"""
        if not conversation_id or not sender_id or not body:
            return None
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/messages"
            payload = {
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "body": body,
            }
            resp = await client.post(url, headers=self.headers, json=payload)
            if resp.status_code not in (200, 201):
                return None
            out = resp.json()
            # last_message_at 업데이트
            await client.patch(
                f"{self.base_url}/rest/v1/conversations?id=eq.{conversation_id}",
                headers=self.headers,
                json={"last_message_at": datetime.utcnow().isoformat()},
            )
            return out[0] if isinstance(out, list) else out

    # ---------- 소셜: 사용자 검색 & 프로필 ----------
    async def search_public_users(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        공개 사용자 검색 (username / display_name 기준 부분 검색)
        Supabase public.users 테이블을 사용한다.
        """
        if not query:
            return []
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/users"
            # username 또는 display_name 에 부분 일치
            like = f"*{query}*"
            params = {
                "select": "id,username,display_name,profile_image_url",
                "limit": limit,
                "order": "created_at.desc",
                "or": f"(username.ilike.{like},display_name.ilike.{like})",
            }
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                return []
            return response.json()

    async def get_users_basic(self, user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """여러 사용자의 display_name, profile_image_url 조회. 반환: { user_id: { display_name, profile_image_url } }"""
        if not user_ids:
            return {}
        async with httpx.AsyncClient(timeout=10.0) as client:
            in_val = "in.(" + ",".join(user_ids[:50]) + ")"
            url = f"{self.base_url}/rest/v1/users"
            params = {"select": "id,display_name,profile_image_url", "id": in_val}
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code != 200:
                return {}
            rows = response.json()
            return {str(r.get("id")): {"display_name": r.get("display_name"), "profile_image_url": r.get("profile_image_url")} for r in rows if r.get("id")}

    async def ensure_user_exists(self, user_id: str) -> bool:
        """
        users 테이블에 사용자가 없으면 기본 정보로 생성
        """
        if not user_id:
            return False
        
        try:
            # 이미 존재하는지 확인
            async with httpx.AsyncClient(timeout=10.0) as client:
                url = f"{self.base_url}/rest/v1/users"
                params = {"id": f"eq.{user_id}", "select": "id"}
                response = await client.get(url, headers=self.headers, params=params)
                
                if response.status_code == 200:
                    users = response.json()
                    if users and len(users) > 0:
                        return True
                
                # 없으면 생성
                payload = {"id": user_id, "display_name": user_id[:8]}
                headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
                response = await client.post(url, headers=headers, json=payload)
                return response.status_code in (200, 201, 204)
        except Exception:
            return False

    async def update_user_profile_basic(
        self,
        user_id: str,
        display_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> bool:
        """
        기본 프로필(표시 이름, 프로필 이미지 URL) 업데이트.
        public.users 테이블에 upsert 형태로 반영한다.
        """
        if not user_id:
            return False
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/users"
            payload: Dict[str, Any] = {"id": user_id}
            if display_name is not None:
                payload["display_name"] = display_name
            if avatar_url is not None:
                payload["profile_image_url"] = avatar_url
            headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
            response = await client.post(url, headers=headers, json=payload)
            return response.status_code in (200, 201, 204)

    # ---------- 크리에이터: 장소 제안 ----------
    async def create_place_suggestion(self, user_id: str, name: str, address: str = "", latitude: Optional[float] = None, longitude: Optional[float] = None, category: str = "", description: str = "") -> Optional[Dict]:
        """장소 제안 생성 (UGC)"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/place_suggestions"
            payload = {
                "user_id": user_id,
                "name": name,
                "address": address or "",
                "latitude": latitude,
                "longitude": longitude,
                "category": category or "기타",
                "description": description or "",
                "status": "pending"
            }
            response = await client.post(url, headers=self.headers, json=payload)
            if response.status_code in (200, 201):
                out = response.json()
                return out[0] if isinstance(out, list) else out
            return None

    # ---------- 피드 좋아요 ----------

    async def toggle_post_like(self, post_id: str, user_id: str) -> Dict[str, Any]:
        """좋아요 토글. 이미 눌렀으면 취소, 없으면 추가. 최종 liked 상태와 카운트 반환."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 현재 좋아요 여부 확인
            check_url = f"{self.base_url}/rest/v1/post_likes"
            params = {"post_id": f"eq.{post_id}", "user_id": f"eq.{user_id}", "select": "id", "limit": 1}
            resp = await client.get(check_url, headers=self.headers, params=params)
            existing = resp.json() if resp.status_code == 200 else []

            if existing:
                # 좋아요 취소
                del_url = f"{self.base_url}/rest/v1/post_likes?post_id=eq.{post_id}&user_id=eq.{user_id}"
                await client.delete(del_url, headers=self.headers)
                liked = False
            else:
                # 좋아요 추가
                payload = {"post_id": post_id, "user_id": user_id}
                await client.post(f"{self.base_url}/rest/v1/post_likes", headers=self.headers, json=payload)
                liked = True

            count = await self.get_post_like_count(post_id)
            return {"liked": liked, "like_count": count}

    async def get_post_like_count(self, post_id: str) -> int:
        """게시글 좋아요 수"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/post_likes"
            params = {"post_id": f"eq.{post_id}", "select": "id"}
            headers = {**self.headers, "Prefer": "count=exact"}
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code == 200:
                # Content-Range: 0-N/Total
                cr = resp.headers.get("content-range", "")
                if "/" in cr:
                    try:
                        return int(cr.split("/")[1])
                    except Exception:
                        pass
                return len(resp.json())
            return 0

    async def is_post_liked(self, post_id: str, user_id: str) -> bool:
        """특정 유저가 해당 게시글에 좋아요 눌렀는지"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/post_likes"
            params = {"post_id": f"eq.{post_id}", "user_id": f"eq.{user_id}", "select": "id", "limit": 1}
            resp = await client.get(url, headers=self.headers, params=params)
            if resp.status_code == 200:
                return len(resp.json()) > 0
            return False

    async def get_place_suggestions_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """내 장소 제안 목록"""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.base_url}/rest/v1/place_suggestions"
            params = {"select": "*", "user_id": f"eq.{user_id}", "order": "created_at.desc"}
            response = await client.get(url, headers=self.headers, params=params)
            if response.status_code == 200:
                return response.json()
            return []
