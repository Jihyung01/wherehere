# -*- coding: utf-8 -*-
"""
AI Narrative Generator using Anthropic Claude
"""

from anthropic import Anthropic
from typing import Optional
from core.config import settings

# Anthropic 클라이언트 초기화
client = None
if settings.ANTHROPIC_API_KEY and settings.ANTHROPIC_API_KEY != "your_anthropic_api_key_here":
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        print(f"✅ Anthropic client initialized successfully")
    except Exception as e:
        print(f"⚠️ Anthropic client initialization failed: {e}")
else:
    print(f"⚠️ Anthropic API key not configured, using fallback narratives")


ROLE_PROMPTS = {
    "explorer": "당신은 새로운 발견을 추구하는 탐험가입니다. 미지의 장소, 숨겨진 보석, 모험적인 경험을 중시합니다.",
    "healer": "당신은 쉼과 회복을 추구하는 치유자입니다. 평온함, 자연, 명상적 공간을 중시합니다.",
    "archivist": "당신은 미적 경험을 수집하는 감각의 큐레이터입니다. 아름다움, 예술, 사진 촬영 가치를 중시합니다.",
    "relation": "당신은 따뜻한 연결을 추구하는 관계의 직조자입니다. 사람들과의 교류, 대화, 공동체를 중시합니다.",
    "achiever": "당신은 성취를 추구하는 챔피언입니다. 도전, 목표 달성, 자기 계발을 중시합니다.",
}


async def generate_narrative(
    place_name: str,
    category: str,
    role_type: str,
    vibe_tags: list[str],
    is_hidden_gem: bool = False,
    user_mood: Optional[str] = None,
) -> str:
    """
    Claude API를 사용하여 장소에 대한 감성적 서사 생성
    
    Args:
        place_name: 장소 이름
        category: 장소 카테고리
        role_type: 사용자 역할 (explorer, healer, etc.)
        vibe_tags: 장소 분위기 태그
        is_hidden_gem: 히든 보석 여부
        user_mood: 사용자 기분 (선택)
    
    Returns:
        1-2문장의 감성적 서사
    """
    
    # Claude API가 없으면 기본 서사 반환
    if not client:
        print(f"⚠️ Using fallback narrative for {place_name}")
        return _get_fallback_narrative(role_type, is_hidden_gem)
    
    try:
        print(f"🤖 Generating AI narrative for {place_name}...")
        # 역할별 페르소나
        role_persona = ROLE_PROMPTS.get(role_type, ROLE_PROMPTS["explorer"])
        
        # 히든 보석 강조
        hidden_context = "이곳은 숨겨진 보석입니다. " if is_hidden_gem else ""
        
        # 분위기 태그
        vibe_context = f"분위기: {', '.join(vibe_tags[:3])}" if vibe_tags else ""
        
        # 기분 컨텍스트
        mood_context = f"사용자는 지금 '{user_mood}' 기분입니다. " if user_mood else ""
        
        # 프롬프트 구성
        prompt = f"""당신은 감성적인 여행 작가입니다.

역할: {role_persona}

장소: {place_name}
카테고리: {category}
{vibe_context}
{hidden_context}{mood_context}

이 장소에 대한 **1-2문장**의 짧고 감성적인 서사를 작성하세요.
- 시적이고 은유적인 표현 사용
- 역할의 가치관 반영
- 구체적인 정보보다는 감정과 분위기 전달
- 한국어로 작성
- 이모지 사용 금지

예시:
"오래된 골목이 품고 있던 비밀, 오늘 당신이 처음으로 열어봅니다."
"빛이 만드는 그림자 속에서, 당신만의 순간을 포착하세요."
"시간이 멈춘 정원. 길을 잃어야만 찾을 수 있는 곳."
"""

        # Claude API 호출
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,
            temperature=0.9,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        # 응답 추출
        narrative = message.content[0].text.strip()
        
        # 따옴표 제거 (있을 경우)
        narrative = narrative.strip('"').strip("'")
        
        print(f"✅ AI narrative generated: {narrative[:50]}...")
        return narrative
        
    except Exception as e:
        print(f"⚠️ Narrative generation failed: {e}")
        return _get_fallback_narrative(role_type, is_hidden_gem)


def _get_fallback_narrative(role_type: str, is_hidden_gem: bool) -> str:
    """
    Claude API 실패 시 사용할 기본 서사
    """
    fallback_narratives = {
        "explorer": [
            "지도에 없는 길 위에서, 새로운 이야기가 시작됩니다.",
            "익숙한 길을 벗어나는 순간, 모든 풍경이 새로워집니다.",
            "오래된 골목이 품고 있던 비밀, 오늘 당신이 처음으로 열어봅니다.",
        ],
        "healer": [
            "바람이 나뭇잎을 쓸 때, 당신의 마음도 함께 가벼워집니다.",
            "고요함이 말을 걸어오는 곳. 오늘은 듣기만 해도 괜찮습니다.",
            "시간이 천천히 흐르는 곳에서, 당신도 천천히 숨 쉬세요.",
        ],
        "archivist": [
            "빛이 만드는 그림자 속에서, 당신만의 순간을 포착하세요.",
            "벽 위의 색채가 당신의 렌즈를 통해 새로운 이야기가 됩니다.",
            "순간을 담는 것이 아니라, 순간이 당신을 담는 곳.",
        ],
        "relation": [
            "테이블 위의 요리보다, 마주 앉은 사람의 이야기가 더 맛있는 저녁.",
            "돗자리 위에서 나누는 이야기는, 언제나 더 솔직해집니다.",
            "주사위가 굴러갈 때, 대화도 함께 굴러갑니다.",
        ],
        "achiever": [
            "한 걸음이 쌓여 기록이 되고, 기록이 쌓여 전설이 됩니다.",
            "벽 끝에 매달린 순간, 포기와 성취 사이에서 당신은 항상 올라갑니다.",
            "시계가 멈춘 것처럼 몰입하는 순간, 어제의 한계가 오늘의 출발선이 됩니다.",
        ],
    }
    
    narratives = fallback_narratives.get(role_type, fallback_narratives["explorer"])
    
    # 히든 보석이면 첫 번째 서사 사용
    if is_hidden_gem:
        return narratives[0]
    
    # 랜덤하게 선택
    import random
    return random.choice(narratives)


async def generate_narratives_batch(places: list[dict], role_type: str, user_mood: Optional[str] = None) -> list[str]:
    """
    여러 장소에 대한 서사를 배치로 생성
    
    Args:
        places: 장소 정보 리스트 (각각 name, category, vibe_tags, is_hidden_gem 포함)
        role_type: 사용자 역할
        user_mood: 사용자 기분
    
    Returns:
        서사 리스트 (places와 같은 순서)
    """
    narratives = []
    
    for place in places:
        narrative = await generate_narrative(
            place_name=place.get("name", ""),
            category=place.get("category", ""),
            role_type=role_type,
            vibe_tags=place.get("vibe_tags", []),
            is_hidden_gem=place.get("is_hidden_gem", False),
            user_mood=user_mood,
        )
        narratives.append(narrative)
    
    return narratives
