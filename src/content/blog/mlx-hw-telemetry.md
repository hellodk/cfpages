---
title: "29 Gauges, Two Cadences: Reading GPU Power Off a Mac mini and Getting It Into Prometheus"
date: 2026-10-18
description: "How a single 600-line Python exporter reads GPU residency, CPU/ANE/package power, thermals and memory off Apple Silicon — no root daemon — and lands 29 metrics in VictoriaMetrics via a Kubernetes scrape."
tags: [mlx, macos, observability, prometheus]
draft: false
---

Observability Deep Dive

Apple exposes almost nothing about its GPUs through the usual Linux interfaces — no `/sys/class/drm`, no `nvidia-smi`, no `perf`. Here is how a single 600-line Python exporter coaxes GPU residency, CPU/ANE/package power, thermals and unified-memory pressure out of an M2, and lands 29 metrics in VictoriaMetrics through a plain Kubernetes scrape.

2026-10-18 Apple Silicon · MLX · Prometheus powermetrics IOKit VMScrapeConfig

29

distinct `mlx_hw_*` / `mlx_net_*` series exported

5 s

fast-path refresh — load, memory, disk, process, IOKit (all no-root)

15 s

powermetrics sampler cadence on its own thread, cached under a lock

0

metrics pushed via OTLP — scrape is the single source of truth

## 01 · The Problem

You want to know whether the GPU or the Neural Engine is the bottleneck. On a Mac, that data exists — it is just gated behind privileged, Apple-private tooling.

On Linux there is a well-trodden path: read `/sys/class/hwmon` for power, `/sys/class/drm/card0/device/gpu_busy_percent` for utilization, `/proc` for memory. Apple Silicon offers none of that. There is no public sysfs, no kernel module you can load, and the sanctioned way to read a watt is `powermetrics` — a root-only binary that ships with macOS and speaks to the SMC and the power-management firmware directly.

That creates three constraints that shape the whole design:

Constraint 1 — root. `powermetrics` needs elevated privileges. A telemetry agent should not run as a root daemon that watches your inference server.

Constraint 2 — latency. A single `powermetrics` sample takes on the order of a second. You cannot put that on a 5-second hot path that also needs to read memory and process stats.

Constraint 3 — partial exposure. Apple exposes these sensors through private interfaces that shift between chips and macOS releases. Any field can simply be absent, so the exporter must degrade to `NaN` rather than crash or report a fake `0`.

And a fourth, softer one: unavailable is not zero. A GPU reading of `0 mW` means the GPU is genuinely idle. A reading of `NaN` means the exporter could not read it. Collapsing the two turns "we lost the sensor" into "the GPU is asleep" — a monitoring lie that is worse than no data at all.

## 02 · One Exporter, Two Cadences

The answer is a single Python process that splits sampling across two threads: a fast no-root path that runs on every scrape, and a slow privileged path that runs on its own clock and publishes into a shared, lock-protected cache.

The exporter is `~/omlx-telemetry/mlx_hw_telemetry.py` — about 601 lines, one file, run as a macOS LaunchAgent on each Mac mini. It binds `0.0.0.0:9102` and serves the standard Prometheus text format at `/metrics`. A scrape handler does the cheap reads inline and simply reads the cache for the expensive ones.

