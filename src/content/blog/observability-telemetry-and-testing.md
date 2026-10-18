---
title: "19 — Every Signal, One Map: Telemetry and Test Tooling in Tables"
date: 2026-08-08
description: "This stack generates a lot of artifacts — 36 metric families on the proxy alone, another 40-odd on four exporters, spans, log streams, feedback scores, and alerts. And it is tested with four different rigs. This post is the reference map: what is generated, where each thing goes, and how the load"
tags: [observability, testing]
cover: "assets/images/covers/observability-telemetry-and-testing.svg"
draft: false
---

19 of 19 · the atlas

This stack generates a lot of artifacts — 36 metric families on the proxy alone, another 40-odd on four exporters, spans, log streams, feedback scores, and alerts. And it is tested with four different rigs. This post is the reference map: _what_ is generated, _where_ each thing goes, and _how_ the load and unit tests run. Each section is a tab.

## Metrics

## 1Metrics: five Prometheus exporters, scraped not pushed

Every `mlx_*` metric is served as a Prometheus text endpoint and **scraped** by VictoriaMetrics every 10 s — nothing is pushed over OTLP. That split was an explicit audit decision (post 4): the OTLP metrics path was removed from the proxy so each series exists exactly once.

| Exporter | Port | What it reports (families) | Scraped at |
| --- | --- | --- | --- |
| `mlx_metrics_proxy.py` (the inference front door) | `:8080` | 36 `mlx_*` families — volume (`mlx_requests_total`, tokens), latency (`mlx_ttft_seconds`, `mlx_generation_seconds`, `mlx_token_rate_*` histograms), tool calls, finish reasons, temperature, hallucination heuristics (`mlx_hallucination_risk`, `mlx_heuristic_*`), context/KV gauges, model info (`mlx_model_info{attr}`, `mlx_model_arch`), and the confidence set (`mlx_output_perplexity`, `mlx_token_entropy_nats`, `mlx_token_confidence_*`, `mlx_token_margin_mean`, `mlx_low_confidence_*`, `mlx_confidence_scored_total{source}`); volume/errors/tokens/calls/finish/temperature/risk carry a `kind` label (`reasoning` when `enable_thinking` is set, else `chat`) | `192.0.2.64:8080` |
| `mlx_hw_telemetry.py` (both nodes) | `:9102` | 24 gauges — CPU/mem/disk/temp, GPU util/freq/power/mem, ANE & package power, thermal, per-worker CPU/RSS | `192.0.2.64:9102` (rank0), `203.0.113.2:9102` (rank1, over Ethernet) |
| `mlx_kv_cache_agent.py` | `:9104` | `mlx_kv_cache_sequences/bytes{type}`, `mlx_kv_cache_utilization`, `mlx_context_*`, `mlx_kv_bytes_per_token`, `mlx_kv_est_bytes_max_context` | `192.0.2.64:9104` |
| `mlx_server_supervisor.py` | `:9105` | Serving truth — `mlx_server_state/up/ready`, `mlx_model_loaded`, `mlx_server_restarts_total`, `mlx_server_crashes_total{reason}`, `mlx_server_uptime_seconds`, `mlx_server_health_checks_total{result}` | `192.0.2.64:9105` |
| `mlx_server_log_tailer.py` | `:9106` | Log-pipeline health — `mlx_log_tailer_up`, `lines/shipped/dropped/errors`, `file_bytes`, `queue_depth` | `192.0.2.64:9106` |

ⓘVM runs on this Mac (`victoria-metrics:8428` in compose). The rank1 scrape target was repointed to `203.0.113.2:9102` so node B is reachable over the direct Ethernet link even when the Wi-Fi segments are split.

### The proxy family detail

The full 36-family set on `:8080/metrics` (labels in parentheses):

