---
title: "20 — The Same Dashboards, Any Grafana: Shipping mlx-oc Data to the k8s Stack"
date: 2026-08-09
description: "The dashboards are files with a fixed datasource uid and a sidecar-based provisioning path. Sending this stack’s data to the k8s Grafana is therefore three disjoint problems: get the metrics into a reachable VictoriaMetrics, provision the dashboards as labeled ConfigMaps, and point Grafana at the"
tags: [kubernetes, grafana, observability]
draft: false
---

20 of 20 · the k8s Grafana bridge

The dashboards are files with a fixed datasource uid and a sidecar-based provisioning path. Sending this stack’s data to the k8s Grafana is therefore three disjoint problems: _get the metrics into a reachable VictoriaMetrics_, _provision the dashboards as labeled ConfigMaps_, and _point Grafana at the same datasource uid_. Here is the whole path in one SVG, the exact commands, and the six things that must already be true for it to render.

## 1The data path, one picture

Left: the physical cluster. Center: VictoriaMetrics — the only moving part both sides share. Right: the k8s `monitoring` namespace. Amber is the dashboard-provisioning control plane; pink is metric traffic.

Metrics → VM → Grafana · dashboards → ConfigMaps → sidecar → Grafana

<svg viewBox="0 0 820 430" role="img" aria-label="Data path from the Mac cluster to the k8s Grafana stack">
      <defs>
        <marker id="ka" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#818cf8"></path></marker>
        <marker id="kb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#d97706"></path></marker>
      </defs>
      <g font-family="inherit">
        <text class="label" x="18" y="20">MAC minis (physical)</text>
        <text class="label" x="540" y="20">k8s &mdash; monitoring namespace</text>
        <line x1="20" y1="26" x2="430" y2="26" stroke="#c7cbd9" stroke-width="1" stroke-dasharray="3 3"></line>
        <line x1="540" y1="26" x2="800" y2="26" stroke="#c7cbd9" stroke-width="1" stroke-dasharray="3 3"></line>
        <rect class="dbox" x="20" y="45" width="205" height="52"></rect>
        <text class="bigname" x="30" y="63">rank0 exporter pod</text>
        <text class="label" x="30" y="79">proxy :8080/metrics</text>
        <text class="label" x="30" y="91">hw :9102 &middot; kv :9104 &middot; sup :9105 &middot; log :9106</text>
        <rect class="dbox" x="20" y="112" width="205" height="52"></rect>
        <text class="bigname" x="30" y="130">rank1 exporter pod</text>
        <text class="label" x="30" y="146">mlx_lm.server (worker)</text>
        <text class="label" x="30" y="158">hw :9102 @ 203.0.113.2</text>
        <rect class="dbox" x="300" y="95" width="200" height="52" stroke="#0f766e"></rect>
        <text class="bigname" x="310" y="113">VictoriaMetrics</text>
        <text class="label" x="310" y="129">LAN 192.0.2.64:8428</text>
        <text class="label" x="310" y="141">prom scrape + store</text>
        <rect class="portbadge" x="446" y="103" width="48" height="16" rx="8" stroke="#0f766e"></rect><text class="porttext" x="450" y="115" fill="#0f766e">8428</text>
        <rect class="dbox" x="560" y="95" width="235" height="52" stroke="#4f46e5"></rect>
        <text class="bigname" x="570" y="113">Grafana deployment</text>
        <text class="label" x="570" y="129">12 provisioned dashboards</text>
        <text class="label" x="570" y="141">datasource uid &ldquo;VictoriaMetrics&rdquo;</text>
        <rect class="portbadge" x="746" y="103" width="40" height="16" rx="8"></rect><text class="porttext" x="751" y="115">3000</text>
        <rect class="dbox" x="560" y="180" width="235" height="60" stroke="#d97706"></rect>
        <text class="bigname" x="570" y="198">kiwigrid dashboards sidecar</text>
        <text class="label" x="570" y="214">watches ConfigMaps</text>
        <text class="label" x="570" y="228">label <code>grafana_dashboard=1</code></text>
        <text class="label" x="570" y="240">writes /tmp/dashboards &rarr; reloads</text>
        <rect class="dbox" x="560" y="275" width="235" height="52"></rect>
        <text class="bigname" x="570" y="293">ConfigMaps (12)</text>
        <text class="label" x="570" y="309">&lt;dash&gt;-dashboard &middot; JSON body</text>
        <text class="label" x="570" y="321">label grafana_dashboard=1</text>
        <rect class="dbox" x="20" y="275" width="245" height="52"></rect>
        <text class="bigname" x="30" y="293">apply-dashboards.sh</text>
        <text class="label" x="30" y="309">kubectl create configmap</text>
        <text class="label" x="30" y="321">--from-file=*.json &rarr; apply</text>
        <rect class="dbox" x="20" y="355" width="245" height="52"></rect>
        <text class="bigname" x="30" y="373">vmalert (46 rules)</text>
        <text class="label" x="30" y="389">queries VM &middot; ALERTS</text>
        <rect class="dbox" x="560" y="355" width="235" height="52"></rect>
        <text class="bigname" x="570" y="373">Alertmanager</text>
        <text class="label" x="570" y="389">routing &rarr; webhooks</text>
      </g>
      <path class="dflow" id="k1" d="M225,71 C255,71 268,110 296,112"></path>
      <path class="dflow" id="k2" d="M225,138 C255,138 268,110 296,112"></path>
      <path class="dflow" id="k3" d="M500,121 C520,121 536,112 556,112"></path>
      <path class="dflow" id="k4" d="M265,280 C300,280 380,240 300,205 C290,200 260,200 225,205"></path>
      <path class="dflow" id="k5" d="M265,381 C300,381 300,410 380,410 C480,410 520,395 555,382"></path>
      <g><circle class="dot" r="5"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#k1"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="3.2s" begin=".4s" repeatCount="indefinite"><mpath href="#k2"></mpath></animateMotion></circle></g>
      <g><circle class="dot" r="5"><animateMotion dur="2.8s" begin=".9s" repeatCount="indefinite"><mpath href="#k3"></mpath></animateMotion></circle></g>
      <g><circle class="dot2" r="5"><animateMotion dur="4s" begin="1.2s" repeatCount="indefinite"><mpath href="#k4"></mpath></animateMotion></circle></g>
      <g><circle class="dot3" r="5"><animateMotion dur="3.4s" begin="1.6s" repeatCount="indefinite"><mpath href="#k5"></mpath></animateMotion></circle></g>
      <text class="label" x="240" y="60">scrape 10s</text>
      <text class="label" x="248" y="128">scrape 10s</text>
      <text class="label" x="506" y="90">PromQL queries</text>
      <text class="label" x="330" y="282">file provisioning (30s)</text>
      <text class="label" x="300" y="406">ALERTS remote-write</text>
    </svg>