<svg viewBox="0 0 820 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The exporter splits sampling into a fast no-root path every 5 seconds and a slow sudo powermetrics path every 15 seconds, both feeding a gauge registry served on port 9102">
          <defs>
            <marker id="arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="0" y="0" width="820" height="320" fill="#FFFFFF"></rect>
          <text x="410" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#111827">One Exporter, Two Cadences</text>
          <rect x="40" y="64" width="270" height="104" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="60" y="88" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Fast path · every 5 s</text>
          <text x="60" y="104" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">no root required, runs inline on scrape</text>
          <text x="60" y="122" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">getloadavg · sysctl · vm_stat · shutil</text>
          <text x="60" y="137" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">ps · podman stats · ifconfig · netstat</text>
          <text x="60" y="152" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">ioreg (IOKit) · pmset -g therm</text>
          <rect x="40" y="192" width="270" height="104" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="60" y="216" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Power path · every 15 s</text>
          <text x="60" y="232" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">own daemon thread · sudo -n powermetrics</text>
          <text x="60" y="250" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">--samplers smc → CPU die temperature</text>
          <text x="60" y="265" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">cpu_power,gpu_power → GPU/CPU/ANE mW</text>
          <text x="60" y="280" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">residency % · active frequency · package</text>
          <rect x="360" y="100" width="190" height="130" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
          <circle cx="455" cy="118" r="4" fill="#2563EB"></circle>
          <circle cx="455" cy="118" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
            <animate attributeName="r" values="4;11" dur="1.8s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"></animate>
          </circle>
          <text x="455" y="150" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Gauge registry</text>
          <text x="455" y="172" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#4B5563">29 mlx_* series</text>
          <text x="455" y="192" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#4B5563">node=&lt;name&gt; label</text>
          <text x="455" y="212" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="#4B5563">power = cached read</text>
          <rect x="620" y="140" width="170" height="60" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="705" y="166" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">:9102/metrics</text>
          <text x="705" y="184" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">Prometheus text format</text>
          <path d="M310,116 H335 V150 H356" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M310,244 H335 V182 H356" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M550,165 H585 V170 H616" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M310,116 H335 V150 H356"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" begin="0.7s" repeatCount="indefinite" path="M310,244 H335 V182 H356"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.0s" begin="1.1s" repeatCount="indefinite" path="M550,165 H585 V170 H616"></animateMotion></circle>
        </svg>

The fast path answers every scrape; the slow privileged sampler fills a cache that the scrape handler reads without ever calling `powermetrics` inline.

The elegance is in the separation. The scrape handler never blocks on `powermetrics`. It grabs a lock, copies the cached GPU/power dict, releases the lock, and writes the values. Meanwhile the power thread wakes every 15 seconds, spends its ~1 second in `powermetrics`, and repopulates the cache. Slow sensors never stall fast ones.

## 03 · The Fast Path (No Root)

Everything in this table is read with zero elevated privileges, on every scrape, in well under a second.

| Signal | Source | Metric |
| --- | --- | --- |
| Load average | `os.getloadavg()` | mlx_hw_load1/5/15 |
| CPU count | `os.cpu_count()` | mlx_hw_cpu_count |
| Uptime | `sysctl kern.boottime` | mlx_hw_uptime_seconds |
| Memory used / pressure | `vm_stat` + `sysctl hw.memsize` | mlx_hw_mem_used_bytes · mlx_hw_mem_pressure |
| Disk used / total | `shutil.disk_usage("/")` | mlx_hw_disk_used_bytes · mlx_hw_disk_total_bytes |
| Worker CPU% / RSS | `ps -axo`, match `mlx_lm.server` | mlx_worker_cpu_percent · mlx_worker_rss_bytes |
| Per-component CPU% / RSS | one `ps` sweep + `podman stats` | mlx_proc_cpu_percent · mlx_proc_rss_bytes |
| Thermal pressure | `pmset -g therm` | mlx_hw_thermal_pressure |
| Ring interconnect traffic | `netstat -ib` on auto-detected iface | mlx_net_rx_bytes_total · mlx_net_tx_bytes_total |

Two details are worth calling out. First, the per-component numbers come from a single `ps -axo pid,pcpu,rss,command` sweep that is fanned out across every component by substring match — one subprocess, many series. The containerized half of the stack (otel-collector, victoria-metrics, grafana, alertmanager, vmalert) is invisible to host `ps`, so it is picked up from `podman stats --no-stream` instead and folded into the same two metrics by label.

Second, the ring interconnect is auto-detected rather than hard-coded: the exporter scans `ifconfig` for the first interface holding an IPv4 in `192.0.2.220/24` — the Thunderbolt bridge subnet that links the two minis — and reads its cumulative byte counters. On the single-node benchmark run that interface is present but quiet, which is why `mlx_net_rx_bytes_total` sits at `0`.

## 04 · The Power Path (sudo)

