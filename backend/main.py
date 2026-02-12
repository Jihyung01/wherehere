"""
WhereHere Backend API v2
Mock-First Architecture - Works immediately, upgrades with DB
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time

from core import settings, Database
from routes import users_router, recommendations_router, quests_router


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
