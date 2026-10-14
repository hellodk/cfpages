---
title: "7 — The Performance Dashboard: KV Cache and Context, Finally Visible"
date: 2026-08-08
description: "The cluster already exported hardware, request and quality metrics. The one thing nobody could see was the thing that decides how much of a 40,960-token window a request actually uses — the prompt (KV) cache and the context length. This week a log-tailing agent on :9104 plus a handful of proxy gauge"
tags: [mlx, llm, observability]
draft: false
---

Post 7 of 19 · Context & KV cache

The cluster already exported hardware, request and quality metrics. The one thing nobody could see was the thing that decides how much of a 40,960-token window a request actually uses — the prompt (KV) cache and the context length. This week a log-tailing agent on :9104 plus a handful of proxy gauges put both in VictoriaMetrics, and a fourth Grafana dashboard renders them.

<svg viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Data flow: mlx_lm.server logs the prompt cache, the KV agent tails the log and exports gauges, the proxy exports context gauges, VictoriaMetrics scrapes both, Grafana renders">
      <defs>
        <linearGradient id="c1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e6fbff"></stop><stop offset="1" stop-color="#b6e8f7"></stop>
        </linearGradient>
        <linearGradient id="c2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#eef0ff"></stop><stop offset="1" stop-color="#ddd0f7"></stop>
        </linearGradient>
        <linearGradient id="c3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fde8f1"></stop><stop offset="1" stop-color="#fbcfe8"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(20,10)">
        <rect x="0" y="20" width="150" height="90" rx="12" fill="url(#c3)" opacity=".75"></rect>
        <text x="75" y="46" text-anchor="middle" font-size="11" font-weight="800" fill="#be185d">mlx_lm.server</text>
        <text x="75" y="66" text-anchor="middle" font-size="9" font-weight="700" fill="#be185d">ring backend :8081</text>
        <text x="75" y="84" text-anchor="middle" font-size="9" font-weight="700" fill="#be185d">logs "Prompt Cache:"</text>
        <text x="75" y="100" text-anchor="middle" font-size="9" font-weight="700" fill="#be185d">on every generation</text>
      </g>
      <g transform="translate(215,0)">
        <rect x="0" y="15" width="180" height="115" rx="12" fill="url(#c1)" opacity=".8"></rect>
        <text x="90" y="38" text-anchor="middle" font-size="11" font-weight="800" fill="#0e7490">mlx_kv_cache_agent</text>
        <text x="90" y="58" text-anchor="middle" font-size="9" font-weight="600" fill="#0e7490">tails server.log</text>
        <text x="90" y="76" text-anchor="middle" font-size="9" font-weight="600" fill="#0e7490">:9104/metrics</text>
        <rect x="10" y="88" width="160" height="26" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="90" y="105" text-anchor="middle" font-size="9" font-weight="800" fill="#0e7490">sequences / bytes / util</text>
      </g>
      <g transform="translate(215,190)">
        <rect x="0" y="0" width="180" height="115" rx="12" fill="url(#c2)" opacity=".7"></rect>
        <text x="90" y="24" text-anchor="middle" font-size="11" font-weight="800" fill="#6d28d9">mlx_metrics_proxy</text>
        <text x="90" y="44" text-anchor="middle" font-size="9" font-weight="600" fill="#6d28d9">:8080 &rarr; mlx_lm.server</text>
        <rect x="10" y="56" width="160" height="26" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="90" y="73" text-anchor="middle" font-size="9" font-weight="800" fill="#6d28d9">context used / max / util</text>
        <rect x="10" y="88" width="160" height="26" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="90" y="105" text-anchor="middle" font-size="9" font-weight="800" fill="#6d28d9">kv bytes/token (model_info)</text>
      </g>
      <g transform="translate(470,30)">
        <rect x="0" y="30" width="200" height="90" rx="12" fill="url(#c1)" opacity=".8"></rect>
        <text x="100" y="58" text-anchor="middle" font-size="11" font-weight="800" fill="#0e7490">VictoriaMetrics</text>
        <text x="100" y="80" text-anchor="middle" font-size="9" font-weight="600" fill="#0e7490">:8428 &middot; job mlx-kv :9104</text>
        <text x="100" y="96" text-anchor="middle" font-size="9" font-weight="600" fill="#0e7490">job mlx-proxy :8080</text>
      </g>
      <g transform="translate(470,190)">
        <rect x="0" y="0" width="200" height="115" rx="12" fill="url(#c2)" opacity=".75"></rect>
        <text x="100" y="26" text-anchor="middle" font-size="11" font-weight="800" fill="#6d28d9">Grafana :3000</text>
        <text x="100" y="48" text-anchor="middle" font-size="9" font-weight="600" fill="#6d28d9">MLX Performance</text>
        <rect x="10" y="60" width="180" height="24" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="100" y="76" text-anchor="middle" font-size="9" font-weight="800" fill="#6d28d9">KV cache &middot; context &middot; latency</text>
        <rect x="10" y="88" width="180" height="24" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="100" y="104" text-anchor="middle" font-size="9" font-weight="800" fill="#6d28d9">throughput &middot; quality</text>
      </g>
      <line x1="178" y1="86" x2="209" y2="86" stroke="#0e7490" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="178" y1="220" x2="209" y2="220" stroke="#6d28d9" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="401" y1="86" x2="464" y2="86" stroke="#0e7490" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="401" y1="220" x2="464" y2="220" stroke="#6d28d9" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="570" y1="126" x2="570" y2="184" stroke="#0e7490" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <text x="560" y="160" text-anchor="middle" font-size="9" font-weight="700" fill="#0e7490">scrape 10s</text>
      <line x1="305" y1="132" x2="305" y2="184" stroke="#b45309" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <text x="315" y="160" text-anchor="middle" font-size="9" font-weight="700" fill="#b45309">same upstream</text>
    </svg>

