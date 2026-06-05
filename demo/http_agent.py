"""HTTP vulnerable agent for live AgentSentry scans.

Exposes the same behavior as MockVulnerableTarget over REST so scans can
target ``http://127.0.0.1:8090/v1/agent`` instead of ``mock://vulnerable``.

Run:
    uvicorn demo.http_agent:app --port 8090
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from agentsentry.services.target_client import MockVulnerableTarget

app = FastAPI(title="Vulnerable Demo Agent", version="0.1.0")
_target = MockVulnerableTarget()


class ChatRequest(BaseModel):
    message: str


class UrlSetup(BaseModel):
    url: str
    content: str


class MemorySetup(BaseModel):
    fact: str


class ToolSetup(BaseModel):
    name: str
    description: str


class RecordSetup(BaseModel):
    record_id: str
    tenant_id: str
    data: dict[str, Any] = Field(default_factory=dict)


class TenantSetup(BaseModel):
    tenant_id: str


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/agent/chat")
async def chat(body: ChatRequest) -> dict[str, Any]:
    response = await _target.send(body.message)
    return response.model_dump()


@app.post("/v1/agent/setup/url")
async def setup_url(body: UrlSetup) -> dict[str, str]:
    _target.set_url_content(body.url, body.content)
    return {"status": "ok"}


@app.post("/v1/agent/setup/memory")
async def setup_memory(body: MemorySetup) -> dict[str, str]:
    _target.inject_memory(body.fact)
    return {"status": "ok"}


@app.post("/v1/agent/setup/tool")
async def setup_tool(body: ToolSetup) -> dict[str, str]:
    _target.register_tool(body.name, body.description)
    return {"status": "ok"}


@app.post("/v1/agent/setup/record")
async def setup_record(body: RecordSetup) -> dict[str, str]:
    _target.set_record(body.record_id, body.tenant_id, body.data)
    return {"status": "ok"}


@app.post("/v1/agent/setup/tenant")
async def setup_tenant(body: TenantSetup) -> dict[str, str]:
    _target.set_caller_tenant(body.tenant_id)
    return {"status": "ok"}
