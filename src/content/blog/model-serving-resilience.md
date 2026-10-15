---
title: "9 — The Night the GPU Crashed: Serving Health, Supervision & Load Testing"
date: 2026-08-08
description: "A Metal command-buffer fault silently killed mlx_lm.server while the proxy kept answering 503s. The alert fired — but it was generic, nothing restarted the server, and no metric could say \"the model is actually loaded and serving right now.\" This post fixes all three: a supervising watchdog,"
tags: [llm, mlx, observability]
draft: false
---

9 of 19 · resilience + load

A Metal command-buffer fault silently killed `mlx_lm.server` while the proxy kept answering 503s. The alert fired — but it was generic, nothing restarted the server, and no metric could say "the model is actually loaded and serving right now." This post fixes all three: a supervising watchdog, serving-status metrics, an alert dashboard, and load tests that finally stress the cluster the way an agent would — and the first run _reproduced the crash_, then survived it.

## 1What actually happened

At 21:15 the distributed `mlx_lm.server` died. The proxy on `:8080` kept running and kept returning `503 mlx upstream unavailable`. The last lines of `logs/server.log` told the whole story in one line:

```bash
libc++abi: terminating due to uncaught exception of type std::runtime_error:
[METAL] Command buffer execution failed: Ignored (for causing prior/excessive GPU errors)
[WARN] Node with rank 1 exited with code 255
[WARN] Node with rank 0 exited with code -15
```

Three things were true at once, and they were the problem:

1.  **The alert did fire** — `MLXUpstreamDown` (`mlx_up == 0`) went critical. But it only said "upstream unreachable." It could not say _why_, or whether this was a process crash versus a slow network versus a hung queue.
2.  **Nothing restarted anything.** The stack was launched by a fire-and-forget `nohup ... &` script. No watchdog, no launchd, no retry. The cluster sat down until someone noticed.
3.  **The observability stack could not answer "is the model loaded and serving right now?"** We had per-request TTFT, KV-cache usage, GPU residency — but no metric for process liveness, model-loaded state, uptime, or restart count.

Also hiding in the logs: the hardware-telemetry agents on _both_ nodes had never started at all — the start script passed `--otlp-endpoint` to a script that doesn't accept that flag. So `MLXHardwareExporterDown` was firing on two nodes simultaneously. That is the same class of bug: the launcher never checked that what it "started" was actually up.

The lessonA serving stack is only as observable as its _lowest_ layer. Request metrics tell you the proxy is alive. You need a process-level, health-level and model-level view, plus something that restarts the thing when it dies — and a way to know it did.

## 2Design: three layers of truth

The redesign splits "is the cluster OK?" into three layers, each scraped independently so they can disagree with each other in useful ways:

### Layer 1 — Process (new: `mlx_server_supervisor.py` :9105)

A watchdog that owns the `mlx.launch` child. It spawns the server, waits on it, and on exit records **exit code**, sniffs the server-log tail for a crash **reason** (metal / oom / python / exit), and restarts with exponential backoff `5s → 60s`. It exports:

| Metric | Meaning |
| --- | --- |
| `mlx_server_up` | 1 if the mlx_lm.server *process* is alive |
| `mlx_server_ready` | 1 if `/v1/models` returns HTTP 200 |
| `mlx_model_loaded{model}` | 1 once the health probe actually saw the model |
| `mlx_server_restarts_total` | restarts performed (crash-loop detection input) |
| `mlx_server_uptime_seconds` | current process uptime |
| `mlx_server_last_exit_code` | exit code of the last crash |
| `mlx_server_last_crash_reason{reason}` | 1 on the reason that killed it |
| `mlx_server_health_checks_total{result}` | ok/fail outcomes for the S/N probe |

The process/ready/model split is deliberate: a server can be _up but not ready_ (loading weights, compiling Metal shaders) or _ready but the model vanished_ — only `mlx_model_loaded` distinguishes those.

### Layer 2 — Control plane (new: `start_server.sh` rewrite)

The launcher now has `start | stop | restart | status | logs`, timestamped logging into `cluster/logs/`, preflight checks (venvs, passwordless SSH to node B, ports free), a **readiness wait** that blocks until `/v1/models` answers before returning success, and pidfiles per component. It fails loudly with a non-zero exit instead of printing `nohup ... &` and crossing its fingers. The stale `--otlp-endpoint` flag that killed the hw agents is gone.

```bash
./start_server.sh start     # preflight -> launch 4 components -> wait ready -> status table
./start_server.sh status    # per-component: RUNNING/STOPPED + /metrics HTTP code + last crash
./start_server.sh logs      # tail of every log, one section each
./start_server.sh restart
```

