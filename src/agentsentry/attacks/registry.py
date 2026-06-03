"""Central registry of attacks.

Attacks self-register via ``@register_attack`` so the scan runner can
discover them without hardcoded imports beyond what's done here.
"""

from __future__ import annotations

from typing import TypeVar

from agentsentry.attacks.base import AttackBase

T = TypeVar("T", bound=type[AttackBase])

ATTACK_REGISTRY: dict[str, type[AttackBase]] = {}


def register_attack(cls: T) -> T:
    """Class decorator: register an AttackBase subclass by its metadata.id."""
    meta = getattr(cls, "metadata", None)
    if meta is None:
        raise TypeError(f"{cls.__name__} is missing required `metadata` class attribute")
    if meta.id in ATTACK_REGISTRY:
        raise ValueError(f"Attack id {meta.id!r} already registered")
    ATTACK_REGISTRY[meta.id] = cls
    return cls


def all_attacks() -> list[type[AttackBase]]:
    """Return every registered attack class."""
    return list(ATTACK_REGISTRY.values())


def get_attack(attack_id: str) -> type[AttackBase]:
    if attack_id not in ATTACK_REGISTRY:
        raise KeyError(f"Unknown attack id: {attack_id!r}")
    return ATTACK_REGISTRY[attack_id]


# Eager imports so registration side effects run on package import.
# Add new attacks below.
from agentsentry.attacks import (  # noqa: E402, F401  (registration side effects)
    confused_deputy,
    exfiltration_url,
    identity_spoofing,
    indirect_injection,
    memory_poisoning,
    tool_poisoning,
)
