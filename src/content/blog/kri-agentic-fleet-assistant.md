---
title: "From RAG to Agentic: How We Let an LLM Touch a 920-Node Fleet — Safely"
date: 2026-06-09
description: "Continuing the kri fleet assistant story: the bugs that shipped after RAG landed, the agentic design we red-teamed before building, a 6-persona audit that found the control plane was broken, and the safety model for letting an LLM act on real infrastructure."
tags: [agents, kri, llm, saltstack]
cover: "assets/images/covers/kri-agentic-fleet-assistant.svg"
draft: false
---

The previous post built kri's RAG pipeline: pgvector, nomic embeddings, BM25 + cosine Reciprocal Rank Fusion, grounding rules, citations. This post picks up where it left off — with the bugs that shipped the moment that pipeline hit production, the agentic design we red-teamed before writing a single line of implementation code, a 6-persona audit that discovered the entire control plane was silently broken, and the safety model we settled on for letting a language model act on real infrastructure.

## 1\. The RAG Foundation

The prior post ([Building a Robust RAG Pipeline for Fleet Management](../2026-05-31-rag-for-kri-fleet-assistant.html)) designed the full retrieval stack: a seven-source data taxonomy (nodes, groups, Salt states, SLS files, playbook runs, playbook definitions, events), per-source chunking strategies that preserve structural boundaries, a 768-dimensional nomic-embed-text model running locally on the exo box, hybrid BM25 + cosine retrieval fused with RRF, live-state injection for volatile data, and a grounding-rules-last context assembly that forces the model to cite what it uses.

The architecture was sound. The bugs came from the gap between architecture and implementation.

768

embedding dims (nomic-embed-text)

500

every message on first deploy

4

red-team principals pre-build

6

personas in control plane audit

2

silent infra failures caught

2

approval layers before Salt runs

## 2\. Bugs That Shipped

Shipping a RAG post without admitting what broke feels dishonest. Two bugs hit within hours of the assistant going live. Both were preventable with better type discipline and better error surfacing. Neither was subtle.

### Bug 1: IPv4Address Is Not a String

The context builder pulled each node's record from the database and assembled a human-readable summary table by iterating over fields and calling `_sanitize_cell(value)`. That function called `value.replace(...)` to strip control characters. PostgreSQL's `INET` column comes back from SQLAlchemy as a Python `IPv4Address` object, not a string. `IPv4Address` has no `.replace()` method. Result: every single chat message — even "hello" — returned HTTP 500.

Root Cause

`_sanitize_cell` assumed everything was a string. The fix is one line: coerce to `str(value)` before any string operation. The lesson: database types are not Python primitive types. SQLAlchemy gives you objects. Treat them as such.

INET column

→

IPv4Address object

→

value.replace() → AttributeError

→

HTTP 500

INET column

→

str(IPv4Address)

→

"192.0.2.23"

→

Sanitized, included in context

### Bug 2: Opaque 404 from the LLM Endpoint

The exo box (`192.0.2.23:52415`) had stopped serving the model name that was baked into the assistant config. The request went out, the endpoint returned HTTP 404, and the assistant swallowed it — surfacing only a generic "the assistant is unavailable" message with no hint of cause.

The fix has two parts. First, propagate the actual response body from the LLM endpoint into the error the user sees — "Model 'llama-3.2-3b' not found. Available: \['llama-3.3-70b'\]" is actionable; "unavailable" is not. Second, degrade context gracefully: a bug in context assembly should not abort the entire request. The assistant can still respond (uselessly, but without 500-ing) if it gets an empty context, and the user can see the real error rather than a stack trace.

Design Rule

Every call to an LLM endpoint must log and propagate the raw response body on non-2xx. Model configuration drift (the model name changes; the endpoint moves) is a routine operational event in a self-hosted fleet. Make it diagnosable in 30 seconds, not 30 minutes.

## 3\. Going Agentic — The Right Way

Read-only RAG is a safety ceiling. "Which node is offline and why?" is answerable from context. "Restart the salt-minion on mm2" is not — it requires an action. The assistant needed a tool interface, but a fleet of Mac Minis running production build workloads is not a sandbox. One wrong `salt '*' cmd.run` call can cascade through a dozen dependent jobs.

The design principle we settled on before writing a single line: **the LLM is an untrusted actor**. It emits intent; the platform decides whether that intent is safe and authorized to execute.

