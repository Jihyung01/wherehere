"""
Mock Data Module
Provides realistic sample data when DB is not connected.
Data mirrors the Supabase seed data for consistency.
"""

from datetime import datetime
import random
import math


# 서울 실제 장소 데이터 (seed.sql과 동일)
MOCK_PLACES = [
    {
        "place_id": "mock-001",
        "name": "조용한 숲속 북카페",
        "address": "서울 강남구 테헤란로 123",
        "primary_category": "북카페",
        "secondary_categories": ["카페", "힐링", "독서"],
        "price_tier": "low",
        "average_price": 8000,
        "vibe_tags": ["cozy", "quiet", "nature", "peaceful"],
        "average_rating": 4.5,
        "is_hidden_gem": False,
        "typical_crowd_level": "low",
        "latitude": 37.4979,
        "longitude": 127.0276,
        "opening_hours": {"mon": "09:00-22:00", "sat": "10:00-23:00"},
        "description": "테헤란로 뒷골목에 숨겨진 숲속 느낌의 북카페",
    },
    {
        "place_id": "mock-002",
        "name": "히든 골목 이탈리안",
        "address": "서울 강남구 논현동 45-12",
        "primary_category": "이색장소",
        "secondary_categories": ["맛집", "히든스팟", "데이트"],
        "price_tier": "medium",
        "average_price": 25000,
        "vibe_tags": ["hidden", "authentic", "romantic", "intimate"],
        "average_rating": 4.8,
        "is_hidden_gem": True,
        "typical_crowd_level": "medium",
        "latitude": 37.4985,
        "longitude": 127.0301,
        "opening_hours": {"tue": "17:00-23:00", "sat": "17:00-00:00"},
        "description": "셰프가 직접 운영하는 히든 이탈리안 레스토랑",
    },
    {
        "place_id": "mock-003",
        "name": "루프탑 뷰 갤러리",
        "address": "서울 강남구 선릉로 88길 15",
        "primary_category": "갤러리",
        "secondary_categories": ["전시", "뷰맛집", "사진"],
        "price_tier": "medium",
        "average_price": 15000,
        "vibe_tags": ["artistic", "modern", "instagram", "scenic"],
        "average_rating": 4.6,
        "is_hidden_gem": False,
        "typical_crowd_level": "low",
        "latitude": 37.5007,
        "longitude": 127.0289,
        "opening_hours": {"tue": "11:00-20:00", "sat": "10:00-21:00"},
        "description": "도심 속 루프탑에서 즐기는 전시와 뷰",
    },
    {
        "place_id": "mock-004",
        "name": "빈티지 레코드 카페",
        "address": "서울 마포구 홍익로 72",
        "primary_category": "카페",
        "secondary_categories": ["음악", "빈티지", "감성"],
        "price_tier": "low",
        "average_price": 7000,
        "vibe_tags": ["vintage", "music", "retro", "cozy"],
        "average_rating": 4.7,
        "is_hidden_gem": True,
        "typical_crowd_level": "medium",
        "latitude": 37.5563,
        "longitude": 126.9240,
        "opening_hours": {"mon": "12:00-23:00", "sat": "12:00-01:00"},
        "description": "LP 레코드를 들으며 커피를 즐기는 감성 카페",
    },
    {
        "place_id": "mock-005",
        "name": "아트 스트리트 벽화골목",
        "address": "서울 마포구 와우산로 29길",
        "primary_category": "이색장소",
        "secondary_categories": ["예술", "사진", "산책"],
        "price_tier": "free",
        "average_price": 0,
        "vibe_tags": ["artistic", "colorful", "instagram", "outdoor"],
        "average_rating": 4.4,
        "is_hidden_gem": False,
        "typical_crowd_level": "high",
        "latitude": 37.5547,
        "longitude": 126.9198,
        "opening_hours": {"mon": "00:00-23:59"},
        "description": "홍대 벽화로 가득한 예술적인 골목길",
    },
    {
        "place_id": "mock-006",
        "name": "한남동 숨은 정원",
        "address": "서울 용산구 한남대로 98",
        "primary_category": "공원",
        "secondary_categories": ["힐링", "자연", "산책"],
        "price_tier": "free",
        "average_price": 0,
        "vibe_tags": ["peaceful", "nature", "hidden", "serene"],
        "average_rating": 4.9,
        "is_hidden_gem": True,
        "typical_crowd_level": "very_low",
        "latitude": 37.5347,
        "longitude": 127.0023,
        "opening_hours": {"mon": "06:00-20:00"},
        "description": "도심 한가운데 숨겨진 비밀 정원",
    },
    {
        "place_id": "mock-007",
        "name": "글로벌 퓨전 다이닝",
        "address": "서울 용산구 이태원로 234",
        "primary_category": "맛집",
        "secondary_categories": ["다이닝", "모임", "데이트"],
        "price_tier": "high",
        "average_price": 45000,
        "vibe_tags": ["sophisticated", "international", "social", "trendy"],
        "average_rating": 4.7,
        "is_hidden_gem": False,
        "typical_crowd_level": "high",
        "latitude": 37.5342,
        "longitude": 127.0034,
        "opening_hours": {"mon": "11:30-22:00", "sat": "11:30-23:00"},
        "description": "세계 각국의 맛을 퓨전으로 선보이는 다이닝",
    },
    {
        "place_id": "mock-008",
        "name": "성수 공장 카페",
        "address": "서울 성동구 연무장길 74",
        "primary_category": "카페",
        "secondary_categories": ["인더스트리얼", "브런치", "작업"],
        "price_tier": "medium",
        "average_price": 12000,
        "vibe_tags": ["industrial", "spacious", "modern", "productive"],
        "average_rating": 4.6,
        "is_hidden_gem": False,
        "typical_crowd_level": "high",
        "latitude": 37.5445,
        "longitude": 127.0557,
        "opening_hours": {"mon": "09:00-22:00", "sat": "10:00-23:00"},
        "description": "공장을 개조한 인더스트리얼 감성 카페",
    },
    {
        "place_id": "mock-009",
        "name": "수제화 공방 갤러리",
        "address": "서울 성동구 아차산로 12길",
        "primary_category": "이색장소",
        "secondary_categories": ["공방", "체험", "쇼핑"],
        "price_tier": "medium",
        "average_price": 20000,
        "vibe_tags": ["unique", "craftsmanship", "authentic", "local"],
        "average_rating": 4.5,
        "is_hidden_gem": True,
        "typical_crowd_level": "low",
        "latitude": 37.5438,
        "longitude": 127.0543,
        "opening_hours": {"tue": "11:00-19:00", "sat": "11:00-20:00"},
        "description": "50년 전통 수제화 장인의 공방 겸 갤러리",
    },
    {
        "place_id": "mock-010",
        "name": "한강 러닝 코스",
        "address": "서울 영등포구 여의동로 330",
        "primary_category": "러닝코스",
        "secondary_categories": ["운동", "공원", "자전거"],
        "price_tier": "free",
        "average_price": 0,
        "vibe_tags": ["outdoor", "energetic", "spacious", "scenic"],
        "average_rating": 4.8,
        "is_hidden_gem": False,
        "typical_crowd_level": "medium",
        "latitude": 37.5285,
        "longitude": 126.9329,
        "opening_hours": {"mon": "00:00-23:59"},
        "description": "한강변 최고의 러닝 & 사이클링 코스",
    },
    {
        "place_id": "mock-011",
        "name": "한옥 티하우스",
        "address": "서울 종로구 북촌로 11길 22",
        "primary_category": "북카페",
        "secondary_categories": ["전통", "차", "힐링"],
        "price_tier": "low",
        "average_price": 9000,
        "vibe_tags": ["traditional", "peaceful", "cultural", "zen"],
        "average_rating": 4.7,
        "is_hidden_gem": True,
        "typical_crowd_level": "low",
        "latitude": 37.5826,
        "longitude": 126.9849,
        "opening_hours": {"mon": "10:00-20:00", "sat": "10:00-21:00"},
        "description": "북촌 한옥에서 즐기는 전통 차 한 잔",
    },
    {
        "place_id": "mock-012",
        "name": "삼청동 갤러리 카페",
        "address": "서울 종로구 삼청로 45",
        "primary_category": "갤러리",
        "secondary_categories": ["전시", "카페", "예술"],
        "price_tier": "medium",
        "average_price": 13000,
        "vibe_tags": ["artistic", "elegant", "cultural", "sophisticated"],
        "average_rating": 4.6,
        "is_hidden_gem": False,
        "typical_crowd_level": "medium",
        "latitude": 37.5858,
        "longitude": 126.9823,
        "opening_hours": {"tue": "11:00-21:00", "sat": "10:00-22:00"},
        "description": "삼청동 갤러리에서 전시와 커피를 함께",
    },
    {
        "place_id": "mock-013",
        "name": "연남동 책방 카페",
        "address": "서울 마포구 동교로 198",
        "primary_category": "북카페",
        "secondary_categories": ["독서", "조용한", "힐링"],
        "price_tier": "low",
        "average_price": 7500,
        "vibe_tags": ["cozy", "quiet", "literary", "intimate"],
        "average_rating": 4.8,
        "is_hidden_gem": True,
        "typical_crowd_level": "low",
        "latitude": 37.5656,
        "longitude": 126.9254,
        "opening_hours": {"mon": "11:00-22:00", "sat": "11:00-23:00"},
        "description": "연남동 골목 안 아늑한 독립 책방 카페",
    },
    {
        "place_id": "mock-014",
        "name": "연트럴파크",
        "address": "서울 마포구 연남동 567-186",
        "primary_category": "공원",
        "secondary_categories": ["산책", "피크닉", "자연"],
        "price_tier": "free",
        "average_price": 0,
        "vibe_tags": ["peaceful", "green", "family-friendly", "relaxing"],
        "average_rating": 4.5,
        "is_hidden_gem": False,
        "typical_crowd_level": "medium",
        "latitude": 37.5689,
        "longitude": 126.9267,
        "opening_hours": {"mon": "00:00-23:59"},
        "description": "연남동의 녹지 산책로, 경의선 숲길",
    },
    {
        "place_id": "mock-015",
        "name": "을지로 루프탑 바",
        "address": "서울 중구 을지로 123",
        "primary_category": "이색장소",
        "secondary_categories": ["뷰맛집", "바", "야경"],
        "price_tier": "high",
        "average_price": 35000,
        "vibe_tags": ["trendy", "scenic", "social", "nightlife"],
        "average_rating": 4.7,
        "is_hidden_gem": False,
        "typical_crowd_level": "high",
        "latitude": 37.5665,
        "longitude": 126.9910,
        "opening_hours": {"tue": "17:00-02:00", "sat": "17:00-03:00"},
        "description": "을지로 야경을 한눈에 내려다보는 루프탑 바",
    },
]


