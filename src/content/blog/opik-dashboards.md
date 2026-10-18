---
title: "17 — Opik Custom Dashboards: The mlx Project Gets a Live View"
date: 2026-08-08
description: "Post 5 traced every request into Opik and post 6 added the online feedback loop that scores each one. The question we finally answered: can Opik itself turn that data into a dashboard we keep, share and version — no Grafana import needed? Yes — and the answer is a 120-line idempotent script in the"
tags: [opik, observability]
cover: "assets/images/covers/opik-dashboards.svg"
draft: false
---

17 of 19 · the Opik-native surface

Post 5 traced every request into Opik and post 6 added the online feedback loop that scores each one. The question we finally answered: can Opik itself turn that data into a dashboard we keep, share and version — no Grafana import needed? Yes — and the answer is a 120-line idempotent script in the repo.

## 1The ask: dashboards where the traces already are

The Grafana surface (posts 3, 7, 12) reads _metrics_. But the request-level truth — latency, token usage, cost, and the judge scores from post 6 — lives in Opik as _traces_, in the `mlx` project. Post 12 wanted the fault ledger in Grafana because that was the only surface that could show it. The same question applies to Opik: **can we add custom dashboards in Opik?** The answer is yes, and the deployment already proves it:

```bash
$ curl -s http://192.0.2.10:32173/api/v1/private/dashboards
{"content":[],"page":1,"size":0,"total":0,...}
```

An empty list — the endpoint is live, sortable by `type`, and simply unused. Two probes mapped the real surface: `/api/dashboards` is a 404 and `/api/v1/private/dashboards/types` does not exist (no enum endpoint), so the contract has to be read from the SDK source rather than discovered.

## 2Two surfaces, one API

Opik exposes dashboards at two levels, and confusing them sends you hunting for a widget that cannot exist:

| Surface | Type | Widgets | Scope |
| --- | --- | --- | --- |
| Workspace **Dashboards** page | `multi_project` / `experiments` | Time series, single metric, Markdown — plus Metrics line/bar/radar & Leaderboard for experiments | workspace or one project |
| Per-project **Insights** tab | built-in read-only Project Overview | trace volume, errors, latency, cost, feedback scores, thread activity | one project, auto-scoped |

Both write through the same REST API; the SDK type `DashboardType` only has `multi_project` and `experiments`, and a `multi_project` dashboard created with a `project_name` becomes the project-scoped kind. The important consequences:

-   **Widget types are checked against the dashboard type** — `TEXT_MARKDOWN`, `PROJECT_METRICS` and `PROJECT_STATS_CARD` are valid on `multi_project`; experiment-only widgets are rejected at construction time, not at render time.
-   **Feedback scores are first-class metrics**. The `project_stats_card` metric accepts the dynamic `feedback_scores.<name>` form — so the judge scores from post 6 (`correctness`, `helpfulness`, `hallucination_free`) are just card metrics with no special wiring.
-   **Breakdown is typed.** Trace metrics break down by tags/name/error; span metrics add `model`, `provider`, `type` — which is exactly where the proxy’s stamped `model` metadata lands.

## 3The SDK path and the two gotchas

The local SDK is 2.2.13 — the same version as the deployed backend — and ships full dashboard support: `Opik.create_dashboard(...)`, `get_dashboards(...)`, `get_dashboard(...)`, `delete_dashboard(...)`, plus `opik.api_objects.dashboard.types` with the `DashboardType`, `WidgetType`, `ProjectMetricType`, `StatsCardMetric`, `BreakdownField` and `ChartType` enums. Two things were only learnable by running it:

!**Gotcha 1 — the base URL needs `/api`.** `Opik(host="http://192.0.2.10:32173")` makes the SDK request `/v1/private/dashboards` relative to the bare host, and the frontend nginx answers with the SPA’s `index.html` — you get a `JSONDecodeError` with an HTML body. Self-hosted clients must pass `http://192.0.2.10:32173/api` (the evaluator already used the full `/api/v1/private` REST path for the same reason).

