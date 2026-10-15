---
title: "14 — The Decision Ledger: Tuning, metal_gpu_error, and Every Recommendation in One Place"
date: 2026-08-08
description: "Post 13 gave us the root cause: a heterogeneous ring whose remote M4 faults and then poisons the GPU, with a readiness check that cannot see it. This post is everything the cluster has learned, consolidated into the three artifacts we now choose from — a tuning guide for edge scenarios, a handling"
tags: [mlx, observability]
draft: false
---

14 of 19 · the decision

Post 13 gave us the root cause: a heterogeneous ring whose remote M4 faults and then poisons the GPU, with a readiness check that cannot see it. This post is everything the cluster has learned, consolidated into the three artifacts we now choose from — a tuning guide for edge scenarios, a handling plan for `metal_gpu_error`, and the complete recommendation ledger. The first decision is recorded here: **the ring stays — no single-node serving** — so the plan leans on recovery hardening, containment and load-shaping instead.

## 1What we are deciding on

The story compressed to one paragraph. Two agentic requests and a trivial request all died to `metal_gpu_error`. Crash reports exist only on rank1 — an M4 16 GB paired with an M2 8 GB on an MLX ring — and the faulting thread is `mlx::core::metal::EventImpl::check_error()` on the GPU stream thread. The M4’s GPU faults under load (one genuine `GPU Timeout` among the crashes), then the device stays wedged, so the _next_ request crashes too until a restart lands on a healed device. The supervisor’s `/v1/models` readiness check cannot tell a wedged GPU from a healthy one. Full evidence in post 13.

The first decision is made: **the ring stays** — no single-node serving. That means the M4 will still fault from time to time, and the quality of our _recovery_ is what makes those faults survivable. Sections 2 and 3 are the tuning and the fault plan; section 4 is the ledger; section 5 is the decision.

## 2Tuning the model for edge scenarios

The scenarios that hurt: streaming, tool-calling turns, concurrent agent loops, long transcripts, and the cascade after a crash. Each knob below maps to one or more of them. Grouped by where the knob lives.

### Model & serving

| knob | what it does | edge scenario it targets | effort |
| --- | --- | --- | --- |
| **Single-node serving (ring disabled)** | serves the 4B-8bit from rank0 alone; removes the heterogeneous GPU pair, LAN collectives and the “rank1 dies first” cascade | all of them — the root cause | medium · **rejected 08-05** |
| **Cap `max_tokens`** | bounds the longest single generation and the command-buffer budget it consumes | streaming, long generations | low |
| **Cap context window** (below the model’s 32–40 k) | bounds prefill size and KV growth per request | long transcripts, concurrent agents | low |
| **Chunk long prefills** + prefill watchdog | splits huge prompts; alerts/kills on a prefill that runs too long | the `GPU Timeout` class, 17–24 k prefills | medium |
| **Quantize to 4-bit** or run 1.7B-4bit for the agentic route | less GPU memory per token; smaller command buffers | tools, concurrency | medium |
| **Reserve GPU headroom** (MLX memory limit) | stops the allocator from painting the device into a corner before submission | concurrency, cascade state | low |
| **Pin mlx/mlx-lm versions** | removes upgrade drift from the failure surface | all — already verified identical (0.32.0 / 0.31.3) | done |
| **Bounded prompt cache** | caps the in-RAM cached sequences (1.24 G seen) so reused prompts cannot pile up | long agent sessions | low |

### Proxy (routing & load shaping)

| knob | what it does | edge scenario it targets | effort |
| --- | --- | --- | --- |
| **Queue + in-flight cap (4) + Retry-After** | removes the burst path that precedes crashes instead of stacking requests | concurrent agents | low |
| **Gate tools on the 4B route** | reject or reroute `tools` requests to a model that obeys tool directives | tools, planner | low |
| **Request normalization** | strip `tools` / cap messages at the edge so the model only ever sees supported shapes | tools, long transcripts | low |
| **Real streaming usage object** | emit `usage` in stream chunks so the client can show live cost and detect dead streams | streaming | medium |
| **Stream keep-alives + timeouts** | detect the empty/truncated stream (the 28-completion-token symptom) instead of hanging | streaming, crash windows | low |
| **Degraded-window handling** | serve 503 with `Retry-After` + a health-flag the client understands, not empty 200s | crash/restart windows | low |

### Client / agent (opencode side)

| knob | what it does | edge scenario it targets | effort |
| --- | --- | --- | --- |
| **Retry-with-backoff on 5xx** | turns the supervisor’s auto-restart into a transparent blip instead of a dead turn | crash/restart windows | low |
| **Transcript trimmer / summarizer** | keeps agent transcripts from growing unbounded; every turn re-sends the whole history today | long agent sessions | high |
| **Stagger tool turns** | serialize or throttle simultaneous tool-calling turns | concurrent agents | low |
| **Streaming→non-streaming fallback** | fall back to plain completion when a stream dies, instead of dropping the answer | streaming | medium |

### Observability that tunes itself

| knob | what it does | edge scenario it targets | effort |
| --- | --- | --- | --- |
| **Crash↔request correlation** | join each crash to its in-flight request, GPU/RAM state and alert payload | every experiment’s measurement | low |
| **Start-epoch counters** | makes cumulative totals recomputable across restarts (the dual-series trap, post 12) | crash/restart windows | low |
| **Ingest rank1 crash reports** | alert on new `Python-*.ips` — found incidents the server log missed | crash forensics | medium |
| **Lower crash-loop threshold** | page on clusters (>2 restarts/h) rather than single faults | crash loops | low |

## 3Handling `metal_gpu_error`

The plan in three parts: prevent the fault, respond to it, and recover into a state the readiness check actually proves.

