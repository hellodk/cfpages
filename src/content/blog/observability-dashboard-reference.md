---
title: "22 — The Observability Reference: Every Panel, Every Formula, and the Day the Server Fell Over"
date: 2026-08-09
description: "A complete reference to the twelve Grafana dashboards: what each of the 259 panels is, the exact PromQL behind it, and the significance of the signal. Plus the crash post-mortem that shaped three of them, the proxy guardrails that stopped it, and the signal-to-noise pass that removed 20 duplicate"
tags: [observability, grafana]
cover: "assets/images/covers/observability-dashboard-reference.svg"
draft: false
---

Post 22 · the observability reference

A complete reference to the twelve Grafana dashboards: what each of the 259 panels is, the exact PromQL behind it, and the significance of the signal. Plus the crash post-mortem that shaped three of them, the proxy guardrails that stopped it, and the signal-to-noise pass that removed 20 duplicate widgets.

## 1The day the server fell over

Four crashes in 31 minutes, all `metal_gpu_error`. The supervisor sniffed the reason from the log and restarted each time, but the pattern — “crashes after a few requests” — was a real bug, not a flaky GPU:

| Time | Metal error | Context |
| --- | --- | --- |
| 21:28 | Command buffer failed | warm-up traffic |
| 21:38 | Command buffer failed | warm-up traffic |
| 21:59 | `SubmissionsIgnored` | `Prompt Cache: 3 sequences, 3.04 GB` |
| 22:20 | `OutOfMemory` (rank0 SIGABRT) | a **17,667-token** prompt in flight |

rank0 (this Mac mini) has **8 GiB** of unified GPU memory. The 8-bit Qwen3.5-4B weights allocate ~4.6 GiB. fp16 KV costs ~**144 KB per token**, so a 17.6k-token prompt alone needs ~2.5 GiB of KV — and the server’s LRU _prompt cache_ was holding up to 10 assistant sequences with _no byte limit_ (3 sequences had already grown to 3.04 GB). Two compounding causes:

1.  **Unbounded assistant prompt cache** — `mlx_lm.server` defaults to `--prompt-cache-size 10` with `--prompt-cache-bytes` unset.
2.  **An external client (192.0.2.10)** POSTing models the node cannot host — `Meta-Llama-3.1-8B-Instruct-8bit` (~8 GB) — plus a 17,667-token prompt.

!

The crash was **memory exhaustion**, and it looked like “the server is unstable after a few requests”. The dashboards made the real cause visible in minutes: the prompt-cache bytes in MLX Performance (kv agent row) and the request source in MLX Logs & Runtime.

### The fixes that stopped it

```bash
# start_server.sh — bound the in-GPU prompt cache
--prompt-cache-size 4 --prompt-cache-bytes 2g --prompt-concurrency 4

# mlx_metrics_proxy.py — reject before the GPU ever sees the request
--max-prompt-tokens 12000   # prompt-token cap        (400)
--max-tokens-cap 4096       # clamp/default max_tokens
--max-body-bytes 4MiB       # request body cap        (413)
--rate-limit 0              # per-IP / 10s            (429, off)
MLX_API_KEY=                # bearer auth             (401, off)
```

Since the guardrails landed (22:27): **zero crashes, zero restarts**. The proxy is now a hard gate in front of the 8 GiB node — it cannot be made to load a model it has not loaded, or process a prompt that would OOM the Metal command buffer.

## 2The twelve dashboards at a glance

All dashboards run on the single `VictoriaMetrics` datasource, refresh every 5 minutes, and use only core Grafana plugins (timeseries, stat, gauge, heatmap, barchart, table, bargauge, text, row). One canonical home per metric family — the result of the signal-to-noise pass in section 14.