!**Gotcha 2 — widgets and layout are cross-validated.** Every widget id must appear in exactly one `layout` item in the same section, and no layout item may reference a missing widget. The dashboard config is a raw blob the wrapper PATCHes back, so ids must be generated once and reused in both lists.

Also worth noting: the models are pydantic with `extra="allow"` and a snake\_case→camelCase alias, so fields the backend needs but the model does not declare (like the stats-card `metric_name` and `stats`) still serialize correctly on the wire.

## 4The dashboard we built

Everything landed in one file, `tools/opik_dashboards.py`, which is idempotent: it looks up the dashboard by name, deletes it if present, and recreates it — so the definition in the repo is the source of truth and a re-run re-provisions the live instance. The dashboard is **project-scoped to `mlx`** (created with `project_name="mlx"`), type `multi_project`, name **“mlx: serving health & quality”**, with two sections:

| Section | Widget | Config |
| --- | --- | --- |
| **Overview** | Markdown banner | what the project is and how the scores are written |
| 10 single-metric cards | `trace_count` · `duration.p50/.p90/.p99` · `error_count` · `usage.total_tokens` · `total_estimated_cost_sum` · `feedback_scores.correctness/.helpfulness/.hallucination_free` |
| **Trends** | Trace volume | `TRACE_COUNT`, line |
| Trace duration | `DURATION`, line |
| Token usage | `TOKEN_USAGE`, line |
| Estimated cost | `COST`, line |
| Error rate | `TRACE_ERROR_RATE`, line |
| LLM spans by model | `SPAN_COUNT`, line, breakdown by `model` (span-level metadata) |

```bash
$ OPIK_BASE_URL=http://192.0.2.10:32173/api python tools/opik_dashboards.py
[dashboards] created 'mlx: serving health & quality' -> 019fd63d-ad7c-749c-a246-cf980a76a4df
[dashboards] verified: id=019fd63d-ad7c-749c-a246-cf980a76a4df name='mlx: serving health & quality'
```

## 5Verification: the config round-trips

Re-reading the live dashboard through `GET /api/v1/private/dashboards` confirms every widget came back intact — the backend stored the config as sent, including the dynamic feedback-score metrics and the model breakdown:

```bash
dashboard: mlx: serving health & quality  type= multi_project
  project_id= 019fc8bf-ce1c-7047-be58-a50900b4621a   # = the mlx project
  section: Overview
    text_markdown   | header
    project_stats_card | Total traces | trace_count
    project_stats_card | Latency p50  | duration.p50
    ... project_stats_card | Correctness | feedback_scores.correctness
    ... project_stats_card | Hallucination-free | feedback_scores.hallucination_free
  section: Trends
    project_metrics | Trace volume    | TRACE_COUNT
    project_metrics | Trace duration  | DURATION
    project_metrics | Token usage     | TOKEN_USAGE
    project_metrics | Estimated cost  | COST
    project_metrics | Error rate      | TRACE_ERROR_RATE
    project_metrics | LLM spans by model | SPAN_COUNT | breakdown= model
```

Because the `mlx` project has a stream of traces (post 5) and every one carries the judge scores (post 6), the dashboard is not a scaffold — it starts populated, and a browser at the dashboard URL is a live view that updates as requests flow.

## 6Where this leaves the stack

-   **Grafana stays the metrics surface** (posts 3, 7, 12) — VM-stored hardware, engine and fault-ledger counters.
-   **Opik is now a first-class dashboard surface too**, scoped to the traces and judge scores that never touch VictoriaMetrics.
-   **The script is the provisioner**, in the same spirit as post 12’s `apply-dashboards.sh` for Grafana: edit the repo, re-run, done.

✓Closed loop: trace every request (post 5) → score it (post 6) → render it natively in Opik (this post). The mlx project’s health & quality view is live at `192.0.2.10:32173`.
