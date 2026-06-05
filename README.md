# AgentSentry

> Unified **Scan + Guard + Audit** plane for agent fleets. Built on PyRIT, Azure AI Content Safety Prompt Shields, and Microsoft Agent Framework.

**Microsoft Build AI 2026 — Theme: Security in the Agentic Future**

---

## What it is

Microsoft already shipped excellent agent security primitives — PyRIT for red-teaming, Prompt Shields for runtime injection detection, the AI Red Teaming Agent in Azure AI Foundry. They sit in silos.

AgentSentry is the missing layer on top:

1. **Agentic Attack Pack** — PyRIT-compatible attack extensions covering threats specific to *agents* (not just models): indirect prompt injection via tool output, tool description poisoning, exfiltration via URL, multi-agent identity spoofing, memory poisoning, confused deputy.
2. **Mission Control** dashboard — pre-deploy scan results, live runtime defense events, decision traces, and a posture score per agent in one pane of glass.
3. **SecurityGate** GitHub Action — runs scans on every PR, blocks merges on regressions, posts findings as PR comments.

## Theme mapping

| Theme keyword | AgentSentry coverage |
|---|---|
| Prompt injection | Direct + indirect (via tool output) attacks in pack; Prompt Shields at runtime |
| Identity spoofing | Multi-agent A2A spoofing attack; Entra workload identity for legitimate agents |
| Unauthorized access | Confused deputy attack; capability allowlist in runtime guard |
| Adversarial misuse | Memory poisoning + tool description poisoning attacks |
| Monitoring framework | Mission Control dashboard + Application Insights traces |
| Defense mechanism | Runtime guard middleware + Prompt Shields integration |
| Trust architecture | Capability policy engine + signed decision traces |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Next.js Mission Control (Azure Static Web Apps)         │
└────────────────────────┬─────────────────────────────────┘
                         │ REST
┌────────────────────────▼─────────────────────────────────┐
│  AgentSentry Control Plane — FastAPI                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Scan Runner  │  │ Runtime Guard│  │ Posture      │    │
│  │              │  │              │  │ Service      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │
   ┌──────▼────────┐  ┌─────▼──────┐   ┌─────▼─────────┐
   │ Attack Pack   │  │ Prompt     │   │ Application   │
   │ (PyRIT + ours)│  │ Shields    │   │ Insights      │
   └──────┬────────┘  └────────────┘   └───────────────┘
          │
   ┌──────▼────────────────────────────┐
   │ Target Agent (Microsoft Agent     │
   │ Framework on Azure AI Foundry)    │
   └───────────────────────────────────┘
```

## Microsoft stack

- **Microsoft Agent Framework 1.0** — target agents (graph workflows for multi-agent attacks)
- **Azure AI Foundry** — agent hosting
- **Azure OpenAI** — target model + judge model
- **Azure AI Content Safety — Prompt Shields** — runtime injection detection
- **PyRIT** — base attack library + scorers
- **Azure Application Insights** — telemetry
- **Microsoft Entra ID** — workload identities
- **Azure Container Apps** — control plane hosting
- **Azure Static Web Apps** — dashboard hosting
- **GitHub Actions** — CI integration
- **GitHub Copilot** — used throughout development

## Quick start

```bash
# 1. Create venv (uv recommended)
uv venv && source .venv/bin/activate

# 2. Install
uv pip install -e ".[dev]"

# 3. Configure
cp .env.example .env
# Fill in Azure OpenAI + Content Safety endpoints

# 4. Run control plane
uvicorn agentsentry.main:app --reload --port 8080

# 5. In another shell, run the demo scan
python -m demo.attack_demo
```

### Mission Control dashboard

```bash
# With the API running on :8080 (step 4 above)
cd mission-control
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

See [`mission-control/README.md`](mission-control/README.md) for pages and env vars. Judge demo script: [`docs/MISSION_CONTROL_DEMO.md`](docs/MISSION_CONTROL_DEMO.md).

### Deploy to Azure

**Full guide:** [`docs/AZURE_DEPLOY.md`](docs/AZURE_DEPLOY.md)

```bash
# One-command deploy (Azure CLI logged in)
chmod +x infra/deploy.sh
./infra/deploy.sh
```

Or via GitHub Actions after adding secrets (see deploy guide).

API surface:

```
POST /v1/agents              # Register a target agent
GET  /v1/agents              # List agents
POST /v1/scans               # Trigger a scan against an agent
GET  /v1/scans/{scan_id}     # Get scan results
GET  /v1/runtime/events      # Stream runtime guard events (SSE)
```

## Repo layout

- `src/agentsentry/` — control plane (FastAPI), attacks, scoring, guard
- `mission-control/` — Next.js Mission Control dashboard (Fluent UI + App Insights)
- `demo/` — vulnerable Microsoft Agent Framework agent + sample scan script
- `tests/` — pytest suite
- `docs/ATTACKS.md` — full attack catalog with payloads & expected outcomes
- `docs/ARCHITECTURE.md` — deeper architecture notes
- `docs/MISSION_CONTROL_DEMO.md` — 3-minute hackathon demo script
- `infra/` — Bicep templates for Azure deployment (SWA + ACA + App Insights)
- `.github/workflows/` — infrastructure and Static Web Apps CI/CD


## License

MIT — see `LICENSE`.
