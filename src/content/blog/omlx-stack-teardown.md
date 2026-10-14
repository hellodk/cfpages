---
title: "oMLX Over MLX — Complete Visual Guide"
date: 2026-08-22
description: "What MLX, mlx-lm and oMLX each own, which layer oMLX actually replaces, and three findings from reading the code: a dead SLO subsystem, an auth model with no principal, and a Thunderbolt 4 misclassification."
tags: [mlx, llm, apple-silicon, inference]
cover: "assets/images/covers/omlx-stack-teardown.svg"
draft: false
---

What each layer owns · which one oMLX actually replaces · and three features that only look finished · measured at HEAD, 22 Aug 2026

## The Stack

### Three Layers, One Uncomfortable Question

"Why does oMLX exist on top of MLX" is a trivial question — MLX is an array framework, it cannot serve HTTP. **"Why does oMLX exist on top of mlx-lm"** is the real one, because mlx-lm already ships a working OpenAI-compatible server, and oMLX runs that server, unmodified, on every node of a multi-Mac cluster. Answering it properly means laying out who owns what first.

The Three Layers — What Each One Owns

<svg viewBox="0 0 900 452" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Stacked diagram: oMLX above mlx-lm above MLX">
      <defs>
        <marker id="k1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="q1a" d="M 450 162 L 450 196"></path><path id="q1b" d="M 450 293 L 450 326"></path>
      </defs>
      <rect width="900" height="452" fill="#FFFFFF"></rect>
      <rect x="70" y="40" width="760" height="122" rx="12" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <rect x="70" y="40" width="760" height="26" rx="10" fill="#44403C"></rect>
      <rect x="70" y="56" width="760" height="10" fill="#44403C"></rect>
      <text x="94" y="59" font-size="12" font-weight="700" fill="#FFFFFF">THE FORK</text>
      <text x="94" y="92" font-size="15" font-weight="700" fill="#1C1917">oMLX</text>
      <text x="94" y="112" font-size="12" fill="#57534E">Cache Policy · Admission Policy · Multi-Model Lifecycle · Product Surface</text>
      <rect x="86" y="124" width="112" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="142" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#292524">Paged Cache</text>
      <rect x="206" y="124" width="112" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="262" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#292524">Scheduler</text>
      <rect x="326" y="124" width="112" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="382" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#292524">Engine Pool</text>
      <rect x="446" y="124" width="112" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="502" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#292524">HTTP APIs</text>
      <rect x="566" y="124" width="112" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="622" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#292524">Admin UI</text>
      <rect x="686" y="124" width="112" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="742" y="144" text-anchor="middle" font-size="12" font-weight="600" fill="#292524">Cluster</text>
      <circle cx="806" cy="84" r="5" fill="#44403C"></circle>
      <circle cx="806" cy="84" r="5" fill="none" stroke="#44403C" stroke-width="1.5">
        <animate attributeName="r" values="5;20" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.4s" repeatCount="indefinite"></animate></circle>
      <line x1="450" y1="162" x2="450" y2="196" stroke="#44403C" stroke-width="2" marker-end="url(#k1)"></line>
      <text x="464" y="180" font-size="12" font-weight="600" fill="#57534E">Calls Into</text>
      <circle r="4" fill="#44403C"><animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#q1a" xlink:href="#q1a"></mpath></animateMotion></circle>
      <rect x="70" y="202" width="760" height="91" rx="12" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="94" y="230" font-size="15" font-weight="700" fill="#1C1917">mlx-lm</text>
      <text x="94" y="250" font-size="12" fill="#57534E">Model Implementations · Batched Generation · Tokenizers — And Its Own Server</text>
      <rect x="90" y="260" width="136" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="158" y="277" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">BatchGenerator</text>
      <rect x="236" y="260" width="136" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="304" y="277" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">Model Zoo</text>
      <rect x="382" y="260" width="136" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="450" y="277" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">KVCache</text>
      <rect x="528" y="260" width="136" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="596" y="277" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">Tokenizers</text>
      <rect x="674" y="260" width="136" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="742" y="277" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">mlx_lm.server</text>
      <line x1="450" y1="293" x2="450" y2="326" stroke="#44403C" stroke-width="2" marker-end="url(#k1)"></line>
      <text x="464" y="311" font-size="12" font-weight="600" fill="#57534E">Calls Into</text>
      <circle r="4" fill="#44403C"><animateMotion dur="1.8s" begin=".9s" repeatCount="indefinite"><mpath href="#q1b" xlink:href="#q1b"></mpath></animateMotion></circle>
      <rect x="70" y="332" width="760" height="95" rx="12" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="94" y="360" font-size="15" font-weight="700" fill="#1C1917">MLX</text>
      <text x="94" y="380" font-size="12" fill="#57534E">Array Framework · Autodiff · Metal Kernels · Collectives — No Serving Concept At All</text>
      <rect x="92" y="390" width="170" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="177" y="407" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">mx.array</text>
      <rect x="274" y="390" width="170" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="359" y="407" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">nn Modules</text>
      <rect x="456" y="390" width="170" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="541" y="407" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">Metal Kernels</text>
      <rect x="638" y="390" width="170" height="26" rx="5" fill="#F5F5F4" stroke="#E7E5E4"></rect><text x="723" y="407" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">Distributed</text>
    </svg>

## How Tightly These Are Bolted Together

The MLX checkout contains four Python subpackages — `nn`, `optimizers`, `utils`, `_distributed_utils`. That is PyTorch's role in this stack, not vLLM's.

oMLX's dependency on mlx-lm is not a loose one. `pyproject.toml` pins a _commit_, not a release, and the build pins a nanobind ABI:

```bash
# dependencies
"mlx==0.32.0",
"mlx-lm @ git+https://github.com/ml-explore/mlx-lm@ab1806e8f5d6aa035973af194a1b9198ab4754dc",

# build-system — comment reproduced from pyproject.toml
# A mismatched nanobind isolates the `mlx` NB_DOMAIN, so custom kernel
# extensions (omlx.custom_kernels.*) reject every mlx.core.array at the
# type caster with `incompatible function arguments`.
"nanobind==2.13.0",
```

A commit hash plus an ABI-matched build pin plus a paragraph of justification is what coupling to private internals looks like from the outside.

One Request On One Mac

Follow a single chat completion and the division of labour becomes concrete: oMLX owns the front door, the queue and the cache; mlx-lm owns the batched decode; MLX owns the arithmetic.

Single-Mac Request Path — Who Handles What

<svg viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Request pipeline from client through oMLX scheduler into mlx-lm BatchGenerator and MLX, with the paged cache below">
      <defs>
        <marker id="k2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="q2a" d="M 180 110 L 204 110"></path><path id="q2b" d="M 350 110 L 374 110"></path>
        <path id="q2c" d="M 520 110 L 544 110"></path><path id="q2d" d="M 690 110 L 714 110"></path>
        <path id="q2e" d="M 450 150 L 450 204"></path>
      </defs>
      <rect width="900" height="340" fill="#FFFFFF"></rect>
      <rect x="40" y="70" width="140" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="110" y="104" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Client</text>
      <text x="110" y="126" text-anchor="middle" font-size="12" fill="#57534E">OpenAI Request</text>
      <rect x="210" y="70" width="140" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="280" y="104" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">oMLX API</text>
      <text x="280" y="126" text-anchor="middle" font-size="12" fill="#57534E">omlx/api</text>
      <rect x="380" y="70" width="140" height="80" rx="10" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <rect x="380" y="70" width="140" height="22" rx="10" fill="#44403C"></rect>
      <rect x="380" y="82" width="140" height="10" fill="#44403C"></rect>
      <text x="450" y="86" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">oMLX</text>
      <text x="450" y="118" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Scheduler</text>
      <text x="450" y="138" text-anchor="middle" font-size="12" fill="#57534E">Queue + Admission</text>
      <rect x="550" y="70" width="140" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="620" y="104" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">BatchGenerator</text>
      <text x="620" y="126" text-anchor="middle" font-size="12" fill="#57534E">mlx-lm</text>
      <rect x="720" y="70" width="140" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="790" y="104" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">MLX Metal</text>
      <text x="790" y="126" text-anchor="middle" font-size="12" fill="#57534E">mx.array</text>
      <line x1="180" y1="110" x2="204" y2="110" stroke="#44403C" stroke-width="2" marker-end="url(#k2)"></line>
      <line x1="350" y1="110" x2="374" y2="110" stroke="#44403C" stroke-width="2" marker-end="url(#k2)"></line>
      <line x1="520" y1="110" x2="544" y2="110" stroke="#44403C" stroke-width="2" marker-end="url(#k2)"></line>
      <line x1="690" y1="110" x2="714" y2="110" stroke="#44403C" stroke-width="2" marker-end="url(#k2)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#q2a" xlink:href="#q2a"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" begin=".2s" repeatCount="indefinite"><mpath href="#q2b" xlink:href="#q2b"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" begin=".4s" repeatCount="indefinite"><mpath href="#q2c" xlink:href="#q2c"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" begin=".6s" repeatCount="indefinite"><mpath href="#q2d" xlink:href="#q2d"></mpath></animateMotion></circle>
      <line x1="450" y1="150" x2="450" y2="204" stroke="#44403C" stroke-width="2" marker-end="url(#k2)"></line>
      <text x="464" y="184" font-size="12" font-weight="600" fill="#57534E">Lookup / Insert</text>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2s" begin=".3s" repeatCount="indefinite"><mpath href="#q2e" xlink:href="#q2e"></mpath></animateMotion></circle>
      <rect x="310" y="210" width="280" height="90" rx="10" fill="#FFFFFF" stroke="#44403C" stroke-width="1.5"></rect>
      <text x="450" y="238" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Paged KV Cache — oMLX</text>
      <text x="450" y="256" text-anchor="middle" font-size="12" fill="#57534E">Prefix Match · Copy On Write</text>
      <rect x="326" y="264" width="124" height="26" rx="5" fill="#F0FDF4" stroke="#16A34A"></rect>
      <text x="388" y="281" text-anchor="middle" font-size="12" font-weight="600" fill="#166534">Hot · RAM</text>
      <rect x="458" y="264" width="124" height="26" rx="5" fill="#FFFBEB" stroke="#B45309"></rect>
      <text x="520" y="281" text-anchor="middle" font-size="12" font-weight="600" fill="#7C2D12">Cold · SSD</text>
    </svg>

