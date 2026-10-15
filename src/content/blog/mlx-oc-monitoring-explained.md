---
title: "MLX-OC — How LLM Monitoring Works"
date: 2026-10-06
description: "A component-by-component trace of how LLM monitoring works in ../mlx-oc: what is measured, which macOS tool or Python library produces each metric, how it travels, and where it lands."
tags: [mlx, observability, monitoring, llm]
draft: false
---

MLX

Component by component: what is measured, which macOS tool or Python library produces it, how it travels, and where it lands.

## 1Data Path

### The One-Sentence Version

Two independent paths carry everything. **Pull**: five Python agents expose `/metrics` and VictoriaMetrics scrapes them every 10 seconds. **Push**: the proxy and the log tailer ship OpenTelemetry over HTTP to a collector, which writes metrics into the same store. Nothing in `cluster/` ever pushes a hardware metric — the hardware exporter is pull-only by design, so those series exist exactly once.

Data Path Overview — Pull & Push Lanes

<svg viewBox="0 0 1080 660" role="img" aria-label="Data path overview showing pull and push lanes">
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#6B7280"></path>
    </marker>
    <marker id="arb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#444CE7"></path>
    </marker>
    <path id="busA" d="M114,193 L956,193"></path>
    <path id="dropA" d="M540,193 L540,220"></path>
    <path id="otlpUp" d="M700,400 L700,296"></path>
    <path id="opikPath" d="M139,486 L139,568 L880,568"></path>
  </defs>
  <text x="24" y="42" font-size="13" font-weight="700" fill="#111827" letter-spacing=".6">Lane A — Pull · Prometheus Scrape · Every 10 s</text>
  <rect x="24" y="90" width="180" height="76" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="114" y="114" font-size="12.5" font-weight="600" fill="#FFFFFF" text-anchor="middle">mlx_metrics_proxy</text>
  <text x="114" y="134" font-size="12" fill="#C7D2FE" text-anchor="middle">:8080</text>
  <text x="114" y="153" font-size="12" fill="#A5B4FC" text-anchor="middle">RED + Quality</text>
  <rect x="232" y="90" width="180" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="322" y="114" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">mlx_hw_telemetry</text>
  <text x="322" y="134" font-size="12" fill="#4B5563" text-anchor="middle">:9102 · Rank 0</text>
  <text x="322" y="153" font-size="12" fill="#4B5563" text-anchor="middle">Power · Thermal</text>
  <rect x="440" y="90" width="180" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="530" y="114" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">mlx_hw_telemetry</text>
  <text x="530" y="134" font-size="12" fill="#4B5563" text-anchor="middle">:9102 · Rank 1</text>
  <text x="530" y="153" font-size="12" fill="#4B5563" text-anchor="middle">Over Thunderbolt</text>
  <rect x="648" y="90" width="180" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="738" y="114" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">mlx_kv_cache_agent</text>
  <text x="738" y="134" font-size="12" fill="#4B5563" text-anchor="middle">:9104</text>
  <text x="738" y="153" font-size="12" fill="#4B5563" text-anchor="middle">Cache · Context</text>
  <rect x="856" y="90" width="200" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="956" y="114" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">mlx_server_supervisor</text>
  <text x="956" y="134" font-size="12" fill="#4B5563" text-anchor="middle">:9105</text>
  <text x="956" y="153" font-size="12" fill="#4B5563" text-anchor="middle">Restart · Crash</text>
  <circle cx="114" cy="128" r="30" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="30;78" dur="2.6s" repeatCount="indefinite"></animate>
    <animate attributeName="opacity" values="0.55;0" dur="2.6s" repeatCount="indefinite"></animate>
  </circle>
  <circle cx="114" cy="128" r="30" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="30;78" dur="2.6s" begin="1.3s" repeatCount="indefinite"></animate>
    <animate attributeName="opacity" values="0.55;0" dur="2.6s" begin="1.3s" repeatCount="indefinite"></animate>
  </circle>
  <line x1="114" y1="166" x2="114" y2="193" stroke="#6B7280" stroke-width="1.6"></line>
  <line x1="322" y1="166" x2="322" y2="193" stroke="#6B7280" stroke-width="1.6"></line>
  <line x1="530" y1="166" x2="530" y2="193" stroke="#6B7280" stroke-width="1.6"></line>
  <line x1="738" y1="166" x2="738" y2="193" stroke="#6B7280" stroke-width="1.6"></line>
  <line x1="956" y1="166" x2="956" y2="193" stroke="#6B7280" stroke-width="1.6"></line>
  <line x1="114" y1="193" x2="956" y2="193" stroke="#6B7280" stroke-width="1.6"></line>
  <line x1="540" y1="193" x2="540" y2="220" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar)"></line>
  <circle r="4" fill="#444CE7"><animateMotion dur="3.4s" repeatCount="indefinite" rotate="auto"><mpath href="#busA"></mpath></animateMotion></circle>
  <circle r="4" fill="#444CE7"><animateMotion dur="3.4s" begin="1.7s" repeatCount="indefinite" rotate="auto"><mpath href="#busA"></mpath></animateMotion></circle>
  <circle r="4" fill="#444CE7"><animateMotion dur="1.1s" repeatCount="indefinite"><mpath href="#dropA"></mpath></animateMotion></circle>
  <text x="556" y="185" font-size="12" fill="#4B5563">/metrics</text>
  <rect x="300" y="220" width="480" height="76" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="540" y="248" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle">VictoriaMetrics · :8428</text>
  <text x="540" y="268" font-size="12" fill="#C7D2FE" text-anchor="middle">Single-Node TSDB · 30-Day Retention · Prometheus API</text>
  <text x="540" y="286" font-size="12" fill="#A5B4FC" text-anchor="middle">vm-scrape.yml — 6 Jobs · 8 Targets</text>
  <circle cx="540" cy="258" r="34" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="34;92" dur="3s" repeatCount="indefinite"></animate>
    <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite"></animate>
  </circle>
  <path d="M780,258 L818,258 L818,212 L856,212" fill="none" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar)" stroke-dasharray="122"></path>
  <path d="M780,258 L818,258 L818,288 L856,288" fill="none" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar)" stroke-dasharray="106"></path>
  <rect x="856" y="180" width="200" height="64" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="956" y="204" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">Grafana · :3000</text>
  <text x="956" y="224" font-size="12" fill="#4B5563" text-anchor="middle">12 Dashboards</text>
  <rect x="856" y="256" width="200" height="64" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="956" y="280" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">vmalert · :8880</text>
  <text x="956" y="300" font-size="12" fill="#4B5563" text-anchor="middle">46 Rules → Alertmanager</text>
  <text x="24" y="382" font-size="13" font-weight="700" fill="#111827" letter-spacing=".6">Lane B — Push · OTLP/HTTP</text>
  <rect x="24" y="410" width="230" height="76" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="139" y="434" font-size="12.5" font-weight="600" fill="#FFFFFF" text-anchor="middle">mlx_metrics_proxy</text>
  <text x="139" y="454" font-size="12" fill="#C7D2FE" text-anchor="middle">Trace Per Request</text>
  <text x="139" y="473" font-size="12" fill="#A5B4FC" text-anchor="middle">Batch Span Processor</text>
  <rect x="282" y="410" width="230" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="397" y="434" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">mlx_server_log_tailer</text>
  <text x="397" y="454" font-size="12" fill="#4B5563" text-anchor="middle">:9106 · Tails server.log</text>
  <text x="397" y="473" font-size="12" fill="#4B5563" text-anchor="middle">Shipped / Dropped Counters</text>
  <line x1="254" y1="448" x2="580" y2="448" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar)"></line>
  <line x1="512" y1="448" x2="580" y2="448" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar)"></line>
  <rect x="580" y="400" width="240" height="96" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="700" y="426" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle">otel-collector</text>
  <text x="700" y="446" font-size="12" fill="#C7D2FE" text-anchor="middle">:4317 gRPC · :4318 HTTP</text>
  <text x="700" y="466" font-size="12" fill="#A5B4FC" text-anchor="middle">One Processor: batch(128, 5 s)</text>
  <text x="700" y="484" font-size="12" fill="#A5B4FC" text-anchor="middle">Runs As UID 0 For File Sink</text>
  <circle cx="700" cy="448" r="30" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="30;80" dur="2.8s" repeatCount="indefinite"></animate>
    <animate attributeName="opacity" values="0.5;0" dur="2.8s" repeatCount="indefinite"></animate>
  </circle>
  <path d="M700,400 L700,296" fill="none" stroke="#444CE7" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#arb)"></path>
  <circle r="4" fill="#444CE7"><animateMotion dur="1.6s" repeatCount="indefinite" rotate="auto"><mpath href="#otlpUp"></mpath></animateMotion></circle>
  <text x="712" y="344" font-size="12" font-weight="600" fill="#3730A3">prometheus_remote_write</text>
  <text x="712" y="362" font-size="12" fill="#4B5563">→ /api/v1/write · Metrics Pipeline</text>
  <line x1="820" y1="448" x2="880" y2="448" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar)"></line>
  <rect x="880" y="410" width="176" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="968" y="434" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">File Exporter</text>
  <text x="968" y="454" font-size="12" fill="#4B5563" text-anchor="middle">mlx-server-logs.jsonl</text>
  <text x="968" y="473" font-size="12" fill="#4B5563" text-anchor="middle">50 MB × 5 Rotations</text>
  <path d="M139,486 L139,568 L880,568" fill="none" stroke="#444CE7" stroke-width="1.6" stroke-dasharray="7 4" marker-end="url(#arb)"></path>
  <circle r="4.5" fill="#444CE7"><animateMotion dur="4s" repeatCount="indefinite" rotate="auto"><mpath href="#opikPath"></mpath></animateMotion></circle>
  <text x="152" y="536" font-size="12" font-weight="600" fill="#3730A3">Second Span Processor — Bypasses The Collector</text>
  <rect x="880" y="530" width="176" height="76" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="968" y="554" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">Opik · :32173</text>
  <text x="968" y="574" font-size="12" fill="#4B5563" text-anchor="middle">Per-Request Traces</text>
  <text x="968" y="593" font-size="12" fill="#4B5563" text-anchor="middle">Plus SDK Trace Path</text>
  <rect x="24" y="604" width="1032" height="28" rx="7" fill="#F3F4F6" stroke="#E5E7EB"></rect>
  <text x="40" y="623" font-size="12" fill="#4B5563">The Traces Pipeline Exits To <tspan font-weight="600">debug</tspan> Only — Nothing Persists Them Here. Opik Is The System Of Record For Traces.</text>