### Layer 3 — Process supervision at boot (plist, kept local)

A `com.hydra.mlx-server.plist` LaunchDaemon is written under `cluster/` (git-ignored, intentionally **not pushed** yet). It runs the supervisor with `KeepAlive: true` and `ThrottleInterval: 30`, so launchd restarts the supervisor if _it_ dies while the supervisor handles the app-level crash/backoff — two layers of restart for two failure modes. The plist is the "turn the whole cluster into a boot service" artifact, staged for later.

## 3Alerting that says what broke

Five new rules in the `mlx-serving` group turn the crash from a mystery into a typed event:

| Rule | Expression (essence) | Severity |
| --- | --- | --- |
| `MLXServerDown` | `mlx_server_up == 0` for 1m | critical |
| `MLXModelNotLoaded` | ready == 1 and model_loaded == 0 for 2m | warning |
| `MLXServerCrashLoop` | `increase(restarts[15m]) > 3` | critical |
| `MLXServerRepeatedCrashes` | `increase(restarts[1h]) > 5` | critical |
| `MLXServerMetalFault` | `last_crash_reason{reason="metal_gpu_error"} == 1` | critical |

The Metal fault alert is the one that matters most: it names the failure mode, points at `mlx_hw_gpu_mem_*`, and suggests the knobs (`--gpu-memory-utilization`, `--max-num-seqs`). A restart is no longer silent — the restart counter and reason are time-series, so a crash-loop lands in the dashboard as a sawtooth with a red "metal" tag, not a single ambiguous page.

## 4An alert dashboard that cuts the noise

New dashboard **MLX Alerts & Serving Health** (`uid: mlx-alerts`) has three rows:

-   **Alert state** — active firing count, firing-by-severity bar gauge, and an alert _event rate_ panel (`rate(ALERTS[5m])`) so you see re-arm storms, not just a single series.
-   **Serving status** — process/ready/model stat with UP/DOWN mapping, serving-status history, restart rate, and uptime.
-   **Signal-to-noise** — last crash reason, health-probe ok-vs-fail ratio, and a **flapping-alerts table** (`increase(ALERTS[15m])`) ranking the alerts that fire and resolve repeatedly. Flapping alerts are the noise; this panel names them so they can be silenced or threshold-tuned.
-   **Log streaming health** — added with the log tailer (post 10): tailer UP/DOWN stat, shipped-lines rate, shipped-vs-dropped by severity/reason, and export errors.

It rides on the existing `ALERTS` series that vmalert remote-writes into VictoriaMetrics — no new exporter needed for the alert half, only the supervisor for the serving half.

## 5Load testing: plain, then agentic

Two new tools under `tools/`. Both drive real traffic through the proxy (so every request lands in Opik automatically via the existing tracer, and in VictoriaMetrics), and both emit JSON reports into `tools/bench-reports/` (git-ignored).

### `bench_load.py` — traffic & capacity

-   `--sweep`: ramp concurrency 1 → 2 → 4 → 8 → 16, each for `--duration`, with a settle pause so KV-cache/GPU state rebalances between levels.
-   `--sustain N`: soak at fixed concurrency, while **snapshotting the cluster's own metrics** every few seconds — proxy up, GPU memory, KV-cache utilization, supervisor state — so a throughput number is always correlated with memory pressure.
-   Reports TTFT p50/p95/p99, tokens/sec, throughput, error rate per level.

```bash
python3 tools/bench_load.py --sweep --duration 30 --label "qwen3.5-4b-8bit sweep"
python3 tools/bench_load.py --sustain 8 --duration 120 --label "soak-8w-2m"
```

### `bench_agentic.py` — how an agent actually loads the box

Single prompts understate pressure: an agent re-sends the _whole transcript_ every turn, fires bursts of tool calls, and thrashes the KV cache. `bench_agentic.py` runs multi-turn tool-calling loops against a stub tool registry (calculator / weather / time) with three scenarios: a single-tool arithmetic chain, a three-tool "gather information then consolidate" task, and a multi-step planner. Per run it records turns, per-turn TTFT, tool-call count and JSON-validity rate, whether it finished in budget, and wall time; `--agents N` runs loops concurrently for realistic agentic load.

```bash
python3 tools/bench_agentic.py --scenario tri_tool --runs 10
python3 tools/bench_agentic.py --scenario planner --agents 3 --runs 10
```

Tooling recommendation**Opik** (already self-hosted + wired into the proxy) for per-trace, per-turn, per-tool-call inspection of agent runs and quality feedback — free, self-hosted, OpenInference-native. **Our harness + VictoriaMetrics** for repeatable load/SLO numbers. If you want a third-party load generator instead, `ghz`/`k6`/`locust` are drop-in replacements for the traffic side (they just hit the OpenAI endpoint), and LangSmith/Helicone are hosted Opik-alikes — but they send your data out of the building, which this stack was built to avoid.

