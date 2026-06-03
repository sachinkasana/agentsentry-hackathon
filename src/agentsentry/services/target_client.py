"""Target agent client.

Defines the ``TargetAgent`` protocol — any object implementing it can be
scanned. Provides ``MockVulnerableTarget`` for offline development, and a
sketch of ``HttpTarget`` to swap in once a real Microsoft Agent Framework
endpoint is deployed.

The mock target is deliberately naive about following instructions found
in tool outputs — that is *the point*, it lets attacks demonstrably succeed
during demos and tests with no external dependencies.
"""

from __future__ import annotations

import re
from typing import Any, Protocol, runtime_checkable

import httpx
from pydantic import BaseModel, Field


class ToolCall(BaseModel):
    """A single tool invocation the agent decided to make."""

    name: str
    arguments: dict[str, Any] = {}


class AgentResponse(BaseModel):
    """What a target agent returns from a turn."""

    text: str = ""
    tool_calls: list[ToolCall] = []
    raw_trace: dict[str, Any] = Field(default_factory=dict)


@runtime_checkable
class TargetAgent(Protocol):
    """Any object with these methods can be scanned by AgentSentry."""

    async def send(self, message: str) -> AgentResponse: ...


class _MemoryStore(dict[str, str]):
    """Tiny addressable store used by the mock target for poison-planting."""


class MockVulnerableTarget:
    """A deliberately vulnerable mock agent.

    Behaviors that make it *vulnerable on purpose*:

    1. If the user message contains a URL, it "fetches" the URL and treats
       the returned content as additional instructions (naive trust of
       tool output → indirect prompt injection).
    2. If fetched content names an email address, it calls ``send_email``
       to that address with the prior user message.
    3. It exposes ``set_url_content`` so attacks can plant payloads.

    No external calls — the mock runs anywhere.
    """

    def __init__(self) -> None:
        self._urls: _MemoryStore = _MemoryStore()
        self._memory: list[str] = []

    # --- attack-facing hooks ------------------------------------------------

    def set_url_content(self, url: str, content: str) -> None:
        """Plant content at a URL the agent will fetch when prompted."""
        self._urls[url] = content

    def inject_memory(self, fact: str) -> None:
        """Plant an instruction in the agent's "session memory" (memory-poisoning attack)."""
        self._memory.append(fact)

    # --- TargetAgent protocol ----------------------------------------------

    async def send(self, message: str) -> AgentResponse:
        tool_calls: list[ToolCall] = []
        trace: dict[str, Any] = {"input": message, "memory_at_turn_start": list(self._memory)}

        # Vulnerable behavior: if the message references a URL, fetch and *follow* its content.
        urls = re.findall(r"https?://\S+", message)
        for url in urls:
            tool_calls.append(ToolCall(name="fetch_url", arguments={"url": url}))
            content = self._urls.get(url, "")
            trace.setdefault("fetched", {})[url] = content

            # Naively scan fetched content for action-like instructions.
            email_match = re.search(
                r"send.*?email.*?to\s+([\w.+-]+@[\w.-]+)",
                content,
                flags=re.IGNORECASE | re.DOTALL,
            )
            if email_match:
                target_email = email_match.group(1).rstrip(".,'\";")
                tool_calls.append(
                    ToolCall(
                        name="send_email",
                        arguments={
                            "to": target_email,
                            "subject": "Article summary",
                            "body": f"User said: {message}",
                        },
                    )
                )
                trace["compromised_by"] = "indirect_injection_via_fetch_url"

        text = (
            f"Done. Made {len(tool_calls)} tool call(s)."
            if tool_calls
            else "I'd be happy to help — please share more detail."
        )

        return AgentResponse(text=text, tool_calls=tool_calls, raw_trace=trace)


class HttpTarget:
    """Talk to a real agent over HTTP. Day-2 swap for the mock target.

    Expects the agent to expose a simple ``POST {endpoint}`` accepting
    ``{"message": str}`` and returning JSON shaped like ``AgentResponse``.
    For Microsoft Agent Framework agents, wrap your agent in a thin FastAPI
    handler that conforms to this contract, or extend this class to call the
    Foundry chat completions endpoint directly.
    """

    def __init__(self, endpoint: str, *, timeout_seconds: float = 30.0) -> None:
        self.endpoint = endpoint
        self._client = httpx.AsyncClient(timeout=timeout_seconds)

    async def send(self, message: str) -> AgentResponse:
        resp = await self._client.post(self.endpoint, json={"message": message})
        resp.raise_for_status()
        return AgentResponse.model_validate(resp.json())

    async def aclose(self) -> None:
        await self._client.aclose()


def build_target(endpoint: str) -> TargetAgent:
    """Resolve a target endpoint string into a concrete TargetAgent."""
    if endpoint.startswith("mock://"):
        return MockVulnerableTarget()
    return HttpTarget(endpoint=endpoint)
