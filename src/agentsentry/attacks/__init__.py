"""Attack pack — pluggable adversarial probes for agent targets.

Each attack subclasses ``AttackBase``, declares ``metadata`` describing what
it tests, and implements ``run`` to execute the attack against a target.

Attacks here are *agentic-specific* — they go beyond model-level content
harms to probe behaviors only emergent at the agent layer (tool calling,
multi-agent messaging, persistent memory, capability-bearing identities).

Day 1 ship:
  - indirect_injection_v1 — fully implemented + tested

Day 2 fill-in (stubs present):
  - tool_poisoning_v1
  - exfiltration_url_v1
  - identity_spoofing_v1
  - memory_poisoning_v1
  - confused_deputy_v1
"""

from agentsentry.attacks.base import AttackBase, AttackResult
from agentsentry.attacks.registry import ATTACK_REGISTRY, register_attack

__all__ = ["AttackBase", "AttackResult", "ATTACK_REGISTRY", "register_attack"]
