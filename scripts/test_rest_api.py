# -*- coding: utf-8 -*-
"""REST API로 장소 데이터 확인"""
import os
import asyncio
import httpx
from pathlib import Path
from dotenv import load_dotenv

backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def test_rest_api():
    """REST API 테스트"""
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    # 장소 조회
    url = f"{SUPABASE_URL}/rest/v1/places"
    params = {
        "select": "*",
        "is_active": "eq.true",
        "limit": 3
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, params=params)
        places = response.json()
        
        print("=== Places from REST API ===\n")
        for i, place in enumerate(places, 1):
            print(f"{i}. {place.get('name')}")
            print(f"   ID: {place.get('id')}")
            print(f"   Category: {place.get('primary_category')}")
            print(f"   Latitude: {place.get('latitude')}")
            print(f"   Longitude: {place.get('longitude')}")
            print(f"   Address: {place.get('address')}")
            print()

if __name__ == "__main__":
    asyncio.run(test_rest_api())