RAG to Agentic — Full Request Flow

<svg viewBox="0 0 820 320" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path>
          </marker>
          <marker id="ah-acc" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path>
          </marker>
          <marker id="ah-red" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#DC2626"></path>
          </marker>
          <marker id="ah-grn" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
          </marker>
        </defs>
        <rect x="24" y="132" width="96" height="56" rx="8" fill="#1a1a3e" stroke="#1a1a3e"></rect>
        <text x="72" y="157" text-anchor="middle" font-size="12" font-weight="700" fill="#f0f0ff" font-family="system-ui">User</text>
        <text x="72" y="174" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui">Message</text>
        <rect x="160" y="60" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="220" y="86" text-anchor="middle" font-size="12" font-weight="600" fill="#111827" font-family="system-ui">RAG Context</text>
        <text x="220" y="102" text-anchor="middle" font-size="10" fill="#4B5563" font-family="system-ui">pgvector + BM25</text>
        <rect x="160" y="204" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="220" y="230" text-anchor="middle" font-size="12" font-weight="600" fill="#111827" font-family="system-ui">Live State</text>
        <text x="220" y="246" text-anchor="middle" font-size="10" fill="#4B5563" font-family="system-ui">Nodes / Alerts</text>
        <rect x="340" y="112" width="120" height="96" rx="8" fill="#eff6ff" stroke="#2563EB" stroke-width="1.5"></rect>
        <text x="400" y="152" text-anchor="middle" font-size="12" font-weight="700" fill="#1e40af" font-family="system-ui">LLM</text>
        <text x="400" y="169" text-anchor="middle" font-size="10" fill="#1e40af" font-family="system-ui">(Untrusted Actor)</text>
        <text x="400" y="185" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">emits tool_calls</text>
        <rect x="520" y="112" width="120" height="96" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="580" y="150" text-anchor="middle" font-size="12" font-weight="700" fill="#111827" font-family="system-ui">Tool</text>
        <text x="580" y="166" text-anchor="middle" font-size="12" font-weight="700" fill="#111827" font-family="system-ui">Interceptor</text>
        <text x="580" y="184" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">kri validates + routes</text>
        <rect x="700" y="64" width="96" height="52" rx="8" fill="#f0fdf4" stroke="#16A34A"></rect>
        <text x="748" y="88" text-anchor="middle" font-size="12" font-weight="700" fill="#14532d" font-family="system-ui">READ</text>
        <text x="748" y="104" text-anchor="middle" font-size="10" fill="#14532d" font-family="system-ui">Auto-run</text>
        <rect x="700" y="204" width="96" height="52" rx="8" fill="#fef2f2" stroke="#DC2626"></rect>
        <text x="748" y="228" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b" font-family="system-ui">WRITE</text>
        <text x="748" y="244" text-anchor="middle" font-size="10" fill="#991b1b" font-family="system-ui">Approval gate</text>
        <line x1="120" y1="148" x2="155" y2="92" stroke="#4B5563" stroke-width="1.5" marker-end="url(#ah)"></line>
        <line x1="120" y1="172" x2="155" y2="228" stroke="#4B5563" stroke-width="1.5" marker-end="url(#ah)"></line>
        <line x1="280" y1="88" x2="335" y2="145" stroke="#2563EB" stroke-width="1.5" marker-end="url(#ah-acc)"></line>
        <line x1="280" y1="232" x2="335" y2="187" stroke="#2563EB" stroke-width="1.5" marker-end="url(#ah-acc)"></line>
        <line x1="460" y1="160" x2="515" y2="160" stroke="#4B5563" stroke-width="1.5" marker-end="url(#ah)"></line>
        <line x1="640" y1="140" x2="695" y2="108" stroke="#16A34A" stroke-width="1.5" marker-end="url(#ah-grn)"></line>
        <line x1="640" y1="180" x2="695" y2="212" stroke="#DC2626" stroke-width="1.5" marker-end="url(#ah-red)"></line>
        <path d="M748,64 L748,40 L400,40 L400,112" fill="none" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#ah-grn)"></path>
        <text x="574" y="32" text-anchor="middle" font-size="10" fill="#14532d" font-family="system-ui" font-weight="600">Result injected into next turn</text>
        <circle cx="400" cy="160" r="0" fill="none" stroke="#2563EB" stroke-width="2" opacity="0.8">
          <animate attributeName="r" values="0;38" dur="2s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite"></animate>
        </circle>
        <circle r="4" fill="#2563EB" opacity="0.85">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M72,160 L220,88 L400,160"></animateMotion>
        </circle>
        <circle r="4" fill="#4B5563" opacity="0.85">
          <animateMotion dur="1.8s" begin="0.8s" repeatCount="indefinite" path="M460,160 L580,160"></animateMotion>
        </circle>
        <circle r="4" fill="#DC2626" opacity="0.85">
          <animateMotion dur="1.6s" begin="1.2s" repeatCount="indefinite" path="M640,180 L748,230"></animateMotion>
        </circle>
      </svg>