# 역할별 선호 카테고리 매핑
ROLE_CATEGORY_MAP = {
    "explorer": ["이색장소", "히든스팟", "골목길", "빈티지샵"],
    "healer": ["공원", "북카페", "숲", "사찰/교회", "도서관"],
    "archivist": ["갤러리", "전시관", "뷰맛집", "건축물", "카페"],
    "relation": ["맛집", "카페", "액티비티", "이색장소"],
    "achiever": ["러닝코스", "헬스장", "챌린지스팟", "스터디카페"],
}

# 역할별 AI 서사 템플릿
ROLE_NARRATIVES = {
    "explorer": [
        "오래된 골목이 품고 있던 비밀, 오늘 당신이 처음으로 열어봅니다.",
        "지도에 없는 길 위에서, 새로운 이야기가 시작됩니다.",
        "발걸음이 닿는 곳마다 세상이 넓어집니다. 오늘도 한 걸음 더.",
        "익숙한 길을 벗어나는 순간, 모든 풍경이 새로워집니다.",
    ],
    "healer": [
        "바람이 나뭇잎을 쓸 때, 당신의 마음도 함께 가벼워집니다.",
        "오늘은 아무것도 하지 않아도 괜찮은 날. 쉼도 용기입니다.",
        "고요한 공간이 당신에게 건네는 위로를 받아주세요.",
        "숨을 깊이 들이쉬세요. 이 순간만큼은 온전히 당신의 것입니다.",
    ],
    "archivist": [
        "빛이 만드는 그림자 속에서, 당신만의 순간을 포착하세요.",
        "벽 위의 색채가 당신의 렌즈를 통해 새로운 이야기가 됩니다.",
        "아름다움은 찾는 눈에만 보입니다. 오늘, 당신의 컬렉션에 한 장면을.",
        "시간이 쌓아올린 질감 위에서, 감각이 깨어납니다.",
    ],
    "relation": [
        "테이블 위의 요리보다, 마주 앉은 사람의 이야기가 더 맛있는 시간.",
        "함께 웃는 순간, 세상이 조금 더 따뜻해집니다.",
        "대화가 깊어지는 곳에서, 관계도 함께 깊어집니다.",
        "돗자리 위에서 나누는 이야기는, 언제나 더 솔직해집니다.",
    ],
    "achiever": [
        "한 걸음이 쌓여 기록이 되고, 기록이 쌓여 전설이 됩니다.",
        "어제의 한계가 오늘의 출발선. 매일이 새로운 도전입니다.",
        "벽 끝에 매달린 순간, 포기와 성취 사이에서 당신은 항상 올라갑니다.",
        "땀 한 방울이 만드는 변화. 오늘도 더 강한 당신을 만나세요.",
    ],
}


