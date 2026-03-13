# -*- coding: utf-8 -*-
"""
소셜 기능 API 라우트
- 모임 생성/참여
- 소셜 공유
- 매칭 시스템
"""

import httpx
import json
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


@router.get("/profile/{user_id}")
async def get_social_profile(
    user_id: str,
    db=Depends(get_db)
):
    """
    소셜 프로필 조회
    - public.users.display_name
    - public.users.profile_image_url
    """
    if db is None:
        return {"profile": None}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{db.base_url}/rest/v1/users"
            params = {"id": f"eq.{user_id}", "select": "id,display_name,profile_image_url,username"}
            response = await client.get(url, headers=db.headers, params=params)
            
            if response.status_code == 200:
                users = response.json()
                if users and len(users) > 0:
                    return {"profile": users[0]}
            
            return {"profile": None}
    except Exception as e:
        return {"profile": None}


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
    # 유저 row가 없으면 먼저 생성 (profile_image_url upsert 실패 방지)
    created = await db.ensure_user_exists(req.user_id)
    if not created:
        return {"success": False, "message": "failed to ensure user row"}
    ok = await db.update_user_profile_basic(
        user_id=req.user_id,
        display_name=req.display_name,
        avatar_url=req.avatar_url,
    )
    return {"success": ok, "message": None if ok else "profile upsert failed"}


# ============================================================
# 카카오 친구 목록 (초대용, 저장 금지)
# ============================================================

class KakaoFriendsRequest(BaseModel):
    """카카오 액세스 토큰으로 친구 목록 조회 요청. 응답은 저장·보관하지 않음."""
    access_token: str


class KakaoFeedContent(BaseModel):
    """feed 타입 메시지용 (POST /friends/message/default/send). 장소 추천 등 소셜 공유."""
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None


class KakaoSendMessageRequest(BaseModel):
    access_token: str
    receiver_uuid: str
    text: str = ""
    title: Optional[str] = None
    link_url: Optional[str] = None
    # 사용자 정의 템플릿 사용 시 (카카오 콘솔 [도구] > [메시지 템플릿]에서 생성한 template_id)
    template_id: Optional[str] = None
    # 템플릿의 사용자 인자 (${KEY} 형식). 값은 모두 문자열.
    template_args: Optional[dict[str, str]] = None
    # feed 타입 사용 시: default/send 에서 피드형 카드(장소명·설명·이미지·딥링크)로 전송
    feed_content: Optional[KakaoFeedContent] = None


@router.post("/kakao-friends")
async def get_kakao_friends(req: KakaoFriendsRequest):
    """
    카카오톡 친구 목록 조회 (실시간만, DB 저장 금지).
    - 클라이언트가 Kakao Auth 토큰을 넘기면 kapi.kakao.com/v1/api/talk/friends 호출 후 그대로 반환.
    - 친구 목록은 '초대하기' UI용으로만 사용하고 저장하지 않음.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                "https://kapi.kakao.com/v1/api/talk/friends",
                headers={"Authorization": f"Bearer {req.access_token}"},
            )
        if r.status_code != 200:
            raise HTTPException(
                status_code=r.status_code,
                detail=r.json().get("msg", r.text) if r.text else "Kakao API error",
            )
        data = r.json()
        # elements만 반환 (저장/가공 없음)
        return {"elements": data.get("elements", []), "total_count": data.get("total_count", 0)}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Kakao API request failed: {str(e)}")


@router.post("/kakao-friends/send-message")
async def send_kakao_friend_message(req: KakaoSendMessageRequest):
    if not req.receiver_uuid:
        raise HTTPException(status_code=400, detail="receiver_uuid is required")
    if req.template_id:
        pass
    elif req.feed_content:
        if not req.feed_content.title or not req.feed_content.title.strip():
            raise HTTPException(status_code=400, detail="feed_content.title is required for feed type")
    else:
        if not req.text or not req.text.strip():
            raise HTTPException(status_code=400, detail="text is required when not using template_id or feed_content")

    target_url = req.link_url or "https://wherehere.app/"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            if req.template_id:
                # 사용자 정의 템플릿: 콘솔에서 만든 피드/리스트 등
                payload = {
                    "receiver_uuids": json.dumps([req.receiver_uuid], ensure_ascii=False),
                    "template_id": req.template_id,
                }
                if req.template_args:
                    payload["template_args"] = json.dumps(req.template_args, ensure_ascii=False)
                r = await client.post(
                    "https://kapi.kakao.com/v1/api/talk/friends/message/send",
                    headers={"Authorization": f"Bearer {req.access_token}"},
                    data=payload,
                )
            elif req.feed_content:
                # default/send + feed 타입: 장소 추천 등 소셜 공유 (심사용 피드형 메시지)
                fc = req.feed_content
                link_url = (fc.link_url or target_url).strip()
                image_url = (fc.image_url or "").strip()
                if not image_url:
                    image_url = "https://wherehere.app/og.png"
                template_object = {
                    "object_type": "feed",
                    "content": {
                        "title": (fc.title or "").strip()[:200],
                        "description": (fc.description or "").strip()[:500],
                        "image_url": image_url,
                        "link": {
                            "web_url": link_url,
                            "mobile_web_url": link_url,
                        },
                    },
                    "button_title": req.title or "WhereHere에서 보기",
                }
                r = await client.post(
                    "https://kapi.kakao.com/v1/api/talk/friends/message/default/send",
                    headers={"Authorization": f"Bearer {req.access_token}"},
                    data={
                        "receiver_uuids": json.dumps([req.receiver_uuid], ensure_ascii=False),
                        "template_object": json.dumps(template_object, ensure_ascii=False),
                    },
                )
            else:
                # 기본 텍스트 템플릿 (기존 동작)
                template_object = {
                    "object_type": "text",
                    "text": req.text.strip(),
                    "link": {
                        "web_url": target_url,
                        "mobile_web_url": target_url,
                    },
                    "button_title": req.title or "WhereHere 열기",
                }
                r = await client.post(
                    "https://kapi.kakao.com/v1/api/talk/friends/message/default/send",
                    headers={"Authorization": f"Bearer {req.access_token}"},
                    data={
                        "receiver_uuids": json.dumps([req.receiver_uuid], ensure_ascii=False),
                        "template_object": json.dumps(template_object, ensure_ascii=False),
                    },
                )
        if r.status_code != 200:
            detail = None
            try:
                detail = r.json().get("msg")
            except Exception:
                detail = r.text
            raise HTTPException(status_code=r.status_code, detail=detail or "Kakao API error")

        data = r.json()
        return {
            "success": True,
            "successful_receiver_uuids": data.get("successful_receiver_uuids", []),
            "failure_info": data.get("failure_info", []),
        }
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Kakao API request failed: {str(e)}")


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
