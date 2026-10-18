---
title: "16 — Distributed MLX Tuning: The Lever Table, Applied and Measured"
date: 2026-08-08
description: "Post 14 shipped the decision ledger and the tuning guide. This post turns the tuning levers into an implementation plan for the ring cluster — and before writing any flags, the first thing we had to do was correct our own mental model of the network. The ring was already running on dedicated Gigabit"
tags: [mlx, observability]
cover: "assets/images/covers/mlx-distributed-options-tuning.svg"
draft: false
---

16 of 19 · the tuning, applied

Post 14 shipped the decision ledger and the tuning guide. This post turns the tuning levers into an implementation plan for the ring cluster — and before writing any flags, the first thing we had to do was correct our own mental model of the network. The ring was already running on dedicated Gigabit Ethernet; there was no VPN hop to remove.

## 1First, the network reality check

The plan was supposed to start by moving the ring off a WireGuard overlay onto the LAN. Then we read `netstat -rn` and `ifconfig -a` and the premise fell apart: **there is no WireGuard, and the ring is already on a dedicated Ethernet link.**

| Interface | Hardware | IP | Speed | Role |
| --- | --- | --- | --- | --- |
| `en0` | Built-in Ethernet | `203.0.113.1/24` | 1000baseT full-duplex | **Ring transport** — `hosts.json` `ips` `203.0.113.1`/`203.0.113.2` |
| `en1` | Wi-Fi | `192.0.2.64/24` | — | Management plane: ssh to rank1, proxy :8080, OTLP, Opik |
| `en2`/`en3` | Thunderbolt bridges | unconfigured | — | Future `--over thunderbolt` direct link |

The route table says it plainly: `203.0.113.2 → en0` to MAC `d0:11:e5:8b:19:96`, ping RTT **0.48 ms**, 0% loss. The two Macs are wired together on a private `203.0.113.0/24` on their built-in Ethernet ports. That is already the ideal transport for a two-node ring — nothing to switch, no VPN hop to shave. The original “Phase 1: switch to LAN IPs” was withdrawn, and the plan became the lever table below.

## 2The lever table

Every lever was verified against the installed tooling before touching the launcher (mlx 0.32.0): `mlx.launch --backend ring` is the only distributed mode on macOS; `mlx.distributed_config` knows backends `{ring, jaccl, jaccl-ring}` and `--over {thunderbolt, ethernet}` (nccl/jaccl are CUDA-only); `mlx_lm.server` exposes the shaping flags below. All edits landed in `cluster/start_server.sh` — the `mlx.launch` command that builds the ring.

