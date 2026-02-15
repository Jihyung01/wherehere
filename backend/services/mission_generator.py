# -*- coding: utf-8 -*-
"""
맞춤형 미션 생성 시스템
- 장소/역할/레벨에 맞는 동적 미션
- AI 기반 미션 생성
- 난이도 조정
"""

import json
from typing import List, Dict, Optional
from datetime import datetime
from anthropic import Anthropic

from core.config import settings


# 미션 템플릿 (카테고리별)
MISSION_TEMPLATES = {
    "explorer": {
        "카페": {
            "basic": [
                "숨겨진 메뉴 발견하기",
                "바리스타에게 원두 이야기 듣기",
                "가장 독특한 인테리어 요소 찾기"
            ],
            "photo": [
                "창가 자리에서 거리 풍경 촬영",
                "라떼 아트 클로즈업",
                "카페의 시그니처 포인트 촬영"
            ],
            "social": [
                "단골 손님과 대화하기",
                "사장님께 이곳의 역사 듣기",
                "옆 테이블 손님에게 추천 메뉴 물어보기"
            ],
            "challenge": [
                "메뉴판 없이 주문하기",
                "30분 안에 현지인 친구 1명 사귀기",
                "카페 이름의 유래 알아내기"
            ]
        },
        "맛집": {
            "basic": [
                "시그니처 메뉴 주문하기",
                "주방 구경하기",
                "숨은 반찬 발견하기"
            ],
            "photo": [
                "음식 플레이팅 촬영",
                "주방 풍경 담기",
                "사장님과 셀카"
            ],
            "social": [
                "사장님께 레시피 비법 듣기",
                "단골 추천 메뉴 물어보기"
            ],
            "challenge": [
                "메뉴판에 없는 메뉴 주문하기",
                "현지인만 아는 먹는 법 배우기"
            ]
        },
        "갤러리": {
            "basic": [
                "전시 작품 10개 감상하기",
                "가장 인상 깊은 작품 찾기",
                "작가 노트 읽기"
            ],
            "photo": [
                "작품과 함께 셀카",
                "전시 공간 건축미 촬영",
                "빛과 그림자 포착"
            ],
            "social": [
                "큐레이터에게 작품 설명 듣기",
                "다른 관람객과 감상 나누기"
            ],
            "challenge": [
                "작품에 대한 나만의 해석 만들기",
                "작가에게 질문하기"
            ]
        },
        "공원": {
            "basic": [
                "숨은 포토존 찾기",
                "나무 10그루 관찰하기",
                "벤치에서 15분 명상"
            ],
            "photo": [
                "계절감 담은 사진",
                "자연 속 인물 사진",
                "골든아워 풍경"
            ],
            "social": [
                "산책하는 사람과 인사하기",
                "반려동물과 교감하기"
            ],
            "challenge": [
                "지도 없이 숨은 명소 찾기",
                "새 소리 3가지 구별하기"
            ]
        }
    },
    "healer": {
        "카페": {
            "basic": [
                "창가 자리에서 30분 머물기",
                "따뜻한 음료 천천히 마시기",
                "책 한 챕터 읽기"
            ],
            "sensory": [
                "커피 향 깊게 음미하기",
                "카페 음악에 집중하기",
                "컵의 온기 느끼기"
            ],
            "reflection": [
                "오늘 감사한 일 3가지 떠올리기",
                "내면의 소리 듣기",
                "일기 한 페이지 쓰기"
            ]
        },
        "공원": {
            "basic": [
                "벤치에서 15분 명상",
                "맨발로 잔디 밟기",
                "나무 아래에서 휴식"
            ],
            "sensory": [
                "바람 소리 듣기",
                "햇살 느끼기",
                "자연 향기 맡기"
            ],
            "reflection": [
                "스트레스 내려놓기",
                "자연과 하나되기",
                "마음 비우기"
            ]
        }
    },
    "artist": {
        "갤러리": {
            "basic": [
                "작품 10개 감상하기",
                "스케치북에 영감 기록",
                "색감 분석하기"
            ],
            "creative": [
                "작품 모작 스케치",
                "나만의 작품 구상하기",
                "사진으로 재해석"
            ]
        },
        "카페": {
            "basic": [
                "인테리어 디자인 분석",
                "조명 연출 관찰",
                "색상 조합 연구"
            ],
            "creative": [
                "공간 스케치하기",
                "나만의 카페 디자인 구상",
                "예술적 사진 촬영"
            ]
        }
    },
    "foodie": {
        "맛집": {
            "basic": [
                "시그니처 메뉴 맛보기",
                "3가지 맛 구별하기",
                "플레이팅 감상하기"
            ],
            "expert": [
                "재료 추측하기",
                "조리법 분석하기",
                "페어링 음료 찾기"
            ],
            "social": [
                "셰프에게 레시피 물어보기",
                "맛 평가 작성하기"
            ]
        }
    },
    "challenger": {
        "all": {
            "time_challenge": [
                "10분 안에 도착하기",
                "30분 안에 미션 3개 완료",
                "1시간 체류 달성"
            ],
            "social_challenge": [
                "낯선 사람 3명과 대화하기",
                "새로운 친구 1명 사귀기",
                "인스타그램 스토리 공유"
            ],
            "extreme": [
                "눈 감고 메뉴 주문하기",
                "외국어로만 대화하기",
                "즉흥 공연하기"
            ]
        }
    }
}


