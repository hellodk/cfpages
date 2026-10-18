---
title: "8 — Hydra vs mlx-oc: Two Monitoring Architectures, One Metric Contract"
date: 2026-08-08
description: "mlx-oc scrapes healthy nodes directly; hydra pushes everything through an OTel pipeline. Both track the same Apple Silicon GPU on the same macOS APIs — and both let the metric names silently drift until a dashboard panel goes dead. Here is the side-by-side, the apple-silicon-exporter answer, and the"
tags: [observability, mlx]
cover: "assets/images/covers/hydra-vs-mlx-oc.svg"
draft: false
---

8 of 19 · Architecture comparison

mlx-oc scrapes healthy nodes directly; hydra pushes everything through an OTel pipeline. Both track the same Apple Silicon GPU on the same macOS APIs — and both let the metric names silently drift until a dashboard panel goes dead. Here is the side-by-side, the apple-silicon-exporter answer, and the drift I just fixed in hydra.

<svg viewBox="0 0 760 490" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Side-by-side architecture diagram of hydra (push-first OTLP) and mlx-oc (pull-first scrape) monitoring">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#5b6072"></path>
        </marker>
      </defs>
      <text x="150" y="30" font-size="13" font-weight="800" text-anchor="middle" fill="#0e7490">hydra &middot; push-first (OTLP)</text>
      <text x="575" y="30" font-size="13" font-weight="800" text-anchor="middle" fill="#db2777">mlx-oc &middot; pull-first (scrape)</text>
      <line x1="380" y1="55" x2="380" y2="450" stroke="#e5e7f0" stroke-width="2" stroke-dasharray="4 4"></line>
      <g font-size="11" text-anchor="middle">
        <rect x="60" y="70" width="180" height="36" rx="8" fill="#e0f2fe" stroke="#0e7490"></rect>
        <text x="150" y="92" fill="#1d1f2b">Apple Silicon node</text>
        <rect x="60" y="130" width="180" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="150" y="147" fill="#1d1f2b">apple-silicon-exporter</text>
        <text x="150" y="163" fill="#5b6072" font-size="10">Go &middot; root &middot; :9101</text>
        <rect x="60" y="198" width="180" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="150" y="215" fill="#1d1f2b">OTel agent</text>
        <text x="150" y="231" fill="#5b6072" font-size="10">prometheus/apple_hw</text>
        <rect x="60" y="266" width="180" height="36" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="150" y="288" fill="#1d1f2b">OTel collector :4317</text>
        <rect x="60" y="326" width="180" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="150" y="343" fill="#1d1f2b">VictoriaMetrics :8428</text>
        <text x="150" y="359" fill="#5b6072" font-size="10">cluster=hydra &middot; 90d</text>
        <rect x="60" y="394" width="180" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="150" y="411" fill="#1d1f2b">Grafana + Alertmanager</text>
        <text x="150" y="427" fill="#5b6072" font-size="10">Slack &middot; Loki &middot; Opik</text>
        <rect x="470" y="70" width="210" height="36" rx="8" fill="#fde8f1" stroke="#db2777"></rect>
        <text x="575" y="92" fill="#1d1f2b">Mac mini node</text>
        <rect x="470" y="130" width="210" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="575" y="147" fill="#1d1f2b">mlx_hw_telemetry :9102</text>
        <text x="575" y="163" fill="#5b6072" font-size="10">ioreg &middot; powermetrics &middot; pmset</text>
        <rect x="470" y="198" width="210" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="575" y="215" fill="#1d1f2b">mlx_metrics_proxy :8080</text>
        <text x="575" y="231" fill="#5b6072" font-size="10">llm + quality gauges</text>
        <rect x="470" y="266" width="210" height="36" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="575" y="288" fill="#1d1f2b">mlx_kv_cache_agent :9104</text>
        <rect x="470" y="326" width="210" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="575" y="343" fill="#1d1f2b">VictoriaMetrics</text>
        <text x="575" y="359" fill="#5b6072" font-size="10">192.0.2.64:8428</text>
        <rect x="470" y="394" width="210" height="44" rx="8" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="575" y="411" fill="#1d1f2b">Grafana :3000 &middot; vmalert</text>
        <text x="575" y="427" fill="#5b6072" font-size="10">28 rules</text>
      </g>
      <g stroke="#5b6072" stroke-width="1.5" marker-end="url(#ah)">
        <line x1="250" y1="106" x2="250" y2="128"></line>
        <line x1="250" y1="174" x2="250" y2="196"></line>
        <line x1="250" y1="242" x2="250" y2="264"></line>
        <line x1="250" y1="302" x2="250" y2="324"></line>
        <line x1="250" y1="370" x2="250" y2="392"></line>
        <line x1="690" y1="106" x2="690" y2="128"></line>
        <line x1="690" y1="174" x2="690" y2="196"></line>
        <line x1="690" y1="242" x2="690" y2="264"></line>
        <line x1="690" y1="302" x2="690" y2="324"></line>
        <line x1="690" y1="370" x2="690" y2="392"></line>
      </g>
      <text x="150" y="472" font-size="10.5" text-anchor="middle" fill="#5b6072">root exporter scraped by the agent, pushed OTLP &rarr; VM</text>
      <text x="575" y="472" font-size="10.5" text-anchor="middle" fill="#5b6072">healthy VMs scraped directly by VM</text>
    </svg>

Two pipelines, same job: Apple Silicon hardware into VictoriaMetrics. hydra pushes (OTLP everywhere), mlx-oc pulls (direct scrape).

## 1Two architectures, compared honestly

