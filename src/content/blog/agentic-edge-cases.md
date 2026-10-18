---
title: "11 — Edge Cases Are the Load: Tools, Streaming, and the Zero-Completion Traces"
date: 2026-08-08
description: "The agentic benchmark suite ran, the token counters looked nearly dead, and “why so little token consumption?” turned out to be a crash report. This post is the full accounting: the agentic work we performed, the zero-completion trace investigation, a pass over every other metric, and a"
tags: [agents, llm]
cover: "assets/images/covers/agentic-edge-cases.svg"
draft: false
---

11 of 19 · agentic + edge cases

The agentic benchmark suite ran, the token counters looked nearly dead, and “why so little token consumption?” turned out to be a crash report. This post is the full accounting: the agentic work we performed, the zero-completion trace investigation, a pass over every other metric, and a recommendation list for tuning the model to survive tools, streaming and concurrency — plus a concrete plan for the `metal_gpu_error`.

Update — post 13Two claims here have been corrected by deeper forensics. The **version-skew suspect is ruled out**: both nodes run mlx `0.32.0` / mlx-lm `0.31.3`, identical. And **streaming+tools is not the only trigger**: macOS crash reports exist only on rank1 — an M4 16 GB paired with the M2 8 GB in a heterogeneous ring — and the faulting thread is mlx’s own GPU stream thread. After a Metal fault the device stays poisoned, so the _next_ request crashes too (even a trivial `max_tokens=5` one). **Decision (post 14, 08-05): the ring is retained — no single-node serving** — so the plan moves to supervisor recovery hardening and the mitigation list. Full forensics: [post 13](13-agentic-forensics.html) · decisions: [post 14](14-recommendations-decision.html).

## 1The agentic work we performed

`tools/bench_agentic.py` drives multi-turn tool-calling loops at the proxy — not single prompts, but the thing a coding agent or operator does: every turn re-sends the full transcript, the model emits `tool_calls`, a deterministic stub registry (calculator / get\_weather / get\_time) “executes” them, and the loop continues until the model answers without tools. Each run records turns, tool-call validity, per-turn TTFT, wall time, and is inspectable turn-by-turn in Opik. Reports land in git-ignored `tools/bench-reports/`. Qwen3.5-4B-MLX-8bit, three runs per scenario:

### Agentic scenarios (`bench_agentic.py`)

| scenario | config | turns | tool calls | valid | done | wall / run | TTFT mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **calculator** | 1 agent × 3 | 5 | 4 | 100% | yes | ~17 s | 0.72 s |
| **tri_tool** | 1 agent × 3 | 2 | 3 | 100% | yes | ~17 s | 3.4 s (max 5.3 s) |
| **planner** | 1 agent × 3 | 1 | 0 | — | yes | ~27 s | 2.4 s |
| **2× calculator** | 2 agents × 6 | — | — | — | no | — | **crash** `metal_gpu_error` |

**What the runs told us.** Single-turn tool calling is genuinely fine — calculator and tri\_tool produced 100% valid calls and completed in budget. The planner scenario is a _quality_ finding: the 4B model answered in one turn and ignored the tool directive entirely, so a multi-step planning loop needs a model that actually obeys tool instructions or a stronger prompt. And the concurrency finding is the one that matters: **two simultaneous calculator agents crashed the box where sixteen concurrent plain requests had just survived**. Tool-call traffic is a different GPU-pressure profile from plain text generation.

The short versionAgentic traffic was load-tested and the harness earned its keep: it reproduced the exact crash class the serving-health work (post 9) was built around — and today it did so again, with a twist (section 2).

## 2The token-consumption investigation: why 63% of traces have zero completion

Asked “why do I not see much token consumption?” against the Opik dashboard, the aggregate answer looked like an accounting bug:

385

traces in the mlx project

121,088

prompt tokens

10,657

completion tokens

63%

of traces with completion = 0

Today alone: 15 traces, 49,124 prompt tokens, **291** completion tokens — the working session sent huge prompts and generated almost nothing.

It is not a measurement bug. Pulling one of today’s streaming traces apart showed:

-   span output `{"content": "", "tool_calls": 0}` — **empty**;
-   `ttft == gen_time` (27.3 s) — the proxy’s TTFT fallback fires only when _no token ever arrived_;
-   request shape: `stream: true`, `tools_provided: true` — an opencode turn with tools enabled;
-   27 seconds after the trace started, the supervisor logged `server exited rc=0 reason=metal_gpu_error`.

The dying server sends an empty SSE stream, the proxy records what it received (nothing), and Opik reports `usage: {prompt: 7184, completion: 0}`. Then the supervisor restarts the box and the next turn repeats the cycle — every turn re-sends the whole transcript (that’s the 7k+ prompt tokens each), so prompt tokens climb while completion stays pinned near zero.

Reproduced on demandWhile writing this, a single `stream:true + tools` request crashed the server (supervisor: `restarts_total 0→2`, log line `09:13:40 metal_gpu_error`; the request returned a 0-byte response). Plain streaming without tools answered normally and counted +61 completion tokens in the same window. **Streaming + tools is the reliable crash trigger on this 4B-8bit ring.**

So “low token consumption” is really a _crash report_: tool-using turns kill the model before it can generate. The counters were honest; the model was not surviving.

## 3The rest of the metrics review

Full pass over every exporter, alert and store on the stack (live, after the 08:37 restart unless noted):

### Serving & proxy

| metric | value | reading |
| --- | --- | --- |
| requests (since restart) | 8 (5 streaming, 2 non-stream 4B; 1 non-stream 1.7B) | low traffic — this stack serves us, not a fleet |
| errors | 3× 5xx | the 503 degraded windows around crashes |
| TTFT mean | 24.7 s across 7 requests | skewed by the 27 s dying stream, not a latency signal |
| `mlx_tool_calls_total` | 0 | tool turns died before a call was recorded |
| hallucination risk mean | 0.017 | healthy |
| context utilization | 0.16% | context is not the pressure source |
| in-flight | 0 | no queue, no cap today |

### Hardware (rank0 / rank1, Mac mini)

| metric | rank0 | rank1 | reading |
| --- | --- | --- | --- |
| RAM used / total | 7.2 / 8.6 GB (84%) | 9.6 GB | tight — no headroom for a bigger model |
| disk used / total | 227 / 245 GB **(92.7%)** | 147 GB | **`MLXDiskNearlyFull` FIRING — needs a cleanup now** |
| GPU util | 21% @ 800 MHz | 3.8% | idle-ish; not a thermal story right now |

### Agents & stores

| component | state |
| --- | --- |
| All 6 scrape targets (`mlx-proxy/hw/kv/supervisor/logtailer` ×2 hw) | **UP** |
| `mlx_server_log_tailer` | errors 0; shipped 41 generation + 11 python/error + 2 gpu/error + 4 rank/warning; dropped 359 HTTP lines |
| vmalert | `MLXServerMetalFault` firing (today’s crash); `MLXDiskNearlyFull` firing; crash-loop rules (`>3/15m`, `>5/1h`) silent because crashes are spread out |
| `mlx_kv_cache_agent` (:9104) | **dead metric** — all cache gauges 0 despite “Prompt Cache: N sequences, M GB” lines in `server.log`; parser no longer matches the log format (`kv=0 B/tok`) |
| VictoriaMetrics totals | only the current proxy process (8 requests); every restart zeroes counters — **cumulative history survives only in Opik** |

### Crashes, last 24 h (from VictoriaMetrics + supervisor log)

| window | restarts | trigger |
| --- | --- | --- |
| 08-04 22:00 | 7 | profile v1 / v2 load tests (long streaming + 17k-token prompt) |
| 08-04 23:00 | 2 | post-benchmark settling |
| 08-05 01:00 | 3 | two-agent concurrent test + trailing |
| 08-05 08:00 | 2 | **idle** (08:02, 08:18) |
| 08-05 09:00 | 2 | 08:42 opencode tool turn; 09:13 our repro — both streaming + tools |

16 restarts in 24 h, every one caught and typed by the supervisor. The signature is stable: long prefills, concurrent agent loops, and now single _streaming + tool_ turns — plus two genuinely idle crashes that rule out load as the only cause.

## 4Tuning for edge scenarios: tools, streaming, concurrency, long context

Organized by the scenario that stresses the box. Each lever is listed with why it targets the failure we actually saw — not generic advice.

