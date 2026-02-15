# -*- coding: utf-8 -*-
"""
데이터베이스 헬퍼 메서드
새로운 AI 기능을 위한 DB 쿼리 함수들
"""

from typing import List, Dict, Optional
from datetime import datetime


class DatabaseHelpers:
    """
    새로운 테이블을 위한 DB 헬퍼 메서드
    """
    
    def __init__(self, pool):
        self.pool = pool
    
    # ============================================================
    # User Profile & Personality
    # ============================================================
    
    async def get_user_profile(self, user_id: str) -> Dict:
        """사용자 프로필 조회"""
        async with self.pool.acquire() as conn:
            # users 테이블에서 기본 정보
            user = await conn.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
            
            if not user:
                return {}
            
            # user_personality 테이블에서 성격 정보
            personality = await conn.fetchrow(
                "SELECT * FROM user_personality WHERE user_id = $1",
                user_id
            )
            
            return {
                **dict(user),
                "personality": dict(personality) if personality else {},
                "companion_style": {
                    "tone": personality["companion_tone"] if personality else "friendly",
                    "emoji_usage": personality["companion_emoji_usage"] if personality else "medium",
                    "formality": personality["companion_formality"] if personality else "casual",
                },
                "preferred_categories": personality["preferred_categories"] if personality else [],
                "total_visits": personality["total_visits"] if personality else 0,
                "avg_duration_minutes": personality["avg_duration_minutes"] if personality else 60,
                "social_ratio": personality["social_ratio"] if personality else 0.5,
            }
    
    async def update_user_personality(self, user_id: str, personality: Dict):
        """사용자 성격 업데이트"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_personality (
                    user_id, openness, conscientiousness, extraversion, 
                    agreeableness, neuroticism, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET
                    openness = $2,
                    conscientiousness = $3,
                    extraversion = $4,
                    agreeableness = $5,
                    neuroticism = $6,
                    updated_at = NOW()
            """,
                user_id,
                personality.get("openness", 0.5),
                personality.get("conscientiousness", 0.5),
                personality.get("extraversion", 0.5),
                personality.get("agreeableness", 0.5),
                personality.get("neuroticism", 0.5)
            )
    
    async def update_user_companion_style(self, user_id: str, style: Dict):
        """AI 동행자 스타일 업데이트"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE user_personality
                SET 
                    companion_tone = $2,
                    companion_emoji_usage = $3,
                    companion_formality = $4,
                    updated_at = NOW()
                WHERE user_id = $1
            """,
                user_id,
                style.get("tone", "friendly"),
                style.get("emoji_usage", "medium"),
                style.get("formality", "casual")
            )
    
    # ============================================================
    # Visits & Quests
    # ============================================================
    
    async def get_user_visits(self, user_id: str, days: int = 90) -> List[Dict]:
        """사용자 방문 기록"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    cq.*,
                    p.name as place_name,
                    p.category,
                    p.latitude,
                    p.longitude
                FROM completed_quests cq
                JOIN places p ON cq.place_id = p.id
                WHERE cq.user_id = $1
                AND cq.completed_at > NOW() - INTERVAL '%s days'
                ORDER BY cq.completed_at DESC
            """ % days,
                user_id
            )
            
            return [dict(row) for row in rows]
    
    async def get_completed_places(self, user_id: str) -> List[Dict]:
        """완료한 장소 목록"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT DISTINCT p.*
                FROM completed_quests cq
                JOIN places p ON cq.place_id = p.id
                WHERE cq.user_id = $1
            """,
                user_id
            )
            
            return [dict(row) for row in rows]
    
    async def get_visited_place_ids(self, user_id: str) -> List[str]:
        """방문한 장소 ID 목록"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT DISTINCT place_id
                FROM completed_quests
                WHERE user_id = $1
            """,
                user_id
            )
            
            return [row["place_id"] for row in rows]
    
    # ============================================================
    # Location History
    # ============================================================
    
    async def get_location_history(self, user_id: str, days: int = 90) -> List[Dict]:
        """위치 추적 기록"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    ST_Y(location::geometry) as latitude,
                    ST_X(location::geometry) as longitude,
                    accuracy,
                    speed,
                    activity,
                    recorded_at
                FROM location_history
                WHERE user_id = $1
                AND recorded_at > NOW() - INTERVAL '%s days'
                ORDER BY recorded_at DESC
            """ % days,
                user_id
            )
            
            return [dict(row) for row in rows]
    
    # ============================================================
    # Places
    # ============================================================
    
    async def get_place(self, place_id: str) -> Optional[Dict]:
        """장소 정보 조회"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT 
                    *,
                    ST_Y(location::geometry) as latitude,
                    ST_X(location::geometry) as longitude
                FROM places
                WHERE id = $1
            """,
                place_id
            )
            
            return dict(row) if row else None
    
    async def find_nearby_places(
        self,
        latitude: float,
        longitude: float,
        radius_km: float = 1.0,
        limit: int = 10
    ) -> List[Dict]:
        """근처 장소 검색"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT 
                    *,
                    ST_Y(location::geometry) as latitude,
                    ST_X(location::geometry) as longitude,
                    ST_Distance(
                        location,
                        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
                    ) as distance_meters
                FROM places
                WHERE ST_DWithin(
                    location,
                    ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
                    $3
                )
                ORDER BY distance_meters
                LIMIT $4
            """,
                latitude,
                longitude,
                radius_km * 1000,
                limit
            )
            
            return [dict(row) for row in rows]
    
    async def get_place_by_external_id(self, external_id: str, source: str) -> Optional[Dict]:
        """외부 ID로 장소 조회"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM places
                WHERE external_id = $1 AND external_source = $2
            """,
                external_id,
                source
            )
            
            return dict(row) if row else None
    
    async def insert_place(self, place_data: Dict) -> str:
        """장소 추가"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO places (
                    external_id, external_source, name, category,
                    location, address, road_address, phone,
                    place_url, vibe_tags, average_rating,
                    typical_crowd_level, estimated_cost, is_hidden_gem
                )
                VALUES (
                    $1, $2, $3, $4,
                    ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
                    $7, $8, $9, $10, $11, $12, $13, $14, $15
                )
                RETURNING id
            """,
                place_data.get("external_id"),
                place_data.get("external_source"),
                place_data["name"],
                place_data["category"],
                place_data["location"]["coordinates"][0],  # lng
                place_data["location"]["coordinates"][1],  # lat
                place_data.get("address"),
                place_data.get("road_address"),
                place_data.get("phone"),
                place_data.get("place_url"),
                place_data.get("vibe_tags", []),
                place_data.get("average_rating", 4.0),
                place_data.get("typical_crowd_level", "medium"),
                place_data.get("estimated_cost", 10000),
                place_data.get("is_hidden_gem", False)
            )
            
            return row["id"]
    
    # ============================================================
    # Challenges
    # ============================================================
    
    async def create_challenge(self, user_id: str, challenge_data: Dict) -> str:
        """챌린지 생성"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO challenges (
                    user_id, title, description, difficulty, theme,
                    places, rewards, deadline, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            """,
                user_id,
                challenge_data["title"],
                challenge_data["description"],
                challenge_data["difficulty"],
                challenge_data.get("theme"),
                challenge_data["places"],
                challenge_data["rewards"],
                challenge_data["deadline"],
                challenge_data.get("status", "active")
            )
            
            return row["id"]
    
    async def get_challenge(self, challenge_id: str) -> Optional[Dict]:
        """챌린지 조회"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM challenges WHERE id = $1
            """,
                challenge_id
            )
            
            return dict(row) if row else None
    
    async def get_user_challenges(self, user_id: str, status: Optional[str] = None) -> List[Dict]:
        """사용자 챌린지 목록"""
        async with self.pool.acquire() as conn:
            if status:
                rows = await conn.fetch("""
                    SELECT * FROM challenges
                    WHERE user_id = $1 AND status = $2
                    ORDER BY created_at DESC
                """,
                    user_id,
                    status
                )
            else:
                rows = await conn.fetch("""
                    SELECT * FROM challenges
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                """,
                    user_id
                )
            
            return [dict(row) for row in rows]
    
    async def get_completed_places_in_challenge(
        self,
        challenge_id: str,
        user_id: str
    ) -> List[str]:
        """챌린지 내 완료한 장소 ID 목록"""
        async with self.pool.acquire() as conn:
            challenge = await self.get_challenge(challenge_id)
            
            if not challenge:
                return []
            
            place_ids = [p["place_id"] for p in challenge["places"] if p.get("place_id")]
            
            if not place_ids:
                return []
            
            rows = await conn.fetch("""
                SELECT DISTINCT place_id
                FROM completed_quests
                WHERE user_id = $1 AND place_id = ANY($2)
            """,
                user_id,
                place_ids
            )
            
            return [row["place_id"] for row in rows]
    
    async def update_challenge_status(
        self,
        challenge_id: str,
        status: str,
        completed_at: Optional[datetime] = None
    ):
        """챌린지 상태 업데이트"""
        async with self.pool.acquire() as conn:
            if completed_at:
                await conn.execute("""
                    UPDATE challenges
                    SET status = $2, completed_at = $3
                    WHERE id = $1
                """,
                    challenge_id,
                    status,
                    completed_at
                )
            else:
                await conn.execute("""
                    UPDATE challenges
                    SET status = $2
                    WHERE id = $1
                """,
                    challenge_id,
                    status
                )
    
    async def add_user_xp(self, user_id: str, xp: int):
        """사용자 XP 추가"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE users
                SET xp = xp + $2
                WHERE id = $1
            """,
                user_id,
                xp
            )
    
    async def award_badge(self, user_id: str, badge_code: str) -> Optional[Dict]:
        """뱃지 수여"""
        async with self.pool.acquire() as conn:
            # 뱃지 정보 조회
            badge = await conn.fetchrow("""
                SELECT * FROM badges WHERE code = $1
            """,
                badge_code
            )
            
            if not badge:
                return None
            
            # 이미 가지고 있는지 확인
            existing = await conn.fetchrow("""
                SELECT * FROM user_badges
                WHERE user_id = $1 AND badge_id = $2
            """,
                user_id,
                badge["id"]
            )
            
            if existing:
                return dict(badge)
            
            # 뱃지 수여
            await conn.execute("""
                INSERT INTO user_badges (user_id, badge_id)
                VALUES ($1, $2)
            """,
                user_id,
                badge["id"]
            )
            
            return dict(badge)
    
    async def unlock_region(self, user_id: str, region: str):
        """지역 해금 (TODO: 구현)"""
        pass
    
    # ============================================================
    # Gatherings (모임)
    # ============================================================
    
    async def create_gathering(self, gathering_data: Dict) -> str:
        """모임 생성"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO gatherings (
                    creator_id, place_id, title, description,
                    scheduled_time, max_participants, status
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            """,
                gathering_data["creator_id"],
                gathering_data["place_id"],
                gathering_data["title"],
                gathering_data["description"],
                gathering_data["scheduled_time"],
                gathering_data["max_participants"],
                gathering_data["status"]
            )
            
            return row["id"]
    
    async def get_gathering(self, gathering_id: str) -> Optional[Dict]:
        """모임 조회"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM gatherings WHERE id = $1
            """,
                gathering_id
            )
            
            return dict(row) if row else None
    
    async def add_gathering_participant(
        self,
        gathering_id: str,
        user_id: str,
        match_score: float
    ):
        """모임 참여자 추가"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO gathering_participants (gathering_id, user_id, match_score)
                VALUES ($1, $2, $3)
            """,
                gathering_id,
                user_id,
                match_score
            )
    
    async def increment_gathering_participants(self, gathering_id: str):
        """모임 참여자 수 증가"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE gatherings
                SET current_participants = current_participants + 1
                WHERE id = $1
            """,
                gathering_id
            )
    
    async def update_gathering_status(self, gathering_id: str, status: str):
        """모임 상태 업데이트"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE gatherings
                SET status = $2
                WHERE id = $1
            """,
                gathering_id,
                status
            )
    
    async def get_gathering_participants(self, gathering_id: str) -> List[Dict]:
        """모임 참여자 목록"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT u.*, gp.match_score
                FROM gathering_participants gp
                JOIN users u ON gp.user_id = u.id
                WHERE gp.gathering_id = $1
            """,
                gathering_id
            )
            
            return [dict(row) for row in rows]
    
    async def get_open_gatherings(self, limit: int = 50) -> List[Dict]:
        """열린 모임 목록"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT * FROM gatherings
                WHERE status = 'open'
                AND scheduled_time > NOW()
                ORDER BY scheduled_time
                LIMIT $1
            """,
                limit
            )
            
            return [dict(row) for row in rows]
    
    async def find_nearby_active_users(
        self,
        latitude: float,
        longitude: float,
        radius_km: float,
        exclude_user_ids: List[str]
    ) -> List[Dict]:
        """근처 활동 중인 사용자 (TODO: 실제 위치 추적 구현 필요)"""
        # 임시: 모든 사용자 반환
        async with self.pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT u.*, up.*
                FROM users u
                LEFT JOIN user_personality up ON u.id = up.user_id
                WHERE u.id != ALL($1)
                LIMIT 20
            """,
                exclude_user_ids
            )
            
            return [dict(row) for row in rows]
    
    # ============================================================
    # Shares (소셜 공유)
    # ============================================================
    
    async def save_share(self, share_data: Dict):
        """공유 데이터 저장"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO shares (
                    share_id, user_id, quest_id, place_id,
                    title, description, xp_earned, role_type,
                    created_at, expires_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """,
                share_data["share_id"],
                share_data["user_id"],
                share_data["quest_id"],
                share_data["place_id"],
                share_data["title"],
                share_data["description"],
                share_data.get("xp_earned", 0),
                share_data.get("role_type", "explorer"),
                share_data["created_at"],
                share_data["expires_at"]
            )
    
    async def get_share_by_id(self, share_id: str) -> Optional[Dict]:
        """공유 데이터 조회"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM shares WHERE share_id = $1
            """,
                share_id
            )
            
            return dict(row) if row else None
    
    async def increment_share_view_count(self, share_id: str):
        """공유 조회수 증가"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                UPDATE shares
                SET view_count = view_count + 1
                WHERE share_id = $1
            """,
                share_id
            )
    
    # ============================================================
    # AI Conversations
    # ============================================================
    
    async def save_ai_conversation(
        self,
        user_id: str,
        context_type: str,
        context_id: Optional[str],
        ai_response: str
    ):
        """AI 대화 기록 저장"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO ai_conversations (
                    user_id, context_type, context_id, ai_response
                )
                VALUES ($1, $2, $3, $4)
            """,
                user_id,
                context_type,
                context_id,
                ai_response
            )
    
    # ============================================================
    # Quest & Arrival
    # ============================================================
    
    async def get_quest(self, quest_id: str) -> Optional[Dict]:
        """퀘스트 조회 (TODO: 실제 구현)"""
        return {
            "id": quest_id,
            "place_id": "mock_place_id",
            "arrived_at": None
        }
    
    async def record_arrival(
        self,
        user_id: str,
        quest_id: str,
        place_id: str,
        arrived_at: datetime
    ):
        """도착 기록 (TODO: 실제 구현)"""
        pass
    
    async def get_user(self, user_id: str) -> Optional[Dict]:
        """사용자 기본 정보"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM users WHERE id = $1
            """,
                user_id
            )
            
            return dict(row) if row else None
