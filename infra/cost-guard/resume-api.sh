#!/usr/bin/env bash
# Restore Container App scaling after a cost-guard stop.
set -euo pipefail

RG="${RG:-ms-ai-hackathon}"
CONTAINER_APP="${CONTAINER_APP:-agentsentry-api}"
MIN_REPLICAS="${MIN_REPLICAS:-1}"
MAX_REPLICAS="${MAX_REPLICAS:-3}"

echo "==> Resuming $CONTAINER_APP in $RG (min=$MIN_REPLICAS max=$MAX_REPLICAS)"
az containerapp update \
  --name "$CONTAINER_APP" \
  --resource-group "$RG" \
  --min-replicas "$MIN_REPLICAS" \
  --max-replicas "$MAX_REPLICAS" \
  --output none

FQDN=$(az containerapp show --name "$CONTAINER_APP" --resource-group "$RG" --query "properties.configuration.ingress.fqdn" -o tsv)
echo "==> API available at: https://${FQDN}"