LLM emits intent; kri intercepts and decides. READ tools execute automatically; WRITE tools require approval.

### Tool Categories

| Category | Examples | Execution | Approval |
| --- | --- | --- | --- |
| **READ** | `get_node_status`, `list_alerts`, `get_process_list` | Auto, from cached DB | None — read-only, safe |
| **WRITE — guarded** | `run_salt_cmd`, `restart_service`, `apply_state` | Dry-run first, then guarded Salt | Two-layer (see §5) |
| **DENIED** | Anything targeting protected targets, `rm -rf`, etc. | Never | Denylist, no override |

## 4\. Tool Adapter Discovery — Why exo Forced a Design Decision

Tool calling is not universal across LLM providers. We needed to probe the actual endpoint before committing to an architecture. The design called for three adapters:

-   **Native `tool_calls`** — structured JSON in the response's tool-use field. Supported by vLLM, Ollama in recent versions, OpenAI-compatible servers.
-   **Anthropic `tool_use`** — Claude's native format, with explicit `input` blocks per tool call.
-   **Universal content-parse fallback** — for models that lack structured tool support and emit JSON inside their text output.

We probed the exo box. exo was running Llama 3.3 70B and emitting tool calls in the Llama 3 native format — a `<|python_tag|>` delimiter followed by a JSON blob inside the `content` field, not a structured `tool_calls` array. This is not the OpenAI tool-calling spec. It settled the design: the universal content-parse fallback was not a graceful degradation path — it was the primary path for the current host model.

Probe Before You Design

Do not assume your LLM endpoint implements the spec you read on GitHub. Send a test request with a tool definition and inspect the raw response body. exo's Llama 3.3 output would have been silently dropped by a naive tool\_calls parser. The content-fallback adapter caught it.

```bash
# Llama native format inside content — NOT structured tool_calls
{
  "choices": [{
    "message": {
      "content": "<|python_tag|>{\"name\": \"get_node_status\", \"parameters\": {\"node_id\": \"mm2\"}}",
      "tool_calls": null   // absent — parse from content
    }
  }]
}
```

## 5\. The Pre-Build Red-Team

Before writing the agentic backend, we put the design in front of four external principals and asked them to break it. The findings changed the architecture materially.

Two-Layer Approval Gate — Write Tool Path

