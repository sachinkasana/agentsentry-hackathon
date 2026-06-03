"""In-memory storage backend.

Single process, lost on restart — fine for Day 1 and tests. Swap with a
CosmosStorage implementation that satisfies the same Storage protocol.
"""

from __future__ import annotations

from functools import lru_cache

from agentsentry.models import Agent, Scan


class InMemoryStorage:
    """Dict-backed storage. Thread-safety is *not* guaranteed — single asyncio loop assumed."""

    def __init__(self) -> None:
        self._agents: dict[str, Agent] = {}
        self._scans: dict[str, Scan] = {}

    async def save_agent(self, agent: Agent) -> Agent:
        self._agents[agent.id] = agent
        return agent

    async def get_agent(self, agent_id: str) -> Agent | None:
        return self._agents.get(agent_id)

    async def list_agents(self) -> list[Agent]:
        return list(self._agents.values())

    async def save_scan(self, scan: Scan) -> Scan:
        self._scans[scan.id] = scan
        return scan

    async def get_scan(self, scan_id: str) -> Scan | None:
        return self._scans.get(scan_id)

    async def list_scans(self, agent_id: str | None = None) -> list[Scan]:
        all_scans = list(self._scans.values())
        if agent_id is None:
            return all_scans
        return [s for s in all_scans if s.agent_id == agent_id]


@lru_cache(maxsize=1)
def get_storage() -> InMemoryStorage:
    """Return the singleton in-memory storage instance."""
    return InMemoryStorage()
