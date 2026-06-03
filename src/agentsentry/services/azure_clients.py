"""Factories for Azure SDK clients.

Kept lazy so the scaffold can be imported and tested with no Azure config.
Each factory raises a clear error if its required settings are missing.
"""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from agentsentry.config import get_settings

if TYPE_CHECKING:  # pragma: no cover
    from openai import AsyncAzureOpenAI


class AzureNotConfigured(RuntimeError):
    """Raised when an Azure-backed feature is invoked without configuration."""


@lru_cache(maxsize=1)
def azure_openai_client() -> "AsyncAzureOpenAI":
    """Return a singleton Azure OpenAI async client.

    Used by the judge model and (optionally) the live target adapter.
    """
    settings = get_settings()
    if not settings.azure_openai_configured:
        raise AzureNotConfigured(
            "Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT and "
            "AZURE_OPENAI_API_KEY in .env."
        )
    # Imported lazily so `pip install -e .` works without optional extras.
    from openai import AsyncAzureOpenAI

    return AsyncAzureOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        api_version=settings.azure_openai_api_version,
    )


def content_safety_client():  # noqa: ANN201 — runtime import
    """Return an Azure AI Content Safety client (Prompt Shields).

    Used by the runtime guard middleware (Day 3).
    """
    settings = get_settings()
    if not settings.content_safety_configured:
        raise AzureNotConfigured(
            "Azure AI Content Safety is not configured. Set "
            "AZURE_CONTENT_SAFETY_ENDPOINT and AZURE_CONTENT_SAFETY_KEY in .env."
        )
    from azure.ai.contentsafety import ContentSafetyClient
    from azure.core.credentials import AzureKeyCredential

    return ContentSafetyClient(
        endpoint=settings.azure_content_safety_endpoint,
        credential=AzureKeyCredential(settings.azure_content_safety_key),  # type: ignore[arg-type]
    )
