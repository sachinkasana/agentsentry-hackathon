# Mission Control — 3-Minute Judge Demo Script

Use this walkthrough to demonstrate AgentSentry's **Scan + Guard + Audit** story via Mission Control.

## Before you start

```bash
# Terminal 1 — API
uvicorn agentsentry.main:app --reload --port 8080

# Terminal 2 — Dashboard
cd mission-control && npm run dev
```

Optional: `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to preview runtime guard events.

---

## Demo flow (≈3 minutes)

### 1. Fleet Overview (30 sec) — `/`

- Point out the **one pane of glass** for agent fleet security.
- Show API health badge (green = control plane online).
- If empty, note guided empty state → register first agent.

**Talking point:** *"Microsoft ships PyRIT, Prompt Shields, and red-team tools in silos. AgentSentry unifies them."*

### 2. Register an agent (30 sec) — `/agents`

- Register:
  - Name: `customer-support-agent`
  - Endpoint: `mock://vulnerable`
  - Tools: `fetch_url, send_email`
- Emphasize: **registration does not scan** — it's catalog-only.

**Talking point:** *"Register once, scan when you're ready — same model as production CI gates."*

### 3. Run a security scan (45 sec) — Agent detail

- Open the agent → **Run scan** → select attacks (or all).
- Show loading state (sync scan today).
- Land on scan results with **posture score** (0–100).

**Talking point:** *"Agentic Attack Pack runs indirect injection, tool poisoning, exfiltration — PyRIT-compatible extensions for agents, not just models."*

### 4. Evidence trace (45 sec) — Finding detail

- Click **View trace** on the indirect injection finding.
- Walk through the timeline:
  1. Attack setup (poisoned URL)
  2. Benign user prompt
  3. Agent response
  4. Compromised tool call (`send_email` to attacker)
  5. LLM judgment → VULNERABLE
  6. Remediation guidance

**Talking point:** *"Full decision trace — what the agent did, not just pass/fail. This is the audit layer."*

### 5. Runtime + Telemetry (30 sec)

- **`/runtime`** — explain guard SSE stub; enable demo mode for mock blocks.
- **`/traces`** — scan trace index + Application Insights Portal link.

**Talking point:** *"Scan finds holes pre-deploy; Guard blocks live traffic; App Insights ties it together."*

---

## Azure deployment talking points

| Component | Azure service |
|---|---|
| Mission Control | Azure Static Web Apps |
| Control plane API | Azure Container Apps |
| Telemetry | Application Insights |
| Runtime injection detection | Azure AI Content Safety Prompt Shields (API team) |

Live URL: your Static Web App hostname after `azure-static-web-apps` workflow runs.

---

## Evaluation criteria mapping

| Criterion | Demo moment |
|---|---|
| AI Integration (25%) | Posture score, attack evidence, LLM judgment trace |
| Architecture (25%) | SWA + ACA + App Insights, Fluent UI, typed API client |
| UX (15%) | Fleet cards, scan workflow, evidence timeline |
| Prototype readiness (15%) | Live deploy URL, API proxy, telemetry events |
| Problem clarity (10%) | Register → Scan → Trace → Remediate narrative |
| Market fit (10%) | Multi-agent fleet, pre-deploy + runtime tabs |
