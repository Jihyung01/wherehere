# -*- coding: utf-8 -*-
"""
AI 기능 API 라우터
- 개인화 추천
- 장소 추천
- 패턴 기반 분석
- 탐험 분석
"""


from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
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
    force: bool = False


class ArrivalRequest(BaseModel):
    user_id: str
    quest_id: str
    place_id: str


class PatternAnalysisRequest(BaseModel):
    user_id: str
    days: int = 90


class RecommendationIntentRequest(BaseModel):
    query: str
    latitude: Optional[float] = 37.5665
    longitude: Optional[float] = 126.978


def _safe_parse_dt(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return None


def _build_personality_from_visits(visits: List[Dict[str, Any]]) -> Tuple[Dict[str, float], Dict[str, Any]]:
    total_visits = len(visits)
    if total_visits == 0:
        base = {
            "openness": 0.7,
            "conscientiousness": 0.6,
            "extraversion": 0.6,
            "agreeableness": 0.7,
            "neuroticism": 0.4,
        }
        return base, {"signal_strength": "none", "review_count": 0}

    categories = [v.get("category", "") for v in visits if v.get("category")]
    unique_categories = len(set(categories))
    durations = [v.get("duration_minutes", 0) for v in visits if v.get("duration_minutes")]
    ratings = [v.get("rating", 0) for v in visits if v.get("rating")]
    social_visits = sum(1 for v in visits if (v.get("companions", 1) or 1) > 1)
    social_ratio = social_visits / total_visits

    # Lightweight natural-language signal from review text (no extra token calls)
    positive_words = ("good", "great", "best", "nice", "friendly", "clean", "cozy", "love", "recommend", "satisf")
    negative_words = ("bad", "worst", "noisy", "expensive", "unfriendly", "dirty", "disappoint", "wait", "slow", "poor")
    reviews = [str(v.get("review") or v.get("review_text") or "").strip() for v in visits]
    reviews = [r for r in reviews if r]
    pos_hits = sum(sum(1 for w in positive_words if w in r) for r in reviews)
    neg_hits = sum(sum(1 for w in negative_words if w in r) for r in reviews)
    sentiment = 0.0 if (pos_hits + neg_hits) == 0 else (pos_hits - neg_hits) / (pos_hits + neg_hits)

    avg_duration = (sum(durations) / len(durations)) if durations else 60
    avg_rating = (sum(ratings) / len(ratings)) if ratings else 3.5
    novelty = unique_categories / max(total_visits, 1)

    openness = min(0.4 + novelty * 0.45 + min(len(reviews), 20) * 0.005, 0.95)
    conscientiousness = min(0.35 + min(avg_duration / 180, 1.0) * 0.4 + min(total_visits / 40, 1.0) * 0.2, 0.95)
    extraversion = min(0.35 + social_ratio * 0.45 + min(total_visits / 50, 1.0) * 0.2, 0.95)
    agreeableness = min(0.35 + (avg_rating / 5.0) * 0.4 + max(sentiment, 0) * 0.2, 0.95)
    neuroticism = max(0.2, min(0.8, 0.55 - max(sentiment, 0) * 0.2 + max(-sentiment, 0) * 0.25))

    personality = {
        "openness": round(openness, 2),
        "conscientiousness": round(conscientiousness, 2),
        "extraversion": round(extraversion, 2),
        "agreeableness": round(agreeableness, 2),
        "neuroticism": round(neuroticism, 2),
    }
    signals = {
        "signal_strength": "high" if total_visits >= 15 else ("medium" if total_visits >= 5 else "low"),
        "review_count": len(reviews),
        "sentiment_score": round(sentiment, 3),
    }
    return personality, signals


def _companion_from_personality(personality: Dict[str, float]) -> Dict[str, Any]:
    ext = personality.get("extraversion", 0.6)
    opn = personality.get("openness", 0.6)
    agr = personality.get("agreeableness", 0.7)

    if ext > 0.72:
        tone = "enthusiastic"
        emoji = "high"
    elif opn > 0.78:
        tone = "curious"
        emoji = "medium"
    else:
        tone = "friendly"
        emoji = "medium"

    return {
        "tone": tone,
        "emoji_usage": emoji,
        "formality": "casual",
        "encouragement_level": round(float(agr), 2),
    }


def _should_run_llm(profile: Dict[str, Any], visits: List[Dict[str, Any]], min_new_visits: int = 3, min_days: int = 7) -> Tuple[bool, str]:
    if not visits or len(visits) < 3:
        return False, "insufficient_visits"

    analyzed_at = _safe_parse_dt(profile.get("analyzed_at")) if profile else None
    if analyzed_at is None:
        return True, "no_previous_analysis"

    now = datetime.now(timezone.utc)
    if analyzed_at.tzinfo is None:
        analyzed_at = analyzed_at.replace(tzinfo=timezone.utc)

    if now - analyzed_at < timedelta(days=min_days):
        return False, "recent_analysis"

    new_visit_count = 0
    for v in visits:
        vdt = _safe_parse_dt(v.get("visited_at"))
        if vdt is not None:
            if vdt.tzinfo is None:
                vdt = vdt.replace(tzinfo=timezone.utc)
            if vdt > analyzed_at:
                new_visit_count += 1

    if new_visit_count < min_new_visits:
        return False, "not_enough_new_visits"
    return True, "stale_with_new_data"


# ============================================================
# 개인화 추천
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
        
        visits = await db.get_user_visits(request.user_id, days=90)
        profile = await db.get_user_profile(request.user_id)
        should_run, reason = _should_run_llm(profile or {}, visits)

        if not request.force and not should_run:
            if profile:
                personality = {
                    "openness": float(profile.get("openness", 0.5)),
                    "conscientiousness": float(profile.get("conscientiousness", 0.5)),
                    "extraversion": float(profile.get("extraversion", 0.5)),
                    "agreeableness": float(profile.get("agreeableness", 0.5)),
                    "neuroticism": float(profile.get("neuroticism", 0.5)),
                }
                companion_style = {
                    "tone": profile.get("companion_tone", "friendly"),
                    "emoji_usage": profile.get("companion_emoji_usage", "medium"),
                    "formality": profile.get("companion_formality", "casual"),
                    "encouragement_level": float(profile.get("agreeableness", 0.7)),
                }
                source = "stored_llm"
            else:
                personality, _signals = _build_personality_from_visits(visits)
                companion_style = _companion_from_personality(personality)
                source = "heuristic"

            return {
                "success": True,
                "personality": personality,
                "companion_style": companion_style,
                "analysis_skipped": True,
                "skip_reason": reason,
                "source": source,
            }

        personalization = PersonalizationService()
        personality = await personalization.analyze_user_personality(
            user_id=request.user_id,
            visits=visits,
            db=db
        )
        companion_style = await personalization.create_ai_companion_style(
            user_id=request.user_id,
            personality=personality,
            db=db
        )
        # DB에 성격·동행자 스타일 저장 (update_user_personality는 user_id, personality, companion_style 3인자 필요)
        if hasattr(db, "update_user_personality"):
            await db.update_user_personality(request.user_id, personality, companion_style)
        return {
            "success": True,
            "personality": personality,
            "companion_style": companion_style,
            "analysis_skipped": False,
            "trigger_reason": "force" if request.force else reason,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/personality/{user_id}")
async def get_personality(user_id: str):
    """
    사용자 성격 프로필 조회.
    - 저장된 분석 결과 우선 사용
    - 없으면 방문/리뷰 데이터 기반 휴리스틱 분석
    - LLM 재분석 필요 여부 플래그를 함께 반환 (자동 재호출 방지)
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()

        visits = await helpers.get_user_visits(user_id)
        profile = await helpers.get_user_profile(user_id)

        total_visits = len(visits)
        durations = [v.get("duration_minutes", 0) for v in visits if v.get("duration_minutes")]
        avg_duration = int(sum(durations) / len(durations)) if durations else 60
        social_visits = sum(1 for v in visits if (v.get("companions", 1) or 1) > 1)
        social_ratio = round(social_visits / total_visits, 2) if total_visits > 0 else 0.5

        category_counts: Dict[str, int] = {}
        for v in visits:
            cat = v.get("category", "기타") or "기타"
            category_counts[cat] = category_counts.get(cat, 0) + 1
        preferred_categories = [k for k, _ in sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:3]]

        has_stored = bool(profile and all(profile.get(k) is not None for k in [
            "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"
        ]))

        if has_stored:
            personality = {
                "openness": round(float(profile.get("openness", 0.5)), 2),
                "conscientiousness": round(float(profile.get("conscientiousness", 0.5)), 2),
                "extraversion": round(float(profile.get("extraversion", 0.5)), 2),
                "agreeableness": round(float(profile.get("agreeableness", 0.5)), 2),
                "neuroticism": round(float(profile.get("neuroticism", 0.5)), 2),
            }
            companion_style = {
                "tone": profile.get("companion_tone", "friendly"),
                "emoji_usage": profile.get("companion_emoji_usage", "medium"),
                "formality": profile.get("companion_formality", "casual"),
                "encouragement_level": round(float(profile.get("agreeableness", 0.7)), 2),
            }
            signals = {"signal_strength": "stored", "review_count": 0, "sentiment_score": 0.0}
        else:
            personality, signals = _build_personality_from_visits(visits)
            companion_style = _companion_from_personality(personality)

        should_reanalyze, reanalyze_reason = _should_run_llm(profile or {}, visits)

        return {
            "personality": personality,
            "companion_style": companion_style,
            "preferred_categories": preferred_categories,
            "behavior_stats": {
                "total_visits": total_visits,
                "avg_duration": avg_duration,
                "social_ratio": social_ratio,
            },
            "analysis_meta": {
                "source": "stored_llm" if has_stored else "heuristic",
                "signals": signals,
                "should_reanalyze": should_reanalyze,
                "reanalyze_reason": reanalyze_reason,
                "analyzed_at": profile.get("analyzed_at") if profile else None,
            },
        }

    except Exception as e:
        import traceback
        print(f"Error in personality profile: {str(e)}")
        print(traceback.format_exc())
        return {
            "personality": {
                "openness": 0.7,
                "conscientiousness": 0.6,
                "extraversion": 0.6,
                "agreeableness": 0.7,
                "neuroticism": 0.4,
            },
            "companion_style": {
                "tone": "friendly",
                "emoji_usage": "medium",
                "formality": "casual",
                "encouragement_level": 0.7,
            },
            "preferred_categories": [],
            "behavior_stats": {
                "total_visits": 0,
                "avg_duration": 60,
                "social_ratio": 0.5,
            },
            "analysis_meta": {
                "source": "fallback",
                "signals": {"signal_strength": "none", "review_count": 0, "sentiment_score": 0.0},
                "should_reanalyze": False,
                "reanalyze_reason": "error",
                "analyzed_at": None,
            },
        }
@router.post("/arrival")
async def on_arrival(
    request: ArrivalRequest,
    db = Depends(get_db)
):
    """
        장소 도착 시 AI 인사이트 제공
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
    진행 상황 체크 및 다음 제안
    """
    
    try:
        guide_service = LocationGuideService(db)
        
        suggestion = await guide_service.check_progress_and_suggest(
            user_id=user_id,
            quest_id=quest_id
        )
        
        if not suggestion:
            return {"message": "최소 30일이 지난 후 다시 시도해주세요"}
        
        return suggestion
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 탐험 분석
# ============================================================

@router.post("/pattern/analyze")
async def analyze_pattern(request: PatternAnalysisRequest):
    """
        사용자 탐험 분석 (최근 기간 활용) - 실제 데이터 기반
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()
        
                # 사용자 방문 기록 가져오기 (Supabase 등 DB에서 직접 반환)
        raw_visits = await helpers.get_user_visits(request.user_id)
        visits = raw_visits if isinstance(raw_visits, list) else (raw_visits.get("visits") or [])
        
                # 방문별 카테고리: places 테이블에서 조회 (없으면 기타)
        for v in visits:
            if v.get("category"):
                continue
            place = await helpers.get_place_by_id(v.get("place_id") or "")
            v["category"] = (place.get("primary_category") or "기타") if place else "기타"
        
                # 데이터량 부족한 경우
        if len(visits) < 3:
            return {
                "insufficient_data": True,
                "message": f"충분한 분석 데이터가 없어요. {len(visits)}/3회 이상 방문해주세요!",
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
                    "dominant_style": "탐험가",
                    "favorite_categories": [],
                    "preferred_time": "오후",
                    "avg_duration_minutes": 0,
                    "exploration_radius_km": 0
                },
                "ai_analysis": "조금 더 탐험을 시작해보세요. 새 장소를 방문하면 탐험의 인사이트를 분석해드릴게요."
            }
        
        # 집계 계산
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
        
        # 평균 소비
        amounts = [v.get('spent_amount', 0) for v in visits if v.get('spent_amount')]
        avg_budget = sum(amounts) / len(amounts) if amounts else 0
        max_budget = max(amounts) if amounts else 0
        
                # 시간대별 분석
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
        time_map = {'morning': '오전', 'afternoon': '오후', 'evening': '저녁', 'night': '밤'}
        preferred_time_kr = time_map.get(preferred_time, '오후')
        
                # 탐험 스타일 판정 (카테고리가 모두 기타면 기본 스타일 문장)
        effective_cats = [c for c in favorite_categories if c and c != "기타"]
        if avg_duration > 90:
            style = "천천히 즐기는 여유가"
        elif len(effective_cats) > 0 and category_dist.get(effective_cats[0], 0) > total_visits * 0.5:
            style = "집중 탐험가"
        elif total_visits > 10:
            style = "조용한 동네 탐험가"
        elif len(effective_cats) > 0:
            style = "다양한 장소 탐험가"
        else:
            style = "초보 탐험가"
        
        # AI 분석 문장
        ai_analysis = f"탐험은 {style}이에요. "
        if favorite_categories:
            ai_analysis += f"{', '.join(favorite_categories)} 장소를 자주 찾아오셨네요. "
        ai_analysis += f"{preferred_time_kr} 시간대에 몰려있어요. "
        ai_analysis += f"평균 {int(avg_duration)}분 정도 머무는 편이에요. "
        if total_xp > 500:
            ai_analysis += "트렌드 장소의 감각을 놓치지 마세요."
        
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
        # 에러 시 기본 응답 반환
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
            "ai_analysis": "새 장소를 방문하면 탐험의 인사이트를 분석해드릴게요."
        }


