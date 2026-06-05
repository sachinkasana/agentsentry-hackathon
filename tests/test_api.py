"""Smoke tests for the FastAPI control plane."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from agentsentry.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_health(client: TestClient) -> None:
    assert client.get("/healthz").json() == {"status": "ok"}


def test_full_register_and_scan_flow(client: TestClient) -> None:
    # Register a target
    resp = client.post(
        "/v1/agents",
        json={
            "name": "demo",
            "endpoint": "mock://vulnerable",
            "framework": "mock",
            "tools": ["fetch_url", "send_email"],
        },
    )
    assert resp.status_code == 201, resp.text
    agent_id = resp.json()["id"]

    # Trigger a scan
    resp = client.post("/v1/scans", json={"agent_id": agent_id})
    assert resp.status_code == 201, resp.text
    scan = resp.json()
    assert scan["status"] == "completed"
    assert scan["posture_score"] is not None

    # Indirect injection finding should be VULNERABLE in the demo target
    findings_by_attack = {f["attack_id"]: f for f in scan["findings"]}
    assert findings_by_attack["indirect_injection_v1"]["status"] == "vulnerable"


def test_guarded_scan_improves_posture(client: TestClient) -> None:
    resp = client.post(
        "/v1/agents",
        json={
            "name": "guarded-demo",
            "endpoint": "mock://vulnerable",
            "framework": "mock",
            "tools": ["fetch_url", "send_email"],
        },
    )
    agent_id = resp.json()["id"]

    bare = client.post("/v1/scans", json={"agent_id": agent_id})
    assert bare.json()["posture_score"] == 0.0

    guarded = client.post(
        "/v1/scans",
        json={"agent_id": agent_id, "defense_enabled": True},
    )
    assert guarded.json()["defense_enabled"] is True
    assert guarded.json()["posture_score"] == 100.0


def test_runtime_recent_events_after_guarded_scan(client: TestClient) -> None:
    resp = client.post(
        "/v1/agents",
        json={
            "name": "runtime-events",
            "endpoint": "mock://vulnerable",
            "framework": "mock",
            "tools": ["fetch_url", "send_email"],
        },
    )
    agent_id = resp.json()["id"]
    client.post("/v1/scans", json={"agent_id": agent_id, "defense_enabled": True})

    events = client.get("/v1/runtime/events/recent").json()
    assert len(events) > 0
    assert any(e["event_type"] in ("blocked", "policy_violation") for e in events)


def test_attack_registry_endpoint(client: TestClient) -> None:
    resp = client.get("/v1/scans/_attacks/registry")
    assert resp.status_code == 200
    ids = {a["id"] for a in resp.json()}
    assert "indirect_injection_v1" in ids
    assert {
        "tool_poisoning_v1",
        "exfiltration_url_v1",
        "identity_spoofing_v1",
        "memory_poisoning_v1",
        "confused_deputy_v1",
    } <= ids
