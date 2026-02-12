"""
Authentication Models
"""

from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    """Signup request"""
    email: EmailStr
    password: str
    username: str


class TokenResponse(BaseModel):
    """Token response"""
    access_token: str
    token_type: str = "bearer"
    user: dict


class AuthResponse(BaseModel):
    """Authentication response"""
    success: bool
    message: str
    user: Optional[dict] = None
    session: Optional[dict] = None
