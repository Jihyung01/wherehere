# -*- coding: utf-8 -*-
"""
WhereHere Backend API v2
Mock-First Architecture - Works immediately, upgrades with DB
"""

import sys
import io
import os

# Windows 인코딩 문제 해결 - UTF-8로 강제 설정
if sys.platform == 'win32':
    # 환경 변수로 UTF-8 강제
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    # stdout/stderr를 UTF-8로 재설정
    if hasattr(sys.stdout, 'buffer'):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'buffer'):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from core import settings, Database
from routes import users_router, recommendations_router, quests_router
from routes.ai_features import router as ai_features_router
from routes.challenges import router as challenges_router
from routes.social import router as social_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Starting WhereHere API v2...")
    await Database.connect()

    if Database.is_connected():
        print("✅ Database: Connected (Real data mode)")
    else:
        print("📦 Database: Not connected (Mock data mode)")
        print("   → All APIs work with sample data!")

    print(f"🌐 API Docs: http://localhost:8000/docs")
    print(f"🏥 Health: http://localhost:8000/health")
    print("✨ WhereHere API Ready!")

    yield

    await Database.disconnect()
    print("👋 WhereHere API Shutdown")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="초개인화 AI 장소 추천 시스템 - WhereHere",
    lifespan=lifespan,
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Timing middleware
@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(round(time.time() - start, 4))
    return response


# Routers
app.include_router(users_router)
app.include_router(recommendations_router)
app.include_router(quests_router)
app.include_router(ai_features_router)
app.include_router(challenges_router)
app.include_router(social_router)


@app.get("/")
async def root():
    return {
        "app": "WhereHere API",
        "version": settings.APP_VERSION,
        "status": "running",
        "database": "connected" if Database.is_connected() else "mock_mode",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "database": "connected" if Database.is_connected() else "mock_mode",
        "environment": settings.ENVIRONMENT,
        "version": settings.APP_VERSION,
    }


# Global error handler
@app.exception_handler(Exception)
async def global_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        import traceback
        traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc) if settings.DEBUG else "Internal server error"},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
