"""Scan — a single scan run of N attacks against one agent."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from agentsentry.models.finding import Finding


class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScanCreate(BaseModel):
    """Request body for triggering a scan."""

    agent_id: str
    attacks: list[str] | None = Field(
        default=None,
        description=(
            "Attack ids to run. If None, all registered attacks run. "
            "Useful for re-testing a specific finding after a fix."
        ),
    )
    defense_enabled: bool = Field(
        default=False,
        description=(
            "When true, wrap the target with Runtime Guard (capability policy + "
            "heuristic Prompt Shields) so defended agents score higher."
        ),
    )


class Scan(BaseModel):
    """A scan run with all of its findings."""

    id: str
    agent_id: str
    status: ScanStatus
    findings: list[Finding] = []
    posture_score: float | None = Field(
        default=None,
        description="0.0–100.0. Higher = more defended. Computed after scan completes.",
    )
    defense_enabled: bool = False
    started_at: datetime
    completed_at: datetime | None = None
    error: str | None = None

    @property
    def critical_findings(self) -> list[Finding]:
        return [f for f in self.findings if f.severity == "critical" and f.status == "vulnerable"]
