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


# ============================================================
# 좋아요 & 댓글
# ============================================================

class LikePostRequest(BaseModel):
    post_id: str
    user_id: str


class UnlikePostRequest(BaseModel):
    post_id: str
    user_id: str


class CommentCreateRequest(BaseModel):
    post_id: str
    user_id: str
    body: str


class CommentUpdateRequest(BaseModel):
    comment_id: str
    user_id: str
    body: str


@router.post("/posts/like")
async def like_post(
    req: LikePostRequest,
    db=Depends(get_db)
):
    """
    게시글 좋아요
    - post_likes 테이블에 추가
    - 작성자에게 알림
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 좋아요 추가
            like_data = {
                "post_id": req.post_id,
                "user_id": req.user_id,
            }
            response = await client.post(
                f"{db.base_url}/rest/v1/post_likes",
                headers=db.headers,
                json=like_data,
            )
            
            if response.status_code not in [200, 201]:
                # 이미 좋아요한 경우 (UNIQUE 제약)
                if "duplicate" in response.text.lower():
                    return {"success": True, "message": "already_liked"}
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            # 게시글 작성자 조회
            post_response = await client.get(
                f"{db.base_url}/rest/v1/local_posts",
                headers=db.headers,
                params={"id": f"eq.{req.post_id}", "select": "author_id,title"}
            )
            
            if post_response.status_code == 200:
                posts = post_response.json()
                if posts and len(posts) > 0:
                    author_id = posts[0].get("author_id")
                    post_title = posts[0].get("title", "게시글")
                    
                    # 본인 게시글이 아닐 때만 알림
                    if author_id and author_id != req.user_id:
                        # 좋아요한 사용자 정보 조회
                        user_response = await client.get(
                            f"{db.base_url}/rest/v1/users",
                            headers=db.headers,
                            params={"id": f"eq.{req.user_id}", "select": "display_name,username"}
                        )
                        liker_name = "누군가"
                        if user_response.status_code == 200:
                            users = user_response.json()
                            if users and len(users) > 0:
                                liker_name = users[0].get("display_name") or users[0].get("username") or "누군가"
                        
                        # 알림 생성
                        try:
                            await db.create_notification(
                                author_id,
                                "post_like",
                                f"{liker_name}님이 좋아요를 눌렀어요",
                                post_title[:50],
                                {"post_id": req.post_id, "liker_id": req.user_id}
                            )
                            await send_push_for_user(db, author_id, f"{liker_name}님이 좋아요를 눌렀어요", post_title[:50])
                        except Exception:
                            pass
            
            return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/posts/like")
async def unlike_post(
    req: UnlikePostRequest,
    db=Depends(get_db)
):
    """게시글 좋아요 취소"""
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.delete(
                f"{db.base_url}/rest/v1/post_likes",
                headers=db.headers,
                params={
                    "post_id": f"eq.{req.post_id}",
                    "user_id": f"eq.{req.user_id}"
                }
            )
            
            if response.status_code not in [200, 204]:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/{post_id}/likes")
async def get_post_likes(
    post_id: str,
    db=Depends(get_db)
):
    """게시글 좋아요 목록 및 개수"""
    if db is None:
        return {"likes": [], "count": 0}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{db.base_url}/rest/v1/post_likes",
                headers=db.headers,
                params={
                    "post_id": f"eq.{post_id}",
                    "select": "user_id,created_at",
                    "order": "created_at.desc"
                }
            )
            
            if response.status_code == 200:
                likes = response.json()
                return {"likes": likes, "count": len(likes)}
            
            return {"likes": [], "count": 0}
    
    except Exception:
        return {"likes": [], "count": 0}


@router.post("/posts/comment")
async def create_comment(
    req: CommentCreateRequest,
    db=Depends(get_db)
):
    """
    댓글 작성
    - post_comments 테이블에 추가
    - 작성자에게 알림
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    if not req.body.strip():
        raise HTTPException(status_code=400, detail="댓글 내용이 비어 있습니다.")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 댓글 추가
            comment_data = {
                "post_id": req.post_id,
                "user_id": req.user_id,
                "body": req.body.strip(),
            }
            response = await client.post(
                f"{db.base_url}/rest/v1/post_comments",
                headers={**db.headers, "Prefer": "return=representation"},
                json=comment_data,
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            comment = response.json()
            if isinstance(comment, list) and len(comment) > 0:
                comment = comment[0]
            
            # 게시글 작성자 조회
            post_response = await client.get(
                f"{db.base_url}/rest/v1/local_posts",
                headers=db.headers,
                params={"id": f"eq.{req.post_id}", "select": "author_id,title"}
            )
            
            if post_response.status_code == 200:
                posts = post_response.json()
                if posts and len(posts) > 0:
                    author_id = posts[0].get("author_id")
                    post_title = posts[0].get("title", "게시글")
                    
                    # 본인 게시글이 아닐 때만 알림
                    if author_id and author_id != req.user_id:
                        # 댓글 작성자 정보 조회
                        user_response = await client.get(
                            f"{db.base_url}/rest/v1/users",
                            headers=db.headers,
                            params={"id": f"eq.{req.user_id}", "select": "display_name,username"}
                        )
                        commenter_name = "누군가"
                        if user_response.status_code == 200:
                            users = user_response.json()
                            if users and len(users) > 0:
                                commenter_name = users[0].get("display_name") or users[0].get("username") or "누군가"
                        
                        # 알림 생성
                        try:
                            comment_snippet = req.body.strip()[:50]
                            await db.create_notification(
                                author_id,
                                "post_comment",
                                f"{commenter_name}님이 댓글을 남겼어요",
                                comment_snippet,
                                {"post_id": req.post_id, "comment_id": comment.get("id"), "commenter_id": req.user_id}
                            )
                            await send_push_for_user(db, author_id, f"{commenter_name}님이 댓글을 남겼어요", comment_snippet)
                        except Exception:
                            pass
            
            return {"success": True, "comment": comment}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/posts/{post_id}/comments")
async def get_post_comments(
    post_id: str,
    limit: int = 50,
    db=Depends(get_db)
):
    """게시글 댓글 목록 조회"""
    if db is None:
        return {"comments": []}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{db.base_url}/rest/v1/post_comments",
                headers=db.headers,
                params={
                    "post_id": f"eq.{post_id}",
                    "select": "id,user_id,body,created_at,updated_at",
                    "order": "created_at.asc",
                    "limit": str(limit)
                }
            )
            
            if response.status_code == 200:
                comments = response.json()
                
                # 각 댓글 작성자 정보 조회
                user_ids = list(set([c.get("user_id") for c in comments if c.get("user_id")]))
                user_map = {}
                
                if user_ids:
                    user_response = await client.get(
                        f"{db.base_url}/rest/v1/users",
                        headers=db.headers,
                        params={
                            "id": f"in.({','.join(user_ids)})",
                            "select": "id,display_name,username,profile_image_url"
                        }
                    )
                    if user_response.status_code == 200:
                        users = user_response.json()
                        for u in users:
                            user_map[u.get("id")] = u
                
                # 댓글에 사용자 정보 추가
                for comment in comments:
                    uid = comment.get("user_id")
                    if uid and uid in user_map:
                        comment["author"] = user_map[uid]
                
                return {"comments": comments}
            
            return {"comments": []}
    
    except Exception:
        return {"comments": []}


