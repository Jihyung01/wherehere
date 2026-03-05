# -*- coding: utf-8 -*-
"""
AI 湲곕뒫 API ?쇱슦??
- 媛쒖씤???꾨줈??
- 留욎땄??誘몄뀡
- ?꾩튂 湲곕컲 媛?대뱶
- ?⑦꽩 遺꾩꽍
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
# 媛쒖씤???꾨줈??
# ============================================================

@router.post("/personality/analyze")
async def analyze_personality(
    request: PersonalityAnalysisRequest,
    db = Depends(get_db)
):
    """
    ?ъ슜???깃꺽 遺꾩꽍 (Big Five)
    """
    
    try:
        # Mock 紐⑤뱶: ?섑뵆 ?곗씠??諛섑솚
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
    ?μ냼 ?꾩갑 ??AI 媛?대뱶 ?쒓났
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
    吏꾪뻾 以묒씤 ?섏뒪??泥댄겕 諛??ㅼ쓬 ?쒖븞
    """
    
    try:
        guide_service = LocationGuideService(db)
        
        suggestion = await guide_service.check_progress_and_suggest(
            user_id=user_id,
            quest_id=quest_id
        )
        
        if not suggestion:
            return {"message": "?꾩쭅 30遺꾩씠 吏?섏? ?딆븯?댁슂"}
        
        return suggestion
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ?⑦꽩 遺꾩꽍
# ============================================================

@router.post("/pattern/analyze")
async def analyze_pattern(request: PatternAnalysisRequest):
    """
    ?ъ슜???⑦꽩 遺꾩꽍 (吏???쒓컖?붿슜) - ?ㅼ젣 ?곗씠??湲곕컲
    """
    try:
        from db.rest_helpers import RestDatabaseHelpers
        helpers = RestDatabaseHelpers()
        
        # ?ъ슜??諛⑸Ц 湲곕줉 媛?몄삤湲?(Supabase??由ъ뒪??吏곸젒 諛섑솚)
        raw_visits = await helpers.get_user_visits(request.user_id)
        visits = raw_visits if isinstance(raw_visits, list) else (raw_visits.get("visits") or [])
        
        # 諛⑸Ц蹂?移댄뀒怨좊━: places ?뚯씠釉붿뿉??議고쉶 (?놁쑝硫?湲고?)
        for v in visits:
            if v.get("category"):
                continue
            place = await helpers.get_place_by_id(v.get("place_id") or "")
            v["category"] = (place.get("primary_category") or "湲고?") if place else "湲고?"
        
        # ?곗씠?곌? 遺議깊븳 寃쎌슦
        if len(visits) < 3:
            return {
                "insufficient_data": True,
                "message": f"?꾩쭅 異⑸텇???곗씠?곌? ?놁뼱?? {len(visits)}/3媛?諛⑸Ц ?꾨즺!",
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
                    "main_region": "?쒖슱"
                },
                "analysis": {
                    "dominant_style": "珥덈낫 ?먰뿕媛",
                    "favorite_categories": [],
                    "preferred_time": "?ㅽ썑",
                    "avg_duration_minutes": 0,
                    "exploration_radius_km": 0
                },
                "ai_analysis": "?댁젣 留??먰뿕???쒖옉?덉뼱?? ??留롮? ?μ냼瑜?諛⑸Ц?섎㈃ ?뱀떊留뚯쓽 ?ㅽ??쇱쓣 遺꾩꽍?대뱶由닿쾶??"
            }
        
        # ?듦퀎 怨꾩궛
        total_visits = len(visits)
        unique_places = len(set(v['place_id'] for v in visits))
        total_xp = sum(v.get('xp_earned', 0) for v in visits)
        
        # 移댄뀒怨좊━ 遺꾪룷
        category_dist = {}
        for v in visits:
            cat = v.get('category', '湲고?')
            category_dist[cat] = category_dist.get(cat, 0) + 1
        
        favorite_categories = sorted(category_dist.items(), key=lambda x: x[1], reverse=True)[:3]
        favorite_categories = [cat for cat, _ in favorite_categories]
        
        # ?됯퇏 泥대쪟 ?쒓컙
        durations = [v.get('duration_minutes', 0) for v in visits if v.get('duration_minutes')]
        avg_duration = sum(durations) / len(durations) if durations else 60
        
        # ?됯퇏 鍮꾩슜
        amounts = [v.get('spent_amount', 0) for v in visits if v.get('spent_amount')]
        avg_budget = sum(amounts) / len(amounts) if amounts else 0
        max_budget = max(amounts) if amounts else 0
        
        # ?좏샇 ?쒓컙? 遺꾩꽍
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
        time_map = {'morning': 'morning', 'afternoon': 'afternoon', 'evening': 'evening', 'night': 'night'}
        preferred_time_kr = time_map.get(preferred_time, 'afternoon')
        
        # ?먰뿕 ?ㅽ???寃곗젙 (移댄뀒怨좊━媛 紐⑤몢 '湲고?'硫?援ъ껜???ㅽ???????쇰컲 臾멸뎄)
        effective_cats = [c for c in favorite_categories if c and c != "湲고?"]
        if avg_duration > 90:
            style = "?ъ쑀濡쒖슫 媛먯긽媛"
        elif len(effective_cats) > 0 and category_dist.get(effective_cats[0], 0) > total_visits * 0.5:
            style = "?꾨Ц ?먰뿕媛"
        elif total_visits > 10:
            style = "?댁젙?곸씤 紐⑦뿕媛"
        elif len(effective_cats) > 0:
            style = "?멸린??留롮? ?먰뿕媛"
        else:
            style = "珥덈낫 ?먰뿕媛"
        
        # AI 遺꾩꽍 臾멸뎄
        ai_analysis = f"?뱀떊? {style}?낅땲?? "
        if favorite_categories:
            ai_analysis += f"{', '.join(favorite_categories)} ?μ냼瑜??뱁엳 醫뗭븘?섏떆?ㅼ슂. "
        ai_analysis += f"{preferred_time_kr} ?쒓컙???二쇰줈 ?쒕룞?섏떆硫? "
        ai_analysis += f"?됯퇏 {int(avg_duration)}遺??뺣룄 癒몃Т瑜대뒗 ?몄씠?먯슂. "
        if total_xp > 500:
            ai_analysis += "踰뚯뜥 留롮? 寃쏀뿕???볦쑝?⑤꽕?? ?럦"
        
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
                "main_region": "?쒖슱"
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
        # ?먮윭 ?쒖뿉??湲곕낯 ?묐떟 諛섑솚
        return {
            "insufficient_data": True,
            "message": "?곗씠??遺꾩꽍 以?臾몄젣媛 諛쒖깮?덉뼱??",
            "stats": {
                "total_visits": 0,
                "unique_places": 0,
                "total_xp": 0
            },
            "analysis": {
                "dominant_style": "?먰뿕媛",
                "favorite_categories": [],
                "preferred_time": "?ㅽ썑",
                "avg_duration_minutes": 60,
                "exploration_radius_km": 5
            },
            "ai_analysis": "??留롮? ?μ냼瑜?諛⑸Ц?섎㈃ ?뱀떊留뚯쓽 ?ㅽ??쇱쓣 遺꾩꽍?대뱶由닿쾶??"
        }


# ============================================================
# 媛쒖씤??硫붿떆吏
# ============================================================

@router.post("/message/generate")
async def generate_personalized_message(
    user_id: str,
    context_type: str,
    context_data: dict,
    db = Depends(get_db)
):
    """
    媛쒖씤?붾맂 AI 硫붿떆吏 ?앹꽦
    
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


