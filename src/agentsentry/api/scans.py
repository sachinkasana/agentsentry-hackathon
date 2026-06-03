"""/v1/scans — trigger scans and inspect results."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from agentsentry.attacks import ATTACK_REGISTRY
from agentsentry.models import Scan, ScanCreate
from agentsentry.services.scan_runner import run_scan
from agentsentry.storage import Storage, get_storage

router = APIRouter(prefix="/v1/scans", tags=["scans"])


@router.post("", response_model=Scan, status_code=status.HTTP_201_CREATED)
async def trigger_scan(
    body: ScanCreate,
    background: BackgroundTasks,
    storage: Storage = Depends(get_storage),
) -> Scan:
    """Trigger a scan against a registered agent.

    The scan runs *synchronously* for now so the demo response includes
    findings. For larger attack suites, flip to BackgroundTasks and have
    clients poll GET /v1/scans/{id}.
    """
    agent = await storage.get_agent(body.agent_id)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Agent {body.agent_id!r} not found")

    # Validate attack ids early so we fail before persisting a half-baked scan.
    if body.attacks is not None:
        unknown = [a for a in body.attacks if a not in ATTACK_REGISTRY]
        if unknown:
            raise HTTPException(status_code=400, detail=f"Unknown attack ids: {unknown}")

    scan = await run_scan(agent=agent, storage=storage, attack_ids=body.attacks)
    return scan


@router.get("", response_model=list[Scan])
async def list_scans(
    agent_id: str | None = None,
    storage: Storage = Depends(get_storage),
) -> list[Scan]:
    return await storage.list_scans(agent_id=agent_id)


@router.get("/{scan_id}", response_model=Scan)
async def get_scan(scan_id: str, storage: Storage = Depends(get_storage)) -> Scan:
    scan = await storage.get_scan(scan_id)
    if scan is None:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id!r} not found")
    return scan


@router.get("/_attacks/registry", tags=["attacks"])
async def list_registered_attacks() -> list[dict]:
    """Return metadata for every registered attack."""
    return [cls.metadata.model_dump() for cls in ATTACK_REGISTRY.values()]
