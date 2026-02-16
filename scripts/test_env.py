# -*- coding: utf-8 -*-
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# backend/.env 파일 로드
backend_env = Path(__file__).parent.parent / "backend" / ".env"
print(f"Loading .env from: {backend_env}")
print(f"File exists: {backend_env.exists()}")

load_dotenv(backend_env)

# API 키 확인
kakao_key = os.getenv("KAKAO_REST_API_KEY")
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print("\n=== Environment Variables ===")
print(f"KAKAO_REST_API_KEY: {kakao_key[:20]}... (length: {len(kakao_key) if kakao_key else 0})")
print(f"SUPABASE_URL: {supabase_url}")
print(f"SUPABASE_KEY: {supabase_key[:20] if supabase_key else 'None'}...")

if kakao_key and kakao_key != "YOUR_KAKAO_API_KEY":
    print("\n[OK] Kakao API key is set!")
else:
    print("\n[ERROR] Kakao API key not set!")

if supabase_url and supabase_key:
    print("[OK] Supabase credentials are set!")
else:
    print("[ERROR] Supabase credentials not set!")