| Metric | Type | Meaning |
| --- | --- | --- |
| `mlx_requests_total` model, streaming, kind | Counter | Completion requests (`kind` = `reasoning` when the caller sets `enable_thinking`, else `chat`) |
| `mlx_tokens_prompt_total` / `mlx_tokens_completion_total` kind | Counter | Token volume by call kind |
| `mlx_ttft_seconds`, `mlx_generation_seconds`, `mlx_token_rate_tokens_per_second` | Histogram | Latency + throughput |
| `mlx_tool_calls_total` kind, tool, type, `mlx_finish_reason_total{reason, kind}` | Counter | Agentic behaviour by call kind; `tool` is the function name, `type` the OpenAI call type (`function` / `code_interpreter` / …) |
| `mlx_temperature` kind, `mlx_hallucination_risk` kind, `mlx_hallucination_risk_histogram`, `mlx_hallucination_flag_total` | Gauge/Hist/Counter | Sampling + text heuristics |
| `mlx_heuristic_repetition/_refusal/_hedging/_ungrounded` | Gauge | Individual heuristic scores |
| `mlx_up`, `mlx_in_flight`, `mlx_error_total{status, kind}` | Gauge/Counter | Liveness + errors by status class and call kind |
| `mlx_context_length_max_tokens`, `mlx_context_used_tokens`, `mlx_context_utilization`, `mlx_kv_bytes_per_token` | Gauge | Context window + KV cache footprint |
| `mlx_model_info{attr}`, `mlx_model_arch{arch, dtype}` | Gauge | Static architecture facts from `config.json`: layers, KV heads, head dim, hidden size, attention heads, vocab, FFN intermediate, quant bits/group size (feeds the MLX Model dashboard) |
| `mlx_output_perplexity` +histogram, `mlx_token_entropy_nats` +histogram | Gauge | Sampler-flatness signals |
| `mlx_token_confidence_mean/_min/_std`, `mlx_token_margin_mean`, `mlx_low_confidence_token_ratio` | Gauge | Token confidence (post 18) |
| `mlx_confidence_scored_total{source}`, `mlx_low_confidence_response_total` | Counter | Scoring coverage + low-confidence responses |

## Logs

## 2Logs: two producers, one collector, a durable JSONL tail

| Producer | Origin | How it leaves the host | Destination |
| --- | --- | --- | --- |
| `mlx_server_log_tailer.py` (:9106) | `cluster/logs/server.log` — the live `mlx_lm.server` log (ring, GPU, rank, generation lines; HTTP access lines excluded by default) | OTLP HTTP → `192.0.2.64:4318/v1/logs`, classified with attrs `mlx.log.severity/category/source/project`, header `projectName: mlx`, rate-limited 50 lines/s | otel-collector `logs` pipeline → durable JSONL at `/var/log/otelcol/mlx-server-logs.jsonl` (50 MB × 5 backups) + debug stdout |
| proxy `mlx.proxy.http` logger | One access-log line per request | OTLP HTTP → same collector `/v1/logs` (only when `--otlp-endpoint` is set) | same JSONL file |

Local, unbuffered logs for operators (rotated by the stack, not shipped):

| File | Writes |
| --- | --- |
| `cluster/logs/server.log` | `mlx_lm.server` / ring output (tailer also watches this) |
| `cluster/logs/proxy.log`, `supervisor.log`, `hw0.log`/`hw1.log`, `kvagent.log`, `logtailer.log`, `bootstrap.log` | Each component, plus the start script’s own action log |

⚠The collector’s `traces` pipeline only prints to debug. Durable trace storage lives in Opik (next tab); the JSONL log file is the only long-lived artifact the collector itself keeps.

## Traces & Opik

## 3Traces: one span, three sinks — and Opik’s feedback loop

The proxy creates one span `mlx.chat.completions` (tracer `mlx.proxy`) per request and stamps it as it passes through:

| Phase | Attributes |
| --- | --- |
| Request start | `http.request.method`, `url.path`, `mlx.model`, `mlx.streaming`, `mlx.temperature`, `mlx.tools_provided` |
| Completion | `mlx.ttft_seconds`, `mlx.gen_seconds`, `mlx.tokens_prompt/completion`, `mlx.tool_calls`, `mlx.hallucination_risk`, `mlx.hallucination_flagged`, `http.response.status_code` |
| Confidence (only when scored) | `mlx.logprobs_source`, `mlx.perplexity`, `mlx.token_entropy`, `mlx.confidence_mean`, `mlx.confidence_min`, `mlx.low_confidence_token_ratio` |
| OpenInference (only with `--opik-otlp-endpoint`) | `openinference.span.kind`=LLM, `input.value`, `llm.model_name`, `llm.token_count.*`, `metadata` JSON (incl. `_conf_metadata`: scored_tokens, confidence_std, token_margin_mean, …) |

### Where the span goes

