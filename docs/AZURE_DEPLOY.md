# Azure Deployment Guide

Deploy AgentSentry Mission Control (Static Web Apps) + Control Plane API (Container Apps) + Application Insights.

## India region (Central India)

Defaults target **India** with a split-region layout:

| Component | Region | Code |
|-----------|--------|------|
| API, ACR, App Insights, Container Apps | Central India (Pune) | `centralindia` |
| Static Web App (Mission Control) | Southeast Asia (Singapore) | `southeastasia` |

Azure has no `northindia` region code. **Central India** is the standard India deployment region for compute/data.

**Why split?** Azure Static Web Apps is [not available in India regions](https://azure.microsoft.com/explore/global-infrastructure/products-by-region/) (including `centralindia`). Static assets are still CDN-distributed globally; the SWA control plane hosts in the nearest supported region. The API proxy in `staticwebapp.config.json` routes `/v1/*` to your Container App in Central India.

```bash
# Defaults (India backend + nearest SWA)
./infra/deploy.sh

# Explicit overrides
LOCATION=centralindia SWA_LOCATION=southeastasia ./infra/deploy.sh
```

## Architecture

```
Browser → Azure Static Web Apps (Mission Control)
              ↓ proxy /v1/*
         Azure Container Apps (FastAPI API)
              ↓
         Application Insights (telemetry)
```

## Option A — One-command local deploy (fastest)

**Prerequisites:** Azure CLI logged in (`az login`), Node.js 20+, npm.

```bash
chmod +x infra/deploy.sh
./infra/deploy.sh
```

This script:
1. Creates resource group `ms-ai-hackathon` (override with `RG=my-rg ./infra/deploy.sh`)
2. Deploys foundation (App Insights, ACR, ACA environment)
3. Builds & pushes API Docker image via `az acr build`
4. Deploys Container App + Static Web App (image must exist before ACA pulls it)
5. Builds Mission Control and deploys via SWA CLI (if installed)

Outputs are saved to `infra/deployment-outputs.json`.

Install SWA CLI if needed:

```bash
npm install -g @azure/static-web-apps-cli
```

## Option B — GitHub Actions (CI/CD)

### 1. Create a service principal

```bash
az ad sp create-for-rbac \
  --name "agentsentry-github" \
  --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/ms-ai-hackathon \
  --sdk-auth
```

Copy the JSON output → GitHub repo secret `AZURE_CREDENTIALS`.

### 2. Deploy infrastructure

GitHub → Actions → **Deploy Azure Infrastructure** → Run workflow.

Or locally:

```bash
az group create -n ms-ai-hackathon -l centralindia
az deployment group create \
  -g ms-ai-hackathon \
  -f infra/main.bicep \
  -p baseName=agentsentry location=centralindia swaLocation=southeastasia
```

### 3. Enable manual approval (`prod` environment)

There is **one** production UI + API endpoint. All deployment workflows use the same GitHub environment so nothing deploys without approval.

1. GitHub repo → **Settings** → **Environments** → **New environment** → name it `prod`
2. Under **Deployment protection rules**, enable **Required reviewers** and add yourself (or your team)
3. Store deploy secrets as **Repository secrets** (not only environment secrets) so every `prod` job can read them

Affected workflows (all use `environment: prod`):

| Workflow | Triggers |
|----------|----------|
| Deploy API to Azure Container Apps | Push, `workflow_dispatch` |
| Deploy Mission Control (SWA) | Push, PR, `workflow_dispatch` |
| Deploy Azure Infrastructure | `workflow_dispatch` |

When a workflow runs, open **Actions** → **Review deployments** → **Approve and deploy**.

### 4. Add GitHub secrets

From `infra/deployment-outputs.json` or `az deployment group show`:

| Secret | How to get |
|--------|------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `az staticwebapp secrets list -n agentsentry-mc -g ms-ai-hackathon --query properties.apiKey -o tsv` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Bicep output `applicationInsightsConnectionString` |
| `AGENTSENTRY_API_FQDN` | Bicep output `containerAppFqdn` (no `https://`) |
| `AZURE_ACR_NAME` | Bicep output `acrName` |
| `AZURE_CONTAINER_APP_NAME` | `agentsentry-api` |
| `AZURE_RESOURCE_GROUP` | `ms-ai-hackathon` |

### 5. Deploy API image

```bash
az acr build --registry agentsentryacr --image agentsentry-api:latest -f Dockerfile .
az containerapp update -n agentsentry-api -g ms-ai-hackathon \
  --image agentsentryacr.azurecr.io/agentsentry-api:latest
```

Or trigger **Deploy API to Azure Container Apps** workflow.

### 6. Deploy Mission Control

Push to `main` or `gagan/ui-azure-integration`, or run **Deploy Mission Control** workflow manually.

## Verify deployment

```bash
# API health (direct)
curl https://<containerAppFqdn>/healthz

# UI (proxied through SWA)
curl https://<staticWebAppHostname>/healthz
open https://<staticWebAppHostname>
```

In the dashboard, the **API Online** badge should be green.

## Resources created

| Resource | Name pattern |
|----------|--------------|
| Log Analytics | `agentsentry-logs` |
| Application Insights | `agentsentry-insights` |
| Container Registry | `agentsentryacr` |
| Container Apps Environment | `agentsentry-aca-env` |
| Container App | `agentsentry-api` |
| Static Web App | `agentsentry-mc` |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ContainerAppOperationError: Operation expired` | Image was missing in ACR when ACA first deployed. Use updated `./infra/deploy.sh` (builds image *before* Container App). If a failed `agentsentry-api` exists: `az containerapp delete -n agentsentry-api -g ms-ai-hackathon -y` then re-run deploy. |
| API Offline on SWA | Check `AGENTSENTRY_API_FQDN` secret matches ACA FQDN; redeploy UI workflow |
| 502 on /v1/* | API container not running — check `az containerapp logs -n agentsentry-api -g ms-ai-hackathon` |
| ACR name taken | Change `baseName` param to a unique value |
| Bicep fails on SWA in India | SWA cannot deploy to `centralindia` — use `swaLocation=southeastasia` (default) |
| Org policy blocks non-India regions | Request policy exemption for `southeastasia` on SWA only, or use SWA Standard with linked backend |
