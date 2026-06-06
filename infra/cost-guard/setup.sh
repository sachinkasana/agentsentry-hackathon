#!/usr/bin/env bash
# Pay-as-you-go guard: monthly budget (INR) + auto-stop Container App when exceeded.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
RG="${RG:-ms-ai-hackathon}"
LOCATION="${LOCATION:-centralindia}"
BUDGET_INR="${BUDGET_INR:-1500}"
BUDGET_NAME="${BUDGET_NAME:-agentsentry-monthly-inr}"
AUTO_ACCOUNT="${AUTO_ACCOUNT:-agentsentry-auto}"
RUNBOOK_NAME="${RUNBOOK_NAME:-Stop-AgentSentryApi}"
WEBHOOK_NAME="${WEBHOOK_NAME:-StopApiWebhook}"
ACTION_GROUP="${ACTION_GROUP:-agentsentry-cost-stop}"
CONTAINER_APP="${CONTAINER_APP:-agentsentry-api}"
ALERT_EMAIL="${ALERT_EMAIL:-}"

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
RG_SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}"
ACTION_GROUP_ID="${RG_SCOPE}/providers/microsoft.insights/actionGroups/${ACTION_GROUP}"

echo "==> Cost guard for resource group: $RG"
echo "    Monthly budget: ${BUDGET_INR} INR (Actual cost)"
echo "    Action at 100%: scale ${CONTAINER_APP} to 0 replicas"

az group show --name "$RG" --output none

echo "==> Creating Automation account: $AUTO_ACCOUNT"
az automation account create \
  --name "$AUTO_ACCOUNT" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --sku Basic \
  --output none 2>/dev/null || true

az rest \
  --method PATCH \
  --uri "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Automation/automationAccounts/${AUTO_ACCOUNT}?api-version=2023-11-01" \
  --body '{"identity":{"type":"SystemAssigned"}}' \
  --output none

sleep 10

AUTO_PRINCIPAL=$(az automation account show \
  --name "$AUTO_ACCOUNT" \
  --resource-group "$RG" \
  --query "identity.principalId" -o tsv)

echo "==> Granting Automation identity Contributor on $RG"
az role assignment create \
  --assignee-object-id "$AUTO_PRINCIPAL" \
  --assignee-principal-type ServicePrincipal \
  --role Contributor \
  --scope "$RG_SCOPE" \
  --output none 2>/dev/null || true

echo "==> Publishing runbook: $RUNBOOK_NAME"
az automation runbook create \
  --automation-account-name "$AUTO_ACCOUNT" \
  --resource-group "$RG" \
  --name "$RUNBOOK_NAME" \
  --type PowerShell \
  --location "$LOCATION" \
  --output none 2>/dev/null || true

az automation runbook replace-content \
  --automation-account-name "$AUTO_ACCOUNT" \
  --resource-group "$RG" \
  --name "$RUNBOOK_NAME" \
  --content @"${ROOT_DIR}/infra/cost-guard/Stop-AgentSentryApi.ps1" \
  --output none

az automation runbook publish \
  --automation-account-name "$AUTO_ACCOUNT" \
  --resource-group "$RG" \
  --name "$RUNBOOK_NAME" \
  --output none

echo "==> Importing Az.Accounts module for runbook"
az automation module create \
  --automation-account-name "$AUTO_ACCOUNT" \
  --resource-group "$RG" \
  --name Az.Accounts \
  --content-link uri=https://www.powershellgallery.com/api/v2/package/Az.Accounts/ \
  --output none 2>/dev/null || true

EXPIRY=$(date -u -v+2y +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -d "+2 years" +"%Y-%m-%dT%H:%M:%SZ")

echo "==> Creating runbook webhook"
az rest \
  --method DELETE \
  --uri "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Automation/automationAccounts/${AUTO_ACCOUNT}/webhooks/${WEBHOOK_NAME}?api-version=2015-10-31" \
  --output none 2>/dev/null || true

