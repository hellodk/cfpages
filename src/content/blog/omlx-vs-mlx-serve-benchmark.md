---
title: "225 tok/s Prefill, 33 tok/s Decode: oMLX vs mlx-serve on One 8 GB M2"
date: 2026-10-17
description: "Same Qwen3.5-4B model, same 8 GB Mac mini, two MLX servers — oMLX and mlx-serve — benchmarked at 512/2K/8K tokens with unique prompts, GPU/NPU telemetry, and LLM traces wired end-to-end into Kubernetes."
tags: [mlx, llm, inference, prometheus]
draft: false
---

Inference Benchmark

Same `Qwen3.5-4B-MLX-4bit` model, same Mac mini, two MLX inference servers. Benchmarked at 512 / 2K / 8K tokens — and wired into a Kubernetes monitoring stack and an Opik trace store at the same time.

hellodk17 Oct 2026 MLXoMLXmlx-serveApple Siliconobservability

~33 tok/s

decode throughput, both servers, stable from 512 to 8K context

~225 tok/s

prefill throughput (8K prompt) — effectively identical, both are MLX

2.11 s

best TTFT at a 495-token prompt (mlx-serve); scales ~4.4 ms/token

68 traces

LLM spans landed in Opik (project `mlx`) from the same runs

## 01 · Two Servers, One 8 GB Box

One host, one model, two very different codebases that both speak the OpenAI HTTP API.

The machine is mm1, a Mac mini (`Mac14,3`) with an M2 — 8 CPU cores (4P+4E) and a 10-core GPU — and 8 GB of unified memory running macOS 26.6.2. The model is `Qwen3.5-4B-MLX-4bit` — a 4-bit affine Qwen3.5 that stacks 32 hybrid layers, interleaving linear-attention blocks with a full-attention block every fourth layer, shipping ~2.8 GB of weights. Both servers were asked to do the same job with their own efficiency features left on, because the question was "which is fastest as configured", not "which is fastest with the brakes applied".

| Server | Version | Efficiency feature | Port |
| --- | --- | --- | --- |
| oMLX Apache-2.0 | 0.7.1.dev2 (2369e68b) | Native Qwen3.5 Metal kernels built from source (`qwen35_prefill`), 5.5 GB memory-guard ceiling | :8000 |
| mlx-serve | 26.10.2 (MLX 0.32.3) | PLD speculative decoding ON (`draft_len=5, key_len=3`) | :11234 |

Only one fits. On 8 GB, oMLX and mlx-serve cannot be resident at once — macOS leaves barely 1.9 GB available with one of them loaded. The two were benchmarked sequentially, each as the sole resident model.

## 02 · Keeping It Fair

A throughput number is only useful if the harness can't be gamed — accidentally or otherwise.

-   Greedy. `temperature=0` on every request.
-   Thinking off. `chat_template_kwargs.enable_thinking=false`, so the reasoning model emits a deterministic answer instead of a variable-length chain-of-thought.
-   Unique prompt per request. Each request carries a fresh prefix marker so server-side prompt/hot caches miss — otherwise you measure cache lookups, not prefill.
-   Streamed, exactly 256 output tokens, with 2 warmups discarded and the median of 3 reported.
-   Client on the host, so no network variance in the numbers.

Why unique prompts matter. With a repeated prompt, mlx-serve's hot cache reused 7248 of 7279 prompt tokens and oMLX reported a cache-fed prefill of 24,000 tok/s. Real, but not what a cold request costs. A fresh prefix per request forces a genuine prefill on both stacks — and they land within 1% of each other.

## 03 · The Numbers

Direct to each server, nothing in between. This is the authoritative comparison.

| Server | Prompt tok | TTFT (s) | Prefill (tok/s) | Decode (tok/s) |
| --- | --- | --- | --- | --- |
| oMLX | 495 | 2.26 | 219.0 | 33.1 |
| mlx-serve | 495 | 2.11 | 234.7 | 33.7 |
| oMLX | 1860 | 7.76 | 239.7 | 32.1 |
| mlx-serve | 1860 | 7.76 | 239.8 | 35.0 |
| oMLX | 7310 | 32.51 | 224.9 | 30.4 |
| mlx-serve | 7310 | 32.48 | 225.1 | 32.3 |

