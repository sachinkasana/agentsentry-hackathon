# Architecture

## Layered design

```
┌──────────────────────────────────────────────────────────────────┐
│  Mission Control (Next.js, Azure Static Web Apps)                │
│  - Scans, findings, runtime events, posture trend                 │
└────────────────────────┬─────────────────────────────────────────┘
                         │ REST + SSE
┌────────────────────────▼─────────────────────────────────────────┐
│  Control Plane (FastAPI, Azure Container Apps)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Scan Runner  │  │ Runtime Guard│  │ Posture Service      │    │
│  │ (orchestrate)│  │ (Day-3)      │  │ (weighted scoring)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘    │
│  ┌──────▼───────────────────▼────────────────────────────┐       │
│  │ Storage (Protocol) — InMemory (Day 1) | Cosmos (Day 2)│       │
│  └────────────────────────────────────────────────────────┘       │
└──────┬─────────────────────┬──────────────────────────────────────┘
       │                     │
┌──────▼─────────┐    ┌──────▼─────────────┐
│ Attack Pack    │    │ Azure Services      │
│ (AttackBase    │    │ - OpenAI (judge)    │
│  registry)     │    │ - Content Safety    │
│                │    │   (Prompt Shields)  │
│ 1 full impl,   │    │ - App Insights      │
│ 5 stubs (Day 2)│    │ - Cosmos DB         │
└──────┬─────────┘    └─────────────────────┘
       │
┌──────▼─────────────────────────────────────────────────────────┐
│ Target Agents                                                    │
│ - MockVulnerableTarget (offline, Day 1)                           │
│ - HttpTarget (any agent exposing the chat contract)                │
│ - Microsoft Agent Framework agents on Azure AI Foundry (Day 2)     │
└─────────────────────────────────────────────────────────────────┘
```

## Why this shape

**Plugin-first.** Every attack subclasses `AttackBase`, declares static
`metadata`, and self-registers via `@register_attack`. New attacks land
in one file; no orchestration code changes.

**Protocol over inheritance.** `TargetAgent` is a structural Protocol —
the mock target, the HTTP target, and a future MS Agent Framework
adapter all satisfy it without sharing a base class. Same for `Storage`.

**No Azure required to run.** Every Azure dependency is lazy-loaded behind
`AzureNotConfigured`. The scaffold runs end-to-end against the mock
target with the `dev` extras only. Azure flips on per-feature as the
team wires it (judge → Day 2, Prompt Shields → Day 3).

**Severity-weighted posture score.** Posture is a single 0–100 number for
dashboard summaries: critical-severity attacks defended count for far
more than low-severity ones. Errors don't penalize but don't credit
either, so a half-implemented attack pack still gives the team a
trustworthy score.

## Module map

| Module | Responsibility |
|---|---|
| `agentsentry.main` | FastAPI app factory + logging |
| `agentsentry.config` | Settings loaded from env |
| `agentsentry.models.*` | Pydantic types: Agent, Attack, Scan, Finding |
| `agentsentry.attacks.base` | `AttackBase` + `AttackResult` |
| `agentsentry.attacks.registry` | Registration + lookup |
| `agentsentry.attacks.indirect_injection` | The fully-implemented showcase attack |
| `agentsentry.attacks.{tool,exfil,identity,memory,deputy}_*` | Day-2 stubs |
| `agentsentry.scoring.llm_judge` | LLM-as-judge for fuzzy outcomes |
| `agentsentry.services.target_client` | TargetAgent protocol + MockVulnerableTarget + HttpTarget |
| `agentsentry.services.scan_runner` | Orchestrates a scan |
| `agentsentry.services.azure_clients` | Lazy Azure SDK factories |
| `agentsentry.storage.memory` | In-memory Storage |
| `agentsentry.guard` | Day-3 runtime middleware (empty stub) |
| `agentsentry.cli` | `agentsentry scan` for CI |
| `demo/attack_demo.py` | Offline end-to-end demo |
| `demo/vulnerable_agent.py` | MS Agent Framework demo target skeleton |

## Trust boundaries

```
       ┌─────────────────────────────┐
       │ User                         │
       └──────────────┬──────────────┘
                      │ HTTP
       ┌──────────────▼──────────────┐
       │ Control Plane                │ ← AgentSentry trusted
       └──────────────┬──────────────┘
                      │
       ┌──────────────▼──────────────┐
       │ Target Agent                 │ ← *under test* — untrusted
       └──────┬───────────────┬──────┘
              │               │
   ┌──────────▼──┐    ┌───────▼──────────┐
   │ Tool: web   │    │ Tool: email      │ ← outputs UNTRUSTED
   │ (poisoned!) │    │                  │
   └─────────────┘    └──────────────────┘
```

The fundamental insight encoded in every attack: **tool outputs are not
trusted instructions**. They are data from an untrusted boundary, even
when the tool itself is "legitimate." Prompt Shields is the runtime
enforcement of this rule.
