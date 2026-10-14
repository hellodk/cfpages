---
title: "1 — Reading Apple Silicon GPU & Power Without Root"
date: 2026-08-08
description: "macOS exposes almost nothing about GPU memory, GPU utilization or die power through a public API. We found three command-line seams that together give us a full hardware picture — on both nodes, over SSH, no kernel modules."
tags: [macos, mlx, observability]
draft: false
---

1 of 19 · mlx\_hw\_telemetry

macOS exposes almost nothing about GPU memory, GPU utilization or die power through a public API. We found three command-line seams that together give us a full hardware picture — on both nodes, over SSH, no kernel modules.

<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three data sources feeding the hardware exporter">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#e6e0ff"></stop><stop offset="1" stop-color="#c7d2fe"></stop>
        </linearGradient>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d9f3ec"></stop><stop offset="1" stop-color="#b2ece0"></stop>
        </linearGradient>
        <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe9f0"></stop><stop offset="1" stop-color="#ffd6e5"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(20,30)">
        <rect width="200" height="150" rx="14" fill="url(#g1)" opacity=".7"></rect>
        <rect x="10" y="10" width="180" height="34" rx="10" fill="#fff" opacity=".85"></rect>
        <text x="100" y="32" text-anchor="middle" font-size="14" font-weight="800" fill="#4338ca">ioreg</text>
        <text x="100" y="62" text-anchor="middle" font-size="11.5" fill="#3730a3">GPU mem used / alloc / total</text>
        <text x="100" y="80" text-anchor="middle" font-size="11.5" fill="#3730a3">IOAccelerator class</text>
        <rect x="22" y="98" width="156" height="28" rx="14" fill="#fff" opacity=".9"></rect>
        <text x="100" y="116" text-anchor="middle" font-size="11" font-weight="700" fill="#0f766e">no root &middot; 5s</text>
      </g>
      <g transform="translate(280,30)">
        <rect width="200" height="150" rx="14" fill="url(#g2)" opacity=".7"></rect>
        <rect x="10" y="10" width="180" height="34" rx="10" fill="#fff" opacity=".85"></rect>
        <text x="100" y="32" text-anchor="middle" font-size="14" font-weight="800" fill="#0f766e">powermetrics</text>
        <text x="100" y="62" text-anchor="middle" font-size="11.5" fill="#134e4a">GPU util &amp; freq</text>
        <text x="100" y="80" text-anchor="middle" font-size="11.5" fill="#134e4a">GPU / CPU / ANE power</text>
        <text x="100" y="98" text-anchor="middle" font-size="11.5" fill="#134e4a">package power</text>
        <rect x="22" y="110" width="156" height="28" rx="14" fill="#fff" opacity=".9"></rect>
        <text x="100" y="128" text-anchor="middle" font-size="11" font-weight="700" fill="#b45309">passwordless sudo &middot; 15s</text>
      </g>
      <g transform="translate(540,30)">
        <rect width="200" height="150" rx="14" fill="url(#g3)" opacity=".7"></rect>
        <rect x="10" y="10" width="180" height="34" rx="10" fill="#fff" opacity=".85"></rect>
        <text x="100" y="32" text-anchor="middle" font-size="14" font-weight="800" fill="#be185d">pmset -g therm</text>
        <text x="100" y="62" text-anchor="middle" font-size="11.5" fill="#831843">CPU_Scheduler_Limit</text>
        <text x="100" y="80" text-anchor="middle" font-size="11.5" fill="#831843">thermal pressure 0..1</text>
        <rect x="22" y="110" width="156" height="28" rx="14" fill="#fff" opacity=".9"></rect>
        <text x="100" y="128" text-anchor="middle" font-size="11" font-weight="700" fill="#0f766e">no root &middot; 30s</text>
      </g>
      <path d="M100 180 C 100 210, 150 215, 200 225" fill="none" stroke="#4338ca" stroke-width="2" opacity=".5" stroke-dasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-16" dur="1.6s" repeatCount="indefinite"></animate>
      </path>
      <path d="M380 180 C 380 210, 350 215, 300 225" fill="none" stroke="#0f766e" stroke-width="2" opacity=".5" stroke-dasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-16" dur="1.6s" begin=".4s" repeatCount="indefinite"></animate>
      </path>
      <path d="M640 180 C 640 210, 610 215, 560 225" fill="none" stroke="#be185d" stroke-width="2" opacity=".5" stroke-dasharray="4 4">
        <animate attributeName="stroke-dashoffset" values="0;-16" dur="1.6s" begin=".8s" repeatCount="indefinite"></animate>
      </path>
      <g transform="translate(280,225)">
        <rect width="200" height="52" rx="14" fill="#fff" stroke="#c7cbe8" stroke-width="1.5"></rect>
        <rect x="0" y="0" width="200" height="30" rx="14" fill="#4f46e5"></rect>
        <rect x="0" y="16" width="200" height="14" fill="#4f46e5"></rect>
        <text x="100" y="20" text-anchor="middle" font-size="13" font-weight="800" fill="#fff">mlx_hw_telemetry.py</text>
        <text x="100" y="45" text-anchor="middle" font-size="11.5" fill="#5b6072">:9102 Prometheus text</text>
      </g>
      <g transform="translate(540,225)">
        <rect width="200" height="52" rx="14" fill="url(#g2)"></rect>
        <rect x="10" y="8" width="180" height="34" rx="10" fill="#fff" opacity=".9"></rect>
        <text x="100" y="29" text-anchor="middle" font-size="12.5" font-weight="800" fill="#0f766e">VictoriaMetrics</text>
      </g>
      <line x1="480" y1="251" x2="540" y2="251" stroke="#0f766e" stroke-width="2.5" stroke-linecap="round"></line>
      <circle r="5" fill="#14b8a6">
        <animate attributeName="cx" values="480;540" dur="1.6s" begin=".4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0;1;0" dur="1.6s" begin=".4s" repeatCount="indefinite"></animate>
      </circle>
      <text x="510" y="242" text-anchor="middle" font-size="10.5" fill="#0f766e" font-weight="700">scrape 15s</text>
    </svg>