<aside class="callout"><strong class="callout__title">Note what is not replaced.</strong><div class="callout__body"><code>omlx/scheduler.py:32</code> imports <code>BatchGenerator</code>,
    <code>GenerationBatch</code>, <code>PromptProcessingBatch</code> and <code>SequenceStateMachine</code> directly from
    <code>mlx_lm.generate</code>. Its own docstring says it "manages request scheduling using mlx-lm's BatchGenerator" and
    "follows vLLM's design". oMLX contributes the waiting queue and the running set — the admission <em>policy</em> — not the decode loop.</div></aside>

The Cluster Path Is The Real Surprise

You would expect the multi-Mac path to be the most rewritten part of all. It is the least. Every rank in a distributed deployment **is** an `mlx_lm.server` process; oMLX plans, verifies, launches and front-ends them.

Multi-Mac Deployment — Each Rank Is An mlx\_lm.server

<svg viewBox="0 0 900 430" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="oMLX orchestrator launching two ranks, each an mlx_lm.server, joined by a Thunderbolt collective link">
      <defs>
        <marker id="k3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="q3a" d="M 450 130 L 450 175"></path><path id="q3b" d="M 450 175 L 210 175"></path>
        <path id="q3c" d="M 450 175 L 690 175"></path><path id="q3d" d="M 210 175 L 210 211"></path>
        <path id="q3e" d="M 690 175 L 690 211"></path><path id="q3f" d="M 310 368 L 590 368"></path>
      </defs>
      <rect width="900" height="430" fill="#FFFFFF"></rect>
      <rect x="250" y="40" width="400" height="90" rx="12" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <rect x="250" y="40" width="400" height="24" rx="12" fill="#44403C"></rect>
      <rect x="250" y="54" width="400" height="10" fill="#44403C"></rect>
      <text x="450" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">oMLX ORCHESTRATOR</text>
      <text x="450" y="88" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Peer Discovery · Shard Planning · Activation</text>
      <text x="450" y="110" text-anchor="middle" font-size="12" fill="#57534E">omlx/cluster — 29,382 Lines</text>
      <circle cx="626" cy="86" r="5" fill="#44403C"></circle>
      <circle cx="626" cy="86" r="5" fill="none" stroke="#44403C" stroke-width="1.5">
        <animate attributeName="r" values="5;21" dur="2.6s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.6s" repeatCount="indefinite"></animate></circle>
      <line x1="450" y1="130" x2="450" y2="175" stroke="#44403C" stroke-width="2"></line>
      <line x1="210" y1="175" x2="690" y2="175" stroke="#44403C" stroke-width="2"></line>
      <line x1="210" y1="175" x2="210" y2="211" stroke="#44403C" stroke-width="2" marker-end="url(#k3)"></line>
      <line x1="690" y1="175" x2="690" y2="211" stroke="#44403C" stroke-width="2" marker-end="url(#k3)"></line>
      <text x="464" y="160" font-size="12" font-weight="600" fill="#57534E">SSH Launch</text>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.4s" repeatCount="indefinite"><mpath href="#q3a" xlink:href="#q3a"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.6s" begin="1.4s" repeatCount="indefinite"><mpath href="#q3b" xlink:href="#q3b"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.6s" begin="1.4s" repeatCount="indefinite"><mpath href="#q3c" xlink:href="#q3c"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".8s" begin="3s" repeatCount="indefinite"><mpath href="#q3d" xlink:href="#q3d"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".8s" begin="3s" repeatCount="indefinite"><mpath href="#q3e" xlink:href="#q3e"></mpath></animateMotion></circle>
      <rect x="110" y="215" width="200" height="110" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="210" y="243" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Rank 0 — Mac Studio</text>
      <rect x="126" y="255" width="168" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect>
      <text x="210" y="275" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1C1917">mlx_lm.server</text>
      <text x="210" y="305" text-anchor="middle" font-size="12" fill="#57534E">Pipeline Stage 0</text>
      <rect x="590" y="215" width="200" height="110" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="690" y="243" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Rank 1 — Mac Mini</text>
      <rect x="606" y="255" width="168" height="30" rx="6" fill="#F5F5F4" stroke="#D6D3D1"></rect>
      <text x="690" y="275" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1C1917">mlx_lm.server</text>
      <text x="690" y="305" text-anchor="middle" font-size="12" fill="#57534E">Pipeline Stage 1</text>
      <line x1="210" y1="325" x2="210" y2="368" stroke="#57534E" stroke-width="2"></line>
      <line x1="690" y1="325" x2="690" y2="368" stroke="#57534E" stroke-width="2"></line>
      <line x1="210" y1="368" x2="690" y2="368" stroke="#57534E" stroke-width="2"></line>
      <circle r="4" fill="#B45309"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#q3f" xlink:href="#q3f"></mpath></animateMotion></circle>
      <text x="450" y="398" text-anchor="middle" font-size="12" font-weight="600" fill="#57534E">Collective All-Reduce · Thunderbolt · Ring Or JACCL</text>
    </svg>

## Read The Imports, Not The README

```bash
# omlx/cluster/inference_worker.py:944
import mlx_lm.server as mlx_server
from mlx_lm.server import ModelProvider, ResponseGenerator, run

# omlx/cluster/launch.py:1414 — emitted verbatim into the remote launch script
"import mlx_lm.server\n"

# omlx/cluster/prompt_snapshot_cache.py:4
"A distributed rank runs the pinned mlx_lm.server with a rank-local ..."

# omlx/cluster/autoconfigure.py:1132
"for_vlm defaults to False because a rank is an mlx_lm.server ..."
```

This is the right call, and it is the strongest evidence for the argument that follows: if the serving layer had been the thing worth replacing, oMLX would not be launching mlx-lm's server on its most demanding code path.

Layer Ownership, Summarised

| Concern | MLX | mlx-lm | oMLX |
| --- | --- | --- | --- |
| **Tensor Math & Metal Kernels** | Owns | — | Adds 3,145 Lines Of Custom Kernels |
| **Model Architectures** | — | Owns | Patches 49 Modules |
| **Batched Decode Loop** | — | Owns | Consumes It |
| **Queue & Admission Policy** | — | Minimal | Owns |
| **KV Cache Across Requests** | — | — | Owns |
| **Cache Persisted To Disk** | — | — | Owns |
| **Multi-Model In One Process** | — | — | Owns |
| **OpenAI HTTP Surface** | — | Basic | Owns |
| **Anthropic / Embeddings / Rerank / Audio / MCP** | — | — | Owns |
| **Distributed Collectives** | Owns | Uses Them | Orchestrates |
| **Serving On A Cluster Rank** | — | Owns | Launches It |

<aside class="callout"><strong class="callout__title">Where this is heading.</strong><div class="callout__body">Of everything in the oMLX column, exactly one entry has no equivalent anywhere
    below it and no cheap substitute above it: <em>KV cache across requests, persisted to disk</em>. Tab 2 is about that row.
    Tab 3 is about everything else. Tabs 4 and 5 are about what happens when features ship without the wire that makes them real.</div></aside>

## The Cache

### The One Subsystem That Carries The Fork

mlx-lm ships a server, and oMLX runs it on every cluster rank. mlx-lm ships a batched decode loop, and oMLX calls it. So what is genuinely replaced? **The KV cache.** mlx-lm's `KVCache` and `RotatingKVCache` live for the duration of one generation, in RAM. Nothing is reused across requests and nothing survives a restart.

## oMLX States The Layering Itself

There is a `--no-cache` mode. Its startup banner is the cleanest description of the fork anywhere in the repository:

```bash
# omlx/cli.py:320
Mode: Multi-model serving (no oMLX cache, mlx-lm BatchGenerator only)
```

Remove the cache and what remains is described, by the project, as mlx-lm.

What It Buys You

A chat client resends a growing conversation every turn. Without cross-request reuse, the entire prefix is reprocessed on every message — the cost grows with the conversation, not with what you typed.

Prefix Reuse Across Conversation Turns — Blocks Computed Versus Restored

