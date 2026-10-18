---
title: "39 Metrics From One Hop: Inside the :8080 Proxy That Measures Every LLM Request"
date: 2026-10-18
description: "A single Python ThreadingHTTPServer sits in front of the inference server, forwards every OpenAI request, and turns each one into TTFT, token rate, tool calls, hallucination risk and token confidence — 39 Prometheus series, no OTLP metric push."
tags: [mlx, observability, prometheus, llm]
draft: false
---

Observability Deep Dive

Every request to the inference server passes through a single Python `ThreadingHTTPServer` that forwards the call, then reconstructs what happened: time to first token, tokens per second, how many tools the model tried to call, a hallucination-risk score, and a per-token confidence derived from the sampler's own logprobs. One process, 39 Prometheus series, and no OTLP metric push.

2026-10-18 MLX · Prometheus · OpenAI API ThreadingHTTPServer logprobs Opik

39

distinct `mlx_*` counters, gauges and histograms exported at `/metrics`

1

Python hop in front of the server — the proxy is the client's whole API surface

6

things recorded per request: TTFT, token rate, temperature, tool calls, risk, confidence

0

metrics pushed via OTLP — the scrape is the single source of truth

## 01 · The Front Door

The server can generate tokens. It cannot tell you how long the first one took, whether the answer looks made up, or how sure the sampler was. The proxy exists to answer those without touching the inference code.

On an Apple-Silicon MLX stack the inference server — whether that is `mlx_lm.server` or, as in the benchmark, a compiled `mlx-serve` binary — speaks the OpenAI chat-completions API and little else. It streams tokens and returns. It does not time the first token, it does not count tool calls, and it has no notion of "how confident was the model when it emitted that identifier."

So a small reverse proxy sits in front of it as the client's entire front door. Clients (an agent CLI, a test harness, a Python SDK) point at `:8080`. The proxy forwards each request to the real server on a private port, watches the response go by, and records a row of metrics before relaying the bytes back unchanged.

<svg viewBox="0 0 820 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A client sends a request to the proxy on port 8080, which forwards to the inference server on a private port and records metrics, then relays the response back">
          <defs>
            <marker id="arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="0" y="0" width="820" height="300" fill="#FFFFFF"></rect>
          <text x="410" y="40" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#111827">One Hop, Two Ports</text>
          <rect x="30" y="120" width="150" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="105" y="146" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Client</text>
          <text x="105" y="166" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">agent · harness · SDK</text>
          <rect x="280" y="86" width="230" height="132" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
          <circle cx="395" cy="106" r="4" fill="#2563EB"></circle>
          <circle cx="395" cy="106" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
            <animate attributeName="r" values="4;11" dur="1.8s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"></animate>
          </circle>
          <text x="395" y="136" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Metrics proxy</text>
          <text x="395" y="158" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">:8080</text>
          <text x="395" y="180" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">time · count · score</text>
          <text x="395" y="198" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">forward + relay</text>
          <rect x="620" y="70" width="170" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="705" y="96" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Inference server</text>
          <text x="705" y="116" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">mlx-serve :11234</text>
          <rect x="620" y="188" width="170" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="705" y="214" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">/metrics</text>
          <text x="705" y="234" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">39 mlx_* series</text>
          <path d="M180,152 H276" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M510,130 H565 V102 H616" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M616,118 H565 V150 H510" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M395,218 V220 H616" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <text x="228" y="144" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">POST /v1/chat/completions</text>
          <text x="700" y="60" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">forward</text>
          <text x="560" y="200" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">relay + record</text>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M180,152 H276"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" begin="0.6s" repeatCount="indefinite" path="M510,130 H565 V102 H616"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M616,118 H565 V150 H510"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.0s" begin="1.8s" repeatCount="indefinite" path="M395,218 V220 H616"></animateMotion></circle>
        </svg>

The client only ever talks to `:8080`. The proxy forwards to the real server on a private port, watches the reply stream past to record metrics, then relays the bytes back verbatim.

Why put it in front rather than inside. The inference server is a fast-moving target — in the benchmark it was a compiled binary with no source to patch. A proxy needs nothing from it beyond an OpenAI-compatible HTTP interface, so the same `mlx_metrics_proxy.py` fronts `mlx_lm.server` on `:8081` by default and `mlx-serve` on `:11234` on mm1, without either server knowing it is being measured.

## 02 · One Request, Measured Six Ways

By the time a single chat completion has been relayed, the proxy has recorded six independent facts about it. None of them require the server to cooperate.

The proxy parses the request JSON on the way in (model, whether it is streaming, the sampling temperature, whether tools were offered, and the message list) and then parses the response on the way out. For a streaming reply it reassembles the SSE frames; for a non-streaming reply it parses the JSON body. From those two halves it derives a full per-request record:

| Signal | How it is measured | Metric |
| --- | --- | --- |
| Time to first token | Wall-clock from send to the first content-bearing SSE frame | mlx_ttft_seconds |
| Token rate | Completion tokens ÷ generation time | mlx_token_rate_tokens_per_second |
| Temperature | Read off the request; a gauge of the latest value | mlx_temperature |
| Tool calls | Counted per call, labelled by tool name and call type | mlx_tool_calls_total |
| Finish reason | stop / length / tool_calls — a rising `length` share means truncation | mlx_finish_reason_total |
| Hallucination risk | Composite of repetition, refusal, hedging and ungrounded signals | mlx_hallucination_risk |
| Token confidence | Perplexity, entropy, mean/min probability from logprobs | mlx_token_confidence_mean |

Two details make these numbers honest. First, a background thread polls the upstream `/v1/models` every 15 seconds, so `mlx_up` stays truthful even when the server is idle and no requests are flowing. Second, requests that are not chat completions — a client polling `/v1/models` every few seconds — are deliberately kept out of the completion counters. A near-zero TTFT from a model-list poll would otherwise sit in the histogram that latency alerts read percentiles from.

## 03 · Reading TTFT Off a Live Stream

Time to first token is the one number a proxy cannot fake. Get the buffering wrong and you silently report the whole response time as "first token."

The trap is in how you read the upstream socket. A naive `resp.read(65536)` blocks until the buffer is full — which for a Server-Sent-Events stream means waiting for a large chunk, inflating the measured TTFT toward the total generation time. The proxy reads incrementally with `resp.read1()`, which returns whatever bytes are available the moment they arrive.

```bash
# read1(): return available bytes instead of blocking until
# the full buffer size is read. read(65536) would buffer the
# entire SSE response and destroy streaming / TTFT accuracy.
chunk = resp.read1(65536)
```

As each chunk arrives it is fed to a small incremental SSE parser that accumulates content deltas, reassembles tool-call names that arrive split across frames, and captures the `usage` object when the server sends one. The first time a content delta appears is the first token, and the elapsed time since send becomes the TTFT observation.

A de-streamed request has no TTFT. When the proxy has converted a streaming call into a non-streaming one to collect logprobs (see 04), the whole completion lands at once. Recording that arrival time as a "first token" would poison the very percentiles the latency alerts fire on, so those requests are excluded from the TTFT histogram on purpose.

## 04 · Confidence From Logprobs

Text heuristics read what the model said. Logprobs read what the sampler believed — a far earlier and harder-to-fake signal. A model that is guessing has a flat token distribution long before its prose starts to look wrong.

OpenAI-style responses can carry per-token logprobs: for each emitted token, the natural log of its probability plus the top few alternatives. From those the proxy derives a confidence profile — the probability of each sampled token, the mean and minimum of those probabilities, the Shannon entropy over the returned top-k slice, and the margin between the top-1 and top-2 candidates. A single near-zero token is usually where a fabricated identifier or citation enters, which is why the minimum matters more than the mean.

The problem is that `mlx_lm.server` returns logprobs only on non-streaming responses — streamed chunks carry none. The proxy solves this with a small trick, controlled by two flags:

1

Inject into non-streaming requests

For a plain JSON completion that did not ask for logprobs, the proxy adds `logprobs` and `top_logprobs` to the upstream request, scores the reply, then strips the field back out so the client sees exactly the response it would have seen without the proxy.

2

De-stream a sampled fraction of streaming requests

A configurable fraction of streamed calls (`--logprobs-stream-sample`, off by default) are sent upstream with `stream=false`, scored, and re-emitted to the client as synthetic SSE frames. Same generation, same GPU cost — but that one request arrives all at once instead of token by token.

Everything is then kept out of the composite risk score on purpose. Only a subset of requests carry logprobs, so folding confidence into `mlx_hallucination_risk` would make that one metric mean two different things depending on whether a given request happened to be sampled. Confidence lives in its own family of series instead.

## 05 · Guardrails Before the GPU

On an 8 GB node a single oversized request can OOM the server or hog the GPU for minutes. The proxy rejects the bad ones before they ever reach it.

Because every client is forced through `:8080`, the proxy is the natural place to enforce limits the server itself does not. Each is checked on arrival, counted, and answered with a clean OpenAI-shaped error:

| Guardrail | Default | Rejected with | Purpose |
| --- | --- | --- | --- |
| Bearer auth | off (env `MLX_API_KEY`) | 401 | Required before the port is exposed off-host |
| Model check | — | 400 | The proxy fronts exactly one loaded model; a wrong id fails fast |
| Prompt-token cap | 12000 (20000 on mm1) | 400 | Estimate length and reject before an upstream Metal OOM |
| Output clamp | 4096 | — | Clamp/default `max_tokens` so no request hogs the GPU |
| Body-size cap | 4 MB | 413 | Reject oversized payloads outright |
| Rate limit | off (per client IP) | 429 | Optional per-IP throttle over a rolling window |