ⓘPink dots = metric traffic (scrape + query). Teal dot = the dashboard file-provisioning loop that runs inside the k8s Grafana pod (sidecar). Amber dot = the alert control plane. The key compatibility fact: **everything on the right is reached from the LAN, and the dashboards only know the datasource by its uid.**

## 2How the data gets there — three disjoint problems

### 1\. Metrics: point a VictoriaMetrics at the same scrape targets

The exporters are plain Prometheus endpoints on the LAN. A VictoriaMetrics instance on the k8s side (or the same `192.0.2.64:8428`) scrapes them with the job/instance labels the dashboards expect:

```bash
scrape_configs:
  - job_name: mlx-proxy
    scrape_interval: 10s
    static_configs:
      - targets: ["192.0.2.64:8080"]
  - job_name: mlx-hw
    scrape_interval: 10s
    static_configs:
      - targets: ["192.0.2.64:9102", "203.0.113.2:9102"]
  - job_name: mlx-kv
    scrape_interval: 10s
    static_configs: [{ targets: ["192.0.2.64:9104"] }]
  - job_name: mlx-supervisor
    scrape_interval: 10s
    static_configs: [{ targets: ["192.0.2.64:9105"] }]
  - job_name: mlx-logtailer
    scrape_interval: 10s
    static_configs: [{ targets: ["192.0.2.64:9106"] }]
```

No dashboard query references a `job` label — they filter on `model`, `node` and metric names — so the only scrape requirement is that the **same metric names with the same label sets** land in VM. The new families (prompt-cache, queue-wait, per-component CPU/RSS, ring network) appear automatically once the proxy and both hw exporters run the updated code (post 19’s table lists every family).

### 2\. Dashboards: run the existing sidecar provisioning path

The k8s Grafana already provisions dashboards from labeled ConfigMaps via the kiwigrid sidecar. From any machine with `kubectl` pointed at the cluster:

```bash
observability/grafana/apply-dashboards.sh            # all 12
observability/grafana/apply-dashboards.sh mlx-logs.json mlx-model-internals.json   # just the new ones
```

