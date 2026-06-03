"""Storage protocol — any backend implementing this can drop in."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from agentsentry.models import Agent, Scan


@runtime_checkable
class Storage(Protocol):
    """Persistence interface for AgentSentry."""

    async def save_agent(self, agent: Agent) -> Agent: ...
    async def get_agent(self, agent_id: str) -> Agent | None: ...
    async def list_agents(self) -> list[Agent]: ...

    async def save_scan(self, scan: Scan) -> Scan: ...
    async def get_scan(self, scan_id: str) -> Scan | None: ...
    async def list_scans(self, agent_id: str | None = None) -> list[Scan]: ...