<svg viewBox="0 0 900 340" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two panels comparing full recomputation each turn against paged prefix cache reuse">
      <rect width="900" height="340" fill="#FFFFFF"></rect>
      <rect x="40" y="50" width="390" height="250" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <rect x="40" y="50" width="390" height="32" rx="10" fill="#F5F5F4"></rect>
      <rect x="40" y="72" width="390" height="10" fill="#F5F5F4"></rect>
      <line x1="40" y1="82" x2="430" y2="82" stroke="#E7E5E4" stroke-width="1.5"></line>
      <text x="235" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Stock mlx-lm Cache</text>
      <text x="56" y="126" font-size="12" font-weight="600" fill="#57534E">Turn 1</text>
      <rect x="118" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="144" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="170" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="196" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="56" y="181" font-size="12" font-weight="600" fill="#57534E">Turn 2</text>
      <rect x="118" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="144" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="170" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="196" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="222" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="248" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="274" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="56" y="236" font-size="12" font-weight="600" fill="#57534E">Turn 3</text>
      <rect x="118" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="144" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="170" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="196" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="222" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="248" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="274" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="300" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="326" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="352" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <rect x="56" y="262" width="14" height="14" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="78" y="274" font-size="12" fill="#57534E">Recomputed Every Turn · 21 Blocks Over Three Turns</text>
      <rect x="470" y="50" width="390" height="250" rx="10" fill="#FFFFFF" stroke="#44403C" stroke-width="2"></rect>
      <rect x="470" y="50" width="390" height="32" rx="10" fill="#44403C"></rect>
      <rect x="470" y="72" width="390" height="10" fill="#44403C"></rect>
      <text x="665" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#FFFFFF">oMLX Paged Prefix Cache</text>
      <text x="486" y="126" font-size="12" font-weight="600" fill="#57534E">Turn 1</text>
      <rect x="548" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="574" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="600" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="626" y="110" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="486" y="181" font-size="12" font-weight="600" fill="#57534E">Turn 2</text>
      <rect x="548" y="165" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" repeatCount="indefinite"></animate></rect>
      <rect x="574" y="165" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".15s" repeatCount="indefinite"></animate></rect>
      <rect x="600" y="165" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".3s" repeatCount="indefinite"></animate></rect>
      <rect x="626" y="165" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".45s" repeatCount="indefinite"></animate></rect>
      <rect x="652" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="678" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="704" y="165" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="486" y="236" font-size="12" font-weight="600" fill="#57534E">Turn 3</text>
      <rect x="548" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" repeatCount="indefinite"></animate></rect>
      <rect x="574" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".15s" repeatCount="indefinite"></animate></rect>
      <rect x="600" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".3s" repeatCount="indefinite"></animate></rect>
      <rect x="626" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".45s" repeatCount="indefinite"></animate></rect>
      <rect x="652" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".6s" repeatCount="indefinite"></animate></rect>
      <rect x="678" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".75s" repeatCount="indefinite"></animate></rect>
      <rect x="704" y="220" width="22" height="22" rx="3" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".45;1;.45" dur="2.6s" begin=".9s" repeatCount="indefinite"></animate></rect>
      <rect x="730" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="756" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect><rect x="782" y="220" width="22" height="22" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <rect x="486" y="262" width="14" height="14" rx="3" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="508" y="274" font-size="12" fill="#57534E">Computed · 10</text>
      <rect x="640" y="262" width="14" height="14" rx="3" fill="#F0FDF4" stroke="#16A34A"></rect>
      <text x="662" y="274" font-size="12" fill="#57534E">Restored · 11</text>
    </svg>

How The Block Pool Works

`omlx/cache/paged_cache.py:2` names its source outright — _"Adapted from vllm-mlx … following vLLM's architecture (vllm/v1/core/block\_pool.py), adapted for MLX on Apple Silicon."_ Blocks are fixed-size, refcounted, and addressed by a hash that chains to the parent block.

Block Pool — Reference Counting, Chain Hashing, Copy On Write

<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Two sequences sharing four refcounted prefix blocks, with a copy-on-write fork of the diverging block">
      <defs>
        <marker id="k5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#B45309"></path></marker>
        <path id="q5a" d="M 250 282 L 304 282"></path>
      </defs>
      <rect width="900" height="400" fill="#FFFFFF"></rect>
      <rect x="184" y="64" width="250" height="144" rx="8" fill="none" stroke="#44403C" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="40" y="100" font-size="12.5" font-weight="600" fill="#1C1917">Sequence A</text>
      <rect x="190" y="70" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" repeatCount="indefinite"></animate></rect>
      <text x="217" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B0</text><text x="217" y="109" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="252" y="70" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" begin=".2s" repeatCount="indefinite"></animate></rect>
      <text x="279" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B1</text><text x="279" y="109" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="314" y="70" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" begin=".4s" repeatCount="indefinite"></animate></rect>
      <text x="341" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B2</text><text x="341" y="109" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="376" y="70" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" begin=".6s" repeatCount="indefinite"></animate></rect>
      <text x="403" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B3</text><text x="403" y="109" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="438" y="70" width="54" height="52" rx="5" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="465" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#292524">B4</text><text x="465" y="109" text-anchor="middle" font-size="12" fill="#57534E">rc 1</text>
      <rect x="500" y="70" width="54" height="52" rx="5" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="527" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#292524">B5</text><text x="527" y="109" text-anchor="middle" font-size="12" fill="#57534E">rc 1</text>
      <rect x="562" y="70" width="54" height="52" rx="5" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="589" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#292524">B6</text><text x="589" y="109" text-anchor="middle" font-size="12" fill="#57534E">rc 1</text>
      <rect x="624" y="70" width="54" height="52" rx="5" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="651" y="89" text-anchor="middle" font-size="12" font-weight="700" fill="#292524">B7</text><text x="651" y="109" text-anchor="middle" font-size="12" fill="#57534E">rc 1</text>
      <text x="40" y="180" font-size="12.5" font-weight="600" fill="#1C1917">Sequence B</text>
      <rect x="190" y="150" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" repeatCount="indefinite"></animate></rect>
      <text x="217" y="169" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B0</text><text x="217" y="189" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="252" y="150" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" begin=".2s" repeatCount="indefinite"></animate></rect>
      <text x="279" y="169" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B1</text><text x="279" y="189" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="314" y="150" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" begin=".4s" repeatCount="indefinite"></animate></rect>
      <text x="341" y="169" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B2</text><text x="341" y="189" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="376" y="150" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"><animate attributeName="opacity" values=".5;1;.5" dur="2.8s" begin=".6s" repeatCount="indefinite"></animate></rect>
      <text x="403" y="169" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B3</text><text x="403" y="189" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <rect x="438" y="150" width="54" height="52" rx="5" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="465" y="169" text-anchor="middle" font-size="12" font-weight="700" fill="#292524">B8</text><text x="465" y="189" text-anchor="middle" font-size="12" fill="#57534E">rc 1</text>
      <rect x="500" y="150" width="54" height="52" rx="5" fill="#F5F5F4" stroke="#D6D3D1"></rect><text x="527" y="169" text-anchor="middle" font-size="12" font-weight="700" fill="#292524">B9</text><text x="527" y="189" text-anchor="middle" font-size="12" fill="#57534E">rc 1</text>
      <text x="309" y="226" text-anchor="middle" font-size="12" font-weight="600" fill="#1C1917">Shared Prefix — One Physical Copy, Refcount 2</text>
      <text x="40" y="286" font-size="12.5" font-weight="600" fill="#1C1917">B Diverges</text>
      <rect x="190" y="256" width="54" height="52" rx="5" fill="#F0FDF4" stroke="#16A34A"></rect>
      <text x="217" y="275" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">B3</text><text x="217" y="295" text-anchor="middle" font-size="12" fill="#166534">rc 2</text>
      <line x1="250" y1="282" x2="304" y2="282" stroke="#B45309" stroke-width="2" marker-end="url(#k5)"></line>
      <text x="277" y="248" text-anchor="middle" font-size="12" font-weight="600" fill="#7C2D12">Copy On Write</text>
      <circle r="3.5" fill="#B45309"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#q5a" xlink:href="#q5a"></mpath></animateMotion></circle>
      <rect x="310" y="256" width="54" height="52" rx="5" fill="#FFFBEB" stroke="#B45309"></rect>
      <text x="337" y="275" text-anchor="middle" font-size="12" font-weight="700" fill="#7C2D12">B3′</text><text x="337" y="295" text-anchor="middle" font-size="12" fill="#7C2D12">rc 1</text>
      <text x="390" y="286" font-size="12" fill="#57534E">Only The Half-Filled Block Is Duplicated — B0 To B2 Stay Shared</text>
      <text x="40" y="342" font-size="12" fill="#57534E">Block Hash = H(Parent Hash, Token IDs) — So A Prefix Match Is One Hash Lookup, Not A Token Walk</text>
      <text x="40" y="366" font-size="12" fill="#57534E">block_size Defaults To 64 Tokens · paged_cache.py:505 · Eviction Is An O(1) Doubly Linked Free List</text>
    </svg>

Two Tiers, And One That Survives A Reboot

When the hot tier fills, blocks are not dropped — they are serialised to SSD as safetensors and can be restored on a later request with a matching prefix, including after the server has been restarted.

Prefix Lookup — Three Outcomes, Two Of Them Cheap

