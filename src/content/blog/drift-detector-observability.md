---
title: "27 Tests, 3 Alerts, 1 Real Bug Review Caught: Making a Drift Detector Watch Itself"
date: 2026-08-04
description: "A Kubernetes drift detector could tell you when prod and dr fell out of sync — but had no way to tell you it had stopped checking. Here's how I closed that gap with structured logs, a real health check, Prometheus alerts, and a dashboard, ticket-first and test-first."
tags: [observability, prometheus, kubernetes]
draft: false
---

🛰️ Build Log

The drift detector could tell you the instant `prod` and `dr` fell out of sync — a wrong image tag, a missing ConfigMap key, a replica count that didn't match. What it couldn't tell you was whether it was still running. No metrics endpoint wired to anything, no real health check, no alert if the scan loop quietly died at 2am. This is the build log for closing that gap: one GitHub issue, a red test suite, and a PR that turned an unmonitored script into a deployable, alertable service.

TL;DR

-   **The gap:** `infra/drift/dashboard/`, `infra/drift/grafana/`, and `infra/drift/prometheus/` were empty directories. No `Dockerfile`, no `Deployment`, no way to run this thing in a cluster at all.
-   **Ticket first:** opened GitHub issue #1 with acceptance criteria and a tests-required checklist before writing a line of code.
-   **Test first:** wrote the observability tests against functions that didn't exist yet, watched them fail with a real `ImportError`, then implemented.
-   **What shipped:** structured JSON logs with a per-scan `trace_id`, a `health_status()` function with three honest states, a `ServiceMonitor` + `PrometheusRule` validated with `promtool`, a 5-panel Grafana dashboard, and a `Dockerfile`/`Deployment`/`Service` so it can actually run.
-   **Bonus fix:** found the deploy script building the detector's own image with a `:latest` tag mid-way through — fixed it to `:${'$'}{'{'}VERSION{'}'}` while in that file anyway.
-   **Then review found real gaps:** an independent audit pass caught that `/healthz`'s actual 200/503 status code was never tested — only the pure health function was — plus a metrics test that only checked a hardcoded literal and a missing `drift_last_scan_timestamp_seconds` gauge the issue had asked for. Fixed all three, and hand-verified the fix by flipping the status-code branch and watching the new test catch it.

Unit + integration tests

27/27

confirmed via junit xml, not console output

Prometheus alert rules

3

watchdog, drift-detected, scan-failing

Grafana dashboard panels

5

scan rate, up/down, drift by service

Health check states

3

ok · stalled · no\_scan\_yet

## 1 Watching everything but itself

The drift detector's job is simple: poll the `prod` (active) and `dr` (passive) namespaces on a fixed interval, diff every Deployment's image and replica count, hash every ConfigMap and Secret's contents, and report anything that doesn't match. It already worked — 11 unit tests covered the comparison logic, and it even exposed `/metrics` and `/healthz` endpoints.

But look closer at what those endpoints actually did. `/healthz` returned `200 ok` as long as any report had ever been generated, even if the scan loop had silently stopped working three hours ago. There was no `ServiceMonitor` for Prometheus to find it, no alert rule to page anyone if it went dark, no dashboard to look at, and no `Dockerfile` or `Deployment` manifest — the only way to run it was `scripts/harness drift watch` from a laptop.

**The actual risk:** a tool built to catch silent divergence between prod and dr could itself diverge silently — stop scanning, and nobody would know until someone happened to check.

## 2 Ticket first

Before touching `drift_detector.py`, the work got a GitHub issue with acceptance criteria and a tests-required checklist — the same gate every change here goes through, no matter how small:

Open issue #1 — acceptance criteria + tests-required checklist

↓

Write failing tests against functions that don't exist yet

↓

Run the suite — confirm it fails for the right reason

↓

Implement the minimum to make it pass

↓

Open PR #2 — Closes #1

The issue broke the work into seven acceptance criteria: a real `/metrics` endpoint, a `ServiceMonitor`, a `PrometheusRule` with at least a watchdog and a drift alert, structured JSON logs, a working `/healthz` wired to k8s probes, a Grafana dashboard, and an architecture doc. Each one had to map to either a test or a file that visibly exists and is valid — no checkbox got ticked on faith.

## 3 Red tests, for the right reason

The new test file imported three functions that didn't exist yet: `log_line`, `health_status`, and the already-present `report_to_metrics` (which had never actually been tested). Running the suite before writing any implementation gave exactly the failure it should have:

pytest tests/unit/test\_drift\_observability.pyoutput

