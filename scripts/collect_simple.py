# -*- coding: utf-8 -*-
"""
간단한 Kakao 장소 수집 스크립트
"""
import os
import asyncio
import httpx
from pathlib import Path
from dotenv import load_dotenv

# .env 로드
backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

KAKAO_API_KEY = os.getenv("KAKAO_REST_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# 서울 주요 지역 (전체) + 수도권
REGIONS = [
    # 서울 25개 구
    "강남구", "강동구", "강북구", "강서구", "관악구",
    "광진구", "구로구", "금천구", "노원구", "도봉구",
    "동대문구", "동작구", "마포구", "서대문구", "서초구",
    "성동구", "성북구", "송파구", "양천구", "영등포구",
    "용산구", "은평구", "종로구", "중구", "중랑구",
    # 경기 분당 (성남시)
    "분당구 정자동", "분당구 서현동", "분당구 야탑동",
    # 경기 주요 지역
    "일산동구", "일산서구", "수지구", "기흥구", "광교동"
]

# 카테고리
CATEGORIES = {
    "카페": "CE7",
    "음식점": "FD6",
    "술집": "FD6",
}

async def search_places(query, page=1):
    """Kakao API로 장소 검색"""
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {"Authorization": f"KakaoAK {KAKAO_API_KEY}"}
    params = {
        "query": query,
        "x": 126.9780,
        "y": 37.5665,
        "radius": 20000,
        "page": page,
        "size": 15
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, params=params)
        if response.status_code == 200:
            return response.json().get("documents", [])
        return []

def transform_place(kakao_place, category_name):
    """장소 데이터 변환"""
    return {
        "id": f"kakao-{kakao_place['id']}",
        "name": kakao_place.get("place_name", ""),
        "address": kakao_place.get("address_name", ""),
        "latitude": float(kakao_place.get("y", 0)),
        "longitude": float(kakao_place.get("x", 0)),
        "primary_category": category_name,
        "secondary_categories": [kakao_place.get("category_name", "")],
        "vibe_tags": ["cozy", "popular"],
        "description": f"{kakao_place.get('place_name')} - {kakao_place.get('category_name')}",
        "average_rating": 4.0,
        "review_count": 0,
        "is_hidden_gem": False,
        "typical_crowd_level": "medium",
        "average_price": 10000 if category_name == "카페" else 15000,
        "price_tier": "medium",
        "is_active": True
    }

async def save_to_supabase(places):
    """Supabase에 저장 (중복 무시)"""
    url = f"{SUPABASE_URL}/rest/v1/places"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates"  # 중복 무시
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers=headers, json=places)
        if response.status_code in [200, 201]:
            print(f"  [OK] Saved {len(places)} places")
            return len(places)
        elif response.status_code == 409:
            print(f"  [SKIP] Duplicates ignored")
            return 0
        else:
            print(f"  [ERROR] {response.status_code}: {response.text[:100]}")
            return 0

async def main():
    """메인 실행"""
    print("=" * 60, flush=True)
    print("Kakao Place Collection (Simple)", flush=True)
    print("=" * 60, flush=True)
    
    total = 0
    batch = []
    
    for region in REGIONS:
        for cat_name, cat_code in CATEGORIES.items():
            # 지역명에 따라 쿼리 조정
            if "분당구" in region or "일산" in region or "수지구" in region or "기흥구" in region or "광교" in region:
                query = f"경기 {region} {cat_name}"
            else:
                query = f"서울 {region} {cat_name}"
            print(f"\nSearching: {query}", flush=True)
            
            # 2페이지 수집 (30개)
            places = []
            for page in [1, 2]:
                page_places = await search_places(query, page)
                places.extend(page_places)
                await asyncio.sleep(0.3)
            
            print(f"  Found: {len(places)} places", flush=True)
            
            if places:
                transformed = [transform_place(p, cat_name) for p in places]
                batch.extend(transformed)
                
                # 50개씩 저장
                if len(batch) >= 50:
                    saved = await save_to_supabase(batch)
                    total += saved
                    batch = []
            
            await asyncio.sleep(0.5)  # Rate limiting
    
    # 남은 데이터 저장
    if batch:
        saved = await save_to_supabase(batch)
        total += saved
    
    print("\n" + "=" * 60)
    print(f"[DONE] Total collected: {total} places")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