<svg viewBox="0 0 900 350" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="A prompt lookup resolving to hot RAM, cold SSD restore, or full recompute">
      <defs>
        <marker id="k6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="q6a" d="M 450 94 L 450 130"></path><path id="q6b" d="M 450 130 L 170 130"></path>
        <path id="q6c" d="M 450 130 L 730 130"></path><path id="q6d" d="M 170 130 L 170 166"></path>
        <path id="q6e" d="M 450 130 L 450 166"></path><path id="q6f" d="M 730 130 L 730 166"></path>
      </defs>
      <rect width="900" height="350" fill="#FFFFFF"></rect>
      <rect x="340" y="40" width="220" height="54" rx="10" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <text x="450" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Incoming Prompt</text>
      <text x="450" y="84" text-anchor="middle" font-size="12" fill="#57534E">Chain-Hash The Prefix</text>
      <circle cx="538" cy="56" r="4.5" fill="#44403C"></circle>
      <circle cx="538" cy="56" r="4.5" fill="none" stroke="#44403C" stroke-width="1.5">
        <animate attributeName="r" values="4.5;18" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.4s" repeatCount="indefinite"></animate></circle>
      <line x1="450" y1="94" x2="450" y2="130" stroke="#44403C" stroke-width="2"></line>
      <line x1="170" y1="130" x2="730" y2="130" stroke="#44403C" stroke-width="2"></line>
      <line x1="170" y1="130" x2="170" y2="166" stroke="#44403C" stroke-width="2" marker-end="url(#k6)"></line>
      <line x1="450" y1="130" x2="450" y2="166" stroke="#44403C" stroke-width="2" marker-end="url(#k6)"></line>
      <line x1="730" y1="130" x2="730" y2="166" stroke="#44403C" stroke-width="2" marker-end="url(#k6)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.2s" repeatCount="indefinite"><mpath href="#q6a" xlink:href="#q6a"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.4s" begin="1.2s" repeatCount="indefinite"><mpath href="#q6b" xlink:href="#q6b"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.4s" begin="1.2s" repeatCount="indefinite"><mpath href="#q6c" xlink:href="#q6c"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".7s" begin="2.6s" repeatCount="indefinite"><mpath href="#q6d" xlink:href="#q6d"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".7s" begin="2.6s" repeatCount="indefinite"><mpath href="#q6e" xlink:href="#q6e"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".7s" begin="2.6s" repeatCount="indefinite"><mpath href="#q6f" xlink:href="#q6f"></mpath></animateMotion></circle>
      <rect x="60" y="170" width="220" height="80" rx="10" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="170" y="198" text-anchor="middle" font-size="13" font-weight="700" fill="#166534">Hot Tier · RAM</text>
      <text x="170" y="218" text-anchor="middle" font-size="12" fill="#166534">Blocks Already Resident</text>
      <text x="170" y="238" text-anchor="middle" font-size="12" fill="#166534">Zero Prefill Work</text>
      <rect x="340" y="170" width="220" height="80" rx="10" fill="#FFFBEB" stroke="#B45309" stroke-width="1.5"></rect>
      <text x="450" y="198" text-anchor="middle" font-size="13" font-weight="700" fill="#7C2D12">Cold Tier · SSD</text>
      <text x="450" y="218" text-anchor="middle" font-size="12" fill="#7C2D12">safetensors Read Back</text>
      <text x="450" y="238" text-anchor="middle" font-size="12" fill="#7C2D12">Disk Read, Not Recompute</text>
      <rect x="620" y="170" width="220" height="80" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="730" y="198" text-anchor="middle" font-size="13" font-weight="700" fill="#991B1B">Miss</text>
      <text x="730" y="218" text-anchor="middle" font-size="12" fill="#991B1B">Full Prefill</text>
      <text x="730" y="238" text-anchor="middle" font-size="12" fill="#991B1B">The Only Expensive Path</text>
      <rect x="60" y="280" width="780" height="44" rx="8" fill="#F5F5F4" stroke="#E7E5E4"></rect>
      <text x="450" y="307" text-anchor="middle" font-size="12" fill="#57534E">The Cold Tier Outlives The Process — boundary_snapshot_store.py Serialises On The Inference Thread, Flushes From A Background Writer</text>
    </svg>

## The Five Mechanisms

🧩

Fixed-Size Refcounted Blocks

64 tokens per block by default (`paged_cache.py:505`). Two conversations sharing a system prompt share the same physical blocks, and the refcount is what makes that safe.

🔗

Chain Hashing

Each block's hash depends on its parent's, so identifying the longest shared prefix is a hash-map walk rather than a token-by-token comparison.

✂️

Copy On Write

When two branches diverge mid-block, only that block is duplicated. Everything before it stays shared.

💾

SSD Cold Tier

`paged_ssd_cache.py` and `boundary_snapshot_store.py` serialise evicted blocks to safetensors on the inference thread — Metal-safe — buffer them in `_pending_writes` for instant read-back, and flush from a background writer thread.

♻️

O(1) LRU Eviction

A doubly linked free-block queue, lifted straight from vLLM's block pool design.

<aside class="callout"><strong class="callout__title">What the coupling costs, in one file.</strong><div class="callout__body"><code>omlx/cache/_rotating_subclass.py</code> exists only because
    mlx-lm v0.31.3's <code>BatchRotatingKVCache.merge()</code> computes <code>l = c.size()</code> from
    <code>min(offset, max_size)</code>, ignoring the real buffer length. For an SSD-restored cache with
    <code>keys.shape[2] &lt; max_size</code> and <code>offset ≥ max_size</code> that either shape-mismatches the right-hand slice
    or — once oMLX zero-pads to compensate — exposes zero positions to attention, causing softmax dilution that surfaces as
    infinite loops and empty responses. Issues #934, #903, #900. The subclass clamps <code>size()</code> to the actual buffer length
    so the merge is well defined without the padding trick.</div></aside>

<aside class="callout"><strong class="callout__title">This is the row that justifies the fork.</strong><div class="callout__body">Everything else oMLX adds has a substitute — a proxy, a second
    process, a different UI. Cross-request prefix reuse with a disk tier does not, and it is exactly the property that decides
    whether a local model is usable for long coding sessions or is a demo.</div></aside>

## Everything Else

### Everything Else oMLX Adds

The cache is the argument. This tab is the rest of the surface area — what is genuinely load-bearing, what is product polish, and the third of the codebase that exists purely because the layer beneath is unfinished.

Multi-Model Serving In One Process

mlx-lm's `ModelProvider` serves one model. oMLX's `engine_pool.py` — 2,928 lines — runs several under a single process-memory ceiling, arbitrating between pinned models, active models, and models whose idle TTL has expired.

Engine Pool — Memory Arbitration Under A Hard Ceiling

<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A process memory bar split between a pinned model, an active model, an idle model and headroom, with a soft watermark marker">
      <rect width="900" height="300" fill="#FFFFFF"></rect>
      <text x="60" y="42" font-size="12" fill="#57534E">Hard Ceiling = System RAM − Static Reserve · safe 8 GiB · balanced 6 GiB · aggressive 4 GiB · process_memory_enforcer.py:62</text>
      <text x="780" y="70" text-anchor="middle" font-size="12" font-weight="600" fill="#7C2D12">Soft Watermark · 0.85</text>
      <rect x="60" y="90" width="230" height="54" rx="6" fill="#44403C" stroke="#44403C"></rect>
      <text x="175" y="112" text-anchor="middle" font-size="12.5" font-weight="700" fill="#FFFFFF">qwen3-8b</text>
      <text x="175" y="130" text-anchor="middle" font-size="12" fill="#E7E5E4">Pinned — Never Evicted</text>
      <rect x="290" y="90" width="200" height="54" rx="6" fill="#D6D3D1" stroke="#A8A29E"></rect>
      <text x="390" y="112" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1C1917">glm-ocr</text>
      <text x="390" y="130" text-anchor="middle" font-size="12" fill="#44403C">Active — Serving</text>
      <rect x="490" y="90" width="140" height="54" rx="6" fill="#FFFBEB" stroke="#B45309"></rect>
      <text x="560" y="112" text-anchor="middle" font-size="12.5" font-weight="700" fill="#7C2D12">bge-embed</text>
      <text x="560" y="130" text-anchor="middle" font-size="12" fill="#7C2D12">Idle · TTL 12m</text>
      <rect x="630" y="90" width="210" height="54" rx="6" fill="#FFFFFF" stroke="#E7E5E4"></rect>
      <text x="735" y="112" text-anchor="middle" font-size="12.5" font-weight="700" fill="#57534E">Headroom</text>
      <text x="735" y="130" text-anchor="middle" font-size="12" fill="#57534E">Free</text>
      <line x1="780" y1="78" x2="780" y2="158" stroke="#B45309" stroke-width="2" stroke-dasharray="5,4"></line>
      <text x="60" y="196" font-size="12.5" fill="#57534E">1 · A load that would cross the ceiling picks an LRU victim first — _find_lru_victim() at engine_pool.py:1716</text>
      <text x="60" y="228" font-size="12.5" fill="#57534E">2 · Pinned models are exempt from every eviction path — set_pinned() at engine_pool.py:1002</text>
      <text x="60" y="260" font-size="12.5" fill="#57534E">3 · Idle unpinned models unload on their own per-model TTL — unload_if_idle_unpinned() at engine_pool.py:1682</text>
    </svg>

## The Enforcer Is Tier-Aware, Not A Single Number

The README says "system RAM minus 8 GB". The code is more careful than that — the reserve is tiered, and the fraction of macOS "active" pages counted as reclaimable changes with the tier, because the compressor typically recovers 2–3×:

```bash
# omlx/process_memory_enforcer.py
_STATIC_RESERVE_LARGE = {"safe": 8*GiB, "balanced": 6*GiB,
                         "aggressive": 4*GiB, "custom": 2*GiB}
_ACTIVE_RECLAIM_RATIO = {"safe": 0.2, "balanced": 0.5, "aggressive": 0.8}
_SOFT_THRESHOLD_BY_TIER = {"safe": 0.85, "balanced": 0.90, "aggressive": 0.925}

# Systems under 24 GiB get a smaller reserve so they can still load
# something useful after the tier-scaled cut.
_SMALL_SYSTEM_RESERVE   = 4*GiB
_SMALL_SYSTEM_THRESHOLD = 24*GiB
```

The comment on `_ACTIVE_RECLAIM_RATIO` is worth reading in full: _"0.8 pushes into swap territory."_ That is somebody who has watched this fail.

The Cluster Approval Contract