</svg>

### The Eight Components

Two Mac Minis (rank 0 and rank 1, joined by a Thunderbolt ring) plus one management node. Every row below is a real process with a real port.

| Component | Port | Runs On | What It Owns | Transport |
| --- | --- | --- | --- | --- |
| `mlx_metrics_proxy.py` | 8080 | Rank 0 | The OpenAI-compatible front door. Every LLM RED, quality and confidence metric is born here. | Pull *and* Push |
| `mlx_lm.server` | 8081 | Rank 0 (+ ring) | The actual inference engine. Exposes **no** stats endpoint — which is why a log-scraping agent exists. | None |
| `mlx_hw_telemetry.py` | 9102 | Both nodes | GPU/ANE/CPU power, thermals, memory, processes, Thunderbolt counters. Pull-only, deliberately. | Pull |
| `mlx_kv_cache_agent.py` | 9104 | Rank 0 | KV cache occupancy and context budget — parsed out of `server.log` text. | Pull |
| `mlx_server_supervisor.py` | 9105 | Rank 0 | Process truth: alive, ready, model loaded, restarts, crash reason, backoff. | Pull |
| `mlx_server_log_tailer.py` | 9106 | Rank 0 | Tails `server.log`, ships lines as OTLP logs, counts shipped and dropped. | Push |
| `victoria-metrics` | 8428 | Rank 0 | Scrapes everything every 10 s and receives remote_write. Single TSDB, 30-day retention. | — |
| `vmalert` + `alertmanager` | 8880 9093 | Rank 0 | 46 alert rules evaluated against VM; routed, grouped and inhibited, then POSTed to two webhooks. | — |