Fig 1. Two writers, one time series. The KV agent reads what mlx\_lm.server prints — the prompt cache summary that appears whenever a generation starts — and exports gauges on :9104. The proxy exports per-request context length and the KV math it already knows. VictoriaMetrics scrapes both; the MLX Performance dashboard renders all of it.

## 1 The invisible bottleneck

After five weeks the cluster can answer _how fast, how hot, how broken, how good_. But the single number that shapes every one of those answers was invisible: **how much of the context window a request actually consumes**. Qwen3-1.7B-4bit accepts 40,960 tokens, and KV-cache memory grows linearly with them — but the metrics stack had no idea what fraction of that window the cluster was really working inside, nor how much of it was being reused across requests.

The reuse part matters more than it sounds. The mlx\_lm server keeps an **LRU prompt cache** (10 sequences by default): when a request arrives whose prefix matches a cached one, the model skips the prefill and starts decoding immediately. That cache is the difference between a 2–3 s first token and a sub-second one. It is also the only source of truth for "how long are the contexts people actually send".

## 2 mlx\_lm has no stats endpoint — so tail its log

mlx\_lm.server (0.31.3) exposes no HTTP route for cache internals. What it _does_ do, on every generation start, is print a summary to its log — we see it because the server already logs to `cluster/logs/server.log`:

```bash
Prompt Cache: 10 sequences, 0.18 GB
- assistant: 10 sequences, 0.18 GB
- user: 0 sequences, 0.00 GB
- system: 0 sequences, 0.00 GB
```

That log line is a perfectly good metric source — it just isn't one. So `cluster/mlx_kv_cache_agent.py` is a 180-line Prometheus exporter that tails the same file (byte-offset seek, so it survives rotation), regexes those lines, and serves gauges on `:9104/metrics`. One scrape job in `observability/vm-scrape.yml` (`mlx-kv` → `192.0.2.64:9104`) is all the wiring that needed.

| Metric | Meaning |
| --- | --- |
| `mlx_kv_cache_sequences{type=...}` | Sequences in the LRU cache, per role + total |
| `mlx_kv_cache_bytes{type=...}` | KV bytes cached, per role + total |
| `mlx_kv_cache_max_sequences` | LRU depth (mlx_lm default 10) |
| `mlx_kv_cache_utilization` | Cached bytes ÷ theoretical full-cache capacity |
| `mlx_kv_bytes_per_token` | fp16 KV bytes per token from model dims |
| `mlx_context_length_max_tokens` | Model max context (40,960) |
| `mlx_kv_est_bytes_max_context` | KV for one full-length sequence (4.7 GB) |

The agent recomputes the KV numbers itself every poll from the model config, so the log's approximate "0.18 GB" becomes an exact bytes/token figure.

## 3 Context math from config.json

The bytes-per-token figure doesn't come from the log — it comes from `cluster/mlx_model_info.py`, a tiny shared helper that loads the model's `config.json` from the Hugging Face cache and computes the KV footprint from the transformer's actual dimensions. For Qwen3-1.7B-4bit: `max_position_embeddings=40960`, 28 layers, 8 KV heads, 128 head\_dim →

```bash
kv_bytes_per_token = 2 * layers * kv_heads * head_dim * 2 bytes
                  = 2 * 28 * 8 * 128 * 2
                  = 114,688 B/tok        (~112 KiB)

max_context_kv = 40960 * 114,688      = 4.70 GB per sequence
cache_capacity = 10 * 4.70 GB         = 46.97 GB theoretical
```

