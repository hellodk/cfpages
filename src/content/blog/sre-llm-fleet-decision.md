---
title: "SRE LLM Fleet Decision: 20x M4 Minis, LiteLLM, Opik"
date: 2026-10-04
description: "Decision record: 20x Mac Mini M4 agentic LLM fleet for Open SRE — models, LiteLLM gateway, Opik tracing and hallucination control, monitoring."
tags: [sre, llm, fleet, litellm, opik]
cover: "assets/images/covers/sre-llm-fleet-decision.svg"
draft: false
---

What runs where, what routes, what watches — and the hallucination plan. Everything below was verified against docs, sources, or our own machines on 2026-10-02–04.

**Feasible**20 devs on 20x M4 16GB — in the ≤14B / small-MoE band only

**Gateway: LiteLLM**proxy + Opik callback; Portkey evaluated, not chosen

**50.8 tok/s**Gemma E2B measured on the 8GB M2 (2.66 GB peak)

**No model parallelism**1 copy per node; parallelism lives at request level

## 1\. Fleet layout (18 serve + 2 ops)

| Nodes | Model (MLX 4-bit) | Resident | Job |
| --- | --- | --- | --- |
| 10 | `mlx-community/gemma-4-e2b-it-4bit` (gated) | 2.66 GB peak, measured | fast path: triage, chat, summaries, simple tools |
| 4 | `Outlier-Ai/Qwen3-14B-MLX-4bit` (Apache-2.0) | 8.31 GB weights (HF page) | tool-reliability tier: multi-step agents (Qwen tops open tool boards) |
| 4 | `mlx-community/gpt-oss-20b-MXFP4-Q4` (Apache-2.0) | ~12 GB (est.) | reasoning tier: hard evidence analysis; cap context 8–16K |
| 1 | LiteLLM proxy + Redis (routing state) + per-key budgets |
| 1 | Prometheus + Grafana + Loki (7–14d retention) + OTEL collector |

Per-node server repeats mm1's proven pattern (`mlx_lm.server --host 0.0.0.0 --port 8080` + LaunchAgent). Context caps 16–32K (8–16K on gpt-oss — reasoning traces eat budget fast). 256 GB disk is never the constraint; 16 GB RAM is, everywhere.

## 2\. Gateway decision: LiteLLM proxy (Portkey evaluated)

| Need | LiteLLM (chosen) | Portkey gateway |
| --- | --- | --- |
| Smart routing | 5 strategies: simple-shuffle (default), least-busy, usage-based (+v2), latency-based, cost-based; per-group strategies + health-check-driven removal | weighted LB, conditional routing, canary testing |
| Failure handling | retries (fixed + exp backoff, per-error policy), cooldowns, order-based fallbacks, **context_window_fallbacks** (overflow → bigger-context tier) | retries ≤5 w/ exp backoff + Retry-After, error-scoped fallbacks, circuit protection |
| Users + budgets | virtual keys, teams, per-key/per-model budgets, tag budgets, spend reports (OSS) | virtual keys, hourly/daily cost + token limits, RBAC |
| Opik tracing | first-class: `callbacks: ["opik"]`, per-request `opik_*` headers, per-key auto metadata | generic logging integrations |
| Guardrails inline | OSS: custom + Presidio PII; Lakera/LlamaGuard/hide_secrets need Enterprise license | 50+ guardrails, bring-your-own or partners |
| Self-host fit | Python, runs on a spare Mini; OpenCode listed as integration | `npx @portkey-ai/gateway`; Gateway 2.0 merging enterprise into OSS (pre-release) |

**Why LiteLLM wins here:** Opik callback is documented end-to-end (Opik already runs in-cluster — no new platform); OSS budgets cover 20 devs; `context_window_fallbacks` maps exactly onto tiered nodes (Gemma → Qwen on overflow/failure). Portkey's real edges — canary testing, conditional routing — don't decide this deployment. Revisit if canary-by-traffic-split becomes a requirement.

```bash
router_settings:
  routing_strategy: least-busy   # within a tier: fewest active requests
  num_retries: 3
fallbacks:
- sre-fast: [sre-tools]          # Gemma tier -> Qwen tier on failure
context_window_fallbacks:
- sre-fast: [sre-tools]
```

## 3\. Hallucinations: what the proxy can and cannot do

**No proxy prevents hallucinations inline.** LiteLLM OSS guardrails are Presidio/custom-code class (PII, injection patterns, JSON-schema validation) — hallucination needs an LLM judge, which is Opik's job. The working loop, per Opik's own docs:

| **Online evaluation** (async, sampled, non-blocking) | LLM-as-a-judge metrics incl. **Hallucination**, Answer Relevance, Context Precision score production traces; finds failure modes without adding latency |
| --- | --- |
| **Guardrails** (inline, blocking) | PII, topics, injection/jailbreak, plain-language LLM-judge check, custom classifier — promote a check here only once online eval proves it must never reach a user |
| **CI evals** | Opik PyTest integration: production failures become regression cases, run per commit |

Caveat: Opik's guardrails backend prefers a GPU node; the Minis have none spare — expect higher guardrail latency until a GPU host exists. For evidence collection specifically: demand structured JSON out (all three tiers support it), score it with the JSON-schema validator pre-call and Opik judges post-hoc.

## 4\. Monitoring (from the utilities comparison)

**Infra layer** (spare 2): Prometheus scrapes per-node exporters + gateway metrics; Grafana dashboards; Loki for transcripts. **Exporter pick:** `mactop -p` or `macmon serve` per node — both sudoless with Prometheus endpoints. mactop has the wider sudoless surface (ANE/DRAM power, all SMC temps, fan control, Thunderbolt); macmon is smaller. Keep `omlx-telemetry` for the MLX-specific layer (worker CPU/RSS, IOKit GPU-memory split — neither exporter does that). `powermetrics` stays for deep-dives only (needs sudo). Human dashboard: SiliconScope on one admin Mac (remote-node views, tok/s readout).

**LLM layer** (in-cluster Opik, 53 days uptime — not re-hosted): every gateway completion traced; one project per SRE use-case, thread per incident; evidence _is_ the trace threads, queryable via UI and the `mcp/opik` server. ANE monitoring explicitly out of scope: MLX computes on GPU (server fingerprint `applegpu_g14g`), ANE will read ~0W — alert on GPU residency/power instead.

## 5\. Open items

| Evaluate `omlx` (continuous batching + SSD KV offload) vs raw `mlx_lm.server` after 3 nodes are up — mm1 telemetry already expects `omlx-server` workers |
| --- |
| Confirm `/metrics` on `mlx_lm.server`; else gateway + node telemetry cover the golden signals |
| GPU host for Opik guardrails backend, or accept CPU latency |
| One GUI-context `launchctl bootstrap` per Mini for server persistence (SSH cannot activate user agents) |

Estimates are marked est.; everything else observed or doc-sourced 2026-10-02–04.