| Sink | Address | Contents |
| --- | --- | --- |
| otel-collector traces | `192.0.2.64:4318/v1/traces` (gRPC `:4317` also open) | debug/stdout only |
| Opik OTLP ingestion | `192.0.2.10:32173/api/v1/private/otel/v1/traces`, header `projectName: mlx` | the same span with OpenInference attrs — this is what populates the `mlx` project |
| Opik SDK (when `OPIK_ENDPOINT` set) | `192.0.2.10:32173/api` | trace + LLM span, plus in-band feedback scores |

### Feedback scores (written by the proxy, in-band)

| Score | Value | Category |
| --- | --- | --- |
| `hallucination_quality` | `1.0 - risk` | quality |
| `hallucination_flagged` | `0.0` if flagged else `1.0` | safety |
| `token_confidence` | `confidence_mean` (only when scored) | quality |

### The judge loop (post 6) — `cluster/opik_evaluator.py`

| Step | How |
| --- | --- |
| Read | `GET 192.0.2.10:32173/api/v1/private/traces?…` |
| Judge | LLM-as-judge — the judge model is the cluster proxy itself at `127.0.0.1:8080/v1` |
| Write | `PUT 192.0.2.10:32173/api/v1/private/traces/feedback-scores` with `correctness`, `helpfulness`, `hallucination_free` |

Opik dashboards (`tools/opik_dashboards.py`) turn the traces + judge scores into a project-scoped “mlx: serving health & quality” view at the same base URL (post 17).

## Alerts & Dashboards

## 4Alerts & Dashboards: 46 rules to a webhook, ten dashboards to Grafana

| Stage | Component | How |
| --- | --- | --- |
| Rules | vmalert (`:8880`) | 46 rules in 6 groups — `mlx-hardware` (15), `mlx-serving` (8), `mlx-inference` (7), `mlx-quality` (6), `mlx-confidence` (5, post 18), `mlx-slo` (5: burn-rate + budget alerts for the SLOs on the SRE dashboard) |
| Evaluation | vmalert → VM | queries `victoria-metrics:8428`, writes `ALERTS` series back via remote-write |
| Routing | Alertmanager (`:9093`) | `critical` → `host.containers.internal:9000/hooks/oncall`; everything else → `.../hooks/alert`; inhibit rules (e.g. ProxyDown silences UpstreamDown) |
| Dashboards | Grafana (`:3000`) | 10 provisioned: MLX Cluster (50 panels), MLX Performance (29), MLX GPU & Power (17), MLX Node (33), MLX Alerts & Serving Health (28), + MLX SRE (SLI/SLA/SLO/error budget), MLX HTTP Requests (20), MLX Call Types (21, reasoning vs chat incl. tool breakdown), MLX Model (25, architecture dims), MLX Tool Calls (14, dynamic tool usage); datasource `victoria-metrics:8428` |

✓Every confidence alert is gated on `mlx_confidence_scored_total > 0`, and `MLXConfidenceScoringStopped` fires when traffic flows but nothing is scored — so “blind” and “healthy” never look identical (post 18).

## Load tests

## 5Load tests: four rigs, all against the proxy

Every bench tool targets the **proxy** (`127.0.0.1:8080/v1/chat/completions`), streams by default, uses `temperature: 0.0`, and sends `X-Mlx-Trace: 1` so every request lands in Opik. Concurrency is thread-based (stdlib `urllib` + thread pools), never async.

| Rig | Measures | How it runs | Output |
| --- | --- | --- | --- |
| `tools/bench.py` | Streaming TTFT, generation time, tok/s per request | Prompt matrix (short/medium/long) or one fixed-concurrency burst; `--iters`, `--concurrency` | table + optional `--json` |
| `tools/bench_load.py` main rig | TTFT/latency/tps p50-95-99, throughput tok/s, error rate | `--sweep` ramps concurrency 1→2→4→8→16; `--sustain N` soaks while snapshotting `:9102`/`:9104`/`:9105` every interval; `--profile` stream on/off × prompt size. `--duration`/`--settle` control each level | JSON report → `tools/bench-reports/{label}-{ts}.json` |
| `tools/bench_agentic.py` | Turns, per-turn TTFT, wall time, tool-call validity, completion-in-budget | Scenarios `calculator`/`tri_tool`/`planner` against a deterministic stub tool registry; streaming chat with `tools`; full transcript re-sent each turn; `--runs` × `--agents` concurrent loops | JSON report → `tools/bench-reports/` |
| `tools/smoke.py` | Ring init + `all_sum` correctness across ranks | Runs `mlx.core` on the cluster nodes directly (not HTTP); `--backend ring` | console |

