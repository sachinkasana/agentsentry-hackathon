"""Persistence — agents, scans, findings.

Day 1: in-memory (singleton dict-backed).
Day 2: swap to Cosmos DB by implementing the same Storage protocol.
"""

from agentsentry.storage.base import Storage
from agentsentry.storage.memory import InMemoryStorage, get_storage

__all__ = ["Storage", "InMemoryStorage", "get_storage"]