Fig 1. Three command-line seams, zero public API. Each source pulses its numbers into one exporter that VM scrapes like any Prometheus target.

## 1 Why there is no API

Apple Silicon exposes no official metrics endpoint for GPU memory or utilization. There is no `nvidia-smi` equivalent, no `/sys`, no `IOHID` trick — so we composited three different command-line tools and wrapped them in a thread-safe HTTP exporter.

| Source | What it gives | Privilege | Cadence |
| --- | --- | --- | --- |
| `ioreg -c IOAccelerator` | GPU `gpu_memory_used`, `gpu_memory_allocated`, `gpu_memory_total` (plus an IOKit utilization %) | none | ~5s |
| `powermetrics -n 1 -i 1000 --samplers cpu_power,gpu_power` | GPU utilization %, GPU frequency, GPU/CPU/ANE/package power in mW | **passwordless sudo** | ~15s (sampler is slow) |
| `pmset -g therm` | `CPU_Scheduler_Limit` → thermal pressure 0..1 | none | ~30s |

⚡

**The sampler-name gotcha.** powermetrics rejects a `power` sampler name. You must pass `cpu_power,gpu_power` explicitly — `--samplers power` fails on modern macOS. Cost us a debug cycle.

## 2 GPU memory via ioreg — the no-root win

The whole GPU-memory story comes from `ioreg`, so it works over SSH with no sudo — the only privilege the exporter needs anywhere is the powermetrics path. Parsing the two topmost accelerators and picking the entry whose `gpu_memory_used > 0` gives us per-node GPU memory in bytes:

```bash
mlx_hw_gpu_mem_total_bytes{node="rank0"}  8,589,934,592
mlx_hw_gpu_mem_used_bytes{node="rank0"}    343,932,928
mlx_hw_gpu_mem_alloc_bytes{node="rank0"}   12,132,352
```

330.7 MB

GPU memory in use on rank1 (16 GB node)

131.2 MB

GPU memory in use on rank0 (8 GB node)

8.3 / 2.2

load1 on rank1 / rank0 at first scrape

0.92

rank0 disk usage — the alert that went firing (see post 2)

## 3 Power and utilization via powermetrics

With passwordless `sudo -n` configured for the venv's user on both machines, a subprocess samples the real silicon power rails. The `gpu_power` sampler returns GPU utilization, frequency and power in one shot; we also grab the `cpu` and `ane` rails so the dashboard can show GPU vs CPU vs ANE vs package power as separate series:

```bash
mlx_hw_gpu_utilization_percent{node="rank0"}   20.89
mlx_hw_gpu_power_milliwatts{node="rank0"}      1,234
mlx_hw_package_power_milliwatts{node="rank0"}  15,876
mlx_hw_ane_power_milliwatts{node="rank0"}        214
```

Two failures are tolerated gracefully: missing sudo yields `NaN` (so panels go blank instead of lying), and GPU die temperature — which powermetrics does not expose on this M2 Pro — is deliberately _not_ a gauge. The heatmap and frequency panels stand in for it.

## 4 Thermal pressure without sudo

`pmset -g therm` prints `CPU_Scheduler_Limit` — the fraction of CPU the scheduler is allowed to run under thermal load. We invert it into a 0..1 pressure gauge: `1 - limit`. It needs no sudo, so even a locked-down node still reports whether it's thermally throttling:

```bash
mlx_hw_thermal_pressure{node="rank1"}  0.00
```

## 5 Ship it to both nodes

The exporter runs under `/Users/dk/venvs/mlx/bin/python` on rank1 — a py3.12 venv — because macOS Local-Network privacy (TCC) silently blocks the third-party py3.14 Homebrew binary from reaching local subnets over SSH (`EHOSTUNREACH`). Rank0's local copy runs on the repo's py3.14 venv. Same code, two interpreters, one lesson.

> Every gauge carries `node` — `rank0` or `rank1` — so the same queries power the cluster dashboard, the per-node drill-down, and node-scoped alerting.

⚠

**Live-verified** on both nodes: `up{job="mlx-hw"}` is 1 for `192.0.2.64:9102` and `192.0.2.5:9102`, GPU memory and power gauges populate, and the VM delete-API left zero stale `mlx-metrics-proxy` series behind.