### 4.1 Tools / agentic traffic (the crash trigger)

-   **Route tool-call traffic away from the 4B.** The model ignored the planner directive entirely and dies on streaming+tools turns. Either reject/queue `tools` requests at the proxy for this model (one flag), or point opencode’s tool-enabled route at a model that obeys tool instructions.
-   **Gate and cap tools.** Limit the number of declared tools and schema size per request — smaller `tools` payloads mean shorter prefills and less GPU churn on every turn.
-   **Serialize agent turns.** Two concurrent agents crashed where sixteen plain requests survived. A proxy-side semaphore (cap in-flight at 4, the measured throughput peak) plus a queue turns the burst into a line.
-   **Keep transcripts from growing unbounded.** Every turn re-sends the whole transcript; with a small context budget this is pure pressure. A summarizer/trimmer at the client is the real fix for long agent sessions.

### 4.2 Streaming

-   **Complete the usage story.** mlx\_lm.server’s streaming response has no final `usage` object, so the proxy falls back to word counts (§2 of the log-streaming post). Wire `stream_options: {"include_usage": true}` handling end-to-end, or emit a usage chunk from the server, so completion tokens are measured, not estimated.
-   **Treat streaming+tools as the heaviest load shape.** It now has the same standing as the 17k-token prefill and two-agent runs — plan capacity around it.

### 4.3 Concurrency

-   **Cap in-flight work at the proxy.** The sweep peaks at concurrency 4 (~28 tok/s) then saturates; a semaphore + `503` with `Retry-After` beats letting a burst reach the GPU.
-   **Add client retry with backoff.** opencode currently shows the 503 degraded window as a hard failure; a retry on 5xx would have papered over the restart windows.

### 4.4 Long context / long prefill

-   **Cap the context window.** `ctx=40960` but we use <0.2% of it; dropping to e.g. 8k lowers KV memory and prefill cost per turn.
-   **Chunk or stream long prefills.** The 17k-token prompt correlated with a `GPU Timeout` crash; incremental prefills spread the load.
-   **Watch `mlx_context_utilization`.** It’s the canary for prefill pressure; alert before 80%.

### 4.5 Generation control

-   **Enforce `max_tokens` per route** so a runaway generation cannot pin the GPU for minutes (the 27 s dying stream was effectively this).
-   **Keep `temperature 0.0` for tool calls** (already the default) and add explicit stop sequences for the tool-call format.

### 4.6 Make tuning measurable

-   **Fix the KV-cache agent parser** — cache utilization is currently invisible, so none of the above can be validated against memory pressure.
-   **Stop losing history on restart.** Export a start-epoch gauge (or persist counters to VM as cumulative series) so cumulative token/request totals survive proxy restarts — today only Opik remembers.
-   **Lower the crash-loop alert threshold** (e.g. `>2 restarts/hour`) so tool-crash clusters page instead of hiding under `MLXServerMetalFault`.

## 5Handling `metal_gpu_error`

### What it is

A Metal command-buffer execution failure on Apple Silicon — seen as `kIOGPUCommandBufferCallbackErrorSubmissionsIgnored` and `...Timeout` — aborting `mlx_lm.server` mid-generation. The proxy keeps serving 503s in the window; the supervisor restarts with backoff; the alert fires. It is the single biggest reliability problem on this cluster.

### What we know

-   Environment: Qwen3.5-4B **8bit**, 2-node ring over the LAN, 8 GB Mac mini GPUs, ~84% RAM used.
-   16 restarts in 24 h; triggers observed: long single-stream prefills (17k), concurrent agent loops, single streaming+tools turns, and _twice while effectively idle_.
-   Plain concurrency does not trigger it (1→16 sweep, zero errors). It is not thermal (GPU 21%, no thermal alert). It is not context pressure (0.16%).
-   It is _not_ a hard fault every time — one crash is listed as “Ignored (for causing prior/excessive GPU errors)”, i.e. a cascade once the GPU driver decides to drop submissions.

### Containment today (already in place)

-   Supervisor with typed crash reason + backoff ladder 5→5→10→20→40 s; every crash auto-recovered.
-   `MLXServerMetalFault` alert; crash lines shipped by the log tailer to the collector JSONL; traces record the empty stream.

