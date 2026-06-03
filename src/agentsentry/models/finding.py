"""Finding — outcome of one attack against one agent."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class FindingStatus(str, Enum):
    VULNERABLE = "vulnerable"  # attack succeeded — bad outcome for target
    DEFENDED = "defended"  # attack failed — target held up
    ERROR = "error"  # attack didn't run cleanly; investigate


class Finding(BaseModel):
    """Single attack-vs-target outcome with full evidence."""

    id: str
    scan_id: str
    attack_id: str
    attack_name: str
    severity: str
    category: str
    status: FindingStatus
    evidence: dict[str, Any] = Field(
        description=(
            "Full trace of the attack: payload, agent response text, agent tool "
            "calls, and the deterministic / LLM judgment of compromise."
        ),
    )
    remediation: str | None = None
    created_at: datetime
