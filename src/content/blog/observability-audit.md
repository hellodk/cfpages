---
title: "4 — What an External Observability Audit Found"
date: 2026-08-08
description: "An outside pass over the whole stack came back with two accepted criticals and nine findings we actually fixed — from double-counted OTel metrics and NaN gauges to stale series and dashboard provisioning drift."
tags: [observability, audit]
draft: false
---

4 of 19 · External review

An outside pass over the whole stack came back with two accepted criticals and nine findings we actually fixed — from double-counted OTel metrics and NaN gauges to stale series and dashboard provisioning drift.

<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Before and after: OTel metric duplication removed">
      <defs>
        <linearGradient id="b1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fde8f1"></stop><stop offset="1" stop-color="#fbcfe8"></stop>
        </linearGradient>
        <linearGradient id="b2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d9f3ec"></stop><stop offset="1" stop-color="#b2ece0"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(30,24)">
        <text x="10" y="0" font-size="12" font-weight="800" fill="#be185d">BEFORE &mdash; the same counter twice</text>
        <rect x="10" y="14" width="300" height="96" rx="12" fill="url(#b1)" opacity=".7"></rect>
        <rect x="22" y="26" width="130" height="26" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="87" y="44" text-anchor="middle" font-size="10.5" font-weight="800" fill="#be185d">proxy scrape</text>
        <rect x="168" y="26" width="130" height="26" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="233" y="44" text-anchor="middle" font-size="10.5" font-weight="800" fill="#be185d">OTLP push</text>
        <rect x="60" y="66" width="200" height="30" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="160" y="86" text-anchor="middle" font-size="10" font-weight="700" fill="#be185d">job="mlx-proxy" + job="mlx-metrics-proxy"</text>
      </g>
      <text x="180" y="158" text-anchor="middle" font-size="11" font-weight="700" fill="#b91c1c">double-counted rates &middot; duplicated series</text>
      <g transform="translate(430,24)">
        <text x="10" y="0" font-size="12" font-weight="800" fill="#0f766e">AFTER &mdash; one path, one job</text>
        <rect x="10" y="14" width="300" height="96" rx="12" fill="url(#b2)" opacity=".7"></rect>
        <rect x="60" y="26" width="200" height="26" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="160" y="44" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f766e">scrape only &middot; traces/logs via OTLP</text>
        <rect x="60" y="66" width="200" height="30" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="160" y="86" text-anchor="middle" font-size="10" font-weight="700" fill="#0f766e">job="mlx-proxy" (clean)</text>
      </g>
      <text x="580" y="158" text-anchor="middle" font-size="11" font-weight="700" fill="#0f766e">stale series purged via delete API</text>
    </svg>

Fig 1. M1/M2 and HW OTLP-1 in one picture: metrics were being counted twice, so we made hardware/inference metrics scrape-only and kept OTLP for traces + logs.

## 1 The accepted criticals

| ID | Severity | Finding | Disposition |
| --- | --- | --- | --- |
| S1 | CRITICAL | The whole stack listens on `0.0.0.0`, LAN-exposed (RFC1918) | **Accepted.** Documented; closing it needs a reverse proxy + auth, which is a separate workstream |
| S2 | CRITICAL | Grafana ships with anonymous Viewer + `admin/admin` | **Accepted.** Same fix: auth in front of Grafana |

⚠

**Transparency note.** We took the honest option: these are real findings, not papered over. The README documents the exposure and the accepted risk until the auth workstream lands.

## 2 Fixed: the metrics were counted twice

**M1 / M2 — proxy OTel metrics removed.** The proxy exported every counter both as a scrape target and through OTLP, so VM held `job="mlx-proxy"` _and_ `job="mlx-metrics-proxy"` with identical values. We deleted the gauge/histogram OTel instruments and the metrics MeterProvider entirely — only traces and logs stay on OTLP. A separate `mlx-metrics-proxy` scrape job was removed from the collector pipeline.

**HW OTLP-1 — the hw agent's OTel loop deleted.** Its observable-gauge callbacks could only be used once, which produced `NaN`. The whole `_otel_loop()`, the `--otlp-endpoint` arg and the `OTLP_ENDPOINT` global are gone; the exporter is scrape-only.

**M4 — heuristics got a `model` label.** `H_REPETITION`, `H_REFUSAL`, `H_HEDGE` and `H_UNGROUNDED` now carry `model`, and `composite_risk(model, ...)` keeps the per-model view the quality rules need. Refusal weight dropped from 0.9 to 0.25 — refusing a prompt is the opposite of hallucinating.

**M3 — GPU memory pressure now correct.** The rule uses `mlx_hw_gpu_mem_alloc_bytes` (allocated, not used), `clamp_min(...,0)`, and only fires when total memory is actually reported.

## 3 Fixed: alert hygiene and stack liveness

**A1 — filters, gates and one baseline.** Every error, TTFT, generation, token, correlation and in-flight series and all hallucination alert rules are now scoped to `{job="mlx-proxy"}` (no more surprise series). Quality rules are gated with `and sum(rate(mlx_requests_total{job="mlx-proxy"}[10m])) by (model) > 0` so a freshly launched, idle model can't fire hallucination alerts. The throughput-drop baseline was raised above 5 tok/s.

**A3 / M6 — the stack now watches itself.** New `*Down` alerts (victoria-metrics, vmalert, alertmanager) backed by a VM self-scrape config that also targets `vmalert:8880` and `alertmanager:9093`. One target was dropped when the collector image proved not to expose its self-metrics on `:8888`.

**AM — Alertmanager got teeth.** An `oncall` receiver for criticals and a `default` webhook, plus `inhibit_rules`: proxy-down silences the upstream/throughput/stall cascade, and hw-exporter-down silences that node's GPU/thermal/load alerts.

## 4 Fixed: dashboard drift

**D1 — the cluster dashboard was lying about its source.** A DB-managed copy had been edited in the UI and diverged from its JSON file, so provisioning was meaningless. We deleted the DB copies, set `disableDeletion: true` and `allowUiUpdates: false`, and confirmed `provisioned=True` with every dashboard anonymous-readable via the DTO endpoint.

## 5 Post-audit verification

✓

**All green:** `up{job="mlx-proxy",node="rank0"}==1`, TTFT histogram quantiles resolve (`histogram_quantile(0.95, ...)`), both hw agents up, all 28 rules report `health=ok`, exactly one alert firing (the genuine 91.6%-full disk), and the `mlx-metrics-proxy` series are gone from VM after a delete-API sweep.

> The uncomfortable pattern the audit caught: two sources for the same signal, and rules that could fire without traffic. Both are now structurally impossible, not just tuned away.
