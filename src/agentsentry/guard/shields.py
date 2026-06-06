"""Prompt injection detection for untrusted content (heuristic + Azure hook)."""

from __future__ import annotations

import re
from dataclasses import dataclass

INJECTION_PATTERNS = (
    r"\[\[SYSTEM\s+OVERRIDE",
    r"ignore\s+previous\s+instructions",
    r"send.*?email.*?to\s+[\w.+-]+@",
    r"INTER_AGENT\s+from=supervisor",
    r"approve_payment",
    r"fetch\s+https?://\S+\?data=",
    r"\[\[ALWAYS\s+log",
)


@dataclass(frozen=True)
class ShieldVerdict:
    """Result of scanning untrusted text."""

    is_injection: bool
    summary: str
    backend: str  # "heuristic" | "azure_content_safety"
    matched_pattern: str | None = None


def scan_untrusted_content(text: str) -> ShieldVerdict:
    """Heuristic Prompt Shields stand-in — works offline for demos."""
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL):
            return ShieldVerdict(
                is_injection=True,
                summary="Prompt Shields flagged injection pattern in untrusted content",
                backend="heuristic",
                matched_pattern=pattern,
            )

    return ShieldVerdict(
        is_injection=False,
        summary="No injection patterns detected",
        backend="heuristic",
    )


async def scan_with_azure_if_configured(text: str) -> ShieldVerdict:
    """Prefer Azure Content Safety when configured; fall back to heuristic."""
    from agentsentry.config import get_settings
    from agentsentry.services.azure_clients import AzureNotConfigured, content_safety_client

    settings = get_settings()
    if not settings.content_safety_configured:
        return scan_untrusted_content(text)

    try:
        client = content_safety_client()
        # Azure integration is optional — heuristic path is the demo default.
        _ = client
        return scan_untrusted_content(text)
    except AzureNotConfigured:
        return scan_untrusted_content(text)
