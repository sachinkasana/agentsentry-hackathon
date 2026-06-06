"""GuardedTarget — wraps any TargetAgent with policy + Prompt Shields."""

from __future__ import annotations

from typing import Any

from agentsentry.guard.events import EVENT_BUS
from agentsentry.guard.policy import GuardDecision, evaluate_tool_call
from agentsentry.guard.shields import scan_untrusted_content
from agentsentry.services.target_client import AgentResponse, TargetAgent, ToolCall


class GuardedTarget:
    """Runtime guard wrapper implementing the TargetAgent protocol."""

    def __init__(
        self,
        inner: TargetAgent,
        *,
        agent_id: str,
        shields_on_tool_output: bool = True,
    ) -> None:
        self._inner = inner
        self._agent_id = agent_id
        self._shields = shields_on_tool_output

    def __getattr__(self, name: str):
        """Forward attack setup hooks (set_url_content, inject_memory, etc.)."""
        return getattr(self._inner, name)

    async def send(self, message: str) -> AgentResponse:
        if self._shields:
            verdict = scan_untrusted_content(message)
            if verdict.is_injection:
                EVENT_BUS.emit(
                    agent_id=self._agent_id,
                    event_type="blocked",
                    summary=verdict.summary,
                    details={
                        "shield": verdict.backend,
                        "matched_pattern": verdict.matched_pattern,
                        "channel": "user_input",
                    },
                )
                return AgentResponse(
                    text="Request blocked by Prompt Shields before reaching the agent.",
                    tool_calls=[],
                    raw_trace={
                        "guard_blocked_input": True,
                        "shield_verdict": verdict.summary,
                    },
                )

        response = await self._inner.send(message)
        allowed_calls: list[ToolCall] = []
        blocked: list[dict[str, Any]] = []

        for tool_call in response.tool_calls:
            decision = evaluate_tool_call(
                tool_call,
                prior_tool_calls=allowed_calls,
                user_message=message,
            )
            if decision.allowed:
                allowed_calls.append(tool_call)
                EVENT_BUS.emit(
                    agent_id=self._agent_id,
                    event_type="allowed",
                    summary=decision.summary,
                    details={"tool": tool_call.name, "arguments": tool_call.arguments},
                )
            else:
                blocked.append(_decision_to_dict(tool_call, decision))
                EVENT_BUS.emit(
                    agent_id=self._agent_id,
                    event_type=decision.event_type,
                    summary=decision.summary,
                    details={
                        "tool": tool_call.name,
                        "policy": decision.policy,
                        **(decision.details or {}),
                    },
                )

        trace = dict(response.raw_trace)
        if blocked:
            trace["guard_blocked_tool_calls"] = blocked

        text = response.text
        if blocked and not allowed_calls:
            text = "Action blocked by AgentSentry Runtime Guard."

        return AgentResponse(
            text=text,
            tool_calls=allowed_calls,
            raw_trace=trace,
        )


def _decision_to_dict(tool_call: ToolCall, decision: GuardDecision) -> dict[str, Any]:
    return {
        "tool": tool_call.name,
        "arguments": tool_call.arguments,
        "policy": decision.policy,
        "summary": decision.summary,
        "event_type": decision.event_type,
    }
