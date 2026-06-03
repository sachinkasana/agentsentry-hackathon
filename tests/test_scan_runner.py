"""Tests for the end-to-end scan runner."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from agentsentry.models import Agent
from agentsentry.models.finding import FindingStatus
from agentsentry.services.scan_runner import compute_posture_score, run_scan
from agentsentry.storage.memory import InMemoryStorage


@pytest.mark.asyncio
async def test_scan_against_mock_target_runs_all_attacks() -> None:
    storage = InMemoryStorage()
    agent = Agent(
        id="agt_test",
        name="test",
        endpoint="mock://vulnerable",
        framework="mock",
        tools=["fetch_url", "send_email"],
        created_at=datetime.now(timezone.utc),
    )
    await storage.save_agent(agent)

    scan = await run_scan(agent=agent, storage=storage)

    assert scan.status.value == "completed"
    assert len(scan.findings) >= 1
    # The fully implemented indirect injection attack should mark VULNERABLE.
    by_id = {f.attack_id: f for f in scan.findings}
    assert by_id["indirect_injection_v1"].status == FindingStatus.VULNERABLE
    # Posture computed from runnable findings only — should not be None.
    assert scan.posture_score is not None


def test_posture_score_all_defended() -> None:
    from agentsentry.models.finding import Finding

    findings = [
        Finding(
            id="f1",
            scan_id="s",
            attack_id="a1",
            attack_name="a",
            severity="critical",
            category="prompt_injection",
            status=FindingStatus.DEFENDED,
            evidence={},
            created_at=datetime.now(timezone.utc),
        ),
        Finding(
            id="f2",
            scan_id="s",
            attack_id="a2",
            attack_name="b",
            severity="high",
            category="prompt_injection",
            status=FindingStatus.DEFENDED,
            evidence={},
            created_at=datetime.now(timezone.utc),
        ),
    ]
    assert compute_posture_score(findings) == 100.0


def test_posture_score_one_critical_compromise() -> None:
    from agentsentry.models.finding import Finding

    findings = [
        Finding(
            id="f1",
            scan_id="s",
            attack_id="a1",
            attack_name="critical-fail",
            severity="critical",  # weight 40
            category="prompt_injection",
            status=FindingStatus.VULNERABLE,
            evidence={},
            created_at=datetime.now(timezone.utc),
        ),
        Finding(
            id="f2",
            scan_id="s",
            attack_id="a2",
            attack_name="medium-ok",
            severity="medium",  # weight 10
            category="prompt_injection",
            status=FindingStatus.DEFENDED,
            evidence={},
            created_at=datetime.now(timezone.utc),
        ),
    ]
    # 10 earned / 50 total = 20.0
    assert compute_posture_score(findings) == 20.0