| Dashboard | Panels | Feeds off | Job it answers |
| --- | --- | --- | --- |
| MLX Cluster | 38 | all exporters | “Is the whole system healthy right now?” |
| MLX Alerts & Serving Health | 24 | supervisor, logtailer, ALERTS | “What is crashing / flapping?” |
| MLX HTTP Requests | 26 | proxy | “How is serving performing?” |
| MLX Performance | 31 | proxy + kv agent | “Where are the latency/quality regressions?” |
| MLX Call Types | 12 | proxy (kind/reasoning) | “Are reasoning vs chat behaving differently?” |
| MLX Tool Calls | 10 | proxy (tool/type) | “Which tools are used, how often, with what share?” |
| MLX Model Sharding & Internals | 35 | model_info + kv agent + ring | “How is the model split across the ring?” |
| MLX Model | 19 | model_info | “What exactly is this model?” |
| MLX Node | 29 | hw telemetry | “What is one Mac mini doing?” |
| MLX GPU & Power | 12 | hw telemetry | “Is the GPU hot, throttled, power-hungry?” |
| MLX Logs & Runtime | 9 | logtailer + supervisor | “Is the log pipeline healthy?” |
| MLX SRE | 14 | proxy (SLI view) | “Are we inside the SLO budget?” |

259 data panels after consolidation

## 3MLX Cluster — the one-glance screen

Rows: Summary, Inference, Hallucination & Quality, Hardware (per node), Hardware (GPU & power), Proxy runtime, Status. Every stat row is the “answer in one number” version of a panel that lives in detail elsewhere — this is the dashboard you open first.

| Row | Panel | Formula | Significance |
| --- | --- | --- | --- |
| Summary | Nodes online | count(up{job="mlx-hw"}==1) | both Mac minis present |
| Summary | Requests / Tokens out / Tool calls / Halluc. flags (5m) | sum(increase(mlx_requests_total[5m])) | raw activity in the last 5 minutes |
| Summary | Avg tok/s | sum(rate(mlx_token_rate_tokens_per_second_sum[5m])) / sum(rate(..._count[5m])) | mean decode speed, sum/count trick |
| Summary | TTFT p95 | histogram_quantile(0.95, sum(rate(mlx_ttft_seconds_bucket[5m])) by (le)) | 95th % of first-token latency |
| Summary | Upstream up / Exporters up / Active alerts | mlx_up / up / count(ALERTS{firing}) | the three health tripwires |
| Summary | Nodes throttling | count(mlx_hw_thermal_pressure>0) | any node under thermal throttling |
| Inference | Requests, TTFT, Generation time, Token rate, Tool calls, Streaming share, Prompt tokens | histogram_quantile(p, sum(rate(mlx_*_bucket[5m])) by (le)) | serving perf in one glance (p50/p95) |
| Hallucination & Quality | Risk (last) / Risk p95 / Heuristics / Flags | mlx_hallucination_risk + histogram_quantile + mlx_heuristic_* | composite risk vs its component heuristics |
| Hardware | Load, mem %, memory pressure, worker RSS/CPU, disk %, GPU/power, GPU mem | mlx_hw_*{node=~"$node"} | resource envelope per node |
| Status | Tool calls by tool | sum(rate(mlx_tool_calls_total[1m])) by (tool)*60 | which tool is hottest right now |

## 4MLX Alerts & Serving Health — failure reasons with counts

Rows: Alert state, Serving status (supervisor :9105), Crash context & probe health, Log streaming, Faults/errors/restarts. This is where the crash post-mortem lives.

| Panel | Formula | Significance |
| --- | --- | --- |
| Active firing alerts / Firing by severity / Alert event rate | count(ALERTS{firing}) / sum by (severity) / rate(...) | alert state from vmalert |
| Process / ready / model loaded | max(mlx_server_up) | is the supervisor’s child alive |
| Serving status history / Server restarts (5m) / uptime | mlx_server_up, increase(mlx_server_restarts_total[5m]) | flapping visibility |
| Last crash reason | mlx_server_last_crash_reason{reason=...} | which reason is current (bool stat per reason) |
| Health probe outcomes (ok vs fail) | sum(rate(mlx_server_health_checks_total[5m])) by (result) | did probes start failing before the crash |
| **Failure reasons (table)** | sum(mlx_server_crashes_total) by (reason) + increase[24h] + last_crash_reason | **reason \| total \| last-24h \| active** in one table |
| Crashes by reason (total) / Crashes per hour / Crashes last 24h | sum by (reason), increase[1h] by (reason) | totals + rate per reason |
| Backoff delay / Last exit code / Total restarts | mlx_server_backoff_seconds, mlx_server_last_exit_code, mlx_server_restarts_total | crash-loop indicator |
| Proxy errors by status class / Error ratio | sum(rate(mlx_error_total[5m])) by (status) / .../requests | client-facing health |
| Log tailer up / shipped / dropped / errors | mlx_log_tailer_* | the log pipeline is a first-class citizen |
| Flapping alerts table | sum(increase(ALERTS{firing}[15m])) by (alertname)>0 | alerts that arm/disarm repeatedly |

