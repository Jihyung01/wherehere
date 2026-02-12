"""
WH Core Logic - Recommendation Engine
FastAPI + PostgreSQL/PostGIS 기반 장소 추천 시스템
"""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import math
import random

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
import asyncpg
from asyncpg.pool import Pool
import numpy as np

from role_definitions import RoleType, get_role_config, calculate_radius_by_level


# ============================================================
# Pydantic 모델 (API 스키마)
# ============================================================

class LocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class MoodInput(BaseModel):
    mood_text: str = Field(..., max_length=100)
    intensity: float = Field(default=0.5, ge=0.0, le=1.0)


class RecommendationRequest(BaseModel):
    user_id: str
    role_type: RoleType
    user_level: int = Field(..., ge=1, le=50)
    current_location: LocationInput
    mood: Optional[MoodInput] = None
    weather: Optional[str] = None  # 'sunny', 'cloudy', 'rainy', 'snowy', 'windy'
    time_of_day: Optional[str] = None  # 'dawn', 'morning', 'afternoon', 'evening', 'night'


class PlaceRecommendation(BaseModel):
    place_id: str
    name: str
    address: str
    category: str
    distance_meters: float
    score: float
    score_breakdown: Dict[str, float]
    reason: str
    estimated_cost: Optional[int]
    vibe_tags: List[str]


class RecommendationResponse(BaseModel):
    recommendations: List[PlaceRecommendation]
    role_type: str
    radius_used: int
    total_candidates: int
    generated_at: datetime


# ============================================================
# 데이터베이스 연결
# ============================================================

class Database:
    pool: Optional[Pool] = None
    
    @classmethod
    async def connect(cls):
        """데이터베이스 연결 풀 생성"""
        cls.pool = await asyncpg.create_pool(
            host='localhost',
            port=5432,
            database='wh_core',
            user='wh_user',
            password='wh_password',
            min_size=10,
            max_size=50
        )
    
    @classmethod
    async def disconnect(cls):
        """연결 풀 종료"""
        if cls.pool:
            await cls.pool.close()
    
    @classmethod
    def get_pool(cls) -> Pool:
        """연결 풀 반환"""
        if not cls.pool:
            raise RuntimeError("Database pool not initialized")
        return cls.pool


# ============================================================
# 추천 엔진 코어 클래스
# ============================================================

@dataclass
class ScoringWeights:
    """스코어링 가중치"""
    category_fit: float = 0.4
    distance_decay: float = 0.25
    vibe_match: float = 0.2
    cost_fit: float = 0.1
    randomness: float = 0.05


