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
    supabase_client: Optional[object] = None

    @classmethod
    async def connect(cls):
        """Supabase REST API로 직접 연결 (PostgreSQL 우회)"""
        import logging
        logger = logging.getLogger("uvicorn.error")
        
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            logger.warning("Supabase credentials not set - running in mock mode")
            return
        
        # Supabase REST API 사용 (PostgreSQL 연결 문제 우회)
        try:
            from db.rest_helpers import RestDatabaseHelpers
            cls.helpers = RestDatabaseHelpers()
            cls.connected = True
            cls.supabase_client = cls.helpers  # 호환성
            
            logger.info("✅ Database connected via Supabase REST API")
            logger.info("✅ Real data mode activated!")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase REST client: {e}")
            logger.warning("Running in mock mode")

    @classmethod
    async def disconnect(cls):
        if cls.pool:
            await cls.pool.close()
            cls.connected = False
            cls.helpers = None
            print("Database disconnected")

    @classmethod
    def is_connected(cls) -> bool:
        return cls.connected or cls.supabase_client is not None

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
