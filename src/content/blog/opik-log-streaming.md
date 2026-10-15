---
title: "10 — The Other Half of the Story: Streaming Server Logs into Opik"
date: 2026-08-08
description: "Every request produces a trace — and a stack of raw lines in logs/server.log that used to be thrown away. This post is what we built to ship the server’s side of the story: tracing switched on, a filtered and flood-protected log tailer feeding the OTLP collector’s durable JSONL file, and the crash"
tags: [opik, observability]
draft: false
---

10 of 19 · streaming + correlation

Every request produces a trace — and a stack of raw lines in `logs/server.log` that used to be thrown away. This post is what we built to ship the server’s side of the story: tracing switched on, a filtered and flood-protected log tailer feeding the OTLP collector’s durable JSONL file, and the crash that used to be invisible now landing next to the traces that caused it.

## 1Where we started: Opik had nothing

The `mlx` project on our self-hosted Opik (`192.0.2.10:32173`) was empty — zero traces, zero logs. Three separate gaps caused that:

1.  **Tracing was wired but off.** The proxy has two Opik paths — the SDK (`--opik-endpoint`) and OTLP ingestion (`--opik-otlp-endpoint`) — but `start_server.sh` only passed them when the matching env vars were exported, and they weren’t. The running proxy had `--otlp-endpoint` (to our otel-collector) and nothing else, so every chat completion went untraced.
2.  **The logs pipeline ended at a dead end.** The proxy’s OTel setup built a `LoggerProvider` + `LoggingHandler` toward the local collector, whose `logs` pipeline terminated at a `debug` exporter — `podman logs` stdout. Not persisted, not Opik.
3.  **The server’s own log never left the machine.** `logs/server.log` was read by exactly two processes: the KV-cache agent (turns lines into Prometheus gauges) and the supervisor (sniffs the tail for a crash reason). The raw stream was consumed for metrics and discarded.

So Opik could show the proxy’s verdict on a request — TTFT, tokens, hallucination heuristics — but nothing about what the _server_ saw: the Metal fault, the rank that walked off, the generation lines. The crash from post 9 is the canonical example: the whole story lived in `server.log`, and none of it made it to the trace system.

The gapMetrics measure, traces explain the request, and logs contain the incident — but only if they end up next to each other. The third stream was being silently thrown away.

## 2Why server logs belong beside traces

Consider the debugging questions our trace pipeline could not answer:

-   _This trace is slow — did the KV cache miss?_ That answer is a line in `server.log`, not in any metric or span.
-   _This request errored — was it a Metal fault, a rank down, or a model-side crash?_ The proxy only knows it got a 503. The typed reason is a `[METAL]` / `[WARN] Node with rank…` line.
-   _What did the server actually generate vs. what the proxy reported?_ Generation lines carry the ground truth.

The honest caveat: raw server logs are **noisy**. In steady state our `server.log` is mostly HTTP access lines — one per request, plus the supervisor’s health probes every 15 s. Shipping every line into Opik would bury the signal in trivia and bloat the database. We therefore treated **filtering as the core feature**, not an afterthought (§4), and validated it under real load (§6).

## 3What we built: one pipeline, two paths

One OTLP pipeline, two feeds — but **not into the same sink**. Implementation confirmed what the docs hinted: Opik’s OTel ingestion is **trace-only** (`/api/v1/private/otel/v1/logs` → 404 while `/v1/traces` works; the `opik` SDK 2.2.13 has no log API). So the split is honest: **traces → Opik, logs → the otel-collector’s durable JSONL file**.

### Path A — request tracing, on by default

`start_server.sh` now defaults `OPIK_OTLP_ENDPOINT=http://192.0.2.10:32173/api/v1/private/otel`, so the proxy’s existing second span processor ships every chat completion to Opik stamped with OpenInference attributes. The current mlx project holds hundreds of traces.

**Decision:** use the OTLP path and keep the Opik SDK path _off_. Enabling both would create **two traces per request** (SDK + OTLP each log one). One pipeline is cheaper to reason about and shares its exporter stack with the log tailer. The SDK path stays documented as an optional fallback.

### Path B — a server-log tailer (new, running)

New `mlx_server_log_tailer.py`, same shape as the KV-cache agent:

-   Opens `logs/server.log`, **seeks to the current end** on start (no backfill flood), then follows at a 500 ms poll. Optional `--backfill N` seeds the last N lines once.
-   Classifies each line by regex into severity + category.
-   Emits an OTLP LogRecord per qualifying line to the collector (`:4318`): body = raw line; attributes for severity, category, source (`mlx_lm.server`), `service.name`, `mlx.node.name`.
-   Exports self-health on `:9106` (`mlx_log_tailer_up`, `lines_total{severity,category}`, `shipped_total`, `dropped_total`, `errors_total`) so a dead tailer is visible in VictoriaMetrics.

