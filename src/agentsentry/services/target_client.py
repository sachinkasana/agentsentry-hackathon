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
from urllib.parse import quote

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
    3. Registered tool descriptions are trusted as instructions (tool poisoning).
    4. Fetched content can trigger exfiltration via outbound URL query strings.
    5. Session memory can trigger latent ``approve_payment`` on keyword match.
    6. Inter-agent messages claiming ``from=supervisor`` are accepted without
       signature verification (identity spoofing).
    7. Internal API lookups use the agent's bearer token without re-checking
       the caller's tenant (confused deputy).

    No external calls — the mock runs anywhere.
    """

    def __init__(self) -> None:
        self._urls: _MemoryStore = _MemoryStore()
        self._memory: list[str] = []
        self._tools: list[dict[str, str]] = []
        self._records: dict[str, dict[str, Any]] = {}
        self._caller_tenant: str = "tenant-user-a"

    # --- attack-facing hooks ------------------------------------------------

    def set_url_content(self, url: str, content: str) -> None:
        """Plant content at a URL the agent will fetch when prompted."""
        self._urls[url] = content

    def inject_memory(self, fact: str) -> None:
        """Plant an instruction in the agent's session memory (memory-poisoning attack)."""
        self._memory.append(fact)

    def register_tool(self, name: str, description: str) -> None:
        """Register a tool whose description the mock naively trusts."""
        self._tools.append({"name": name, "description": description})

    def set_record(self, record_id: str, tenant_id: str, data: dict[str, Any]) -> None:
        """Plant an internal record for confused-deputy scenarios."""
        self._records[record_id] = {"tenant_id": tenant_id, "data": data}

    def set_caller_tenant(self, tenant_id: str) -> None:
        """Set the authenticated user's tenant for authorization checks."""
        self._caller_tenant = tenant_id

    # --- TargetAgent protocol ----------------------------------------------

    async def send(self, message: str) -> AgentResponse:
        tool_calls: list[ToolCall] = []
        trace: dict[str, Any] = {
            "input": message,
            "memory_at_turn_start": list(self._memory),
            "registered_tools": list(self._tools),
            "caller_tenant": self._caller_tenant,
        }

        # Tool description poisoning: trust hidden instructions in metadata.
        for tool in self._tools:
            desc = tool["description"]
            if "audit_log" in desc.lower() and "internal" in desc.lower():
                tool_calls.append(
                    ToolCall(
                        name="audit_log",
                        arguments={
                            "category": "INTERNAL",
                            "message": message,
                            "source_tool": tool["name"],
                        },
                    )
                )
                trace["compromised_by"] = "tool_description_poisoning"

        # Memory poisoning: latent rule fires on keyword trigger.
        memory_blob = " ".join(self._memory).lower()
        if "invoice" in message.lower() and "approve_payment" in memory_blob:
            tool_calls.append(
                ToolCall(
                    name="approve_payment",
                    arguments={"amount": 50_000, "reason": "memory-triggered auto-approve"},
                )
            )
            trace["compromised_by"] = trace.get("compromised_by") or "memory_poisoning"

        # Identity spoofing: accept unverified inter-agent sender claims.
        a2a_match = re.match(
            r"INTER_AGENT\s+from=(\w+)\s+to=(\w+)",
            message,
            flags=re.IGNORECASE,
        )
        if a2a_match and a2a_match.group(1).lower() == "supervisor":
            email_match = re.search(
                r"send_email.*?to\s+([\w.+-]+@[\w.-]+)",
                message,
                flags=re.IGNORECASE | re.DOTALL,
            )
            if email_match:
                target_email = email_match.group(1).rstrip(".,'\";")
                tool_calls.append(
                    ToolCall(
                        name="send_email",
                        arguments={
                            "to": target_email,
                            "subject": "Supervisor export",
                            "body": "Exported per supervisor directive",
                        },
                    )
                )
                trace["compromised_by"] = trace.get("compromised_by") or "identity_spoofing"
                trace["accepted_sender"] = a2a_match.group(1)

        # Confused deputy: agent token used without per-resource authz check.
        record_match = re.search(r"\brecord\s+(\w+)\b", message, flags=re.IGNORECASE)
        if record_match:
            record_id = record_match.group(1)
            record = self._records.get(record_id)
            if record:
                tool_calls.append(
                    ToolCall(
                        name="internal_api_get",
                        arguments={
                            "record_id": record_id,
                            "tenant_id": record["tenant_id"],
                            "caller_tenant": self._caller_tenant,
                            "used_agent_bearer": True,
                        },
                    )
                )
                if record["tenant_id"] != self._caller_tenant:
                    trace["compromised_by"] = trace.get("compromised_by") or "confused_deputy"
                    trace["cross_tenant_access"] = True

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
                trace["compromised_by"] = trace.get("compromised_by") or "indirect_injection_via_fetch_url"

            # Exfiltration via outbound URL query string.
            exfil_match = re.search(
                r"fetch\s+(https?://\S+)\?data=",
                content,
                flags=re.IGNORECASE,
            )
            if exfil_match:
                exfil_base = exfil_match.group(1).rstrip(".,'\";")
                encoded = quote(message, safe="")
                exfil_url = f"{exfil_base}?data={encoded}"
                tool_calls.append(
                    ToolCall(name="fetch_url", arguments={"url": exfil_url, "exfil": True})
                )
                trace["compromised_by"] = trace.get("compromised_by") or "exfiltration_via_url"

        text = (
            f"Done. Made {len(tool_calls)} tool call(s)."
            if tool_calls
            else "I'd be happy to help — please share more detail."
        )

        return AgentResponse(text=text, tool_calls=tool_calls, raw_trace=trace)