### Why Two Paths At All

The split is a deliberate design decision, and the proxy's own docstring states it.

### Hardware Is Pull-Only

`mlx_hw_*` series exist **exactly once** in VictoriaMetrics because the hardware exporter has no OTLP exporter at all — `mlx_hw_telemetry.py:17-19` says so directly. If it also pushed, every gauge would be double-written.

### LLM Metrics Are Local

The proxy serves its own `/metrics` on the same port that serves inference (`mlx_metrics_proxy.py:915-921`). One listener, two purposes — scraping costs nothing and keeps the counters exactly where the requests already are.

### Opik Bypasses The Collector

Opik receives traces **directly from the proxy** via a second `BatchSpanProcessor`, not through `otel-collector`. There is no `opik` exporter anywhere in `observability/`.

### Push Toward Nodes Only

Nothing runs on the Macs to be scraped for push purposes. VictoriaMetrics scrapes outward, Opik is called outward, and rank 0 is the only host that needs to reach anything.

## 2Metric Collection

### The Proxy Is The Whole LLM Observability Story

Forty metric families live in one 1732-line file. This is the instrumentation lifecycle of a single chat completion, and which metric families each phase feeds.

Inside The Proxy — One Request, Six Instrumentation Phases

<svg viewBox="0 0 1080 600" role="img" aria-label="Proxy request lifecycle and the metric families each phase emits">
  <defs>
    <marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#6B7280"></path>
    </marker>
  </defs>
  <text x="30" y="40" font-size="13" font-weight="700" fill="#111827" letter-spacing=".6">Request Lifecycle</text>
  <text x="430" y="40" font-size="13" font-weight="700" fill="#111827" letter-spacing=".6">Metric Families Emitted</text>
  <rect x="30" y="56" width="260" height="56" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="46" y="80" font-size="12.5" font-weight="600" fill="#111827">1 · Request Arrives</text>
  <text x="46" y="99" font-size="12" fill="#4B5563">POST /v1/chat/completions · In-Flight++</text>
  <rect x="30" y="140" width="260" height="56" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="46" y="164" font-size="12.5" font-weight="600" fill="#111827">2 · Guardrails &amp; Rejects</text>
  <text x="46" y="183" font-size="12" fill="#4B5563">Model Match · 12k Prompt Cap · Rate Limit</text>
  <rect x="30" y="224" width="260" height="56" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="46" y="248" font-size="12.5" font-weight="600" fill="#111827">3 · Logprobs Acquisition</text>
  <text x="46" y="267" font-size="12" fill="#4B5563">Client · Injected · 5% Destreamed</text>
  <rect x="30" y="308" width="260" height="56" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="46" y="332" font-size="12.5" font-weight="600" fill="#FFFFFF">4 · Forward To Upstream</text>
  <text x="46" y="351" font-size="12" fill="#A5B4FC">:8081 · Queue-Wait Clock Starts</text>
  <rect x="30" y="392" width="260" height="56" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="46" y="416" font-size="12.5" font-weight="600" fill="#111827">5 · Parse The Response</text>
  <text x="46" y="435" font-size="12" fill="#4B5563">Usage · Finish Reason · Tool Calls</text>
  <rect x="30" y="476" width="260" height="56" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="46" y="500" font-size="12.5" font-weight="600" fill="#111827">6 · Score &amp; Emit</text>
  <text x="46" y="519" font-size="12" fill="#4B5563">Heuristics · Confidence · OTLP Span</text>
  <line x1="160" y1="112" x2="160" y2="140" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="160" y1="196" x2="160" y2="224" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="160" y1="280" x2="160" y2="308" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="160" y1="364" x2="160" y2="392" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="160" y1="448" x2="160" y2="476" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="290" y1="84"  x2="430" y2="84"  stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="290" y1="168" x2="430" y2="168" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <rect x="430" y="56" width="626" height="156" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <rect x="430" y="56" width="5" height="156" rx="2.5" fill="#444CE7"></rect>
  <text x="452" y="80" font-size="12.5" font-weight="650" fill="#111827">Admission &amp; Traffic — <tspan fill="#4B5563" font-weight="400">Counters, Histograms, Gauges</tspan></text>
  <text x="452" y="104" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_in_flight</tspan> — Queue-Depth Gauge, Incremented On Arrival</text>
  <text x="452" y="124" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_error_total{model,status,kind}</tspan> — 400 Mismatch, 413 Body, 429 Rate Limit</text>
  <text x="452" y="144" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_queue_wait_seconds</tspan> — Histogram, Arrival To Connection Send</text>
  <text x="452" y="164" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_requests_total{model,streaming,kind}</tspan> — Chat vs Reasoning</text>
  <text x="452" y="184" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_up</tspan> — 15 s Background Thread Polls /v1/models</text>
  <text x="452" y="202" font-size="12" fill="#B91C1C" font-weight="600">/v1/models Polls Excluded — They Would Poison Latency</text>
  <line x1="290" y1="252" x2="430" y2="252" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="290" y1="336" x2="430" y2="336" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <rect x="430" y="232" width="626" height="156" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <rect x="430" y="232" width="5" height="156" rx="2.5" fill="#16A34A"></rect>
  <text x="452" y="256" font-size="12.5" font-weight="650" fill="#111827">Generation — The RED Signal</text>
  <text x="452" y="280" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_ttft_seconds</tspan> — Time To First Token · 11 Buckets 10 ms→60 s</text>
  <text x="452" y="300" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_generation_seconds</tspan> — Total Wall Time Per Request</text>
  <text x="452" y="320" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_token_rate_tokens_per_second</tspan> — Completion Tokens ÷ Seconds</text>
  <text x="452" y="340" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_tokens_prompt_total</tspan> / <tspan font-family="ui-monospace,Menlo,monospace">mlx_tokens_completion_total</tspan></text>
  <text x="452" y="360" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_prompt_cached_tokens_total</tspan> + <tspan font-family="ui-monospace,Menlo,monospace">mlx_prompt_cache_ratio</tspan></text>
  <text x="452" y="378" font-size="12" fill="#4B5563">Usage Absent? Falls Back To A Word-Count Estimate. TTFT Skipped, Never Faked.</text>
  <line x1="290" y1="420" x2="430" y2="420" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <line x1="290" y1="504" x2="430" y2="504" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar2)"></line>
  <rect x="430" y="408" width="626" height="156" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <rect x="430" y="408" width="5" height="156" rx="2.5" fill="#D97706"></rect>
  <text x="452" y="432" font-size="12.5" font-weight="650" fill="#111827">Output Quality — The Differentiator</text>
  <text x="452" y="456" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_hallucination_risk</tspan> — 0.5·repetition + 0.25·refusal + 0.4·hedging + 0.7·ungrounded</text>
  <text x="452" y="476" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_heuristic_repetition / _refusal / _hedging / _ungrounded</tspan></text>
  <text x="452" y="496" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_output_perplexity</tspan> · <tspan font-family="ui-monospace,Menlo,monospace">mlx_token_entropy_nats</tspan> · <tspan font-family="ui-monospace,Menlo,monospace">mlx_token_margin_mean</tspan></text>
  <text x="452" y="516" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_token_confidence_{mean,min,std}</tspan> · <tspan font-family="ui-monospace,Menlo,monospace">mlx_low_confidence_token_ratio</tspan></text>
  <text x="452" y="536" font-size="12" fill="#4B5563"><tspan font-family="ui-monospace,Menlo,monospace">mlx_finish_reason_total{model,reason,kind}</tspan> — Truncation Signal</text>
  <text x="452" y="554" font-size="12" fill="#4B5563">Confidence Stays Separate From Composite Risk — Mixing Makes One Gauge Mean Two Things.</text>
