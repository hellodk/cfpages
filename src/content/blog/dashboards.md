---
title: "3 — Three Dashboards, a GPU Heatmap, and Anonymous Kiosk Rendering"
date: 2026-08-08
description: "One cluster view, one per-node drill-down, one GPU & power deep-dive. All three are file-provisioned, anonymous-readable, and carry a live ALERTS annotation strip — plus the Grafana 13 DTO quirk that silently blanked every screenshot."
tags: [observability, grafana]
draft: false
---

3 of 19 · Grafana

One cluster view, one per-node drill-down, one GPU & power deep-dive. All three are file-provisioned, anonymous-readable, and carry a live `ALERTS` annotation strip — plus the Grafana 13 DTO quirk that silently blanked every screenshot.

<svg viewBox="0 0 760 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Animated GPU utilization heatmap with an alerts annotation strip">
      <defs>
        <linearGradient id="h1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fbbf24"></stop><stop offset="1" stop-color="#10b981"></stop>
        </linearGradient>
      </defs>
      <g>
        <rect x="60" y="30" width="640" height="150" rx="10" fill="#fff" stroke="#e5e7f0"></rect>
        <text x="60" y="20" font-size="12" font-weight="800" fill="#db2777">GPU utilization heatmap &mdash; rank0 &middot; rank1</text>
        <g font-size="9" text-anchor="middle">
          <text x="40" y="52" fill="#5b6072">rank0</text>
          <text x="40" y="150" fill="#5b6072">rank1</text>
          <rect x="70" y="40" width="36" height="52" rx="4" fill="#d9f3ec"></rect>
          <rect x="110" y="40" width="36" height="52" rx="4" fill="#b2ece0"></rect>
          <rect x="150" y="40" width="36" height="52" rx="4" fill="#6ee7b7"></rect>
          <rect x="190" y="40" width="36" height="52" rx="4" fill="#34d399"></rect>
          <rect x="230" y="40" width="36" height="52" rx="4" fill="#10b981"></rect>
          <rect x="270" y="40" width="36" height="52" rx="4" fill="#34d399"></rect>
          <rect x="310" y="40" width="36" height="52" rx="4" fill="#6ee7b7"></rect>
          <rect x="350" y="40" width="36" height="52" rx="4" fill="#b2ece0"></rect>
          <rect x="390" y="40" width="36" height="52" rx="4" fill="#a7f3d0"></rect>
          <rect x="430" y="40" width="36" height="52" rx="4" fill="#34d399"></rect>
          <rect x="470" y="40" width="36" height="52" rx="4" fill="#10b981"></rect>
          <rect x="510" y="40" width="36" height="52" rx="4" fill="#fbbf24"></rect>
          <rect x="550" y="40" width="36" height="52" rx="4" fill="#f59e0b"></rect>
          <rect x="590" y="40" width="36" height="52" rx="4" fill="#fbbf24"></rect>
          <rect x="70" y="40" width="36" height="52" rx="4" fill="#10b981">
            <animate attributeName="opacity" values="0;.9;0" dur="2s" repeatCount="indefinite"></animate>
          </rect>
          <rect x="70" y="100" width="36" height="52" rx="4" fill="#ecfdf5"></rect>
          <rect x="110" y="100" width="36" height="52" rx="4" fill="#a7f3d0"></rect>
          <rect x="150" y="100" width="36" height="52" rx="4" fill="#b2ece0"></rect>
          <rect x="190" y="100" width="36" height="52" rx="4" fill="#d9f3ec"></rect>
          <rect x="230" y="100" width="36" height="52" rx="4" fill="#34d399"></rect>
          <rect x="270" y="100" width="36" height="52" rx="4" fill="#6ee7b7"></rect>
          <rect x="310" y="100" width="36" height="52" rx="4" fill="#a7f3d0"></rect>
          <rect x="350" y="100" width="36" height="52" rx="4" fill="#d9f3ec"></rect>
          <rect x="390" y="100" width="36" height="52" rx="4" fill="#ecfdf5"></rect>
          <rect x="430" y="100" width="36" height="52" rx="4" fill="#b2ece0"></rect>
          <rect x="470" y="100" width="36" height="52" rx="4" fill="#a7f3d0"></rect>
          <rect x="510" y="100" width="36" height="52" rx="4" fill="#ecfdf5"></rect>
          <rect x="550" y="100" width="36" height="52" rx="4" fill="#d9f3ec"></rect>
          <rect x="590" y="100" width="36" height="52" rx="4" fill="#ecfdf5"></rect>
          <rect x="270" y="100" width="36" height="52" rx="4" fill="#10b981">
            <animate attributeName="opacity" values="0;.9;0" dur="2.4s" begin=".6s" repeatCount="indefinite"></animate>
          </rect>
        </g>
        <text x="60" y="216" font-size="10" fill="#5b6072">0%</text>
        <text x="380" y="216" text-anchor="middle" font-size="10" fill="#5b6072">50%</text>
        <text x="700" y="216" text-anchor="end" font-size="10" fill="#5b6072">100%</text>
        <line x1="60" y1="198" x2="700" y2="198" stroke="#e5e7f0"></line>
      </g>
      <g>
        <rect x="60" y="225" width="640" height="30" rx="8" fill="#fef3d7" opacity=".5"></rect>
        <text x="60" y="245" font-size="11" font-weight="800" fill="#b45309">ALERTS</text>
        <rect x="120" y="233" width="8" height="14" rx="3" fill="#f87171">
          <animate attributeName="opacity" values="1;.3;1" dur="1.1s" repeatCount="indefinite"></animate>
        </rect>
        <text x="135" y="244" font-size="11" fill="#92400e">MLXDiskNearlyFull (rank0) &mdash; firing</text>
        <rect x="470" y="233" width="8" height="14" rx="3" fill="#34d399"></rect>
        <text x="485" y="244" font-size="11" fill="#92400e">proxy OK &middot; hw OK</text>
      </g>
      <text x="60" y="288" font-size="11" font-weight="800" fill="#5b6072">RdYlGn &middot; calculate mode &middot; yBucketNumber 24 &middot; per-node y-axis</text>
    </svg>