✓

During the incident this dashboard read `metal_gpu_error=4`, exit `-6`, backoff growing 0→6→12s — the classic crash-loop signature, before the guardrails landed.

## 5MLX HTTP Requests — serving telemetry

Rows: Traffic, Outcomes & errors, Latency, Throughput, Call profile, Cache & queue, Distributions & aggregates. The day-to-day serving dashboard.

| Row | Panel | Formula | Significance |
| --- | --- | --- | --- |
| Traffic | Requests/min (streaming / kind), In-flight, Requests 24h | sum(rate(mlx_requests_total[5m])) by (streaming\|kind)*60 | volume, mix, queue depth |
| Outcomes | Errors/min (status class / kind) | sum(rate(mlx_error_total[5m])) by (status\|kind)*60 | 4xx vs 5xx split |
| Outcomes | Error ratio % | 100*sum(rate(errors))/clamp_min(sum(rate(requests)),0.0001) or on() vector(0) | the `vector(0)` keeps it at 0 when idle |
| Latency | TTFT p50/p95/p99 | histogram_quantile(0.50, sum(rate(mlx_ttft_seconds_bucket[30m])) by (le)) | time to first token |
| Latency | Token rate p50/p95 | histogram_quantile(... mlx_token_rate_tokens_per_second_bucket) | decode speed percentiles |
| Throughput | Tokens/min in/out, avg tokens/req, tool calls/min, hall. flags/min, by tool | rate/prometheus-rate arithmetic | economics + quality events |
| Call profile | Finish reason/min, Temperature | sum(rate(mlx_finish_reason_total[5m])) by (reason) | stop vs length vs tool_calls mix |
| Cache & queue | Prompt cache hit ratio, cumulative hit %, cached tokens/min, queue wait | mlx_prompt_cache_ratio, 100*increase(cached)/clamp_min(increase(prompt)), histogram_quantile(queue_wait) | how much prompt recompute the cache saves |
| Distributions | TTFT / entropy / hallucination-risk heatmaps | sum(rate(mlx_*_bucket[30m])) by (le) | full distribution, not just quantiles |
| Aggregates | Errors by status (24h) barchart, Requests by kind table | sort_desc(sum by (status) (increase(mlx_error_total[24h]))) | long-window rollups |

## 6MLX Performance — latency & quality regressions

Rows: KV cache (kv agent :9104), Context length, Throughput & latency, Model quality, Completion outcomes, Answer confidence (token logprobs). The “why is it slow / bad” dashboard.

| Row | Panel | Formula | Significance |
| --- | --- | --- | --- |
| KV cache | Cache size by type, cached sequences, utilization % | mlx_kv_cache_bytes{type!="total"}/1e9, mlx_kv_cache_utilization*100 | the exact metric that exposed the 3.04 GB cache |
| Context | Context used, utilization %, max context | mlx_context_used_tokens, max(mlx_context_utilization)*100 | are requests approaching the ceiling |
| Throughput | Requests/min, Tokens/min, TTFT, Generation time | histogram_quantile(...) | p50/p95 on 30m buckets |
| Quality | Hallucination risk (last + p95), flags total | mlx_hallucination_risk, sum(mlx_hallucination_flag_total) | heuristic risk trend |
| Outcomes | Finish reason breakdown, truncated %, truncated (5m) | 100*rate(finish_reason{length})/clamp_min(rate(total)) | silent quality loss = outputs cut at max_tokens |
| Confidence | Token confidence mean/min/std, perplexity p50/p95, entropy, margin, low-confidence % | mlx_token_confidence_*, histogram_quantile(perplexity), mlx_token_entropy_nats, 100*mlx_low_confidence_token_ratio | sampler-level honesty signals (logprobs) |
| Confidence | Scoring coverage % | 100*rate(mlx_confidence_scored_total)/clamp_min(rate(requests)) | what fraction of responses were actually scored |