WEBHOOK_URI=$(az rest \
  --method PUT \
  --uri "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Automation/automationAccounts/${AUTO_ACCOUNT}/webhooks/${WEBHOOK_NAME}?api-version=2015-10-31" \
  --body "$(cat <<WEBHOOK
{
  "properties": {
    "isEnabled": true,
    "expiryTime": "$EXPIRY",
    "runbook": { "name": "$RUNBOOK_NAME" }
  }
}
WEBHOOK
)" \
  --query "properties.uri" -o tsv)

if [[ -z "$WEBHOOK_URI" ]]; then
  echo "ERROR: Automation webhook URI was not returned. Re-run setup.sh." >&2
  exit 1
fi

echo "==> Creating action group: $ACTION_GROUP"
if ! az monitor action-group show --name "$ACTION_GROUP" --resource-group "$RG" --output none 2>/dev/null; then
  az monitor action-group create \
    --name "$ACTION_GROUP" \
    --resource-group "$RG" \
    --short-name coststop \
    --action webhook StopContainerApp "$WEBHOOK_URI" \
    --output none
else
  echo "    Action group already exists — skipping create"
fi

START_DATE=$(date -u +"%Y-%m-01")
END_DATE=$(date -u -v+2y +"%Y-%m-01" 2>/dev/null || date -u -d "+2 years" +"%Y-%m-01")

if [[ -n "$ALERT_EMAIL" ]]; then
  NOTIFICATIONS_JSON=$(cat <<BUDGET
{
  "Actual_GreaterThan_80": {
    "enabled": true,
    "operator": "GreaterThan",
    "threshold": 80,
    "contactEmails": ["$ALERT_EMAIL"],
    "contactGroups": [],
    "contactRoles": [],
    "thresholdType": "Actual"
  },
  "Actual_GreaterThan_100": {
    "enabled": true,
    "operator": "GreaterThan",
    "threshold": 100,
    "contactEmails": ["$ALERT_EMAIL"],
    "contactGroups": ["$ACTION_GROUP_ID"],
    "contactRoles": [],
    "thresholdType": "Actual"
  }
}
BUDGET
)
else
  NOTIFICATIONS_JSON=$(cat <<BUDGET
{
  "Actual_GreaterThan_100": {
    "enabled": true,
    "operator": "GreaterThan",
    "threshold": 100,
    "contactEmails": [],
    "contactGroups": ["$ACTION_GROUP_ID"],
    "contactRoles": [],
    "thresholdType": "Actual"
  }
}
BUDGET
)
fi

echo "==> Creating/updating monthly budget: $BUDGET_NAME (${BUDGET_INR} INR)"
az rest \
  --method PUT \
  --uri "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}/providers/Microsoft.Consumption/budgets/${BUDGET_NAME}?api-version=2023-05-01" \
  --body "$(cat <<BUDGET
{
  "properties": {
    "category": "Cost",
    "amount": $BUDGET_INR,
    "timeGrain": "Monthly",
    "timePeriod": {
      "startDate": "${START_DATE}T00:00:00Z",
      "endDate": "${END_DATE}T00:00:00Z"
    },
    "notifications": $NOTIFICATIONS_JSON
  }
}
BUDGET
)" \
  --output none

cat > "${ROOT_DIR}/infra/cost-guard/state.json" <<STATE
{
  "resourceGroup": "$RG",
  "budgetInr": $BUDGET_INR,
  "budgetName": "$BUDGET_NAME",
  "actionGroup": "$ACTION_GROUP",
  "automationAccount": "$AUTO_ACCOUNT",
  "containerApp": "$CONTAINER_APP",
  "configuredAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
STATE

echo ""
echo "==================== COST GUARD ACTIVE ===================="
echo "Budget:     ${BUDGET_INR} INR/month on resource group ${RG}"
echo "At 80%:     email alert (if ALERT_EMAIL set)"
echo "At 100%:    auto-scale ${CONTAINER_APP} to 0 replicas"
echo ""
echo "Manual stop:    ./infra/cost-guard/stop-now.sh"
echo "Resume API:     ./infra/cost-guard/resume-api.sh"
if [[ -z "$ALERT_EMAIL" ]]; then
  echo ""
  echo "Tip: re-run with ALERT_EMAIL=you@example.com to get budget emails."
fi
echo "============================================================"