</svg>

### How Logprobs Are Obtained — Three Sources

The confidence metrics only exist if the proxy can get logprobs out of the inference engine. `mlx_lm.server` returns logprobs only for non-streaming responses, so the proxy manufactures a scored path three different ways and records which one was used in `mlx_confidence_scored_total{source}`.

### Client

The caller asked for `logprobs` itself. Cheapest path — the proxy just reads what came back and passes it through.

### Injected

A non-streaming request that did _not_ ask. The proxy adds `logprobs: 3` (`MLX_LOGPROBS`), scores it, then **strips it back out** so the client never sees it.

### Destreamed

A **streaming** request, re-run non-streamed so it can be scored. Costs one extra generation and the client gets its whole answer at once. Sampled at `MLX_LOGPROBS_STREAM_SAMPLE` (default 0.05).

**Cost you should know about:** destreaming doubles the work for the sampled fraction of streaming traffic. `MLXConfidenceScoringStopped` exists specifically to tell you when this pipeline silently dies — and its own description notes that "the confidence alerts above are blind until this clears."

### Hardware Collection — Ten Commands, Two Cadences

The hardware exporter is a plain `prometheus_client` registry behind a `ThreadingHTTPServer`. Two sampling threads run at different speeds because `powermetrics` is a ~1 second blocking call. Ten distinct commands are shelled out, across nine boxes below — `ifconfig` also runs, to auto-detect which interface carries the ring.

mlx\_hw\_telemetry.py — Command → Cadence → Exported Series

