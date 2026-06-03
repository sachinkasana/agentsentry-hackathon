"""Tests for the indirect injection attack and the mock target's vulnerable behavior."""

from __future__ import annotations

import pytest

from agentsentry.attacks.indirect_injection import IndirectInjectionAttack
from agentsentry.models.finding import FindingStatus
from agentsentry.services.target_client import MockVulnerableTarget


@pytest.mark.asyncio
async def test_indirect_injection_compromises_vulnerable_mock() -> None:
    """The vulnerable mock should fall for the attack — that's its job."""
    attack = IndirectInjectionAttack()
    target = MockVulnerableTarget()

    result = await attack.run(target)

    assert result.succeeded is True, result.trace
    assert result.error is None
    tool_calls = result.trace["agent_tool_calls"]
    # Must show both the fetch and the email send.
    assert any(tc["name"] == "fetch_url" for tc in tool_calls)
    assert any(
        tc["name"] == "send_email"
        and IndirectInjectionAttack.ATTACKER_EMAIL in str(tc["arguments"]["to"])
        for tc in tool_calls
    )


@pytest.mark.asyncio
async def test_indirect_injection_to_finding_is_vulnerable() -> None:
    """to_finding maps a successful attack to a VULNERABLE finding with remediation."""
    attack = IndirectInjectionAttack()
    target = MockVulnerableTarget()
    result = await attack.run(target)
    finding = attack.to_finding(scan_id="scn_test", result=result)

    assert finding.status == FindingStatus.VULNERABLE
    assert finding.severity == "critical"
    assert finding.attack_id == "indirect_injection_v1"
    assert finding.remediation is not None
    assert "Prompt Shield" in finding.remediation


@pytest.mark.asyncio
async def test_indirect_injection_against_target_without_planting_hook() -> None:
    """A target missing set_url_content should be skipped, not crash."""
    attack = IndirectInjectionAttack()

    class BlindTarget:
        async def send(self, message: str):  # noqa: ANN001
            from agentsentry.services.target_client import AgentResponse

            return AgentResponse(text="ok", tool_calls=[])

    result = await attack.run(BlindTarget())
    assert result.succeeded is False
    assert result.error == "target_missing_capability"