### How a load run actually works

-   Each concurrency level spawns N worker threads that loop `run_one()` until a `stop` event fires after `--duration` seconds.
-   Each `run_one` returns per-request `ttft`, `total`, `gen_time`, `comp_tokens`, `tps`, ok/error — aggregated into percentiles and error rate.
-   Results are correlated against VM-scraped cluster metrics (GPU mem, KV util, supervisor state) snapshotted during `--sustain`.
-   No RPS controller — workers fire as fast as they can; there is no rate limiter or think time (documented gap, ghz/k6/locust are drop-in options).

### Measured results (from the blogs)

| Finding | Source |
| --- | --- |
| 2-node ring is ~3× slower than single node at 1.7B scale (ring collectives dominate): short prompt 0.8 s/65 tok/s single vs 2.4 s/~18 tok/s ring | README Benchmarks |
| Peak ring throughput ~28 tok/s at concurrency 4; TTFT degrades linearly as it saturates | post 9 |
| 18-request burst: TTFT p50 0.38 s / p95 0.91 s, ~8.8 decode tok/s | post 7 |
| Agentic: calculator 5 turns/4 calls 100% valid; tri_tool 2 turns/3 calls; planner 0 tool calls; 2 concurrent agents crashed the server | post 9 |
| Confidence layer: “what is 2+2” ppl 1.00 / conf_min 1.00 vs obscure factual ppl 1.41 / conf_min 0.119 | post 18 |

## Unit tests

## 6Unit & integration tests: 40, in the repo venv

Run with `.venv/bin/python -m pytest tests/ -q` (Python 3.14 venv at repo root; both modules import `mlx_metrics_proxy` directly, no network needed for the confidence tests).

| File | Tests | What it proves |
| --- | --- | --- |
| `tests/test_confidence.py` | 30 pure unit | perplexity, renormalised top-k entropy (lower-bound), top-2 margin, `confidence_stats`, `score_confidence` incl. malformed-input tolerance, `strip_logprobs`/`choice_logprobs`, SSE-frame synthesis round-trips (content, tool calls, identity fields), `_conf_metadata` |
| `tests/test_proxy_rewrite.py` | 10 e2e | against a `StubUpstream` that mirrors `mlx_lm.server` (logprobs on non-streaming only, SSE + `[DONE]` + connection-close framing, optional tool calls, configurable error status). The proxy runs **in-process** on an ephemeral port; real HTTP drives it. Verifies: logprobs injected upstream but stripped for the client with matching Content-Length, client-requested logprobs pass through, injection disable, tool calls survive the strip, upstream 503 passthrough, streaming untouched when sampling off, de-streamed requests still parse as SSE, de-streamed tool calls reach the client, and de-streamed requests record **no TTFT**. Metrics are read back from the in-process proxy’s `/metrics`. |

ⓘThe bench tools themselves are not unit-tested — only the proxy’s confidence/rewrite layer is. The stub upstream is the trick that makes the whole injection/de-streaming path testable without a GPU.

## Flow & ports

## 7Flow & ports: how it all moves

The four data paths in pictures. Moving dots are live traffic; dashed lines are idle by design.

Metrics — five exporters scraped by VictoriaMetrics every 10 s