Implementation also surfaced a real bug: the supervisor was running `mlx_lm.server` with inherited stdout, so its output went into `supervisor.log` and `server.log` was never fed. The supervisor now redirects the server’s output into `server.log` — the file the KV agent, the tailer, and the crash-sniffer all read.

## 4The tailer in detail

| Signal in the line | Severity | Category | Shipped by default? |
| --- | --- | --- | --- |
| `[METAL]` / `Command buffer execution failed` / `kIOGPUCommandBuffer` | error | gpu | yes |
| `[WARN]` / `Node with rank` / `exited with code` | warning | rank | yes |
| `Traceback` / `ERROR` / `fatal` / `SIGABRT` | error | python | yes |
| Generation lines (`Prompt Cache`, `Prompt processing progress`, `tokens/s`, `ttft`, `kv cache`) | info | generation | yes |
| HTTP access lines (`"POST /v1/…`) | info | http | **no** (opt-in `--include-http`) |

Anything that matches none of the patterns falls to an `other` fallback (still shipped as info). The classifier runs top-to-bottom and first match wins, so a line carrying an error keyword is never miscast as an access log.

```bash
python3 cluster/mlx_server_log_tailer.py \
  --log-file cluster/logs/server.log \
  --otlp-endpoint http://192.0.2.64:4318 \
  --project mlx --listen 0.0.0.0:9106
```

Why filter-firstIn steady state the tailer reads a few thousand lines a day (health probes alone write ~5,700 HTTP lines) but **ships** only the classified signal — crash lines, rank warnings, generation lines. The dominant noise class is dropped by default.

## 5Keeping the flood out

-   **Filter first** — the default classifier drops the dominant noise class.
-   **Rate cap** — token bucket, default `--max-rate 50 lines/s`. A crash-spam loop or `--all` cannot outrun the budget.
-   **Backfill OFF by default** — `--backfill N` exists only for initial seeding, so a tailer restart never replays the whole file into the pipeline.
-   **Bounded queue** — the SDK’s `BatchLogRecordProcessor` caps the in-memory buffer (2048 records); if the collector is unreachable we drop-and-count (`dropped_total{reason="rate_limit"}`), never unbounded buffering.

All four were exercised under the post 9 load tests (§6): the tailer read over a thousand lines, shipped the signal, dropped the HTTP noise, and counted every drop.

Scope notePhase 1 ships **project-level** logs — every record lands in the collector’s JSONL file, correlated to Opik traces by time and service attributes. Precise trace-attachment (a log line pinned inside its own trace) needs a request-ID that flows proxy → upstream → `server.log` → `trace_id`; `mlx_lm.server` doesn’t emit one today. That’s phase 2, explicitly deferred — as is a true Opik Logs tab, which needs an Opik version with a logs feature.

## 6Verified, including under a real crash

1.  **One trace per request, no duplicates.** Three fresh requests → exactly three new traces in the `mlx` project (SDK path off), each an `mlx.chat.completions` LLM span with input/output/usage. TTFT p50 across the run ~0.4 s.
2.  **Crash lines reach the durable store.** The collector’s JSONL (`podman cp otel-collector:/var/log/otelcol/mlx-server-logs.jsonl`) contains the `[METAL] Command buffer execution failed` lines from the load-test crashes, classified `gpu/error`, and `mlx_log_tailer_errors_total` is **0**.
3.  **Filtering held under load.** During the post 9 benchmarks the tailer classified 1,000+ lines, dropped ~300 HTTP access lines (`dropped_total{reason="http_filter"}`), shipped the rest, and exported without an error.
4.  **Alerting stays honest.** The `mlx-logtailer` target is up and the new `MLXLogTailerDown` / `MLXLogTailerNotSending` rules stay silent — while `MLXServerMetalFault` fired on a genuine crash during verification.

A crash happened while writing thisDuring verification the server crashed twice more — this time with the cluster effectively _idle_, backoff escalating 20 s → 40 s. Each crash line made it into the JSONL within seconds, the supervisor restarted the box, and the `MLXServerMetalFault` alert fired. The failure post 9 was built to survive is exactly the incident this pipeline now captures end-to-end.

## 7What we deliberately didn’t build

-   **Trace-attached server logs** — needs request-ID plumbing through the proxy and into `server.log`. Documented, not built.
-   **Structured parsing** of KV-cache/generation lines into typed attributes — phase 1 keeps the body as free text.
-   **More alerting** beyond `MLXLogTailerDown` / `MLXLogTailerNotSending`.
-   **An SSH tail for rank1’s worker log** — the distributed run’s output (including “Node with rank 1 exited”) is mirrored into rank0’s `server.log`; verified true during implementation, so no separate tail was needed.

Full plan with rationale, noise budget and file list: [docs/opik-log-streaming.md](../docs/opik-log-streaming.md).