## 7MLX Call Types — reasoning vs chat

Everything sliced by `kind` (`chat` vs `reasoning`, set by `enable_thinking`) and by streaming.

| Panel | Formula | Significance |
| --- | --- | --- |
| Reasoning share % / Reasoning share 24h | 100*rate(requests{kind="reasoning"})/clamp_min(rate(requests)) | how much of traffic is thinking mode |
| Stream vs sync by kind | sum(rate(...)) by (kind, streaming)*60 | interaction-style mix |
| Tokens/min prompt & completion by kind | sum(rate(mlx_tokens_*_total)) by (kind) | reasoning burns more tokens — quantify it |
| Tool calls/min, Finish reason by kind | sum(rate(...)) by (kind \| reason, kind) | behavioral differences per mode |
| Avg prompt/completion tokens per request by kind | rate(tokens)/clamp_min(rate(requests)) by (kind) | efficiency per mode |
| Error ratio % (kind), Hallucination risk (kind) | 100*rate(errors)/rate(requests) by (kind) | quality/errors per mode |

## 8MLX Tool Calls — agentic usage

Uses `tool=~".+"` to exclude the seeded empty-label series, so counts are real tool events only.

| Panel | Formula | Significance |
| --- | --- | --- |
| Tool calls 30d / Distinct tools 30d / Tools active 7d / 24h | sum(increase(mlx_tool_calls_total{...,tool=~".+"}[$__range])) | breadth and depth of tool usage |
| Tool calls/min by tool / by type / by kind | sum(rate(...)) by (tool\|type\|kind)*60 | live activity split |
| All tools called (30d) table / Tool calls 24h barchart / Share of calls | sort_desc(sum by (tool,type)(increase(...))) | long-window rankings + share |

## 9MLX Model Sharding & Internals — the distributed view

Rows: Model facts, Linear attention, Weight footprint, Runtime shards, Ring interconnect, KV cache agent, Context, Parallelism. Reads `mlx_model_info{attr=...}` (emitted once at load) plus live ring/kv/worker metrics.

| Row | Panel | Formula | Significance |
| --- | --- | --- | --- |
| Model facts | Architecture, layers, heads, KV heads, head dim, hidden | mlx_model_info{attr="layer_count"\|"kv_heads"\|...} | GQA shape that sets the KV-per-token cost |
| Linear attention | Linear key/value heads, dims, conv kernel, MTP layers | mlx_model_info{attr="linear_*"\|"mtp_layers"} | Qwen3.5-style hybrid attention |
| Weight footprint | Quant bits, group size, vocab, intermediate | mlx_model_info{attr="quant_bits"\|...} | why the weights cost ~4.6 GiB |
| Runtime shards | server RSS / GPU mem / GPU util per node | sum(mlx_worker_rss_bytes) by (node) | tensor-parallel shard balance |
| Ring | RX/TX bytes/s, TX, errors/s per node | sum(rate(mlx_net_rx_bytes_total[5m])) by (node) | TB4 link utilization + error state |
| KV cache agent | bytes by type, utilization, sequences, bytes/token, est@max, max seqs | sum(mlx_kv_cache_bytes) by (type), mlx_kv_bytes_per_token | the memory-accounting row that caught the crash |
| Context | max/used/utilization | mlx_context_* | how close requests get to the ceiling |
| Parallelism | Worker CPU % per node, Shards (workers) per node | sum(mlx_worker_cpu_percent) by (node), count(mlx_worker_rss_bytes) by (node) | is one node doing the heavy lifting |

## 10MLX Model — architecture & runtime

The “what exactly is loaded” dashboard. Static `mlx_model_info` attributes in the first rows; live context/KV in the runtime rows.

