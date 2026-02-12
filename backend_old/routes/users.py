"""
User Routes
Handles user profile management
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from datetime import datetime

from core import get_current_user, get_db, SupabaseUser
from models import UserProfile, UserUpdate, OnboardingData, UserStats


router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(
    user: SupabaseUser = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """
    Get current user's profile
    """
    
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT 
                id, username, display_name, bio, profile_image_url,
                current_role, level, total_xp, xp_to_next_level,
                current_streak, longest_streak, last_active_date,
                ST_Y(last_location::geometry) as last_lat,
                ST_X(last_location::geometry) as last_lon,
                ST_Y(home_location::geometry) as home_lat,
                ST_X(home_location::geometry) as home_lon,
                is_onboarded, onboarding_completed_at,
                created_at, updated_at, is_active
            FROM users
            WHERE id = $1
            """,
            user.id
        )
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Convert to dict and handle location
        user_data = dict(row)
        user_data['email'] = user.email
        
        # Parse locations
        if row['last_lat'] and row['last_lon']:
            user_data['last_location'] = {
                'latitude': row['last_lat'],
                'longitude': row['last_lon']
            }
        else:
            user_data['last_location'] = None
            
        if row['home_lat'] and row['home_lon']:
            user_data['home_location'] = {
                'latitude': row['home_lat'],
                'longitude': row['home_lon']
            }
        else:
            user_data['home_location'] = None
        
        # Remove raw lat/lon fields
        for key in ['last_lat', 'last_lon', 'home_lat', 'home_lon']:
            user_data.pop(key, None)
        
        return UserProfile(**user_data)


@router.patch("/me", response_model=UserProfile)
async def update_current_user_profile(
    update_data: UserUpdate,
    user: SupabaseUser = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """
    Update current user's profile
    """
    
    # Build update query dynamically
    update_fields = []
    values = []
    param_count = 1
    
    for field, value in update_data.model_dump(exclude_unset=True).items():
        if value is not None:
            update_fields.append(f"{field} = ${param_count}")
            values.append(value)
            param_count += 1
    
    if not update_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    # Add user_id to values
    values.append(user.id)
    
    query = f"""
        UPDATE users
        SET {', '.join(update_fields)}, updated_at = NOW()
        WHERE id = ${param_count}
        RETURNING *
    """
    
    async with db.acquire() as conn:
        row = await conn.fetchrow(query, *values)
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Fetch full profile
        return await get_current_user_profile(user, db)


@router.post("/me/onboarding", response_model=UserProfile)
async def complete_onboarding(
    onboarding_data: OnboardingData,
    user: SupabaseUser = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """
    Complete user onboarding
    Sets username, display name, role, and marks onboarding as complete
    """
    
    async with db.acquire() as conn:
        # Check if username is taken
        existing = await conn.fetchval(
            "SELECT id FROM users WHERE username = $1 AND id != $2",
            onboarding_data.username,
            user.id
        )
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Update user profile
        home_location_sql = None
        if onboarding_data.home_location:
            lat = onboarding_data.home_location['latitude']
            lon = onboarding_data.home_location['longitude']
            home_location_sql = f"ST_SetSRID(ST_MakePoint({lon}, {lat}), 4326)::geography"
        
        if home_location_sql:
            query = f"""
                UPDATE users
                SET 
                    username = $1,
                    display_name = $2,
                    current_role = $3,
                    home_location = {home_location_sql},
                    is_onboarded = TRUE,
                    onboarding_completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *
            """
        else:
            query = """
                UPDATE users
                SET 
                    username = $1,
                    display_name = $2,
                    current_role = $3,
                    is_onboarded = TRUE,
                    onboarding_completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = $4
                RETURNING *
            """
        
        await conn.execute(
            query,
            onboarding_data.username,
            onboarding_data.display_name,
            onboarding_data.current_role.value,
            user.id
        )
        
        # Return updated profile
        return await get_current_user_profile(user, db)


@router.get("/me/stats", response_model=UserStats)
async def get_user_stats(
    user: SupabaseUser = Depends(get_current_user),
    db: asyncpg.Pool = Depends(get_db)
):
    """
    Get user statistics
    """
    
    async with db.acquire() as conn:
        stats = await conn.fetchrow(
            """
            SELECT 
                COUNT(DISTINCT q.quest_id) as total_quests,
                COUNT(DISTINCT CASE WHEN q.status = 'completed' THEN q.quest_id END) as completed_quests,
                COUNT(DISTINCT al.place_id) as total_places_visited,
                COUNT(DISTINCT n.narrative_id) as total_narratives
            FROM users u
            LEFT JOIN quests q ON u.id = q.user_id
            LEFT JOIN activity_logs al ON u.id = al.user_id
            LEFT JOIN narratives n ON u.id = n.user_id
            WHERE u.id = $1
            GROUP BY u.id
            """,
            user.id
        )
        
        if not stats:
            return UserStats()
        
        # Get favorite categories
        categories = await conn.fetch(
            """
            SELECT p.primary_category, COUNT(*) as visit_count
            FROM activity_logs al
            JOIN places p ON al.place_id = p.place_id
            WHERE al.user_id = $1
            GROUP BY p.primary_category
            ORDER BY visit_count DESC
            LIMIT 5
            """,
            user.id
        )
        
        favorite_categories = [row['primary_category'] for row in categories]
        
        return UserStats(
            total_quests=stats['total_quests'] or 0,
            completed_quests=stats['completed_quests'] or 0,
            total_places_visited=stats['total_places_visited'] or 0,
            total_narratives=stats['total_narratives'] or 0,
            favorite_categories=favorite_categories
        )


@router.get("/{user_id}", response_model=UserProfile)
async def get_user_by_id(
    user_id: str,
    db: asyncpg.Pool = Depends(get_db)
):
    """
    Get user profile by ID (public data only)
    """
    
    async with db.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT 
                id, username, display_name, bio, profile_image_url,
                current_role, level, total_xp,
                current_streak, longest_streak,
                is_onboarded, created_at, is_active
            FROM users
            WHERE id = $1 AND is_active = TRUE
            """,
            user_id
        )
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Convert to dict
        user_data = dict(row)
        user_data['email'] = "hidden@privacy.com"  # Hide email for privacy
        user_data['xp_to_next_level'] = 0
        user_data['last_active_date'] = None
        user_data['last_location'] = None
        user_data['home_location'] = None
        user_data['onboarding_completed_at'] = None
        user_data['updated_at'] = row['created_at']
        
        return UserProfile(**user_data)