# ============================================================
# 패턴 분석 고도화 (Claude 스타일 + 추천 3곳)
# ============================================================

@router.post("/pattern/analyze-rich")
async def analyze_pattern_rich(request: PatternAnalysisRequest):
    """
    방문 5회 이상일 때 Claude로 탐험 스타일명·특징·추천 3곳 생성.
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        from core.config import settings
        helpers = RestDatabaseHelpers()
        raw_visits = await helpers.get_user_visits(request.user_id)
        visits = raw_visits if isinstance(raw_visits, list) else (raw_visits.get("visits") or [])
        for v in visits:
            place = await helpers.get_place_by_id(v.get("place_id") or "")
            if place:
                v["category"] = v.get("category") or place.get("primary_category") or "기타"
                v["latitude"] = place.get("latitude") or v.get("latitude")
                v["longitude"] = place.get("longitude") or v.get("longitude")
                v["place_name"] = place.get("name") or v.get("place_name", "")
            v.setdefault("category", v.get("category") or "기타")
            v.setdefault("completed_at", v.get("visited_at"))
        if len(visits) < 5:
            return {
                "insufficient_data": True,
                "message": "5곳 이상 방문하면 AI가 스타일과 추천을 만들어 드려요.",
            }
        if not getattr(settings, "ANTHROPIC_API_KEY", None):
            return {"insufficient_data": True, "message": "AI 분석 서비스가 준비 중이에요."}
        personalization = PersonalizationService()
        result = await personalization.analyze_user_pattern(
            request.user_id, days=request.days, db=helpers
        )
        if result.get("insufficient_data"):
            return result
        analysis = result.get("ai_analysis") or {}
        if isinstance(analysis, str):
            analysis = {}
        return {
            "insufficient_data": False,
            "style_name": analysis.get("style_name", "탐험가"),
            "style_emoji": analysis.get("style_emoji", "🗺️"),
            "style_description": analysis.get("style_description", ""),
            "characteristics": analysis.get("characteristics", []),
            "recommendations": analysis.get("recommendations", []),
            "journey_map_data": result.get("journey_map_data"),
        }
    except Exception as e:
        import traceback
        print(f"Error in pattern/analyze-rich: {str(e)}")
        print(traceback.format_exc())
        return {"insufficient_data": True, "message": "AI 분석 중 문제가 발생했어요.", "error": str(e)}


# ============================================================
# 스트릭 알림
# ============================================================

@router.get("/notifications/streak-reminder")
async def get_streak_reminder(user_id: str):
    """
    스트릭 유지 알림 메시지. 오늘 퀘스트를 안 하면 N일 스트릭이 끊긴다는 문구 반환.
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()
        stats = await helpers.get_user_stats_full(user_id)
        current = int(stats.get("current_streak") or 0)
        if current <= 0:
            return {"message": None, "current_streak": 0}
        return {
            "message": f"오늘 퀘스트 안 하면 🔥 {current}일 스트릭이 끊겨요!",
            "current_streak": current,
        }
    except Exception as e:
        return {"message": None, "current_streak": 0}