hydra is the “fleet-first” stack: an OTel agent on every Mac scrapes the local exporters, then remote-writes through a central OTel collector to VictoriaMetrics. Prometheus’s own :9090 only self-scrapes the stack components and remote-writes too. mlx-oc is the opposite: the metrics database itself reaches out to scrape each healthy node’s exporters. Same underlying data sources (IOKit/powermetrics on macOS), opposite plumbing.

| Dimension | hydra | mlx-oc |
| --- | --- | --- |
| Ingestion | Push: OTel agent per node → collector :4317/:4318 → VM :8428 | Pull: VM scrapes node exporters directly via `vm-scrape.tmpl.yml` |
| Hardware exporter | `apple-silicon-exporter` (Go, root, :9101) | `mlx_hw_telemetry.py` (Python, sudo-less, :9102) |
| Metadata | Resource attributes promoted to labels: `node_id`, `pool`, `cluster=hydra` | Static job/instance labels from the scrape config |
| Retention | 90 days | Long-term, self-hosted |
| Alerting | Prometheus :9090 rules + Alertmanager → Slack | vmalert + Alertmanager, 28 rules |
| Logs / tracing | Loki + Opik | Opik on k0s |
| Fleet simulation | Mock exporter fleet :5900–:5950 | None (two real nodes) |

TakeawayPush scales to hundreds of nodes behind NATs and keeps secrets off the scraper; pull is dramatically simpler to operate for two trusted VMs on a LAN. Neither is wrong — hydra optimizes for fleet growth, mlx-oc for set-and-forget.

## 2“Have we used the apple-silicon-exporter?” — yes, it is the hydra production path

The short answer: hydra runs the **Go** `apple-silicon-exporter` in production. It is built and installed by the `hw-exporter` and `otel-mac-agent` Ansible roles into `/usr/local/bin/apple-silicon-exporter`, runs as a launchd daemon (`com.hydra.apple-exporter`) on `127.0.0.1:9101/metrics`, and is scraped by the OTel agent’s `prometheus/apple_hw` receiver, which filters `apple_*` and remote-writes to VictoriaMetrics. A legacy Python exporter survives in `monitoring/mac-mini/apple-gpu-exporter/` as a dev-mode auto-start tool only.

Because the Go exporter needs root and uses native macOS APIs, it sees more than mlx-oc’s sudo-less exporter — most notably `apple_scrape_success{collector="iokit|powermetrics|metal"}`, which turns a dying sub-collector into an alert instead of a mystery. mlx-oc’s exporter trades that depth for zero-credentials operation.

| Metric | hydra (Go exporter) | mlx-oc (Python exporter) |
| --- | --- | --- |
| GPU utilization | `apple_gpu_utilization_percent` | `gpu_utilization` |
| GPU power | `apple_gpu_power_watts` | `gpu_power_watts` |
| GPU temperature | `apple_gpu_temperature_celsius` | `gpu_temp_c` |
| Thermal state | `apple_thermal_pressure` (0–3) | `thermal_pressure_level` |
| Throttling | `apple_thermal_throttle_active` | `thermal_throttle_active` |
| Collector health | `apple_scrape_success{collector=...}` | — |

Same sensors, two name conventions — the exact class of divergence that caused the drift below.

## 3The drift I just fixed in hydra

Auditing hydra’s consumers against the exporter’s actual output surfaced **every** classic way metric names rot:

-   **Dead dashboard panel.** “Power by Component” queried `apple_{cpu,gpu,ane}_power` — missing the `_watts` suffix the exporter emits. Silent dead series in production.
-   **Benchmarks parsing ghosts.** `llm_bench.py` and `run-with-gpu.sh` read the legacy Python exporter’s `apple_gpu_power_milliwatts`/`apple_gpu_active_ratio`, which the Go exporter never emits.
-   **Alerts matching a label that does not exist.** `CriticalThermalPressure`/`SustainedThermalPressure` used `apple_thermal_pressure{level="critical"}`, but the gauge is numeric (0=nominal…3=critical). The alerts could never fire.
-   **Node-down alert keyed to the wrong scrape job.** `up{job="hw-exporter"}` vs the OTel agent’s actual job `apple-silicon-hardware` — also never fire under the mac-agent deployment.
-   **Docs describing a dead API.** Three architecture/plan docs referenced `apple_gpu_temp_c`, `apple_gpu_power_milliwatts`, `apple_gpu_frequency_hz`.
-   **Two exporters, two vocabularies.** The legacy Python exporter emitted milliwatts and active-ratio; production emits watts and percent.

The fixes are one commit (`48bcc2f`): dashboard targets corrected to `apple_*_power_watts` with the `pool` filter, benchmarks and the legacy exporter rewired to the canonical names (watts ×1000 back into the existing `gpu_power_mw` column), both alert files rewritten against the numeric thermal scale, the node-down alert matching either job name, all docs corrected, and the old audit marked SUPERSEDED.

### The one-file fix that prevents round two

The real cure is a pinned contract. hydra now has `monitoring/metric-schema.md`: the canonical `apple_*` metric table (ground truth = the Go exporter), plus a map of every consumer — dashboard, alert file, OTel keep-regex, benchmark, mock fleet. A rename is now a diff against one file instead of a repo-wide grep gamble.

## 4What each stack should steal from the other

### mlx-oc ← hydra

-   `scrape_success{collector=...}`\-style per-source health, not just exporter-up.
-   A metric-schema doc before the next exporter rename.
-   The fleet-simulation mock: two nodes are fine until you need a third.

### hydra ← mlx-oc

-   A sudo-less exporter mode for dev machines where root is a headache.
-   vmalert in place of a self-scraping Prometheus — one less moving part.
-   KV-cache/context visibility as a first-class metric, not a side quest.

LessonThe architecture differences (push vs pull) were always fine. The failures came from _names_, not _plumbing_ — and the fix was a contract, not a config.