def _haversine_distance(lat1, lon1, lat2, lon2):
    """두 좌표 사이 거리 계산 (미터)"""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def get_mock_recommendations(role_type: str, latitude: float, longitude: float, user_level: int = 1, top_k: int = 3):
    """
    Mock 추천 생성 - DB 없이 작동
    실제 추천 엔진의 로직을 간소화하여 적용
    """
    preferred = ROLE_CATEGORY_MAP.get(role_type, [])
    narratives = ROLE_NARRATIVES.get(role_type, ROLE_NARRATIVES["explorer"])

    scored = []
    for place in MOCK_PLACES:
        dist = _haversine_distance(latitude, longitude, place["latitude"], place["longitude"])

        # 카테고리 점수
        cat_score = 0.8
        if place["primary_category"] in preferred:
            cat_score = 1.0
        for sc in place.get("secondary_categories", []):
            if sc in preferred:
                cat_score = min(cat_score + 0.15, 1.0)

        # 거리 감점
        dist_score = math.exp(-0.0003 * dist)

        # 히든 보너스
        hidden_bonus = 15 if user_level >= 6 and place.get("is_hidden_gem") else 0

        # 랜덤 탐색
        random_bonus = random.uniform(0, 5)

        final_score = cat_score * 40 + dist_score * 25 + hidden_bonus + random_bonus

        scored.append({
            **place,
            "distance_meters": round(dist),
            "final_score": round(final_score, 2),
            "narrative": random.choice(narratives),
            "score_breakdown": {
                "category": round(cat_score * 100, 1),
                "distance": round(dist_score * 100, 1),
                "hidden_bonus": hidden_bonus,
                "random": round(random_bonus, 1),
            },
        })

    scored.sort(key=lambda x: x["final_score"], reverse=True)

    # 역할별 반경
    radius_map = {
        "explorer": 3000 + user_level * 200,
        "healer": 800 + user_level * 50,
        "archivist": 2000 + user_level * 150,
        "relation": 2000 + user_level * 150,
        "achiever": 5000 + user_level * 300,
    }

    results = scored[:top_k]

    # reason 생성
    for r in results:
        if r.get("is_hidden_gem") and user_level >= 6:
            r["reason"] = f"Lv.{user_level} {role_type}만 발견할 수 있는 히든 스팟이에요"
        elif r["distance_meters"] < 500:
            r["reason"] = f"가까운 거리({r['distance_meters']}m)에 있어 바로 갈 수 있어요"
        elif r.get("average_rating", 0) >= 4.7:
            r["reason"] = f"평점 {r['average_rating']}점! 방문자들의 만족도가 매우 높은 곳이에요"
        else:
            r["reason"] = f"지금 기분에 잘 어울리는 분위기의 장소입니다"

    return {
        "recommendations": [
            {
                "place_id": r["place_id"],
                "name": r["name"],
                "address": r["address"],
                "category": r["primary_category"],
                "distance_meters": r["distance_meters"],
                "score": r["final_score"],
                "score_breakdown": r["score_breakdown"],
                "reason": r["reason"],
                "estimated_cost": r.get("average_price"),
                "vibe_tags": r.get("vibe_tags", []),
                "average_rating": r.get("average_rating", 0),
                "is_hidden_gem": r.get("is_hidden_gem", False),
                "typical_crowd_level": r.get("typical_crowd_level", "medium"),
                "narrative": r.get("narrative", ""),
                "description": r.get("description", ""),
            }
            for r in results
        ],
        "role_type": role_type,
        "radius_used": radius_map.get(role_type, 2000),
        "total_candidates": len(MOCK_PLACES),
        "generated_at": datetime.now().isoformat(),
        "data_source": "mock" if True else "database",
    }
