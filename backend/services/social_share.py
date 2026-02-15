# -*- coding: utf-8 -*-
"""
소셜 공유 기능
- 공유 링크 생성
- OG 이미지 생성
- Kakao/Twitter/Facebook 공유
"""

import hashlib
import secrets
from typing import Dict, Optional
from datetime import datetime, timedelta
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import base64


class SocialShareService:
    """
    소셜 공유 서비스
    """
    
    def __init__(self, db):
        self.db = db
    
    def generate_share_id(self, quest_id: str, user_id: str) -> str:
        """
        짧은 공유 ID 생성 (예: "a3Xk9")
        """
        
        # 고유한 해시 생성
        hash_input = f"{quest_id}{user_id}{secrets.token_hex(8)}"
        hash_digest = hashlib.sha256(hash_input.encode()).hexdigest()
        
        # 앞 8자만 사용
        return hash_digest[:8]
    
    async def create_share_link(
        self,
        user_id: str,
        quest_id: str,
        place_id: str,
        quest_data: Dict
    ) -> Dict:
        """
        퀘스트 완료 공유 링크 생성
        
        Returns:
            {
                "share_id": "a3Xk9",
                "share_url": "https://wherehere.app/s/a3Xk9",
                "og_image_url": "https://wherehere.app/api/og/a3Xk9.png",
                "title": "...",
                "description": "...",
                "kakao_share_data": {...}
            }
        """
        
        # 공유 ID 생성
        share_id = self.generate_share_id(quest_id, user_id)
        
        # 사용자 정보
        user = await self.db.get_user(user_id)
        
        # 공유 데이터
        share_data = {
            "share_id": share_id,
            "user_id": user_id,
            "quest_id": quest_id,
            "place_id": place_id,
            "title": f"{user.get('nickname', '탐험가')}님이 {quest_data['place_name']} 퀘스트를 완료했어요!",
            "description": quest_data.get('narrative', '새로운 장소를 발견했어요!'),
            "xp_earned": quest_data.get('xp', 0),
            "role_type": quest_data.get('role_type', 'explorer'),
            "created_at": datetime.now(),
            "expires_at": datetime.now() + timedelta(days=30),
            "view_count": 0
        }
        
        # DB 저장
        await self.db.save_share(share_data)
        
        # 공유 URL
        base_url = "https://wherehere.app"  # TODO: 환경변수로
        share_url = f"{base_url}/s/{share_id}"
        og_image_url = f"{base_url}/api/og/{share_id}.png"
        
        # Kakao 공유 데이터
        kakao_share_data = {
            "objectType": "feed",
            "content": {
                "title": share_data["title"],
                "description": share_data["description"],
                "imageUrl": og_image_url,
                "link": {
                    "mobileWebUrl": share_url,
                    "webUrl": share_url
                }
            },
            "buttons": [
                {
                    "title": "나도 도전하기",
                    "link": {
                        "mobileWebUrl": base_url,
                        "webUrl": base_url
                    }
                }
            ]
        }
        
        return {
            "share_id": share_id,
            "share_url": share_url,
            "og_image_url": og_image_url,
            "title": share_data["title"],
            "description": share_data["description"],
            "kakao_share_data": kakao_share_data
        }
    
    async def get_share_data(self, share_id: str) -> Optional[Dict]:
        """
        공유 ID로 데이터 조회
        """
        
        share = await self.db.get_share_by_id(share_id)
        
        if not share:
            return None
        
        # 만료 체크
        if share.get("expires_at") and datetime.now() > share["expires_at"]:
            return None
        
        # 조회수 증가
        await self.db.increment_share_view_count(share_id)
        
        return share
    
    def generate_og_image(
        self,
        quest_data: Dict,
        role_type: str
    ) -> bytes:
        """
        OG 이미지 생성 (Open Graph)
        
        Returns:
            PNG 이미지 바이트
        """
        
        # 이미지 크기 (OG 표준)
        width = 1200
        height = 630
        
        # 역할별 색상
        role_colors = {
            "explorer": ("#E8740C", "#C65D00"),
            "healer": ("#10B981", "#059669"),
            "artist": ("#8B5CF6", "#7C3AED"),
            "foodie": ("#F59E0B", "#D97706"),
            "challenger": ("#EF4444", "#DC2626"),
        }
        
        color_start, color_end = role_colors.get(role_type, ("#E8740C", "#C65D00"))
        
        # 이미지 생성
        img = Image.new('RGB', (width, height), color=color_start)
        draw = ImageDraw.Draw(img)
        
        # 그라데이션 (간단 버전)
        for y in range(height):
            ratio = y / height
            r = int(int(color_start[1:3], 16) * (1 - ratio) + int(color_end[1:3], 16) * ratio)
            g = int(int(color_start[3:5], 16) * (1 - ratio) + int(color_end[3:5], 16) * ratio)
            b = int(int(color_start[5:7], 16) * (1 - ratio) + int(color_end[5:7], 16) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
        
        # 텍스트 (폰트 없이 기본 폰트 사용)
        try:
            # 제목
            title = quest_data.get('place_name', 'WhereHere Quest')
            draw.text((60, 120), title, fill='white')
            
            # XP
            xp_text = f"+{quest_data.get('xp', 0)} XP 획득!"
            draw.text((60, 200), xp_text, fill='white')
            
            # 서사 (짧게)
            narrative = quest_data.get('narrative', '')[:100] + "..."
            draw.text((60, 280), f'"{narrative}"', fill='rgba(255,255,255,0.9)')
            
            # 로고
            draw.text((60, 550), 'WhereHere', fill='white')
        
        except Exception as e:
            print(f"⚠️  텍스트 렌더링 실패: {e}")
        
        # 바이트로 변환
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        return buffer.getvalue()
    
    def generate_share_text(
        self,
        quest_data: Dict,
        platform: str = "general"
    ) -> str:
        """
        플랫폼별 공유 텍스트 생성
        
        Args:
            platform: "kakao", "twitter", "facebook", "general"
        """
        
        place_name = quest_data.get('place_name', '어딘가')
        xp = quest_data.get('xp', 0)
        narrative = quest_data.get('narrative', '')
        
        if platform == "twitter":
            # 트위터: 280자 제한
            text = f"나는 {place_name}에서 {xp} XP를 획득했어요! 🎉\n\n\"{narrative[:100]}...\"\n\n#WhereHere #도심탐험"
        
        elif platform == "facebook":
            # 페이스북: 긴 텍스트 가능
            text = f"""
🎯 {place_name} 퀘스트 완료!

+{xp} XP 획득 🎉

"{narrative}"

WhereHere와 함께 도심을 탐험하고 있어요!
나도 도전해보세요 👉 https://wherehere.app
"""
        
        else:
            # 일반
            text = f"나는 {place_name}에서 {xp} XP를 획득했어요! 🎉\n\n\"{narrative}\""
        
        return text.strip()
