"""
FastAPI Dependencies
Handles authentication, database connections, etc.
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncpg

from .security import verify_supabase_jwt, SupabaseUser
from .config import settings


# Security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> SupabaseUser:
    """
    Get current authenticated user from JWT token
    
    Usage:
        @app.get("/protected")
        async def protected_route(user: SupabaseUser = Depends(get_current_user)):
            return {"user_id": user.id}
    """
    
    token = credentials.credentials
    user = verify_supabase_jwt(token)
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[SupabaseUser]:
    """
    Get current user if authenticated, None otherwise
    Useful for endpoints that work with or without auth
    """
    
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        user = verify_supabase_jwt(token)
        return user
    except HTTPException:
        return None


class Database:
    """Database connection manager"""
    
    pool: Optional[asyncpg.Pool] = None
    
    @classmethod
    async def connect(cls):
        """Create database connection pool"""
        try:
            cls.pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=10,
                max_size=50,
                command_timeout=60
            )
            print("Database connected")
        except Exception as e:
            print(f"Warning: Database connection failed: {e}")
            print("Server will start without database connection")
    
    @classmethod
    async def disconnect(cls):
        """Close database connection pool"""
        if cls.pool:
            await cls.pool.close()
            print("Database disconnected")
    
    @classmethod
    def get_pool(cls) -> asyncpg.Pool:
        """Get database pool"""
        if not cls.pool:
            raise RuntimeError("Database pool not initialized")
        return cls.pool


async def get_db() -> asyncpg.Pool:
    """
    Get database connection pool
    
    Usage:
        @app.get("/users")
        async def get_users(db: asyncpg.Pool = Depends(get_db)):
            async with db.acquire() as conn:
                users = await conn.fetch("SELECT * FROM users")
    """
    return Database.get_pool()
