"""Application Configuration using Pydantic Settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global Application Settings."""

    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    GEMINI_TIMEOUT_SECONDS: float = 10.0

    # Environmental API Timeouts
    OPEN_METEO_TIMEOUT_SECONDS: float = 3.0
    OPENAQ_TIMEOUT_SECONDS: float = 2.5

    # In-Memory Cache
    CACHE_TTL_SECONDS: int = 900
    CACHE_MAX_ENTRIES: int = 512

    # Rate Limiting (AI Planner protection: 5 requests per 10 minutes)
    ASSISTANT_RATE_LIMIT_MAX_REQUESTS: int = 5
    ASSISTANT_RATE_LIMIT_WINDOW_SECONDS: int = 600

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
