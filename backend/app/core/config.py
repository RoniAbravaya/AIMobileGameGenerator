"""
Application Configuration

Centralizes all configuration using Pydantic Settings for type-safe
environment variable handling.
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field, PostgresDsn, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "GameFactory"
    app_version: str = "0.1.0"
    debug: bool = False
    environment: str = "development"

    # API
    api_v1_prefix: str = "/api/v1"
    cors_origins: List[str] = ["http://localhost:3000"]

    # Database
    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://gamefactory:gamefactory@localhost:5432/gamefactory"
    )
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # Redis
    redis_url: RedisDsn = Field(default="redis://localhost:6379/0")
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # GitHub
    github_token: Optional[str] = None
    github_org: str = "gamefactory-games"
    github_template_repo: str = "flame-game-template"

    # AI Services
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ai_model: str = "gpt-4-turbo-preview"

    # Firebase
    firebase_project_id: Optional[str] = None
    firebase_credentials_path: Optional[str] = None

    # Asset Generation
    asset_storage_path: str = "./storage/assets"
    asset_cdn_url: Optional[str] = None

    # Workflow Settings
    max_step_retries: int = 3
    step_timeout_seconds: int = 600
    batch_default_size: int = 10

    # Security
    secret_key: str = "change-me-in-production"
    api_key_header: str = "X-API-Key"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