<svg viewBox="0 0 1080 580" role="img" aria-label="Hardware telemetry command to cadence to exported series">
  <defs>
    <marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#6B7280"></path>
    </marker>
  </defs>
  <text x="24" y="40" font-size="12.5" font-weight="700" fill="#111827" letter-spacing=".6">Source Commands</text>
  <text x="380" y="40" font-size="12.5" font-weight="700" fill="#111827" letter-spacing=".6">Sampling Cadence</text>
  <text x="660" y="40" font-size="12.5" font-weight="700" fill="#111827" letter-spacing=".6">Exported Series</text>
  <rect x="24" y="64" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="83" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">sysctl -n kern.boottime</text>
  <text x="38" y="99" font-size="12" fill="#15803D" font-weight="600">No Sudo</text>
  <rect x="24" y="118" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="137" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">vm_stat</text>
  <text x="38" y="153" font-size="12" fill="#15803D" font-weight="600">No Sudo</text>
  <rect x="24" y="172" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="191" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">pmset -g therm</text>
  <text x="38" y="207" font-size="12" fill="#15803D" font-weight="600">No Sudo</text>
  <rect x="24" y="226" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="245" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">ps -axo pid=,pcpu=,rss=,command=</text>
  <text x="38" y="261" font-size="12" fill="#15803D" font-weight="600">No Sudo</text>
  <rect x="24" y="280" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="299" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">podman stats --no-stream</text>
  <text x="38" y="315" font-size="12" fill="#15803D" font-weight="600">No Sudo · Rootless</text>
  <rect x="24" y="334" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="353" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">netstat -ib -I &lt;iface&gt;</text>
  <text x="38" y="369" font-size="12" fill="#15803D" font-weight="600">No Sudo · Thunderbolt Ring</text>
  <rect x="24" y="388" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.4"></rect>
  <text x="38" y="407" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">sudo -n powermetrics --samplers smc</text>
  <text x="38" y="423" font-size="12" fill="#B91C1C" font-weight="600">Requires Passwordless Sudo</text>
  <rect x="24" y="442" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#DC2626" stroke-width="1.4"></rect>
  <text x="38" y="461" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">sudo -n powermetrics cpu_power,gpu_power</text>
  <text x="38" y="477" font-size="12" fill="#B91C1C" font-weight="600">Requires Passwordless Sudo</text>
  <rect x="24" y="496" width="300" height="44" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.4"></rect>
  <text x="38" y="515" font-size="12" font-family="ui-monospace,Menlo,monospace" fill="#111827">ioreg -c IOAccelerator -r -d 2</text>
  <text x="38" y="531" font-size="12" fill="#15803D" font-weight="600">No Sudo</text>
  <rect x="380" y="64" width="220" height="310" rx="10" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="490" y="112" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle">5 s Sample Loop</text>
  <text x="490" y="136" font-size="12" fill="#A5B4FC" text-anchor="middle">--interval Flag, Floor 1.0 s</text>
  <text x="490" y="172" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_up</text>
  <text x="490" y="192" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_uptime_seconds</text>
  <text x="490" y="212" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_load1 / load5 / load15</text>
  <text x="490" y="232" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_cpu_temp_celsius</text>
  <text x="490" y="252" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_mem_pressure</text>
  <text x="490" y="272" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_thermal_pressure</text>
  <text x="490" y="292" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_proc_cpu_percent · rss_bytes</text>
  <text x="490" y="312" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_net_{rx,tx}_*_total</text>
  <text x="490" y="348" font-size="12" fill="#A5B4FC" text-anchor="middle">Plus Disk, CPU Count, GPU Memory</text>
  <rect x="380" y="394" width="220" height="146" rx="10" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="490" y="428" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle">15 s GPU Sampler</text>
  <text x="490" y="450" font-size="12" fill="#A5B4FC" text-anchor="middle">Hard-Coded, No Flag</text>
  <text x="490" y="482" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_gpu_utilization_percent</text>
  <text x="490" y="502" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_gpu_frequency_mhz</text>
  <text x="490" y="522" font-size="12" fill="#C7D2FE" text-anchor="middle">mlx_hw_{cpu,gpu,ane,package}_power</text>
  <line x1="324" y1="86"  x2="380" y2="86"  stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="140" x2="380" y2="140" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="194" x2="380" y2="194" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="248" x2="380" y2="248" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="302" x2="380" y2="302" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="356" x2="380" y2="356" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="410" x2="380" y2="410" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="464" x2="380" y2="464" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="324" y1="518" x2="380" y2="518" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ar3)"></line>
  <line x1="600" y1="219" x2="660" y2="219" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar3)"></line>
  <line x1="600" y1="467" x2="660" y2="467" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar3)"></line>
  <rect x="660" y="64" width="190" height="476" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="676" y="92" font-size="12.5" font-weight="650" fill="#111827">31 Metric Families</text>
  <text x="676" y="114" font-size="12" fill="#4B5563">All <tspan font-family="ui-monospace,Menlo,monospace">Gauge</tspan> or <tspan font-family="ui-monospace,Menlo,monospace">Counter</tspan></text>
  <text x="676" y="132" font-size="12" fill="#4B5563">All Labelled <tspan font-family="ui-monospace,Menlo,monospace">node</tspan></text>
  <text x="676" y="150" font-size="12" fill="#4B5563">No Histograms Here</text>
  <text x="676" y="186" font-size="12" font-weight="600" fill="#111827">Power &amp; GPU Load</text>
  <text x="676" y="206" font-size="12" fill="#4B5563">cpu · gpu · ane</text>
  <text x="676" y="222" font-size="12" fill="#4B5563">package (sum)</text>
  <text x="676" y="238" font-size="12" fill="#4B5563">gpu_util · IOKit</text>
  <text x="676" y="252" font-size="12" font-weight="600" fill="#111827">Thermal</text>
  <text x="676" y="272" font-size="12" fill="#4B5563">cpu_temp_celsius</text>
  <text x="676" y="288" font-size="12" fill="#4B5563">thermal_pressure</text>
  <text x="676" y="318" font-size="12" font-weight="600" fill="#111827">Memory</text>
  <text x="676" y="338" font-size="12" fill="#4B5563">host used / total</text>
  <text x="676" y="354" font-size="12" fill="#4B5563">gpu used / alloc / total</text>
  <text x="676" y="400" font-size="12" font-weight="600" fill="#111827">Ring Interconnect</text>
  <text x="676" y="420" font-size="12" fill="#4B5563">4 Counters, iface=auto</text>
  <text x="676" y="436" font-size="12" fill="#4B5563">192.0.2.220/24</text>
  <text x="676" y="466" font-size="12" font-weight="600" fill="#111827">Processes</text>
  <text x="676" y="486" font-size="12" fill="#4B5563">5 host components</text>
  <text x="676" y="502" font-size="12" fill="#4B5563">5 podman containers</text>
  <text x="676" y="528" font-size="12" fill="#4B5563">First Sample Stores A</text>
  <text x="676" y="544" font-size="12" fill="#4B5563">Baseline Only — No Fake Jump</text>
  <line x1="850" y1="302" x2="890" y2="302" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar3)"></line>
  <rect x="890" y="64" width="166" height="476" rx="10" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="973" y="100" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle">:9102 /metrics</text>
  <text x="973" y="124" font-size="12" fill="#A5B4FC" text-anchor="middle">ThreadingHTTPServer</text>
  <text x="973" y="142" font-size="12" fill="#A5B4FC" text-anchor="middle">generate_latest()</text>
  <text x="973" y="178" font-size="12" fill="#C7D2FE" text-anchor="middle">Binds 0.0.0.0</text>
  <text x="973" y="198" font-size="12" fill="#C7D2FE" text-anchor="middle">Rank 0: Local</text>
  <text x="973" y="218" font-size="12" fill="#C7D2FE" text-anchor="middle">Rank 1: Over SSH</text>
  <text x="973" y="256" font-size="12" fill="#C7D2FE" text-anchor="middle">Scraped Every 10 s</text>
  <text x="973" y="276" font-size="12" fill="#C7D2FE" text-anchor="middle">By VictoriaMetrics</text>
  <text x="973" y="312" font-size="12" fill="#FCA5A5" text-anchor="middle">No OTLP Exporter —</text>
  <text x="973" y="330" font-size="12" fill="#FCA5A5" text-anchor="middle">Pull-Only By Design</text>
  <text x="973" y="368" font-size="12" fill="#C7D2FE" text-anchor="middle">Py3.14 venv On Rank 0</text>
  <text x="973" y="388" font-size="12" fill="#C7D2FE" text-anchor="middle">Py3.12 venv On Rank 1</text>
  <text x="973" y="406" font-size="12" fill="#C7D2FE" text-anchor="middle">For TCC Local-Network</text>
  <circle cx="973" cy="140" r="26" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0">
    <animate attributeName="r" values="26;70" dur="2.4s" repeatCount="indefinite"></animate>
    <animate attributeName="opacity" values="0.5;0" dur="2.4s" repeatCount="indefinite"></animate>
  </circle>
