"""Command-line interface — ``agentsentry`` entrypoint.

Minimal Day-1 CLI:
    agentsentry scan --target mock://vulnerable

Used by the GitHub Action (Day 4) to run a scan inside CI.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone

from agentsentry.models import Agent
from agentsentry.services.scan_runner import run_scan
from agentsentry.storage import get_storage


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="agentsentry", description="AgentSentry CLI")
    sub = p.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan", help="Scan a target agent.")
    scan.add_argument("--target", required=True, help="Target endpoint URL or 'mock://vulnerable'.")
    scan.add_argument("--name", default="cli-target", help="Friendly name for the target.")
    scan.add_argument(
        "--fail-on",
        choices=["any", "critical", "high"],
        default="critical",
        help="Exit non-zero if a finding at this severity or above is vulnerable.",
    )
    scan.add_argument("--json", action="store_true", help="Emit scan result as JSON.")
    return p


async def _run_scan_async(target: str, name: str) -> dict:
    storage = get_storage()
    agent = Agent(
        id="agt_cli",
        name=name,
        endpoint=target,
        framework="custom",
        tools=[],
        created_at=datetime.now(timezone.utc),
    )
    await storage.save_agent(agent)
    scan = await run_scan(agent=agent, storage=storage)
    return scan.model_dump(mode="json")


_SEVERITY_ORDER = ["low", "medium", "high", "critical"]


def _should_fail(scan: dict, threshold: str) -> bool:
    if threshold == "any":
        return any(f["status"] == "vulnerable" for f in scan["findings"])
    idx = _SEVERITY_ORDER.index(threshold)
    return any(
        f["status"] == "vulnerable" and _SEVERITY_ORDER.index(f["severity"]) >= idx
        for f in scan["findings"]
    )


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "scan":
        scan = asyncio.run(_run_scan_async(args.target, args.name))
        if args.json:
            print(json.dumps(scan, indent=2))
        else:
            print(f"Scan {scan['id']} — posture {scan['posture_score']}/100")
            for f in scan["findings"]:
                marker = "X" if f["status"] == "vulnerable" else ("." if f["status"] == "defended" else "?")
                print(f"  [{marker}] {f['severity'].upper():<8} {f['attack_name']}")
        return 1 if _should_fail(scan, args.fail_on) else 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
