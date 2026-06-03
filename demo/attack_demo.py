"""End-to-end demo: register the vulnerable mock agent and scan it.

Run with the package installed:

    python -m demo.attack_demo

You should see the indirect-injection attack flagged VULNERABLE — that's
the mock agent behaving exactly as a real vulnerable agent would. Once
you wrap it with the runtime guard (Day 3), re-running this demo should
show DEFENDED.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone

from agentsentry.models import Agent
from agentsentry.services.scan_runner import run_scan
from agentsentry.storage import get_storage


async def main() -> None:
    storage = get_storage()

    agent = Agent(
        id="agt_demo",
        name="vulnerable-research-agent",
        endpoint="mock://vulnerable",
        framework="mock",
        tools=["fetch_url", "send_email"],
        description=(
            "Mock vulnerable agent for development. Has fetch_url + send_email "
            "tools and naively follows instructions found in fetched content."
        ),
        created_at=datetime.now(timezone.utc),
    )
    await storage.save_agent(agent)

    print("=== Running AgentSentry scan on the vulnerable mock target ===\n")
    scan = await run_scan(agent=agent, storage=storage)

    print(f"Scan ID: {scan.id}")
    print(f"Posture: {scan.posture_score}/100")
    print(f"Findings: {len(scan.findings)}\n")

    for f in scan.findings:
        marker = {
            "vulnerable": "[X VULN]",
            "defended":   "[. SAFE]",
            "error":      "[? ERR ]",
        }.get(f.status.value, "[?    ]")
        print(f"  {marker} {f.severity.upper():<8} {f.attack_name}")
        if f.status.value == "vulnerable" and f.remediation:
            first_line = f.remediation.splitlines()[0].strip()
            print(f"            Remediation: {first_line[:90]}...")

    print("\n=== Full trace for first VULNERABLE finding ===\n")
    vuln = next((f for f in scan.findings if f.status.value == "vulnerable"), None)
    if vuln is not None:
        print(json.dumps(vuln.evidence, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())
