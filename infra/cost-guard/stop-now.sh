#!/usr/bin/env bash
# Emergency stop: scale Container App to 0 replicas immediately.
set -euo pipefail

RG="${RG:-ms-ai-hackathon}"
CONTAINER_APP="${CONTAINER_APP:-agentsentry-api}"

echo "==> Stopping $CONTAINER_APP in $RG (min/max replicas -> 0)"
az containerapp update \
  --name "$CONTAINER_APP" \
  --resource-group "$RG" \
  --min-replicas 0 \
  --max-replicas 0 \
  --output none

echo "==> API compute stopped. Restart with: ./infra/cost-guard/resume-api.sh"