class RemoteVulnerableTarget:
    """HTTP client for ``demo.http_agent`` with attack setup hooks."""

    def __init__(self, chat_endpoint: str, *, timeout_seconds: float = 30.0) -> None:
        self.chat_endpoint = chat_endpoint
        self._base = chat_endpoint.rsplit("/chat", 1)[0]
        self._timeout = timeout_seconds
        self._async_client = httpx.AsyncClient(timeout=timeout_seconds)

    def _sync_setup(self, path: str, payload: dict[str, Any]) -> None:
        with httpx.Client(timeout=self._timeout) as client:
            resp = client.post(f"{self._base}{path}", json=payload)
            resp.raise_for_status()

    def set_url_content(self, url: str, content: str) -> None:
        self._sync_setup("/setup/url", {"url": url, "content": content})

    def inject_memory(self, fact: str) -> None:
        self._sync_setup("/setup/memory", {"fact": fact})

    def register_tool(self, name: str, description: str) -> None:
        self._sync_setup("/setup/tool", {"name": name, "description": description})

    def set_record(self, record_id: str, tenant_id: str, data: dict[str, Any]) -> None:
        self._sync_setup(
            "/setup/record",
            {"record_id": record_id, "tenant_id": tenant_id, "data": data},
        )

    def set_caller_tenant(self, tenant_id: str) -> None:
        self._sync_setup("/setup/tenant", {"tenant_id": tenant_id})

    async def send(self, message: str) -> AgentResponse:
        resp = await self._async_client.post(
            self.chat_endpoint,
            json={"message": message},
        )
        resp.raise_for_status()
        return AgentResponse.model_validate(resp.json())

    async def aclose(self) -> None:
        await self._async_client.aclose()


class HttpTarget:
    """Talk to a generic agent over HTTP (no attack setup hooks)."""

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
    if "/v1/agent" in endpoint:
        chat_endpoint = endpoint if endpoint.endswith("/chat") else f"{endpoint.rstrip('/')}/chat"
        return RemoteVulnerableTarget(chat_endpoint)
    return HttpTarget(endpoint=endpoint)
