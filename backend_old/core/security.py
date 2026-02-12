"""
Security utilities for JWT verification and user authentication
"""

from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status
from pydantic import BaseModel

from .config import settings


class TokenData(BaseModel):
    """Token payload data"""
    sub: str  # user_id
    email: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class SupabaseUser(BaseModel):
    """Supabase user data from JWT"""
    id: str
    email: str
    role: str = "authenticated"
    aud: str = "authenticated"


def verify_supabase_jwt(token: str) -> SupabaseUser:
    """
    Verify Supabase JWT token
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        SupabaseUser object with user data
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT using Supabase JWT secret
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            audience="authenticated"
        )
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role", "authenticated")
        
        if user_id is None:
            raise credentials_exception
            
        return SupabaseUser(
            id=user_id,
            email=email,
            role=role,
            aud=payload.get("aud", "authenticated")
        )
        
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token
    
    Args:
        data: Data to encode in token
        expires_delta: Token expiration time
        
    Returns:
        Encoded JWT token
    """
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    
    return encoded_jwt
