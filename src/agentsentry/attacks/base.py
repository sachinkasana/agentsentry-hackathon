"""Base class for adversarial attacks against agent targets."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, ClassVar

from pydantic import BaseModel, Field

from agentsentry.models.attack import AttackMetadata
from agentsentry.models.finding import Finding, FindingStatus
from agentsentry.services.target_client import TargetAgent


class AttackResult(BaseModel):
    """Raw outcome of running an attack."""

    succeeded: bool = Field(
        description="True if the attack compromised the target (bad outcome for the target).",
    )
    trace: dict[str, Any] = Field(
        default_factory=dict,
        description="Full trace: payloads sent, target responses, judgement detail.",
    )
    error: str | None = None


class AttackBase(ABC):
    """Subclass + declare ``metadata`` + implement ``run``."""

    metadata: ClassVar[AttackMetadata]
    remediation: ClassVar[str] = ""

    @abstractmethod
    async def run(self, target: TargetAgent) -> AttackResult:
        """Execute the attack against ``target`` and return the raw result."""
        raise NotImplementedError

    def to_finding(self, scan_id: str, result: AttackResult) -> Finding:
        """Convert an AttackResult into a persistable Finding."""
        if result.error is not None and not result.succeeded:
            status = FindingStatus.ERROR
        elif result.succeeded:
            status = FindingStatus.VULNERABLE
        else:
            status = FindingStatus.DEFENDED

        return Finding(
            id=f"fnd_{uuid.uuid4().hex[:10]}",
            scan_id=scan_id,
            attack_id=self.metadata.id,
            attack_name=self.metadata.name,
            severity=self.metadata.severity.value,
            category=self.metadata.category.value,
            status=status,
            evidence=result.trace,
            remediation=self.remediation if status == FindingStatus.VULNERABLE else None,
            created_at=datetime.now(timezone.utc),
        )
