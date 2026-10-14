---
title: "5 — Self-Hosted LLM Tracing with Opik"
date: 2026-08-08
description: "The inference proxy now logs every chat completion to a self-hosted Opik on the k0s cluster — over the opik SDK and over OTLP with OpenInference attributes, with token usage, TTFT and hallucination metadata in every span."
tags: [opik, llm, observability]
draft: false
---

5 of 19 · Self-hosted LLM tracing

The inference proxy now logs every chat completion to a self-hosted Opik on the k0s cluster — over the opik SDK and over OTLP with OpenInference attributes, with token usage, TTFT and hallucination metadata in every span.

<svg viewBox="0 0 840 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two ingestion paths from the proxy into Opik">
      <defs>
        <linearGradient id="c1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f1e9fe"></stop><stop offset="1" stop-color="#ddd0f7"></stop>
        </linearGradient>
        <linearGradient id="c2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#d9f3ec"></stop><stop offset="1" stop-color="#b2ece0"></stop>
        </linearGradient>
        <linearGradient id="c3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fde8f1"></stop><stop offset="1" stop-color="#fbcfe8"></stop>
        </linearGradient>
      </defs>
      <g transform="translate(24,120)">
        <rect x="0" y="0" width="130" height="80" rx="12" fill="url(#c3)" opacity=".75"></rect>
        <text x="65" y="28" text-anchor="middle" font-size="11" font-weight="800" fill="#be185d">opencode / curl</text>
        <text x="65" y="52" text-anchor="middle" font-size="9.5" font-weight="700" fill="#be185d">/v1/chat/completions</text>
      </g>
      <g transform="translate(190,80)">
        <rect x="0" y="0" width="150" height="160" rx="12" fill="url(#c1)" opacity=".7"></rect>
        <text x="75" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="#6d28d9">mlx_metrics_proxy</text>
        <text x="75" y="44" text-anchor="middle" font-size="9" font-weight="600" fill="#6d28d9">:8080 &rarr; mlx_lm.server</text>
        <rect x="10" y="60" width="130" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="75" y="74" text-anchor="middle" font-size="9.5" font-weight="800" fill="#6d28d9">opik SDK trace+span</text>
        <rect x="10" y="96" width="130" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="75" y="110" text-anchor="middle" font-size="9.5" font-weight="800" fill="#6d28d9">OTLP + OpenInference</text>
      </g>
      <g transform="translate(560,80)">
        <rect x="0" y="0" width="240" height="180" rx="12" fill="url(#c2)" opacity=".75"></rect>
        <text x="120" y="22" text-anchor="middle" font-size="11" font-weight="800" fill="#0f766e">Opik (self-hosted)</text>
        <text x="120" y="44" text-anchor="middle" font-size="9" font-weight="600" fill="#0f766e">ClickHouse &middot; MySQL &middot; MinIO &middot; Redis</text>
        <rect x="10" y="60" width="220" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="120" y="74" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0f766e">traces</text>
        <rect x="10" y="96" width="220" height="28" rx="8" fill="#fff" opacity=".9"></rect>
        <text x="120" y="110" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0f766e">otel traces</text>
        <text x="120" y="146" text-anchor="middle" font-size="9" font-weight="600" fill="#0f766e">:32173 NodePort</text>
        <text x="120" y="166" text-anchor="middle" font-size="9" font-weight="700" fill="#0f766e">project = "mlx"</text>
      </g>
      <line x1="160" y1="160" x2="184" y2="160" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="344" y1="154" x2="554" y2="154" stroke="#7c3aed" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="344" y1="190" x2="554" y2="190" stroke="#0f766e" stroke-width="2" stroke-dasharray="5 5">
        <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.1s" repeatCount="indefinite"></animate>
      </line>
      <text x="450" y="138" text-anchor="middle" font-size="9" font-weight="700" fill="#7c3aed">POST /api/v1/private/traces</text>
      <text x="450" y="206" text-anchor="middle" font-size="9" font-weight="700" fill="#0f766e">POST /api/v1/private/otel/v1/traces</text>
    </svg>

Fig 1. Every chat completion crosses the proxy twice into Opik: once as a native SDK trace + LLM span, once as an OTel span stamped with OpenInference attributes. Both land in the same "mlx" project.

## 1 Why a second observability plane

