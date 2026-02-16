#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kakao Local API를 사용해 실제 장소 데이터 수집
서울 전역의 카페, 맛집, 관광지 등을 수집하여 Supabase에 저장
"""

import os
import sys
import asyncio
import httpx
from typing import List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트의 backend/.env 파일 로드
backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

# Kakao API 설정
KAKAO_API_KEY = os.getenv("KAKAO_REST_API_KEY", "YOUR_KAKAO_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# 서울 주요 지역 (25개 구)
SEOUL_REGIONS = [
    "강남구", "강동구", "강북구", "강서구", "관악구",
    "광진구", "구로구", "금천구", "노원구", "도봉구",
    "동대문구", "동작구", "마포구", "서대문구", "서초구",
    "성동구", "성북구", "송파구", "양천구", "영등포구",
    "용산구", "은평구", "종로구", "중구", "중랑구"
]

# 카테고리 (Kakao Local API 카테고리 코드)
CATEGORIES = {
    "카페": "CE7",      # 카페
    "음식점": "FD6",    # 음식점
    "술집": "FD6",      # 음식점 (술집 포함)
    "공원": "AT4",      # 관광명소
    "문화시설": "CT1",  # 문화시설
    "편의점": "CS2",    # 편의점
}

# Vibe 태그 매핑
VIBE_MAPPING = {
    "카페": ["cozy", "quiet", "trendy"],
    "음식점": ["delicious", "popular", "authentic"],
    "술집": ["lively", "social", "relaxing"],
    "공원": ["peaceful", "nature", "outdoor"],
    "문화시설": ["artistic", "cultural", "educational"],
}


class KakaoPlaceCollector:
    """Kakao Local API로 장소 데이터 수집"""
    
    def __init__(self):
        self.kakao_headers = {
            "Authorization": f"KakaoAK {KAKAO_API_KEY}"
        }
        self.supabase_headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        self.collected_places = []
    
    async def search_places(
        self,
        query: str,
        category_code: str = None,
        x: float = 126.9780,  # 서울 중심 (시청)
        y: float = 37.5665,
        radius: int = 20000,  # 20km
        page: int = 1
    ) -> List[Dict]:
        """Kakao Local API로 장소 검색"""
        
        url = "https://dapi.kakao.com/v2/local/search/keyword.json"
        params = {
            "query": query,
            "x": x,
            "y": y,
            "radius": radius,
            "page": page,
            "size": 15,  # 한 페이지당 최대 15개
            "sort": "accuracy"  # 정확도순
        }
        
        if category_code:
            params["category_group_code"] = category_code
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    url,
                    headers=self.kakao_headers,
                    params=params
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data.get("documents", [])
                else:
                    print(f"[ERROR] Kakao API Error: {response.status_code}")
                    return []
        
        except Exception as e:
            print(f"[ERROR] Error searching places: {e}")
            return []
    
    def transform_place(
        self,
        kakao_place: Dict,
        category_name: str
    ) -> Dict:
        """Kakao 장소 데이터를 Supabase 스키마로 변환"""
        
        place_id = f"kakao-{kakao_place['id']}"
        
        # Vibe 태그 생성
        vibe_tags = VIBE_MAPPING.get(category_name, ["interesting"])
        
        # 가격 추정 (카테고리별)
        price_estimates = {
            "카페": 8000,
            "음식점": 15000,
            "술집": 20000,
            "공원": 0,
            "문화시설": 5000,
        }
        avg_price = price_estimates.get(category_name, 10000)
        
        return {
            "id": place_id,
            "name": kakao_place.get("place_name", ""),
            "address": kakao_place.get("address_name", ""),
            "latitude": float(kakao_place.get("y", 0)),
            "longitude": float(kakao_place.get("x", 0)),
            "primary_category": category_name,
            "secondary_categories": [kakao_place.get("category_name", "")],
            "vibe_tags": vibe_tags,
            "description": f"{kakao_place.get('place_name')} - {kakao_place.get('category_name')}",
            "average_rating": 4.0,  # 기본값 (실제 리뷰 API는 별도)
            "review_count": 0,
            "is_hidden_gem": False,
            "typical_crowd_level": "medium",
            "average_price": avg_price,
            "price_tier": "medium",
            "is_active": True
        }
    
    async def save_to_supabase(self, places: List[Dict]) -> int:
        """Supabase에 장소 데이터 저장"""
        
        if not places:
            return 0
        
        url = f"{SUPABASE_URL}/rest/v1/places"
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    headers=self.supabase_headers,
                    json=places
                )
                
                if response.status_code in [200, 201]:
                    print(f"[OK] Saved {len(places)} places to Supabase")
                    return len(places)
                else:
                    print(f"[ERROR] Supabase Error: {response.status_code}")
                    print(f"   Response: {response.text}")
                    return 0
        
        except Exception as e:
            print(f"[ERROR] Error saving to Supabase: {e}")
            return 0
    
    async def collect_region_category(
        self,
        region: str,
        category_name: str,
        category_code: str
    ):
        """특정 지역 + 카테고리의 장소 수집"""
        
        query = f"서울 {region} {category_name}"
        print(f"Searching: {query}")
        
        # 최대 3페이지 (45개)
        all_places = []
        for page in range(1, 4):
            places = await self.search_places(
                query=query,
                category_code=category_code,
                page=page
            )
            
            if not places:
                break
            
            all_places.extend(places)
            await asyncio.sleep(0.5)  # Rate limiting
        
        # 변환
        transformed = [
            self.transform_place(p, category_name)
            for p in all_places
        ]
        
        print(f"   Found {len(transformed)} places")
        return transformed
    
    async def collect_all(self):
        """모든 지역 + 카테고리 조합 수집"""
        
        print("=" * 60)
        print("Starting Kakao Place Collection")
        print("=" * 60)
        
        total_collected = 0
        batch = []
        
        for region in SEOUL_REGIONS:
            for category_name, category_code in CATEGORIES.items():
                places = await self.collect_region_category(
                    region,
                    category_name,
                    category_code
                )
                
                batch.extend(places)
                
                # 100개씩 배치로 저장
                if len(batch) >= 100:
                    saved = await self.save_to_supabase(batch)
                    total_collected += saved
                    batch = []
                    await asyncio.sleep(1)
        
        # 남은 데이터 저장
        if batch:
            saved = await self.save_to_supabase(batch)
            total_collected += saved
        
        print("=" * 60)
        print(f"[DONE] Collection Complete!")
        print(f"   Total Places Collected: {total_collected}")
        print("=" * 60)


async def main():
    """메인 실행 함수"""
    
    # API 키 확인
    if KAKAO_API_KEY == "YOUR_KAKAO_API_KEY":
        print("[ERROR] KAKAO_REST_API_KEY not set in .env")
        print("   Get your API key from: https://developers.kakao.com/")
        return
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[ERROR] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
        return
    
    collector = KakaoPlaceCollector()
    await collector.collect_all()


if __name__ == "__main__":
    asyncio.run(main())
