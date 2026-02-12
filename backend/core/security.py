"""
Security - JWT Verification
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import HTTPException, status
from jose import jwt, JWTError

from .config import settings


class SupabaseUser(BaseModel):
    id: str
    email: Optional[str] = None
    role: str = "authenticated"


def verify_supabase_jwt(token: str) -> SupabaseUser:
    """Verify Supabase JWT token"""
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            audience="authenticated"
        )

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "authenticated")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user ID"
            )

        return SupabaseUser(id=user_id, email=email, role=role)

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )
