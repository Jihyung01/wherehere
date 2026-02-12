"""
WH Core Logic - Enhanced Role System
5가지 핵심 역할(Role) 정의 및 파라미터 확장

각 역할은 심리학적 페르소나와 행동 패턴을 기반으로 설계됨
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Tuple

class RoleType(str, Enum):
    """역할 타입 정의 (한영 병기)"""
    EXPLORER = "explorer"  # 탐험가
    HEALER = "healer"      # 치유자
    ARCHIVIST = "archivist"  # 수집가
    RELATION = "relation"   # 연결자
    ACHIEVER = "achiever"   # 달성자


@dataclass
class RoleConfig:
    """역할별 상세 설정"""
    id: str
    korean_name: str
    english_name: str
    description: str
    
    # 행동 반경 설정 (단위: 미터)
    radius_min: int
    radius_max: int
    radius_base: int  # 레벨 1 기준
    
    # 선호 카테고리 (가중치 0.0 ~ 1.0)
    category_weights: Dict[str, float]
    
    # 비용 민감도 (높을수록 저렴한 곳 선호)
    cost_sensitivity: float  # 0.0 (무관) ~ 1.0 (매우 민감)
    cost_threshold: int  # 거부 임계값 (원)
    
    # 서사 톤 설정
    narrative_tone: str
    narrative_keywords: List[str]
    
    # 고급 파라미터
    novelty_preference: float  # 새로움 선호도 (0.0 ~ 1.0)
    crowd_tolerance: float  # 혼잡도 허용치 (0.0 ~ 1.0)
    time_flexibility: float  # 시간 유연성 (0.0 ~ 1.0)
    social_intensity: float  # 사회적 상호작용 선호도
    
    # 시간대별 가중치
    time_of_day_weights: Dict[str, float]
    
    # 날씨별 가중치
    weather_weights: Dict[str, float]


# ============================================================
# 역할별 상세 설정 (실전용 확장판)
# ============================================================

ROLE_CONFIGS = {
    RoleType.EXPLORER: RoleConfig(
        id="explorer",
        korean_name="탐험가",
        english_name="Explorer",
        description="일상에서 벗어나 새로운 발견을 추구하는 모험가",
        
        # 행동 반경: 넓음
        radius_min=1000,
        radius_max=10000,
        radius_base=3000,
        
        # 선호 카테고리 (확장)
        category_weights={
            # 핵심 카테고리
            "골목길": 1.0,
            "이색장소": 1.0,
            "히든스팟": 1.0,
            "로컬맛집": 0.9,
            
            # 세부 카테고리
            "빈티지샵": 0.8,
            "독립서점": 0.8,
            "예술공간": 0.7,
            "전통시장": 0.7,
            "루프탑": 0.6,
            
            # 액티비티
            "도보여행": 0.9,
            "자전거투어": 0.8,
            "사진명소": 0.8,
            
            # 제외 카테고리
            "프랜차이즈": 0.1,
            "백화점": 0.2,
            "대형마트": 0.1,
        },
        
        cost_sensitivity=0.2,  # 비용보다 경험 중시
        cost_threshold=50000,  # 5만원 이하면 OK
        
        narrative_tone="모험적, 발견, 호기심",
        narrative_keywords=["발견하다", "탐험하다", "숨겨진", "새로운", "지도 밖", "미지의"],
        
        novelty_preference=0.9,  # 매우 높음
        crowd_tolerance=0.4,  # 한적한 곳 선호
        time_flexibility=0.8,  # 유연함
        social_intensity=0.5,  # 중간
        
        time_of_day_weights={
            "dawn": 0.8,      # 새벽 (05:00-07:00)
            "morning": 0.7,   # 아침 (07:00-11:00)
            "afternoon": 0.9, # 오후 (11:00-17:00)
            "evening": 1.0,   # 저녁 (17:00-21:00)
            "night": 0.6,     # 밤 (21:00-24:00)
            "midnight": 0.3,  # 심야 (00:00-05:00)
        },
        
        weather_weights={
            "sunny": 1.0,
            "cloudy": 0.9,
            "rainy": 0.4,
            "snowy": 0.7,
            "windy": 0.6,
        },
    ),
    
    RoleType.HEALER: RoleConfig(
        id="healer",
        korean_name="치유자",
        english_name="Healer",
        description="쉼과 회복을 추구하는 평온의 수호자",
        
        # 행동 반경: 좁음 (동네 중심)
        radius_min=300,
        radius_max=2000,
        radius_base=800,
        
        category_weights={
            # 핵심 카테고리
            "공원": 1.0,
            "북카페": 1.0,
            "숲": 1.0,
            "사찰/교회": 0.9,
            
            # 세부 카테고리
            "도서관": 0.9,
            "식물원": 0.9,
            "호수/강변": 0.8,
            "조용한카페": 0.9,
            "티하우스": 0.8,
            "명상센터": 0.8,
            
            # 웰니스
            "요가스튜디오": 0.7,
            "스파": 0.6,
            "한적한산책로": 1.0,
            
            # 제외 카테고리
            "클럽": 0.0,
            "번화가": 0.1,
            "놀이공원": 0.1,
            "쇼핑몰": 0.2,
        },
        
        cost_sensitivity=0.8,  # 비용 민감 (무료/저렴 선호)
        cost_threshold=10000,  # 만원 이하 선호
        
        narrative_tone="차분함, 위로, 명상적",
        narrative_keywords=["쉼", "위로", "평온", "고요", "치유", "여백", "숨"],
        
        novelty_preference=0.3,  # 익숙한 곳 선호
        crowd_tolerance=0.2,  # 혼잡 매우 회피
        time_flexibility=0.6,
        social_intensity=0.2,  # 혼자 또는 소수
        
        time_of_day_weights={
            "dawn": 1.0,      # 고요한 새벽
            "morning": 0.9,
            "afternoon": 0.7,
            "evening": 0.6,
            "night": 0.4,
            "midnight": 0.2,
        },
        
        weather_weights={
            "sunny": 0.8,
            "cloudy": 1.0,   # 흐린 날 최적
            "rainy": 0.9,    # 비 오는 날도 좋음
            "snowy": 1.0,
            "windy": 0.5,
        },
    ),
    
    RoleType.ARCHIVIST: RoleConfig(
        id="archivist",
        korean_name="수집가",
        english_name="Archivist",
        description="미적 경험을 수집하고 기록하는 감각의 큐레이터",
        
        # 행동 반경: 중간
        radius_min=500,
        radius_max=5000,
        radius_base=2000,
        
        category_weights={
            # 핵심 카테고리
            "전시관": 1.0,
            "뷰맛집": 1.0,
            "건축물": 1.0,
            "갤러리": 1.0,
            
            # 세부 카테고리
            "박물관": 0.9,
            "디자인숍": 0.9,
            "브런치카페": 0.8,
            "루프탑바": 0.8,
            "고건축": 0.9,
            "현대건축": 0.9,
            
            # 감각적 경험
            "향수샵": 0.7,
            "와인바": 0.7,
            "파인다이닝": 0.8,
            "공예공방": 0.8,
            "사진스튜디오": 0.7,
            
            # 제외
            "패스트푸드": 0.1,
            "PC방": 0.0,
        },
        
        cost_sensitivity=0.5,  # 가심비 중시
        cost_threshold=30000,  # 3만원대까지 OK
        
        narrative_tone="감각적, 미학적, 섬세함",
        narrative_keywords=["포착하다", "담다", "기록하다", "순간", "빛", "질감", "아름다움"],
        
        novelty_preference=0.7,
        crowd_tolerance=0.5,
        time_flexibility=0.7,
        social_intensity=0.4,
        
        time_of_day_weights={
            "dawn": 0.6,
            "morning": 0.8,   # 좋은 빛
            "afternoon": 1.0, # 골든아워
            "evening": 1.0,   # 매직아워
            "night": 0.7,
            "midnight": 0.3,
        },
        
        weather_weights={
            "sunny": 1.0,
            "cloudy": 0.8,
            "rainy": 0.6,
            "snowy": 0.9,
            "windy": 0.5,
        },
    ),
    
    RoleType.RELATION: RoleConfig(
        id="relation",
        korean_name="연결자",
        english_name="Relation",
        description="사람과의 따뜻한 연결을 추구하는 관계의 직조자",
        
        # 행동 반경: 중간
        radius_min=500,
        radius_max=5000,
        radius_base=2000,
        
        category_weights={
            # 핵심 카테고리
            "맛집": 1.0,
            "카페": 1.0,
            "액티비티": 1.0,
            
            # 세부 카테고리
            "브런치": 0.9,
            "디저트카페": 0.9,
            "이자카야": 0.8,
            "와인바": 0.8,
            "보드게임카페": 0.9,
            "방탈출": 0.8,
            "볼링/당구": 0.7,
            
            # 대화 적합
            "조용한레스토랑": 0.9,
            "루프탑": 0.8,
            "테라스": 0.9,
            
            # 그룹 활동
            "노래방": 0.7,
            "스크린골프": 0.6,
            "쿠킹클래스": 0.8,
            
            # 제외
            "혼밥맛집": 0.2,
            "독서실": 0.0,
        },
        
        cost_sensitivity=0.6,  # N빵 가능 (중간)
        cost_threshold=25000,  # 1인당 2.5만원
        
        narrative_tone="따뜻함, 연결, 공감",
        narrative_keywords=["함께", "나누다", "연결", "마음", "대화", "웃음", "추억"],
        
        novelty_preference=0.5,
        crowd_tolerance=0.7,  # 사람 많아도 OK
        time_flexibility=0.9,  # 매우 유연
        social_intensity=0.9,  # 매우 높음
        
        time_of_day_weights={
            "dawn": 0.2,
            "morning": 0.6,
            "afternoon": 0.8,
            "evening": 1.0,   # 저녁 최적
            "night": 0.9,
            "midnight": 0.4,
        },
        
        weather_weights={
            "sunny": 0.9,
            "cloudy": 0.8,
            "rainy": 0.7,    # 실내 활동
            "snowy": 0.6,
            "windy": 0.7,
        },
    ),
    
    RoleType.ACHIEVER: RoleConfig(
        id="achiever",
        korean_name="달성자",
        english_name="Achiever",
        description="목표를 향해 전진하는 성취의 챔피언",
        
        # 행동 반경: 매우 넓음
        radius_min=1000,
        radius_max=15000,
        radius_base=5000,
        
        category_weights={
            # 핵심 카테고리
            "헬스장": 1.0,
            "러닝코스": 1.0,
            "챌린지스팟": 1.0,
            
            # 세부 카테고리
            "크로스핏": 0.9,
            "클라이밍": 0.9,
            "수영장": 0.8,
            "사이클링코스": 0.9,
            "등산로": 0.8,
            
            # 자기계발
            "스터디카페": 0.8,
            "코워킹": 0.7,
            "북카페": 0.6,
            
            # 영양/회복
            "샐러드바": 0.7,
            "프로틴카페": 0.8,
            "스무디바": 0.7,
            
            # 측정/기록
            "러닝트랙": 1.0,
            "자전거도로": 0.9,
            
            # 제외
            "술집": 0.2,
            "패스트푸드": 0.1,
        },
        
        cost_sensitivity=0.3,  # 목적 중심 (비용 덜 민감)
        cost_threshold=80000,  # 월 회원권 등
        
        narrative_tone="열정적, 분석적, 동기부여",
        narrative_keywords=["도전", "극복", "성장", "기록", "한계", "돌파", "진화"],
        
        novelty_preference=0.6,
        crowd_tolerance=0.6,
        time_flexibility=0.4,  # 루틴 중시
        social_intensity=0.5,
        
        time_of_day_weights={
            "dawn": 1.0,      # 새벽 운동
            "morning": 0.9,
            "afternoon": 0.6,
            "evening": 0.8,
            "night": 0.7,
            "midnight": 0.3,
        },
        
        weather_weights={
            "sunny": 1.0,
            "cloudy": 0.9,
            "rainy": 0.5,    # 실내 전환
            "snowy": 0.4,
            "windy": 0.6,
        },
    ),
}


def get_role_config(role_type: RoleType) -> RoleConfig:
    """역할 타입에 해당하는 설정 반환"""
    return ROLE_CONFIGS[role_type]


def calculate_radius_by_level(role_type: RoleType, user_level: int) -> int:
    """
    레벨에 따른 동적 반경 계산
    
    Args:
        role_type: 역할 타입
        user_level: 사용자 레벨 (1~50)
    
    Returns:
        검색 반경 (미터)
    """
    config = get_role_config(role_type)
    
    # 레벨별 확장 계산 (로그 스케일 적용)
    import math
    expansion_factor = 1 + (math.log(user_level + 1) / 4)
    
    radius = int(config.radius_base * expansion_factor)
    
    # 최소/최대 제한
    radius = max(config.radius_min, min(radius, config.radius_max))
    
    return radius
