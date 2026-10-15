---
title: "12 — The Fault Ledger: Detailed Restart & Error Analysis in Grafana"
date: 2026-08-08
description: "Post 9 typed the crash and counted restarts; post 11 measured the crash rate and wrote a plan. This post makes the analysis visible: a per-reason crash counter in the supervisor, and a Grafana row that answers “how many restarts, of what kind, when, and how many requests died with them” — plus the"
tags: [observability, grafana]
draft: false
---

12 of 19 · faults, errors & restarts

Post 9 typed the crash and counted restarts; post 11 measured the crash rate and wrote a plan. This post makes the analysis _visible_: a per-reason crash counter in the supervisor, and a Grafana row that answers “how many restarts, of what kind, when, and how many requests died with them” — plus the surprising discovery that the dashboard’s file edits were not reaching the running Grafana at all.

Update — posts 13 & 14The idle-cluster snapshot in section 5 did not survive contact with real traffic: two `metal_gpu_error` crashes landed minutes after writing (restarts `0→2`, `mlx_server_crashes_total{reason="metal_gpu_error"}` `0→2`), and the counter caught both exactly as designed. The forensics moved the story: crash reports exist only on rank1, the faulting thread is mlx’s GPU stream thread, and the crashes recur because the wedged GPU survives a respawn whose `/v1/models` readiness check cannot see it. Read the evidence: [post 13](13-agentic-forensics.html) · the consolidated plan: [post 14](14-recommendations-decision.html).

## 1The ask: more than a restart count

The `MLX Alerts & Serving Health` dashboard already had the post-9 basics — a _Server restarts (5m)_ timeseries, a _Last crash reason_ stat, and a _Flapping alerts_ table. But the post-11 plan demanded more: crash _rate per hour_, crashes _by reason_, crash _clusters_, and request error analysis. The old panels could not answer any of it:

-   **Restarts by reason?** No — `mlx_server_restarts_total` is a bare counter with no labels. It says _how many_, never _what kind_.
-   **Restarts per hour?** Only by re-reading the increase of a 5-minute window; no per-hour profile existed.
-   **What killed it last?** `mlx_server_last_crash_reason` shows only the current state — a gauge that flips 1/0 on each crash, so it cannot count.
-   **Errors with the crashes?** The proxy’s `mlx_error_total{status}` existed but had no panel at all.

The gapThe dashboard could tell you a crash happened; it could not tell you the story of _sixteen crashes in twenty-four hours_ — which reason dominated, which hours clustered, and whether requests were failing alongside.

## 2The metric gap, closed with one counter

The fix is a second counter in `mlx_server_supervisor.py`, labeled by the same reason the supervisor already sniffs from the log tail:

```bash
G_RESTARTS = Counter("mlx_server_restarts_total", "mlx_lm.server restarts performed")
G_CRASHES  = Counter("mlx_server_crashes_total", "server crashes by sniffed reason", ["reason"])
```

Incremented the moment the child exits, before the restart happens:

```bash
self.reason = sniff_crash_reason(self.args.server_log)
G_EXIT.set(rc)
G_CRASHES.labels(reason=self.reason).inc()
```

Two details matter. First, the counter is incremented on _every_ exit including clean ones — the sniffer’s five buckets (`metal_gpu_error`, `oom`, `python_error`, `exit`, `unknown`) cover every path, so the crash total always reconciles to the restart total. Second, and the reason this blog post exists:

```bash
for r in ("metal_gpu_error", "oom", "python_error", "exit", "unknown"):
    G_CRASHES.labels(reason=r).inc(0)
```

A Prometheus counter emits _no series until its first `inc()`_. Without that loop, the dashboard would show nothing until the next crash. Zero-initializing all five reasons means the five series exist at 0 from the very first scrape — the bargauge is filled, the ratio math is defined, and the dashboard is immediately readable.

VerifiedAfter the stack restart, `mlx_server_crashes_total` appears in VictoriaMetrics as five series — `exit=0, metal_gpu_error=0, oom=0, python_error=0, unknown=0` — with the old bare restarts counter intact alongside.

## 3The new dashboard row: faults, errors & restart counts

A fifth row, _5 · Faults, errors & restart counts_, turns the dashboard from 18 to 28 panels. Each panel maps to a question the old dashboard could not answer:

| panel | type | query (essence) | answers |
| --- | --- | --- | --- |
| Total restarts (since supervisor start) | stat | `max(mlx_server_restarts_total)` | lifetime restarts this supervisor process |
| Crashes by reason (total) | bargauge | `sum(mlx_server_crashes_total) by (reason)` | which failure class dominates, forever |
| Last exit code | stat | `max(mlx_server_last_exit_code)` | what the last exit actually returned (rc=0 on Metal abort) |
| Backoff delay (crash-loop indicator) | stat | `max(mlx_server_backoff_seconds)` | rising backoff = crash loop in progress |
| Crashes, last 24 h | stat | `sum(increase(mlx_server_crashes_total[24h]))` | the post-11 headline number, automated |
| Restarts per hour | timeseries (bars) | `sum(increase(mlx_server_restarts_total[1h]))` | the 22:00 / 01:00 / 09:00 cluster profile at a glance |
| Crashes per hour by reason | timeseries (stacked) | `sum(increase(mlx_server_crashes_total[1h])) by (reason)` | which reason drives each cluster |
| Proxy errors by status class | timeseries | `sum(rate(mlx_error_total[5m])) by (status)` | 4xx vs 5xx error rate beside the crash bars |
| Error ratio (4xx+5xx / requests) | stat | `sum(rate(mlx_error_total[5m])) / sum(rate(mlx_requests_total[5m]))` | the share of requests that fail — 503-degraded windows included |

