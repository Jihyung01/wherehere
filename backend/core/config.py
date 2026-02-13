"""
Configuration Management
"""

from pydantic_settings import BaseSettings
from typing import List, Optional, Union
from functools import lru_cache
from pydantic import field_validator
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "WhereHere API"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = ""

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # Security
    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # AI
    ANTHROPIC_API_KEY: str = ""

    # Kakao Maps
    KAKAO_REST_API_KEY: str = ""

    # OpenWeatherMap
    OPENWEATHER_API_KEY: str = ""

    # CORS
    ALLOWED_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    @field_validator('ALLOWED_ORIGINS', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            # JSON 배열 형식 시도
            if v.startswith('['):
                try:
                    return json.loads(v)
                except:
                    pass
            # 쉼표로 구분된 문자열
            return [origin.strip() for origin in v.split(',')]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