<svg viewBox="0 0 760 330" role="img" aria-label="Metrics scrape flow">
      <defs>
        <marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#818cf8"></path></marker>
      </defs>
      <g font-family="inherit">
        <rect class="dbox" x="20" y="28" width="250" height="42"></rect>
        <text class="bigname" x="30" y="45">mlx_metrics_proxy</text>
        <text class="label" x="30" y="61">36 mlx_* families &middot; hallucination + confidence</text>
        <rect class="portbadge" x="225" y="34" width="36" height="16" rx="8"></rect><text class="porttext" x="231" y="46">8080</text>
        <rect class="dbox" x="20" y="88" width="250" height="42"></rect>
        <text class="bigname" x="30" y="105">mlx_hw_telemetry</text>
        <text class="label" x="30" y="121">GPU / CPU / mem / power &mdash; rank0 + rank1</text>
        <rect class="portbadge" x="225" y="94" width="36" height="16" rx="8"></rect><text class="porttext" x="231" y="106">9102</text>
        <rect class="dbox" x="20" y="148" width="250" height="42"></rect>
        <text class="bigname" x="30" y="165">mlx_kv_cache_agent</text>
        <text class="label" x="30" y="181">KV cache + context-window gauges</text>
        <rect class="portbadge" x="225" y="154" width="36" height="16" rx="8"></rect><text class="porttext" x="231" y="166">9104</text>
        <rect class="dbox" x="20" y="208" width="250" height="42"></rect>
        <text class="bigname" x="30" y="225">mlx_server_supervisor</text>
        <text class="label" x="30" y="241">serving state / restarts / crash reasons</text>
        <rect class="portbadge" x="225" y="214" width="36" height="16" rx="8"></rect><text class="porttext" x="231" y="226">9105</text>
        <rect class="dbox" x="20" y="268" width="250" height="42"></rect>
        <text class="bigname" x="30" y="285">mlx_server_log_tailer</text>
        <text class="label" x="30" y="301">log-pipeline health counters</text>
        <rect class="portbadge" x="225" y="274" width="36" height="16" rx="8"></rect><text class="porttext" x="231" y="286">9106</text>
        <rect class="dbox" x="520" y="135" width="215" height="60" stroke="#0f766e"></rect>
        <text class="bigname" x="530" y="158">VictoriaMetrics</text>
        <text class="label" x="530" y="174">scrape every 10&nbsp;s &rarr; TSDB (30&nbsp;d)</text>
        <rect class="portbadge" x="678" y="142" width="48" height="16" rx="8" stroke="#0f766e"></rect><text class="porttext" x="681" y="154" fill="#0f766e">8428</text>
      </g>
      <path class="dflow" id="p1" d="M270,49 C390,49 400,165 515,165"></path>
      <path class="dflow" id="p2" d="M270,109 C390,109 400,165 515,165"></path>
      <path class="dflow" id="p3" d="M270,169 C390,169 400,165 515,165"></path>
      <path class="dflow" id="p4" d="M270,229 C390,229 400,165 515,165"></path>
      <path class="dflow" id="p5" d="M270,289 C390,289 400,165 515,165"></path>
      <g><circle class="dot" r="5"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#p1"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3s" begin=".6s" repeatCount="indefinite"><mpath href="#p2"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3s" begin="1.2s" repeatCount="indefinite"><mpath href="#p3"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3s" begin="1.8s" repeatCount="indefinite"><mpath href="#p4"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3s" begin="2.4s" repeatCount="indefinite"><mpath href="#p5"></mpath></animateMotion></circle></g>
    </svg>

Logs — OTLP HTTP push to the collector, then a durable JSONL tail

<svg viewBox="0 0 760 300" role="img" aria-label="Log flow">
      <defs>
        <marker id="ar2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#818cf8"></path></marker>
      </defs>
      <g font-family="inherit">
        <rect class="dbox" x="20" y="50" width="260" height="44"></rect>
        <text class="bigname" x="30" y="68">mlx_server_log_tailer</text>
        <text class="label" x="30" y="84">server.log &rarr; classified lines, 50/s</text>
        <rect class="portbadge" x="232" y="58" width="36" height="16" rx="8"></rect><text class="porttext" x="238" y="70">9106</text>
        <rect class="dbox" x="20" y="150" width="260" height="44"></rect>
        <text class="bigname" x="30" y="168">mlx_metrics_proxy</text>
        <text class="label" x="30" y="184">one access-log line per request</text>
        <rect class="portbadge" x="232" y="158" width="36" height="16" rx="8"></rect><text class="porttext" x="238" y="170">8080</text>
        <rect class="dbox" x="430" y="95" width="210" height="54" stroke="#0f766e"></rect>
        <text class="bigname" x="440" y="114">otel-collector</text>
        <text class="label" x="440" y="130">OTLP HTTP :4318 / gRPC :4317</text>
        <rect class="portbadge" x="596" y="102" width="36" height="16" rx="8" stroke="#0f766e"></rect><text class="porttext" x="602" y="114" fill="#0f766e">4318</text>
        <rect class="dbox" x="430" y="210" width="250" height="50"></rect>
        <text class="bigname" x="440" y="230">durable JSONL</text>
        <text class="label" x="440" y="246">/var/log/otelcol/mlx-server-logs.jsonl</text>
        <text class="label" x="440" y="258">50 MB &times; 5 rotations</text>
        <rect class="dbox" x="430" y="20" width="210" height="44"></rect>
        <text class="bigname" x="440" y="38">VictoriaMetrics</text>
        <text class="label" x="440" y="54">metrics remote-write (idle)</text>
        <rect class="portbadge" x="596" y="28" width="36" height="16" rx="8"></rect><text class="porttext" x="602" y="40">8428</text>
      </g>
      <path class="dflow" id="l1" d="M280,72 C350,72 360,118 425,122"></path>
      <path class="dflow" id="l2" d="M280,172 C350,172 360,148 425,132"></path>
      <path class="dflow" id="l3" d="M545,149 C545,170 545,182 545,205"></path>
      <path class="dflow idle" id="l4" d="M540,95 C540,72 540,62 540,52"></path>
      <g><circle class="dot" r="5"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#l1"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3.4s" begin=".5s" repeatCount="indefinite"><mpath href="#l2"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="2.6s" begin="1s" repeatCount="indefinite"><mpath href="#l3"></mpath></animateMotion></circle></g>
      <text class="label" x="600" y="160">logs pipeline</text>
      <text class="label" x="560" y="90">metrics pipeline</text>
    </svg>

