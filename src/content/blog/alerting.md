---
title: "2 — 28 Alert Rules and the Full Loop to Alertmanager"
date: 2026-08-08
description: "VictoriaMetrics on its own just stores numbers. Adding vmalert for evaluation and Alertmanager for routing turns a 92% full disk into a firing alert that actually reaches a webhook — with inhibit rules stopping the cascade when a whole node dies."
tags: [observability, prometheus]
cover: "assets/images/covers/alerting.svg"
draft: false
---

2 of 19 · vmalert + Alertmanager

VictoriaMetrics on its own just stores numbers. Adding `vmalert` for evaluation and `Alertmanager` for routing turns a 92% full disk into a firing alert that actually reaches a webhook — with inhibit rules stopping the cascade when a whole node dies.

<svg viewBox="0 0 760 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Alert pipeline with an animated alert traveling to alertmanager">
      <defs>
        <linearGradient id="a1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d9f3ec"></stop><stop offset="1" stop-color="#b2ece0"></stop>
        </linearGradient>
        <linearGradient id="a2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe9f0"></stop><stop offset="1" stop-color="#ffd6e5"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(24,30)">
        <rect width="170" height="120" rx="14" fill="url(#a1)" opacity=".7"></rect>
        <rect x="12" y="12" width="146" height="30" rx="10" fill="#fff" opacity=".9"></rect>
        <text x="85" y="32" text-anchor="middle" font-size="12.5" font-weight="800" fill="#0f766e">VictoriaMetrics</text>
        <text x="85" y="66" text-anchor="middle" font-size="11" fill="#134e4a">series land every 15s</text>
        <rect x="22" y="82" width="126" height="24" rx="12" fill="#fff" opacity=".9"></rect>
        <text x="85" y="98" text-anchor="middle" font-size="10.5" font-weight="700" fill="#0f766e">mlx_hw_disk_used</text>
      </g>
      <g transform="translate(295,30)">
        <rect width="170" height="120" rx="14" fill="url(#a2)" opacity=".7"></rect>
        <rect x="12" y="12" width="146" height="30" rx="10" fill="#fff" opacity=".9"></rect>
        <text x="85" y="32" text-anchor="middle" font-size="12.5" font-weight="800" fill="#be185d">vmalert</text>
        <text x="85" y="60" text-anchor="middle" font-size="10.5" fill="#831843">evaluates rules.yml</text>
        <rect x="22" y="72" width="126" height="22" rx="11" fill="#fff" opacity=".9"></rect>
        <text x="85" y="87" text-anchor="middle" font-size="10" font-weight="700" fill="#b45309">disk &gt;= 90%</text>
        <rect x="22" y="100" width="126" height="22" rx="11" fill="#fff" opacity=".9"></rect>
        <text x="85" y="115" text-anchor="middle" font-size="10" font-weight="700" fill="#b45309">for: 2m</text>
      </g>
      <g transform="translate(566,30)">
        <rect width="170" height="120" rx="14" fill="url(#a1)" opacity=".7"></rect>
        <rect x="12" y="12" width="146" height="30" rx="10" fill="#fff" opacity=".9"></rect>
        <text x="85" y="32" text-anchor="middle" font-size="12.5" font-weight="800" fill="#0f766e">Alertmanager</text>
        <text x="85" y="60" text-anchor="middle" font-size="10.5" fill="#134e4a">inhibit + route</text>
        <rect x="22" y="72" width="126" height="22" rx="11" fill="#fff" opacity=".9"></rect>
        <text x="85" y="87" text-anchor="middle" font-size="10" font-weight="700" fill="#4f46e5">oncall (critical)</text>
        <rect x="22" y="100" width="126" height="22" rx="11" fill="#fff" opacity=".9"></rect>
        <text x="85" y="115" text-anchor="middle" font-size="10" font-weight="700" fill="#4f46e5">default webhook</text>
      </g>
      <path d="M194 95 H 295" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round"></path>
      <circle r="7" fill="#14b8a6">
        <animate attributeName="cx" values="194;295" dur="1.5s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"></animate>
      </circle>
      <path d="M465 95 H 566" stroke="#be185d" stroke-width="2.5" stroke-linecap="round"></path>
      <circle r="7" fill="#f472b6">
        <animate attributeName="cx" values="465;566" dur="1.5s" begin=".5s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0;1;0" dur="1.5s" begin=".5s" repeatCount="indefinite"></animate>
      </circle>
      <g transform="translate(290,200)">
        <rect width="180" height="44" rx="12" fill="#fff" stroke="#c7cbe8" stroke-width="1.5"></rect>
        <text x="90" y="27" text-anchor="middle" font-size="12" font-weight="700" fill="#1d1f2b">ALERTS{alertstate=&quot;firing&quot;}</text>
      </g>
      <path d="M380 150 V 200" stroke="#be185d" stroke-width="2" stroke-dasharray="4 4" opacity=".5"></path>
      <g transform="translate(290,250)">
        <rect width="180" height="28" rx="12" fill="#fde8f1"></rect>
        <text x="90" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="#be185d">firing &rarr; Grafana annotation</text>
      </g>
      <path d="M380 244 V 250" stroke="#be185d" stroke-width="2" stroke-dasharray="4 4" opacity=".5"></path>
    </svg>

