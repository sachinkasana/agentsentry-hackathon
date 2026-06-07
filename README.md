# AgentSentry

> Unified **Scan + Guard + Audit** plane for AI agent fleets.

**Microsoft Build AI 2026 — Theme: Security in the Agentic Future**

---

## Project Description

AI agents are powerful, but they are also new attack surfaces. As autonomous systems make decisions, browse the web, and talk to each other, the security landscape gets more complex. Microsoft already ships strong primitives — PyRIT for red-teaming, Prompt Shields for runtime injection detection, and the AI Red Teaming Agent in Azure AI Foundry — but they sit in **silos**.

**AgentSentry** is the missing layer on top: a unified security platform for agent fleets that covers the full lifecycle.

| Pillar | What it does |
|--------|--------------|
| **Scan** | Pre-deploy red-teaming with 6 agent-specific attacks |
| **Guard** | Runtime blocking via capability policy + Azure Prompt Shields |
| **Audit** | Decision traces, posture scores, and Application Insights telemetry |

**Product surfaces:**

1. **Agentic Attack Pack** — PyRIT-compatible attacks for agent threats (not just model threats): indirect prompt injection via tool output, tool description poisoning, exfiltration via URL, multi-agent identity spoofing, memory poisoning, confused deputy.
2. **Mission Control** — Next.js dashboard for fleet overview, scan results, evidence traces, and live runtime guard events.
3. **SecurityGate** — GitHub Action to scan on every PR and block merge on regressions *(roadmap)*.

**Hackathon theme alignment:**

| Theme requirement | AgentSentry coverage |
|-------------------|---------------------|
| Prompt injection | Indirect injection attack + Prompt Shields at runtime |
| Identity spoofing | Multi-agent A2A spoofing attack |
| Unauthorized access | Confused deputy + exfiltration URL attacks; capability allowlist |
| Adversarial misuse | Tool poisoning + memory poisoning attacks |
| Monitoring framework | Mission Control + Application Insights |
| Defense mechanism | Runtime Guard + Prompt Shields |
| Trust architecture | Capability policy engine + signed decision traces |

---

## Setup Instructions

### Prerequisites

