---
title: "920 Nodes, 2767 Edges: Mapping kri with graphify — A Real Fleet Codebase Knowledge Graph"
date: 2026-05-27
description: "I ran graphify on kri, a FastAPI + React + SaltStack Mac Mini fleet manager, and let AST extraction + community detection reveal its 51 architectural clusters, 10 god-nodes, and the surprising cross-community bridges hiding in plain sight."
tags: [kri, knowledge-graph, graphify]
cover: "assets/images/Coding_with_Style-2_uhd.jpg"
draft: false
---

<svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0"><circle cx="8" cy="8" r="7" stroke="#2563EB" stroke-width="1.5"></circle><path d="M8 5v3l2 2" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"></path></svg>

Knowledge Graph · May 2026

I pointed graphify at `fleet_platform/` — the Python backend of kri, a SaltStack + FastAPI Mac Mini fleet manager — and let AST extraction + community detection tell me the truth about the codebase. No vibes, no guessing. Here's what 122 files look like when you turn them into a graph.

Nodes

920

classes · functions · types

Edges

2,767

69% extracted, 31% inferred

Communities

51

architectural clusters

Files Scanned

122

fleet\_platform/ Python only

TL;DR

-   **Node is the god of gods** — 131 connections, touching every feature area. If you change the Node model, everything breaks.
-   **PlatformSetting is the silent orchestrator** — 37 edges, referenced from bytes and bool types, meaning platform\_settings\_svc.py is used in ways that aren't obvious from reading the code linearly.
-   **Playbook Discovery is the most cohesive module** — cohesion 0.49 (near perfect), 9 tightly-coupled nodes. Everything else could learn from its design.
-   **Node and FastAPI are the two cross-community bridges** — betweenness centrality 0.243 and 0.083. Change either and you'll feel it in all 12 feature communities.
-   **20 isolated nodes** — orphans with ≤1 connection. Dead code candidates or missing edges worth investigating.

## 1Setting Up graphify (Without an API Key)

The standard install is `uv tool install graphifyy` (double-y on PyPI — the package name). The Claude Code skill handles everything else. The trick is that graphify can use Claude Code's own subagent dispatch as the LLM instead of requiring a separate `ANTHROPIC_API_KEY`. No billing setup, no key management.

terminal bash Copy

```bash
# 1. Install the library
uv tool install graphifyy   # installs graphify CLI + Python package

# 2. Register the Claude Code skill
graphify install            # writes ~/.claude/skills/graphify/SKILL.md
                            # and adds an entry to ~/.claude/CLAUDE.md

# 3. Run on your codebase (no API key needed — uses Claude subagent dispatch)
# In Claude Code, just type:
/graphify fleet_platform/
```

<aside class="callout"><strong class="callout__title">No API key required.</strong><div class="callout__body">graphify's SKILL.md explicitly states it falls through to Claude Code subagent dispatch when no <code>GEMINI_API_KEY</code> or <code>GOOGLE_API_KEY</code> is set. The host session is the LLM. This means it works with any Claude Code subscription, including plans that don't expose API keys.</div></aside>

For kri I scoped the run to `fleet_platform/` (the Python backend). The full project is 551 files when you include Salt playbooks, frontend, and tests — but 199 of those are YAML/SLS config files with limited semantic value. The backend at 122 files is the richest target for a knowledge graph.

graphify pipeline summary log Copy

```bash
Corpus: 122 files · ~35,300 words
  code: 122 files (.py)

AST extraction: 122/122 files (100%) [20 workers]
  → 941 nodes, 3647 raw edges

Graph build (after dedup): 920 nodes · 2767 edges · 51 communities
  69% EXTRACTED · 31% INFERRED · 0% AMBIGUOUS
```

Extraction took under 2 minutes. The AST extractor uses tree-sitter with 20 parallel workers — it's fast. No LLM calls were needed for this code-only corpus; all edges come from static analysis.

## 2God Nodes — The 10 Most Connected

God nodes are the classes and functions with the most edges. They're your highest-risk change points and your best entry points for understanding the codebase. Here's what graphify found:

#1 Node

131 edges

#2 HTTPException

73 edges

#3 PaginatedResponse

58 edges

#4 Base

56 edges

#5 GroupMember

45 edges

#6 Group

38 edges

#7 PlatformSetting

37 edges

#8 NodeFact

35 edges

#9 AsyncSession

35 edges

#10 Tag