Fig 1. The whole path from a metric to a firing annotation. The animated dot is the alert being evaluated, routed and re-exported as the `ALERTS` series that Grafana draws.

## 1 The two services, in one compose file

| Service | Image | Key flags |
| --- | --- | --- |
| `vmalert` | `victoriametrics/vmalert` | `-rule=/etc/vmalert/rules.yml` · `-datasource.url=http://victoria-metrics:8428` · `-notifier.url=http://alertmanager:9093` · `-remoteWrite.url=http://victoria-metrics:8428` |
| `alertmanager` | `prom/alertmanager` | `--config.file=/etc/alertmanager/alertmanager.yml` |

⚠

**Two vmalert footguns.** (1) The flag is `-notifier.url=`, _not_ the Alertmanager-style `-notifier.alertmanager.url=` — the wrong one silently logs the notifier out in a loop. (2) `-remoteWrite.url=http://victoria-metrics:8428` is correct as-is; vmalert appends `/api/v1/write` itself, so a URL ending in `/api/v1/write` doubles the path and every write 404s.

## 2 The 28 rules, in four groups

| Group | Count | What fires |
| --- | --- | --- |
| `mlx-hardware` | 15 | node down, disk ≥ 90%, memory pressure, thermal pressure, GPU memory pressure, heat (no scheduler limit), load > 2× cores, stack components down (VM / vmalert / alertmanager) |
| `mlx-inference` | 7 | proxy down, error-rate spike, TTFT slowdown, throughput drop, stalled generation, token burst, in-flight spike |
| `mlx-quality` | 6 | hallucination risk, repetition, hedging, refusal, ungrounded output — each activity-gated |

15

mlx-hardware rules

7

mlx-inference rules

6

mlx-quality rules

0

false positives after gating

## 3 Rules worth quoting

GPU memory pressure is computed against _allocated_ memory (not used), clamped at zero, and only evaluated when the total is real:

```bash
- alert: MLXGPUMemoryPressure
  expr: clamp_min(mlx_hw_gpu_mem_alloc_bytes / mlx_hw_gpu_mem_total_bytes, 0) > 0.9
    and on(node) (mlx_hw_gpu_mem_total_bytes > 0)
```

Hallucination rules only fire when the model is actually serving traffic — a freshly launched model that hasn't seen a request yet must not alert on "refusal spikes":

```bash
- alert: MLXHallucinationRiskHigh
  expr: mlx_hallucination_risk{job="mlx-proxy"} > 0.7
    and on(model) sum(rate(mlx_requests_total{job="mlx-proxy"}[10m])) by (model) > 0
```

Stack liveness is scraped, not assumed — vmalert now watches itself and its peers:

```bash
- alert: MLXVictoriaMetricsDown
  expr: up{job="victoria-metrics"} == 0
  for: 2m
```

## 4 Inhibit rules kill the cascade

When a whole node dies, half the rulebook fires at once. Two inhibits make the root cause the only alert:

-   **proxy down** inhibits the upstream, throughput and stall alerts;
-   **hw exporter down** (per node) inhibits that node's GPU, thermal and load alerts.

## 5 The end-to-end proof

rank0's disk really is at 91.6%. With `MLXDiskNearlyFull` set to fire at `≥ 90%`, we watched the whole loop complete:

1.  `vmalert` evaluates every 15s against VM and flips the rule to `firing`;
2.  `ALERTS{alertname="MLXDiskNearlyFull", alertstate="firing"}` is written back into VM via remote-write;
3.  Alertmanager receives it and routes it to the `default` webhook;
4.  the same series powers the `Active alerts` stat and the red annotation on every dashboard (post 3).

✓

**Verified:** all 28 rules report `health=ok` from `/api/v1/rules`, exactly one alert is firing, and the ops targets (`victoria-metrics`, `vmalert`, `alertmanager`) all appear in `up`.