<svg viewBox="0 0 820 260" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="bh" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path>
          </marker>
          <marker id="bh-r" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#DC2626"></path>
          </marker>
          <marker id="bh-g" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
          </marker>
        </defs>
        <rect x="24" y="102" width="100" height="56" rx="8" fill="#1a1a3e" stroke="#1a1a3e"></rect>
        <text x="74" y="127" text-anchor="middle" font-size="12" font-weight="700" fill="#f0f0ff" font-family="system-ui">LLM</text>
        <text x="74" y="143" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui">Proposes action</text>
        <rect x="180" y="102" width="112" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="236" y="127" text-anchor="middle" font-size="12" font-weight="700" fill="#111827" font-family="system-ui">Dry-Run</text>
        <text x="236" y="143" text-anchor="middle" font-size="10" fill="#4B5563" font-family="system-ui">Resolve + preview</text>
        <rect x="352" y="60" width="124" height="140" rx="10" fill="#fffbeb" stroke="#D97706" stroke-width="1.5"></rect>
        <text x="414" y="84" text-anchor="middle" font-size="11" font-weight="700" fill="#78350f" font-family="system-ui" text-decoration="">LAYER 1</text>
        <text x="414" y="102" text-anchor="middle" font-size="12" font-weight="700" fill="#92400e" font-family="system-ui">Operator</text>
        <text x="414" y="118" text-anchor="middle" font-size="10" fill="#78350f" font-family="system-ui">Confirms intent</text>
        <text x="414" y="136" text-anchor="middle" font-size="9" fill="#78350f" font-family="system-ui">"restart salt-minion</text>
        <text x="414" y="150" text-anchor="middle" font-size="9" fill="#78350f" font-family="system-ui">on mm2 — confirm?"</text>
        <text x="414" y="170" text-anchor="middle" font-size="9" fill="#78350f" font-family="system-ui" font-style="italic">summary only</text>
        <text x="414" y="185" text-anchor="middle" font-size="9" fill="#78350f" font-family="system-ui" font-style="italic">(not verbatim args)</text>
        <rect x="536" y="60" width="124" height="140" rx="10" fill="#fef2f2" stroke="#DC2626" stroke-width="1.5"></rect>
        <text x="598" y="84" text-anchor="middle" font-size="11" font-weight="700" fill="#991b1b" font-family="system-ui">LAYER 2</text>
        <text x="598" y="102" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b" font-family="system-ui">Admin Inbox</text>
        <text x="598" y="118" text-anchor="middle" font-size="10" fill="#991b1b" font-family="system-ui">Approves VERBATIM</text>
        <text x="598" y="136" text-anchor="middle" font-size="10" fill="#991b1b" font-family="system-ui">resolved action</text>
        <text x="598" y="154" text-anchor="middle" font-size="9" fill="#991b1b" font-family="system-ui">"salt mm2 service.restart</text>
        <text x="598" y="170" text-anchor="middle" font-size="9" fill="#991b1b" font-family="system-ui">salt-minion" — approve?</text>
        <text x="598" y="187" text-anchor="middle" font-size="9" fill="#991b1b" font-family="system-ui" font-style="italic">exact bytes that run</text>
        <rect x="720" y="102" width="76" height="56" rx="8" fill="#f0fdf4" stroke="#16A34A" stroke-width="1.5"></rect>
        <text x="758" y="127" text-anchor="middle" font-size="11" font-weight="700" fill="#14532d" font-family="system-ui">Guarded</text>
        <text x="758" y="143" text-anchor="middle" font-size="11" font-weight="700" fill="#14532d" font-family="system-ui">Salt Run</text>
        <line x1="124" y1="130" x2="175" y2="130" stroke="#4B5563" stroke-width="1.5" marker-end="url(#bh)"></line>
        <line x1="292" y1="130" x2="347" y2="130" stroke="#D97706" stroke-width="1.5" marker-end="url(#bh)"></line>
        <line x1="476" y1="130" x2="531" y2="130" stroke="#DC2626" stroke-width="1.5" marker-end="url(#bh-r)"></line>
        <line x1="660" y1="130" x2="715" y2="130" stroke="#16A34A" stroke-width="1.5" marker-end="url(#bh-g)"></line>
        <line x1="414" y1="200" x2="414" y2="235" stroke="#DC2626" stroke-width="1.5" marker-end="url(#bh-r)"></line>
        <text x="414" y="251" text-anchor="middle" font-size="11" fill="#991b1b" font-weight="600" font-family="system-ui">Denied → action cancelled</text>
        <circle r="4" fill="#D97706" opacity="0.9">
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M74,130 L236,130 L414,130"></animateMotion>
        </circle>
        <circle r="4" fill="#DC2626" opacity="0.9">
          <animateMotion dur="1.6s" begin="0.9s" repeatCount="indefinite" path="M476,130 L598,130"></animateMotion>
        </circle>
        <circle r="4" fill="#16A34A" opacity="0.9">
          <animateMotion dur="1.4s" begin="1.8s" repeatCount="indefinite" path="M660,130 L758,130"></animateMotion>
        </circle>
        <circle cx="598" cy="130" r="0" fill="none" stroke="#DC2626" stroke-width="2" opacity="0.7">
          <animate attributeName="r" values="0;50" dur="2.5s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="0.7;0" dur="2.5s" repeatCount="indefinite"></animate>
        </circle>
      </svg>

The critical distinction: Layer 1 sees a human-readable summary of intent; Layer 2 approves the exact verbatim bytes that will execute. Social-engineering the summary does not change what runs.