The script builds a ConfigMap per dashboard named `<file>-dashboard` in the `monitoring` namespace, labels it `grafana_dashboard=1`, and the sidecar drops the JSON into `/tmp/dashboards` within ~30s. Verify:

```bash
kubectl -n monitoring get cm | grep dashboard
curl -u admin:admin http://<grafana>/api/dashboards/uid/mlx-logs
```

### 3\. Datasource: the uid must match

Every dashboard hardcodes `"datasource": {"type":"prometheus","uid":"VictoriaMetrics"}`. Provision a datasource in the k8s Grafana with that exact uid pointing at the VM URL (e.g. `http://victoria-metrics.monitoring.svc:8428` or the LAN IP). If the uid differs, panels render with a red “datasource not found” — the dashboards themselves are otherwise installation-agnostic.

!**One-way path.** The k8s Grafana is a consumer. Nothing runs in the cluster that the cluster Grafana depends on: the exporters, VM and vmalert all keep running on the Macs — the k8s stack simply adds a second set of eyes (and, if you want, its own Alertmanager).

## 3What the HTML/SVG diagram needed

Six facts had to be true for the picture above to be worth drawing — each one is a line in the SVG:

| Fact | SVG element | Why it matters |
| --- | --- | --- |
| The exporters are **LAN endpoints, not cluster services** | left column, two pod boxes with ports | k8s VM scrapes static targets; no service discovery or exporter re-homing needed |
| **VM is the only shared component** | center box with `:8428` badge | both worlds already talk to it over Ethernet |
| Grafana only knows the datasource **by uid** | datasource uid inside the Grafana box | uid mismatch is the #1 silent failure; the diagram shows it as an explicit label |
| Dashboards arrive as **labeled ConfigMaps**, not imports | ConfigMaps box + sidecar box + amber control-plane path | the provisioning loop runs inside the pod — git-edit alone changes nothing (post 12) |
| **apply-dashboards.sh** is the bridge script | bottom-left box with the kubectl command | it is the only human step |
| Alerts keep flowing through **vmalert → Alertmanager** | bottom path with amber dot | proves the k8s Grafana is additive — the serving-critical path stays on the LAN |

Implementation notes for the diagram, matching post 19’s animated style:

-   One `<svg viewBox="0 0 820 430">`, boxes as `rect.dbox` + `text` pairs, flows as `path.dflow` with an `id`, and moving dots via `<circle class="dot"><animateMotion><mpath href="#id"/>`.
-   Three colors encode meaning: pink = metrics, teal = file provisioning, amber = alerts. The legend is the caption + a `.callout` below.
-   Keep the two worlds visually separate (the dashed divider at the top) — the whole point is that only VM bridges them.
-   Render the ports as `.portbadge` chips so `:8080/:9102/:9104/:9105/:9106/:8428/:3000` read at a glance.

## 4The six-things-must-be-true checklist

| # | Check | Command / where |
| --- | --- | --- |
| 1 | VM reachable from both worlds, datasource uid `VictoriaMetrics` | datasource provisioning file |
| 2 | k8s VM scrapes the five LAN targets (interval 10s) | scrape config, see section 2.1 |
| 3 | Sidecar enabled in the Grafana deployment, label `grafana_dashboard=1` | deployment env / chart values |
| 4 | Dashboards pushed as ConfigMaps | `apply-dashboards.sh` |
| 5 | New metric families present (cache, queue, proc, ring) | `curl :8428/api/v1/query?query=mlx_prompt_cache_ratio` |
| 6 | Alerts: 46 rules / 6 groups copied to the k8s vmalert | `observability/vmalert/rules.yml` |

✓After 1–4 the twelve dashboards render in the cluster Grafana with live data; 5–6 are the optional extras that make the new post-19/20 panels and the alerting story complete.

ⓘ**Compatibility verification (post 21):** the twelve dashboards use only core Grafana plugins (`timeseries`, `stat`, `heatmap`, `barchart`, `table`, `gauge`, `bargauge`, `text`, `row`) and one fixed datasource uid `VictoriaMetrics` — no absolute URLs, no instance-specific values. The same files `apply-dashboards.sh` pushes to the k8s Grafana render unchanged. Post-21 state: refresh `5m`, browser timezone, 43 panels with drill-down links, and `mlx_tool_calls_total` / `mlx_hallucination_flag_total` seeded at 0 so their panels never show “no data”.