class RecommendationEngine:
    """
    벤치마킹: YouTube RecSys (Candidate Generation → Ranking)
    
    1단계: Geo-Fencing으로 후보군 생성
    2단계: 다차원 스코어링으로 순위 매기기
    3단계: Top-K 선정
    """
    
    def __init__(self, db_pool: Pool):
        self.db = db_pool
        self.weights = ScoringWeights()
    
    async def get_recommendations(
        self,
        request: RecommendationRequest,
        top_k: int = 3
    ) -> RecommendationResponse:
        """
        메인 추천 함수
        
        Args:
            request: 추천 요청 데이터
            top_k: 반환할 추천 개수
        
        Returns:
            추천 결과 리스트
        """
        
        # 1단계: 검색 반경 계산
        radius = calculate_radius_by_level(request.role_type, request.user_level)
        
        # 2단계: 후보군 생성 (Geo-Fencing)
        candidates = await self._generate_candidates(
            request.current_location,
            radius,
            request.role_type
        )
        
        if not candidates:
            raise HTTPException(
                status_code=404,
                detail=f"No places found within {radius}m radius"
            )
        
        # 3단계: 스코어링 및 랭킹
        scored_places = await self._score_and_rank(
            candidates=candidates,
            role_type=request.role_type,
            user_level=request.user_level,
            user_location=request.current_location,
            mood=request.mood,
            weather=request.weather,
            time_of_day=request.time_of_day
        )
        
        # 4단계: Top-K 선정
        top_recommendations = scored_places[:top_k]
        
        # 5단계: 응답 생성
        recommendations = [
            PlaceRecommendation(
                place_id=str(place['place_id']),
                name=place['name'],
                address=place['address'],
                category=place['primary_category'],
                distance_meters=place['distance_meters'],
                score=place['final_score'],
                score_breakdown=place['score_breakdown'],
                reason=place['reason'],
                estimated_cost=place.get('average_price'),
                vibe_tags=place.get('vibe_tags', [])
            )
            for place in top_recommendations
        ]
        
        return RecommendationResponse(
            recommendations=recommendations,
            role_type=request.role_type.value,
            radius_used=radius,
            total_candidates=len(candidates),
            generated_at=datetime.now()
        )
    
    async def _generate_candidates(
        self,
        location: LocationInput,
        radius: int,
        role_type: RoleType
    ) -> List[Dict]:
        """
        1단계: 후보군 생성 (Candidate Generation)
        PostGIS 공간 쿼리 사용
        """
        
        query = """
            SELECT 
                p.place_id,
                p.name,
                p.address,
                p.primary_category,
                p.secondary_categories,
                p.price_tier,
                p.average_price,
                p.vibe_tags,
                p.average_rating,
                p.is_hidden_gem,
                p.typical_crowd_level,
                ST_Distance(
                    p.location,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
                ) AS distance_meters
            FROM places p
            WHERE 
                ST_DWithin(
                    p.location,
                    ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
                    $3
                )
                AND p.is_active = TRUE
            ORDER BY distance_meters ASC
            LIMIT 100;
        """
        
        async with self.db.acquire() as conn:
            rows = await conn.fetch(
                query,
                location.longitude,
                location.latitude,
                radius
            )
        
        return [dict(row) for row in rows]
    
    async def _score_and_rank(
        self,
        candidates: List[Dict],
        role_type: RoleType,
        user_level: int,
        user_location: LocationInput,
        mood: Optional[MoodInput],
        weather: Optional[str],
        time_of_day: Optional[str]
    ) -> List[Dict]:
        """
        2단계: 스코어링 및 랭킹
        
        Score = (W_c × C) + (W_d × D) + (W_v × V) + (W_cost × Cost) + Randomness
        
        - W_c (Category Fit): 카테고리 일치도
        - W_d (Distance Decay): 거리 감점
        - W_v (Vibe Match): 분위기 매칭
        - W_cost (Cost Fit): 비용 적합도
        - Randomness: 탐색 변수
        """
        
        role_config = get_role_config(role_type)
        scored_places = []
        
        for place in candidates:
            # === 1. 카테고리 적합도 (Category Fit) ===
            category_score = self._calculate_category_score(
                place, role_config
            )
            
            # === 2. 거리 감점 (Distance Decay) ===
            distance_score = self._calculate_distance_score(
                place['distance_meters'], role_config
            )
            
            # === 3. 분위기 매칭 (Vibe Match) ===
            vibe_score = self._calculate_vibe_score(
                place, mood, role_config
            )
            
            # === 4. 비용 적합도 (Cost Fit) ===
            cost_score = self._calculate_cost_score(
                place, role_config
            )
            
            # === 5. 날씨/시간 보정 ===
            weather_bonus = self._calculate_weather_bonus(
                weather, role_config
            )
            
            time_bonus = self._calculate_time_bonus(
                time_of_day, role_config
            )
            
            # === 6. 레벨별 보너스 ===
            level_bonus = self._calculate_level_bonus(
                place, user_level, role_config
            )
            
            # === 7. 랜덤 탐색 (Exploration) ===
            random_bonus = random.uniform(0, 10) * self.weights.randomness
            
            # === 최종 점수 계산 ===
            final_score = (
                category_score * self.weights.category_fit * 100 +
                distance_score * self.weights.distance_decay * 100 +
                vibe_score * self.weights.vibe_match * 100 +
                cost_score * self.weights.cost_fit * 100 +
                weather_bonus +
                time_bonus +
                level_bonus +
                random_bonus
            )
            
            # 점수 분해 (디버깅/설명용)
            score_breakdown = {
                'category': round(category_score * 100, 2),
                'distance': round(distance_score * 100, 2),
                'vibe': round(vibe_score * 100, 2),
                'cost': round(cost_score * 100, 2),
                'weather_bonus': round(weather_bonus, 2),
                'time_bonus': round(time_bonus, 2),
                'level_bonus': round(level_bonus, 2),
                'random': round(random_bonus, 2)
            }
            
            # 추천 이유 생성
            reason = self._generate_reason(
                place, role_config, score_breakdown
            )
            
            place['final_score'] = final_score
            place['score_breakdown'] = score_breakdown
            place['reason'] = reason
            
            scored_places.append(place)
        
        # 점수순 정렬
        scored_places.sort(key=lambda x: x['final_score'], reverse=True)
        
        return scored_places
    
    def _calculate_category_score(
        self,
        place: Dict,
        role_config
    ) -> float:
        """카테고리 일치도 계산"""
        
        primary_cat = place['primary_category']
        weights = role_config.category_weights
        
        # 기본 점수 (primary category)
        score = weights.get(primary_cat, 0.3)  # 없으면 0.3 기본값
        
        # 세컨더리 카테고리 보너스
        if place.get('secondary_categories'):
            for sec_cat in place['secondary_categories']:
                if sec_cat in weights:
                    score += weights[sec_cat] * 0.2
        
        return min(score, 1.0)
    
    def _calculate_distance_score(
        self,
        distance_meters: float,
        role_config
    ) -> float:
        """
        거리 감점 (Distance Decay)
        
        가까울수록 높은 점수 (지수 감쇠)
        단, Achiever는 거리에 덜 민감
        """
        
        if role_config.id == 'achiever':
            # Achiever는 거리 페널티 최소화
            decay_factor = 0.0001
        else:
            decay_factor = 0.0003
        
        # 지수 감쇠 공식
        score = math.exp(-decay_factor * distance_meters)
        
        return score
    
    def _calculate_vibe_score(
        self,
        place: Dict,
        mood: Optional[MoodInput],
        role_config
    ) -> float:
        """
        분위기 매칭 점수
        
        실제로는 Sentence-BERT 벡터 코사인 유사도 사용
        여기서는 단순 태그 매칭으로 시뮬레이션
        """
        
        if not mood or not place.get('vibe_tags'):
            return 0.5  # 중립
        
        # 간단한 키워드 매칭 (실제로는 벡터 유사도)
        mood_keywords = {
            '지침': ['quiet', 'cozy', 'calm'],
            '활기찬': ['energetic', 'vibrant', 'lively'],
            '우울한': ['cozy', 'warm', 'intimate'],
            '외로운': ['social', 'friendly', 'warm'],
            '흥분된': ['exciting', 'energetic', 'vibrant']
        }
        
        relevant_tags = mood_keywords.get(mood.mood_text, [])
        place_tags = place['vibe_tags'] or []
        
        # 교집합 비율
        matches = len(set(relevant_tags) & set(place_tags))
        total = max(len(relevant_tags), 1)
        
        return matches / total
    
    def _calculate_cost_score(
        self,
        place: Dict,
        role_config
    ) -> float:
        """
        비용 적합도 점수
        
        cost_sensitivity가 높을수록 저렴한 곳에 높은 점수
        """
        
        avg_price = place.get('average_price', 0)
        
        if avg_price == 0:  # 무료
            return 1.0
        
        sensitivity = role_config.cost_sensitivity
        threshold = role_config.cost_threshold
        
        if avg_price > threshold:
            # 임계값 초과 시 페널티
            penalty = (avg_price - threshold) / threshold
            score = max(0, 1.0 - penalty * sensitivity)
        else:
            # 임계값 이하면 풀점수
            score = 1.0
        
        return score
    
    def _calculate_weather_bonus(
        self,
        weather: Optional[str],
        role_config
    ) -> float:
        """날씨별 보너스 점수"""
        
        if not weather:
            return 0.0
        
        weather_weight = role_config.weather_weights.get(weather, 0.7)
        return (weather_weight - 0.7) * 10  # -3 ~ +3 범위
    
    def _calculate_time_bonus(
        self,
        time_of_day: Optional[str],
        role_config
    ) -> float:
        """시간대별 보너스 점수"""
        
        if not time_of_day:
            return 0.0
        
        time_weight = role_config.time_of_day_weights.get(time_of_day, 0.7)
        return (time_weight - 0.7) * 10  # -3 ~ +3 범위
    
    def _calculate_level_bonus(
        self,
        place: Dict,
        user_level: int,
        role_config
    ) -> float:
        """
        레벨별 보너스
        
        - 고레벨 유저는 히든 스팟 발견 시 보너스
        - 탐색 범위 확장에 따른 보상
        """
        
        bonus = 0.0
        
        # 히든 스팟 보너스 (레벨 6 이상)
        if user_level >= 6 and place.get('is_hidden_gem'):
            bonus += 15
        
        # 탐험가는 히든 스팟에 더 큰 보너스
        if role_config.id == 'explorer' and place.get('is_hidden_gem'):
            bonus += 10
        
        return bonus
    
    def _generate_reason(
        self,
        place: Dict,
        role_config,
        score_breakdown: Dict
    ) -> str:
        """
        추천 이유 생성
        
        가장 높은 점수 요인을 기반으로 자연어 설명 생성
        """
        
        top_factor = max(score_breakdown.items(), key=lambda x: x[1])
        factor_name, factor_score = top_factor
        
        reasons_template = {
            'category': f"{role_config.korean_name}에게 딱 맞는 {place['primary_category']} 카테고리입니다",
            'distance': f"가까운 거리({int(place['distance_meters'])}m)에 있어 편리합니다",
            'vibe': "지금 기분에 잘 어울리는 분위기입니다",
            'cost': f"{role_config.korean_name}의 예산에 적합한 가격대입니다",
            'level_bonus': "당신의 레벨에서만 발견할 수 있는 히든 스팟입니다",
        }
        
        return reasons_template.get(factor_name, "추천 장소입니다")


# ============================================================
# FastAPI 애플리케이션
# ============================================================

app = FastAPI(
    title="WH Core Logic API",
    description="초개인화 장소 추천 시스템",
    version="1.0.0"
)


@app.on_event("startup")
async def startup():
    """앱 시작 시 DB 연결"""
    await Database.connect()


@app.on_event("shutdown")
async def shutdown():
    """앱 종료 시 DB 연결 해제"""
    await Database.disconnect()


@app.post("/api/v1/recommendations", response_model=RecommendationResponse)
async def create_recommendation(
    request: RecommendationRequest
) -> RecommendationResponse:
    """
    장소 추천 API
    
    - **user_id**: 사용자 ID
    - **role_type**: 역할 타입 (explorer, healer, archivist, relation, achiever)
    - **user_level**: 사용자 레벨 (1~50)
    - **current_location**: 현재 위치 (위경도)
    - **mood**: 현재 기분 (선택)
    - **weather**: 현재 날씨 (선택)
    - **time_of_day**: 시간대 (선택)
    """
    
    engine = RecommendationEngine(Database.get_pool())
    
    try:
        result = await engine.get_recommendations(request, top_k=3)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy", "timestamp": datetime.now()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