The wattages, GPU residency and CPU die temperature all come from `powermetrics` — read on a separate thread so their latency never touches the fast path.

Two invocations, both with `sudo -n` (non-interactive, relying on a passwordless sudoers rule for this one command):

```bash
# CPU die temperature (best effort)
sudo -n powermetrics -n 1 --samplers smc -f text

# GPU/CPU/ANE power + GPU residency/frequency, 1 s window
sudo -n powermetrics -n 1 --samplers cpu_power,gpu_power -i 1000 -f text
```

The exporter then regex-parses the human-readable output for a handful of fields and maps each to a gauge:

| `powermetrics` field | Metric | Live on mm1 |
| --- | --- | --- |
| GPU HW active residency | mlx_hw_gpu_utilization_percent | 32.8 % |
| GPU HW active frequency | mlx_hw_gpu_frequency_mhz | 844 MHz |
| GPU Power | mlx_hw_gpu_power_milliwatts | 39 mW |
| CPU Power | mlx_hw_cpu_power_milliwatts | 60 mW |
| ANE Power | mlx_hw_ane_power_milliwatts | 0 mW |
| Combined Power (CPU + GPU + ANE) | mlx_hw_package_power_milliwatts | 99 mW |
| CPU die temperature (`--samplers smc`) | mlx_hw_cpu_temp_celsius | NaN |

Reading the numbers. This is an M2 idling between benchmark runs: the GPU is lightly resident at ~33 % and sipping 39 mW, the CPU cluster draws 60 mW, and the whole package is under 100 mW. The Neural Engine is asleep (`0 mW`) — the Qwen3.5-4B inference in this stack is pure Metal GPU work, so ANE never lights up.

## 05 · GPU Memory via IOKit

Unified memory makes "GPU memory" a fuzzy idea on Apple Silicon. The exporter reads it from IOKit, with a graceful fallback to physical RAM.

GPU memory and a second, independent utilization figure come from `ioreg -c IOAccelerator -r -d 2` — an IOKit registry dump that needs no root. The exporter pulls four properties:

| IOKit property | Metric | Notes |
| --- | --- | --- |
| `In use system memory` | mlx_hw_gpu_mem_used_bytes | currently ~147 MB |
| `Alloc system memory` | mlx_hw_gpu_mem_alloc_bytes | reserved by the accelerator |
| `VRAM,totalMB` | mlx_hw_gpu_mem_total_bytes | falls back to `hw.memsize` when absent |
| `Device Utilization %` | mlx_hw_gpu_iokit_util_percent | a second, coarser util signal |

The fallback matters. On discrete-GPU Macs, `VRAM,totalMB` is present. On Apple Silicon — where the GPU shares the single pool of unified RAM — it is often absent, so the exporter falls back to `sysctl hw.memsize`. That is how `mlx_hw_gpu_mem_total_bytes` reports the full 8 GB on this M2: the GPU can address the whole physical pool, even though it only has ~147 MB in use at idle.

Two utilization signals, on purpose. `mlx_hw_gpu_utilization_percent` (from `powermetrics`, HW active residency) and `mlx_hw_gpu_iokit_util_percent` (from IOKit) are not the same number — here 32.8 % vs 12 %. The former is clock-gated residency, the latter a coarser activity flag. Having both lets you tell "the GPU is busy" from "the GPU is merely powered on."

## 06 · Into Kubernetes

The exporter pushes nothing. A VictoriaMetrics operator scrape config pulls it — which is what keeps every series unique.

Because the hardware agent does not emit OTLP metrics, the scrape is the single path these series take. That is deliberate: if the exporter both pushed OTLP and answered a scrape, every `mlx_hw_*` series would exist twice in VictoriaMetrics with different timestamps, and any `rate()` or `sum()` would double-count. Scraping exactly once makes each series unambiguous.

On the cluster, a `VMScrapeConfig` named `mlx-hardware` points at both minis with static targets:

```bash
job_name: mlx-hardware
static_configs:
  - targets: ["192.0.2.64:9102", "192.0.2.5:9102"]
    labels: { service: mlx-hw }
```