The best-engineered thing in the cluster code is not the sharding. It is a refusal. Activation recomputes the plan signature and compares it against the one the operator approved — because for months preview and activation posted different node objects, and the stage that launched was not the stage anybody had agreed to.

Plan Approval — Activation Refuses A Plan That Changed Under It

<svg viewBox="0 0 900 336" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Plan build, signature, operator approval and activation comparing signatures, branching to launch or HTTP 409">
      <defs>
        <marker id="k8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="q8a" d="M 210 100 L 244 100"></path><path id="q8b" d="M 420 100 L 454 100"></path>
        <path id="q8c" d="M 630 100 L 664 100"></path><path id="q8d" d="M 755 140 L 755 180"></path>
      </defs>
      <rect width="900" height="336" fill="#FFFFFF"></rect>
      <rect x="40" y="60" width="170" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="125" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Build Plan</text>
      <text x="125" y="114" text-anchor="middle" font-size="12" fill="#57534E">Byte-Aware Split</text>
      <rect x="250" y="60" width="170" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="335" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Sign It</text>
      <text x="335" y="114" text-anchor="middle" font-size="12" fill="#57534E">_placement_signature</text>
      <rect x="460" y="60" width="170" height="80" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="545" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Operator Approves</text>
      <text x="545" y="114" text-anchor="middle" font-size="12" fill="#57534E">Posts The Signature</text>
      <rect x="670" y="60" width="170" height="80" rx="10" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <rect x="670" y="60" width="170" height="20" rx="10" fill="#44403C"></rect>
      <rect x="670" y="70" width="170" height="10" fill="#44403C"></rect>
      <text x="755" y="75" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">THE GATE</text>
      <text x="755" y="106" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Activate</text>
      <text x="755" y="126" text-anchor="middle" font-size="12" fill="#57534E">Recompute · Compare</text>
      <line x1="210" y1="100" x2="244" y2="100" stroke="#44403C" stroke-width="2" marker-end="url(#k8)"></line>
      <line x1="420" y1="100" x2="454" y2="100" stroke="#44403C" stroke-width="2" marker-end="url(#k8)"></line>
      <line x1="630" y1="100" x2="664" y2="100" stroke="#44403C" stroke-width="2" marker-end="url(#k8)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" repeatCount="indefinite"><mpath href="#q8a" xlink:href="#q8a"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" begin=".3s" repeatCount="indefinite"><mpath href="#q8b" xlink:href="#q8b"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.4s" begin=".6s" repeatCount="indefinite"><mpath href="#q8c" xlink:href="#q8c"></mpath></animateMotion></circle>
      <line x1="755" y1="140" x2="755" y2="180" stroke="#44403C" stroke-width="2"></line>
      <line x1="530" y1="180" x2="760" y2="180" stroke="#44403C" stroke-width="2"></line>
      <line x1="530" y1="180" x2="530" y2="200" stroke="#44403C" stroke-width="2" marker-end="url(#k8)"></line>
      <line x1="760" y1="180" x2="760" y2="200" stroke="#44403C" stroke-width="2" marker-end="url(#k8)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.2s" begin=".9s" repeatCount="indefinite"><mpath href="#q8d" xlink:href="#q8d"></mpath></animateMotion></circle>
      <rect x="430" y="204" width="200" height="64" rx="10" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="530" y="232" text-anchor="middle" font-size="13" font-weight="700" fill="#166534">Signatures Match</text>
      <text x="530" y="254" text-anchor="middle" font-size="12" fill="#166534">Ranks Stage And Launch</text>
      <rect x="660" y="204" width="200" height="64" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="760" y="232" text-anchor="middle" font-size="13" font-weight="700" fill="#991B1B">Signatures Differ</text>
      <text x="760" y="254" text-anchor="middle" font-size="12" fill="#991B1B">HTTP 409 · Refused</text>
      <text x="40" y="300" font-size="12" fill="#57534E">"This is not the plan you approved — the budgets, roles or layer split changed since it was built." — routes.py:3160</text>
    </svg>

## Why That Gate Exists

The comment above it in `omlx/cluster/routes.py` is unusually honest for a source file:

```bash
# Preview and activation posted different node objects for months, and
# the second one dropped the split cap and the role, so the stage that
# launched was not the stage anybody approved. Refusing here costs
# nothing; discovering it after every rank has staged its weights
# costs the machine.
```

Activation then goes on to check peer liveness before any rank starts, because _"launching into a dead peer produces a collective that blocks forever rather than an error."_ This is the part of oMLX that reads like it was written by someone who had been burned. Hold that thought — tabs 4 and 5 are about the parts that were not.

Where The Python Actually Lives

Lines Of Python Per Subpackage

<svg viewBox="0 0 900 370" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar chart of oMLX subpackage line counts, patches largest at 51395">
      <rect width="900" height="370" fill="#FFFFFF"></rect>
      <text x="190" y="56" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">patches/</text>
      <rect x="200" y="40" width="560" height="22" rx="4" fill="#FEF2F2" stroke="#DC2626"></rect>
      <text x="782" y="56" font-size="12" font-weight="600" fill="#57534E">51,395</text>
      <circle cx="216" cy="51" r="4" fill="#DC2626"></circle>
      <circle cx="216" cy="51" r="4" fill="none" stroke="#DC2626" stroke-width="1.5">
        <animate attributeName="r" values="4;15" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.4s" repeatCount="indefinite"></animate></circle>
      <text x="190" y="92" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">cluster/</text>
      <rect x="200" y="76" width="320" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="542" y="92" font-size="12" font-weight="600" fill="#57534E">29,382</text>
      <text x="190" y="128" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">admin/</text>
      <rect x="200" y="112" width="193" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="415" y="128" font-size="12" font-weight="600" fill="#57534E">17,679</text>
      <text x="190" y="164" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">cache/</text>
      <rect x="200" y="148" width="191" height="22" rx="4" fill="#F0FDF4" stroke="#16A34A"></rect>
      <text x="413" y="164" font-size="12" font-weight="600" fill="#57534E">17,489</text>
      <circle cx="216" cy="159" r="4" fill="#16A34A"></circle>
      <circle cx="216" cy="159" r="4" fill="none" stroke="#16A34A" stroke-width="1.5">
        <animate attributeName="r" values="4;15" dur="2.4s" begin="1.2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.4s" begin="1.2s" repeatCount="indefinite"></animate></circle>
      <text x="190" y="200" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">scheduler.py</text>
      <rect x="200" y="184" width="140" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="362" y="200" font-size="12" font-weight="600" fill="#57534E">12,864</text>
      <text x="190" y="236" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">engine/</text>
      <rect x="200" y="220" width="135" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="357" y="236" font-size="12" font-weight="600" fill="#57534E">12,429</text>
      <text x="190" y="272" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">api/</text>
      <rect x="200" y="256" width="134" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="356" y="272" font-size="12" font-weight="600" fill="#57534E">12,339</text>
      <text x="190" y="308" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">server.py</text>
      <rect x="200" y="292" width="80" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="302" y="308" font-size="12" font-weight="600" fill="#57534E">7,299</text>
      <text x="200" y="340" font-size="12" fill="#57534E">Measured At HEAD · 22 Aug 2026 · Red Is Upstream Lag, Green Is The Subsystem That Justifies The Fork</text>
    </svg>

Anatomy Of patches/

Forty-nine modules, 51,395 lines — larger than the cluster, the dashboard or the cache. None of it is architecture. All of it is closing a gap in the layer below, against private internals.

Patch Modules Grouped By The Upstream Gap They Close

<svg viewBox="0 0 900 342" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bar chart of patch line counts by category, other model families largest">
      <rect width="900" height="342" fill="#FFFFFF"></rect>
      <text x="240" y="56" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">Other Model Families · 14</text>
      <rect x="250" y="40" width="520" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="782" y="56" font-size="12" font-weight="600" fill="#57534E">17,488</text>
      <text x="240" y="92" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">mlx-vlm Compatibility · 6</text>
      <rect x="250" y="76" width="460" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="722" y="92" font-size="12" font-weight="600" fill="#57534E">15,466</text>
      <text x="240" y="128" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">mlx-lm Core · 3</text>
      <rect x="250" y="112" width="258" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="520" y="128" font-size="12" font-weight="600" fill="#57534E">8,671</text>
      <text x="240" y="164" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">Qwen 3.5 / 3.6 / 3.8 · 14</text>
      <rect x="250" y="148" width="183" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="445" y="164" font-size="12" font-weight="600" fill="#57534E">6,140</text>
      <text x="240" y="200" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">Kernels / Infrastructure · 7</text>
      <rect x="250" y="184" width="78" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="340" y="200" font-size="12" font-weight="600" fill="#57534E">2,609</text>
      <text x="240" y="236" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">MiniMax M3 · 3</text>
      <rect x="250" y="220" width="26" height="22" rx="4" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="288" y="236" font-size="12" font-weight="600" fill="#57534E">887</text>
      <text x="240" y="272" text-anchor="end" font-size="12" font-weight="600" fill="#57534E">Audio · 2</text>
      <rect x="250" y="256" width="6" height="22" rx="2" fill="#F5F5F4" stroke="#44403C"></rect>
      <text x="268" y="272" font-size="12" font-weight="600" fill="#57534E">132</text>
      <text x="250" y="310" font-size="12" fill="#57534E">49 Modules · 51,395 Lines In The Directory · Counted At HEAD</text>
    </svg>

## oMLX's Own Comments Quantify The Gap