</svg>

**Passwordless sudo is not optional here.** Two `powermetrics` invocations drive **7** of the 31 hardware gauges — CPU temperature (`--samplers smc`) plus GPU utilization, GPU frequency, and CPU/GPU/ANE/package power (`--samplers cpu_power,gpu_power`). Without `sudo -n` working they all degrade to `NaN`, and every power and throttling alert goes blind. The `-n` flag makes them fail fast rather than hang.

### The Odd One Out — KV Cache By Log Parsing

`mlx_lm.server` has no stats endpoint, so `mlx_kv_cache_agent.py` reads the server's own log file. It seeks to the last 1,000,000 bytes, discards the partial first line, and regex-matches the cache banner.

KV

Prompt Cache: 4 sequences, 0.03 GB

Two regexes recover cache state — one for the total, one for the per-role breakdown (`assistant` / `user` / `system`). GB is multiplied by 1e9 to get bytes. Only the fixed four role gauges are published; anything else is zeroed.

cluster/mlx\_kv\_cache\_agent.py:46-47, 73-96

### Utilization Is Derived, Not Reported

`mlx_kv_cache_utilization` is computed as `total_bytes / (10 × kv_bytes_for_max_context)`. The `10` is a hard-coded literal matching the server's `--prompt-cache-size 4` and LRUPromptCache default — it is not read from config.

### A Metric Name Lives In Two Places

`mlx_context_length_max_tokens` and `mlx_kv_bytes_per_token` are exported by _both_ the proxy (labelled `model`) and the KV agent (unlabelled). Two series sets, one name. Grafana papers over it with `max(...)`.

## 3Transport & Storage

### The Collector — One Receiver, One Processor, Three Pipelines

`otel-collector-config.yaml` is only 49 lines. Everything flows through a single `batch` processor, then fans out to three exporters depending on signal type.

otelcol-config.yaml — Pipeline Graph

<svg viewBox="0 0 1080 420" role="img" aria-label="OTel collector pipeline graph">
  <defs>
    <marker id="ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="#6B7280"></path>
    </marker>
  </defs>
  <rect x="24" y="80" width="200" height="120" rx="10" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="124" y="112" font-size="13" font-weight="600" fill="#FFFFFF" text-anchor="middle">otlp Receiver</text>
  <text x="124" y="136" font-size="12" fill="#C7D2FE" text-anchor="middle">:4317 gRPC</text>
  <text x="124" y="156" font-size="12" fill="#C7D2FE" text-anchor="middle">:4318 HTTP</text>
  <text x="124" y="182" font-size="12" fill="#A5B4FC" text-anchor="middle">The Only Receiver</text>
  <rect x="300" y="80" width="170" height="120" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="385" y="118" font-size="13" font-weight="600" fill="#111827" text-anchor="middle">batch</text>
  <text x="385" y="142" font-size="12" fill="#4B5563" text-anchor="middle">size 128</text>
  <text x="385" y="162" font-size="12" fill="#4B5563" text-anchor="middle">timeout 5 s</text>
  <text x="385" y="186" font-size="12" fill="#B91C1C" text-anchor="middle">Only Processor</text>
  <line x1="224" y1="140" x2="300" y2="140" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)"></line>
  <text x="560" y="52" font-size="12.5" font-weight="700" fill="#111827" letter-spacing=".6">Three Pipelines, Three Destinations</text>
  <rect x="560" y="68" width="180" height="60" rx="9" fill="#FFFFFF" stroke="#16A34A" stroke-width="1.5"></rect>
  <text x="650" y="94" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">metrics</text>
  <text x="650" y="114" font-size="12" fill="#4B5563" text-anchor="middle">Stored</text>
  <rect x="560" y="156" width="180" height="60" rx="9" fill="#FFFFFF" stroke="#D97706" stroke-width="1.5"></rect>
  <text x="650" y="182" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">traces</text>
  <text x="650" y="202" font-size="12" fill="#4B5563" text-anchor="middle">Discarded</text>
  <rect x="560" y="244" width="180" height="60" rx="9" fill="#FFFFFF" stroke="#444CE7" stroke-width="1.5"></rect>
  <text x="650" y="270" font-size="12.5" font-weight="600" fill="#111827" text-anchor="middle">logs</text>
  <text x="650" y="290" font-size="12" fill="#4B5563" text-anchor="middle">Written To Disk</text>
  <path d="M470,140 L515,140 L515,98 L560,98" fill="none" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)" stroke-dasharray="105"></path>
  <path d="M470,140 L515,140 L515,186 L560,186" fill="none" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)" stroke-dasharray="105"></path>
  <path d="M470,140 L515,140 L515,274 L560,274" fill="none" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)" stroke-dasharray="135"></path>
  <line x1="740" y1="98"  x2="800" y2="98"  stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)"></line>
  <line x1="740" y1="186" x2="800" y2="186" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)"></line>
  <line x1="740" y1="274" x2="800" y2="274" stroke="#6B7280" stroke-width="1.6" marker-end="url(#ar4)"></line>
  <rect x="800" y="68" width="256" height="60" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="928" y="92" font-size="12" font-weight="600" fill="#111827" text-anchor="middle">prometheus_remote_write</text>
  <text x="928" y="112" font-size="12" fill="#4B5563" text-anchor="middle">VictoriaMetrics /api/v1/write</text>
  <rect x="800" y="156" width="256" height="60" rx="9" fill="#FFFFFF" stroke="#FECACA" stroke-width="1.5"></rect>
  <text x="928" y="180" font-size="12" font-weight="600" fill="#B91C1C" text-anchor="middle">debug Exporter</text>
  <text x="928" y="200" font-size="12" fill="#4B5563" text-anchor="middle">stdout Only — Nowhere To Query</text>
  <rect x="800" y="244" width="256" height="60" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
  <text x="928" y="268" font-size="12" font-weight="600" fill="#111827" text-anchor="middle">file Exporter</text>
  <text x="928" y="288" font-size="12" fill="#4B5563" text-anchor="middle">mlx-server-logs.jsonl · 50 MB × 5</text>
  <rect x="24" y="336" width="1032" height="60" rx="9" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
  <text x="40" y="360" font-size="12.5" font-weight="650" fill="#7F1D1D">No <tspan font-family="ui-monospace,Menlo,monospace">memory_limiter</tspan>, no <tspan font-family="ui-monospace,Menlo,monospace">k8sattributes</tspan>, no <tspan font-family="ui-monospace,Menlo,monospace">tailsampling</tspan>, no self-telemetry block.</text>
  <text x="40" y="380" font-size="12" fill="#7F1D1D">The JSONL log sink is written but has <tspan font-weight="650">no reader</tspan> in this stack — no Loki, no file datasource. All 12 dashboards query VictoriaMetrics only.</text>
