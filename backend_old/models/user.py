"""
User Models
Pydantic models for user-related data
"""

from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class RoleType(str, Enum):
    """User role types"""
    EXPLORER = "explorer"
    HEALER = "healer"
    ARCHIVIST = "archivist"
    RELATION = "relation"
    ACHIEVER = "achiever"


class UserBase(BaseModel):
    """Base user model"""
    username: str = Field(..., min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    current_role: RoleType = RoleType.EXPLORER


class UserCreate(UserBase):
    """User creation model"""
    email: EmailStr


class UserUpdate(BaseModel):
    """User update model (all fields optional)"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = None
    current_role: Optional[RoleType] = None
    profile_image_url: Optional[str] = None


class UserProfile(UserBase):
    """Complete user profile"""
    id: str
    email: str
    profile_image_url: Optional[str] = None
    
    # Level & XP
    level: int = 1
    total_xp: int = 0
    xp_to_next_level: int = 100
    
    # Streak
    current_streak: int = 0
    longest_streak: int = 0
    last_active_date: Optional[date] = None
    
    # Location (lat, lon)
    last_location: Optional[dict] = None
    home_location: Optional[dict] = None
    
    # Onboarding
    is_onboarded: bool = False
    onboarding_completed_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    is_active: bool = True
    
    class Config:
        from_attributes = True


class OnboardingData(BaseModel):
    """Onboarding completion data"""
    username: str = Field(..., min_length=3, max_length=50)
    display_name: str = Field(..., min_length=1, max_length=100)
    current_role: RoleType
    home_location: Optional[dict] = None  # {"latitude": 37.5, "longitude": 127.0}


class UserStats(BaseModel):
    """User statistics"""
    total_quests: int = 0
    completed_quests: int = 0
    total_places_visited: int = 0
    total_narratives: int = 0
    favorite_categories: List[str] = []