```bash
# omlx/cluster/planner.py:752
Only about seven of mlx-lm's ~120 architectures can be pipelined

# omlx/cluster/planner.py:1089
stock mlx-lm has no file for it

# omlx/patches/qwen3_sliding_window/__init__.py:5
a model_type that mlx-lm doesn't ship at all yet

# omlx/cluster/catalogue.py:474
This model cannot combine Macs because mlx-lm supports neither ...

# omlx/patches/minimax_m3_mlx_lm/__init__.py:5
every rank is an mlx_lm.server, and pinned mlx-lm has no ...
```

mlx-lm's model _coverage_ is broad — roughly 120 architectures. Its _serving-grade_ coverage — shardable, batchable, still correct once a cache has been restored from disk — is narrow. Around seven can be pipelined at all.

<aside class="callout"><strong class="callout__title">This is the fork's central liability.</strong><div class="callout__body">Every mlx-lm bump can break forty-nine modules that reach into
    private internals. That is why the dependency is a commit hash rather than a version range, why the build pins a nanobind
    ABI, and why <code>pyproject.toml</code> carries a paragraph explaining exactly which upstream fixes that one commit contains.
    The maintenance cost of <code>patches/</code> is structural, and it does not shrink as oMLX matures — it grows every time a
    new model family ships.</div></aside>

The Rest Of The Surface

### API Compatibility — 12,339 Lines

`omlx/api/` carries OpenAI chat and completions, Anthropic Messages, embeddings, rerankers, audio, MCP routes, tool-call parsers per model family, and grammar-constrained decoding. Real work, but nothing here needed a fork of the inference stack — it needed an HTTP layer.

### Admin Dashboard — 17,679 Lines

Monitoring, model management, chat, benchmarks, per-model settings, eight languages, and every CDN dependency vendored so it works offline. The single most visible part of the product and the least technically deep.

### Custom Metal Kernels — 3,145 Lines

Compiled extensions for GLM-5.2, MiniMax M3 and Qwen 3.5 families, ABI-coupled to `mlx==0.32.0`. This is the one place oMLX reaches past mlx-lm and straight into MLX.

### Cluster — 29,382 Lines

Peer discovery, SSH and runtime verification, unequal shard planning, link classification, the approval contract above, and a downloadable diagnostics bundle. Excellent in places — and the subject of tab 5's second finding.

## The SLO Postmortem

### An SRE Subsystem That Never Measured Anything

Five modules, 1,028 lines of production code, 1,050 lines of tests behind 67 test cases, three HTTP endpoints and three dashboard sections. SLO definitions, a rolling-window tracker, error budgets, a deployment gate, a capacity planner. **Every test passes. Every endpoint responds. It has never produced a single real reading.**

The SLO Pipeline — Where It Breaks

<svg viewBox="0 0 900 310" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="SLO pipeline with no caller connecting the inference path to the tracker">
      <defs>
        <marker id="ka" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="qaa" d="M 212 128 L 231 128"></path><path id="qab" d="M 427 128 L 469 128"></path>
        <path id="qac" d="M 643 128 L 686 128"></path><path id="qad" d="M 558 166 L 558 214"></path>
      </defs>
      <rect width="900" height="310" fill="#FFFFFF"></rect>
      <rect x="40" y="90" width="170" height="76" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="125" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Inference Path</text>
      <text x="125" y="142" text-anchor="middle" font-size="12" fill="#57534E">omlx/scheduler.py</text>
      <circle cx="194" cy="106" r="4" fill="#16A34A"></circle>
      <circle cx="194" cy="106" r="4" fill="none" stroke="#16A34A" stroke-width="1.5">
        <animate attributeName="r" values="4;16" dur="2.2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.2s" repeatCount="indefinite"></animate></circle>
      <line x1="212" y1="128" x2="254" y2="128" stroke="#DC2626" stroke-width="2" stroke-dasharray="5,4"></line>
      <circle r="3.5" fill="#DC2626">
        <animateMotion dur="2s" repeatCount="indefinite"><mpath href="#qaa" xlink:href="#qaa"></mpath></animateMotion>
        <animate attributeName="opacity" values="1;1;0" keyTimes="0;.65;1" dur="2s" repeatCount="indefinite"></animate></circle>
      <circle cx="233" cy="128" r="11" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></circle>
      <text x="233" y="133" text-anchor="middle" font-size="12" font-weight="700" fill="#991B1B">✕</text>
      <text x="233" y="192" text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">No Caller Exists</text>
      <rect x="257" y="90" width="170" height="76" rx="10" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <rect x="257" y="90" width="170" height="20" rx="10" fill="#44403C"></rect>
      <rect x="257" y="100" width="170" height="10" fill="#44403C"></rect>
      <text x="342" y="105" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">THE ORPHAN</text>
      <text x="342" y="134" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">SLOTracker</text>
      <text x="342" y="154" text-anchor="middle" font-size="12" fill="#57534E">record() · 0 Callers</text>
      <line x1="427" y1="128" x2="469" y2="128" stroke="#44403C" stroke-width="2" marker-end="url(#ka)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2s" begin=".3s" repeatCount="indefinite"><mpath href="#qab" xlink:href="#qab"></mpath></animateMotion></circle>
      <rect x="473" y="90" width="170" height="76" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="558" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">evaluate()</text>
      <text x="558" y="142" text-anchor="middle" font-size="12" fill="#57534E">sample_count == 0</text>
      <line x1="643" y1="128" x2="686" y2="128" stroke="#44403C" stroke-width="2" marker-end="url(#ka)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2s" begin=".6s" repeatCount="indefinite"><mpath href="#qac" xlink:href="#qac"></mpath></animateMotion></circle>
      <rect x="690" y="90" width="170" height="76" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="775" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">DeploymentGate</text>
      <text x="775" y="142" text-anchor="middle" font-size="12" fill="#57534E">routes.py:3191</text>
      <line x1="558" y1="166" x2="558" y2="214" stroke="#44403C" stroke-width="2" marker-end="url(#ka)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.8s" begin=".9s" repeatCount="indefinite"><mpath href="#qad" xlink:href="#qad"></mpath></animateMotion></circle>
      <rect x="40" y="214" width="820" height="64" rx="10" fill="#F5F5F4" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="60" y="240" font-size="12.5" fill="#57534E">Every Response, Forever:   status: healthy   ·   compliance_pct: 100.0   ·   burn_rate: 0.0   ·   sample_count: 0</text>
      <text x="60" y="264" font-size="12.5" font-weight="600" fill="#991B1B">can_deploy: true — Not Because The Service Is Healthy, But Because Nothing Was Ever Measured</text>
    </svg>

## One Missing Line Explains All Of It

`SLOTracker.record()` at `omlx/cluster/slo_tracker.py:90` is called from nowhere inside `omlx/`. Only from `tests/`. Every rolling window is permanently empty, so every evaluation takes the zero-sample early return:

```bash
# omlx/cluster/slo_tracker.py:152
if sample_count == 0:
    return SLOEvaluation(
        slo=slo, status=SLOStatus.HEALTHY, compliance_pct=100.0,
        burn_rate=0.0, window_seconds=slo.window_seconds, sample_count=0,
    )  # <-- taken on every call, on every SLO, forever
```

The tracker's docstring names the gap: _"When `SampleStore` from #2773 is available, callers can bridge data into these windows."_ `SampleStore` does exist, at `omlx/cluster/sample_store.py:20`. The bridge was never written, and nothing in the test suite could notice — every test injects samples by hand.

Four Defects Underneath The Missing Wire

### Seconds Subtracted From One Hundred

`error_budget.py:52` computes `error_budget_allowed_pct = 100.0 - slo.target`. For `latency_p95_small` the target is `2.0` **seconds**, producing a "98% error budget". For `throughput_min_small` it is `30.0` **tokens/sec**, producing 70%. Units and percentages, subtracted from each other.

### A Branch With Two Identical Arms

`slo_tracker.py:211-219` branches on `metric_kind == LATENCY` and then runs byte-identical code in both arms. `error_budget_pct`, computed on line 212 with a conditional expression, is never read again.

### Ten Objectives, Five Windows

`latency_p50_small` and `latency_p50_large` both declare `metric_key="latency_p50"` and therefore share one rolling window. Same for p95, p99, and both throughput objectives. The small-versus-large split is fiction: fed real data, one is guaranteed to breach whenever the other is healthy.

### Two Definitions Of Compliance

For latency, `status` is decided by a percentile of the window, while `compliance_pct` counts individual samples under target — and the burn rate is derived from the second. A card can read `healthy` beside a compliance figure that disagrees with it.

And One Feature Behind A 404

The capacity planner is the cleanest example of the pattern: 435 lines of production code, 17 tests, a full dashboard section — and two missing connections, either of which alone would have made it invisible.

Capacity Planner — Two Broken Connections