</svg>

### Every Scrape Job

Generated by `setup.sh` from `vm-scrape.tmpl.yml` via `sed` — two placeholders, `__MLX_IP__` and `__RANK1_IP__`. The output `vm-scrape.yml` is gitignored.

| Job | Targets | Interval | Static Labels | Measures |
| --- | --- | --- | --- | --- |
| `mlx-proxy` | `<MLX_IP>:8080` | 10 s | service=mlx-proxy, node=rank0 | Requests, tokens, TTFT, generation time, token rate, finish reason, tool calls, cache ratio, hallucination risk, confidence |
| `mlx-hw` | `<MLX_IP>:9102` and `<RANK1_IP>:9102` | 10 s | service=mlx-hw, node=rank0 / rank1 | Power, thermals, GPU utilization and frequency, memory, processes, Thunderbolt ring counters |
| `mlx-kv` | `<MLX_IP>:9104` | 10 s | service=mlx-kv, node=rank0 | KV cache sequences and bytes by role, cache utilization, context budget |
| `mlx-supervisor` | `<MLX_IP>:9105` | 10 s | service=mlx-supervisor, node=rank0 | Server state, up, ready, model loaded, restarts, crash reason, backoff, health-check outcomes |
| `mlx-logtailer` | `<MLX_IP>:9106` | 10 s | service=mlx-logtailer, node=rank0 | Tailer health, lines read, shipped, dropped by reason, file offset, queue depth |
| `sglang` | `<MLX_IP>:30000`, `<RANK1_IP>:30000` | **15 s** | service=sglang, node=rank0 / rank1, provider=sglang | Experimental second inference backend. Marked unverified in the config header — no ring or tensor-parallel backend on Apple Silicon. |

### Alert Routing

vmalert evaluates 46 rules against VictoriaMetrics and POSTs to Alertmanager. The root route groups by `alertname, node, model`, waits 30 s, repeats every 4 h, and splits on severity.

### Two Receivers, Both Webhooks

`critical` → `oncall` receiver. Everything else → `default`. Both POST to `host.containers.internal:9000` with `send_resolved: true`. **No email, no Slack, no PagerDuty.**

### Two Inhibition Rules

`MLXProxyDown` suppresses `MLXUpstreamDown`, `MLXThroughputDrop` and `MLXInferenceStalled`. Any hardware-exporter-down silences GPU, thermal and load alerts on the same `node`. Noise control, by design.

### The 12 Dashboards

Provisioned from `observability/grafana/dashboards/` into folder `MLX Cluster`, re-read every 10 seconds, all with a 5-minute auto-refresh. All query VictoriaMetrics — there is no log-content datasource.

| Dashboard | Panels | Focus |
| --- | --- | --- |
| `mlx-cluster` | 45 | The overview — nodes online, req/min, tokens/min, avg tok/s, TTFT p95, plus per-node hardware |
| `mlx-performance` | 38 | KV cache, throughput, hallucination risk, truncation gauge, and the largest token-confidence section |
| `mlx-model-internals` | 43 | Linear-attention internals, weight footprint, ring interconnect counters, shard counts |
| `mlx-node` | 33 | Per-Mac hardware gauges + GPU utilization heatmap + that node's LLM traffic |
| `mlx-http` | 33 | Request traffic, queue depth, errors, TTFT percentiles, cache hit ratio, entropy and risk heatmaps |
| `mlx-alerts` | 29 | Firing alerts by severity, flapping, supervisor truth, log-tailer health |
| `mlx-model` | 23 | Static architecture from `config.json` — layers, heads, dims, quantization, context sizing |
| `mlx-call-types` | 17 | Reasoning vs chat, stream vs sync, tool calls and risk broken down by call kind |
| `mlx-gpu-power` | 15 | GPU utilization heatmap, IOKit util, frequency, memory, CPU/GPU/ANE/package watts, thermal pressure |
| `mlx-tools` | 14 | Tool-call usage over 30 d / 7 d / 24 h, calls per minute by tool and type |
| `mlx-logs` | 12 | Metrics *about* the log pipeline — lines/min, shipped, dropped, queue depth. Not log content. |
| `mlx-sre` | 18 | The two SLOs as gauges, remaining error budget, burn-rate panels |

