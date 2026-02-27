# -*- coding: utf-8 -*-
"""
AI 기능 API 라우트
- 개인화 프로필
- 맞춤형 미션
- 위치 기반 가이드
- 패턴 분석
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from services.personalization import PersonalizationService
from services.mission_generator import MissionGenerator
from services.location_guide import LocationGuideService
from core.dependencies import get_db


router = APIRouter(prefix="/api/v1/ai", tags=["AI Features"])


# ============================================================
# Request/Response Models
# ============================================================

class PersonalityAnalysisRequest(BaseModel):
    user_id: str


class ArrivalRequest(BaseModel):
    user_id: str
    quest_id: str
    place_id: str


class PatternAnalysisRequest(BaseModel):
    user_id: str
    days: int = 90


# ============================================================
# 개인화 프로필
# ============================================================

@router.post("/personality/analyze")
async def analyze_personality(
    request: PersonalityAnalysisRequest,
    db = Depends(get_db)
):
    """
    사용자 성격 분석 (Big Five)
    """
    
    try:
        # Mock 모드: 샘플 데이터 반환
        if db is None:
            return {
                "success": True,
                "personality": {
                    "openness": 0.75,
                    "conscientiousness": 0.65,
                    "extraversion": 0.70,
                    "agreeableness": 0.80,
                    "neuroticism": 0.35
                },
                "companion_style": {
                    "tone": "friendly",
                    "emoji_usage": "medium",
                    "formality": "casual",
                    "encouragement_level": 0.7
                }
            }
        
        personalization = PersonalizationService()
        
        # 방문 기록 가져오기
        visits = await db.get_user_visits(request.user_id, days=90)
        
        # AI 분석
        personality = await personalization.analyze_user_personality(
            user_id=request.user_id,
            visits=visits,
            db=db
        )
        
        # AI 동행자 스타일 생성
        companion_style = await personalization.create_ai_companion_style(
            user_id=request.user_id,
            personality=personality,
            db=db
        )
        
        return {
            "success": True,
            "personality": personality,
            "companion_style": companion_style
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personality/{user_id}")
async def get_personality(user_id: str):
    """
    사용자 성격 프로필 조회 - 실제 데이터 기반
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()
        
        # 방문 기록 가져오기
        visits_data = helpers.get_user_visits(user_id)
        visits = visits_data.get('visits', [])
        
        total_visits = len(visits)
        
        # 방문 데이터 기반 성격 분석
        if total_visits == 0:
            # 신규 사용자
            personality = {
                "openness": 0.7,
                "conscientiousness": 0.6,
                "extraversion": 0.6,
                "agreeableness": 0.7,
                "neuroticism": 0.4
            }
            tone = "friendly"
            emoji = "medium"
        elif total_visits < 5:
            # 초기 사용자
            personality = {
                "openness": 0.75,
                "conscientiousness": 0.65,
                "extraversion": 0.65,
                "agreeableness": 0.75,
                "neuroticism": 0.35
            }
            tone = "friendly"
            emoji = "medium"
        else:
            # 활동적인 사용자 - 방문 패턴 분석
            categories = [v.get('category', '') for v in visits]
            unique_categories = len(set(categories))
            
            # openness: 다양한 카테고리 방문
            openness = min(0.5 + (unique_categories * 0.1), 0.95)
            
            # conscientiousness: 평균 체류 시간
            avg_duration = sum(v.get('duration_minutes', 0) for v in visits) / total_visits
            conscientiousness = min(0.4 + (avg_duration / 200), 0.9)
            
            # extraversion: 방문 빈도
            extraversion = min(0.5 + (total_visits * 0.03), 0.95)
            
            # agreeableness: 높은 평점
            ratings = [v.get('rating', 0) for v in visits if v.get('rating')]
            avg_rating = sum(ratings) / len(ratings) if ratings else 3.5
            agreeableness = min(0.4 + (avg_rating * 0.12), 0.9)
            
            # neuroticism: 역계산
            neuroticism = max(0.2, 1.0 - (openness + extraversion) / 2)
            
            personality = {
                "openness": round(openness, 2),
                "conscientiousness": round(conscientiousness, 2),
                "extraversion": round(extraversion, 2),
                "agreeableness": round(agreeableness, 2),
                "neuroticism": round(neuroticism, 2)
            }
            
            # 성격에 맞는 톤 결정
            if extraversion > 0.7:
                tone = "enthusiastic"
                emoji = "high"
            elif openness > 0.8:
                tone = "curious"
                emoji = "medium"
            else:
                tone = "friendly"
                emoji = "medium"
        
        # 선호 카테고리
        category_counts = {}
        for v in visits:
            cat = v.get('category', '기타')
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        preferred_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        preferred_categories = [cat for cat, _ in preferred_categories]
        
        # 평균 체류 시간
        durations = [v.get('duration_minutes', 0) for v in visits if v.get('duration_minutes')]
        avg_duration = sum(durations) / len(durations) if durations else 60
        
        # 사회성 비율 (companions 필드 기반)
        social_visits = sum(1 for v in visits if v.get('companions', 1) > 1)
        social_ratio = social_visits / total_visits if total_visits > 0 else 0.5
        
        return {
            "personality": personality,
            "companion_style": {
                "tone": tone,
                "emoji_usage": emoji,
                "formality": "casual",
                "encouragement_level": personality["agreeableness"]
            },
            "preferred_categories": preferred_categories,
            "behavior_stats": {
                "total_visits": total_visits,
                "avg_duration": int(avg_duration),
                "social_ratio": round(social_ratio, 2)
            }
        }
    
    except Exception as e:
        import traceback
        print(f"Error in personality profile: {str(e)}")
        print(traceback.format_exc())
        # 에러 시 기본 프로필 반환
        return {
            "personality": {
                "openness": 0.7,
                "conscientiousness": 0.6,
                "extraversion": 0.6,
                "agreeableness": 0.7,
                "neuroticism": 0.4
            },
            "companion_style": {
                "tone": "friendly",
                "emoji_usage": "medium",
                "formality": "casual",
                "encouragement_level": 0.7
            },
            "preferred_categories": [],
            "behavior_stats": {
                "total_visits": 0,
                "avg_duration": 60,
                "social_ratio": 0.5
            }
        }