30 edges

**Node has 131 connections** — almost double the second-place HTTPException at 73. This is the most load-bearing class in the entire backend. Any migration, field rename, or relationship change on Node ripples through every feature area: auth, SBOM, baselines, drift, alerts, groups, fleet health, iOS tracking, and more.

PlatformSetting at #7 (37 edges) is the one that surprised me. It's the settings-as-database table, and it shows up everywhere — including inferred connections from `bytes` and `bool` types in `platform_settings_svc.py`. This is exactly the "god-node you didn't know you had" pattern: a service that's 15 places' dependency but lives in one file.

AsyncSession appearing at #9 (35 edges) is healthy — it means the codebase consistently uses the dependency-injection pattern for database access. If AsyncSession were absent from this list, you'd suspect leaked sessions or direct engine access.

## 351 Communities — Architectural Clusters

Community detection (Louvain algorithm) found 51 clusters. The cohesion score measures how tightly a community's nodes connect to each other vs. the rest of the graph. 1.0 = fully internal, 0.0 = all edges cross community boundaries. Here are the 20 most significant:

Auth & Access Control

90 nodes

0.07

LLM Integration

87 nodes

0.06

Audit & Execution Tracking

77 nodes

0.09

Ansible & Bootstrap

73 nodes

0.11

SBOM & Security Scanning

67 nodes

0.07

Platform Config & DB Session

65 nodes

0.06

Baseline & Drift Detection

58 nodes

0.07

JWT Auth & API Dependencies

52 nodes

0.07

Alerting & Rules Engine

44 nodes

0.13

iOS Device Tracking

39 nodes

0.13

Group Management

35 nodes

0.14

App Bootstrap & Middleware

32 nodes

0.10

Fleet Health Monitoring

27 nodes

0.14

Salt Maintenance Metrics

21 nodes

0.19

Salt Operations

18 nodes

0.14

Device Provisioning

17 nodes

0.22

Playbook Source Management

14 nodes

0.25

Drift Detection Engine

14 nodes

0.25

Playbook Discovery

10 nodes

0.49 ⭐

Core Configuration

8 nodes

0.25

**Playbook Discovery (cohesion 0.49)** is the best-designed module in the backend. Its 9 internal nodes — `discover_all()`, `_discover_playbooks()`, `_discover_roles()`, `_lint_yaml()`, `_parse_description()`, `PlaybookEntry` — almost exclusively connect to each other. Tight, focused, no leakage. This is the benchmark the other modules should aim for.

The large communities (Auth, LLM, Audit — 70–90 nodes each) show low cohesion (0.06–0.09) because they pull in many shared types like `AsyncSession`, `str`, `int`. That's normal for route-heavy API code. The meaningful cohesion signal comes from the smaller, focused communities.

The 29 migration communities (one per Alembic migration file) are singletons — each migration's 3 nodes (module, upgrade, downgrade) form a tight trio. Expected, and correct.

## 4Cross-Community Bridges

graphify's betweenness centrality identifies which nodes act as bridges between otherwise separate clusters. High betweenness = removal of that node splits the graph. These are your architectural risks:

<svg viewBox="0 0 780 320" width="720" height="296" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="390" cy="160" rx="80" ry="50" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></ellipse>
            <text x="390" y="148" text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A" font-family="ui-monospace,monospace">Node</text>
            <text x="390" y="163" text-anchor="middle" font-size="11" fill="#2563EB" font-family="ui-monospace,monospace">betweenness 0.243</text>
            <text x="390" y="178" text-anchor="middle" font-size="11" fill="#4B5563" font-family="ui-sans-serif,sans-serif">131 edges</text>
            <ellipse cx="120" cy="80"  rx="55" ry="30" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></ellipse>
            <text x="120" y="77" text-anchor="middle" font-size="11" font-weight="600" fill="#7C3AED">Auth &amp; Access</text>
            <text x="120" y="91" text-anchor="middle" font-size="10" fill="#4B5563">Control</text>
            <ellipse cx="640" cy="80"  rx="55" ry="30" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"></ellipse>
            <text x="640" y="77" text-anchor="middle" font-size="11" font-weight="600" fill="#0D9488">SBOM &amp; Security</text>
            <text x="640" y="91" text-anchor="middle" font-size="10" fill="#4B5563">Scanning</text>
            <ellipse cx="100" cy="200" rx="60" ry="30" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"></ellipse>
            <text x="100" y="197" text-anchor="middle" font-size="11" font-weight="600" fill="#16A34A">Baseline &amp;</text>
            <text x="100" y="211" text-anchor="middle" font-size="10" fill="#4B5563">Drift Detection</text>
            <ellipse cx="660" cy="200" rx="60" ry="30" fill="#FFF7ED" stroke="#FED7AA" stroke-width="1.5"></ellipse>
            <text x="660" y="197" text-anchor="middle" font-size="11" font-weight="600" fill="#C2410C">Ansible &amp;</text>
            <text x="660" y="211" text-anchor="middle" font-size="10" fill="#4B5563">Bootstrap</text>
            <ellipse cx="200" cy="280" rx="60" ry="28" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></ellipse>
            <text x="200" y="278" text-anchor="middle" font-size="11" font-weight="600" fill="#DC2626">Alerting &amp;</text>
            <text x="200" y="292" text-anchor="middle" font-size="10" fill="#4B5563">Rules Engine</text>
            <ellipse cx="390" cy="290" rx="60" ry="26" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></ellipse>
            <text x="390" y="288" text-anchor="middle" font-size="11" font-weight="600" fill="#2563EB">Fleet Health</text>
            <text x="390" y="302" text-anchor="middle" font-size="10" fill="#4B5563">Monitoring</text>
            <ellipse cx="580" cy="280" rx="60" ry="28" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></ellipse>
            <text x="580" y="278" text-anchor="middle" font-size="11" font-weight="600" fill="#7C3AED">Group</text>
            <text x="580" y="292" text-anchor="middle" font-size="10" fill="#4B5563">Management</text>
            <ellipse cx="220" cy="58"  rx="52" ry="26" fill="#F0FDFA" stroke="#99F6E4" stroke-width="1.5"></ellipse>
            <text x="220" y="56" text-anchor="middle" font-size="11" font-weight="600" fill="#0D9488">Audit &amp;</text>
            <text x="220" y="70" text-anchor="middle" font-size="10" fill="#4B5563">Execution</text>
            <ellipse cx="540" cy="58"  rx="52" ry="26" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></ellipse>
            <text x="540" y="56" text-anchor="middle" font-size="11" font-weight="600" fill="#D97706">iOS Device</text>
            <text x="540" y="70" text-anchor="middle" font-size="10" fill="#4B5563">Tracking</text>
            <line x1="330" y1="140" x2="172" y2="102" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="450" y1="140" x2="588" y2="102" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="325" y1="170" x2="158" y2="196" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="455" y1="170" x2="602" y2="196" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="340" y1="200" x2="258" y2="264" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="390" y1="210" x2="390" y2="264" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="440" y1="200" x2="522" y2="254" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="350" y1="130" x2="270" y2="82" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="430" y1="130" x2="490" y2="82" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="315" y1="152" x2="175" y2="80" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
            <line x1="465" y1="152" x2="605" y2="80" stroke="#93C5FD" stroke-width="1.5" stroke-dasharray="4,3"></line>
          </svg>

<aside class="callout"><strong class="callout__title">Node (betweenness 0.243)</strong><div class="callout__body">connects Auth &amp; Access Control, Audit, Ansible, SBOM, Platform Config, Baselines, JWT Auth, Alerting, iOS Tracking, Group Management, and Fleet Health. It is the single most dangerous node to change carelessly — graph theory quantifies what code review intuition suspects.</div></aside>

FastAPI (betweenness 0.083) is the second bridge — it wires the App Bootstrap community to all 14 feature communities through the router registration in `api/main.py`. This is expected and healthy; FastAPI's middleware and lifespan hooks intentionally cross feature boundaries.

## 5Surprising Connections

graphify flags edges it infers that you probably didn't explicitly code — cross-module relationships surfaced by structural analysis. These are worth verifying: some are genuine hidden couplings, some are over-inference.

bytes —uses→ PlatformSetting \[INFERRED\]

`fleet_platform/services/platform_settings_svc.py` → `fleet_platform/models/platform_setting.py`  
This surfaced because `platform_settings_svc` stores encrypted values as bytes and reads them back — the Fernet encryption path creates an implicit bytes↔PlatformSetting coupling not obvious without graph analysis.

bool —uses→ PlatformSetting \[INFERRED\]