<svg viewBox="0 0 820 320" role="img" aria-label="Grouped bar chart of decode throughput in tokens per second for oMLX and mlx-serve at 512, 2048 and 8192 token prompts">
          <rect x="0" y="0" width="820" height="320" fill="#FFFFFF"></rect>
          <text x="410" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Decode Throughput — Greedy, 256 Tokens Out (tok/s)</text>
          <line x1="80" y1="80" x2="760" y2="80" stroke="#E5E7EB"></line>
          <line x1="80" y1="117.5" x2="760" y2="117.5" stroke="#E5E7EB"></line>
          <line x1="80" y1="155" x2="760" y2="155" stroke="#E5E7EB"></line>
          <line x1="80" y1="192.5" x2="760" y2="192.5" stroke="#E5E7EB"></line>
          <line x1="80" y1="230" x2="760" y2="230" stroke="#9CA3AF"></line>
          <text x="70" y="84" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">40</text>
          <text x="70" y="121.5" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">30</text>
          <text x="70" y="159" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">20</text>
          <text x="70" y="196.5" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">10</text>
          <text x="70" y="234" text-anchor="end" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">0</text>
          <rect x="100" y="106" width="36" height="124" rx="3" fill="#D1D5DB" stroke="#4B5563" stroke-width="1"></rect>
          <text x="118" y="100" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">33.1</text>
          <rect x="144" y="104" width="36" height="126" rx="3" fill="#BFDBFE" stroke="#2563EB" stroke-width="1"></rect>
          <text x="162" y="98" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#2563EB">33.7</text>
          <text x="140" y="250" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#111827">512 ctx</text>
          <rect x="320" y="110" width="36" height="120" rx="3" fill="#D1D5DB" stroke="#4B5563" stroke-width="1"></rect>
          <text x="338" y="104" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">32.1</text>
          <rect x="364" y="99" width="36" height="131" rx="3" fill="#BFDBFE" stroke="#2563EB" stroke-width="1"></rect>
          <text x="382" y="93" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#2563EB">35.0</text>
          <text x="360" y="250" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#111827">2048 ctx</text>
          <rect x="540" y="116" width="36" height="114" rx="3" fill="#D1D5DB" stroke="#4B5563" stroke-width="1"></rect>
          <text x="558" y="110" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">30.4</text>
          <rect x="584" y="109" width="36" height="121" rx="3" fill="#BFDBFE" stroke="#2563EB" stroke-width="1"></rect>
          <text x="602" y="103" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#2563EB">32.3</text>
          <text x="580" y="250" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#111827">8192 ctx</text>
          <rect x="270" y="268" width="14" height="14" rx="3" fill="#D1D5DB" stroke="#4B5563" stroke-width="1"></rect>
          <text x="292" y="280" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">oMLX</text>
          <rect x="370" y="268" width="14" height="14" rx="3" fill="#BFDBFE" stroke="#2563EB" stroke-width="1"></rect>
          <text x="392" y="280" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">mlx-serve</text>
        </svg>

Decode: mlx-serve leads at every context length — the PLD speculative-decoding win, ~5% on average.

Prefill is a tie; decode is where they diverge. Both servers are MLX underneath, so prompt processing lands at ~225–240 tok/s for both. mlx-serve's PLD gives it a consistent decode edge — +1.8%, +9.0%, +6.3% across the three context lengths.

## 04 · Through the Proxy (the Monitored Path)

The inference metrics come from `mlx_metrics_proxy.py`, a ThreadingHTTPServer that relays the OpenAI API and exposes Prometheus counters. It sits in the request path for the monitored runs.

| Server | Prompt tok | TTFT (s) | Prefill (tok/s) | Decode (tok/s) |
| --- | --- | --- | --- | --- |
| oMLX | 495 | 5.95 | 83.2 | 33.1 |
| mlx-serve | 495 | 6.51 | 76.0 | 35.1 |
| oMLX | 1860 | 14.10 | 131.9 | 32.1 |
| mlx-serve | 1860 | 13.08 | 142.2 | 35.5 |
| oMLX | 7310 | 35.74 | 204.5 | 30.3 |
| mlx-serve | 7310 | 36.18 | 202.0 | 33.8 |

Read the two columns differently. Through the proxy, TTFT rises ~3–6 s (worst at the 2K prompt) — one extra Python hop plus, on an 8 GB box, real memory contention between the proxy and the server. Decode is essentially unchanged. So: direct for performance, proxy for capture.

## 05 · Wiring the Telemetry

Three independent data sources on the Mac mini feed a Kubernetes VictoriaMetrics stack — and the proxy also ships traces to Opik.