The Prometheus + Grafana layer answers _how fast, how hot, how broken_. It does not answer _what the model was asked, what it replied, and how many tokens that cost_. LLM tracing needs the request payloads — prompts, completions, tool calls, token counts — so this week we stood up [Opik](https://comet.com/docs/opik) (Comet's open-source LLM observability platform) on the k0s cluster and pointed the proxy at it.

**Deploy.** The official `opik/opik` helm chart (2.2.13) on cylon: ClickHouse via the altinity operator, MySQL, MinIO, Redis, a Java backend, a python backend and the React frontend — nine pods, one release, exposed on NodePort `32173`.

**Why not hosted?** This is a self-hosted, RFC1918-only stack. The whole observability story lives in-cluster, so the LLM trace store should too. And the proxy is already OTel-native, so the Opik OTLP ingestion was the natural second path.

## 2 The two ingestion paths

In `mlx_metrics_proxy.py` the request handler now wraps each `POST /v1/chat/completions` twice:

**Path A — opik SDK.** A native `trace(name="mlx.chat.completions")` with one LLM `span(type="llm", model, provider="mlx")`. Input is the request (model, stream, temperature, tools, messages); output and `usage` come back from the response; metadata carries `node`, `ttft_seconds`, `generation_seconds`, `hallucination_risk` and `hallucination_flagged`.

**Path B — OTLP + OpenInference.** The proxy's OTel span gets the OpenInference semantic-convention attributes (`openinference.span.kind="LLM"`, `input.value`, `output.value`, `llm.model_name`, `llm.token_count.*`, `metadata`) and is exported over OTLP HTTP to `/api/v1/private/otel/v1/traces` with the `projectName: mlx` header.

Two paths means two traces per request (one per route) — deliberate redundancy, and a good way to cross-check that both the SDK and the OTLP pipe produce identical numbers.

## 3 The three bugs that cost a morning

### 3a. The SDK's update overtook its own create

Traces appeared in the UI with `name: None`, `start_time: 1970-01-01` and empty input. Packet capture showed the SDK's `PATCH /traces/<id>` was hitting the backend _before_ the `POST /traces` that created it. The backend's create is idempotent — it does not backfill fields once the trace exists — so the create silently lost the name/input/start\_time. The fix is one line: `_OPIK.flush()` immediately after creating the trace and span, forcing the create POSTs out before any update is queued.

```bash
opik_trace = _OPIK.trace(name="mlx.chat.completions", input={...})
opik_span  = opik_trace.span(type="llm", model=model, provider="mlx", input={...})
_OPIK.flush()          # create FIRST, or the backend never backfills name/input
```

### 3b. The host needs a trailing /api

The frontend nginx only proxies `/api/v1/private/...`; the SDK posts to `<host>/v1/private/...`. Without the suffix every call is a 405. The proxy now appends `/api` to `--opik-endpoint` automatically.

### 3c. OpenInference's prefixed vs unprefixed attributes

`openinference.span.kind` is prefixed, but the content attributes are not. Our first OTLP spans used `openinference.input.value` — the backend stored them as opaque attributes and classified the span `general`. With the modern conventions (`input.value`, `output.value`, `llm.model_name`, `llm.token_count.prompt`) the same span renders as `type: llm` with model, prompt, completion and usage all extracted.

## 4 Proof on the wire

Three real requests through the live proxy against the distributed Qwen3 model produced traces in the `mlx` project within a second:

| Request | Reply | tokens in/out | metadata |
| --- | --- | --- | --- |
| capital of France | `Paris` | 24 / 2 | risk 0.0 · not flagged |
| count 1 to 5 (stream) | `1 2 3 4 5` | 8 / 5 | TTFT 0.89s · gen 1.46s |
| weather in Paris (tools) | tool call `get_weather(city="Paris")` | — | gen 3.5s |

![Opik trace detail for the tool-calling request](/assets/blog/opik-llm-tracing/opik-trace.png)

Fig 2. The trace detail page: `mlx.chat.completions` → `chat.completions` LLM span, model Qwen3-1.7B-4bit, 3.5s duration, with the prompt "What is the weather in Paris?" and the full trace table on the right.

![Opik project traces table](/assets/blog/opik-llm-tracing/opik-projects.png)

Fig 3. The `mlx` project log view — 14 traces, one per chat completion per ingestion path, searchable by content.

## 5 What the spans actually contain

Fetching the SDK span for the tool-calling request:

```json
{
  "name": "chat.completions", "type": "llm",
  "model": "mlx-community/Qwen3-1.7B-4bit", "provider": "mlx",
  "input":  {"model": ..., "temperature": 0.1, "tools_provided": true,
             "messages": [{"role": "user", "content": "What is the weather in Paris?"}]},
  "output": {"content": "", "tool_calls": 1, "usage": {...}},
  "usage":  {"prompt_tokens": 5, "completion_tokens": 3, "total_tokens": 8},
  "metadata": {"node": "rank0", "ttft_seconds": 0.89, "generation_seconds": 1.46,
               "hallucination_risk": 0.0, "hallucination_flagged": false}
}
```

The OTLP-ingested sibling span carries the same numbers under OpenInference keys (`llm.token_count.prompt` → the `usage` object), which cross-validates both paths.

✓

**Notable:** the MySQL-on-NFS failure from last session is why Opik's database lives on local storage. Chart's official `mysql:8.4.2` image with Bitnami paths took ~3.5 min to init on NFS and kept getting killed by the liveness probe — a static local PV fixed it permanently.

> The lesson that kept repeating: "it works, but the fields are gone" is usually a write-ordering bug, not a parse bug. Capture the wire order before blaming the schema.
