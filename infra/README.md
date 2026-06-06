# AgentSentry Azure Infrastructure

Bicep templates for Mission Control (Azure Static Web Apps), Control Plane API (Container Apps + ACR), and Application Insights.

## Quick deploy

```bash
az login
az account set --subscription "<your-subscription-name-or-id>"
chmod +x infra/deploy.sh
./infra/deploy.sh
```

**Default resource group:** `ms-ai-hackathon`  
**Default regions (India):** backend `centralindia`, Static Web App `southeastasia`.

Override:

```bash
RG=other-rg LOCATION=centralindia SWA_LOCATION=southeastasia BASE_NAME=agentsentry ./infra/deploy.sh
```

## Resources provisioned

| Resource | Name |
|----------|------|
| Log Analytics | `{baseName}-logs` |
| Application Insights | `{baseName}-insights` |
| Container Registry | `{baseName}acr` |
| Container Apps Environment | `{baseName}-aca-env` |
| Container App (API) | `{baseName}-api` |
| Static Web App (UI) | `{baseName}-mc` |

## Cost guard (pay-as-you-go)

Cap spend on the resource group and auto-stop API compute when the monthly bill exceeds **1500 INR**:

```bash
chmod +x infra/cost-guard/*.sh
ALERT_EMAIL=you@example.com ./infra/cost-guard/setup.sh
```

- **80%** of budget → email warning (if `ALERT_EMAIL` is set)
- **100%** of budget → Automation runbook scales `agentsentry-api` to **0 replicas**

Manual controls:

```bash
./infra/cost-guard/stop-now.sh    # stop API compute immediately
./infra/cost-guard/resume-api.sh  # restore min=1 max=3
```

ACR, App Insights, and Static Web App may still incur charges after the API is stopped.

## Manual steps

See [`docs/AZURE_DEPLOY.md`](../docs/AZURE_DEPLOY.md) for GitHub Actions setup and troubleshooting.

## Outputs

After deploy, check `infra/deployment-outputs.json`:

```bash
jq . infra/deployment-outputs.json
```