How the hardware telemetry actually works. The `mlx-hardware` job scrapes a single 600-line Python exporter on the Mac that reads GPU residency, CPU/ANE/package power, thermals and unified-memory pressure straight off Apple Silicon. The full mechanism — two sampling cadences, the `powermetrics`/IOKit sources, and why scrape-not-push keeps every series unique — is covered in [29 Gauges, Two Cadences: Reading GPU Power Off a Mac mini](../2026-10-18-mlx-hw-telemetry/2026-10-18-mlx-hw-telemetry.html).

<svg viewBox="0 0 820 320" role="img" aria-label="Data flow from the Mac mini exporters through vmagent to VictoriaMetrics, Grafana and vmui, with a separate OTLP span path from the proxy to Opik">
          <rect x="0" y="0" width="820" height="320" fill="#FFFFFF"></rect>
          <text x="410" y="38" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Metrics And Trace Planes: Mac Mini → Kubernetes</text>
          <defs>
            <marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="40" y="54" width="210" height="150" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
          <text x="145" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#111827">mm1 · Mac Mini M2</text>
          <text x="64" y="108" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">oMLX :8000</text>
          <text x="64" y="130" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">mlx-serve :11234</text>
          <text x="64" y="152" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">proxy :8080</text>
          <text x="64" y="174" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">hw telemetry :9102</text>
          <rect x="320" y="96" width="150" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="395" y="124" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#111827">vmagent</text>
          <text x="395" y="143" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">monitoring ns</text>
          <rect x="560" y="96" width="200" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="660" y="124" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#111827">vmsingle :8429</text>
          <text x="660" y="143" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">VictoriaMetrics</text>
          <rect x="560" y="212" width="200" height="52" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="660" y="236" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#111827">Grafana :31300</text>
          <text x="660" y="254" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">vmui :31429</text>
          <rect x="320" y="212" width="150" height="52" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="395" y="236" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="#111827">Opik</text>
          <text x="395" y="254" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">project: mlx</text>
          <line x1="250" y1="128" x2="320" y2="128" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arw)"></line>
          <text x="285" y="118" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">scrape</text>
          <line x1="470" y1="128" x2="560" y2="128" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arw)"></line>
          <text x="515" y="118" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">remote-write</text>
          <line x1="660" y1="160" x2="660" y2="212" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arw)"></line>
          <path d="M145 204 V 238 H 320" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arw)"></path>
          <text x="232" y="230" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">OTLP spans</text>
          <circle cx="395" cy="128" r="5" fill="#2563EB"></circle>
          <circle cx="395" cy="128" r="8" fill="none" stroke="#2563EB" stroke-width="1.5">
            <animate attributeName="r" values="8;34" dur="2.6s" repeatCount="indefinite"></animate>
            <animate attributeName="stroke-opacity" values="0.8;0" dur="2.6s" repeatCount="indefinite"></animate>
          </circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M250,128 L320,128"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" begin="0.5s" repeatCount="indefinite" path="M470,128 L560,128"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" begin="1s" repeatCount="indefinite" path="M660,160 L660,212"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.6s" begin="0.7s" repeatCount="indefinite" path="M145,204 L145,238 L320,238"></animateMotion></circle>
        </svg>

All four mm1 endpoints are scraped LAN-direct (never over Tailscale). The proxy additionally exports OpenTelemetry spans to Opik.

## What each job reports

| Job | Endpoint | State | Sample metrics |
| --- | --- | --- | --- |
| mlx-hardware | 192.0.2.64:9102 | up | GPU util 32%, GPU power 67 mW, package 134 mW, CPU 64 mW, ANE 0, GPU mem, load, thermal |
| mlx-proxy | 192.0.2.64:8080 | up | `mlx_requests_total`, `mlx_tokens_*`, `mlx_ttft_seconds_*`, `mlx_hallucination_*`, `mlx_heuristic_*` |
| mlx-serve | 192.0.2.64:11234 | up | native `mlx_serve:*` — `decode_serial_total`, `prefill_tokens_total`, `prefix_cache_tokens_total`, `gpu_utilization_pct`, `memory_mb`, and the NPU counters `ane_layers` / `ane_int8_bytes` |

ArgoCD reverts kubectl. The `monitoring` namespace is GitOps-managed with self-heal; an inline `inlineScrapeConfig` edit to the VMAgent CR was reverted within minutes. The durable fix was a pair of `VMScrapeConfig` custom resources (which the operator selects via `selectAllByDefault` and ArgoCD does not track) — `mlx-proxy` and `mlx-serve`.

## 06 · Traces Into Opik

