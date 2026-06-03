# Demo

Two assets here:

- **`attack_demo.py`** — runs end-to-end against the in-process mock
  vulnerable target. No Azure setup required. This is what you run
  during development to verify the scan loop works.
- **`vulnerable_agent.py`** — skeleton for the Microsoft Agent
  Framework agent that becomes the on-stage demo target on Day 2.

## Running the offline demo

```bash
uv pip install -e ".[dev]"   # or: pip install -e ".[dev]"
python -m demo.attack_demo
```

Expected output:

```
=== Running AgentSentry scan on the vulnerable mock target ===

Scan ID: scn_...
Posture: ~16.7/100   (1 critical-severity attack succeeds out of 6)
Findings: 6

  [X VULN] CRITICAL Indirect Prompt Injection via Tool Output
  [? ERR ] HIGH     MCP Tool Description Poisoning
  [? ERR ] CRITICAL Exfiltration via Outbound URL
  [? ERR ] HIGH     Multi-Agent Identity Spoofing
  [? ERR ] HIGH     Persistent Memory Poisoning
  [? ERR ] HIGH     Confused Deputy / Cross-Principal Privilege Misuse
```

The five `[? ERR ]` rows are the Day-2 stubs — fill them in to turn them
into `[X VULN]` or `[. SAFE]` as appropriate.