# ============================================================
# 자연어 추천 의도 파싱
# ============================================================

@router.post("/recommendation/intent")
async def parse_recommendation_intent(request: RecommendationIntentRequest):
    """
    자연어 질의(예: "조용한 카페 추천해줘")를 role_type, mood 등 추천 API 파라미터로 변환.
    """
    try:
        from core.config import settings
        from anthropic import Anthropic
        if not getattr(settings, "ANTHROPIC_API_KEY", None):
            return {
                "role_type": "explorer",
                "mood": "curious",
                "radius_meters": 2000,
                "parsed": False,
            }
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = f"""다음 사용자 말을 WhereHere 추천 API 파라미터로 변환해줘.
사용자 말: "{request.query}"

역할(role_type): explorer, healer, archivist, relation, achiever 중 하나만.
기분(mood): curious, tired, energetic, social, calm, romantic 중 하나만.

JSON만 출력 (다른 설명 없이):
{{"role_type": "...", "mood": "...", "radius_meters": 2000}}
"""
        response = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=128,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        if "{" in text:
            text = text[text.index("{"): text.rindex("}") + 1]
        import json
        data = json.loads(text)
        return {
            "role_type": data.get("role_type", "explorer"),
            "mood": data.get("mood", "curious"),
            "radius_meters": int(data.get("radius_meters", 2000)),
            "parsed": True,
        }
    except Exception as e:
        return {
            "role_type": "explorer",
            "mood": "curious",
            "radius_meters": 2000,
            "parsed": False,
            "error": str(e),
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


