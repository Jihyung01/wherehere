# -*- coding: utf-8 -*-
"""
로컬 피드 API: 동네 게시글(local_posts) + 댓글(local_comments)
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.dependencies import get_db

router = APIRouter(prefix="/api/v1/local", tags=["local_feed"])


class CreateLocalPostRequest(BaseModel):
    author_id: str
    type: str  # story | review | gathering
    title: str
    body: str = ""
    rating: int = 0
    meet_time: Optional[str] = None
    image_url: Optional[str] = None
    place_name: Optional[str] = None
    place_address: Optional[str] = None
    area_name: str = ""


class CreateCommentRequest(BaseModel):
    author_id: str
    body: str


@router.get("/posts")
async def list_posts(
    scope: str = "neighborhood",
    area_name: Optional[str] = None,
    user_id: Optional[str] = None,
    author_id: Optional[str] = None,
    limit: int = 50,
    db=Depends(get_db),
):
    """
    scope=neighborhood: area_name 기준 (없으면 전체 최신순)
    scope=following: user_id 필수, 내가 팔로우한 사람 + 나의 게시글만
    scope=user + author_id: 해당 사용자 작성 게시글만 (프로필 피드용)
    """
    if db is None:
        return {"posts": []}
    following_ids = []
    if scope == "following" and user_id:
        following_ids = await db.get_following_ids(user_id)
    posts = await db.list_local_posts(
        scope=scope,
        area_name=area_name,
        user_id=user_id,
        following_ids=following_ids if scope == "following" else None,
        author_id=author_id,
        limit=limit,
    )
    # 소셜 프로필: 작성자 display_name, profile_image_url 붙이기
    author_ids = list({p.get("author_id") for p in posts if p.get("author_id")})
    users_map = await db.get_users_basic(author_ids) if author_ids else {}
    for p in posts:
        aid = p.get("author_id")
        u = users_map.get(aid) or users_map.get(str(aid)) if aid else {}
        p["author_display_name"] = u.get("display_name")
        p["author_avatar_url"] = u.get("profile_image_url")
    return {"posts": posts}


@router.post("/posts")
async def create_post(req: CreateLocalPostRequest, db=Depends(get_db)):
    """동네 게시글 작성"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database not connected. Check backend SUPABASE_URL.")
    
    # users 테이블에 사용자 정보가 없으면 기본 정보 생성
    await db.ensure_user_exists(req.author_id)
    
    post = await db.create_local_post(
        author_id=req.author_id,
        type_=req.type,
        title=req.title,
        body=req.body,
        rating=req.rating,
        meet_time=req.meet_time,
        image_url=req.image_url,
        place_name=req.place_name,
        place_address=req.place_address,
        area_name=req.area_name,
    )
    return {"success": post is not None, "post": post}


@router.get("/posts/{post_id}/comments")
async def list_comments(post_id: str, limit: int = 100, db=Depends(get_db)):
    """게시글 댓글 목록"""
    if db is None:
        return {"comments": []}
    comments = await db.list_local_comments(post_id=post_id, limit=limit)
    return {"comments": comments}


@router.post("/posts/{post_id}/comments")
async def create_comment(post_id: str, req: CreateCommentRequest, db=Depends(get_db)):
    """댓글 작성"""
    if db is None:
        return {"success": False, "id": None}
    comment = await db.create_local_comment(
        post_id=post_id, author_id=req.author_id, body=req.body
    )
    return {"success": comment is not None, "comment": comment}
