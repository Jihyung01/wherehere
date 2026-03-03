# -*- coding: utf-8 -*-
"""
소셜 기능 API 라우트
- 모임 생성/참여
- 소셜 공유
- 매칭 시스템
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel

from services.social_matching import SocialMatchingService
from services.social_share import SocialShareService
from core.dependencies import get_db
from services.push_service import send_push_for_user


router = APIRouter(prefix="/api/v1/social", tags=["Social"])


# ============================================================
# Request Models
# ============================================================

class CreateGatheringRequest(BaseModel):
    creator_id: str
    place_id: str
    scheduled_time: datetime
    title: Optional[str] = None
    description: Optional[str] = None
    max_participants: int = 4


class JoinGatheringRequest(BaseModel):
    gathering_id: str
    user_id: str


class CreateShareRequest(BaseModel):
    user_id: str
    quest_id: str
    place_id: str
    quest_data: dict


# ============================================================
# 모임 (Gathering)
# ============================================================

@router.post("/gatherings/create")
async def create_gathering(
    request: CreateGatheringRequest,
    db = Depends(get_db)
):
    """모임 생성"""
    try:
        matching = SocialMatchingService(db)
        
        gathering = await matching.create_gathering(
            creator_id=request.creator_id,
            place_id=request.place_id,
            scheduled_time=request.scheduled_time,
            title=request.title,
            description=request.description,
            max_participants=request.max_participants
        )
        
        return gathering
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/gatherings/join")
async def join_gathering(
    request: JoinGatheringRequest,
    db = Depends(get_db)
):
    """모임 참여"""
    try:
        matching = SocialMatchingService(db)
        
        result = await matching.join_gathering(
            gathering_id=request.gathering_id,
            user_id=request.user_id
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gatherings/{gathering_id}")
async def get_gathering_details(
    gathering_id: str,
    user_id: str,
    db = Depends(get_db)
):
    """모임 상세 정보"""
    try:
        matching = SocialMatchingService(db)
        
        details = await matching.get_gathering_details(
            gathering_id=gathering_id,
            user_id=user_id
        )
        
        return details
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gatherings/recommended/{user_id}")
async def get_recommended_gatherings(
    user_id: str,
    limit: int = 10,
    db = Depends(get_db)
):
    """추천 모임 목록"""
    try:
        matching = SocialMatchingService(db)
        
        gatherings = await matching.get_recommended_gatherings(
            user_id=user_id,
            limit=limit
        )
        
        return {"gatherings": gatherings}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 매칭
# ============================================================

@router.post("/matches/find")
async def find_matches(
    user_id: str,
    place_id: str,
    scheduled_time: datetime,
    max_distance_km: float = 5.0,
    db = Depends(get_db)
):
    """비슷한 취향의 사용자 매칭"""
    try:
        matching = SocialMatchingService(db)
        
        matches = await matching.find_matches(
            user_id=user_id,
            place_id=place_id,
            scheduled_time=scheduled_time,
            max_distance_km=max_distance_km
        )
        
        return {"matches": matches}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 소셜 공유
# ============================================================

@router.post("/share/create")
async def create_share_link(
    request: CreateShareRequest,
    db = Depends(get_db)
):
    """공유 링크 생성"""
    try:
        share_service = SocialShareService(db)
        
        share = await share_service.create_share_link(
            user_id=request.user_id,
            quest_id=request.quest_id,
            place_id=request.place_id,
            quest_data=request.quest_data
        )
        
        return share
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/share/{share_id}")
async def get_share_data(
    share_id: str,
    db = Depends(get_db)
):
    """공유 데이터 조회"""
    try:
        share_service = SocialShareService(db)
        
        share = await share_service.get_share_data(share_id)
        
        if not share:
            raise HTTPException(status_code=404, detail="공유 링크를 찾을 수 없거나 만료되었어요")
        
        return share
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 피드 & 팔로우 (당근/오픈채팅 느낌)
# ============================================================

@router.get("/feed")
async def get_feed(user_id: str, limit: int = 50, db=Depends(get_db)):
    """팔로우한 사람 + 내 활동 피드"""
    if db is None:
        return {"activities": [], "following_ids": []}
    following_ids = await db.get_following_ids(user_id)
    user_ids = list(set([user_id] + following_ids))
    activities = await db.get_feed_activities(user_ids, limit=limit)
    return {"activities": activities, "following_ids": following_ids}


@router.post("/follow")
async def follow(follower_id: str, following_id: str, db=Depends(get_db)):
    """팔로우하기"""
    if db is None:
        return {"success": False, "message": "DB not connected"}
    ok = await db.follow_user(follower_id, following_id)
    return {"success": ok}


@router.delete("/follow")
async def unfollow(follower_id: str, following_id: str, db=Depends(get_db)):
    """팔로우 해제"""
    if db is None:
        return {"success": False}
    ok = await db.unfollow_user(follower_id, following_id)
    return {"success": ok}


@router.get("/following")
async def get_following(user_id: str, db=Depends(get_db)):
    """내가 팔로우하는 목록"""
    if db is None:
        return {"following_ids": []}
    ids = await db.get_following_ids(user_id)
    return {"following_ids": ids}


@router.get("/search-users")
async def search_users(
    q: str,
    user_id: str,
    limit: int = 20,
    db=Depends(get_db)
):
    """
    친구 찾기 / 팔로우용 사용자 검색
    - username, display_name 기준 부분 검색
    - 이미 팔로우 중인지 여부(is_following) 포함
    """
    if db is None or not q:
        return {"results": []}
    try:
        following_ids: List[str] = await db.get_following_ids(user_id)
        rows: List[Dict] = await db.search_public_users(q, limit=limit)
        results = []
        for row in rows:
            uid = row.get("id")
            if not uid or uid == user_id:
                continue
            results.append({
                "user_id": uid,
                "username": row.get("username"),
                "display_name": row.get("display_name"),
                "avatar_url": row.get("profile_image_url"),
                "code": str(uid)[:8],
                "is_following": uid in following_ids,
            })
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SocialProfileUpdate(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


@router.post("/profile")
async def update_social_profile(
    req: SocialProfileUpdate,
    db=Depends(get_db)
):
    """
    소셜 프로필 업데이트
    - public.users.display_name
    - public.users.profile_image_url
    """
    if db is None:
        return {"success": False, "message": "DB not connected"}
    ok = await db.update_user_profile_basic(
        user_id=req.user_id,
        display_name=req.display_name,
        avatar_url=req.avatar_url,
    )
    return {"success": ok}


# ============================================================
# DM / 채팅
# ============================================================


class ChatStartRequest(BaseModel):
    user_id: str
    target_id: str


class ChatMessageCreate(BaseModel):
    conversation_id: str
    sender_id: str
    body: str


@router.post("/chat/start")
async def start_chat(
    req: ChatStartRequest,
    db=Depends(get_db)
):
    """
    두 사용자 사이의 대화를 시작하거나 기존 대화 반환.
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    try:
        conv = await db.get_or_create_conversation(req.user_id, req.target_id)
        if not conv:
            raise HTTPException(status_code=500, detail="대화를 시작할 수 없습니다.")
        return conv
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/messages")
async def get_chat_messages(
    conversation_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    db=Depends(get_db)
):
    """
    대화 메시지 목록 조회 (최신순, 최대 50개)
    """
    if db is None:
        return {"messages": []}
    try:
        msgs = await db.get_messages(conversation_id, limit=limit, before=before)
        return {"messages": msgs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/messages")
async def send_chat_message(
    req: ChatMessageCreate,
    db=Depends(get_db)
):
    """
    채팅 메시지 전송
    - messages 테이블에 저장
    - 상대방에게 알림(Notification) 생성
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="메시지가 비어 있습니다.")
    try:
        conv = await db.get_conversation(req.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="대화를 찾을 수 없습니다.")
        # 메시지 저장
        message = await db.insert_message(req.conversation_id, req.sender_id, req.body.strip())
        # 상대방 ID 계산
        user_a_id = str(conv.get("user_a_id"))
        user_b_id = str(conv.get("user_b_id"))
        if req.sender_id == user_a_id:
            receiver_id = user_b_id
        else:
            receiver_id = user_a_id
        # 알림 생성 (실제 푸시는 별도)
        try:
            snippet = req.body.strip()
            if len(snippet) > 40:
                snippet = snippet[:40] + "…"
            await db.create_notification(
                receiver_id,
                "dm_new",
                "새 메시지가 도착했어요",
                snippet,
                {"conversation_id": req.conversation_id, "sender_id": req.sender_id},
            )
            await send_push_for_user(db, receiver_id, "새 메시지가 도착했어요", snippet)
        except Exception:
            # 알림 실패는 채팅 자체를 막지는 않음
            pass
        return {"success": True, "message": message}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
