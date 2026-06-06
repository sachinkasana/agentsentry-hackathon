"""In-memory runtime event bus for guard decisions."""

from __future__ import annotations

import asyncio
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


class RuntimeEvent(BaseModel):
    """A single guard decision emitted at runtime."""

    id: str
    timestamp: str
    agent_id: str
    event_type: str  # blocked | allowed | policy_violation
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)


class RuntimeEventBus:
    """Thread-safe-ish event store with SSE subscriber queues."""

    def __init__(self, *, max_history: int = 200) -> None:
        self._history: deque[RuntimeEvent] = deque(maxlen=max_history)
        self._subscribers: list[asyncio.Queue[RuntimeEvent]] = []

    def emit(
        self,
        *,
        agent_id: str,
        event_type: str,
        summary: str,
        details: dict[str, Any] | None = None,
    ) -> RuntimeEvent:
        event = RuntimeEvent(
            id=f"evt_{uuid.uuid4().hex[:10]}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            agent_id=agent_id,
            event_type=event_type,
            summary=summary,
            details=details or {},
        )
        self._history.appendleft(event)
        for queue in self._subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                pass
        return event

    def list_recent(self, *, limit: int = 50) -> list[RuntimeEvent]:
        return list(self._history)[:limit]

    def subscribe(self) -> asyncio.Queue[RuntimeEvent]:
        queue: asyncio.Queue[RuntimeEvent] = asyncio.Queue(maxsize=100)
        self._subscribers.append(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[RuntimeEvent]) -> None:
        if queue in self._subscribers:
            self._subscribers.remove(queue)


# Process-wide bus for the control plane demo.
EVENT_BUS = RuntimeEventBus()