```bash
ImportError: cannot import name 'health_status' from 'drift_detector'
1 error in 0.29s
```

Not a typo, not a fixture problem — the exact right failure: the function genuinely didn't exist. Only after seeing that did implementation start.

## 4 One trace\_id per scan

Every scan cycle now emits structured JSON to stderr instead of a bare `print()`. Each cycle gets one `trace_id` (a fresh `uuid4`) that threads through its `scan_start` and `scan_complete`/`scan_failed` lines, so a grep for that id pulls the whole story of one scan out of the log stream:

drift\_detector.pypython

```python
def log_line(level, msg, trace_id=None, **fields):
    record = {
        "level": level,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "service": "drift-detector",
        "trace_id": trace_id,
        "msg": msg,
    }
    record.update(fields)
    return json.dumps(record)
```

`log_line` is a pure function — it builds the JSON string and returns it, no I/O. `log_json` is the one-line wrapper that prints it to stderr. Splitting them is what made the unit tests possible without spinning up a process or capturing stdout.

## 5 A health check that means it

The old `/healthz` answered one question — "has a report ever been built?" — which stays `true` forever after the first successful scan, whether or not the scan loop is still alive. The new `health_status()` answers the question that actually matters: _when_ did a scan last succeed?

| Status | Condition | HTTP code |
| --- | --- | --- |
| no_scan_yet | process just started, nothing has completed | 503 |
| ok | last successful scan is within 3× the scan interval | 200 |
| stalled | last successful scan is older than that | 503 |

That third state — `stalled` — is the one that matters most. If the process is alive but has lost RBAC access, or the k8s API starts erroring, the scan loop can keep running while never actually completing a report. Under the old logic that pod would sit "healthy" forever. Under the new one, `livenessProbe` and `readinessProbe` both point at `/healthz`, so a stalled pod gets restarted instead of quietly going stale.

## 6 Metrics and alerts

Here's the full path from one failed scan to a page — every hop scraped, shipped, or probed automatically, nothing that depends on a human remembering to look:

Data Flow — Scan Cycle To Signal

<svg viewBox="0 0 1000 420" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#2563EB"></path>
              </marker>
              <marker id="arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#4B5563"></path>
              </marker>
            </defs>
            <rect x="380" y="40" width="240" height="64" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
            <text x="500" y="66" text-anchor="middle" font-size="14" font-weight="700" fill="#F9FAFB">Drift Detector Process</text>
            <text x="500" y="84" text-anchor="middle" font-size="12" fill="#CBD5E1">detect_once() Every 30s</text>
            <circle cx="500" cy="72" r="30" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0.6">
              <animate attributeName="r" values="30;60;30" dur="3s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite"></animate>
            </circle>
            <rect x="60" y="144" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="170" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">/metrics Endpoint</text>
            <text x="170" y="184" text-anchor="middle" font-size="12" fill="#4B5563">Prometheus Text Format</text>
            <rect x="390" y="144" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="500" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Structured Json Logs</text>
            <text x="500" y="184" text-anchor="middle" font-size="12" fill="#4B5563">Stderr, One Trace_id Per Scan</text>
            <rect x="720" y="144" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="830" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">/healthz Endpoint</text>
            <text x="830" y="184" text-anchor="middle" font-size="12" fill="#4B5563">Ok / Stalled / No Scan Yet</text>
            <path d="M 500,104 L 500,144" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <path d="M 500,104 L 500,124 L 170,124 L 170,144" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <path d="M 500,104 L 500,124 L 830,124 L 830,144" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <rect x="60" y="240" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="170" y="264" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Prometheus</text>
            <text x="170" y="280" text-anchor="middle" font-size="12" fill="#4B5563">Scrapes /metrics Every 30s</text>
            <rect x="390" y="240" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="500" y="264" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Promtail To Loki</text>
            <text x="500" y="280" text-anchor="middle" font-size="12" fill="#4B5563">Ships Stderr Json Lines</text>
            <rect x="720" y="240" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="830" y="264" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Kubelet Probes</text>
            <text x="830" y="280" text-anchor="middle" font-size="12" fill="#4B5563">Liveness + Readiness</text>
            <path d="M 170,200 L 170,240" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <path d="M 500,200 L 500,240" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <path d="M 830,200 L 830,240" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <rect x="20" y="336" width="200" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="120" y="360" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Alertmanager</text>
            <text x="120" y="376" text-anchor="middle" font-size="12" fill="#4B5563">3 Rules · Pages On Silence</text>
            <rect x="260" y="336" width="200" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="360" y="360" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Grafana Dashboard</text>
            <text x="360" y="376" text-anchor="middle" font-size="12" fill="#4B5563">5 Panels</text>
            <path d="M 170,296 L 170,316 L 120,316 L 120,336" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <path d="M 170,296 L 170,316 L 360,316 L 360,336" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2s" repeatCount="indefinite" path="M 500,104 L 500,144"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.6s" repeatCount="indefinite" path="M 500,104 L 500,124 L 170,124 L 170,144"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.6s" repeatCount="indefinite" path="M 500,104 L 500,124 L 830,124 L 830,144"></animateMotion></circle>
            <circle r="3" fill="#4B5563"><animateMotion dur="2s" repeatCount="indefinite" path="M 170,200 L 170,240"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 170,296 L 170,316 L 120,316 L 120,336"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.8s" repeatCount="indefinite" path="M 170,296 L 170,316 L 360,316 L 360,336"></animateMotion></circle>
          </svg>