Every monitored request becomes a trace: input messages, output, model, streaming flag, temperature, and a span count.

The proxy creates an Opik SDK trace per chat completion and stamps OpenInference OTLP spans to Opik's OTLP ingestion endpoint — reached over the LAN at the Opik NodePort `:32173`, so the Mac needs no port-forward into the cluster. Querying the Opik API after the benchmark runs:

```bash
GET /api/v1/private/traces?project_name=mlx
// → total: 68   spans: 67   project: mlx
// each trace: name=mlx.chat.completions, input.messages, llm_span_count=1
```

Opik was returning HTTP 500 on every trace. The root cause was underneath Opik, in ClickHouse: every `opik.*` ReplicatedMergeTree table was in read-only mode — `TABLE_IS_READ_ONLY: table metadata was not found in zookeeper`. The replica's metadata had vanished from Keeper. Fix: `SYSTEM RESTORE REPLICA` on every affected table, which rebuilds the replica path from local metadata. Ingestion resumed immediately.

## 07 · What Broke (and the Fixes)

Ground truth from the transcript — five things that cost time and how each was resolved.

1

Opik: read-only ClickHouse tables

Trace creation returned 500; backend logs showed `TABLE_IS_READ_ONLY` for the `opik` database.

FIX — `SYSTEM RESTORE REPLICA` for each affected table; trace ingestion resumed within minutes.

2

Scrape config reverted by GitOps

A kubectl patch to the VMAgent CR added the proxy/serve jobs — then ArgoCD self-heal removed them.

FIX — create `VMScrapeConfig` CRs instead; the operator folds them into the agent config and ArgoCD leaves them alone.

3

The process name was not what it looked like

`pkill -f "omlx serve"` matched nothing — the real process is `omlx-server`. A "stopped" server kept holding memory.

FIX — kill by the actual argv (`omlx-server`) and verify the port is free.

4

Telemetry died with the server

The hardware agent's argv contains `--worker-match omlx-server`, so a `pgrep -f omlx-server` cleanup killed the telemetry along with the server.

FIX — restart the agent and stop matching on that string when cleaning up.

5

mlx-serve memory preflight refuses on 8 GB

Its preflight wanted ~4.2 GB free; the box had ~1.9 GB. The 2.8 GB model loads fine under oMLX.

FIX — `--skip-mem-preflight --ctx-size 8192 --os-reserve-gib 1`.

## 08 · Takeaways

| Decode is the differentiator | Same MLX model, same silicon → prefill is a tie (~225 tok/s). mlx-serve's PLD speculative decoding buys a steady ~5% decode edge (33.7 / 35.0 / 32.3 vs 33.1 / 32.1 / 30.4 tok/s). |
| --- | --- |
| Measure cold, not cached | Unique prompts per request turned a fantasy 24,000 tok/s prefill into an honest ~225. Cache metrics are real — but they are a different measurement. |
| 8 GB is the real ceiling | One 4B model fits; two servers do not. TTFT is prefill-bound at ~4.4 ms/token, so context length, not decode, dominates latency. |
| Instrument, or guess forever | GPU/NPU/power and inference counters all reach vmsingle; every request lands in Opik. The pipeline is the reason the numbers above are trustworthy. |

Read the decode gap fairly. It is not "PLD beats MTP." For `Qwen3.5-4B-MLX-4bit`, oMLX's speculative decoding was inert — the checkpoint ships no `mtp.*` weights, and oMLX has no model-agnostic fallback, so it decoded one token at a time. mlx-serve's Prompt-Lookup Decoding is model-agnostic and on by default, so it speculated while oMLX did not. The ~5% is an asymmetry of what each engine could engage on this model, not a verdict on the techniques.  

Two caveats worth keeping next to the numbers: mlx-serve ran with its SSD cache tier off (RAM-only, no `--prefix-cache-disk`), while oMLX's SSD tier was on; and oMLX's spec-decode machinery was present but gated off by the missing weights. Both are spelled out in the [speculative-decoding deep-dive](../2026-10-18-omlx-speculative-decoding/2026-10-18-omlx-speculative-decoding.html) and the [tiered-SSD-cache deep-dive](../2026-10-18-omlx-tiered-ssd-cache/2026-10-18-omlx-tiered-ssd-cache.html).

All figures observed 2026-10-17 on mm1 (Apple M2, 8 GB). Direct numbers are the benchmark; proxy numbers are the monitored path. Cache-fed and proxy-inflated values are called out where they appear.