<svg viewBox="0 0 900 324" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="capacity_api router never included in server.py, and dashboard.js never defining clusterCapacity">
      <defs>
        <marker id="kb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="qba" d="M 240 95 L 292 95"></path>
      </defs>
      <rect width="900" height="324" fill="#FFFFFF"></rect>
      <rect x="40" y="60" width="200" height="70" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="140" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">capacity_planner.py</text>
      <text x="140" y="114" text-anchor="middle" font-size="12" fill="#57534E">355 Lines · Functional</text>
      <line x1="240" y1="95" x2="294" y2="95" stroke="#44403C" stroke-width="2" marker-end="url(#kb)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#qba" xlink:href="#qba"></mpath></animateMotion></circle>
      <rect x="300" y="60" width="200" height="70" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="400" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">capacity_api.py</text>
      <text x="400" y="114" text-anchor="middle" font-size="12" fill="#57534E">APIRouter Defined</text>
      <line x1="500" y1="95" x2="554" y2="95" stroke="#DC2626" stroke-width="2" stroke-dasharray="5,4"></line>
      <circle cx="527" cy="95" r="11" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></circle>
      <text x="527" y="100" text-anchor="middle" font-size="12" font-weight="700" fill="#991B1B">✕</text>
      <rect x="560" y="60" width="240" height="70" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="680" y="92" text-anchor="middle" font-size="13" font-weight="700" fill="#991B1B">server.py</text>
      <text x="680" y="114" text-anchor="middle" font-size="12" fill="#991B1B">include_router() Never Called</text>
      <text x="527" y="158" text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">Endpoint Returns 404</text>
      <rect x="40" y="190" width="200" height="70" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="140" y="222" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">_cluster.html:241</text>
      <text x="140" y="244" text-anchor="middle" font-size="12" fill="#57534E">Binds clusterCapacity</text>
      <line x1="240" y1="225" x2="294" y2="225" stroke="#DC2626" stroke-width="2" stroke-dasharray="5,4"></line>
      <circle cx="267" cy="225" r="11" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></circle>
      <text x="267" y="230" text-anchor="middle" font-size="12" font-weight="700" fill="#991B1B">✕</text>
      <rect x="300" y="190" width="240" height="70" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="420" y="222" text-anchor="middle" font-size="13" font-weight="700" fill="#991B1B">dashboard.js</text>
      <text x="420" y="244" text-anchor="middle" font-size="12" fill="#991B1B">Never Defines The Variable</text>
      <text x="267" y="288" text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">x-show Reads undefined — The Section Never Renders</text>
    </svg>

<aside class="callout"><strong class="callout__title">The genuinely dangerous part.</strong><div class="callout__body"><code>routes.py:3191</code> puts <code>DeploymentGate.check()</code> on the
    cluster activation path and raises HTTP 409 when it fails. Today it is inert, because empty windows mean 100% budget on every
    objective. The day somebody wires <code>record()</code> up, a p95 latency window breaching will block cluster deployment
    activation — refusing you a redeploy at exactly the moment you are chasing a latency problem. The gate points the wrong way.</div></aside>

## Was Any Of It Required?

An error budget exists to arbitrate one specific conflict: development wants to ship, operations wants stability, so both sides agree on a number that decides who wins. **On a two-Mac local inference server with one operator, you are both parties.** There is nobody to say no to, and a budget whose only function is to say no to somebody has no function.

The numbers make the same point. 99.9% availability over a seven-day window is ten minutes of downtime a week, on machines the operator reboots by hand. And the targets — 0.5s p50, 30 tok/s, 70% cache hit rate — are guessed constants. They were not measured from a baseline and not negotiated with a consumer. An SLO with no consequence attached is a number on a card.

**The instinct was right and the layer was wrong.** What this work should have produced is latency and tokens/sec histograms on the `/metrics` endpoint that already exists, scraped by the Prometheus already running, with alert rules shipped as a `PrometheusRule`. Identical visibility, no bespoke engine, and it plugs into alerting that already works. Two thousand lines here reimplement a worse Prometheus inside the server process.

## What The Tests Could Not Catch

Sixty-seven tests pass against this code. Not one of them fails, and not one of them would have caught the actual defect, because every test constructs a tracker and injects samples directly:

```bash
# tests/test_slo_tracker.py — the shape of all 25 tests in this file
tracker = SLOTracker()
tracker.record("latency_p95", 1.2)     # the only caller of record()
assert tracker.evaluate(slo).status == SLOStatus.HEALTHY
```

The unit under test works. The wire into it was never soldered, and a unit test by construction cannot see a missing wire. **A test that only ever sees data it supplied itself proves the code runs — not that the feature works.**

<aside class="callout"><strong class="callout__title">Suggested disposition.</strong><div class="callout__body"><code>capacity_planner.py</code>, <code>capacity_api.py</code>, their template block
    and their test file are referenced by nothing and can be deleted outright. The gate should come out of
    <code>routes.py:3191</code> before it becomes live. Whether to keep <code>slo_definitions.py</code> as a target list feeding
    Prometheus rules is the only part worth an argument.</div></aside>

## Auth & Thunderbolt

### Two More Features That Only Look Finished

The SLO subsystem is green because it measured nothing. These two fail differently: the auth check returns `True` without knowing who asked, and the Thunderbolt classifier gives confident, actionable, impossible advice. Both are small fixes. Both are invisible until you read the code rather than the dashboard.

1 · Authentication With No Principal

The question that started this was ordinary: can oMLX give a team of developers limited local access — Keycloak groups, AD, per-user model allowlists? The answer is that there is nowhere to hang a role, because a request never becomes a someone.

Authentication — Every Caller Collapses To A Boolean

<svg viewBox="0 0 900 310" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Three clients sharing one secret reaching an oMLX server that returns only a boolean">
      <defs>
        <marker id="kc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <marker id="kd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626"></path></marker>
        <path id="qca" d="M 210 77 L 290 77"></path><path id="qcb" d="M 210 147 L 290 147"></path>
        <path id="qcc" d="M 210 217 L 290 217"></path><path id="qcd" d="M 290 147 L 356 147"></path>
        <path id="qce" d="M 580 147 L 656 147"></path>
      </defs>
      <rect width="900" height="310" fill="#FFFFFF"></rect>
      <rect x="40" y="50" width="170" height="54" rx="9" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="125" y="74" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1C1917">Developer A</text>
      <text x="125" y="93" text-anchor="middle" font-size="12" fill="#57534E">Shared API Key</text>
      <rect x="40" y="120" width="170" height="54" rx="9" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="125" y="144" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1C1917">Developer B</text>
      <text x="125" y="163" text-anchor="middle" font-size="12" fill="#57534E">Shared API Key</text>
      <rect x="40" y="190" width="170" height="54" rx="9" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="125" y="214" text-anchor="middle" font-size="12.5" font-weight="700" fill="#1C1917">CI Job</text>
      <text x="125" y="233" text-anchor="middle" font-size="12" fill="#57534E">Sub Key Number 2</text>
      <line x1="210" y1="77" x2="290" y2="77" stroke="#44403C" stroke-width="2"></line>
      <line x1="210" y1="147" x2="290" y2="147" stroke="#44403C" stroke-width="2"></line>
      <line x1="210" y1="217" x2="290" y2="217" stroke="#44403C" stroke-width="2"></line>
      <line x1="290" y1="77" x2="290" y2="217" stroke="#44403C" stroke-width="2"></line>
      <line x1="290" y1="147" x2="356" y2="147" stroke="#44403C" stroke-width="2" marker-end="url(#kc)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.2s" repeatCount="indefinite"><mpath href="#qca" xlink:href="#qca"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.2s" begin=".4s" repeatCount="indefinite"><mpath href="#qcb" xlink:href="#qcb"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="2.2s" begin=".8s" repeatCount="indefinite"><mpath href="#qcc" xlink:href="#qcc"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.4s" begin="1.2s" repeatCount="indefinite"><mpath href="#qcd" xlink:href="#qcd"></mpath></animateMotion></circle>
      <text x="290" y="272" text-anchor="middle" font-size="12" font-weight="600" fill="#57534E">One Flat Secret · No Principal Is Ever Constructed</text>
      <rect x="360" y="110" width="220" height="74" rx="10" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <rect x="360" y="110" width="220" height="20" rx="10" fill="#44403C"></rect>
      <rect x="360" y="120" width="220" height="10" fill="#44403C"></rect>
      <text x="470" y="125" text-anchor="middle" font-size="12" font-weight="700" fill="#FFFFFF">oMLX SERVER</text>
      <text x="470" y="152" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">verify_any_api_key()</text>
      <text x="470" y="172" text-anchor="middle" font-size="12" fill="#57534E">auth.py:181</text>
      <circle cx="558" cy="152" r="4" fill="#44403C"></circle>
      <circle cx="558" cy="152" r="4" fill="none" stroke="#44403C" stroke-width="1.5">
        <animate attributeName="r" values="4;17" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.4s" repeatCount="indefinite"></animate></circle>
      <line x1="580" y1="147" x2="656" y2="147" stroke="#DC2626" stroke-width="2" marker-end="url(#kd)"></line>
      <circle r="3.5" fill="#DC2626"><animateMotion dur="1.6s" begin="1.6s" repeatCount="indefinite"><mpath href="#qce" xlink:href="#qce"></mpath></animateMotion></circle>
      <rect x="660" y="110" width="200" height="74" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="760" y="140" text-anchor="middle" font-size="13" font-weight="700" fill="#991B1B">Returns bool</text>
      <text x="760" y="163" text-anchor="middle" font-size="12" font-weight="600" fill="#991B1B">Identity Discarded</text>
    </svg>

## The Loop Knows, Then Forgets

```bash
# omlx/admin/auth.py:181
def verify_any_api_key(api_key: str, main_key: str, sub_keys: list) -> bool:
    if not api_key:
        return False
    if main_key and compare_keys(api_key, main_key):
        return True
    for sk in sub_keys:
        if sk.key and compare_keys(api_key, sk.key):
            return True          # sk is in scope here — and thrown away
    return False
```

Two lines from the end of that loop, the code knows exactly which named sub key matched. It returns a boolean instead. Downstream there is no request principal, so there is nothing for a rate limit, a quota, an audit line or a model allowlist to attach to.

The data model confirms it. `SubKeyEntry` at `settings.py:549` carries only `key`, `name`, `created_at` — no scopes, no roles, no expiry, no model restrictions, no quota. The main key doubles as the admin dashboard password, and sub keys cannot log into the dashboard at all (`admin/routes.py:1499`).

