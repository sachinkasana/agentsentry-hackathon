"""/v1/agents — register and list target agents."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from agentsentry.models import Agent, AgentCreate
from agentsentry.storage import Storage, get_storage

router = APIRouter(prefix="/v1/agents", tags=["agents"])


def _new_agent_id() -> str:
    return f"agt_{uuid.uuid4().hex[:12]}"


@router.post("", response_model=Agent, status_code=status.HTTP_201_CREATED)
async def register_agent(
    body: AgentCreate,
    storage: Storage = Depends(get_storage),
) -> Agent:
    """Register a target agent so it can be scanned."""
    agent = Agent(
        **body.model_dump(),
        id=_new_agent_id(),
        created_at=datetime.now(timezone.utc),
    )
    return await storage.save_agent(agent)


@router.get("", response_model=list[Agent])
async def list_agents(storage: Storage = Depends(get_storage)) -> list[Agent]:
    return await storage.list_agents()


@router.get("/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str, storage: Storage = Depends(get_storage)) -> Agent:
    agent = await storage.get_agent(agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id!r} not found")
    return agent
