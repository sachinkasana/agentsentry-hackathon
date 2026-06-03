"""Agent — a registered target that AgentSentry can scan or guard."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    """Request body for registering a new target agent."""

    name: str = Field(min_length=1, max_length=120, examples=["customer-support-agent"])
    endpoint: str = Field(
        description=(
            "Endpoint URL for the target agent. Use 'mock://vulnerable' for the "
            "built-in mock target during development."
        ),
        examples=["mock://vulnerable", "https://my-agent.foundry.azure.com/api/chat"],
    )
    framework: Literal["microsoft-agent-framework", "semantic-kernel", "autogen", "mock", "custom"] = (
        "microsoft-agent-framework"
    )
    tools: list[str] = Field(
        default_factory=list,
        description="Tool names this agent exposes (informational; helps choose relevant attacks).",
        examples=[["fetch_url", "send_email", "query_database"]],
    )
    description: str | None = None


class Agent(AgentCreate):
    """A registered target agent."""

    id: str
    created_at: datetime