class MissionGenerator:
    """
    AI 기반 맞춤형 미션 생성
    """
    
    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def generate_missions(
        self,
        place: Dict,
        role_type: str,
        user_level: int,
        user_personality: Dict,
        weather: Optional[str] = None,
        time_of_day: Optional[str] = None
    ) -> List[Dict]:
        """
        장소와 사용자에 맞는 맞춤형 미션 생성
        
        Returns:
            [
                {
                    "type": "basic",
                    "title": "장소에 도착하기",
                    "description": "GPS 기준 50m 이내",
                    "xp": 30,
                    "difficulty": "easy",
                    "icon": "📍"
                },
                ...
            ]
        """
        
        # 기본 미션 (항상 포함)
        missions = [
            {
                "type": "basic",
                "title": "장소에 도착하기",
                "description": "GPS 기준 50m 이내",
                "xp": 30,
                "difficulty": "easy",
                "icon": "📍",
                "auto_complete": True  # 도착 시 자동 완료
            }
        ]
        
        # AI로 맞춤 미션 생성
        ai_missions = await self._generate_ai_missions(
            place=place,
            role_type=role_type,
            user_level=user_level,
            user_personality=user_personality,
            weather=weather,
            time_of_day=time_of_day
        )
        
        missions.extend(ai_missions)
        
        # 난이도 조정
        missions = self._adjust_difficulty(missions, user_level)
        
        return missions
    
    async def _generate_ai_missions(
        self,
        place: Dict,
        role_type: str,
        user_level: int,
        user_personality: Dict,
        weather: Optional[str],
        time_of_day: Optional[str]
    ) -> List[Dict]:
        """
        AI로 미션 생성
        """
        
        # 템플릿 가져오기
        templates = MISSION_TEMPLATES.get(role_type, {})
        category_templates = templates.get(place.get("category", "카페"), {})
        
        # 템플릿 예시
        template_examples = []
        for mission_type, missions in category_templates.items():
            template_examples.extend(missions[:2])  # 각 타입에서 2개씩
        
        prompt = f"""
장소: {place['name']}
카테고리: {place['category']}
분위기: {', '.join(place.get('vibe_tags', []))}
역할: {role_type}
사용자 레벨: Lv.{user_level}

사용자 성격:
- 개방성: {user_personality.get('openness', 0.5):.2f} ({"높음" if user_personality.get('openness', 0.5) > 0.7 else "보통"})
- 외향성: {user_personality.get('extraversion', 0.5):.2f} ({"사교적" if user_personality.get('extraversion', 0.5) > 0.7 else "내향적"})

현재 상황:
- 날씨: {weather or '맑음'}
- 시간: {time_of_day or '오후'}

미션 템플릿 예시:
{chr(10).join(f'- {t}' for t in template_examples[:5])}

이 장소와 사용자에게 딱 맞는 **3-4개의 미션**을 생성하세요.

규칙:
1. 역할 특화 미션 1-2개 (탐험가는 탐험, 힐러는 힐링)
2. 장소 특화 미션 1-2개 (이 장소만의 특별한 미션)
3. 레벨에 맞는 난이도
4. 사용자 성격 반영 (외향적이면 소셜, 내향적이면 개인)
5. 날씨/시간 고려 (비 오면 실내, 저녁이면 야경)

난이도 기준:
- Lv.1-3: easy (도착, 사진 촬영, 간단한 관찰)
- Lv.4-7: medium (대화, 탐험, 미션 조합)
- Lv.8-10: hard (챌린지, 소셜, 창의적 미션)

출력 형식:
[
  {{
    "type": "role_specific",
    "title": "바리스타에게 원두 이야기 듣기",
    "description": "이 카페만의 특별한 원두 스토리를 들어보세요",
    "xp": 50,
    "difficulty": "medium",
    "icon": "☕"
  }},
  {{
    "type": "place_specific",
    "title": "창가 자리에서 거리 풍경 촬영하기",
    "description": "이 카페의 시그니처 뷰를 사진으로 담아보세요",
    "xp": 40,
    "difficulty": "easy",
    "icon": "📸"
  }},
  {{
    "type": "challenge",
    "title": "30분 이상 디지털 디톡스",
    "description": "폰을 내려놓고 오롯이 이 순간을 즐겨보세요",
    "xp": 60,
    "difficulty": "medium",
    "icon": "🧘"
  }}
]
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=600,
                messages=[{"role": "user", "content": prompt}]
            )
            
            missions_text = response.content[0].text.strip()
            
            # JSON 파싱
            if "```json" in missions_text:
                missions_text = missions_text.split("```json")[1].split("```")[0].strip()
            elif "```" in missions_text:
                missions_text = missions_text.split("```")[1].split("```")[0].strip()
            
            missions = json.loads(missions_text)
            
            print(f"✅ AI 미션 생성: {len(missions)}개")
            
            return missions
        
        except Exception as e:
            print(f"❌ AI 미션 생성 실패: {e}")
            
            # 폴백: 템플릿 기반 미션
            return self._get_template_missions(place, role_type)
    
    def _get_template_missions(self, place: Dict, role_type: str) -> List[Dict]:
        """
        템플릿 기반 폴백 미션
        """
        
        category = place.get("category", "카페")
        templates = MISSION_TEMPLATES.get(role_type, {}).get(category, {})
        
        missions = []
        
        # 기본 미션
        if "basic" in templates and templates["basic"]:
            missions.append({
                "type": "basic",
                "title": templates["basic"][0],
                "description": "이 장소의 특별함을 발견해보세요",
                "xp": 40,
                "difficulty": "easy",
                "icon": "🎯"
            })
        
        # 사진 미션
        if "photo" in templates and templates["photo"]:
            missions.append({
                "type": "photo",
                "title": templates["photo"][0],
                "description": "사진으로 이 순간을 기록하세요",
                "xp": 50,
                "difficulty": "easy",
                "icon": "📸"
            })
        
        # 소셜 미션
        if "social" in templates and templates["social"]:
            missions.append({
                "type": "social",
                "title": templates["social"][0],
                "description": "새로운 연결을 만들어보세요",
                "xp": 60,
                "difficulty": "medium",
                "icon": "💬"
            })
        
        return missions[:3]  # 최대 3개
    
    def _adjust_difficulty(self, missions: List[Dict], user_level: int) -> List[Dict]:
        """
        사용자 레벨에 따라 난이도 조정
        """
        
        if user_level < 5:
            # 초보자: easy, medium만
            return [m for m in missions if m.get("difficulty") in ["easy", "medium"]]
        
        elif user_level >= 8:
            # 고수: 챌린지 미션 추가 가능
            return missions
        
        return missions
    
    async def generate_challenge_missions(
        self,
        theme: str,
        difficulty: str,
        user_level: int
    ) -> List[Dict]:
        """
        챌린지용 특별 미션 생성
        
        Args:
            theme: "루프탑 정복", "카페 마스터", etc.
            difficulty: "easy", "medium", "hard"
        """
        
        prompt = f"""
챌린지 테마: {theme}
난이도: {difficulty}
사용자 레벨: Lv.{user_level}

이 챌린지에 맞는 특별한 미션 5-7개를 생성하세요.

예시 (루프탑 정복):
1. 을지로 루프탑 바 방문
2. 석양 사진 촬영
3. 루프탑에서 30분 이상 체류
4. 야경 감상하기
5. 루프탑 칵테일 맛보기

출력 형식:
[
  {{
    "order": 1,
    "title": "을지로 루프탑 바 방문",
    "description": "첫 번째 루프탑 정복!",
    "place_hint": "을지로 3가역 근처",
    "xp": 100,
    "difficulty": "medium"
  }},
  ...
]
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )
            
            missions_text = response.content[0].text.strip()
            
            if "```json" in missions_text:
                missions_text = missions_text.split("```json")[1].split("```")[0].strip()
            elif "```" in missions_text:
                missions_text = missions_text.split("```")[1].split("```")[0].strip()
            
            missions = json.loads(missions_text)
            
            return missions
        
        except Exception as e:
            print(f"❌ 챌린지 미션 생성 실패: {e}")
            return []
