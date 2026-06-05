# AgentSentry Azure Infrastructure

Bicep templates for Mission Control (Azure Static Web Apps), Control Plane API (Container Apps + ACR), and Application Insights.

## Quick deploy

```bash
az login
az account set --subscription "<your-subscription-name-or-id>"
chmod +x infra/deploy.sh
./infra/deploy.sh
```

**Default regions (India):** backend `centralindia`, Static Web App `southeastasia`.

Override:

```bash
RG=my-rg LOCATION=centralindia SWA_LOCATION=southeastasia BASE_NAME=agentsentry ./infra/deploy.sh
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

## Manual steps

See [`docs/AZURE_DEPLOY.md`](../docs/AZURE_DEPLOY.md) for GitHub Actions setup and troubleshooting.

## Outputs

After deploy, check `infra/deployment-outputs.json`:

```bash
jq . infra/deployment-outputs.json
```
