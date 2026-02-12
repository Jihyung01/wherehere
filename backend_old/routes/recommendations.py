"""
Recommendations API Routes
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List
import asyncpg

from core.dependencies import get_db
from recommendation_engine import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationEngine
)

router = APIRouter(
    prefix="/api/v1/recommendations",
    tags=["recommendations"]
)


@router.post("", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    pool: asyncpg.Pool = Depends(get_db)
):
    """
    Get personalized place recommendations based on user role and location
    """
    try:
        engine = RecommendationEngine(pool)
        recommendations = await engine.get_recommendations(request)
        return recommendations
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get recommendations: {str(e)}"
        )