Architect

Redesign Foundation First

The LLM caller (exo / Llama 3.3) did not support the tool-calling protocol at all in the format assumed. There was no foundation to build an agent loop on top of. Fix the adapter layer before any agentic behavior. _Settled: universal content-parse fallback becomes primary path._

Red-Team LLM

Proceed With Changes

Two attack vectors: (1) **summary-vs-verbatim social engineering** — an LLM can propose "restart salt-minion on mm2" in the summary but embed different args in the tool call; fix: Layer 2 must approve verbatim resolved args, never the summary. (2) **Prompt injection via process names/cmdlines** — a cmdline containing `"Ignore previous instructions"` entered the model context.

SRE

Proceed With Changes

The agent loop can't live in a request/response cycle. If a WRITE action pauses for human approval (potentially hours), the HTTP connection is long dead. The loop must be a durable state machine — Celery task or persistent DB state, not an in-memory coroutine. Also: one looping agent query could exhaust the DB connection pool and take down the entire control plane at 2am.

DevOps

Proceed With Changes

Cmdline arguments passed to the model (e.g., `ps aux` output) can contain secrets (tokens, passwords, API keys passed as CLI args). These must be scrubbed before entering model context _and_ before being written to audit logs. The scrubbing must happen at collection time, not at display time.

## 6\. The 6-Persona Control Plane Audit

Before the agentic layer could land, we audited the control plane it would ride on. The agentic design assumes approved actions execute reliably, are observable, and are correctly authorized. None of those assumptions were safe to make without checking.

A 6-persona audit walked every failure mode: Architect, Developer, SRE, QA, Security Auditor, and Operations. The headline finding was stark: **approved actions were not executing at all**. They entered `executing` state and stayed there forever.

Finding 1 — Celery Callback on Wrong Queue

Approved Actions Stuck in "executing" Forever

The result-tracking callback was registered on a Celery queue named `node_actions_result`. No worker was consuming that queue. The approved action dispatched to Salt, Salt ran it, the Celery task completed — but the callback that should have updated the action record to `completed` or `failed` never fired. The action stayed `executing` in the DB until the platform was restarted. Every status check returned a permanent lie.

Finding 2 — salt-api ACL Mismatch

Salt-API ACL Denied the Functions the Actions Needed

The salt-api configuration had a PAM-authenticated ACL that allowed a specific set of Salt functions for the kri service user. The node action executor called `service.restart` and `cmd.run` — neither of which was in the ACL. Every approved action that reached Salt returned a 403-equivalent from salt-api. The execute path was double-broken: first the callback queue was wrong, and even if it hadn't been, Salt would have rejected the call.

Finding 3 — Vacuous Contract Tests

Tests Greping for Strings Gave False Green

The existing "source-contract" tests verified that certain function names existed in the source file using `grep`\-style checks. A function could be completely broken — wrong queue, wrong arguments, wrong return type — and the test would still pass because the symbol was present. These were not behavioral tests. They were presence tests. They provided false confidence across the entire test run.

Resolution

Both Infrastructure Bugs Fixed; Tests Replaced with Behavioral Assertions

The Celery callback was moved to the queue that the worker was actually consuming. The salt-api ACL was updated to permit `service.restart`, `service.status`, `cmd.run`, and `state.apply` scoped to the kri service account. Vacuous grep-based tests were replaced with behavioral tests that mock the Celery/Salt boundary and assert on state transitions, not symbol presence.

Defense-in-Depth — Layers Between LLM and Infrastructure

