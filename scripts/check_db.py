# -*- coding: utf-8 -*-
"""DB 데이터 확인"""
import os
import asyncio
import httpx
from pathlib import Path
from dotenv import load_dotenv

backend_env = Path(__file__).parent.parent / "backend" / ".env"
load_dotenv(backend_env)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def check_db():
    """DB 데이터 확인"""
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    
    # 1. 총 장소 수
    url = f"{SUPABASE_URL}/rest/v1/places?select=count"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        print(f"Total places: {response.headers.get('content-range', 'unknown')}")
    
    # 2. latitude/longitude 있는 장소 수
    url = f"{SUPABASE_URL}/rest/v1/places?select=id,name,latitude,longitude&limit=5"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        places = response.json()
        
        print("\nFirst 5 places:")
        for place in places:
            print(f"  {place['name']}")
            print(f"    ID: {place['id']}")
            print(f"    Lat: {place.get('latitude', 'NULL')}")
            print(f"    Lon: {place.get('longitude', 'NULL')}")
            print()
    
    # 3. latitude가 NULL인 장소 수
    url = f"{SUPABASE_URL}/rest/v1/places?select=count&latitude=is.null"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers)
        print(f"Places with NULL latitude: {response.headers.get('content-range', 'unknown')}")

if __name__ == "__main__":
    asyncio.run(check_db())