`fleet_platform/services/platform_settings_svc.py` → `fleet_platform/models/platform_setting.py`  
Boolean settings (like `maintenance_mode`) are stored as strings in the DB and cast at read time — another implicit type coupling the graph caught.

object —uses→ Base \[INFERRED\]

`fleet_platform/models/llm_endpoint.py` → `fleet_platform/models/base.py`  
LLMEndpoint uses SQLAlchemy's `object` type for the JSON column storing endpoint metadata — this creates a phantom connection the graph picked up.

str —uses→ Node \[INFERRED\]

`fleet_platform/api/routes/search.py` → `fleet_platform/models/node.py`  
The search endpoint filters by string query against Node fields — the inferred coupling is real: search is a Node consumer that doesn't import the model directly in its type annotations.

**The PlatformSetting surprises are actionable.** The bytes/bool ↔ PlatformSetting coupling means `platform_settings_svc.py` is harder to test in isolation than it appears. Add integration tests that cover the full encrypt/decrypt roundtrip through the ORM layer — not just unit tests that mock the model.

## 6Questions the Graph Asks Back

graphify generates suggested questions based on betweenness centrality and high inferred-edge counts. These are the questions worth answering before your next big refactor:

Why does Node connect Auth, Audit, Ansible, SBOM, Platform Config, Baselines, JWT Auth, Alerting, iOS Tracking, Group Management, and Fleet Health?

Betweenness centrality 0.243 — highest in the graph. Every feature community depends on Node, but not all of them actually need the full Node model. Consider a lightweight NodeSummary projection for features that only need ID + hostname.

Why does HTTPException connect 12 separate communities?

Betweenness 0.092. HTTPException is FastAPI's error primitive — every route raises it. The graph is correct; this isn't a risk but it means any change to error handling (e.g., custom error codes) must be applied uniformly across all 12 communities.

Are the 106 inferred relationships involving Node (with Base, TimestampMixin, etc.) actually correct?

Node has 106 INFERRED edges. Most are real (Node inherits Base, TimestampMixin, has many FK relationships). The graph can't fully verify without semantic analysis — running graphify with Gemini backend would add semantic edges for verification.

Are the 72 inferred relationships involving HTTPException correct?

Most will be correct (every route raises HTTPException on 404/403). The handful worth reviewing are the inferred edges from service-layer functions — services shouldn't raise HTTP-layer errors, that's a route concern.

What explains the 20 isolated nodes with ≤1 connection?

Candidates: init-only modules, single-use helpers, or genuinely dead code. Worth a manual pass — if something has no callers in a 122-file codebase, it probably doesn't need to exist.

## 7What to Do With This

The graph is a diagnostic, not a solution. Here's the concrete action list from this run:

| Finding | Action | Priority |
| --- | --- | --- |
| **Node** has 131 edges across all feature communities | Add a `NodeSummary` projection with just ID + hostname + status for features that don't need full model | P2 |
| **PlatformSetting** is referenced from bytes/bool types | Integration tests that cover the full Fernet encrypt/decrypt ↔ ORM roundtrip are already in place — verify they cover the bytes cast path | Done |
| **20 isolated nodes** with ≤1 connection | Run `/graphify query "which nodes have zero callers?"` and audit for dead code | P3 |
| **Playbook Discovery** cohesion 0.49 — best module | Use as the template pattern when designing new services — small, focused, single-file, high internal cohesion | Reference |
| **Platform Config community** cohesion 0.06 — lowest | platform_settings_svc has 15 importers. Document the public API clearly; consider a typed settings façade to reduce ad-hoc access | P2 |
| Services raising **HTTPException** directly | Move HTTP-layer errors to route handlers; services should raise domain exceptions, routes convert them | P3 |

<aside class="callout"><strong class="callout__title">Open the interactive graph:</strong><div class="callout__body"><code>graphify-out/graph.html</code> in the kri repo. It's a 1MB self-contained HTML file — no server needed, open directly in any browser. Filter by community, click nodes to trace edges, zoom to the clusters that matter.</div></aside>

The graph file is at `/home/dk/Documents/git/kri/graphify-out/graph.html`. Community filtering, edge weighting by confidence, and node search are all built into the visualization. It runs entirely client-side using vis.js — no backend required.

For ongoing use: graphify has a `/graphify query` mode that answers natural-language questions by traversing the graph with BFS/DFS. Once the graph is built, queries like _"What calls drift\_engine?"_ or _"Trace the auth flow from request to token"_ run in seconds without re-extracting.