### Fix candidates to evaluate (this is the plan, not a claim)

| # | candidate | why | effort |
| --- | --- | --- | --- |
| 1 | **Correlate each crash with its in-flight request** — join proxy log, trace, GPU/RAM at crash time, and alert payload | today we type the crash but not the cause; this makes every experiment measurable | low |
| 2 | **Lower crash-loop threshold** to >2 restarts/h | page on clusters, not single faults | low |
| 3 | **Queue + in-flight cap (4) + Retry-After** at the proxy | remove the burst path that precedes crashes | low |
| 4 | **Gate tools** on the 4B route (reject or reroute) | removes the reproducible streaming+tools trigger | low |
| 5 | **Cap max_tokens and context window** at the server | bounds the longest generations and prefill size | low |
| 6 | **Test single-node (rank 0 only)**, ring disabled | isolates the 2-node network ring as the instability | medium |
| 7 | **Drop quantization to 4-bit / try 1.7B-4bit** for the agentic route | less GPU memory pressure on every token | medium |
| 8 | **Pin a single mlx/mlx-lm version** (fingerprint shows 0.31.3/0.32.0 mixed) | rules out a version-skew bug in the Metal path | low |
| 9 | **Reserve GPU memory headroom** (MLX memory limit) on the 8 GB GPU | avoids OOM-adjacent GPU states before submission | low |
| 10 | **Stream/chunk long prefills** and add a prefill watchdog | targets the GPU Timeout class | medium |

Measurement protocolBefore/after each candidate: **crash rate per hour** (VM), **completion>0 trace ratio** (Opik), **TTFT p50** and **error rate** (VM). A candidate is “winning” if it moves crash rate to ~0 for 24 h under the same agentic workload. Also free disk on rank0 (92.7%) regardless — that alert is independent of the GPU problem.

## 6The recommendation list

Everything from sections 4–5 in one table, prioritized. This is the artifact we will pick from next — nothing here is committed yet except the measurement of the problem.

| # | recommendation | priority | effort | status |
| --- | --- | --- | --- | --- |
| 1 | Free disk on rank0 (92.7% full, alert firing) | P0 | low | pending |
| 2 | Queue + cap in-flight (4) + Retry-After at the proxy | P0 | low | pending |
| 3 | Gate tools on the 4B route (reject/reroute streaming+tools) | P0 | low | pending |
| 4 | Correlate every crash with its in-flight request + GPU/RAM state | P0 | low | pending |
| 5 | Fix the KV-cache agent parser (dead metric) | P1 | low | pending |
| 6 | Persist cumulative counters across proxy restarts | P1 | low | pending |
| 7 | Cap max_tokens and context window at the server | P1 | low | pending |
| 8 | Lower crash-loop alert threshold to >2 restarts/h | P1 | low | pending |
| 9 | Emit/pass-through a real streaming usage object | P1 | medium | pending |
| 10 | Pin a single mlx/mlx-lm version | P1 | low | pending |
| 11 | Single-node test (ring disabled) | P2 | medium | rejected — ring retained (post 14) |
| 12 | Quantize 4B to 4-bit; try 1.7B for agentic route | P2 | medium | pending |
| 13 | Reserve GPU memory headroom | P2 | low | pending |
| 14 | Stream/chunk long prefills + prefill watchdog | P2 | medium | pending |
| 15 | Client retry-with-backoff on 5xx (opencode side) | P1 | low | pending |
| 16 | Summarizer/transcript trimmer for long agent sessions | P2 | high | pending |

## 7What we decide next

The open decisions, deliberately not resolved here:

1.  **Tool routing** — keep tools on the 4B with a gate, or move the agentic route to a model that obeys tool directives (1.7B is unlikely; a 7B/8B is too big for 8 GB)?
2.  **Containment first** — ship P0 items 1–4 (disk, queue, tool gate, crash correlation) before any root-cause experiment?
3.  **Root-cause order** — single-node ring test first (item 11) or quantization first (item 12)? The ring test is the cheapest discriminator.
4.  **Observability debt** — KV-agent parser and counter persistence (items 5–6) before or alongside the serving changes?
5.  **Acceptance** — agree on the 24 h crash-free window under the agentic workload as the definition of done.