### Measured: first run — Qwen3.5-4B-8bit on the 2-node ring

Ran both harnesses against the live cluster. The headline isn’t a throughput number — it’s that **the load test reproduced the very crash class post 9 exists for**: seven `metal_gpu_error` crashes since the supervisor was introduced, every one caught, typed and auto-restarted. Three came during the benchmarks — long streaming generations (the load test’s 17k-token prompt) and a two-agent run — two more came with the cluster effectively _idle_, and **two more today from single streaming + tools turns** (the opencode route; reproduced on demand in post 11). The honest read: the 4B-8bit ring on this hardware is not stable, load or no load, and the backoff ladder (5 s → 5 s → 10 s → 20 s → 40 s) is what keeps a crash from becoming an outage. Plain concurrency was not the trigger — a 1→16-worker sweep ran to completion with zero errors.

### Capacity sweep (`bench_load.py --sweep`, medium prompt, 20s/level)

| concurrency | TTFT p50 | tok/s per request | aggregate tok/s | errors |
| --- | --- | --- | --- | --- |
| 1 | 1.03 s | 5.5 | 10.2 | 0 |
| 2 | 1.63 s | 5.4 | 18.9 | 0 |
| 4 | 2.18 s | 4.0 | **28.2** | 0 |
| 8 | 3.00 s | 3.1 | 21.8 | 0 |
| 16 | 5.21 s | 1.7 | 21.8 | 0 |

Peak aggregate throughput lands at **concurrency 4 (~28 tok/s)** and then saturates around ~22 tok/s; TTFT degrades linearly with concurrency. Single-stream profile: TTFT p50 0.44–1.60 s (short/medium/long), 5–8.7 tok/s per request.

### Agentic (`bench_agentic.py`, 3 runs per scenario)

-   **calculator**: 5 turns, 4 tool calls, **100% valid**, per-turn TTFT mean 0.74 s, ~17 s per run.
-   **tri\_tool**: 2 turns, 3 tool calls, **100% valid**, TTFT mean 3.4 s (max 5.3 s), ~17 s per run.
-   **planner**: **0 tool calls** — the 4B model answered in one turn and ignored the tool instruction. A quality finding: the multi-step planner scenario needs a model that actually obeys tool directives (or a stronger prompt).
-   **2 concurrent agents (calculator)**: crashed the server with `metal_gpu_error` — where 16 concurrent plain requests had just survived. Recovery took ~40 s (backoff 10s + weight reload) and the cluster was serving again without intervention.

⚠**Recommendations from the first run.** (1) Treat concurrent agent loops as the heaviest load shape — two simultaneous agents crashed the box where sixteen plain requests did not; the growing transcript + tool-call bursts are a different GPU-pressure profile. (2) The longest generations correlated with a `GPU Timeout` crash — keep multi-thousand-token prefills off the 4B-8bit ring until the instability is understood. (3) Non-streaming requests returned 503 while the box was degrading _before_ a crash — worth watching as a warning signal, but we haven’t proven it predicts every restart. (4) The supervisor closed the post-6 gap for real: seven crashes, seven recoveries, no manual step — and the log tailer shipped every crash line to the collector’s JSONL (post 10). Post 11 digs into the newest finding: **a single streaming + tools turn is now a reproducible crash trigger**, and traces show those turns end with zero completion tokens.

## 6Post-incident checklist

1.  `./start_server.sh start` — preflight, launch, wait-ready, status table (this is the whole recovery, now).
2.  Watch `curl -s 127.0.0.1:9105/metrics | grep mlx_server` for up=1, ready=1, model\_loaded=1.
3.  Open **MLX Alerts & Serving Health**; the Metal-fault reason should show "none" and restarts should be flat.
4.  Run `bench_load.py --sweep` + `bench_agentic.py` to re-establish capacity after the model change.
5.  When ready for boot supervision: install the staged `com.hydra.mlx-server.plist` (deliberately not committed).

## 7What this changes

-   A crash is now **typed** (metal / oom / python) and **counted**, and the cluster **recovers itself** with backoff — proven under load, when seven Metal crashes were caught and restarted with no manual step.
-   "Is the model serving?" is now a first-class question with its own metrics and dashboard, not a guess from a 503 body.
-   The start script proves what it started; the preflight catches the class of bug that silently downed both hw agents.
-   Load testing covers both shapes of traffic — steady concurrent requests and context-growing agent loops — with results correlated to the cluster's own memory/KV/GPU state.