## 4Alerts & Gaps

### 46 Alerts In 6 Groups

Thirteen critical, twenty-four warning, nine info — every rule carries `team: ml-platform`. The two groups in the middle are what make this LLM monitoring rather than generic infrastructure monitoring.

### mlx-hardware  15 Rules · 30 s

`MLXGPUHighUtilization` · `MLXGPUMemoryPressure` crit · `MLXHighPackagePower` · `MLXPowerSpike` · `MLXThermalThrottling` · `MLXCriticalThermalPressure` crit · `MLXMemoryPressureHigh` · `MLXLoadHigh` · `MLXDiskNearlyFull` · `MLXHardwareExporterDown` crit · `MLXProxyDown` crit · `MLXUpstreamDown` crit

### mlx-serving  8 Rules · 15 s

`MLXServerDown` crit · `MLXModelNotLoaded` · `MLXServerCrashLoop` crit · `MLXServerRepeatedCrashes` crit · `MLXServerReadyProbeFailing` · `MLXServerMetalFault` crit · `MLXLogTailerDown` · `MLXLogTailerNotSending`

### mlx-inference  7 Rules · 15 s

`MLXHighErrorRate` · `MLXErrorSpike` · `MLXHighTTFTP95` (>5 s) · `MLXSlowGenerationP95` (>30 s) · `MLXInferenceStalled` crit · `MLXInFlightBacklog` (>8) · `MLXThroughputDrop`

### mlx-quality  6 Rules · 30 s

**Text heuristics.** `MLXHallucinationRiskCritical` (>0.8) crit · `MLXHallucinationRiskElevated` (>0.5) · `MLXHighRepetition` · `MLXHighHedging` · `MLXHighUngrounded` · `MLXHighRefusalRate`. All gated on real traffic.

### mlx-confidence  5 Rules · 30 s

**Sampler logprobs — leads the text heuristics.** `MLXConfidenceCollapse` (margin <0.15) crit — the rule annotation blames "a corrupt or mis-quantised weight load, not hard prompts." · `MLXHighPerplexity` · `MLXHighTokenEntropy` · `MLXLowTokenConfidence` · `MLXConfidenceScoringStopped`

### mlx-slo  5 Rules · 30 s

**Error-budget burn.** Availability 99.5 % / 30 d and latency p95 TTFT ≤ 10 s. Fast burn 14.4× critical, slow burn 3× warning, over 1 h and 6 h windows. Plus `MLXErrorBudgetExhausted`. All gated on traffic > 0 so an idle cluster never pages.

### Verified Gaps

These came out of reading the configs against what the code actually emits. Each is a factual mismatch between documentation, config and implementation.

**Three alerts can never fire.** `MLXVictoriaMetricsDown`, `MLXVmalertDown` and `MLXAlertmanagerDown` match on `up{job="victoria-metrics"|"vmalert"|"alertmanager"}` — but no scrape job by those names exists in `vm-scrape.tmpl.yml`. `README.md:208-212` documents a self-scrape the template never implements. **Self-monitoring is described but absent.**

**Truncation has a metric and a dashboard panel, but no alert.** `mlx_finish_reason_total{reason="length"}` is charted on `mlx-performance.json` as "Truncated completions (5m)". Zero of the 46 rules reference `finish_reason`. For an agentic or coding workload — where truncation cuts off a half-written thought — this is the most consequential missing alert in the set.

**Traces are not persisted by this stack.** The `traces` pipeline exits to the `debug` exporter only. Opik, reached directly from the proxy, is the system of record. If you query this stack for a trace you will find nothing.

**All five images are `:latest`.** `victoria-metrics`, `opentelemetry-collector-contrib`, `grafana`, `vmalert`, `alertmanager`. There are also no memory or CPU limits anywhere in the 93-line compose file — for a TSDB holding 30 days of data.

**The Grafana datasource has no explicit `uid`.** The provisioning file declares `name: VictoriaMetrics` but no uid, while all 12 dashboards reference `VictoriaMetrics` — and two reference lowercase `victoriametrics`. If panels ever render empty, this is why. The k8s path sidesteps it: `apply-dashboards.sh` rewrites every uid to `mlx-vm` at apply time.

**One unit trap worth knowing.** `mlx_hw_mem_pressure` is a raw free _page count_, not bytes and not a 0–1 ratio — despite its help string. `MLXMemoryPressureHigh` correctly alerts on it as `< 20000` pages. Multiply by 4096 for bytes.

### Boot Order

`cluster/start_server.sh` starts telemetry **before** confirming the server is ready, so hardware metrics flow while the model is still loading.

1.  **Preflight** — verifies both venvs, the `prometheus_client` import, and passwordless SSH to rank 1. Warns (does not fail) if any of 8081, 8080, 9102, 9104, 9105 or 9106 is still bound.
2.  **Supervisor → mlx.launch → mlx\_lm.server** on `:8081`, ring backend via `--hostfile hosts.json`, health probe on `/v1/models`, 5 s interval, exponential backoff 3–30 s.
3.  **Proxy** on `:8080` with OTLP and Opik endpoints wired in from `cluster.env`.
4.  **Hardware exporter** on `:9102` — locally for rank 0, and over `ssh` for rank 1, deliberately in the py3.12 venv to dodge macOS Local-Network TCC blocking.
5.  **KV agent** on `:9104`, coupled to the server purely by pointing at the same log path the supervisor was told to write.
6.  **Log tailer** on `:9106`, then wait for `/v1/models` (180 s TTL) before declaring ready.