| Capability | Present? | Evidence |
| --- | --- | --- |
| **Shared secret auth** | Yes | Constant-time compare, SHA-256 fingerprint on rejection |
| **Multiple keys** | Yes | `sub_keys` list, API-only |
| **Per-request principal** | No | `verify_api_key` returns `bool` |
| **Roles or scopes** | No | `SubKeyEntry` has three fields |
| **Per-key model allowlist** | No | Nowhere to store it |
| **Quotas or budgets** | No | No principal to meter |
| **OIDC / Keycloak / AD / LDAP / SAML** | No | Zero repo-wide hits outside vendored JavaScript |
| **Auth on by default** | No | `server.py:312` — no key configured means every request passes |

<aside class="callout"><strong class="callout__title">The right shape for a fix is not roles in oMLX.</strong><div class="callout__body">It is a proxy in front of it — Traefik ForwardAuth into
    oauth2-proxy into the Keycloak that is already running, or LiteLLM if you want per-user virtual keys with budgets and model
    allowlists. The one change worth making upstream is small and infrastructural: have the verifier return <em>which</em> key
    matched, so a request can be attributed at all. Identity providers, roles and quotas belong one layer up, and putting them in
    an inference server would be a mistake even if the plumbing existed.</div></aside>

2 · Thunderbolt 4 Treated As Broken Thunderbolt 5

The symptom is a warning nobody can resolve: _"RDMA is enabled, but ibv\_devices reported no RDMA interfaces."_ It is not a misconfiguration. RDMA over Thunderbolt requires **Thunderbolt 5** — MLX's own `distributed.rst` states it outright — while `rdma_ctl enable` sets a global flag on any Mac. A TB4 machine therefore reports _enabled_ with an empty device list, permanently, by design.

Backend Selection — Both Branches Reach The Same Answer

<svg viewBox="0 0 900 372" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Decision tree where Thunderbolt 5 and Thunderbolt 4 both select jaccl-ring, one of which cannot initialise">
      <defs>
        <marker id="ke" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#44403C"></path></marker>
        <path id="qea" d="M 450 94 L 450 130"></path><path id="qeb" d="M 450 130 L 230 130"></path>
        <path id="qec" d="M 450 130 L 670 130"></path><path id="qed" d="M 230 130 L 230 166"></path>
        <path id="qee" d="M 670 130 L 670 166"></path>
      </defs>
      <rect width="900" height="372" fill="#FFFFFF"></rect>
      <rect x="340" y="40" width="220" height="54" rx="10" fill="#FAFAF9" stroke="#44403C" stroke-width="2.5"></rect>
      <text x="450" y="64" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">Thunderbolt Link Found</text>
      <text x="450" y="84" text-anchor="middle" font-size="12" fill="#57534E">detect_transports()</text>
      <circle cx="538" cy="56" r="4.5" fill="#44403C"></circle>
      <circle cx="538" cy="56" r="4.5" fill="none" stroke="#44403C" stroke-width="1.5">
        <animate attributeName="r" values="4.5;18" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".85;0" dur="2.4s" repeatCount="indefinite"></animate></circle>
      <line x1="450" y1="94" x2="450" y2="130" stroke="#44403C" stroke-width="2"></line>
      <line x1="230" y1="130" x2="670" y2="130" stroke="#44403C" stroke-width="2"></line>
      <line x1="230" y1="130" x2="230" y2="166" stroke="#44403C" stroke-width="2" marker-end="url(#ke)"></line>
      <line x1="670" y1="130" x2="670" y2="166" stroke="#44403C" stroke-width="2" marker-end="url(#ke)"></line>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.2s" repeatCount="indefinite"><mpath href="#qea" xlink:href="#qea"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.4s" begin="1.2s" repeatCount="indefinite"><mpath href="#qeb" xlink:href="#qeb"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur="1.4s" begin="1.2s" repeatCount="indefinite"><mpath href="#qec" xlink:href="#qec"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".8s" begin="2.6s" repeatCount="indefinite"><mpath href="#qed" xlink:href="#qed"></mpath></animateMotion></circle>
      <circle r="3.5" fill="#44403C"><animateMotion dur=".8s" begin="2.6s" repeatCount="indefinite"><mpath href="#qee" xlink:href="#qee"></mpath></animateMotion></circle>
      <rect x="120" y="170" width="220" height="64" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="230" y="196" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">TB5 · macOS 26.2</text>
      <text x="230" y="218" text-anchor="middle" font-size="12" fill="#57534E">ibv_devices Lists RDMA</text>
      <rect x="560" y="170" width="220" height="64" rx="10" fill="#FFFFFF" stroke="#E7E5E4" stroke-width="1.5"></rect>
      <text x="670" y="196" text-anchor="middle" font-size="13" font-weight="700" fill="#1C1917">TB4 · Any macOS</text>
      <text x="670" y="218" text-anchor="middle" font-size="12" fill="#57534E">ibv_devices Returns Empty</text>
      <line x1="230" y1="234" x2="230" y2="268" stroke="#44403C" stroke-width="2" marker-end="url(#ke)"></line>
      <line x1="670" y1="234" x2="670" y2="268" stroke="#44403C" stroke-width="2" marker-end="url(#ke)"></line>
      <rect x="120" y="268" width="220" height="48" rx="10" fill="#F0FDF4" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="230" y="290" text-anchor="middle" font-size="12.5" font-weight="700" fill="#166534">Backend: jaccl-ring</text>
      <text x="230" y="308" text-anchor="middle" font-size="12" fill="#166534">Initialises Correctly</text>
      <rect x="560" y="268" width="220" height="48" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="670" y="290" text-anchor="middle" font-size="12.5" font-weight="700" fill="#991B1B">Backend: jaccl-ring</text>
      <text x="670" y="308" text-anchor="middle" font-size="12" fill="#991B1B">Cannot Initialise</text>
      <text x="450" y="346" text-anchor="middle" font-size="12" font-weight="600" fill="#57534E">autoconfigure.py:374 Returns The Same Backend For Both Branches</text>
    </svg>

## Four Defects Behind One Warning

1

A Backend The Hardware Cannot Open

`autoconfigure.py:374` returns `"jaccl-ring"` with the reason _"Thunderbolt link detected, without RDMA"_. But `inference_worker.py:961` maps any `jaccl*` backend onto `mx.distributed.init(backend="jaccl")`, and MLX's `configure_jaccl_ring` builds `rdma_*` device names. Upstream maps Thunderbolt-without-RDMA to `ring`. oMLX does not.

2

Recovery Advice That Cannot Help

`classify_link()` at `transport.py:506` emits its `rdma_not_enabled` branch, telling the operator to boot into macOS Recovery and run `rdma_ctl enable` — on a machine where `rdma_ctl status` already reports enabled. The branch ignores `tb_version` and never receives the `rdma_ctl` state at all.

3

A Terminal State Reported As A Fault

`probe.py:527` raises the warning as though something is misconfigured, and the transport state reads `peer_linked_config_pending` when nothing is pending and nothing ever will be.

4

A Successful Read Thrown Away

`_extract_tb_link_speed` at `transport.py:293` makes its own SSH call from inside the topology `try` block. When that one call fails, a connectivity matrix that was read successfully is discarded along with it — distinct from the probe-synthesises-Ethernet bug, because here the read _worked_.

<aside class="callout"><strong class="callout__title">TB4 is already supportable — the classification is what is wrong.</strong><div class="callout__body">Topology discovery via
    <code>system_profiler SPThunderboltDataType</code> and <code>networksetup -listallhardwareports</code> touches no RDMA at all.
    MLX already maps this case to <code>ring</code>. And oMLX's own tensor-parallel gate,
    <code>_COLLECTIVE_CAPABLE_KINDS</code> at <code>link_bandwidth.py:61</code>, already admits <code>"thunderbolt"</code>
    alongside <code>"rdma"</code>. Every capability needed is present; one branch picks the wrong name.</div></aside>

## One Honest Open Question

MLX's documentation says JACCL is necessary for tensor parallelism. oMLX's own measurement, recorded in the comment directly above `_COLLECTIVE_CAPABLE_KINDS`, disagrees about how bad the alternative is — and quantifies it:

```bash
# omlx/cluster/link_bandwidth.py:55
# on this fabric the *same* Thunderbolt cable gave 28.6 tok/s under RDMA and
# 6.6 tok/s under the TCP ring — 4.3x from the transport alone, at identical
# bandwidth.
```

So the fix is unambiguous: stop TB4 selecting a backend that cannot initialise. What happens next is not. Whether a TB4 pair should then be offered tensor parallelism over `ring` at 4.3× the cost, or steered to pipeline parallelism instead, is a product decision with a real trade-off on both sides. It deserves to be argued in the open rather than smuggled into a bug fix.

What The Three Findings Have In Common

None of these is a typo. Each is a feature that looks finished from the outside — green dashboard cards, passing tests, responding endpoints, plausible log messages, actionable-sounding advice. The SLO subsystem is green because it measured nothing. The auth check succeeds without knowing who asked. The Thunderbolt classifier is confident and wrong.

**All three failures live in the wiring, not in the units.** `SLOTracker` is correct code with no producer. `verify_any_api_key` is correct code that discards its most useful intermediate value. `classify_link` is correct code that was never handed the one input that would let it decide properly. Unit tests cannot see any of that by construction, because a unit test supplies its own inputs.

The counter-example is in the same repository, on tab 3: the activation gate that recomputes a plan signature and refuses to launch something different from what was approved. That one exists because somebody watched the failure happen and wrote the check that would have caught it. **That is the difference between code that was tested and code that was operated.**