Traces & Opik — one span, three sinks, and the judge loop

<svg viewBox="0 0 760 380" role="img" aria-label="Trace and Opik flow">
      <defs>
        <marker id="ar3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#818cf8"></path></marker>
      </defs>
      <g font-family="inherit">
        <rect class="dbox" x="20" y="140" width="260" height="52"></rect>
        <text class="bigname" x="30" y="158">mlx_metrics_proxy</text>
        <text class="label" x="30" y="174">span mlx.chat.completions</text>
        <text class="label" x="30" y="186">+ 3 in-band feedback scores</text>
        <rect class="portbadge" x="232" y="146" width="36" height="16" rx="8"></rect><text class="porttext" x="238" y="158">8080</text>
        <rect class="dbox" x="520" y="20" width="215" height="44"></rect>
        <text class="bigname" x="530" y="38">otel-collector</text>
        <text class="label" x="530" y="54">traces &rarr; debug stdout</text>
        <rect class="portbadge" x="678" y="28" width="36" height="16" rx="8"></rect><text class="porttext" x="684" y="40">4318</text>
        <rect class="dbox" x="520" y="110" width="215" height="56"></rect>
        <text class="bigname" x="530" y="128">Opik &middot; OTLP ingestion</text>
        <text class="label" x="530" y="144">/api/v1/private/otel/v1/traces</text>
        <text class="label" x="530" y="158">project &ldquo;mlx&rdquo; (OpenInference attrs)</text>
        <rect class="portbadge" x="678" y="118" width="48" height="16" rx="8"></rect><text class="porttext" x="681" y="130">32173</text>
        <rect class="dbox" x="520" y="220" width="215" height="56"></rect>
        <text class="bigname" x="530" y="238">Opik &middot; SDK</text>
        <text class="label" x="530" y="254">/api &mdash; trace + LLM span</text>
        <text class="label" x="530" y="268">feedback scores flush here</text>
        <rect class="portbadge" x="678" y="228" width="48" height="16" rx="8"></rect><text class="porttext" x="681" y="240">32173</text>
        <rect class="dbox" x="270" y="322" width="250" height="46"></rect>
        <text class="bigname" x="280" y="340">cluster/opik_evaluator.py</text>
        <text class="label" x="280" y="356">judge = the proxy itself</text>
      </g>
      <path class="dflow" id="t1" d="M280,155 C380,155 430,42 515,42"></path>
      <path class="dflow" id="t2" d="M280,168 C380,168 430,138 515,138"></path>
      <path class="dflow" id="t3" d="M280,181 C380,181 430,248 515,248"></path>
      <path class="dflow" id="t4" d="M270,345 C140,345 120,170 20,170"></path>
      <path class="dflow" id="t5" d="M520,345 C640,345 650,280 520,268"></path>
      <path class="dflow" id="t6" d="M520,330 C650,330 660,168 520,166"></path>
      <g><circle class="dot" r="5"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#t1"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3.2s" begin=".4s" repeatCount="indefinite"><mpath href="#t2"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3.4s" begin=".8s" repeatCount="indefinite"><mpath href="#t3"></mpath></animateMotion></circle></g>
      <g><circle class="dot2" r="5"><animateMotion dur="4s" begin="1.2s" repeatCount="indefinite"><mpath href="#t4"></mpath></animateMotion></circle></g>
      <g><circle class="dot2" r="5"><animateMotion dur="4s" begin="1.6s" repeatCount="indefinite"><mpath href="#t5"></mpath></animateMotion></circle></g>
      <g><circle class="dot2" r="5"><animateMotion dur="4s" begin="2s" repeatCount="indefinite"><mpath href="#t6"></mpath></animateMotion></circle></g>
      <text class="label" x="300" y="115">spans</text>
      <text class="label" x="350" y="300">read traces / write correctness &middot; helpfulness &middot; hallucination_free</text>
      <text class="label" x="140" y="230">judge calls</text>
    </svg>