Both the proxy and the KV agent import the same helper, so the number is derived once and shared — no hand-maintained constants to drift. (The `2×` is fp16: mlx stores the cache half-precision.)

## 4 The proxy's per-request context gauges

The cache tells us what's _sitting in memory_. The proxy tells us what each request _uses_. It already sums prompt + completion tokens per request for the token counters, so three gauges were nearly free: `mlx_context_used_tokens` (the last request's total context length), `mlx_context_utilization` (that over 40,960), and `mlx_context_length_max_tokens` — all label-exported per model, sharing the same `model_info` import.

```bash
context_used = prompt_tokens + comp_tokens
CONTEXT_USED.labels(model=model).set(context_used)
CONTEXT_UTIL.labels(model=model).set(
    min(1.0, context_used / float(_CTX_MAX_TOKENS)))
```

The existing `mlx_ttft_seconds` and `mlx_generation_seconds` histograms from post 4 stay as they are — the dashboard just finally shows them side by side with the cache that makes them interesting.

## 5 The dashboard

`observability/grafana/dashboards/mlx-performance.json` (uid `mlx-performance`, folder "MLX Cluster") lands in the same provisioning directory as the other three, so Grafana picks it up without a restart. Seventeen panels in four rows: **KV cache** (size by type, cached sequences, utilization gauge), **Context length** (used tokens, utilization, max-context stat), **Throughput & latency** (requests/min, prompt vs completion tokens/min, TTFT and generation p50/p95), and **Model quality** (hallucination risk + p95, flags, current-risk gauge).

![MLX Performance dashboard in Grafana: KV cache size by type, cached sequences, cache utilization, context length used and utilization, requests and tokens per minute, TTFT and generation quantiles, hallucination risk](/assets/blog/mlx-inference-performance/mlx-performance.png)

Fig 2. The MLX Performance dashboard after a live 18-request burst. KV cache holds ~190 MB across 10 sequences — utilization 0.34% of the theoretical 47 GB — while the context panels show real requests landing at ~0.35% of the 40,960-token window. Bottom row: TTFT p50 0.38 s / p95 0.91 s against a generation time of ~5.8 s, and the proxy's current hallucination risk at 2.17%.

## 6 Reading the numbers

That screenshot is the whole story in one glance:

190 MB

KV cache after 18 requests — 10 cached sequences, ~19 MB each

0.34%

cache utilization — 190 MB of a 47 GB theoretical ceiling

0.38 s

TTFT p50 — cache-hit requests start decoding almost instantly

8.8

decode tokens/s on the two-node ring — the generation-time partner to TTFT

The TTFT panel is the one that makes the cache panels earn their place. Cold requests — first time a prompt is seen — pay a 2–3 s prefill; the same prompt re-sent lands at sub-second TTFT because the LRU cache served the prefix. The _KV cache size_ step and the _TTFT_ drop are the same event seen from two sides. And the context gauges put a hard number on a question the trace data could only gesture at: real workloads are using ~0.35% of the window. There is an enormous amount of headroom — or, put more honestly, the cluster is comfortably far from its KV ceiling even under burst traffic.

> Prefill cost is invisible until you can watch the cache fill. The moment you can, the TTFT spikes and the cache steps line up — and the "why is it slow" question gets an answer in one row.

## 7 What bit us along the way

-   **`rate()` with no samples is garbage.** `histogram_quantile(0.5, rate(bucket[5m]))` interpolates into whichever bucket is nonzero — after traffic stopped, TTFT "p50" read 32 ms, then 17 s on the next scrape. The fix was widening the rate window to `[30m]` so the whole displayed span always has samples; the quantile stays stable instead of glitching on idle.
-   **Stacking the `total` series doubles the chart.** The cache lines report per-type _and_ a total, so the first draft of the stacked "KV cache size" panel plotted the total on top of its own parts. Filtering to `{type!="total"}` fixed it; total stays available for queries.
-   **Deleting series from VM isn't enough while the process holds the label.** After a malformed test request, the proxy kept exporting a stale `model="qwen3:1.7b"` series (prometheus\_client retains label sets in memory), and every 10 s scrape re-created the "deleted" data. The series only really disappeared after a proxy restart that reset the registry.
-   **Gauges with zero flags render as "No data".** A counter that never fired has no series at all. Wrapping the flags query in `or on() vector(0)` gives the panel a real 0 instead of an empty plot.

✓

**Seven posts, four dashboards.** The observability stack now spans hardware, alerts, quality and — finally — the cache and context layer that gates every request. The KV agent and the context gauges are two more Prometheus-format surfaces scraped by the same VictoriaMetrics, shown by the same Grafana.