<svg viewBox="0 0 820 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Mac mini exporter on port 9102 is scraped by vmagent via the mlx-hardware job, remote-written to vmsingle, and read by Grafana and vmui">
          <defs>
            <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="0" y="0" width="820" height="320" fill="#FFFFFF"></rect>
          <text x="410" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#111827">From <tspan font-family="ui-monospace, monospace">powermetrics</tspan> to Prometheus</text>
          <rect x="40" y="70" width="210" height="160" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
          <circle cx="145" cy="92" r="4" fill="#2563EB"></circle>
          <circle cx="145" cy="92" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
            <animate attributeName="r" values="4;11" dur="1.8s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"></animate>
          </circle>
          <text x="145" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">mm1 · Mac mini M2</text>
          <text x="58" y="146" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">:9102/metrics</text>
          <text x="58" y="167" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">29 mlx_* gauges</text>
          <text x="58" y="188" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">LaunchAgent</text>
          <text x="58" y="209" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">no OTLP push</text>
          <rect x="340" y="70" width="150" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="415" y="98" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">vmagent</text>
          <text x="415" y="116" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">:8429</text>
          <rect x="340" y="188" width="150" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="415" y="216" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">vmsingle</text>
          <text x="415" y="234" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">:8428 · VM</text>
          <rect x="580" y="129" width="200" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="680" y="157" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Grafana :31300</text>
          <text x="680" y="175" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">vmui :31429</text>
          <path d="M250,150 H295 V102 H336" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr2)"></path>
          <path d="M415,134 V184" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr2)"></path>
          <path d="M490,220 H535 V161 H576" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr2)"></path>
          <text x="295" y="64" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">scrape · mlx-hardware</text>
          <text x="426" y="163" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">remote_write</text>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M250,150 H295 V102 H336"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="1.8s" begin="0.5s" repeatCount="indefinite" path="M415,134 V184"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" begin="1.0s" repeatCount="indefinite" path="M490,220 H535 V161 H576"></animateMotion></circle>
        </svg>

Scrape, don't push: vmagent pulls `mlx-hardware` from both minis and remote-writes to vmsingle, where Grafana and vmui read it.

Both minis run the identical agent — `--node-name mm` here, the peer labelled differently — so every gauge carries a `node` label and the two hardware planes stay separable in PromQL while sharing one `job`.

## 07 · The Process (How It Runs)

The exporter is not a container and not a cron job. It is a long-lived Python process supervised by macOS launchd, which is why it survives reboots and crashes without anyone noticing.

On each mini, a LaunchAgent plist at `~/Library/LaunchAgents/com.dk.omlx-telemetry.plist` declares the whole thing. LaunchAgents live per-user, load at login, and — critically — do not need root to install. The relevant keys are small but each one matters:

```bash
<key>ProgramArguments</key>
<array>
  <string>/usr/bin/python3</string>
  <string>/Users/dk/omlx-telemetry/mlx_hw_telemetry.py</string>
  <string>--node-name</string><string>mm</string>
  <string>--listen</string><string>0.0.0.0:9102</string>
  <string>--worker-match</string><string>omlx-server</string>
</array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>.../telemetry.log</string>
<key>StandardErrorPath</key><string>.../telemetry.err.log</string>
```

The two boolean keys carry the operational weight. `RunAtLoad` starts the agent at login, so a reboot brings telemetry back automatically. `KeepAlive` tells launchd to restart the process the moment it exits — for any reason, including a crash or an unhandled exception. That is the difference between a monitoring agent you trust and one you have to babysit.

The evidence is in the log. The stdout file repeats the same line — `[hw] node=mm listening on 0.0.0.0:9102` — four times, stacked. Each repetition is a fresh process launch: the agent exited, launchd restarted it, and it logged its bind line again. Meanwhile the process you see running has PPID 1 — a direct child of launchd itself, not of a shell. That parentage is how you tell a supervised agent from one someone started by hand.

## Operating it day to day

Because the agent is registered in the GUI LaunchAgent domain, you control it with `launchctl` aimed at that domain — note the `gui/$(id -u)/` prefix, which is where per-user agents live and why a bare `launchctl list` over SSH may not show it:

```bash
# Stop and start (unload = stop, load = start)
launchctl bootout   gui/$(id -u)/com.dk.omlx-telemetry
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dk.omlx-telemetry.plist

# Is it registered and running?
launchctl print gui/$(id -u)/com.dk.omlx-telemetry | grep -E "state|pid|last exit"

# Is it actually serving?
curl -s http://127.0.0.1:9102/metrics | head -20

# Watch the two log streams
tail -f ~/omlx-telemetry/telemetry.log ~/omlx-telemetry/telemetry.err.log
```

The stdout/stderr split is intentional and worth reading correctly. stdout gets the one-time startup lines — node name, bind address, which powermetrics sampler won the race. stderr gets the ongoing request log: every scrape from vmagent arrives there as `[hw] 192.0.2.10 - "GET /metrics HTTP/1.1" 200 -`. When someone asks "is anything still pulling this endpoint?", that stderr line is the answer, and it refreshes on every scrape interval.

The failure mode that looks like success. If the plist path is wrong or the Python script errors on import, launchd will restart the agent repeatedly and the process will keep re-appearing in `ps` — but it never binds `:9102`. The tell is a growing stack of identical startup lines in stdout with no matching `listening` success, or a scrape that times out while the PID looks healthy. Always confirm the port, not just the process.

## 08 · Using the Metrics

Once the agent is up and scraped, there are three ways to read the data: raw at the endpoint, ad hoc in vmui, or as PromQL against vmsingle. Here are the queries that answer the questions you actually ask.

Start at the source. A raw scrape returns every series in Prometheus text format — useful for confirming what exists before you build a dashboard against it:

```bash
curl -s http://192.0.2.64:9102/metrics | grep mlx_hw_gpu
```

The exporter exposes a mix of instant gauges and monotonic counters. The distinction drives which PromQL function you reach for — gauges need `avg_over_time` and friends, counters need `rate()` or `increase()`. A quick reference for the ones that come up most:

| Question | Series | Type |
| --- | --- | --- |
| Is the GPU busy? | mlx_hw_gpu_utilization_percent | gauge |
| How hard is it drawing? | mlx_hw_gpu_power_milliwatts | gauge |
| How hot / throttled? | mlx_hw_cpu_temp_celsius · mlx_hw_thermal_pressure | gauge |
| How much RAM is left? | mlx_hw_mem_used_bytes · mlx_hw_mem_pressure | gauge |
| How much did a run cost? | mlx_hw_package_power_milliwatts | gauge |
| Which process is eating CPU? | mlx_worker_cpu_percent · mlx_proc_cpu_percent | gauge |
| How many scrapes has it served? | mlx_hw_up · mlx_hw_uptime_seconds | gauge |

## Queries worth stealing

A few patterns cover most of what you would build. These are written against the `mlx-hardware` job and the `node` label that separates the two minis:

```bash
# Sustained GPU utilization over the last 5 minutes (smooths spikes)
avg_over_time(mlx_hw_gpu_utilization_percent{job="mlx-hardware"}[5m])

# Is the GPU pulling more than 15 W right now? (alert-friendly bool)
mlx_hw_gpu_power_milliwatts{job="mlx-hardware"} > 15000

# Peak package power during a benchmark run, per node
max_over_time(mlx_hw_package_power_milliwatts{job="mlx-hardware"}[1h])

# Thermal throttling events: pressure above zero, last 15m
max_over_time(mlx_hw_thermal_pressure{job="mlx-hardware"}[15m]) > 0

# Worker RSS in GB — the omlx-server process the agent matches on
mlx_worker_rss_bytes{job="mlx-hardware"} / 1e9

# How much data crossed the Thunderbolt ring in the last 5m (bytes/s)
rate(mlx_net_rx_bytes_total{job="mlx-hardware"}[5m])
```

Gauges versus counters, in one line. A gauge like `gpu_power_milliwatts` is a level you read directly or average over time. A counter like `net_rx_bytes_total` only ever goes up, so the raw number is meaningless on its own — you always wrap it in `rate()` or `increase()` to get a slope you can reason about. Mixing them up is the most common way a dashboard ends up confidently wrong.