Together they implement the post-11 measurement protocol (_crash rate per hour_, _crash reason share_, _error rate_) as always-on panels instead of ad-hoc queries — which is exactly what “candidate 1: correlate each crash” in the fix list needed.

## 4The deployment reality: file edits don’t reach Grafana

This Grafana is not the `compose.yaml` from `observability/`. It runs in the k0s `monitoring` namespace as a Helm chart whose dashboards are provisioned by a **kiwigrid sidecar**: the sidecar watches ConfigMaps labeled `grafana_dashboard=1` in any namespace, drops their JSON into `/tmp/dashboards`, and reloads Grafana provisioning. The repo’s `mlx-alerts.json` is a source artifact — it never touches the running instance by itself.

Two facts made the first fix attempt fail, usefully:

-   Pushing the new JSON through the Grafana API returned `400 "Cannot save provisioned dashboard"` — the dashboard was DB-marked provisioned by a ConfigMap that no longer exists anywhere in the cluster (orphaned), so neither the API nor the file sidecar owned it cleanly.
-   No `mlx-*` file existed in `/tmp/dashboards` either — grep across every ConfigMap in every namespace found nothing.

The fix makes the source-of-truth relationship explicit. `observability/grafana/apply-dashboards.sh` (committed with the repo) does the whole pipeline:

```bash
kubectl create configmap "$name" -n monitoring --from-file="$json" --dry-run=client -o yaml | kubectl apply -f -
kubectl label cm "$name" -n monitoring grafana_dashboard=1 --overwrite
```

The sidecar writes the file, and a provisioning reload picks it up:

```bash
curl -u admin:admin -X POST http://127.0.0.1:3000/api/admin/provisioning/dashboards/reload
```

The reload step is the one manual piece: the sidecar’s `REQ_URL` fires the reload POST anonymously, which the admin-only endpoint rejects — so after applying, an authenticated reload (or the provider’s 30-second scan) is what flips the dashboard. Result: **MLX Alerts & Serving Health at version 3, 28 panels**, provisioned from the repo file.

LessonBefore this, an edit to `mlx-alerts.json` in the repo did nothing to the live dashboard and _nothing said so_. The provisioning path is now scripted and its output states exactly what was applied — the repo file is the single source of truth.

## 5The status snapshot: an idle cluster with two alerts

With the new row live, the current state is honest and readable:

0

restarts / crashes since the 09:30 restart

12h

mlx\_lm.server uptime

5/5

crash-reason series present, all 0

93.2%

rank0 disk — MLXDiskNearlyFull FIRING

Tailer: up, errors 0, queue depth 0 · 11 lines shipped at startup, 5,798 HTTP lines filtered · zero requests through the proxy since restart.

Two alerts are firing, and they are opposites:

-   **`MLXDiskNearlyFull` is real.** rank0 is at **93.2%** (228 GB of 245 GB used), up from 92.7% this morning. It is the P0 item in the post-11 table that keeps getting deferred — nothing is being deleted, so the number only grows.
-   **`MLXLogTailerNotSending` is expected.** The rule fires when zero lines ship in 15 minutes while the tailer is up — and its own description says an idle server makes that normal. The tailer is healthy; there is simply nothing interesting to forward. It is signal-to-noise, and it is the same class of idle-false-positive the dashboard’s alert work keeps chasing.

## 6A live demonstration of the counter problem

Grep the tailer’s metrics and the counter-reset issue from post-11 recommendation #6 shows up in the flesh:

```bash
mlx_log_tailer_lines_total{severity="info"} = 5798   # previous process, still in VM
mlx_log_tailer_lines_total{severity="info"} = 11     # current process
```

Every restart zeroes the counters and leaves the old series behind in VictoriaMetrics until retention reaps it. A naive `sum()` now reports 5,809 lines — wrong on both counts (it double-counts and it is not a total). The new `mlx_server_crashes_total` has the exact same property: after the next restart its five series will sit next to five stale zeros from this process. The fix from post 11 stands: a **start-epoch gauge** (or persisted counters) so cumulative totals can be recomputed across restarts — without it, every “since supervisor start” panel is only true until the next restart.

## 7What this changes

-   Crash analysis moved from ad-hoc queries to **always-on panels**: per-reason totals, per-hour profiles, and the request-error ratio now render by default, implementing the post-11 measurement protocol as a dashboard instead of a script.
-   The supervisor’s crash story is **countable, not just current**: a labeled counter that reconciles to the restart total, with all five reasons visible at zero before the first crash.
-   The dashboard’s deployment path is **scripted and honest**: repo JSON → ConfigMap → sidecar → provisioning, with the orphaned-provisioned trap documented.
-   The open P0s are unchanged and now quantified: **rank0 disk at 93.2%** and the counter-persistence fix that the tailer’s dual series just demonstrated live.