<svg viewBox="0 0 820 360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="ch" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path>
          </marker>
        </defs>
        <rect x="24" y="24" width="772" height="52" rx="10" fill="#eff6ff" stroke="#2563EB" stroke-width="1.5"></rect>
        <text x="410" y="46" text-anchor="middle" font-size="13" font-weight="700" fill="#1e40af" font-family="system-ui">TRUST BOUNDARY — LLM Is Untrusted</text>
        <text x="410" y="64" text-anchor="middle" font-size="11" fill="#1e40af" font-family="system-ui">Tool calls parsed and validated by kri backend. LLM cannot call Salt or any API directly.</text>
        <rect x="24" y="92" width="772" height="48" rx="10" fill="#fff7ed" stroke="#D97706" stroke-width="1.5"></rect>
        <text x="410" y="112" text-anchor="middle" font-size="13" font-weight="700" fill="#92400e" font-family="system-ui">Protected-Target Denylist</text>
        <text x="410" y="130" text-anchor="middle" font-size="11" fill="#92400e" font-family="system-ui">Hardcoded list of nodes/services that can never be targeted. No override path.</text>
        <rect x="24" y="156" width="772" height="48" rx="10" fill="#f9fafb" stroke="#E5E7EB"></rect>
        <text x="410" y="176" text-anchor="middle" font-size="13" font-weight="700" fill="#111827" font-family="system-ui">Dry-Run Preview</text>
        <text x="410" y="194" text-anchor="middle" font-size="11" fill="#4B5563" font-family="system-ui">Every WRITE action runs in dry-run first. Resolved command shown to operator before any approval is sought.</text>
        <rect x="24" y="220" width="772" height="48" rx="10" fill="#fef2f2" stroke="#DC2626" stroke-width="1.5"></rect>
        <text x="410" y="240" text-anchor="middle" font-size="13" font-weight="700" fill="#991b1b" font-family="system-ui">Two-Layer Approval (Operator Intent + Admin Verbatim)</text>
        <text x="410" y="258" text-anchor="middle" font-size="11" fill="#991b1b" font-family="system-ui">Summary ≠ what executes. Admin approves the exact resolved bytes. Social-engineering the summary is harmless.</text>
        <rect x="24" y="284" width="772" height="48" rx="10" fill="#f0fdf4" stroke="#16A34A" stroke-width="1.5"></rect>
        <text x="410" y="304" text-anchor="middle" font-size="13" font-weight="700" fill="#14532d" font-family="system-ui">Guarded Salt Dispatch + Full Audit Trail</text>
        <text x="410" y="322" text-anchor="middle" font-size="11" fill="#14532d" font-family="system-ui">salt-api ACL enforced at execution. Every action logged with actor, timestamp, verbatim command, and result.</text>
        <line x1="410" y1="76" x2="410" y2="92" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#ch)"></line>
        <line x1="410" y1="140" x2="410" y2="156" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#ch)"></line>
        <line x1="410" y1="204" x2="410" y2="220" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#ch)"></line>
        <line x1="410" y1="268" x2="410" y2="284" stroke="#4B5563" stroke-width="1.5" stroke-dasharray="3,2" marker-end="url(#ch)"></line>
        <circle r="5" fill="#2563EB" opacity="0.85">
          <animateMotion dur="3s" repeatCount="indefinite"
            path="M410,50 L410,116 L410,180 L410,244 L410,308"></animateMotion>
        </circle>
        <circle cx="410" cy="50" r="0" fill="none" stroke="#2563EB" stroke-width="2" opacity="0.6">
          <animate attributeName="r" values="0;60" dur="3s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="0.6;0" dur="3s" repeatCount="indefinite"></animate>
        </circle>
      </svg>

Each layer is independent — a breach of Layer 1 does not bypass Layer 2. Prompt injection that fools the LLM still hits the denylist, still requires both approvals, still runs under salt-api ACL.

## 7\. Behavioral Tests Replace Grep-Based Contracts

The audit's third finding was the least dramatic and the most pervasive. "Source-contract tests" that check whether a function _exists_ tell you nothing about whether it _works_. They are a false safety blanket.

Anti-Pattern: Presence Test

Asserts that `execute_node_action` exists in the module and that the string `"celery"` appears somewhere in the file. This test passes even if the Celery call is wired to the wrong queue, the wrong task signature, or a function that raises on every call.

```bash
# BEFORE: grep-style presence test (useless)
def test_execute_node_action_exists():
    import fleet_platform.services.node_action_svc as svc
    assert hasattr(svc, "execute_node_action")
    # passes even if the function 500s on every call
```

```bash
# AFTER: behavioral test with mocked Celery boundary
async def test_execute_approved_action_updates_state(db, mock_celery):
    action = await create_approved_action(db, node="mm2", cmd="service.restart")
    await execute_node_action(db, action.id)
    await db.refresh(action)
    # assert the state machine transitioned correctly
    assert action.status == "executing"
    mock_celery.apply_async.assert_called_once_with(
        args=[action.id],
        queue="node_actions"  # the queue workers actually consume
    )
```

Rule

