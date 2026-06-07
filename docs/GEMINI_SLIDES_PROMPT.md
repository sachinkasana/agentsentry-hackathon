# Google Slides Gemini AI Prompt — AgentSentry Pitch Deck

Copy everything inside the fenced block below and paste it into Google Slides Gemini AI.

````
Create a professional 10-slide pitch deck for the Microsoft Build AI 2026 hackathon submission. The hackathon theme is **"Security in the Agentic Future"**. The product is **AgentSentry** — unified Scan + Guard + Audit for AI agent fleets.

## Requirements

- Create **exactly 10 slides** — no more, no fewer.
- Use these **exact slide titles** (one per slide).
- Include **all bullet points and table content** specified below on each slide.
- **Design:** Professional Microsoft/Azure hackathon aesthetic — dark or clean tech look. Use Microsoft blue (#0078D4) as primary, green (#107C10) for "defended/success," red (#D13438) for "vulnerable/risk." Font: Segoe UI or Arial. Widescreen 16:9. Consistent AgentSentry branding on every slide (logo placeholder or wordmark).
- Add slide numbers on all slides.
- When finished, the deck should be ready to export as **`AgentSentry_Deck.pdf`** (PDF, ≤10 slides, ≤20 MB).

---

## SLIDE 1 — Problem: Security in the Agentic Future

**Layout:** Title slide — large title, subtitle, footer.

**Title:** AgentSentry  
**Subtitle:** Unified Scan + Guard + Audit for AI Agent Fleets  
**Footer:** Microsoft Build AI 2026

**Headline:** AI agents are powerful — but they're new attack surfaces.

**Body bullets:**
- As autonomous systems start **making decisions**, **browsing the web**, and **talking to each other**, the security landscape gets a whole lot more complex.
- This theme challenges builders to create **monitoring frameworks**, **defense mechanisms**, and **trust architectures** that keep agentic systems safe from:
  - **Prompt injection**
  - **Identity spoofing**
  - **Unauthorized access**
  - **Adversarial misuse**
- If agents are the future, someone needs to make sure that future is secure.
- **Today's gap:** Microsoft already ships PyRIT, Prompt Shields, and the AI Red Teaming Agent — but they sit in **silos**, with no unified lifecycle for agent fleets.

---

## SLIDE 2 — Solution Overview

**Title:** One Plane for Agent Fleet Security

**Three pillars table:**

| Pillar | What it does | Theme alignment |
|--------|--------------|-----------------|
| **Scan** | Pre-deploy red-team with 6 agent-specific attacks | Finds holes before production |
| **Guard** | Runtime blocking via capability policy + Prompt Shields | Defense mechanism |
| **Audit** | Decision traces, posture scores, App Insights telemetry | Monitoring framework + trust architecture |

**Product surfaces:**
1. **Agentic Attack Pack** — PyRIT-compatible attacks for agent threats (not just model threats)
2. **Mission Control** — Dashboard: scans, findings, runtime events, posture per agent
3. **SecurityGate** — GitHub Action: scan on every PR, block merge on regression *(roadmap)*

**Tagline (prominent):** *Register once → Scan → Guard → Trace → Remediate*

---

## SLIDE 3 — Architecture

**Title:** Scan + Guard + Audit Architecture

**Diagram instruction:** Leave a large central area for an architecture diagram OR generate a simple clean flowchart showing:

```
Mission Control (Azure Static Web Apps, Next.js + Fluent UI)
    ↓ REST /v1/* and SSE /v1/runtime/events
Control Plane (Azure Container Apps, FastAPI)
    ├── Scan Runner → Agentic Attack Pack (6 attacks) → Posture Scoring (0–100)
    └── Runtime Guard → Capability Policy (trust architecture) + Prompt Shields (defense)
         ↓
Target Agents (Mock / HTTP demo agent, Microsoft Agent Framework / Azure AI Foundry)
         ↓
Azure AI Services: Azure OpenAI (judge model), Content Safety (Prompt Shields), Application Insights (monitoring)
```

**Caption under diagram:**  
*Mission Control (SWA) → Control Plane (ACA) → Target Agents. Scan finds holes pre-deploy; Guard blocks live traffic; Audit traces every decision.*

**Layer summary table:**

| Layer | Tech | Azure service |
|-------|------|---------------|
| Mission Control | Next.js 15, Fluent UI v9 | Azure Static Web Apps |
| Control Plane | FastAPI, Python 3.11+ | Azure Container Apps |
| Attack Pack | 6 pluggable AttackBase probes | — |
| Runtime Guard | Policy engine + Prompt Shields | Azure AI Content Safety |
| Telemetry | Custom events + traces | Application Insights |
| Target agents | Mock, HTTP, MS Agent Framework | Azure AI Foundry |

**Data flow (one line at bottom):**  
Dashboard → POST /v1/scans → Attack Pack → Target Agent → Findings + Posture → Evidence Trace → Runtime SSE events

---

## SLIDE 4 — AI Integration Details

**Title:** AI-Powered Security, Not Just AI to Attack

**Integration table:**

| Integration | Role | Azure service |
|-------------|------|---------------|
| **Target agent LLM** | Agent under test executes tool calls | Azure OpenAI (gpt-4o) |
| **LLM-as-judge** | Scores fuzzy attack outcomes when deterministic checks aren't enough | Azure OpenAI (gpt-4o-mini) |
| **Prompt Shields** | Scans untrusted tool outputs before re-entering model context | Azure AI Content Safety |
| **Posture scoring** | Severity-weighted 0–100 fleet health score | Control plane (AI-informed findings) |
| **Evidence traces** | LLM judgment step in audit timeline | Mission Control UI |

**Callout box (highlighted):**  
*Tool outputs are not trusted instructions — they are data from an untrusted boundary.*

**Microsoft stack alignment bullets:**
- PyRIT — red-teaming foundation
- Microsoft Agent Framework 1.0 — multi-agent target workflows
- Azure AI Foundry — agent hosting
- GitHub Copilot + Cursor — AI-assisted development

---

## SLIDE 5 — Demo: Fleet Overview (Monitoring)

**Title:** Mission Control — One Pane of Glass

**IMAGE PLACEHOLDER 1 of 6** — Large screenshot area labeled:
`[INSERT: Fleet Overview screenshot — route /]`

**Placeholder description (show as caption or note near placeholder):**
- AgentSentry / Mission Control header with nav: Fleet · Agents · Attack Pack · Runtime · Traces
- Green **API Online** badge
- Stat cards: registered agents, fleet avg posture, critical vulns, attack pack count, total scans
- At least one agent card with posture gauge

**Caption bullets:**
- Unified **monitoring framework** for agent fleet security posture
- Register agents once; scan on demand or in CI
- Drill down from fleet → agent → scan → evidence trace

---

## SLIDE 6 — Demo: Attack Pack + Scan (Before Guard)

**Title:** Scan Finds the Holes

**IMAGE PLACEHOLDER 2 of 6** — Left or top area labeled:
`[INSERT: Attack Pack catalog screenshot — route /attacks/]`
- Show all 6 attacks grouped across 4 theme threat categories

**IMAGE PLACEHOLDER 3 of 6** — Right or bottom area labeled:
`[INSERT: Scan results WITHOUT Guard — route /scans/detail/?scanId=…]`
- Posture **0**, VULNERABLE findings, Runtime Guard **OFF**

**Caption bullets:**
- **6 implemented attacks** map to all 4 official theme threats
- Same agent, same attacks — without Guard, every probe succeeds
- Attack coverage grid shows pass/fail per threat category

**Threat coverage callout table:**

| Threat | Attacks |
|--------|---------|
| Prompt injection | Indirect injection via tool output |
| Identity spoofing | Multi-agent A2A spoofing |
| Unauthorized access | Exfiltration URL, Confused deputy |
| Adversarial misuse | Tool poisoning, Memory poisoning |

---

## SLIDE 7 — Demo: Scan (After Guard) + Evidence Trace

**Title:** Guard Closes Them — Audit Proves It

**IMAGE PLACEHOLDER 4 of 6** — Left area labeled:
`[INSERT: Scan results WITH Guard ON — route /scans/detail/?scanId=…]`
- Posture **100**, DEFENDED status, **Runtime Guard ON** badge

**IMAGE PLACEHOLDER 5 of 6** — Right area labeled:
`[INSERT: Evidence trace screenshot — route /findings/detail/?scanId=…&findingId=…]`
- Timeline with **COMPROMISED** tool call badge, judgment step visible

**Caption bullets:**
- **Defense mechanism:** capability policy blocks cross-domain flows (web → email)
- **Trust architecture:** full decision trace — setup → prompt → tool call → judgment → remediation
- Same agent, same attacks — Guard changes the outcome

---

## SLIDE 8 — Demo: Runtime Guard Monitor

**Title:** Live Defense in Production

**IMAGE PLACEHOLDER 6 of 6** — Large screenshot area labeled:
`[INSERT: Runtime Guard Monitor screenshot — route /runtime/]`

**Placeholder description:**
- Event cards: blocked, policy_violation, or Prompt Shields block
- Timestamp, agent ID, event summary
- SSE stream from /v1/runtime/events

**Caption bullets:**
- Runtime Guard emits events in real time during guarded scans and live traffic
- Prompt Shields + capability policy = layered **defense mechanisms**
- Connects pre-deploy Scan to production Guard — not a one-time checklist

---

## SLIDE 9 — Market Fit & Prototype Readiness

**Title:** Built for Production Agent Fleets

**Why now (left column or top section):**
- Enterprises deploying multi-agent workflows need **pre-deploy + runtime** security, not point tools
- Maps directly to OWASP LLM Top 10 and Microsoft AI Red Team taxonomy
- Fits existing Microsoft security investments — no rip-and-replace

**Prototype status table:**

| Component | Status |
|-----------|--------|
| 6-attack Agentic Attack Pack | ✅ Working |
| Mission Control dashboard | ✅ Working (SWA deploy) |
| Scan + posture scoring | ✅ Working |
| Runtime Guard (policy + shields) | ✅ Working when enabled |
| Azure infra (ACA + SWA + App Insights) | ✅ Bicep + GitHub Actions |
| SecurityGate GitHub Action | 🔜 Roadmap |

**Deploy path:** `infra/deploy.sh` → Static Web App URL + Container App API

---

## SLIDE 10 — Team

**Title:** The Team

**Layout:** Two-column bios.

**Sachin Kasana — Principal Engineer**
- 12+ years: scalable backends, cloud platforms, production AI
- Architected AgentSentry control plane, attack pack, Azure deployment
- Stack: Node.js, Python, TypeScript · AWS · LLM & agent workflows
- devutil.dev

**Gagan Suneja — Full Stack Developer**
- 6+ years: React, Angular, Node.js, Nest.js, GraphQL, accessible web apps
- Built Mission Control — Fluent UI fleet views, scan workflow, evidence traces
- Stack: TypeScript, React, AWS · AI-driven dev with Cursor & Kiro

**Closing line (bottom):**  
*Backend + platform depth meets polished operator UX — Scan, Guard, and Audit in one hackathon-ready product.*

---

## Design & polish checklist

- Exactly 10 slides total
- Every slide uses AgentSentry branding and Microsoft/Azure hackathon visual language
- Slides 5–8: clearly marked image placeholders with dashed borders and the descriptions above
- Slide 3: architecture diagram area is prominent (generated diagram or labeled placeholder)
- Slide 4: callout box for the "tool outputs" key insight
- Slide 2: three-pillar table and tagline are visually distinct
- Consistent typography, spacing, and color palette throughout
- Ready to export as **AgentSentry_Deck.pdf**

**Killer tagline to echo visually on demo slides:** *"Same agent, same attacks — Scan finds the holes; Guard closes them."*
````
