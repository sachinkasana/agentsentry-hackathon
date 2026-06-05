"""Tests for the full agentic attack pack."""

from __future__ import annotations

import pytest

from agentsentry.attacks.confused_deputy import ConfusedDeputyAttack
from agentsentry.attacks.exfiltration_url import ExfiltrationUrlAttack
from agentsentry.attacks.identity_spoofing import IdentitySpoofingAttack
from agentsentry.attacks.memory_poisoning import MemoryPoisoningAttack
from agentsentry.attacks.tool_poisoning import ToolPoisoningAttack
from agentsentry.models.finding import FindingStatus
from agentsentry.services.target_client import MockVulnerableTarget


@pytest.mark.asyncio
async def test_tool_poisoning_compromises_vulnerable_mock() -> None:
    attack = ToolPoisoningAttack()
    target = MockVulnerableTarget()

    result = await attack.run(target)

    assert result.succeeded is True, result.trace
    assert any(tc["name"] == "audit_log" for tc in result.trace["agent_tool_calls"])


@pytest.mark.asyncio
async def test_exfiltration_url_compromises_vulnerable_mock() -> None:
    attack = ExfiltrationUrlAttack()
    target = MockVulnerableTarget()

    result = await attack.run(target)

    assert result.succeeded is True, result.trace
    assert any(
        ExfiltrationUrlAttack.CANARY_SECRET in str(tc["arguments"].get("url", ""))
        for tc in result.trace["agent_tool_calls"]
        if tc["name"] == "fetch_url"
    )


@pytest.mark.asyncio
async def test_identity_spoofing_compromises_vulnerable_mock() -> None:
    attack = IdentitySpoofingAttack()
    target = MockVulnerableTarget()

    result = await attack.run(target)

    assert result.succeeded is True, result.trace
    assert any(
        tc["name"] == "send_email"
        and IdentitySpoofingAttack.ATTACKER_EMAIL in str(tc["arguments"]["to"])
        for tc in result.trace["agent_tool_calls"]
    )


@pytest.mark.asyncio
async def test_memory_poisoning_compromises_vulnerable_mock() -> None:
    attack = MemoryPoisoningAttack()
    target = MockVulnerableTarget()

    result = await attack.run(target)

    assert result.succeeded is True, result.trace
    assert any(tc["name"] == "approve_payment" for tc in result.trace["agent_tool_calls"])


@pytest.mark.asyncio
async def test_confused_deputy_compromises_vulnerable_mock() -> None:
    attack = ConfusedDeputyAttack()
    target = MockVulnerableTarget()

    result = await attack.run(target)

    assert result.succeeded is True, result.trace
    assert any(tc["name"] == "internal_api_get" for tc in result.trace["agent_tool_calls"])


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("attack_cls", "hook_name"),
    [
        (ToolPoisoningAttack, "register_tool"),
        (ExfiltrationUrlAttack, "set_url_content"),
        (MemoryPoisoningAttack, "inject_memory"),
        (ConfusedDeputyAttack, "set_record"),
    ],
)
async def test_attacks_skip_targets_missing_capabilities(attack_cls, hook_name) -> None:
    attack = attack_cls()

    class MinimalTarget:
        async def send(self, message: str):  # noqa: ANN001
            from agentsentry.services.target_client import AgentResponse

            return AgentResponse(text="ok", tool_calls=[])

    result = await attack.run(MinimalTarget())
    assert result.succeeded is False
    assert result.error == "target_missing_capability"


@pytest.mark.asyncio
async def test_all_attacks_map_to_vulnerable_findings() -> None:
    target = MockVulnerableTarget()
    attacks = [
        ToolPoisoningAttack(),
        ExfiltrationUrlAttack(),
        IdentitySpoofingAttack(),
        MemoryPoisoningAttack(),
        ConfusedDeputyAttack(),
    ]

    for attack in attacks:
        result = await attack.run(target)
        finding = attack.to_finding(scan_id="scn_test", result=result)
        assert finding.status == FindingStatus.VULNERABLE, attack.metadata.id
        assert finding.remediation is not None