Every test must be able to fail if the feature is broken. If you cannot write a scenario where the test fails with a broken implementation, the test proves nothing. Treat tests that can only pass as P1 bugs.

## 8\. The Safety Model

After the red-team, the audit, and the fixes, the safety model crystallized into a small set of principles that generalize beyond this project.

Trust Boundary — LLM vs. Control Plane

<svg viewBox="0 0 820 280" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="dh" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4B5563"></path>
          </marker>
          <marker id="dh-r" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#DC2626"></path>
          </marker>
          <marker id="dh-g" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
          </marker>
        </defs>
        <rect x="24" y="24" width="340" height="232" rx="12" fill="#fef2f2" stroke="#DC2626" stroke-width="2" stroke-dasharray="6,3"></rect>
        <text x="194" y="48" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b" font-family="system-ui" text-transform="uppercase">UNTRUSTED ZONE</text>
        <rect x="52" y="64" width="120" height="56" rx="8" fill="#1a1a3e" stroke="#1a1a3e"></rect>
        <text x="112" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#f0f0ff" font-family="system-ui">LLM</text>
        <text x="112" y="106" text-anchor="middle" font-size="10" fill="#a5b4fc" font-family="system-ui">Untrusted actor</text>
        <rect x="200" y="64" width="140" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="270" y="86" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">Prompt Injection</text>
        <text x="270" y="102" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Process names, cmdlines</text>
        <text x="270" y="116" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">user text → model context</text>
        <rect x="52" y="148" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="112" y="170" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">Secret Leakage</text>
        <text x="112" y="186" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Tokens in cmdline args</text>
        <text x="112" y="200" text-anchor="middle" font-size="9" fill="#DC2626" font-family="system-ui">Scrub at collection</text>
        <rect x="200" y="148" width="140" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="270" y="169" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">Social Engineering</text>
        <text x="270" y="185" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Summary ≠ verbatim args</text>
        <text x="270" y="200" text-anchor="middle" font-size="9" fill="#DC2626" font-family="system-ui">Admin approves exact bytes</text>
        <line x1="388" y1="24" x2="388" y2="256" stroke="#4B5563" stroke-width="2" stroke-dasharray="5,3"></line>
        <text x="388" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#4B5563" font-family="system-ui">TRUST BOUNDARY</text>
        <rect x="412" y="24" width="384" height="232" rx="12" fill="#f0fdf4" stroke="#16A34A" stroke-width="2" stroke-dasharray="6,3"></rect>
        <text x="604" y="48" text-anchor="middle" font-size="12" font-weight="700" fill="#14532d" font-family="system-ui" text-transform="uppercase">TRUSTED ZONE</text>
        <rect x="432" y="64" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="492" y="86" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">kri Backend</text>
        <text x="492" y="102" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Validates, routes</text>
        <text x="492" y="116" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">enforces denylist</text>
        <rect x="576" y="64" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="636" y="86" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">Approval Inbox</text>
        <text x="636" y="102" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Durable state machine</text>
        <text x="636" y="116" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">(Celery + DB)</text>
        <rect x="432" y="148" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="492" y="170" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">Salt-API ACL</text>
        <text x="492" y="186" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">PAM-authenticated</text>
        <text x="492" y="200" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Function allowlist</text>
        <rect x="576" y="148" width="120" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
        <text x="636" y="170" text-anchor="middle" font-size="11" font-weight="600" fill="#111827" font-family="system-ui">Audit Log</text>
        <text x="636" y="186" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Actor, cmd, result</text>
        <text x="636" y="200" text-anchor="middle" font-size="9" fill="#4B5563" font-family="system-ui">Immutable, timestamped</text>
        <line x1="364" y1="92" x2="428" y2="92" stroke="#DC2626" stroke-width="2" marker-end="url(#dh-r)"></line>
        <text x="396" y="86" text-anchor="middle" font-size="9" fill="#991b1b" font-weight="600" font-family="system-ui">tool_call</text>
        <line x1="552" y1="92" x2="571" y2="92" stroke="#4B5563" stroke-width="1.5" marker-end="url(#dh)"></line>
        <line x1="552" y1="176" x2="571" y2="176" stroke="#4B5563" stroke-width="1.5" marker-end="url(#dh)"></line>
        <line x1="492" y1="120" x2="492" y2="148" stroke="#16A34A" stroke-width="1.5" marker-end="url(#dh-g)"></line>
        <line x1="636" y1="120" x2="636" y2="148" stroke="#16A34A" stroke-width="1.5" marker-end="url(#dh-g)"></line>
        <circle cx="492" cy="92" r="0" fill="none" stroke="#16A34A" stroke-width="2" opacity="0.7">
          <animate attributeName="r" values="0;44" dur="2.8s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="0.7;0" dur="2.8s" repeatCount="indefinite"></animate>
        </circle>
        <circle r="4" fill="#DC2626" opacity="0.9">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M112,92 L364,92 L492,92"></animateMotion>
        </circle>
        <circle r="4" fill="#16A34A" opacity="0.9">
          <animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M492,120 L492,176 L552,176 L636,176"></animateMotion>
        </circle>
      </svg>

