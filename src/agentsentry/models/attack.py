"""Attack metadata and taxonomy."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel


class Severity(str, Enum):
    """Severity of a finding if an attack succeeds."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AttackCategory(str, Enum):
    """Maps directly to the hackathon theme keywords."""

    PROMPT_INJECTION = "prompt_injection"
    IDENTITY_SPOOFING = "identity_spoofing"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    ADVERSARIAL_MISUSE = "adversarial_misuse"


class AttackMetadata(BaseModel):
    """Static metadata describing an attack. One per AttackBase subclass."""

    id: str  # stable identifier, e.g. "indirect_injection_v1"
    name: str
    description: str
    severity: Severity
    category: AttackCategory
    theme_mapping: str  # human-readable mapping to hackathon theme keyword
    cwe: str | None = None  # CWE reference if applicable
    references: list[str] = []
