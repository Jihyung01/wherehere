"""
FastAPI Dependencies - Graceful DB handling
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg

from .security import verify_supabase_jwt, SupabaseUser
from .config import settings


security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SupabaseUser:
    token = credentials.credentials
    user = verify_supabase_jwt(token)
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[SupabaseUser]:
    if credentials is None:
        return None
    try:
        token = credentials.credentials
        user = verify_supabase_jwt(token)
        return user
    except HTTPException:
        return None


class Database:
    """Database connection manager with graceful fallback"""

    pool: Optional[asyncpg.Pool] = None
    connected: bool = False
    helpers: Optional[object] = None

    @classmethod
    async def connect(cls):
        if not settings.DATABASE_URL:
            print("⚠️  DATABASE_URL not set - running in mock mode")
            return

        try:
            cls.pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=2,
                max_size=10,
                command_timeout=30
            )
            cls.connected = True
            
            # DB 헬퍼 초기화
            from db.helpers import DatabaseHelpers
            cls.helpers = DatabaseHelpers(cls.pool)
            
            print("✅ Database connected")
        except Exception as e:
            print(f"⚠️  Database connection failed: {e}")
            print("📦 Running in mock mode - all features work with sample data")

    @classmethod
    async def disconnect(cls):
        if cls.pool:
            await cls.pool.close()
            cls.connected = False
            cls.helpers = None
            print("Database disconnected")

    @classmethod
    def is_connected(cls) -> bool:
        return cls.connected and cls.pool is not None

    @classmethod
    def get_pool(cls) -> asyncpg.Pool:
        if not cls.pool:
            raise RuntimeError("Database pool not initialized")
        return cls.pool
    
    @classmethod
    def get_helpers(cls):
        """DB 헬퍼 메서드 반환"""
        if not cls.helpers:
            raise RuntimeError("Database helpers not initialized")
        return cls.helpers


async def get_db():
    """Get database helpers - returns helpers object if connected"""
    if Database.is_connected():
        return Database.get_helpers()
    return None
