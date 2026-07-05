import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Enterprise settings using Pydantic Settings for structured, type-safe validation.
    Environment variables are automatically binded.
    """
    APP_NAME: str = "AegisRoute-Enterprise-Backend"
    APP_ENV: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Gemini Enterprise Credentials
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")

    # Ingestion Pipeline Constants
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/aegisroute"
    ENABLE_GPU_ACCELERATION: bool = True
    CUDA_VISIBLE_DEVICES: str = "0"

    # Global Performance Settings
    SPEEDUP_CPU_BENCHMARK_SEC: float = 2310.0  # Legacy multi-node CPU Benchmark (38.5 mins)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


# Instantiate settings as a reusable singleton
settings = Settings()