@router.delete("/posts/comment/{comment_id}")
async def delete_comment(
    comment_id: str,
    user_id: str,
    db=Depends(get_db)
):
    """댓글 삭제 (본인만)"""
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.delete(
                f"{db.base_url}/rest/v1/post_comments",
                headers=db.headers,
                params={
                    "id": f"eq.{comment_id}",
                    "user_id": f"eq.{user_id}"
                }
            )
            
            if response.status_code not in [200, 204]:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 카카오 친구 매칭 (앱 내 친구 찾기)
# ============================================================

class KakaoFriendMatchRequest(BaseModel):
    """카카오 액세스 토큰으로 친구 목록을 가져와 앱 사용자 중 매칭"""
    access_token: str
    user_id: str


@router.post("/kakao-friends/match")
async def match_kakao_friends(
    req: KakaoFriendMatchRequest,
    db=Depends(get_db)
):
    """
    카카오톡 친구 중 WhereHere 앱 사용자 찾기
    1. 카카오 API로 친구 목록 조회
    2. 각 친구의 카카오 ID로 kakao_user_mapping 테이블 조회
    3. 매칭된 앱 사용자 반환 (팔로우 여부 포함)
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. 카카오 친구 목록 조회
            kakao_response = await client.get(
                "https://kapi.kakao.com/v1/api/talk/friends",
                headers={"Authorization": f"Bearer {req.access_token}"},
            )
            
            if kakao_response.status_code != 200:
                raise HTTPException(
                    status_code=kakao_response.status_code,
                    detail=kakao_response.json().get("msg", "Kakao API error")
                )
            
            kakao_data = kakao_response.json()
            kakao_friends = kakao_data.get("elements", [])
            
            if not kakao_friends:
                return {"matched_friends": [], "total_kakao_friends": 0}
            
            # 2. 카카오 ID 추출
            kakao_ids = [str(f.get("id")) for f in kakao_friends if f.get("id")]
            
            if not kakao_ids:
                return {"matched_friends": [], "total_kakao_friends": len(kakao_friends)}
            
            # 3. kakao_user_mapping에서 앱 사용자 찾기
            mapping_response = await client.get(
                f"{db.base_url}/rest/v1/kakao_user_mapping",
                headers=db.headers,
                params={
                    "kakao_id": f"in.({','.join(kakao_ids)})",
                    "select": "user_id,kakao_id"
                }
            )
            
            if mapping_response.status_code != 200:
                return {"matched_friends": [], "total_kakao_friends": len(kakao_friends)}
            
            mappings = mapping_response.json()
            
            if not mappings:
                return {"matched_friends": [], "total_kakao_friends": len(kakao_friends)}
            
            # 4. 매칭된 user_id 목록
            matched_user_ids = [m.get("user_id") for m in mappings if m.get("user_id")]
            kakao_id_to_user_id = {m.get("kakao_id"): m.get("user_id") for m in mappings}
            
            if not matched_user_ids:
                return {"matched_friends": [], "total_kakao_friends": len(kakao_friends)}
            
            # 5. 앱 사용자 정보 조회
            users_response = await client.get(
                f"{db.base_url}/rest/v1/users",
                headers=db.headers,
                params={
                    "id": f"in.({','.join(matched_user_ids)})",
                    "select": "id,display_name,username,profile_image_url"
                }
            )
            
            if users_response.status_code != 200:
                return {"matched_friends": [], "total_kakao_friends": len(kakao_friends)}
            
            app_users = users_response.json()
            user_id_to_info = {u.get("id"): u for u in app_users}
            
            # 6. 팔로우 여부 조회
            following_ids = await db.get_following_ids(req.user_id)
            
            # 7. 결과 조합
            matched_friends = []
            for kakao_friend in kakao_friends:
                kakao_id = str(kakao_friend.get("id"))
                if kakao_id in kakao_id_to_user_id:
                    app_user_id = kakao_id_to_user_id[kakao_id]
                    if app_user_id in user_id_to_info:
                        user_info = user_id_to_info[app_user_id]
                        matched_friends.append({
                            "user_id": app_user_id,
                            "display_name": user_info.get("display_name"),
                            "username": user_info.get("username"),
                            "avatar_url": user_info.get("profile_image_url"),
                            "kakao_nickname": kakao_friend.get("profile_nickname"),
                            "kakao_thumbnail": kakao_friend.get("profile_thumbnail_image"),
                            "is_following": app_user_id in following_ids,
                            "code": app_user_id[:8],
                        })
            
            return {
                "matched_friends": matched_friends,
                "total_kakao_friends": len(kakao_friends),
                "matched_count": len(matched_friends)
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/kakao-id/register")
async def register_kakao_id(
    user_id: str,
    access_token: str,
    db=Depends(get_db)
):
    """
    사용자의 카카오 ID를 매칭 테이블에 등록
    - 카카오 로그인 후 자동 호출 권장
    - 친구 찾기 기능에 사용
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 카카오 사용자 정보 조회
            kakao_response = await client.get(
                "https://kapi.kakao.com/v2/user/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            
            if kakao_response.status_code != 200:
                raise HTTPException(
                    status_code=kakao_response.status_code,
                    detail="Failed to get Kakao user info"
                )
            
            kakao_user = kakao_response.json()
            kakao_id = str(kakao_user.get("id"))
            
            if not kakao_id:
                raise HTTPException(status_code=400, detail="Kakao ID not found")
            
            # kakao_user_mapping에 upsert
            mapping_data = {
                "user_id": user_id,
                "kakao_id": kakao_id,
                "updated_at": datetime.now().isoformat(),
            }
            
            # UPSERT (conflict 시 update)
            response = await client.post(
                f"{db.base_url}/rest/v1/kakao_user_mapping",
                headers={**db.headers, "Prefer": "resolution=merge-duplicates"},
                json=mapping_data,
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            return {"success": True, "kakao_id": kakao_id}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# 협동 퀘스트 (Group Quests)
# ============================================================

class GroupQuestCreateRequest(BaseModel):
    creator_id: str
    place_id: str
    place_name: str
    place_address: Optional[str] = None
    max_participants: int = 4


class GroupQuestJoinRequest(BaseModel):
    group_quest_id: str
    user_id: str


class GroupQuestCheckInRequest(BaseModel):
    group_quest_id: str
    user_id: str


@router.post("/group-quests/create")
async def create_group_quest(
    req: GroupQuestCreateRequest,
    db=Depends(get_db)
):
    """
    협동 퀘스트 생성
    - 친구들을 초대할 수 있는 그룹 퀘스트
    - 24시간 유효
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            quest_data = {
                "creator_id": req.creator_id,
                "place_id": req.place_id,
                "place_name": req.place_name,
                "place_address": req.place_address,
                "max_participants": req.max_participants,
                "status": "active",
            }
            
            response = await client.post(
                f"{db.base_url}/rest/v1/group_quests",
                headers={**db.headers, "Prefer": "return=representation"},
                json=quest_data,
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            quest = response.json()
            if isinstance(quest, list) and len(quest) > 0:
                quest = quest[0]
            
            # 생성자를 자동으로 참여자로 추가
            participant_data = {
                "group_quest_id": quest.get("id"),
                "user_id": req.creator_id,
            }
            
            await client.post(
                f"{db.base_url}/rest/v1/group_quest_participants",
                headers=db.headers,
                json=participant_data,
            )
            
            return {"success": True, "quest": quest}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/group-quests/join")
async def join_group_quest(
    req: GroupQuestJoinRequest,
    db=Depends(get_db)
):
    """협동 퀘스트 참여"""
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 퀘스트 정보 조회
            quest_response = await client.get(
                f"{db.base_url}/rest/v1/group_quests",
                headers=db.headers,
                params={
                    "id": f"eq.{req.group_quest_id}",
                    "select": "id,creator_id,place_name,max_participants,status,expires_at"
                }
            )
            
            if quest_response.status_code != 200:
                raise HTTPException(status_code=404, detail="퀘스트를 찾을 수 없습니다.")
            
            quests = quest_response.json()
            if not quests or len(quests) == 0:
                raise HTTPException(status_code=404, detail="퀘스트를 찾을 수 없습니다.")
            
            quest = quests[0]
            
            # 상태 확인
            if quest.get("status") != "active":
                raise HTTPException(status_code=400, detail="이미 완료되었거나 취소된 퀘스트입니다.")
            
            # 만료 확인
            expires_at = quest.get("expires_at")
            if expires_at:
                from datetime import datetime
                if datetime.fromisoformat(expires_at.replace("Z", "+00:00")) < datetime.now():
                    raise HTTPException(status_code=400, detail="만료된 퀘스트입니다.")
            
            # 현재 참여자 수 확인
            participants_response = await client.get(
                f"{db.base_url}/rest/v1/group_quest_participants",
                headers=db.headers,
                params={
                    "group_quest_id": f"eq.{req.group_quest_id}",
                    "select": "user_id"
                }
            )
            
            if participants_response.status_code == 200:
                participants = participants_response.json()
                if len(participants) >= quest.get("max_participants", 4):
                    raise HTTPException(status_code=400, detail="참여 인원이 가득 찼습니다.")
            
            # 참여자 추가
            participant_data = {
                "group_quest_id": req.group_quest_id,
                "user_id": req.user_id,
            }
            
            response = await client.post(
                f"{db.base_url}/rest/v1/group_quest_participants",
                headers={**db.headers, "Prefer": "return=representation"},
                json=participant_data,
            )
            
            if response.status_code not in [200, 201]:
                # 이미 참여한 경우
                if "duplicate" in response.text.lower():
                    return {"success": True, "message": "already_joined"}
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            # 생성자에게 알림
            creator_id = quest.get("creator_id")
            if creator_id and creator_id != req.user_id:
                user_response = await client.get(
                    f"{db.base_url}/rest/v1/users",
                    headers=db.headers,
                    params={"id": f"eq.{req.user_id}", "select": "display_name,username"}
                )
                joiner_name = "누군가"
                if user_response.status_code == 200:
                    users = user_response.json()
                    if users and len(users) > 0:
                        joiner_name = users[0].get("display_name") or users[0].get("username") or "누군가"
                
                try:
                    await db.create_notification(
                        creator_id,
                        "group_quest_join",
                        f"{joiner_name}님이 함께 퀘스트에 참여했어요",
                        quest.get("place_name", ""),
                        {"group_quest_id": req.group_quest_id, "joiner_id": req.user_id}
                    )
                    await send_push_for_user(db, creator_id, f"{joiner_name}님이 참여했어요", quest.get("place_name", ""))
                except Exception:
                    pass
            
            return {"success": True}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/group-quests/checkin")
async def checkin_group_quest(
    req: GroupQuestCheckInRequest,
    db=Depends(get_db)
):
    """협동 퀘스트 체크인"""
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 참여자 정보 업데이트
            update_data = {
                "checked_in": True,
                "checked_in_at": datetime.now().isoformat(),
            }
            
            response = await client.patch(
                f"{db.base_url}/rest/v1/group_quest_participants",
                headers=db.headers,
                params={
                    "group_quest_id": f"eq.{req.group_quest_id}",
                    "user_id": f"eq.{req.user_id}"
                },
                json=update_data,
            )
            
            if response.status_code not in [200, 204]:
                raise HTTPException(status_code=response.status_code, detail=response.text)
            
            # 모든 참여자가 체크인했는지 확인
            participants_response = await client.get(
                f"{db.base_url}/rest/v1/group_quest_participants",
                headers=db.headers,
                params={
                    "group_quest_id": f"eq.{req.group_quest_id}",
                    "select": "user_id,checked_in"
                }
            )
            
            all_checked_in = False
            if participants_response.status_code == 200:
                participants = participants_response.json()
                if participants and all(p.get("checked_in") for p in participants):
                    all_checked_in = True
                    
                    # 퀘스트 완료 처리
                    await client.patch(
                        f"{db.base_url}/rest/v1/group_quests",
                        headers=db.headers,
                        params={"id": f"eq.{req.group_quest_id}"},
                        json={
                            "status": "completed",
                            "completed_at": datetime.now().isoformat(),
                        }
                    )
                    
                    # 모든 참여자에게 완료 알림
                    quest_response = await client.get(
                        f"{db.base_url}/rest/v1/group_quests",
                        headers=db.headers,
                        params={"id": f"eq.{req.group_quest_id}", "select": "place_name"}
                    )
                    place_name = ""
                    if quest_response.status_code == 200:
                        quests = quest_response.json()
                        if quests and len(quests) > 0:
                            place_name = quests[0].get("place_name", "")
                    
                    for p in participants:
                        if p.get("user_id") != req.user_id:
                            try:
                                await db.create_notification(
                                    p.get("user_id"),
                                    "group_quest_complete",
                                    "함께 퀘스트를 완료했어요!",
                                    place_name,
                                    {"group_quest_id": req.group_quest_id}
                                )
                                await send_push_for_user(db, p.get("user_id"), "함께 퀘스트 완료!", place_name)
                            except Exception:
                                pass
            
            return {"success": True, "all_completed": all_checked_in}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/group-quests/active")
async def get_active_group_quests(
    user_id: Optional[str] = None,
    limit: int = 20,
    db=Depends(get_db)
):
    """활성 협동 퀘스트 목록 (친구 또는 공개)"""
    if db is None:
        return {"quests": []}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 활성 퀘스트 조회
            response = await client.get(
                f"{db.base_url}/rest/v1/group_quests",
                headers=db.headers,
                params={
                    "status": "eq.active",
                    "select": "id,creator_id,place_id,place_name,place_address,max_participants,created_at,expires_at",
                    "order": "created_at.desc",
                    "limit": str(limit)
                }
            )
            
            if response.status_code != 200:
                return {"quests": []}
            
            quests = response.json()
            
            # 각 퀘스트의 참여자 수 조회
            for quest in quests:
                quest_id = quest.get("id")
                participants_response = await client.get(
                    f"{db.base_url}/rest/v1/group_quest_participants",
                    headers=db.headers,
                    params={
                        "group_quest_id": f"eq.{quest_id}",
                        "select": "user_id,checked_in"
                    }
                )
                
                if participants_response.status_code == 200:
                    participants = participants_response.json()
                    quest["current_participants"] = len(participants)
                    quest["checked_in_count"] = sum(1 for p in participants if p.get("checked_in"))
                    
                    # 내가 참여 중인지
                    if user_id:
                        quest["is_joined"] = any(p.get("user_id") == user_id for p in participants)
                else:
                    quest["current_participants"] = 0
                    quest["checked_in_count"] = 0
                    quest["is_joined"] = False
            
            return {"quests": quests}
    
    except Exception:
        return {"quests": []}


@router.get("/group-quests/{quest_id}")
async def get_group_quest_details(
    quest_id: str,
    db=Depends(get_db)
):
    """협동 퀘스트 상세 정보 (참여자 목록 포함)"""
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 퀘스트 정보
            quest_response = await client.get(
                f"{db.base_url}/rest/v1/group_quests",
                headers=db.headers,
                params={"id": f"eq.{quest_id}", "select": "*"}
            )
            
            if quest_response.status_code != 200:
                raise HTTPException(status_code=404, detail="퀘스트를 찾을 수 없습니다.")
            
            quests = quest_response.json()
            if not quests or len(quests) == 0:
                raise HTTPException(status_code=404, detail="퀘스트를 찾을 수 없습니다.")
            
            quest = quests[0]
            
            # 참여자 목록
            participants_response = await client.get(
                f"{db.base_url}/rest/v1/group_quest_participants",
                headers=db.headers,
                params={
                    "group_quest_id": f"eq.{quest_id}",
                    "select": "user_id,joined_at,checked_in,checked_in_at"
                }
            )
            
            participants = []
            if participants_response.status_code == 200:
                participants = participants_response.json()
                
                # 참여자 정보 조회
                user_ids = [p.get("user_id") for p in participants if p.get("user_id")]
                if user_ids:
                    users_response = await client.get(
                        f"{db.base_url}/rest/v1/users",
                        headers=db.headers,
                        params={
                            "id": f"in.({','.join(user_ids)})",
                            "select": "id,display_name,username,profile_image_url"
                        }
                    )
                    
                    if users_response.status_code == 200:
                        users = users_response.json()
                        user_map = {u.get("id"): u for u in users}
                        
                        for p in participants:
                            uid = p.get("user_id")
                            if uid in user_map:
                                p["user_info"] = user_map[uid]
            
            quest["participants"] = participants
            quest["current_participants"] = len(participants)
            quest["checked_in_count"] = sum(1 for p in participants if p.get("checked_in"))
            
            return {"quest": quest}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/group-quests/{quest_id}/invite")
async def invite_to_group_quest(
    quest_id: str,
    inviter_id: str,
    invitee_ids: List[str],
    db=Depends(get_db)
):
    """
    협동 퀘스트에 친구 초대 (알림 전송)
    - 카카오톡 메시지는 별도로 프론트에서 처리
    """
    if db is None:
        raise HTTPException(status_code=500, detail="DB not connected")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 퀘스트 정보 조회
            quest_response = await client.get(
                f"{db.base_url}/rest/v1/group_quests",
                headers=db.headers,
                params={"id": f"eq.{quest_id}", "select": "place_name,creator_id"}
            )
            
            if quest_response.status_code != 200:
                raise HTTPException(status_code=404, detail="퀘스트를 찾을 수 없습니다.")
            
            quests = quest_response.json()
            if not quests or len(quests) == 0:
                raise HTTPException(status_code=404, detail="퀘스트를 찾을 수 없습니다.")
            
            quest = quests[0]
            place_name = quest.get("place_name", "")
            
            # 초대자 정보
            inviter_response = await client.get(
                f"{db.base_url}/rest/v1/users",
                headers=db.headers,
                params={"id": f"eq.{inviter_id}", "select": "display_name,username"}
            )
            inviter_name = "친구"
            if inviter_response.status_code == 200:
                users = inviter_response.json()
                if users and len(users) > 0:
                    inviter_name = users[0].get("display_name") or users[0].get("username") or "친구"
            
            # 각 초대 대상자에게 알림
            for invitee_id in invitee_ids:
                if invitee_id != inviter_id:
                    try:
                        await db.create_notification(
                            invitee_id,
                            "group_quest_invite",
                            f"{inviter_name}님이 함께 퀘스트에 초대했어요",
                            place_name,
                            {"group_quest_id": quest_id, "inviter_id": inviter_id}
                        )
                        await send_push_for_user(db, invitee_id, f"{inviter_name}님의 초대", f"{place_name} 함께 가요!")
                    except Exception:
                        pass
            
            return {"success": True, "invited_count": len(invitee_ids)}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