### Prevent

-   **Remove the ring** — serve the 4B-8bit from rank0 alone. This is the root-cause fix from post 13, not a mitigation.
-   **If the ring stays:** pair like GPUs (M2+M2 or M4+M4), cap `max_tokens` and context, reserve GPU headroom, keep versions pinned.
-   **Bound the load shapes that fault the M4**: chunk long prefills, gate concurrent agent loops, watch prefill duration.

### Respond (already in place)

-   Supervisor with typed crash reason and backoff ladder 5→10→20→40 s; every crash auto-recovered.
-   `MLXServerMetalFault` alert; per-reason counters on the fault-ledger dashboard (post 12); crash lines and traces shipped to Opik (post 10).

### Recover (the gap post 13 exposed)

The gapAfter a Metal fault the GPU device stays wedged, but the supervisor respawns in ~5 s and declares _ready_ on a `/v1/models` 200. The next real request is the first submission into the poisoned device — and it crashes again.

1.  **Post-Metal cooldown:** after a `metal_gpu_error`, wait longer than the ordinary backoff (e.g. ≥30 s) so the device actually clears before respawning.
2.  **First-generation probe:** before setting `ready=1`, run a real 1-token generation against the model. HTTP-up is not GPU-functional.
3.  **Grace window:** reject or queue requests for the first seconds after restart (the proxy already 503s during the load window — extend it through the probe).
4.  **Escalation:** if N consecutive restarts still fault, stop respawning, page, and surface the rank1 crash report path — the device needs human attention, not another 5 s loop.

## 4The recommendation ledger

Every open recommendation from posts 11–13 in one table. P0 blocks serving reliability · P1 should ship P2 can wait. decide means the status column is the open decision.

| # | recommendation | priority | effort | dependency | status |
| --- | --- | --- | --- | --- | --- |
| 1 | Free disk on rank0 (93.6% full, `MLXDiskNearlyFull` firing) | P0 | low | — | decide |
| 2 | Queue + in-flight cap (4) + Retry-After at the proxy | P0 | low | — | decide |
| 3 | Gate tools on the 4B route (reject/reroute streaming+tools) | P0 | low | — | decide |
| 4 | Correlate every crash with its in-flight request + GPU/RAM state | P0 | low | — | decide |
| 5 | Fix the KV-cache agent parser (dead metric) | P1 | low | — | decide |
| 6 | Persist cumulative counters across supervisor/proxy restarts | P1 | low | — | decide |
| 7 | Cap `max_tokens` and context window at the server | P1 | low | — | decide |
| 8 | Lower crash-loop alert threshold to >2 restarts/h | P1 | low | — | decide |
| 9 | Emit/pass-through a real streaming usage object | P1 | medium | — | decide |
| 10 | Pin a single mlx/mlx-lm version | P1 | low | — | **resolved** — both nodes 0.32.0 / 0.31.3 |
| 11 | Single-node test (ring disabled) | P2 | medium | — | **rejected** — ring retained (decision 08-05) |
| 12 | Quantize 4B to 4-bit; try 1.7B for the agentic route | P2 | medium | ring retained | decide |
| 13 | Reserve GPU memory headroom (MLX memory limit) | P2 | low | ring retained | decide |
| 14 | Stream/chunk long prefills + prefill watchdog | P2 | medium | ring retained | decide |
| 15 | Client retry-with-backoff on 5xx (opencode side) | P1 | low | — | decide |
| 16 | Summarizer/transcript trimmer for long agent sessions | P2 | high | — | decide |
| 17 | Supervisor post-Metal cooldown + first-generation readiness probe | P0 | low | — | decide |
| 18 | Grace window after restart (reject/queue until probe passes) | P0 | low | after #17 | decide |
| 19 | Homogeneous ring pairing (M2+M2 or M4+M4) — the structural option now that the ring stays | P1 | medium | ring retained | decide |
| 20 | Ingest/alert on rank1 `DiagnosticReports` (.ips) | P2 | medium | — | decide |
| 21 | Crash-loop escalation: stop respawning + page after N consecutive Metal faults | P1 | low | after #17 | decide |

## 5The decision

The first decision is recorded on 08-05: **no single-node serving — the ring stays.** With that fixed, the plan below is what the cluster work becomes. Nothing else here is decided yet; the rest of the ledger is still a menu.

| decision | verdict | why |
| --- | --- | --- |
| Single-node serving | **rejected** — ring stays | decision recorded 08-05; the heterogeneous M4/M2 pair remains the fault origin, so recovery and load-shaping carry the weight instead. |
| Supervisor recovery hardening (#17–18, #21) | **ship next** | now the load-bearing fix: post-Metal cooldown, a real first-generation probe, a grace window, and crash-loop escalation. Without these the post-crash request always eats the second crash. |
| Containment P0s (#1–4) | **ship in parallel** | disk, queue, tool gate and correlation are independent of the ring decision. |
| Load shaping to protect the M4 (#7, #14, #13, #12) | **follows hardening** | cap max_tokens/context, chunk long prefills + prefill watchdog, GPU headroom, quantization — the prevention half once recovery is solid. |
| Tool routing on the 4B | **gate now** | the 4B ignores planner directives anyway (post 11). |
| Definition of done | **crashes auto-recover with zero user-visible failure** | with the ring retained, crash-free is not a realistic bar; instead: every crash restarted and probed before ready, no empty responses, error rate ~0, crash↔request correlation visible per incident. |

Decision recordedRing retained on 08-05 — no single-node serving. The cluster work resumes with supervisor recovery hardening and the containment P0s as the first tickets; the remaining ledger rows stay open pending the next decision pass.