Alerts & dashboards — 46 rules to a webhook, ten dashboards to Grafana

<svg viewBox="0 0 760 300" role="img" aria-label="Alert and dashboard flow">
      <defs>
        <marker id="ar4" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#818cf8"></path></marker>
      </defs>
      <g font-family="inherit">
        <rect class="dbox" x="20" y="25" width="200" height="44"></rect>
        <text class="bigname" x="30" y="43">Grafana</text>
        <text class="label" x="30" y="59">10 dashboards &middot; 255 panels</text>
        <rect class="portbadge" x="176" y="33" width="36" height="16" rx="8"></rect><text class="porttext" x="182" y="45">3000</text>
        <rect class="dbox" x="300" y="100" width="190" height="50" stroke="#0f766e"></rect>
        <text class="bigname" x="310" y="120">VictoriaMetrics</text>
        <text class="label" x="310" y="136">query + ALERTS store</text>
        <rect class="portbadge" x="436" y="108" width="48" height="16" rx="8" stroke="#0f766e"></rect><text class="porttext" x="439" y="120" fill="#0f766e">8428</text>
        <rect class="dbox" x="20" y="185" width="200" height="44"></rect>
        <text class="bigname" x="30" y="203">vmalert</text>
        <text class="label" x="30" y="219">46 rules &middot; 6 groups</text>
        <rect class="portbadge" x="176" y="193" width="36" height="16" rx="8"></rect><text class="porttext" x="182" y="205">8880</text>
        <rect class="dbox" x="520" y="185" width="215" height="44"></rect>
        <text class="bigname" x="530" y="203">Alertmanager</text>
        <text class="label" x="530" y="219">inhibit rules &middot; routing</text>
        <rect class="portbadge" x="678" y="193" width="36" height="16" rx="8"></rect><text class="porttext" x="684" y="205">9093</text>
        <rect class="dbox" x="520" y="25" width="215" height="50"></rect>
        <text class="bigname" x="530" y="43">webhook target</text>
        <text class="label" x="530" y="59">host.containers.internal:9000</text>
        <text class="label" x="530" y="71">/hooks/oncall (critical) &middot; /hooks/alert</text>
        <rect class="portbadge" x="678" y="33" width="48" height="16" rx="8"></rect><text class="porttext" x="681" y="45">9000</text>
      </g>
      <path class="dflow" id="a1" d="M220,47 C260,47 270,115 295,125"></path>
      <path class="dflow" id="a2" d="M220,207 C260,207 270,150 295,138"></path>
      <path class="dflow idle" id="a3" d="M495,150 C430,150 320,205 225,205"></path>
      <path class="dflow" id="a4" d="M220,207 C300,207 400,207 515,207"></path>
      <path class="dflow" id="a5" d="M520,185 C520,140 520,115 520,80"></path>
      <g><circle class="dot" r="5"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#a1"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3.4s" begin=".5s" repeatCount="indefinite"><mpath href="#a2"></mpath></animateMotion></circle></g>
      <g><circle class="dot2" r="5"><animateMotion dur="4s" begin="1s" repeatCount="indefinite"><mpath href="#a3"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3s" begin="1.4s" repeatCount="indefinite"><mpath href="#a4"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="2.8s" begin="1.9s" repeatCount="indefinite"><mpath href="#a5"></mpath></animateMotion></circle></g>
      <text class="label" x="330" y="95">queries</text>
      <text class="label" x="420" y="125">ALERTS</text>
      <text class="label" x="360" y="200">fired alerts</text>
    </svg>