Fig 1. The cluster heatmap's essence: two node rows of utilization buckets in RdYlGn, with the ALERTS annotation strip pulsing on firing alerts.

## 1 The three views

| Dashboard | UID / slug | Panels | What's on it |
| --- | --- | --- | --- |
| **MLX Cluster** | `mlx-cluster` | 48 | cluster-wide inference rows, GPU utilization heatmap, GPU memory used/allocated, CPU & ANE & package power, `Active alerts` stat, ALERTS annotation |
| **MLX Node** | `mlx-node` | 33 | single-node drill-down: GPU memory % and GiB gauges, GPU mem used/alloc, CPU/ANE/power, thermal pressure, node-scoped heatmap and alerts stat |
| **MLX GPU & Power** | `mlx-gpu-power` / `mlx-gpu-and-power` | 17 | the GPU deep-dive: utilization heatmap, frequency, GPU/ANE/package power, GPU memory |

## 2 Provisioned, not hand-edited

All three dashboards are file-provisioned from `observability/grafana/dashboards/` with `disableDeletion: true` and `allowUiUpdates: false`. The audit (post 4) found the cluster dashboard had drifted — a DB copy was edited in the UI and diverged from its JSON file. We deleted the DB copies so the file is the single source of truth, and re-provisioning now leaves `provisioned=True` with zero drift.

## 3 The heatmap, copied from the hydra reference

The GPU utilization heatmap matches the fleet-overview schema we borrowed from a hydra reference project: `calculate` mode so VM does the y-bucket aggregation, `RdYlGn` color scheme, and `yBucketNumber: 24` to give the time axis enough resolution. It runs on the cluster and node dashboards, per node.

## 4 Anonymous kiosk rendering — and the DTO quirk

We render the dashboards with headless Chrome (`?kiosk&theme=light&from=now-1h&to=now`) for README screenshots. Two hard-won facts:

-   **Grafana 13 serves dashboards through the APISIX DTO endpoints**, and the SPA will render a blank page if the dashboard isn't anonymous-readable. The cluster dashboard was 403 for anonymous users until it moved into the "MLX Cluster" folder. The working DTO URL needs the namespace: `/apis/dashboard.grafana.app/v2/namespaces/default/dashboards/<uid>/dto`.
-   **Chrome writes the PNG then hangs.** Every capture must be backgrounded and `kill`ed after ~30s, with `--user-data-dir` per run and `--disable-background-timer-throttling`. And once the dashboards gained the annotation queries, the plain `--screenshot` started firing before the SPA finished rendering — the fix is `--virtual-time-budget=20000` so Chrome fast-forwards through the render.

✓

**Verified in pixels, not DOM.** Grafana's `/render` endpoint 500s (no image-renderer plugin), and a DOM dump only shows the SPA shell. We analyze the PNG instead — the cluster shot contains the RdYlGn palette in exact RGB, and all three screenshots show non-blank content after the virtual-time fix.

## 5 The screenshots

![MLX Cluster dashboard](/assets/blog/dashboards/mlx-cluster.png)

MLX Cluster — 48 panels

![MLX Node dashboard](/assets/blog/dashboards/mlx-node.png)

MLX Node — 33 panels

![MLX GPU and Power dashboard](/assets/blog/dashboards/mlx-gpu-power.png)

MLX GPU & Power — 17 panels
