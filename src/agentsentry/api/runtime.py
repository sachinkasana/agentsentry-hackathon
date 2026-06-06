"""/v1/runtime — live guard events via SSE."""

from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agentsentry.guard.events import EVENT_BUS

router = APIRouter(prefix="/v1/runtime", tags=["runtime"])


@router.get("/events")
async def stream_runtime_events() -> StreamingResponse:
    """Server-Sent Events stream of guard decisions."""

    async def event_generator():
        queue = EVENT_BUS.subscribe()
        try:
            for event in EVENT_BUS.list_recent(limit=20):
                yield f"data: {event.model_dump_json()}\n\n"

            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=30.0)
                    yield f"data: {event.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat'})}\n\n"
        finally:
            EVENT_BUS.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/events/recent")
async def list_recent_runtime_events(limit: int = 50) -> list[dict]:
    """Non-streaming fallback for dashboards."""
    return [e.model_dump() for e in EVENT_BUS.list_recent(limit=limit)]