ⓘPink dots are forward traffic (scrape, push, fire); teal dots are loopback/return (judge calls, ALERTS remote-write). Dashed gray = deliberately idle: the collector’s metrics remote-write is unused because the proxy exports no OTLP metrics (post 4 audit).

## Files & configs

## 7Files & configurations: where everything lives

| File | Role | Key configuration |
| --- | --- | --- |
| `cluster/cluster.env` | Single source of truth for the model + knobs | `MLX_MODEL=mlx-community/Qwen3.5-4B-MLX-8bit`, `MLX_DEFAULT_TEMP=0.0`, `MLX_LOGPROBS=3`, `MLX_LOGPROBS_STREAM_SAMPLE=0.05`, `MLX_LOW_CONFIDENCE=0.5` |
| `cluster/start_server.sh` | Start/stop/status; wires flags + endpoints | Ports `:8081` server, `:8080` proxy, `:9102/9104/9105/9106` agents; `OTLP=192.0.2.64:4318`, `OPIK_OTLP=192.0.2.10:32173/api/v1/private/otel`, `RANK1=203.0.113.2` (Ethernet) |
| `cluster/hosts.json` | Ring hostfile | rank0 `ssh 127.0.0.1` / `ips 203.0.113.1`; rank1 `ssh 203.0.113.2` / `ips 203.0.113.2` |
| `cluster/mlx_metrics_proxy.py` | Public OpenAI API + metrics + spans + scores | 36 metric families; `kind` label (reasoning vs chat); span attrs; 3 in-band feedback scores; flags `--otlp-endpoint`/`--opik-otlp-endpoint`/`--opik-endpoint`/`--logprobs*` |
| `cluster/mlx_hw_telemetry.py` · `mlx_kv_cache_agent.py` · `mlx_server_supervisor.py` · `mlx_server_log_tailer.py` | Hardware / KV / serving / log exporters | Ports `:9102` / `:9104` / `:9105` / `:9106`; log tailer rate-limit 50/s, JSONL attrs |
| `cluster/opik_evaluator.py` | LLM-as-judge feedback loop | judge = proxy `127.0.0.1:8080/v1`; reads/writes `192.0.2.10:32173/api` |
| `observability/compose.yaml` | The observability stack (podman) | victoria-metrics `:8428`, grafana `:3000`, otelcol `:4317/:4318`, vmalert `:8880`, alertmanager `:9093` |
| `observability/vm-scrape.yml` | Scrape targets (generated from `vm-scrape.tmpl.yml` by `setup.sh`) | interval 10s; proxy/hw/kv/supervisor/logtailer targets; rank1 hw at `203.0.113.2:9102` |
| `observability/otelcol-config.yaml` | Collector pipelines | receivers gRPC `:4317`/HTTP `:4318`; logs → JSONL `/var/log/otelcol/mlx-server-logs.jsonl` (50 MB ×5); traces → debug; metrics → VM remote-write (idle) |
| `observability/vmalert/rules.yml` | 46 alert rules / 6 groups | hardware 15, serving 8, inference 7, quality 6, confidence 5, slo 5 |
| `observability/alertmanager/alertmanager.yml` | Notification routing + inhibit | critical → `.../hooks/oncall`, rest → `.../hooks/alert` at `host.containers.internal:9000` |
| `observability/grafana/dashboards/*.json` | 9 provisioned dashboards | datasource `victoria-metrics:8428`; + SRE / HTTP / Call Types / Model (this post) |
| `tools/bench.py` · `tools/bench_load.py` · `tools/bench_agentic.py` · `tools/smoke.py` | Test rigs | all against proxy `:8080/v1`; reports → `tools/bench-reports/` (git-ignored) |
| `tests/test_confidence.py` · `tests/test_proxy_rewrite.py` | Unit/integration tests | run: `.venv/bin/python -m pytest tests/ -q` (40 passing) |
| `tools/opik_dashboards.py` | Opik dashboard provisioning | base `192.0.2.10:32173/api` (needs the `/api` suffix) |

⚠Addresses in this table are the _current_ operational values (rank1 repointed to the Ethernet link after the Wi-Fi split, post 19’s fieldwork). If the LAN changes, `observability/setup.sh` regenerates `vm-scrape.yml`; the proxy endpoint flags live in `start_server.sh`.