`drift_drift` is a per-resource gauge — one time series per Deployment, ConfigMap, and Secret, labeled with app, service, and both releases, so a single Grafana query can show exactly which resource diverged and when. Three alert rules ride on top of it, and the plain-text version is validated the same way you'd validate any Prometheus rules file:

infra/drift/prometheus/rules.ymlpromtool

```bash
$ promtool check rules infra/drift/prometheus/rules.yml
Checking infra/drift/prometheus/rules.yml
  SUCCESS: 3 rules found
```

That check is also a real pytest integration test, not just a manual command:

| Alert | Condition | Severity |
| --- | --- | --- |
| DriftDetectorWatchdog | vector(1) — always firing | dead-man's-switch |
| DriftDetected | sum(drift_drift) by (app, service) > 0 for 5m | warning |
| DriftScanFailing | drift_up == 0 or absent(drift_up) for 5m | critical |

## 7 The dashboard

The dashboard itself lives as one portable JSON file — `dashboard.json` — usable by any Grafana instance in any deployment mode, plus a thin `grafana_dashboard: "1"`\-labeled ConfigMap that wraps the same JSON for the in-cluster sidecar to pick up automatically. Five panels, each answering a question an on-call human would actually ask:

Drifted vs In-Sync

Timeseries

drift\_drifted\_services\_total

Scan Rate

Timeseries

rate(drift\_up\[5m\])

Detector Up

Stat

drift\_up

Since Last Successful Scan

Stat

time() - drift\_last\_scan\_timestamp\_seconds

Drift By Service

Table

drift\_drift == 1

## 8 Making it actually deployable

None of the above matters if the thing can't run in a cluster. Before this, the only way to start the detector was `scripts/harness drift watch` from wherever a kubeconfig happened to live. It shipped a `Dockerfile`, a `Deployment` with both probes pointed at `/healthz`, and a `Service` — plus a small unrelated fix found along the way: the deploy script was building the image with a mutable `:latest` tag.

scripts/harness — diffbash

```bash
- DRIFT_IMG="${'$'}{REGISTRY}/drift-detector:latest"
+ DRIFT_IMG="${'$'}{REGISTRY}/drift-detector:${'$'}{VERSION}"
```

**Why it mattered here specifically:** a mutable tag on the one service whose entire job is proving prod and dr are running the same thing would have been an odd hole to leave open.

## 9 Where it landed

Step 1

Issue #1 opened

Acceptance criteria and a tests-required checklist, written before any code.

Step 2

Failing test suite confirmed

ImportError on health\_status — the right failure, for the right reason.

Step 3

Implementation + manifests

Logging, health, ServiceMonitor, PrometheusRule, dashboard, Dockerfile, Deployment, docs.

Step 4

PR #2 opened — Closes #1

18 unit tests + 1 integration test, all green, verified against the actual JUnit XML report files.

Step 5

Independent review, before merge

An acceptance-criteria audit and a test-quality pass — run separately, neither able to see the other's notes — both landed on the same finding: `/healthz`'s HTTP status mapping was untested, and the metrics test only checked a hardcoded string.

Step 6

Gaps closed, merged

Real HTTP-level tests against a live server, a rewritten metrics test that checks actual values instead of a literal, and the missing `drift_last_scan_timestamp_seconds` gauge. 27/27 green, PR #2 merged to main.

**Final count:** 27/27 tests passing, 3 alert rules validated by `promtool`, 5 dashboard panels, and a service that can now be deployed, scraped, probed, and paged on — instead of a script that quietly hoped nothing broke.