One model, by design. The model-id check is not a bug — it reflects that the server has exactly one model resident in 8 GB of memory. A request naming a different model is rejected with "model not loaded" rather than being silently misrouted, so a client typo surfaces as a clear 400 instead of a confusing upstream failure.

## 06 · 39 Series, Scrape, Don't Push

The proxy is the inference half of the monitoring stack. Where the hardware exporter reports watts and residency, this one reports tokens and latency — and it is strict about how those series reach the database.

All 39 series are served in Prometheus text format at `/metrics` and nothing else. The proxy deliberately exports no OTLP metrics: if it both answered a scrape and pushed OTLP, every `mlx_*` series would land twice in VictoriaMetrics with different timestamps, silently corrupting any downstream `rate()` or `sum()`. Scraping exactly once makes each series unambiguous. (Traces and logs are a separate story — those go out over OTLP when configured; see 07.)

The series group cleanly into four families:

| Family | What it answers | Representative series |
| --- | --- | --- |
| Throughput | How much work, how fast | mlx_requests_total · mlx_tokens_completion_total · mlx_token_rate_tokens_per_second |
| Latency | How long the client waited | mlx_ttft_seconds · mlx_queue_wait_seconds · mlx_generation_seconds |
| Capacity | How close to the ceiling | mlx_context_utilization · mlx_in_flight · mlx_kv_bytes_per_token · mlx_prompt_cache_ratio |
| Quality | How good and how sure | mlx_hallucination_risk · mlx_token_confidence_min · mlx_finish_reason_total |

Context utilization deserves a note: the proxy reads the model's real `max_position_embeddings` at startup, watches prompt-plus-completion tokens per request, and reports the fraction of the window in use. That is what lets a dashboard flag a coding session creeping toward auto-compact before the client hits a truncation.

This is the monitored path. In the benchmark, these are exactly the series that made the direct-vs-proxy comparison possible — and why the TTFT seen through the proxy runs a few seconds higher than a direct call: one extra Python hop plus real memory contention between proxy and server on an 8 GB box. Decode rate is essentially unchanged.

## 07 · Traces Into Opik

Metrics tell you a request was slow. Traces tell you which prompt caused it. The proxy turns every completion into a trace, optionally, with two independent export paths.

Both paths are off unless an endpoint is supplied. When enabled, each chat completion becomes a trace with an LLM span carrying the model, streaming flag, temperature, tool availability, token counts and the latency/quality metrics computed for that request.

1

The Opik SDK path

A base-URL flag brings up the Opik SDK, which logs each completion as a trace into the `mlx` project. It also writes the proxy's own heuristics back as feedback scores — hallucination quality, a safety flag, and mean token confidence — so traces are searchable by quality, not just by time.

2

The OTLP path

An OTLP-HTTP endpoint (the in-cluster collector) receives the same spans stamped with OpenInference attributes, so the Opik collector — or any OTel backend — can render the prompt and completion content alongside the LLM metadata.

Trace export is kept entirely separate from metric export. A dropped trace collector degrades tracing and nothing else; the `/metrics` scrape continues untouched. And a request can opt out of tracing entirely with a single header, which is how the benchmark harness avoided filling Opik with its own synthetic load.

## 08 · Takeaways

| Measure outside the thing you measure | The server generates; the proxy observes. Keeping them separate means the instrumentation never touches the fast path and survives swapping the server out entirely. |
| --- | --- |
| Buffering is a measurement decision | TTFT is only as honest as your socket read. `read1()` instead of `read()` is the difference between a real first-token latency and the total response time wearing its mask. |
| Logprobs beat reading the text | A flat token distribution shows up in the sampler long before the prose looks wrong. Confidence is a leading indicator; text heuristics are a lagging one. |
| Scrape, don't push | One collection path means each series exists exactly once. Dual-sourcing metrics is a silent-corruption bug that only shows up as a doubled `rate()`. |
| Reject before the GPU | On a memory-capped node, the cheapest request to serve is the one you refuse. Auth, length and rate guardrails belong at the front door, not in the engine. |

See it in action. This proxy is what put the inference counters next to the GPU power gauges in the [oMLX vs mlx-serve benchmark](../2026-10-17-omlx-vs-mlx-serve-benchmark/2026-10-17-omlx-vs-mlx-serve-benchmark.html) — the same hop that produced the monitored-path TTFT and decode numbers. The hardware side of the stack is covered in the [Apple-Silicon telemetry deep-dive](../2026-10-18-mlx-hw-telemetry/2026-10-18-mlx-hw-telemetry.html).
