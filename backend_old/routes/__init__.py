"""Routes module"""
from .users import router as users_router
from .recommendations import router as recommendations_router

__all__ = ["users_router", "recommendations_router"]
