"""
WH Core Logic - Level & XP System (Gamification)
벤치마킹: Duolingo (Streak) + Starbucks Rewards (Tier)
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, date, timedelta
from dataclasses import dataclass
from enum import Enum
import math


# ============================================================
# 레벨 시스템 설정
# ============================================================

class UnlockedFeature(str, Enum):
    """잠금 해제 기능"""
    HIDDEN_QUEST = "hidden_quest"  # 히든 퀘스트
    INVITE_FRIEND = "invite_friend"  # 친구 초대
    CREATOR_MODE = "creator_mode"  # 크리에이터 모드
    PREMIUM_NARRATIVE = "premium_narrative"  # 프리미엄 서사
    CUSTOM_QUEST = "custom_quest"  # 커스텀 퀘스트
    MASTER_BADGE = "master_badge"  # 마스터 뱃지
    LEGENDARY_STATUS = "legendary_status"  # 레전더리 상태


@dataclass
class LevelTier:
    """레벨 구간 정의"""
    name: str
    min_level: int
    max_level: int
    description: str
    unlocked_features: List[UnlockedFeature]
    badge_color: str


# 레벨 구간 정의
LEVEL_TIERS = [
    LevelTier(
        name="Beginner",
        min_level=1,
        max_level=5,
        description="기능 적응기",
        unlocked_features=[],
        badge_color="#95A5A6"
    ),
    LevelTier(
        name="Intermediate",
        min_level=6,
        max_level=10,
        description="습관 형성기",
        unlocked_features=[
            UnlockedFeature.HIDDEN_QUEST,
            UnlockedFeature.INVITE_FRIEND
        ],
        badge_color="#3498DB"
    ),
    LevelTier(
        name="Advanced",
        min_level=11,
        max_level=20,
        description="크리에이터 성장기",
        unlocked_features=[
            UnlockedFeature.HIDDEN_QUEST,
            UnlockedFeature.INVITE_FRIEND,
            UnlockedFeature.CREATOR_MODE,
            UnlockedFeature.PREMIUM_NARRATIVE
        ],
        badge_color="#9B59B6"
    ),
    LevelTier(
        name="Expert",
        min_level=21,
        max_level=35,
        description="영향력 확장기",
        unlocked_features=[
            UnlockedFeature.HIDDEN_QUEST,
            UnlockedFeature.INVITE_FRIEND,
            UnlockedFeature.CREATOR_MODE,
            UnlockedFeature.PREMIUM_NARRATIVE,
            UnlockedFeature.CUSTOM_QUEST
        ],
        badge_color="#E67E22"
    ),
    LevelTier(
        name="Master",
        min_level=36,
        max_level=50,
        description="팬덤 형성기",
        unlocked_features=[
            UnlockedFeature.HIDDEN_QUEST,
            UnlockedFeature.INVITE_FRIEND,
            UnlockedFeature.CREATOR_MODE,
            UnlockedFeature.PREMIUM_NARRATIVE,
            UnlockedFeature.CUSTOM_QUEST,
            UnlockedFeature.MASTER_BADGE,
            UnlockedFeature.LEGENDARY_STATUS
        ],
        badge_color="#F39C12"
    )
]


# ============================================================
# XP 계산 시스템
# ============================================================

@dataclass
class XPMultipliers:
    """XP 배수 설정"""
    base: float = 1.0
    consistency: float = 1.0  # 연속 일수 보너스
    diversity: float = 1.0  # 다양성 보너스
    level: float = 1.0  # 레벨 보정


class XPCalculator:
    """
    XP 계산 로직
    
    Total XP = (Base XP) × (Consistency Bonus) × (Diversity Bonus) × (Level Adjustment)
    """
    
    # 기본 XP 설정
    BASE_XP = {
        'quest_complete': 100,  # 퀘스트 완료
        'first_visit': 50,  # 신규 장소 방문
        'photo_upload': 20,  # 사진 업로드
        'review_write': 30,  # 리뷰 작성
        'friend_invite': 200,  # 친구 초대
        'quest_create': 150,  # 퀘스트 생성 (크리에이터)
    }
    
    # 연속 일수 보너스 (Streak Bonus)
    STREAK_MULTIPLIERS = {
        3: 1.2,   # 3일 연속 → 1.2배
        7: 1.5,   # 7일 연속 → 1.5배
        14: 1.8,  # 14일 연속 → 1.8배
        30: 2.0,  # 30일 연속 → 2.0배
        100: 2.5, # 100일 연속 → 2.5배
    }
    
    @classmethod
    def calculate_quest_xp(
        cls,
        action: str,
        current_streak: int,
        diversity_score: float,
        user_level: int,
        extra_multiplier: float = 1.0
    ) -> Tuple[int, Dict[str, float]]:
        """
        퀘스트 XP 계산
        
        Args:
            action: 행동 타입 ('quest_complete', 'first_visit', ...)
            current_streak: 현재 연속 일수
            diversity_score: 다양성 점수 (0.0 ~ 1.0)
            user_level: 현재 레벨
            extra_multiplier: 추가 배수 (이벤트 등)
        
        Returns:
            (총 XP, 배수 분해)
        """
        
        # 1. 기본 XP
        base_xp = cls.BASE_XP.get(action, 0)
        
        # 2. 연속 일수 보너스
        consistency_bonus = cls._get_streak_multiplier(current_streak)
        
        # 3. 다양성 보너스
        diversity_bonus = 1.0 + (diversity_score * 0.3)  # 최대 1.3배
        
        # 4. 레벨 보정 (고레벨은 XP 획득 조정)
        # 레벨이 높을수록 약간 감소 (그라인딩 방지)
        level_adjustment = max(0.8, 1.0 - (user_level * 0.005))
        
        # 5. 최종 XP 계산
        total_xp = int(
            base_xp *
            consistency_bonus *
            diversity_bonus *
            level_adjustment *
            extra_multiplier
        )
        
        # 배수 분해 (UI 표시용)
        multipliers = {
            'base': base_xp,
            'consistency': consistency_bonus,
            'diversity': round(diversity_bonus, 2),
            'level': round(level_adjustment, 2),
            'extra': extra_multiplier,
            'total': total_xp
        }
        
        return total_xp, multipliers
    
    @classmethod
    def _get_streak_multiplier(cls, streak_days: int) -> float:
        """연속 일수에 따른 배수 반환"""
        
        # 내림차순 정렬하여 가장 높은 달성 구간 찾기
        for threshold, multiplier in sorted(
            cls.STREAK_MULTIPLIERS.items(),
            reverse=True
        ):
            if streak_days >= threshold:
                return multiplier
        
        return 1.0  # 기본


# ============================================================
# 다양성 점수 계산
# ============================================================

class DiversityScorer:
    """
    다양성 점수 계산
    
    매일 다른 역할, 다른 지역, 다른 카테고리를 탐험하면 보너스
    """
    
    @staticmethod
    def calculate_role_diversity(
        recent_roles: List[str],
        window_days: int = 7
    ) -> float:
        """
        역할 다양성 점수
        
        Args:
            recent_roles: 최근 사용한 역할 리스트 (최대 window_days개)
            window_days: 관찰 기간 (일)
        
        Returns:
            다양성 점수 (0.0 ~ 1.0)
        """
        
        if not recent_roles:
            return 0.0
        
        unique_roles = len(set(recent_roles))
        total_roles = 5  # 전체 역할 개수
        
        # 유니크 역할 비율
        diversity = unique_roles / total_roles
        
        return min(diversity, 1.0)
    
    @staticmethod
    def calculate_location_diversity(
        visited_coordinates: List[Tuple[float, float]],
        grid_size_km: float = 1.0
    ) -> float:
        """
        장소 다양성 점수 (그리드 기반)
        
        Args:
            visited_coordinates: 방문한 좌표 리스트 [(lat, lon), ...]
            grid_size_km: 그리드 크기 (킬로미터)
        
        Returns:
            다양성 점수 (0.0 ~ 1.0)
        """
        
        if not visited_coordinates:
            return 0.0
        
        # 좌표를 그리드로 변환 (간단한 해싱)
        def coord_to_grid(lat: float, lon: float) -> Tuple[int, int]:
            # 1km ≈ 0.009도
            degree_per_km = 0.009
            grid_lat = int(lat / (degree_per_km * grid_size_km))
            grid_lon = int(lon / (degree_per_km * grid_size_km))
            return (grid_lat, grid_lon)
        
        unique_grids = set(
            coord_to_grid(lat, lon)
            for lat, lon in visited_coordinates
        )
        
        # 최근 방문 대비 유니크 그리드 비율
        diversity = len(unique_grids) / len(visited_coordinates)
        
        return min(diversity, 1.0)
    
    @staticmethod
    def calculate_category_diversity(
        visited_categories: List[str]
    ) -> float:
        """
        카테고리 다양성 점수
        
        Args:
            visited_categories: 방문한 카테고리 리스트
        
        Returns:
            다양성 점수 (0.0 ~ 1.0)
        """
        
        if not visited_categories:
            return 0.0
        
        unique_categories = len(set(visited_categories))
        
        # 카테고리 수에 따라 로그 스케일 적용
        diversity = math.log(unique_categories + 1) / math.log(20)  # 20개 = 만점
        
        return min(diversity, 1.0)
    
    @classmethod
    def calculate_overall_diversity(
        cls,
        recent_roles: List[str],
        visited_coordinates: List[Tuple[float, float]],
        visited_categories: List[str]
    ) -> float:
        """
        종합 다양성 점수
        
        Returns:
            종합 다양성 (0.0 ~ 1.0)
        """
        
        role_div = cls.calculate_role_diversity(recent_roles)
        location_div = cls.calculate_location_diversity(visited_coordinates)
        category_div = cls.calculate_category_diversity(visited_categories)
        
        # 가중 평균
        overall = (
            role_div * 0.3 +
            location_div * 0.4 +
            category_div * 0.3
        )
        
        return overall


# ============================================================
# 레벨업 시스템
# ============================================================

class LevelSystem:
    """레벨 계산 및 레벨업 관리"""
    
    # 레벨별 필요 XP (누적)
    # 공식: XP_required(level) = 100 + (level - 1) * 50 + (level - 1)^1.5 * 10
    
    @staticmethod
    def calculate_xp_for_level(level: int) -> int:
        """특정 레벨 달성에 필요한 누적 XP"""
        
        if level == 1:
            return 0
        
        # 지수적 증가 (레벨이 오를수록 더 많이 필요)
        xp = 100 * (level - 1) + 50 * (level - 1) ** 1.5
        
        return int(xp)
    
    @staticmethod
    def get_level_from_xp(total_xp: int) -> int:
        """누적 XP로부터 레벨 계산"""
        
        for level in range(1, 51):  # 최대 50레벨
            if total_xp < LevelSystem.calculate_xp_for_level(level):
                return level - 1
        
        return 50  # 최대 레벨
    
    @staticmethod
    def get_xp_progress(
        current_xp: int,
        current_level: int
    ) -> Tuple[int, int, float]:
        """
        현재 레벨 진행도 계산
        
        Returns:
            (현재 레벨 XP, 다음 레벨까지 필요 XP, 진행률)
        """
        
        current_level_xp = LevelSystem.calculate_xp_for_level(current_level)
        next_level_xp = LevelSystem.calculate_xp_for_level(current_level + 1)
        
        xp_in_current_level = current_xp - current_level_xp
        xp_needed_for_next = next_level_xp - current_level_xp
        
        progress = xp_in_current_level / xp_needed_for_next if xp_needed_for_next > 0 else 1.0
        
        return (
            xp_in_current_level,
            xp_needed_for_next,
            progress
        )
    
    @staticmethod
    def get_level_tier(level: int) -> LevelTier:
        """레벨에 해당하는 티어 반환"""
        
        for tier in LEVEL_TIERS:
            if tier.min_level <= level <= tier.max_level:
                return tier
        
        return LEVEL_TIERS[-1]  # 기본값: Master
    
    @staticmethod
    def check_level_up(
        old_xp: int,
        new_xp: int
    ) -> Optional[int]:
        """
        레벨업 체크
        
        Returns:
            레벨업 했으면 새 레벨, 아니면 None
        """
        
        old_level = LevelSystem.get_level_from_xp(old_xp)
        new_level = LevelSystem.get_level_from_xp(new_xp)
        
        if new_level > old_level:
            return new_level
        
        return None


# ============================================================
# 스트릭(연속 일수) 시스템
# ============================================================

class StreakSystem:
    """연속 일수 관리"""
    
    @staticmethod
    def update_streak(
        last_active_date: Optional[date],
        today: date
    ) -> Tuple[int, bool]:
        """
        스트릭 업데이트
        
        Args:
            last_active_date: 마지막 활동 날짜
            today: 오늘 날짜
        
        Returns:
            (새로운 스트릭, 스트릭 유지 여부)
        """
        
        if last_active_date is None:
            # 첫 활동
            return (1, True)
        
        days_diff = (today - last_active_date).days
        
        if days_diff == 0:
            # 오늘 이미 활동함 (스트릭 유지)
            return (0, True)  # 0은 변화 없음을 의미
        elif days_diff == 1:
            # 하루 연속 (스트릭 증가)
            return (1, True)
        else:
            # 스트릭 끊김
            return (1, False)
    
    @staticmethod
    def get_streak_milestone_reward(streak: int) -> Optional[int]:
        """
        스트릭 마일스톤 보상
        
        특정 연속 일수 달성 시 보너스 XP
        """
        
        milestones = {
            7: 500,     # 1주
            30: 2000,   # 1달
            100: 10000, # 100일
            365: 50000  # 1년
        }
        
        return milestones.get(streak)


# ============================================================
# 사용 예제
# ============================================================

def example_usage():
    """레벨 시스템 사용 예제"""
    
    print("=" * 60)
    print("WH Core Logic - Level & XP System Example")
    print("=" * 60)
    
    # 1. XP 계산 예제
    print("\n[1. XP 계산]")
    
    xp, breakdown = XPCalculator.calculate_quest_xp(
        action='quest_complete',
        current_streak=7,  # 7일 연속
        diversity_score=0.8,  # 다양성 80%
        user_level=5
    )
    
    print(f"획득 XP: {xp}")
    print(f"분해: {breakdown}")
    
    # 2. 다양성 점수 예제
    print("\n[2. 다양성 점수]")
    
    roles = ['explorer', 'healer', 'explorer', 'archivist']
    locations = [(37.5, 127.0), (37.5, 127.1), (37.6, 127.0)]
    categories = ['카페', '공원', '맛집', '전시']
    
    diversity = DiversityScorer.calculate_overall_diversity(
        roles, locations, categories
    )
    print(f"종합 다양성: {diversity:.2%}")
    
    # 3. 레벨 진행도 예제
    print("\n[3. 레벨 시스템]")
    
    current_xp = 1500
    level = LevelSystem.get_level_from_xp(current_xp)
    xp_in_level, xp_needed, progress = LevelSystem.get_xp_progress(
        current_xp, level
    )
    
    print(f"현재 레벨: Lv.{level}")
    print(f"레벨 내 XP: {xp_in_level} / {xp_needed}")
    print(f"진행률: {progress:.1%}")
    
    tier = LevelSystem.get_level_tier(level)
    print(f"티어: {tier.name} ({tier.description})")
    print(f"잠금 해제 기능: {[f.value for f in tier.unlocked_features]}")


if __name__ == "__main__":
    example_usage()
