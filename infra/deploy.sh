#!/usr/bin/env bash
# Deploy AgentSentry infrastructure + API image + Mission Control to Azure.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RG="${RG:-rg-agentsentry}"
# India: Central India for API/ACA/ACR (Azure has no "northindia" region code)
LOCATION="${LOCATION:-centralindia}"
# SWA is not available in India — nearest supported region
SWA_LOCATION="${SWA_LOCATION:-southeastasia}"
BASE_NAME="${BASE_NAME:-agentsentry}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "==> Deploying to resource group: $RG"
echo "    Backend (API/ACR/ACA): $LOCATION"
echo "    Static Web App:        $SWA_LOCATION"

az group create --name "$RG" --location "$LOCATION" --output none

DEPLOYMENT_NAME="agentsentry-$(date +%Y%m%d%H%M%S)"
echo "==> Running Bicep deployment: $DEPLOYMENT_NAME"

az deployment group create \
  --name "$DEPLOYMENT_NAME" \
  --resource-group "$RG" \
  --template-file "$ROOT_DIR/infra/main.bicep" \
  --parameters baseName="$BASE_NAME" location="$LOCATION" swaLocation="$SWA_LOCATION" imageTag="$IMAGE_TAG" \
  --query properties.outputs \
  -o json > "$ROOT_DIR/infra/deployment-outputs.json"

ACR_NAME=$(jq -r '.acrName.value' "$ROOT_DIR/infra/deployment-outputs.json")
API_FQDN=$(jq -r '.containerAppFqdn.value' "$ROOT_DIR/infra/deployment-outputs.json")
SWA_HOST=$(jq -r '.staticWebAppHostname.value' "$ROOT_DIR/infra/deployment-outputs.json")
APPINSIGHTS_CS=$(jq -r '.applicationInsightsConnectionString.value' "$ROOT_DIR/infra/deployment-outputs.json")
SWA_NAME=$(jq -r '.staticWebAppName.value' "$ROOT_DIR/infra/deployment-outputs.json")

echo "==> Building and pushing API image to ACR: $ACR_NAME"
az acr build \
  --registry "$ACR_NAME" \
  --image "agentsentry-api:${IMAGE_TAG}" \
  --file "$ROOT_DIR/Dockerfile" \
  "$ROOT_DIR"

echo "==> Restarting Container App to pull new image"
CONTAINER_APP=$(jq -r '.containerAppName.value' "$ROOT_DIR/infra/deployment-outputs.json")
az containerapp revision copy \
  --name "$CONTAINER_APP" \
  --resource-group "$RG" \
  --image "${ACR_NAME}.azurecr.io/agentsentry-api:${IMAGE_TAG}" \
  --output none 2>/dev/null || \
az containerapp update \
  --name "$CONTAINER_APP" \
  --resource-group "$RG" \
  --image "${ACR_NAME}.azurecr.io/agentsentry-api:${IMAGE_TAG}" \
  --output none

echo "==> Patching staticwebapp.config.json with API FQDN: $API_FQDN"
sed "s|REPLACE_WITH_ACA_FQDN|${API_FQDN}|g" \
  "$ROOT_DIR/mission-control/staticwebapp.config.json" > "$ROOT_DIR/mission-control/staticwebapp.config.json.tmp"
mv "$ROOT_DIR/mission-control/staticwebapp.config.json.tmp" "$ROOT_DIR/mission-control/staticwebapp.config.json"

echo "==> Building Mission Control"
cd "$ROOT_DIR/mission-control"
npm ci
NEXT_PUBLIC_API_URL="" \
NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING="$APPINSIGHTS_CS" \
npm run build

echo "==> Fetching Static Web App deployment token"
DEPLOY_TOKEN=$(az staticwebapp secrets list \
  --name "$SWA_NAME" \
  --resource-group "$RG" \
  --query "properties.apiKey" -o tsv)

if command -v swa >/dev/null 2>&1; then
  echo "==> Deploying to Static Web App via SWA CLI"
  swa deploy ./out \
    --deployment-token "$DEPLOY_TOKEN" \
    --env production
else
  echo "==> SWA CLI not installed. Install with: npm i -g @azure/static-web-apps-cli"
  echo "    Then run:"
  echo "    swa deploy $ROOT_DIR/mission-control/out --deployment-token <token> --env production"
  echo ""
  echo "    Or set GitHub secret AZURE_STATIC_WEB_APPS_API_TOKEN and push to main."
fi

echo ""
echo "==================== DEPLOYMENT COMPLETE ===================="
echo "Mission Control:  https://${SWA_HOST}"
echo "API (direct):     https://${API_FQDN}"
echo "App Insights CS:  (saved in infra/deployment-outputs.json)"
echo ""
echo "GitHub secrets to add:"
echo "  AZURE_STATIC_WEB_APPS_API_TOKEN = <run: az staticwebapp secrets list -n $SWA_NAME -g $RG>"
echo "  APPLICATIONINSIGHTS_CONNECTION_STRING = <from deployment-outputs.json>"
echo "  AGENTSENTRY_API_FQDN = $API_FQDN"
echo "============================================================="