The trust boundary is enforced by the kri backend, not by the LLM. Anything the LLM does inside the untrusted zone is subject to full validation before it crosses the boundary.

| Principle | What It Prevents | Implementation |
| --- | --- | --- |
| **LLM is untrusted** | Treating model output as authoritative | All tool calls validated and routed by kri backend, never executed directly |
| **Approve verbatim bytes** | Summary/args divergence attack | Layer 2 inbox shows exact resolved command; summary is for UX only |
| **Durable state machine** | In-memory agent loop dying on HTTP timeout | Celery task + DB state columns; actions survive restarts |
| **Protected denylist** | LLM targeting critical infra | Hardcoded at backend; no override path |
| **Scrub secrets at collection** | Tokens/passwords entering model context or audit logs | Process cmdlines redacted before storage and before context assembly |
| **Rate-limit agentic queries** | Loop query exhausting DB pool (2am cascade) | Per-user per-minute rate limit on agent endpoints |
| **Behavioral tests only** | False confidence from presence tests | Every test has a scenario that fails if the feature is broken |

## 9\. Lessons

Building an agentic layer on top of real infrastructure surfaced patterns that generic "build an AI agent" tutorials skip entirely, because they run against sandboxes.

### Probe Before You Design

We assumed exo would emit structured `tool_calls`. It did not. We discovered this by sending a test request and inspecting the raw JSON. Had we not probed, the entire adapter layer would have silently swallowed every tool call and returned a confused non-answer. Probe every integration at the protocol level before building on top of it.

### Adversarial Review Before Implementation

The red-team found the summary-vs-verbatim attack before we wrote a single approval UI element. Finding it in a design doc costs nothing. Finding it in production after a rogue action runs on a build node costs a great deal. The four principals had a combined 20 minutes of review time and prevented at least two material security issues.

### Tests That Can Only Pass Are Bugs

The Celery queue mismatch was invisible for months because the source-contract tests said everything was fine. They checked that a function existed. The function existed. The tests passed. The feature was completely broken. The audit discovered it by asking "what happens when an approved action runs?" — a question the test suite had never asked.

### Infrastructure Assumptions Must Be Verified

We designed the agentic approval flow assuming the underlying executor worked. It did not — the salt-api ACL rejected every call, and the callback queue had no consumer. "The control plane is ready" was an assumption, not a fact. Verify the substrate before building on top of it, especially when the substrate is a distributed system with multiple failure points (Celery workers, salt-api, PAM authentication, queue consumers).

Where We Landed

A RAG-grounded fleet assistant that can propose actions, run them through dry-run, send them through two independent approval layers, execute them via guarded Salt dispatch, and record an immutable audit trail — all without the LLM having direct access to any execution primitive. The control plane bugs that would have made it silently non-functional are fixed. The vacuous tests that hid them are replaced with behavioral assertions. The red-team's attacks are mitigated in the design, not patched after the fact.

The safety model is not novel. It is the same principle used in every secure system: **trust is a property of the verification layer, not of the actor**. The LLM is an actor. kri is the verification layer. They do not share trust.

* * *

Part of the kri fleet platform engineering series. The RAG foundation is covered in [Building a Robust RAG Pipeline for Fleet Management](../2026-05-31-rag-for-kri-fleet-assistant.html). Agentic concepts and MCP are covered in [Agentic AI, MCP & Gateways — Complete Visual Guide](../2026-06-08-agentic-mcp-gateways/2026-06-08-agentic-mcp-gateways.html).