For interactive use, `vmui` on the cluster (port 31429) is the fastest place to paste one of these and see the shape before committing it to a Grafana panel. The same queries run unchanged against vmsingle's Prometheus-compatible query API, which is what Grafana uses under the hood.

Remember the NaN contract from 09. When a sensor is unavailable the series is `NaN`, not `0`. Queries that assume a number — an arithmetic expression, an alert threshold — will simply drop those points rather than fabricate an idle reading. That is the intended behavior, but it means a gap in a dashboard can mean "sensor lost", not "value is zero". Build `avg_over_time` windows wide enough to bridge short gaps.

## 09 · What Breaks (and the Fixes)

Five things bite anyone wiring Apple-Silicon hardware telemetry for the first time.

1

No passwordless sudo → everything reads NaN

Without a sudoers rule for `powermetrics`, `sudo -n` fails silently and every power/residency/temperature gauge becomes `NaN` — not zero. Dashboards show gaps, not fake idleness.

FIX — grant a scoped, passwordless sudoers entry for the telemetry user to run exactly `powermetrics`, nothing else. Verify with a one-shot `sudo -n powermetrics -n 1 --samplers smc`.

2

powermetrics is too slow for the hot path

A single sample costs ~1 s. Calling it inline on every 5-second scrape would stall the whole endpoint and risk overlapping scrapes.

FIX — run it on a dedicated daemon thread at its own 15-second cadence, publish into a lock-protected cache, and let the scrape handler read the cache in microseconds.

3

NaN and 0 are not the same thing

An idle GPU really does draw 0 mW. A lost sensor reports NaN. Treating NaN as 0 turns a monitoring failure into a false "the GPU is asleep" — the worst kind of wrong.

FIX — let the metrics stay NaN when unavailable and build alerts on `mx_over_time(...)` that tolerate gaps, rather than coalescing to zero.

4

VRAM,totalMB is missing on unified memory

The IOKit property that reports total GPU memory is absent on Apple Silicon, where the GPU shares the unified pool. Naive code sets total to 0 and every percentage divides by zero.

FIX — fall back to `sysctl hw.memsize` so `mlx_hw_gpu_mem_total_bytes` equals physical RAM (8 GB here), and document that the GPU can address the whole pool.

5

Scrape and push double-counts every series

If the exporter both answered a scrape and pushed OTLP, every `mlx_hw_*` series would land twice in VictoriaMetrics with different timestamps — silently corrupting any `rate()` or `sum()`.

FIX — make the scrape the single source of truth. The hardware agent emits no OTLP metrics at all, so each series exists exactly once.

## 10 · Takeaways

| Split by latency, not by topic | The clean cut is fast-no-root vs slow-privileged, not "CPU metrics" vs "GPU metrics". One thread answers scrapes; another feeds a cache. Slow sensors never stall fast ones. |
| --- | --- |
| sudo once, scope it hard | A single passwordless sudoers entry for `powermetrics` unlocks every watt and residency number on Apple Silicon — without running the whole agent as root. |
| Preserve NaN | Unavailable is information. Let sensors report NaN and build alerts that tolerate gaps; collapsing to zero fabricates an idle GPU that does not exist. |
| Scrape, don't push | One collection path means each of the 29 series exists exactly once in VictoriaMetrics — the property that makes every downstream `rate()` trustworthy. |
| Unified memory blurs "GPU memory" | On Apple Silicon the GPU can address the full 8 GB pool, so "total" means physical RAM and "used" (~147 MB) is just what the accelerator has in hand. Read both, assume neither. |

See it in action. These are the exact gauges that powered the GPU/NPU telemetry in the [oMLX vs mlx-serve benchmark](../2026-10-17-omlx-vs-mlx-serve-benchmark/2026-10-17-omlx-vs-mlx-serve-benchmark.html) — the same `mlx_hw_gpu_utilization_percent`, `mlx_hw_gpu_power_milliwatts` and thermal-pressure series that confirmed decode, not prefill, was the differentiator on the 8 GB M2.