| Panel | Formula | Significance |
| --- | --- | --- |
| Transformer layers / KV heads / Head dim / Attn heads / Hidden / FFN / Vocab / Quant bits / Quant group | mlx_model_info{attr=...} | full architecture fingerprint |
| Architecture / dtype | mlx_model_arch | model class label |
| Max context / KV bytes/token / KV @ max context | mlx_context_length_max_tokens, mlx_kv_bytes_per_token, **product** | theoretical KV ceiling at full context |
| Context utilization % gauge | max(mlx_context_utilization)*100 | headroom warning |
| Context used / utilization (last request) | mlx_context_used_tokens, mlx_context_utilization | live per-request usage |
| Restarts total / Last crash reason | sum(mlx_server_restarts_total), mlx_server_last_crash_reason==1 | runtime health tie-in |

## 11MLX Node — one Mac mini, everything

Rows: Hardware gauges, GPU & power, Over time, LLM on this node. Template variable `$node` (rank0/rank1) selects the machine. Gauges give the current value; the Over-time row gives the trend for the same metrics — a deliberate current+trend pair.

| Row | Panel | Formula | Significance |
| --- | --- | --- | --- |
| Gauges | Load, mem %, worker RSS, GPU freq, GPU util, GPU power, package power, thermal, GPU mem %, CPU/ANE power | mlx_hw_*{node="$node"} | current state, glanceable |
| Over time | Load 1/5/15, mem, pressure, RSS+CPU, disk %, GPU freq, GPU util heatmap, GPU mem, CPU&ANE power | mlx_hw_*{node="$node"} | trend + distribution for the same metrics |
| LLM on this node | Requests/min, TTFT p50/p95, token rate, in-flight, errors/min (proxy) | mlx_*{node="$node"} | serving signals scoped to this node |
| LLM on this node | Node info, Telemetry up, Active alerts | mlx_hw_cpu_count, up{node=}, count(ALERTS{node=}) | identity + health |

## 12MLX GPU & Power

The thermal/power view — where throttling shows up before throughput drops.

| Panel | Formula | Significance |
| --- | --- | --- |
| GPU utilization (heatmap + timeseries), IOKit util, frequency | mlx_hw_gpu_utilization_percent, mlx_hw_gpu_iokit_util_percent, mlx_hw_gpu_frequency_mhz | actual utilization vs the IOKit counter; clock speed |
| GPU memory used/alloc (GiB) + % of unified pool | mlx_hw_gpu_mem_used_bytes/2^30, 100*used/total | the crash-critical memory envelope |
| GPU/CPU/ANE/package power (W) | mlx_hw_*_power_milliwatts/1000 | power draw by engine |
| Thermal pressure | mlx_hw_thermal_pressure | throttling trigger |

## 13MLX Logs & Runtime, and MLX SRE

### MLX Logs & Runtime (9 panels)

Reads `mlx_log_tailer_*` (the exporter that ships server logs to Opik) plus `mlx_server_state`. Lines/min by severity and by category, shipped vs dropped, queue depth, tailer errors, tailer up, server-log file size — the log pipeline’s own SLO. If this dashboard goes dark, you have lost forensic history.

### MLX SRE - SLI / SLA / SLO (14 panels)

Rows: SLO status, Volume basis, Trends, Burn rate. The reliability contract in numbers.

| Panel | Formula | Significance |
| --- | --- | --- |
| Availability SLI (30 d) | 100*clamp_min(1 - increase(errors{5xx}[30d])/clamp_min(increase(requests[30d]),1), 0) | success ratio over 30 days |
| Availability error budget left | 100*clamp_min(1 - (5xx ratio)/0.99, 0) | fraction of the 1% budget remaining |
| Latency SLI (30 d, TTFT<=10s) | 100*clamp_min(sum(increase(mlx_ttft_seconds_bucket{le="10"}[30d]))/sum(increase(count[30d])), 0) | % of requests under the 10s TTFT target |
| Latency error budget left | 100*(1 - (1 - SLI)/0.90) | latency budget burn |
| Requests / 5xx / 4xx / uptime (30 d) | sum(increase(...[30d])), mlx_server_uptime_seconds | volume basis for the ratios |
| 5xx ratio %, TTFT p95 vs SLO | 100*rate(errors{5xx})/clamp_min(rate(requests)), histogram_quantile(0.95,...) | current vs target |
| Availability burn rate / Latency burn rate | (5xx ratio)/0.005, (1 - TTFT-SLI)/0.001 | 1.0 == budget spent at exactly the break-even rate |
| Firing alerts | count(ALERTS{firing}) or on() vector(0) | ties the SLO view to vmalert |

