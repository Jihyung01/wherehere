# -*- coding: utf-8 -*-
import os
import asyncio
import httpx
from pathlib import Path
from dotenv import load_dotenv

# backend/.env 로드
backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

KAKAO_API_KEY = os.getenv("KAKAO_REST_API_KEY")

async def test_kakao_api():
    """Kakao Local API 테스트"""
    
    print("=" * 60)
    print("Testing Kakao Local API")
    print("=" * 60)
    
    url = "https://dapi.kakao.com/v2/local/search/keyword.json"
    headers = {
        "Authorization": f"KakaoAK {KAKAO_API_KEY}"
    }
    params = {
        "query": "서울 강남구 카페",
        "x": 127.0276,  # 강남역
        "y": 37.4979,
        "radius": 20000,
        "page": 1,
        "size": 5
    }
    
    print(f"\nAPI Key: {KAKAO_API_KEY[:10]}...")
    print(f"Query: {params['query']}")
    print(f"\nSending request...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                places = data.get("documents", [])
                
                print(f"\n[OK] Found {len(places)} places!")
                print("\nFirst 3 places:")
                for i, place in enumerate(places[:3], 1):
                    print(f"\n{i}. {place.get('place_name')}")
                    print(f"   Address: {place.get('address_name')}")
                    print(f"   Category: {place.get('category_name')}")
                    print(f"   Location: ({place.get('y')}, {place.get('x')})")
            else:
                print(f"\n[ERROR] API Error: {response.status_code}")
                print(f"Response: {response.text}")
    
    except Exception as e:
        print(f"\n[ERROR] Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_kakao_api())
