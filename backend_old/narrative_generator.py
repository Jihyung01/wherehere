"""
WH Core Logic - Narrative Generation Engine
Claude 3.5 Sonnet API 기반 역할별 서사 생성 시스템
"""

from typing import Dict, Optional, List
from datetime import datetime
from dataclasses import dataclass
import json

import anthropic
from pydantic import BaseModel


# ============================================================
# 서사 생성 요청/응답 모델
# ============================================================

class NarrativeRequest(BaseModel):
    user_role: str
    user_level: int
    korean_role_name: str
    
    # 장소 정보
    place_name: str
    place_category: str
    place_vibe_tags: List[str]
    
    # 사용자 액션
    action_log: str  # "30분 체류, 하늘 사진 촬영"
    duration_minutes: Optional[int] = None
    
    # 컨텍스트
    weather: Optional[str] = None
    time_of_day: Optional[str] = None
    mood_input: Optional[str] = None


class NarrativeResponse(BaseModel):
    title: str
    body: str
    insight: str
    role_type: str
    generation_time_ms: int
    prompt_tokens: int
    completion_tokens: int


# ============================================================
# 프롬프트 템플릿 (Role별)
# ============================================================

class NarrativePromptBuilder:
    """
    역할별 맞춤형 프롬프트 생성기
    
    벤치마킹: Jasper.ai (Template Engine) + Character.AI (Persona)
    """
    
    # 역할별 스타일 가이드
    STYLE_GUIDES = {
        'explorer': {
            'tone': '모험적, 발견, 호기심 어린',
            'keywords': ['발견하다', '탐험하다', '숨겨진', '새로운', '지도 밖', '미지의', '용기'],
            'emphasis': '발견과 새로움을 강조',
            'sentence_style': '역동적이고 생동감 있는 문장',
            'metaphor': '여행, 탐험, 모험의 은유 사용'
        },
        'healer': {
            'tone': '차분한, 위로하는, 명상적인',
            'keywords': ['쉼', '위로', '평온', '고요', '치유', '여백', '숨', '내려놓다'],
            'emphasis': '쉼과 여백을 강조',
            'sentence_style': '짧고 정제된, 여운 있는 문장',
            'metaphor': '자연, 계절, 빛과 그림자의 은유'
        },
        'archivist': {
            'tone': '감각적인, 미적인, 섬세한',
            'keywords': ['포착하다', '담다', '기록하다', '순간', '빛', '질감', '아름다움', '흔적'],
            'emphasis': '시각적 묘사와 분위기(Vibe)',
            'sentence_style': '서정적이고 감각적인 묘사',
            'metaphor': '예술, 사진, 미술의 은유'
        },
        'relation': {
            'tone': '따뜻한, 대화체의, 공감적인',
            'keywords': ['함께', '나누다', '연결', '마음', '대화', '웃음', '추억', '온기'],
            'emphasis': '연결과 공감을 강조',
            'sentence_style': '친근하고 따뜻한 대화체',
            'metaphor': '관계, 연결, 다리의 은유'
        },
        'achiever': {
            'tone': '열정적인, 분석적인, 동기부여적인',
            'keywords': ['도전', '극복', '성장', '기록', '한계', '돌파', '진화', '성취'],
            'emphasis': '성취와 극복을 강조',
            'sentence_style': '단호하고 명확한 문장',
            'metaphor': '스포츠, 전투, 정상의 은유'
        }
    }
    
    # 레벨별 톤 조정
    LEVEL_ADJUSTMENTS = {
        'beginner': (1, 3, '격려 위주, 시작의 의미 강조'),
        'intermediate': (4, 7, '성장 과정 강조, 균형잡힌 톤'),
        'advanced': (8, 10, '깊이 있는 성찰, 전문가적 관점'),
        'expert': (11, 20, '철학적 통찰, 삶의 의미 탐구'),
        'master': (21, 50, '존재론적 질문, 예술적 승화')
    }
    
    @classmethod
    def build_system_prompt(cls, role: str, level: int) -> str:
        """역할별 시스템 프롬프트 생성"""
        
        style = cls.STYLE_GUIDES.get(role, cls.STYLE_GUIDES['explorer'])
        level_tier = cls._get_level_tier(level)
        
        return f"""당신은 사용자의 하루를 의미 있는 이야기로 바꿔주는 'AI 에디터'입니다.

단순히 사실을 나열하지 말고, 사용자의 역할과 레벨에 맞춰 감정적이고 문학적인 짧은 에세이를 작성하세요.

<역할_특성>
역할: {role}
톤: {style['tone']}
강조점: {style['emphasis']}
문체: {style['sentence_style']}
은유: {style['metaphor']}
핵심 키워드: {', '.join(style['keywords'])}
</역할_특성>

<레벨_적응>
현재 레벨: Lv.{level}
레벨 구간: {level_tier[2]}
</레벨_적응>

<출력_형식>
다음 JSON 형식으로 정확히 출력하세요:
{{
  "title": "제목 (8자 이내)",
  "body": "본문 (3-4문장, 150자 내외)",
  "insight": "통찰 (1줄, 30자 이내)"
}}

<작성_원칙>
1. 사실보다 감정과 의미를 담으세요
2. 추상적이지 않고 구체적인 감각을 살리세요
3. 교훈이나 설교가 아닌 공감과 발견을 담으세요
4. 과장하지 말고 절제된 감동을 주세요
5. 역할의 고유한 목소리를 유지하세요
</작성_원칙>
"""
    
    @classmethod
    def build_user_prompt(cls, request: NarrativeRequest) -> str:
        """사용자 프롬프트 생성"""
        
        # 컨텍스트 조립
        context_parts = []
        
        if request.weather:
            weather_kr = cls._translate_weather(request.weather)
            context_parts.append(f"날씨: {weather_kr}")
        
        if request.time_of_day:
            time_kr = cls._translate_time(request.time_of_day)
            context_parts.append(f"시간: {time_kr}")
        
        if request.mood_input:
            context_parts.append(f"기분: {request.mood_input}")
        
        context_str = ", ".join(context_parts) if context_parts else "일상적인 날"
        
        # 프롬프트 생성
        prompt = f"""<상황>
{context_str}
장소: {request.place_name} ({request.place_category})
분위기: {', '.join(request.place_vibe_tags) if request.place_vibe_tags else '평범한'}
행동: {request.action_log}
</상황>

위 상황을 바탕으로, '{request.korean_role_name}'의 시선으로 이 경험을 의미 있는 이야기로 풀어주세요.
"""
        
        return prompt
    
    @classmethod
    def _get_level_tier(cls, level: int) -> tuple:
        """레벨 구간 판정"""
        for tier_name, (min_lv, max_lv, desc) in cls.LEVEL_ADJUSTMENTS.items():
            if min_lv <= level <= max_lv:
                return (tier_name, min_lv, desc)
        return ('master', 21, '존재론적 질문, 예술적 승화')
    
    @staticmethod
    def _translate_weather(weather: str) -> str:
        """날씨 영문 → 한글"""
        weather_map = {
            'sunny': '맑음',
            'cloudy': '흐림',
            'rainy': '비',
            'snowy': '눈',
            'windy': '바람 많음'
        }
        return weather_map.get(weather, weather)
    
    @staticmethod
    def _translate_time(time_of_day: str) -> str:
        """시간대 영문 → 한글"""
        time_map = {
            'dawn': '새벽',
            'morning': '아침',
            'afternoon': '오후',
            'evening': '저녁',
            'night': '밤',
            'midnight': '심야'
        }
        return time_map.get(time_of_day, time_of_day)