# ============================================================
# 위치 기반 가이드
# ============================================================

@router.post("/arrival")
async def on_arrival(
    request: ArrivalRequest,
    db = Depends(get_db)
):
    """
    장소 도착 시 AI 가이드 제공
    """
    
    try:
        guide_service = LocationGuideService(db)
        
        result = await guide_service.on_arrival(
            user_id=request.user_id,
            quest_id=request.quest_id,
            place_id=request.place_id
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/progress/{quest_id}")
async def check_progress(
    quest_id: str,
    user_id: str,
    db = Depends(get_db)
):
    """
    진행 중인 퀘스트 체크 및 다음 제안
    """
    
    try:
        guide_service = LocationGuideService(db)
        
        suggestion = await guide_service.check_progress_and_suggest(
            user_id=user_id,
            quest_id=quest_id
        )
        
        if not suggestion:
            return {"message": "아직 30분이 지나지 않았어요"}
        
        return suggestion
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 패턴 분석
# ============================================================

@router.post("/pattern/analyze")
async def analyze_pattern(request: PatternAnalysisRequest):
    """
    사용자 패턴 분석 (지도 시각화용) - 실제 데이터 기반
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()
        
        # 사용자 방문 기록 가져오기 (Supabase는 리스트 직접 반환)
        raw_visits = await helpers.get_user_visits(request.user_id)
        visits = raw_visits if isinstance(raw_visits, list) else (raw_visits.get("visits") or [])
        
        # 방문별 카테고리: places 테이블에서 조회 (없으면 기타)
        for v in visits:
            if v.get("category"):
                continue
            place = await helpers.get_place_by_id(v.get("place_id") or "")
            v["category"] = (place.get("primary_category") or "기타") if place else "기타"
        
        # 데이터가 부족한 경우
        if len(visits) < 3:
            return {
                "insufficient_data": True,
                "message": f"아직 충분한 데이터가 없어요. {len(visits)}/3개 방문 완료!",
                "stats": {
                    "total_visits": len(visits),
                    "unique_places": len(visits),
                    "total_xp": sum(v.get('xp_earned', 0) for v in visits),
                    "category_distribution": {},
                    "time_preference": {},
                    "avg_duration": 0,
                    "avg_budget": 0,
                    "max_budget": 0,
                    "total_distance_km": 0,
                    "exploration_radius_km": 0,
                    "main_region": "서울"
                },
                "analysis": {
                    "dominant_style": "초보 탐험가",
                    "favorite_categories": [],
                    "preferred_time": "오후",
                    "avg_duration_minutes": 0,
                    "exploration_radius_km": 0
                },
                "ai_analysis": "이제 막 탐험을 시작했어요! 더 많은 장소를 방문하면 당신만의 스타일을 분석해드릴게요."
            }
        
        # 통계 계산
        total_visits = len(visits)
        unique_places = len(set(v['place_id'] for v in visits))
        total_xp = sum(v.get('xp_earned', 0) for v in visits)
        
        # 카테고리 분포
        category_dist = {}
        for v in visits:
            cat = v.get('category', '기타')
            category_dist[cat] = category_dist.get(cat, 0) + 1
        
        favorite_categories = sorted(category_dist.items(), key=lambda x: x[1], reverse=True)[:3]
        favorite_categories = [cat for cat, _ in favorite_categories]
        
        # 평균 체류 시간
        durations = [v.get('duration_minutes', 0) for v in visits if v.get('duration_minutes')]
        avg_duration = sum(durations) / len(durations) if durations else 60
        
        # 평균 비용
        amounts = [v.get('spent_amount', 0) for v in visits if v.get('spent_amount')]
        avg_budget = sum(amounts) / len(amounts) if amounts else 0
        max_budget = max(amounts) if amounts else 0
        
        # 선호 시간대 분석
        from datetime import datetime
        time_dist = {'morning': 0, 'afternoon': 0, 'evening': 0, 'night': 0}
        for v in visits:
            if v.get('visited_at'):
                hour = datetime.fromisoformat(v['visited_at'].replace('Z', '+00:00')).hour
                if 6 <= hour < 12:
                    time_dist['morning'] += 1
                elif 12 <= hour < 17:
                    time_dist['afternoon'] += 1
                elif 17 <= hour < 21:
                    time_dist['evening'] += 1
                else:
                    time_dist['night'] += 1
        
        preferred_time = max(time_dist, key=time_dist.get)
        time_map = {'morning': '아침', 'afternoon': '오후', 'evening': '저녁', 'night': '밤'}
        preferred_time_kr = time_map.get(preferred_time, '오후')
        
        # 탐험 스타일 결정 (카테고리가 모두 '기타'면 구체적 스타일 대신 일반 문구)
        effective_cats = [c for c in favorite_categories if c and c != "기타"]
        if avg_duration > 90:
            style = "여유로운 감상가"
        elif len(effective_cats) > 0 and category_dist.get(effective_cats[0], 0) > total_visits * 0.5:
            style = "전문 탐험가"
        elif total_visits > 10:
            style = "열정적인 모험가"
        elif len(effective_cats) > 0:
            style = "호기심 많은 탐험가"
        else:
            style = "초보 탐험가"
        
        # AI 분석 문구
        ai_analysis = f"당신은 {style}입니다! "
        if favorite_categories:
            ai_analysis += f"{', '.join(favorite_categories)} 장소를 특히 좋아하시네요. "
        ai_analysis += f"{preferred_time_kr} 시간대에 주로 활동하시며, "
        ai_analysis += f"평균 {int(avg_duration)}분 정도 머무르는 편이에요. "
        if total_xp > 500:
            ai_analysis += "벌써 많은 경험을 쌓으셨네요! 🎉"
        
        return {
            "insufficient_data": False,
            "stats": {
                "total_visits": total_visits,
                "unique_places": unique_places,
                "total_xp": total_xp,
                "category_distribution": category_dist,
                "time_preference": time_dist,
                "avg_duration": int(avg_duration),
                "avg_budget": int(avg_budget),
                "max_budget": int(max_budget),
                "total_distance_km": 0,
                "exploration_radius_km": 5,
                "main_region": "서울"
            },
            "analysis": {
                "dominant_style": style,
                "favorite_categories": favorite_categories,
                "preferred_time": preferred_time_kr,
                "avg_duration_minutes": int(avg_duration),
                "exploration_radius_km": 5
            },
            "ai_analysis": ai_analysis
        }
    
    except Exception as e:
        import traceback
        print(f"Error in pattern analysis: {str(e)}")
        print(traceback.format_exc())
        # 에러 시에도 기본 응답 반환
        return {
            "insufficient_data": True,
            "message": "데이터 분석 중 문제가 발생했어요.",
            "stats": {
                "total_visits": 0,
                "unique_places": 0,
                "total_xp": 0
            },
            "analysis": {
                "dominant_style": "탐험가",
                "favorite_categories": [],
                "preferred_time": "오후",
                "avg_duration_minutes": 60,
                "exploration_radius_km": 5
            },
            "ai_analysis": "더 많은 장소를 방문하면 당신만의 스타일을 분석해드릴게요!"
        }


# ============================================================
# 개인화 메시지
# ============================================================

@router.post("/message/generate")
async def generate_personalized_message(
    user_id: str,
    context_type: str,
    context_data: dict,
    db = Depends(get_db)
):
    """
    개인화된 AI 메시지 생성
    
    context_type: "arrival", "mission_complete", "recommendation"
    """
    
    try:
        personalization = PersonalizationService()
        
        message = await personalization.generate_personalized_message(
            user_id=user_id,
            context_type=context_type,
            context_data=context_data,
            db=db
        )
        
        return {"message": message}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