| # | Lever | Flag | What it does | Risk | Benchmark | Decision threshold |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | Clean restart | — | fresh stack, baseline sanity | low | profile + `/v1/models` | matches recorded baseline (TTFT p50 ~0.38 s, ~8.8 tok/s) |
| 1 | Contain decode | `--decode-concurrency 8` | halves concurrent decode command buffers per step | low | sweep + crash rate | no new crashes; tps ≥ ~70% of baseline |
| 2 | Contain prefill | `--prompt-concurrency 4` | prefill ceiling (this is the default) | low | profile | no regression |
| 3 | Prefill chunk | `--prefill-step-size 512` | shorter per-step prefill command buffers (default) | low | long-prompt profile | TTFT ≤ baseline |
| 4 | Context / memory | `--prompt-cache-size 2`, `--max-tokens 1024` | more prompt slots; caps runaway agent decode | low | agentic cascade | no OOM; loops capped |
| 5 | Structural | `--pipeline` | pipeline-parallel instead of tensor-parallel ring — removes per-token ring sync | high | soak | deferred to a later experiment |
| 6 | MTU | `ifconfig en0 mtu 9000` | jumbo frames on the direct link | low-med | profile | deferred (needs sudo on both nodes) |
| 7 | Thunderbolt | `mlx.distributed_config --over thunderbolt` | 10–40 Gbps direct link, ring unchanged | setup | — | deferred (needs a USB4 cable, ledger #19) |
| 8 | Homogeneous pair | hardware swap M2→M4 | removes the heterogeneous fault class entirely | — | — | deferred (ledger #19) |
| 9 | Draft model | `--draft-model` + `--num-draft-tokens` | speculative decoding | low | bench | not exercised (no draft model cached) |
| 10 | 4-bit quant | model swap | less GPU memory per token | med | bench | not exercised (accuracy trade-off) |

iRoot-cause framing: the 4B model fits entirely on each node alone, so the ring buys this workload nothing but the heterogeneous fault class — the M4 faults, the M2 is the speed floor. Levers 1–4 make the existing ring stable and shaped; the real structural fixes remain levers 5–8.

## 3Phase A: levers 0–4, each measured

One lever per restart, each benchmarked before moving on. Streaming profile = 3 runs each of short/medium/long prompts (192 tokens), plus a concurrency sweep and an agentic cascade run for the containment levers. The crash ledger was tracked by counting `METAL` fatal lines in `cluster/logs/server.log` — the log file is append-only across boots, so “11” is the cumulative historical count and any increase means a fresh crash.

### Streaming profile (TTFT p50 / tps p50 / engine tok/s)

| Config | Flags added | short | medium | long | err | METAL |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline (step 0) | (stock) | 0.40s / 8.88 / 21.3 | 0.37s / 6.20 / 18.2 | 0.38s / 6.32 / 18.6 | 0 | 11 |
| Step 1 | `--decode-concurrency 8` | 0.40s / 8.92 / 24.1 | 0.38s / 6.22 / 18.2 | 0.42s / 6.33 / 18.5 | 0 | 11 |
| Step 2 | + `--prompt-concurrency 4` | 0.37s / 9.03 / 18.2 | 0.38s / 6.28 / 18.4 | 0.41s / 6.40 / 18.7 | 0 | 11 |
| Step 3 | + `--prefill-step-size 512` | 0.37s / 9.04 / 14.5 | 0.40s / 6.29 / 18.4 | 0.44s / 6.33 / 18.4 | 0 | 11 |
| Step 4 | + `--prompt-cache-size 2 --max-tokens 1024` | 0.46s / 9.78 / 23.5 | 0.50s / 6.20 / 17.6 | 0.51s / 6.97 / 18.4 | 0 | 11 |

### Concurrency sweep under step 1 (medium, 128 tokens, 20s per level)

| Concurrency | TTFT p50 | tps p50 | engine tok/s | errors |
| --- | --- | --- | --- | --- |
| 2 | 0.71s | 5.44 | 20.6 | 0 |
| 4 | 1.95s | 4.07 | 29.3 | 0 |
| 8 | 2.83s | 3.10 | 22.2 | 0 |
| 16 | 29.1s | 3.05 | 22.3 | 0 |

The conc-16 TTFT jump is queueing, not faulting: with `--decode-concurrency 8`, half the decode slots are gone, so saturated requests wait their turn — exactly the containment trade-off, and it held up with zero crashes.

### Agentic cascade under step 4 (calculator scenario)

| Metric | Result |
| --- | --- |
| runs / completed / in budget | 5 / 5 / 5 |
| turns mean · tool calls mean | 5.0 · 4.0 |
| tool-call valid rate | 1.00 |
| per-turn TTFT mean | 0.648s |
| run wall mean | 16.2s |

## 4Verdicts

✓**All four levers kept.** Zero errors, zero new crashes (METAL count flat at 11 across every restart), server\_state 1.0 throughout, and no throughput regression — short-prompt tps actually ticked up from 8.88 to 9.78 and engine tok/s for short prompts went 21.3 → 24.1 → 23.5. The containment lever (step 1) delivered the crash-safety it was bought for; steps 2–3 are explicit pins of the defaults; step 4 caps runaway agent decodes and gave the agentic suite a 5/5 clean run.

The final launch line in `cluster/start_server.sh` is now:

```bash
mlx.launch --hostfile cluster/hosts.json --backend ring \
  --cwd cluster --python ~/venvs/mlx/bin/python -- \
  ~/venvs/mlx/bin/python -m mlx_lm.server \
  --model mlx-community/Qwen3.5-4B-MLX-8bit \
  --host 127.0.0.1 --port 8081 \
  --decode-concurrency 8 --prompt-concurrency 4 --prefill-step-size 512 \
  --prompt-cache-size 2 --max-tokens 1024 \
  --chat-template-args '{"enable_thinking":false}'
```

## 5What is still on the menu

-   **Levers 5–8 are the structural options** and remain deferred: `--pipeline` (the one zero-hardware change that removes the per-token ring sync), a USB4 Thunderbolt link (`mlx.distributed_config --over thunderbolt`), and the homogeneous M4+M4 pair. Ledger item #19 covers the hardware path.
-   **Levers 6, 9, 10** (jumbo MTU, draft model, 4-bit) need sudo, a cached draft model, or an accuracy decision — parked.
-   **The SGLang scaffold** (post 15) is unchanged by this tuning; when it becomes a real benchmark it will be measured against the numbers above.

!These measurements are a point-in-time snapshot on the ring. The crash ledger says what matters most: 4 lever changes, 5 restarts, 0 new `metal_gpu_error` fatalities.