## 14Signal-to-noise: 20 duplicate widgets removed

A scan across all twelve dashboards found **19 groups of identical PromQL** shown in two places. Each duplicate is visual noise when you compare dashboards side by side — you wonder whether one of them is stale. The rule adopted: **one canonical home per metric family**.

| Metric | Removed from | Canonical home |
| --- | --- | --- |
| GPU utilization / heatmap | Cluster (2 panels) | GPU & Power |
| GPU frequency, thermal pressure | Cluster | GPU & Power |
| Nodes online, active alerts | GPU & Power | Cluster |
| Upstream reachability (timeseries) | Cluster | Cluster stat |
| Requests/min, tool calls/min, temperature, hall. flags/min | Call Types (4) | HTTP Requests |
| Generation time, context used, context utilization, low-conf responses | HTTP Requests | Performance / Internals |
| Error ratio % (gauge) | HTTP Requests | HTTP Requests timeseries |
| Server CPU%/node, RSS/node | Logs & Runtime | Internals |
| Server uptime, scoring coverage | Model | SRE / Performance |

Result: 279 → **259 panels**, no signal lost. The MLX Node gauge+timeseries pairs were deliberately kept — current value and trend are different questions.

## 15Reliability backlog — what to build next

Ordered by expected impact on availability of this 8 GiB + 16 GiB ring:

1.  **KV quantization** — `mlx_lm.server` here exposes no `--kv-bits` (verified). Upgrading MLX to a build with 4-bit KV would cut KV memory 2×, roughly doubling usable context on rank0.
2.  **4-bit weights** — the 8-bit 4B costs ~4.6 GiB; 4-bit frees ~2.3 GiB for KV and activations.
3.  **Auto context trimming** in the proxy for multi-turn conversations (keep the last ~8k tokens, summarize the rest) so prompts never approach the ceiling.
4.  **Alert on crash rate by reason** — vmalert rules for `metal_gpu_error` and `oom` with severity + a 5-minute burn window.
5.  **Proactive probe** — the supervisor health check already answers `/v1/models`; add a periodic tiny generation that exercises the GPU so Metal errors surface on a probe, not on a user request.
6.  **Graceful degradation** — when the server is in backoff, have the proxy return a structured 503 with `Retry-After` instead of letting clients hang.
7.  **Persistent KV (Redis / filesystem)** — feasible on Apple Silicon (CPU/GPU share unified memory, so offload copies are cheap) but requires a custom `mlx_lm.generate` loop; it buys cross-restart conversation persistence, not OOM protection — the guardrails own that.

i

Items 1–4 are the “more memory headroom / catch it sooner” layer; 5–7 are the “fail cleanly and keep history” layer. Together they move the cluster from _restart-after-crash_ to _stay-inside-the-envelope_.

## 16What changed and where

| File | Change |
| --- | --- |
| `cluster/start_server.sh` | server launched with `--prompt-cache-size 4 --prompt-cache-bytes 2g --prompt-concurrency 4` |
| `cluster/mlx_metrics_proxy.py` | guardrails: model whitelist, prompt cap 12k (400), body cap 4 MiB (413), max_tokens clamp 4096, optional bearer auth (401) and per-IP rate limit (429) |
| `cluster/cluster.env` | documented knobs: `MLX_API_KEY`, `MLX_MAX_PROMPT_TOKENS`, `MLX_MAX_TOKENS_CAP`, `MLX_MAX_BODY_BYTES`, `MLX_RATE_LIMIT` |
| `observability/grafana/dashboards/*.json` | 7 files touched: 20 duplicate panels removed; failure-reasons table added to MLX Alerts |
| `tools/opik_dashboards.py` | unchanged — the Opik-native health & quality dashboard (post 17) still complements these twelve |
