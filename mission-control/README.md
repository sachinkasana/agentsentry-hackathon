# AgentSentry Mission Control

Next.js dashboard for the AgentSentry control plane — fleet overview, pre-deploy scans, evidence traces, and runtime guard monitoring.

Built with **Microsoft Fluent UI v9** and **Application Insights** client telemetry.

## Quick start (local)

```bash
# Terminal 1 — control plane API (from repo root)
uvicorn agentsentry.main:app --reload --port 8080

# Terminal 2 — Mission Control
cd mission-control
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | FastAPI base URL. Use `http://localhost:8080` locally. Leave empty in Azure (SWA proxies `/v1/*`). |
| `NEXT_PUBLIC_APPLICATIONINSIGHTS_CONNECTION_STRING` | Client telemetry (optional locally) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` to show mock runtime guard events |

## Pages

| Route | Purpose |
|---|---|
| `/` | Fleet overview — agents, posture, critical findings |
| `/agents` | Register and list agents |
| `/agents/detail?agentId=` | Agent detail, scan history, trigger scan |
| `/scans/detail?scanId=` | Scan results and findings table |
| `/findings/detail?scanId=&findingId=` | Evidence trace timeline |
| `/runtime` | Live guard events (SSE when API ships; demo mode fallback) |
| `/traces` | Trace explorer — scan evidence + App Insights link |

## Build & deploy

```bash
npm run build    # static export to out/
```

Deployed to **Azure Static Web Apps** via `.github/workflows/azure-static-web-apps.yml`.

API calls in production use same-origin `/v1/*` routes proxied to Azure Container Apps (see `staticwebapp.config.json`).

## Microsoft stack

- Fluent UI React (`@fluentui/react-components`)
- Application Insights Web SDK (`@microsoft/applicationinsights-web`)
- Azure Static Web Apps hosting
