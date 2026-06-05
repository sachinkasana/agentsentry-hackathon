# How Registration, Scanning, and Runtime Guard Work

A beginner's guide to when AgentSentry runs checks — and what happens "on the fly."

**Key takeaway:** Registering an agent does **not** start scanning. Scanning is a separate, explicit step. Runtime protection (Guard) is a third layer, planned but not built in the boilerplate yet.

---

## The three phases

| Phase | When | What AgentSentry does today |
|-------|------|----------------------------|
| **Register** | Once (when you add an agent) | Saves metadata only — **no scan** |
| **Scan** | When you explicitly trigger it | Runs attack simulations against the agent |
| **Guard (on the fly)** | Every live request | **Not built yet** — planned Day 3 |

---

## Phase 1: Registration — just a catalog entry

When you call `POST /v1/agents`, you only tell AgentSentry *about* your agent.

**Stored fields:**

- `name` — friendly label
- `endpoint` — where the agent lives (e.g. `https://my-agent.../api/chat` or `mock://vulnerable`)
- `tools` — informational list (e.g. `fetch_url`, `send_email`)
- `framework`, `description`

**Nothing runs automatically.** No attacks fire. No posture score is computed.

Think of it like adding a server to a monitoring tool — you register it first, then run checks when you want.

### API

```
POST /v1/agents
{
  "name": "customer-support-agent",
  "endpoint": "https://my-agent.foundry.azure.com/api/chat",
  "tools": ["fetch_url", "send_email"]
}
```

**Response:** Agent record with `id` (e.g. `agt_abc123`) — use this for scans.

---

## Phase 2: Scanning — explicit, separate step

Scanning is **not** tied to registration. You trigger it yourself.

### API

```
POST /v1/scans
{ "agent_id": "agt_abc123" }
```

Optional: run only specific attacks:

```
POST /v1/scans
{
  "agent_id": "agt_abc123",
  "attacks": ["indirect_injection_v1"]
}
```

### What happens during a scan

```
1. Look up registered agent's endpoint
2. For each attack in the Attack Pack:
   a. SETUP   — plant the trap (poison URL, memory, etc.)
   b. TRIGGER — send a benign-looking prompt to the agent
   c. SCORE   — check if the agent did the bad thing
3. Produce findings (VULNERABLE / DEFENDED / ERROR)
4. Compute posture score (0–100)
```

### When would you scan?

| Trigger | Use case |
|---------|----------|
| Manually after registration | "Is this agent safe before we ship?" |
| After a code change | "Did our fix work?" |
| On every PR (planned SecurityGate) | CI blocks merge if posture regresses |
| CLI: `agentsentry scan --target ...` | Quick local/CI check |
| Demo: `python -m demo.attack_demo` | Offline walkthrough |

### Other scan endpoints

```
GET  /v1/scans                    → list all scans
GET  /v1/scans/{scan_id}          → full results + findings
GET  /v1/scans/_attacks/registry  → list available attacks
```

---

## Phase 3: Guard — on the fly (planned, not built)

This answers: **"How does protection work while real users talk to the agent?"**

The README describes it; the code is still a stub at `src/agentsentry/guard/`.

Planned components:

- `middleware.py` — wrap the agent endpoint
- `shields.py` — Azure AI Content Safety Prompt Shields
- `policy.py` — capability allowlist (e.g. block web → email)
- `tracing.py` — log blocks to Application Insights

Planned API:

```
GET /v1/runtime/events   → stream guard events (SSE) to dashboard
```

### How runtime is intended to work

```
   User
     │
     ▼
┌────────────────────────────┐
│  AgentSentry Guard         │  ← checks EVERY request
│  • Prompt Shields          │
│  • Capability policy       │
│  • Decision logging        │
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│  Your Agent (LLM + tools)  │
└────────────┬───────────────┘
             │
             ▼
        fetch_url, send_email, APIs...
```

Guard events stream to **Mission Control** dashboard for live monitoring.

---

## Scan vs Guard — what's the difference?

| | Scan | Guard |
|---|------|-------|
| **Timing** | Before / between deploys | Every live request |
| **Method** | Simulated attacks (red team) | Middleware + Prompt Shields |
| **Who initiates** | You or CI | Automatic on traffic |
| **Goal** | Find vulnerabilities | Block exploits in real time |
| **Status in boilerplate** | Works | Day 3 stub |

**They complement each other:**

- Scan finds holes before attackers do
- Guard stops attacks that scans didn't catch (new payloads, live traffic)

---

## End-to-end workflow

### Before deploy

```
1. Build your agent (LLM + tools)
2. POST /v1/agents              → register endpoint + tools
3. POST /v1/scans               → run attack pack
4. GET  /v1/scans/{id}          → read findings + posture score
5. Fix issues, re-scan until acceptable
6. (Optional) GitHub Action runs scan on every PR
```

### In production (planned)

```
1. User sends message to agent
2. Request goes through AgentSentry Guard first (not direct to agent)
3. Guard checks tool outputs with Prompt Shields
4. Guard enforces policies (e.g. no email with data from fetch_url)
5. Blocked/allowed events stream to dashboard
6. Periodic re-scans catch new attack patterns
```

---

## Visual overview

```
┌─────────────────────────────────────────────────────────────┐
│  REGISTER (once)                                             │
│  "Here is my agent at https://..."                           │
│  POST /v1/agents                                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  SCAN (on demand / CI)          ← boilerplate works today    │
│  POST /v1/scans → attacks → findings → posture score         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  GUARD (every live request)     ← Day 3, not built yet     │
│  Middleware + Prompt Shields + policy                        │
│  GET /v1/runtime/events (SSE)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Common misconceptions

| Myth | Reality |
|------|---------|
| "Registering auto-scans at init" | Registration only saves metadata |
| "One scan = forever safe" | New code, tools, or prompts need re-scans |
| "Scan replaces runtime guard" | Scan is pre-deploy testing; Guard is live protection |
| "AgentSentry replaces secure agent design" | It's a layer on top — you still need safe tools and policies |

---

## Quick CLI reference

```bash
# Start control plane
uvicorn agentsentry.main:app --reload --port 8080

# Offline demo (register + scan in one script)
python -m demo.attack_demo

# CLI scan (no API needed)
agentsentry scan --target mock://vulnerable
agentsentry scan --target https://my-agent/api/chat --fail-on critical --json
```

---

## Related docs

- `docs/ATTACK_WALKTHROUGH.md` — example-by-example attack guide
- `docs/AI_SECURITY_PRIMER.md` — beginner AI security concepts
- `docs/ARCHITECTURE.md` — system design and trust boundaries
- `docs/ATTACKS.md` — full attack catalog