- **Python** 3.11+ ([uv](https://github.com/astral-sh/uv) recommended)
- **Node.js** 20.9+ and npm (for Mission Control)
- **Azure CLI** (optional, for cloud deploy)
- Azure OpenAI and Content Safety credentials (optional for offline demo)

### 1. Clone and install the control plane

```bash
git clone https://github.com/GaganSuneja/agentsentry-hackathon.git
cd agentsentry-hackathon

uv venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — Azure keys optional for offline demo (mock target works without them)
```

### 3. Run the API

```bash
uvicorn agentsentry.main:app --reload --port 8080
```

### 4. Run the offline attack demo (optional)

```bash
python -m demo.attack_demo
```

### 5. Run Mission Control dashboard

```bash
cd mission-control
cp .env.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to preview runtime guard events without live SSE traffic.

### 6. Demo workflow

1. Register an agent at `/agents` (endpoint: `mock://vulnerable`)
2. Browse the Attack Pack at `/attacks`
3. Run a scan **without** Runtime Guard → posture 0, all vulnerable
4. Run a scan **with** Runtime Guard → posture 100, all defended
5. Open evidence trace on a finding → full decision timeline

See [`docs/MISSION_CONTROL_DEMO.md`](docs/MISSION_CONTROL_DEMO.md) for the full 3-minute judge script.

### 7. Deploy to Azure (optional)

```bash
chmod +x infra/deploy.sh
./infra/deploy.sh
```

Full guide: [`docs/AZURE_DEPLOY.md`](docs/AZURE_DEPLOY.md). GitHub Actions workflows deploy infrastructure, the API (Container Apps), and Mission Control (Static Web Apps) when repository secrets are configured.

### API surface

```
POST /v1/agents              # Register a target agent
GET  /v1/agents              # List agents
POST /v1/scans               # Trigger a scan against an agent
GET  /v1/scans/{scan_id}     # Get scan results
GET  /v1/runtime/events      # Stream runtime guard events (SSE)
```

---

## Dependencies

### Python (control plane)

Core dependencies from `pyproject.toml`:

| Package | Purpose |
|---------|---------|
| `fastapi`, `uvicorn` | REST API + SSE server |
| `pydantic`, `pydantic-settings` | Config and request/response models |
| `httpx` | HTTP client for target agents |
| `structlog` | Structured logging |

Optional extras:

| Extra | Packages | Purpose |
|-------|----------|---------|
| `azure` | `openai`, `azure-identity`, `azure-ai-contentsafety`, `azure-cosmos`, `azure-monitor-opentelemetry` | Azure OpenAI judge, Prompt Shields, Cosmos, telemetry |
| `agents` | `agent-framework` | Microsoft Agent Framework target agents |
| `pyrit` | `pyrit` | Microsoft red-teaming toolkit integration |
| `dev` | `pytest`, `ruff`, `mypy` | Tests and linting |

Install all: `uv pip install -e ".[all]"`

### Node.js (Mission Control)

| Package | Purpose |
|---------|---------|
| `next`, `react`, `react-dom` | Dashboard framework |
| `@fluentui/react-components`, `@fluentui/react-icons` | Microsoft Fluent UI v9 |
| `@microsoft/applicationinsights-web` | Client telemetry |

### Azure services (production)

| Service | Role |
|---------|------|
| Azure Container Apps | FastAPI control plane |
| Azure Static Web Apps | Mission Control hosting + API proxy |
| Azure Container Registry | API container images |
| Azure OpenAI | Target model + LLM-as-judge |
| Azure AI Content Safety | Prompt Shields |
| Application Insights | Monitoring and audit telemetry |
| Azure AI Foundry | Target agent hosting *(planned)* |
| Microsoft Entra ID | Workload identity *(planned)* |

Infrastructure is defined in Bicep under [`infra/`](infra/).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│  Mission Control — Next.js + Fluent UI                   │
│  Azure Static Web Apps                                   │
└────────────────────────┬─────────────────────────────────┘
                         │ REST /v1/*  +  SSE /v1/runtime/events
┌────────────────────────▼─────────────────────────────────┐
│  AgentSentry Control Plane — FastAPI (Azure Container Apps)│
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Scan Runner  │  │ Runtime Guard│  │ Posture      │    │
│  │ + Attack Pack│  │ + Policy     │  │ Scoring      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘    │
└─────────┼─────────────────┼──────────────────────────────┘
          │                 │
   ┌──────▼────────┐  ┌─────▼──────┐   ┌─────────────────┐
   │ 6 Agentic     │  │ Prompt     │   │ Application     │
   │ Attacks       │  │ Shields    │   │ Insights        │
   └──────┬────────┘  └────────────┘   └─────────────────┘
          │
   ┌──────▼────────────────────────────┐
   │ Target Agents                     │
   │ Mock / HTTP demo · MS Agent       │
   │ Framework on Azure AI Foundry     │
   └───────────────────────────────────┘
```

**Data flow:**

1. **Register** — User registers agent metadata via Mission Control → `POST /v1/agents`
2. **Scan** — User triggers scan → Scan Runner runs Attack Pack against target → findings + posture score (0–100)
3. **Guard** — When enabled, Runtime Guard wraps the target: Prompt Shields scan untrusted content; capability policy blocks unsafe tool calls
4. **Audit** — Evidence traces in Mission Control; custom events in Application Insights; SSE stream at `/v1/runtime/events`

**Repo layout:**

| Path | Contents |
|------|----------|
| `src/agentsentry/` | FastAPI control plane, attacks, guard, scoring |
| `mission-control/` | Next.js dashboard |
| `demo/` | Vulnerable agent + offline scan script |
| `tests/` | pytest suite |
| `infra/` | Bicep templates (SWA + ACA + App Insights) |
| `docs/` | Architecture, attacks, deploy, and demo guides |

Deeper docs: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/ATTACKS.md`](docs/ATTACKS.md).

---

## AI Tools Used

### Microsoft / Azure AI (product stack)

| Tool | How AgentSentry uses it |
|------|-------------------------|
| **PyRIT** | Foundation for red-teaming; attack pack is PyRIT-compatible |
| **Azure AI Content Safety — Prompt Shields** | Runtime injection detection on untrusted tool outputs |
| **Azure OpenAI** | Target agent LLM (gpt-4o) + LLM-as-judge (gpt-4o-mini) for fuzzy attack scoring |
| **Microsoft Agent Framework 1.0** | Target agent runtime for multi-agent workflows |
| **Azure AI Foundry** | Agent hosting and red-team tooling alignment |

### AI-assisted development

| Tool | How the team used it |
|------|----------------------|
| **GitHub Copilot** | Code completion and refactoring across Python and TypeScript |
| **Cursor** | AI pair programming for architecture, UI components, and Azure integration |
| **Kiro** | AI-driven development workflows for full-stack features |

---

## Team Member Details

| Name | Role | Responsibilities |
|------|------|------------------|
| **Sachin Kasana** | Principal Engineer · Platform & Backend Lead | Control plane architecture (FastAPI), Agentic Attack Pack, Runtime Guard and capability policy, Azure deployment (Bicep, Container Apps, GitHub Actions), LLM judge integration, scan orchestration |
| **Gagan Suneja** | Full Stack Developer · Frontend Lead | Mission Control dashboard (Next.js, Fluent UI v9), fleet/scan/evidence UX, Application Insights client telemetry, Static Web Apps integration, accessible UI patterns |

**Sachin Kasana** — 12+ years building scalable backend systems, cloud platforms, and production AI applications. Stack: Node.js, Python, TypeScript, AWS, LLM and agent workflows. [devutil.dev](https://devutil.dev)

**Gagan Suneja** — 6+ years full-stack development. Stack: JavaScript/TypeScript, Angular, React, Node.js, Nest.js, GraphQL, AWS, accessible web applications. AI-driven development with Cursor and Kiro.

---

## License

MIT — see [`LICENSE`](LICENSE).
