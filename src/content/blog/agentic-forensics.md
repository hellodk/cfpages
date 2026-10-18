---
title: "13 — The Fault Is Remote: Why rank1 Dies First"
date: 2026-08-08
description: "Post 11 called metal_gpu_error a streaming+tools trigger and suspected version skew. Both were wrong. A fresh incident — two real agentic requests, then a trivial five-token request crashing the box — sent us to the machines themselves. The macOS crash reports live on only one of them, the backtrace"
tags: [agents, debugging]
cover: "assets/images/covers/agentic-forensics.svg"
draft: false
---

13 of 19 · agentic forensics & the remote fault

Post 11 called `metal_gpu_error` a streaming+tools trigger and suspected version skew. Both were wrong. A fresh incident — two real agentic requests, then a trivial five-token request crashing the box — sent us to the machines themselves. The macOS crash reports live on only one of them, the backtrace names the GPU stream thread, and the whole failure mode turns out to be a heterogeneous ring with a poisoned GPU.

## 1A trivial request just crashed the box

The cluster had been idle and healthy for twelve hours — `restarts_total=0`, all five crash-reason series at zero, the new fault-ledger dashboard quiet. Then two streaming requests from the agent arrived: **24,579 prompt tokens** across two tool-turn transcripts, and **28 completion tokens** total. The server died mid-generation at **22:06:49** with `metal_gpu_error`; the supervisor restarted it in five seconds.

Six minutes later, in a check that was supposed to confirm recovery, a _non-streaming_ request with `max_tokens=5` and a two-word prompt also returned an empty body and crashed the server again at **22:12:55**. A second near-identical request, after the next restart, answered “`ok`”.

Why this mattersPost 11 claimed streaming+tools was “the reliable crash trigger”. A five-token plain request crashing the box proves the trigger is not the request — it is the _state of the machine_ after a previous crash.

## 2The crash reports only live on rank1

macOS writes a `.ips` crash report (DiagnosticReports) for every process that aborts — but not for processes that are merely SIGTERM’d. So we asked both machines who actually crashed:

rank1

12 Python crash reports — every incident, plus 3 the server log never showed

rank0

0 crash reports — killed by the launcher, never faulted

Every report is `SIGABRT` / _Abort trap: 6_ — the exact `libc++abi: terminating due to uncaught exception` path from the server log — from a Homebrew Python 3.12.13 that loaded `libmlx.dylib` and the `AGXMetalG16G_B0` Metal driver. The times line up one-to-one with every `metal_gpu_error` in `server.log`, and three more (Aug 4 22:10, 22:41, 23:08) show the crash rate was worse than any log-based count ever admitted.

## 3The backtrace names the GPU stream thread

The faulting thread in the rank1 report is unambiguous — this is `mlx`’s own Metal event waiter throwing:

```bash
mlx::core::metal::EventImpl::check_error()          # <- throws
mlx::core::Event::wait(mlx::core::Stream)
mlx::core::scheduler::StreamThread::thread_fn()      # the GPU stream thread
  ├─ __cxa_throw → failed_throw → terminate → abort → SIGABRT
  └─ plus two mlx::core::distributed::ring::SocketThread::worker() threads in the process
```

The GPU command-buffer event reported a failure and mlx decided to throw instead of retry. So the crash is **not** on the serving host’s main thread and **not** an OOM — it is the remote M4’s GPU stream thread aborting the whole process while the ring’s socket threads sit beside it.

## 4The ring dies in a specific order

Post-11 the ordering looked muddy. Re-read with the crash reports in hand, the local launcher log tells a clean story:

```json
[ring] Receiving from socket 4 failed with errno 32      # ring link to rank1 breaks
[ring] Sending to socket 4 failed with errno 32
[ring] Too many send/recv errors. Aborting...
libc++abi: terminating ... [METAL] ... SubmissionsIgnored  # the abort, streamed back
[WARN] Node with rank 1 exited with code 255               # rank1 died first
[WARN] Node with rank 0 exited with code -15               # rank0 was SIGTERM’d
```

rank1’s process aborts on its GPU stream thread → the ring socket goes dead (errno 32/54) → rank0’s ring gives up and the launcher terminates it. The local `metal_gpu_error` on rank0 is a **cascade**. That is why every incident looks like a server crash from the local side while the evidence (crash reports) sits on the remote machine.

## 5What survived the blame

The full metric pass clears everything except the ring itself:

| hypothesis | verdict | evidence (25 h window, both ranks) |
| --- | --- | --- |
| Version skew across nodes | **ruled out** | mlx `0.32.0` / mlx-lm `0.31.3` identical on rank0 and rank1 |
| rank1 GPU exhausted | **ruled out** | GPU mem max 4.85 G of 16 G · util max 94% · thermal pressure 0 |
| rank1 RAM pressure | **ruled out** | mem max 11.5 G of 16 G · mem pressure fine · load1 max 4.4 |
| Context overflow | **ruled out** | context used max 7,149 of 32–40 k (17%) |
| KV-cache pressure | **ruled out** | kv cache max 1.8 G · 7 sequences · est max context 4.38 G |
| Request volume | **ruled out** | 5 requests in 25 h (4 streaming, 1 plain), one 5xx |
| rank0 was the fault origin | **ruled out** | zero crash reports on rank0 · exit code -15 (SIGTERM, killed) |

One genuinely different error appears in the ledger: at 00:38 the crash was `kIOGPUCommandBufferCallbackErrorTimeout`, not the `...SubmissionsIgnored` that dominates. A real GPU compute timeout on the remote M4 is the one signal that says “this Metal kernel ran too long” — the shape of a very long prefill.

## 6The full crash ledger

| time (IST) | trigger | error class | crash report on rank1? |
| --- | --- | --- | --- |
| 08-04 21:15 | POST | SubmissionsIgnored | — |
| 08-04 22:10 | POST | SubmissionsIgnored | yes (not in server.log) |
| 08-04 22:41 | POST | SubmissionsIgnored | yes (not in server.log) |
| 08-04 23:08 | POST | SubmissionsIgnored | yes (not in server.log) |
| 08-05 00:38 | POST | **GPU Timeout** | yes |
| 08-05 00:45 | POST | SubmissionsIgnored | yes |
| 08-05 00:55 | **idle — zero traffic** | SubmissionsIgnored | yes |
| 08-05 08:02 | agentic bench (tools) | SubmissionsIgnored | yes |
| 08-05 08:18 | agentic bench (tools) | SubmissionsIgnored | yes |
| 08-05 08:42 | agentic bench (tools) | SubmissionsIgnored | yes |
| 08-05 09:13 | streaming + tools repro | SubmissionsIgnored | yes |
| 08-05 22:06 | two agentic streaming requests | SubmissionsIgnored | yes |
| 08-05 22:12 | **trivial max_tokens=5 request** | SubmissionsIgnored | yes |

## 7The mechanism: a heterogeneous ring and a wedged GPU

Put the pieces together and the failure mode is consistent across all thirteen incidents:

-   The ring pairs an **M2 8 GB** (rank0) with an **M4 16 GB** (rank1). MLX distributed collectives assume homogeneous devices; a fast 16 GB M4 doing ring all-gathers with a slow 8 GB M2 over the LAN is exactly the shape that produces Metal command-buffer timeouts on the faster node. The one `GPU Timeout` crash is the fingerprint.
-   Once the M4’s GPU device has an error, it stays **wedged**: subsequent command buffers are _Ignored (for causing prior/excessive GPU errors)_. The process usually aborts immediately — but the abort can also surface later on an idle path, which is why there is an idle crash at 00:55 and why the `SubmissionsIgnored` class repeats.
-   The supervisor’s health check is `GET /v1/models` — HTTP-up, not GPU-functional. A respawn lands in the still-wedged device and reports _ready_. The first real generation (any request, even `max_tokens=5`) is then the first GPU submission into the poisoned device → instant “Ignored” → second crash. It recovers only when a restart cycle happens to land on a healed device — which is why the second trivial request answered “ok”.

The corrected storyNot streaming+tools. Not version skew. A heterogeneous 2-node ring whose faster GPU faults under load and then poisons the device so the _next_ request crashes too, with a readiness check that cannot tell a wedged GPU from a healthy one.

## 8What this changes

-   **Single-node was the structural fix, and it is rejected.** Qwen3.5-4B-8bit fits in rank0’s 8 GB alone (~4 GB weights, measured GPU footprint 4.8 G peak), and removing the ring removes the heterogeneous pair and the “rank1 dies first” cascade in one move — but the decision on 08-05 is to keep the ring. The consequence: the M4 will still fault occasionally, so recovery quality and load shaping are now the load-bearing fixes (decision ledger, post 14).
-   **Recovery must be hardened.** After a `metal_gpu_error` the supervisor needs a real cooldown and a first-generation probe before declaring ready — not just a `/v1/models` 200. Otherwise the post-crash request always eats the second crash.
-   **Crash reports are observability.** rank1’s `DiagnosticReports` found incidents the server log missed. Ingesting them (or at least alerting on new `Python-*.ips`) closes a blind spot that was hiding the true crash rate.
-   **Version pin is done.** Both nodes already run mlx 0.32.0 / mlx-lm 0.31.3. Blog-11 recommendation #8 is resolved as “verified — no action”.
