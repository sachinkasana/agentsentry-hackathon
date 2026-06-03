"""Configuration loaded from environment / .env file."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for AgentSentry control plane."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    env: Literal["local", "dev", "prod"] = "local"
    log_level: str = "INFO"

    # Storage
    storage_backend: Literal["memory", "cosmos"] = "memory"
    cosmos_connection_string: str | None = None

    # Azure OpenAI — target + judge models
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment_target: str = "gpt-4o"
    azure_openai_deployment_judge: str = "gpt-4o-mini"
    azure_openai_api_version: str = "2024-10-21"

    # Azure AI Content Safety — Prompt Shields
    azure_content_safety_endpoint: str | None = None
    azure_content_safety_key: str | None = None

    # Azure AI Foundry
    azure_foundry_project_endpoint: str | None = None
    azure_foundry_project_name: str = "agentsentry-targets"

    # App Insights
    applicationinsights_connection_string: str | None = None

    # Demo
    agentsentry_demo_target: str = "mock"

    @property
    def azure_openai_configured(self) -> bool:
        return bool(self.azure_openai_endpoint and self.azure_openai_api_key)

    @property
    def content_safety_configured(self) -> bool:
        return bool(self.azure_content_safety_endpoint and self.azure_content_safety_key)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached singleton settings."""
    # Settings is populated from env vars + .env automatically. The pyright/mypy
    # complaint about required arguments is a known false positive with
    # pydantic-settings.
    return Settings()  # type: ignore[call-arg]