# ============================================================
# 서사 생성 엔진
# ============================================================

class NarrativeEngine:
    """Claude API 기반 서사 생성 엔진"""
    
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
        self.prompt_builder = NarrativePromptBuilder()
    
    async def generate_narrative(
        self,
        request: NarrativeRequest
    ) -> NarrativeResponse:
        """
        서사 생성 메인 함수
        
        Args:
            request: 서사 생성 요청 데이터
        
        Returns:
            생성된 서사 (제목, 본문, 통찰)
        """
        
        start_time = datetime.now()
        
        # 1. 프롬프트 생성
        system_prompt = self.prompt_builder.build_system_prompt(
            request.user_role,
            request.user_level
        )
        
        user_prompt = self.prompt_builder.build_user_prompt(request)
        
        # 2. Claude API 호출
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.8,  # 창의성 높임
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            # 3. 응답 파싱
            response_text = message.content[0].text
            
            # JSON 파싱 (마크다운 코드블록 제거)
            response_text = response_text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            narrative_data = json.loads(response_text.strip())
            
            # 4. 응답 생성
            generation_time = (datetime.now() - start_time).total_seconds() * 1000
            
            return NarrativeResponse(
                title=narrative_data['title'],
                body=narrative_data['body'],
                insight=narrative_data['insight'],
                role_type=request.user_role,
                generation_time_ms=int(generation_time),
                prompt_tokens=message.usage.input_tokens,
                completion_tokens=message.usage.output_tokens
            )
        
        except json.JSONDecodeError as e:
            # JSON 파싱 실패 시 폴백
            return NarrativeResponse(
                title="오늘의 발견",
                body=response_text[:150],
                insight="의미 있는 하루였습니다.",
                role_type=request.user_role,
                generation_time_ms=0,
                prompt_tokens=0,
                completion_tokens=0
            )
        
        except Exception as e:
            raise Exception(f"Narrative generation failed: {str(e)}")


# ============================================================
# 서사 생성 예제
# ============================================================

async def example_usage():
    """사용 예제"""
    
    # API 키 설정 (환경변수에서 로드)
    import os
    api_key = os.getenv('ANTHROPIC_API_KEY', 'your-api-key-here')
    
    engine = NarrativeEngine(api_key)
    
    # 탐험가 예제
    explorer_request = NarrativeRequest(
        user_role='explorer',
        user_level=8,
        korean_role_name='탐험가',
        place_name='낡은 골목 서점',
        place_category='이색장소',
        place_vibe_tags=['hidden', 'vintage', 'quiet'],
        action_log='45분 체류, 오래된 책 구경',
        weather='cloudy',
        time_of_day='afternoon',
        mood_input='호기심 넘치는'
    )
    
    explorer_narrative = await engine.generate_narrative(explorer_request)
    print(f"\n[탐험가 Lv.8 서사]")
    print(f"제목: {explorer_narrative.title}")
    print(f"본문: {explorer_narrative.body}")
    print(f"통찰: {explorer_narrative.insight}")
    
    # 치유자 예제
    healer_request = NarrativeRequest(
        user_role='healer',
        user_level=2,
        korean_role_name='치유자',
        place_name='올림픽 공원 벤치',
        place_category='공원',
        place_vibe_tags=['quiet', 'nature', 'peaceful'],
        action_log='30분 체류, 하늘 사진 촬영',
        weather='cloudy',
        time_of_day='afternoon',
        mood_input='조금 지침'
    )
    
    healer_narrative = await engine.generate_narrative(healer_request)
    print(f"\n[치유자 Lv.2 서사]")
    print(f"제목: {healer_narrative.title}")
    print(f"본문: {healer_narrative.body}")
    print(f"통찰: {healer_narrative.insight}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(example_usage())
