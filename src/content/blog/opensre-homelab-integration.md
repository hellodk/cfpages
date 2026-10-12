---
title: "19 Investigations, 1 Correct Diagnosis: Wiring opensre Into a Real Kubernetes Homelab"
date: 2026-08-09
description: "Wiring the opensre AI-SRE CLI into a real k0s cluster, a local LLM, and Grafana behind Traefik. A Cloudflare Access edge that silently breaks API clients, a literal never-substituted password placeholder in git, two new database connectors caught by review before a line of code shipped, and a live i"
tags: [opensre, homelab, kubernetes, sre]
cover: "assets/images/covers/opensre-homelab-integration.svg"
draft: false
---

🔍 Build & Debug Log

The plan was to point `opensre` — an open-source AI-SRE CLI that investigates incidents by making LLM-driven tool calls against Kubernetes and Grafana — at a real cluster, a real local LLM, and a real Grafana instance, then build two new database connectors for it, then run a live incident investigation end to end. Three of those four things went well the first week. The fourth — one real `ImagePullBackOff`, investigated by a local model — took nineteen attempts spread across several more days, ran through timeouts, a hard-coded token cap, a GPU crash, a distributed inference cluster, and one confidently wrong, fabricated diagnosis, before a nineteenth attempt on a different inference server produced a diagnosis that was actually correct — and provably so, not just plausible-sounding. Both halves of that arc are the point of this post.

TL;DR

-   **Three integrations wired:** Kubernetes via `~/.kube/config`, a local MLX inference server via opensre's generic OpenAI-compatible "ollama" provider, and a real Grafana instance behind Traefik — Kubernetes and Grafana both verified clean.
-   **Grafana's public hostname was a dead end** — not because Grafana was broken, but because Cloudflare Access sits in front of it and 302-redirects _every_ request, including Bearer-token API calls, to a login page. The direct LAN path worked immediately.
-   **A stored admin password was a literal, never-substituted `${GRAFANA_ADMIN_PASSWORD}`** string in a Helm values file. Git history — not guessing — showed it had already been fixed twice downstream: a SealedSecret, then a full Keycloak SSO migration.
-   **Two new connectors (Aerospike, YugabyteDB) went through a real design-doc review pipeline** — two independent expert passes each — before any implementation code existed. The reviews caught concrete, ship-blocking bugs, not style nits.
-   **One architecture pivot, decided with a human in the loop:** Aerospike's connector was redesigned from a raw-socket binary protocol client to a thin CLI wrapper around Aerospike's own `asinfo` tool, after review flagged real protocol and auth risk.
-   **The live investigation failed thirteen different ways before the real root cause surfaced:** environment variables, dead upstreams, timeouts, a model mismatch, a hard-coded prompt-token cap that kept coming up a few tokens short, a GPU crash, and a razor-thin 1.4GB memory margin — all on a local inference stack that, it turned out, was silently ignoring the one feature opensre's diagnosis step actually depends on.
-   **A direct `curl` test found the real root cause:** every backend tried — a custom MLX proxy, a distributed `exo` cluster, and vLLM — returned HTTP 200 while silently discarding OpenAI-style structured-output (`response_format`) requests. None of them enforced the JSON schema opensre relies on to parse a diagnosis.
-   **The fix was a different inference server, oMLX** — verified against its own source and test suite, not its marketing site, to confirm it does genuine grammar-constrained decoding via `xgrammar` rather than silently accepting and ignoring the parameter.
-   **The most important finding wasn't the eventual success — it was the first attempt on the new backend:** a small model produced a fast, confident, fully-structured diagnosis that was completely fabricated, citing tool calls that never happened and contradicting itself in the same sentence. A wrong answer that looks right is worse than an honest failure.
-   **Attempt 19 finally succeeded** — a stronger model on a second Mac mini, running against oMLX, produced a diagnosis independently verified against the raw Kubernetes evidence: missing `imagePullSecrets`, confirmed by real differential diagnosis against a healthy pod in the same namespace.

Integrations wired

3

Kubernetes, Grafana, local LLM

Connector PRs shipped

2

YugabyteDB #1, Aerospike #2

Tests passing

240

142 + 98, independently re-run

Investigation attempts

19

1 correct, verified diagnosis

## 1 Three integrations: Kubernetes, a local LLM, Grafana

`opensre` is an AI-SRE CLI: point it at an alert or a symptom, and it makes LLM-driven tool calls against whatever's wired in — Kubernetes, Grafana, and other integrations — to build up evidence and produce a diagnosis. None of that works without three things actually being reachable: a cluster to query, an LLM to drive the tool calls, and an observability backend to pull metrics and traces from. Today's session wired all three against real infrastructure, not mocks.

Kubernetes came first and was the easiest: point opensre at `~/.kube/config` and run `opensre integrations verify kubernetes`. It connected cleanly on the first try — `0` pods reported in the `default` namespace, which is correct and expected, since the real workloads on this cluster live in `monitoring`, `utilities`, and `persona`, not `default`.

The local LLM was a local OpenAI-compatible inference server (MLX, running on Apple Silicon) reachable at `192.0.2.64:8080`. opensre wires this up through `LLM_PROVIDER=ollama` and `OLLAMA_HOST` — but despite the name, opensre's "ollama" provider is a generic OpenAI-compatible HTTP client pointed at `${OLLAMA_HOST}/v1`. It never calls an Ollama-specific endpoint, which is exactly why it worked fine against a server that isn't Ollama at all.

.env — local LLM wiringbash

```bash
LLM_PROVIDER=ollama
OLLAMA_HOST=http://192.0.2.64:8080
OLLAMA_MODEL=mlx-community/Meta-Llama-3.1-8B-Instruct-8bit
```

That model name was wrong by the end of the session — not because it was configured incorrectly at the start, but because the server itself had, at some point, started serving a different model (`mlx-community/Qwen3.5-4B-MLX-8bit`) without anyone updating opensre's config to match. Finding that mismatch — by asking the server what it was actually running, instead of trusting the config file — is its own small lesson, and it shows up again later in this post as one of nineteen investigation attempts. That same model family, at a larger size, is the one that eventually produces the correct diagnosis — just not on this server, and not for several more days.

opensre's Three Integrations, One Detour

<svg viewBox="0 0 1000 460" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrow-b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#2563EB"></path>
              </marker>
              <marker id="arrow-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#DC2626"></path>
              </marker>
              <marker id="arrow-g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#16A34A"></path>
              </marker>
            </defs>
            <rect x="390" y="26" width="220" height="64" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
            <text x="500" y="52" text-anchor="middle" font-size="14" font-weight="700" fill="#F9FAFB">opensre CLI</text>
            <text x="500" y="70" text-anchor="middle" font-size="12" fill="#CBD5E1">Investigation Runtime</text>
            <circle cx="500" cy="58" r="30" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0.6">
              <animate attributeName="r" values="30;60;30" dur="3s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite"></animate>
            </circle>
            <rect x="100" y="160" width="200" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="200" y="184" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Kubernetes</text>
            <text x="200" y="200" text-anchor="middle" font-size="12" fill="#4B5563">Verified, 0 Pods In Default</text>
            <rect x="400" y="160" width="200" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="500" y="184" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Grafana</text>
            <text x="500" y="200" text-anchor="middle" font-size="12" fill="#4B5563">Behind Traefik Ingress</text>
            <rect x="700" y="160" width="200" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="800" y="184" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Local LLM</text>
            <text x="800" y="200" text-anchor="middle" font-size="12" fill="#4B5563">MLX Via Openai Client</text>
            <path d="M 500,90 L 500,132 L 200,132 L 200,160" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow-b)"></path>
            <path d="M 500,90 L 500,160" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow-b)"></path>
            <path d="M 500,90 L 500,132 L 800,132 L 800,160" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow-b)"></path>
            <rect x="250" y="284" width="200" height="56" rx="8" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
            <text x="350" y="306" text-anchor="middle" font-size="13" font-weight="700" fill="#7F1D1D">Cloudflare Access</text>
            <text x="350" y="322" text-anchor="middle" font-size="12" fill="#7F1D1D">Blocked — 302 To Login</text>
            <rect x="550" y="284" width="200" height="56" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"></rect>
            <text x="650" y="306" text-anchor="middle" font-size="13" font-weight="700" fill="#14532D">Direct LAN :32443</text>
            <text x="650" y="322" text-anchor="middle" font-size="12" fill="#14532D">Verified — Works</text>
            <path d="M 500,216 L 500,250 L 350,250 L 350,284" stroke="#DC2626" stroke-width="1.5" fill="none" marker-end="url(#arrow-r)"></path>
            <path d="M 500,216 L 500,250 L 650,250 L 650,284" stroke="#16A34A" stroke-width="1.5" fill="none" marker-end="url(#arrow-g)"></path>
            <rect x="550" y="380" width="200" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="650" y="402" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Datasources Found</text>
            <text x="650" y="418" text-anchor="middle" font-size="12" fill="#4B5563">Prometheus, Tempo</text>
            <path d="M 650,340 L 650,380" stroke="#16A34A" stroke-width="1.5" fill="none" marker-end="url(#arrow-g)"></path>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,90 L 500,132 L 200,132 L 200,160"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2s" repeatCount="indefinite" path="M 500,90 L 500,160"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,90 L 500,132 L 800,132 L 800,160"></animateMotion></circle>
            <circle r="3" fill="#DC2626"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 500,216 L 500,250 L 350,250 L 350,284"></animateMotion></circle>
            <circle r="3" fill="#16A34A"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 500,216 L 500,250 L 650,250 L 650,284"></animateMotion></circle>
            <circle r="3" fill="#16A34A"><animateMotion dur="1.6s" repeatCount="indefinite" path="M 650,340 L 650,380"></animateMotion></circle>
          </svg>

## 2 The Grafana detour: Cloudflare Access at the edge

The first attempt at wiring Grafana pointed opensre at the public hostname, `apps.thecylon.org/grafana`. It failed — not with a Grafana error, but with every API call, Bearer token included, coming back as a redirect to a login page.

**The actual cause:** the public hostname sits behind Cloudflare Access (Zero Trust). Access intercepts _every_ request at the edge — including non-interactive API calls carrying a Bearer token — and 302-redirects them to its own login page before Grafana ever sees the request. From opensre's side, this looks identical to Grafana itself being broken. It isn't; Grafana never gets asked.

The fix was to stop going through the public tunnel at all and use the direct LAN path instead: `https://thecylon.local:32443/grafana`, straight to Traefik on the cluster, bypassing Cloudflare entirely. That worked on the first try — `opensre integrations verify grafana` discovered both configured datasources, `prometheus` and `tempo`, cleanly.

<aside class="callout"><strong class="callout__title">The lesson worth keeping:</strong><div class="callout__body">zero-trust edge proxies are built to protect
          interactive human logins, and they do that well. But they don't distinguish "a person in
          a browser" from "a Bearer-token API client" unless you explicitly tell them to — and
          until you do, every automated tool pointed at that hostname will fail in a way that looks
          exactly like the backend service is broken. Prefer the direct/LAN path for
          machine-to-machine calls; save the public tunnel for the cases that actually need it.</div></aside>

## 3 Credential archaeology: a placeholder in git

Getting past the network path didn't mean getting into Grafana. The admin password opensre was configured to use came from a Helm values file — and the value stored there wasn't a password. It was the literal string `${GRAFANA_ADMIN_PASSWORD}`, sitting un-substituted in git, exactly as if some templating step had silently failed and nobody had noticed since.

grafana/values.yaml (as found in git)yaml

```bash
adminUser: admin
adminPassword: "${GRAFANA_ADMIN_PASSWORD}"  # never substituted
```

The instinct here is to guess, or to reset the password outright. Neither was necessary. The repo's own git history had the real answer, and reading it — not brute-forcing anything, not escalating any privilege — turned up the actual story in two commits:

Placeholder found — `${GRAFANA_ADMIN_PASSWORD}`, never substituted

↓

Git history checked, not guessed — found the commit that actually fixed it

↓

Real fix #1: a SealedSecret, `grafana-admin`, replacing the plain value

↓

Real fix #2: a separate SSO migration to Keycloak (`auth.generic_oauth`) — the actual day-to-day login path

↓

Read the live Secret via existing `kubectl` access — working admin credentials, no reset needed

**The lesson worth keeping:** broken-looking config sitting in git is not proof the running cluster is broken the same way. The Helm values file was stale, not the cluster — a SealedSecret and an SSO migration had already superseded it. Check live state and version history before assuming a fix is needed at all.

## 4 Two new connectors, one design doc, two independent reviews

With the three integrations verified, the next ask was two brand-new database connectors: Aerospike and YugabyteDB. GitHub Issues were disabled on this fork, so — per the standing "no work without a ticket" rule — a full design doc stood in for the ticket instead, one per connector, each grounded in the closest existing precedent already in the codebase: YugabyteDB's plan mirrored the existing `postgresql` integration, since YugabyteDB's YSQL API is PostgreSQL-wire-compatible; Aerospike's plan initially mirrored `redis`'s wiring shape.

Neither doc went straight to implementation. Both went through two independent review passes before a single line of connector code existed: a domain-accuracy reviewer (playing an experienced engineer on that specific database) and an opensre-conventions reviewer (checking the plan against the actual live codebase files, not against memory).

Design Doc Review Pipeline — Before Any Code Existed

<svg viewBox="0 0 1000 610" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrow-p" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#7C3AED"></path>
              </marker>
            </defs>
            <rect x="390" y="26" width="220" height="64" rx="10" fill="#1a1a3e" stroke="#7C3AED" stroke-width="1.5"></rect>
            <text x="500" y="52" text-anchor="middle" font-size="14" font-weight="700" fill="#F9FAFB">Draft Design Docs</text>
            <text x="500" y="70" text-anchor="middle" font-size="12" fill="#CBD5E1">YugabyteDB + Aerospike Plans</text>
            <circle cx="500" cy="58" r="30" fill="none" stroke="#7C3AED" stroke-width="1.5" opacity="0.6">
              <animate attributeName="r" values="30;60;30" dur="3s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite"></animate>
            </circle>
            <rect x="190" y="170" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="300" y="192" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Domain Accuracy Review</text>
            <text x="300" y="208" text-anchor="middle" font-size="12" fill="#4B5563">Expert-Engineer Persona</text>
            <rect x="590" y="170" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="700" y="192" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Conventions Review</text>
            <text x="700" y="208" text-anchor="middle" font-size="12" fill="#4B5563">Checked Against Live Code</text>
            <path d="M 500,90 L 500,140 L 300,140 L 300,170" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <path d="M 500,90 L 500,140 L 700,140 L 700,170" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <rect x="390" y="290" width="220" height="56" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
            <text x="500" y="312" text-anchor="middle" font-size="13" font-weight="700" fill="#4C1D95">Corrections Folded In</text>
            <text x="500" y="328" text-anchor="middle" font-size="12" fill="#4C1D95">Plans Revised, Not Code</text>
            <path d="M 300,226 L 300,258 L 500,258 L 500,290" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <path d="M 700,226 L 700,258 L 500,258 L 500,290" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <rect x="190" y="410" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="300" y="432" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">YugabyteDB Worktree</text>
            <text x="300" y="448" text-anchor="middle" font-size="12" fill="#4B5563">feat/yugabytedb-integration</text>
            <rect x="590" y="410" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="700" y="432" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Aerospike Worktree</text>
            <text x="700" y="448" text-anchor="middle" font-size="12" fill="#4B5563">feat/aerospike-integration</text>
            <path d="M 500,346 L 500,378 L 300,378 L 300,410" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <path d="M 500,346 L 500,378 L 700,378 L 700,410" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <rect x="380" y="530" width="240" height="56" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"></rect>
            <text x="500" y="552" text-anchor="middle" font-size="13" font-weight="700" fill="#14532D">Independent Re-Verification</text>
            <text x="500" y="568" text-anchor="middle" font-size="12" fill="#14532D">240 Tests Passing, Not Self-Reported</text>
            <path d="M 300,466 L 300,498 L 500,498 L 500,530" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <path d="M 700,466 L 700,498 L 500,498 L 500,530" stroke="#7C3AED" stroke-width="1.5" fill="none" marker-end="url(#arrow-p)"></path>
            <circle r="3.5" fill="#7C3AED"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,90 L 500,140 L 300,140 L 300,170"></animateMotion></circle>
            <circle r="3.5" fill="#7C3AED"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,90 L 500,140 L 700,140 L 700,170"></animateMotion></circle>
            <circle r="3" fill="#7C3AED"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 300,226 L 300,258 L 500,258 L 500,290"></animateMotion></circle>
            <circle r="3" fill="#7C3AED"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 700,226 L 700,258 L 500,258 L 500,290"></animateMotion></circle>
            <circle r="3" fill="#7C3AED"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 500,346 L 500,378 L 300,378 L 300,410"></animateMotion></circle>
            <circle r="3" fill="#7C3AED"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 500,346 L 500,378 L 700,378 L 700,410"></animateMotion></circle>
            <circle r="3" fill="#16A34A"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 300,466 L 300,498 L 500,498 L 500,530"></animateMotion></circle>
            <circle r="3" fill="#16A34A"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 700,466 L 700,498 L 500,498 L 500,530"></animateMotion></circle>
          </svg>

Implementation, once the plans were finalized, ran as two independent agents, each in its own git worktree on its own branch (`feat/yugabytedb-integration`, `feat/aerospike-integration`) so neither could collide on shared files — the integration registry, alert routing, and so on. Strict TDD ceremony was explicitly skipped by direction ("TDD can be ignored, direct implementation") — tests were still written as part of the deliverable, just without the red-green-refactor cycle.

## 5 What the review caught before any code shipped

This is the part worth taking seriously: the review passes weren't a formality. They found real, concrete, ship-blocking bugs while the connectors were still prose.

| Connector | What the plan assumed | What review found |
| --- | --- | --- |
| YugabyteDB | Version string parses like plain PostgreSQL | Real output is PostgreSQL 11.2-YB-2.20.0.0-b0 ... — the planned parser would have produced a mangled version string |
| YugabyteDB | yb_servers() distinguishes master vs. tserver nodes | It actually distinguishes primary-cluster vs. read-replica nodes — a different axis entirely |
| YugabyteDB | pg_locks ports over like the Postgres integration's tool | Flagged unsafe as-is — YugabyteDB's distributed lock manager needs a different mechanism, excluded permanently rather than left vague |
| YugabyteDB | Plan covered every wiring touchpoint | A missing hookup in core/domain/diagnosis/alignment.py found and added |
| Aerospike | latency: info-protocol command still current | Stale — modern Aerospike uses latencies: (plural) |
| Aerospike | setup_order / verify_order slot was free | Collided with an existing integration's registry slot — fixed before it could ship broken |
| Aerospike | Alert-routing keyword "as" is a safe alias | Real substring-collision bug — silently matches inside words like "ask" or "class"; dropped |

**Why this matters more than the connector count:** every one of these is the kind of bug that a test suite written against the plan's own (wrong) assumptions would never catch — because the test would have encoded the same wrong assumption. Catching them required a second, independently-reasoning pass that treated the draft as something to verify, not something to trust.

## 6 The architecture pivot: raw socket vs. CLI wrapper

The original Aerospike plan hand-rolled Aerospike's binary info protocol directly over a raw TCP socket — a deliberate choice to avoid the official Aerospike Python client, which requires building a native C extension. The domain review flagged real risk in that design: uncertain byte-level protocol framing, and an authentication handshake (bcrypt with a fixed salt) that would have quietly reintroduced exactly the native-dependency problem the raw-socket approach was meant to avoid in the first place.

Three options were compared side by side, with a human making the final call rather than an agent deciding alone:

Option A

Raw Socket

Protocol + auth risk owned in-house, native-dependency problem not actually solved

Option B

Separate MCP Server

A whole new long-running service to build and operate, for one connector

Option C — chosen

CLI Wrapper

Subprocess around Aerospike's own `asinfo` tool

The CLI wrapper won decisively: zero protocol code to own, correct auth and TLS handling inherited for free from Aerospike's own tooling, and no new long-running service to build and operate. The design doc was revised to match before implementation started — the pivot happened on paper, not mid-refactor.

## 7 Shipped: two PRs, 240 tests, independently re-checked

Both connectors landed as open pull requests, each with the AI-usage disclosure section the repo's own PR template requires — an honest account of what was and wasn't verified against a live cluster, not a blanket "tested."

YugabyteDB — PR #1

142 Tests

5 tools: server status, current queries, table stats, cluster status via `yb_servers()`, slow queries via `pg_stat_statements`

Aerospike — PR #2

98 Tests

3 tools: node status, namespace stats (single-node/local-scope, documented as such), latency

Combined

240 Tests

Re-run independently, not trusted from the agents' own summaries

`github.com/hellodk/opensre/pull/1` (YugabyteDB) and `github.com/hellodk/opensre/pull/2` (Aerospike) both went through re-verification rather than being accepted on the implementing agents' say-so — the test counts above are what actually ran, not what the PR descriptions claimed.

## 8 The live investigation: nineteen attempts, one correct diagnosis

With the connectors shipped, the last piece was the actual point of the tool: run `opensre investigate` against a real incident and see if it produces a diagnosis. The incident was real and unambiguous — an `ImagePullBackOff` on the `persona-backend` pod in the `persona` namespace, stuck for 13+ hours on image `persona/backend:0.6.0`. What follows is not a clean success story. It took nineteen attempts, spread across several more days, running through two different Mac minis, four different inference backends, and one diagnosis that was confidently wrong before the real one landed. Every attempt below is presented in full, including the ones that make the eventual success look less impressive than it otherwise would — because the dead ends are the most honest data point in this whole session.

Nineteen Attempts, Grouped Into Five Phases

<svg viewBox="0 0 1000 220" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrow-w" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#D97706"></path>
              </marker>
            </defs>
            <rect x="65" y="60" width="150" height="72" rx="8" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
            <text x="140" y="82"  text-anchor="middle" font-size="12" font-weight="700" fill="#7F1D1D">Attempts 1&#8211;13</text>
            <text x="140" y="98"  text-anchor="middle" font-size="12" fill="#7F1D1D">Env Vars, Timeouts</text>
            <text x="140" y="114" text-anchor="middle" font-size="12" fill="#7F1D1D">Crashes, Token Caps</text>
            <rect x="245" y="60" width="150" height="72" rx="8" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
            <text x="320" y="82"  text-anchor="middle" font-size="12" font-weight="700" fill="#1E3A8A">Root Cause Found</text>
            <text x="320" y="98"  text-anchor="middle" font-size="12" fill="#1E3A8A">Curl Test Exposes</text>
            <text x="320" y="114" text-anchor="middle" font-size="12" fill="#1E3A8A">Silent Schema Ignore</text>
            <rect x="425" y="60" width="150" height="72" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
            <text x="500" y="82"  text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">Hallucination</text>
            <text x="500" y="98"  text-anchor="middle" font-size="12" fill="#92400E">Confident, Wrong,</text>
            <text x="500" y="114" text-anchor="middle" font-size="12" fill="#92400E">Evidence Fabricated</text>
            <rect x="605" y="60" width="150" height="72" rx="8" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
            <text x="680" y="82"  text-anchor="middle" font-size="12" font-weight="700" fill="#4C1D95">Parsing Near-Miss</text>
            <text x="680" y="98"  text-anchor="middle" font-size="12" fill="#4C1D95">Right Answer, Lost</text>
            <text x="680" y="114" text-anchor="middle" font-size="12" fill="#4C1D95">To A Validation Bug</text>
            <rect x="785" y="60" width="150" height="72" rx="8" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"></rect>
            <text x="860" y="82"  text-anchor="middle" font-size="12" font-weight="700" fill="#14532D">Attempt 19</text>
            <text x="860" y="98"  text-anchor="middle" font-size="12" fill="#14532D">Real Diagnosis,</text>
            <text x="860" y="114" text-anchor="middle" font-size="12" fill="#14532D">Verified Correct</text>
            <circle cx="860" cy="96" r="26" fill="none" stroke="#16A34A" stroke-width="1.5" opacity="0.6">
              <animate attributeName="r" values="26;50;26" dur="2.6s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite"></animate>
            </circle>
            <line x1="215" y1="96" x2="245" y2="96" stroke="#2563EB" stroke-width="1.5" marker-end="url(#arrow-b)"></line>
            <line x1="395" y1="96" x2="425" y2="96" stroke="#D97706" stroke-width="1.5" marker-end="url(#arrow-w)"></line>
            <line x1="575" y1="96" x2="605" y2="96" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#arrow-p)"></line>
            <line x1="755" y1="96" x2="785" y2="96" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arrow-g)"></line>
            <text x="140" y="154" text-anchor="middle" font-size="12" fill="#4B5563">Mlx Proxy, Exo, Vllm &#8212;</text>
            <text x="140" y="170" text-anchor="middle" font-size="12" fill="#4B5563">Caps, Crashes, Ram Limits</text>
            <text x="320" y="154" text-anchor="middle" font-size="12" fill="#4B5563">Every Backend Faked</text>
            <text x="320" y="170" text-anchor="middle" font-size="12" fill="#4B5563">Response_Format Support</text>
            <text x="500" y="154" text-anchor="middle" font-size="12" fill="#4B5563">Qwen3-1.7B Cited Calls</text>
            <text x="500" y="170" text-anchor="middle" font-size="12" fill="#4B5563">That Never Happened</text>
            <text x="680" y="154" text-anchor="middle" font-size="12" fill="#4B5563">Qwen3.5-4B Named It,</text>
            <text x="680" y="170" text-anchor="middle" font-size="12" fill="#4B5563">Fallback Parser Failed</text>
            <text x="860" y="154" text-anchor="middle" font-size="12" fill="#4B5563">oMLX + Qwen3.5-4B &#8212;</text>
            <text x="860" y="170" text-anchor="middle" font-size="12" fill="#4B5563">Root Cause Confirmed</text>
            <circle r="3" fill="#2563EB"><animateMotion dur="1.4s" repeatCount="indefinite" path="M 215,96 L 245,96"></animateMotion></circle>
            <circle r="3" fill="#D97706"><animateMotion dur="1.4s" repeatCount="indefinite" path="M 395,96 L 425,96"></animateMotion></circle>
            <circle r="3" fill="#7C3AED"><animateMotion dur="1.4s" repeatCount="indefinite" path="M 575,96 L 605,96"></animateMotion></circle>
            <circle r="3" fill="#16A34A"><animateMotion dur="1.4s" repeatCount="indefinite" path="M 755,96 L 785,96"></animateMotion></circle>
          </svg>

Attempt 1

Connection refused

A stray leftover `OLLAMA_HOST=0.0.0.0` environment variable from an old, unrelated Ollama install was already set in the shell. opensre loads its `.env` file with `override=False` — an already-set shell variable always wins — so the correct value from `.env` was silently ignored. Fixed by clearing the stray shell variable.

Attempt 2

`mlx upstream unavailable` — HTTP 500

With the environment variable fixed, the request reached the right host — and the local LLM server itself failed mid-request. No config bug this time, just the upstream server not answering.

Attempt 3

Complete timeout

A trivial 10-token completion request — about as small a probe as an LLM call gets — didn't return in 30+ seconds. The server was up enough to accept the connection and unresponsive past that point.

Attempt 4

`model not loaded` — HTTP 400

The server had, at some point, silently swapped which model it was actually serving — the same model-mismatch issue flagged in the setup section — without opensre's config being updated to match. Fixed by pointing the config at the model the server was actually running.

Attempt 5 — real, partial progress

10 genuine Kubernetes tool calls, then stuck, then dropped

With the model-name mismatch fixed, the investigation actually reached the tool-calling stage and made 10 real Kubernetes tool calls against the live cluster in about 19 seconds — list pods, describe pod, list deployments, get events, get pod logs, get resource, list daemonsets, list ingresses, list services, list statefulsets — proving the Kubernetes-integration-during-investigation path genuinely works end to end. The agent then looped on duplicate tool calls without gathering new information, triggering opensre's own built-in stagnation breaker (`"2 consecutive duplicate-only iterations — forcing tool-free conclusion"`). The final synthesis call back to the LLM was met with a connection refusal as the server dropped again mid-investigation.

Attempts 6–13 — still on the original, constrained Mac mini

Narrowing the diagnosis, one failure at a time

Eight more attempts, each ruling something out. A custom `mlx_metrics_proxy.py` fronting `mlx_lm.server` enforced a hard `MLX_MAX_PROMPT_TOKENS` cap — started at 12000, later raised to 16000 and then 24288 by the server's owner — and real investigations kept needing just slightly more tokens than the cap allowed, missing by as little as ~1 token past the `max_tokens` reservation, over and over. A `SendMessage` to a peer Claude Code session working on the actual inference-server code (the repo had moved from `~/Documents/git/mlx-oc` to `~/Documents/git/hydra/mlx/cluster/`) produced real telemetry: a `mlx_server_crashes_total{reason="metal_gpu_error"}` counter confirming an actual GPU crash, free-RAM measurements as low as 1.4GB on the 8GB Mac mini, and independent confirmation that the ~547-second "Diagnosing" stall seen earlier was opensre's own client-side retry loop (3 attempts × ~90s timeout, with backoff) exhausting itself — not a server-side stall.

The real root cause, isolated directly

A trivial `curl` test exposes the actual bug

Sent a trivial 2-field JSON-schema `response_format` request straight to the server with `curl`. It returned HTTP 200 but completely ignored the schema — free-form "thinking" text instead of constrained JSON. Every backend tried up to this point — the mlx\_lm proxy, an `exo` distributed cluster spanning both Mac minis, and a vLLM instance — shared this same silent-ignore behavior on OpenAI's strict structured-output feature, which is exactly what opensre's diagnose stage depends on (`client.chat.completions.parse(response_format=<PydanticModel>)`). `exo` was rejected outright: its own docs (`docs/heterogeneous-cluster.md`) explicitly reject "guided grammar" requests during distributed deployments, and it separately hit its own empty-response-body bug (HTTP 200, zero bytes) during a real investigation run. vLLM, surprisingly, did correctly enforce structured output and tool-calling in isolated tests — but hit the same context-length wall pattern, with `max_model_len` raised from 15312 to 24288 and investigations still needing just slightly more than whatever the cap was raised to.

The fix: oMLX

Verified against source, not marketing copy

Found via its marketing site (`omlx.ai`), then verified directly against its GitHub source (`github.com/jundot/omlx`, 18.6k stars) before trusting it: it implements genuine grammar-constrained decoding via the `xgrammar` library — a real `GrammarConstraintProcessor` logits processor, not a parameter it silently accepts and ignores — confirmed by reading its own test suite (`tests/test_grammar.py`, `tests/test_grammar_live.py`) rather than trusting the README. Its headline feature, paged SSD KV caching for agent workloads (sub-5s TTFT after the first turn), directly targeted the slow multi-turn-tool-calling problem that plagued every earlier attempt. Getting to a working instance still took a few small wrong turns: a garbled instruction confusing a context-length number with a port number ("15312 is the length, endpoints are at 8080"), a bearer-token requirement solved with the literal string `dummy`, and a 5GB model rejected with an exact `507` error citing the precise memory ceiling before landing on models that actually fit.

First real oMLX attempt — a genuine cautionary result

Fast, confident, structured, and completely fabricated

The smallest available model, `Qwen3-1.7B-4bit` — the only one that fit the smaller Mac's memory ceiling — completed the full pipeline for the first time all session: fast (211 seconds), no crash, a structured diagnosis at 90% confidence. It was also wrong. It cited specific results from `kubernetes_describe_pod` and `kubernetes_get_resource` calls that were never actually made — only `kubernetes_list_pods` had run — including a self-contradictory claim about the same resource being both `"Ready: true"` and `"Ready: false"` in the same sentence, and named a pod ("qdrant") that wasn't even part of the alert.

Second Mac mini, stronger model

Honest evidence-gathering — lost to a Pydantic validation error

Moved to a second, more capable Mac mini with more headroom, running `Qwen3.5-4B-MLX-8bit`. Real, honest evidence-gathering this time — 17 evidence items across 6 real Kubernetes tool types, no hallucinated calls, genuinely better behavior than the small model. But the final diagnosis call failed a Pydantic validation (a `model_type` error: the model returned a bare JSON list instead of the expected object) after a 211-second stall, and the fallback text parser couldn't recover anything from it — the saved result was still "unable to determine root cause," even though the raw text the model produced visibly referenced "...BackOff and Pending state." It had almost certainly already figured out `ImagePullBackOff`; the answer got lost to a parsing failure, not a reasoning failure.

Reproducing the parsing bug in isolation

Two `curl` tests confirm the schema mechanism itself was sound

Replayed the exact `DiagnosisSchema` shape (13 fields: a `root_cause` string, a closed category enum, six `list[str]` fields, and a few more strings/floats) directly against oMLX with `curl`, using a small representative prompt. First attempt used a too-small `max_tokens` (500) — it got truncated mid-generation (`finish_reason: "length"`), but even in the truncated fragment it had already correctly written `"root_cause": "ImagePullBackOff"`. Second attempt used opensre's real default (`max_tokens: 4096`) — this time it generated a complete, correctly-shaped diagnosis, finishing naturally (`finish_reason: "stop"`): root cause `"ImagePullBackOff"`, category `"deployment"`, four concrete remediation steps, `validity_score: 0.85`. The schema and grammar mechanism worked correctly in isolation — the earlier list-shaped failure was most likely sensitive to the much larger real-investigation prompt (17 evidence items vs. a small test prompt), not a fundamental bug in the approach.

Attempt 19 — the real, final success

~872 seconds, no fallback, no hallucination, validity\_score 1.0

Re-ran the full real investigation with the same setup. It completed cleanly:

> "Persona-backend and persona-frontend Kubernetes deployments are failing to start because they lack the imagePullSecrets configuration, preventing container image pulls from the Docker registry due to authentication failure."

Verified this wasn't a lucky guess by checking the raw evidence the run had gathered — the actual `kubernetes_describe_pod` output contained the literal Kubernetes error text: `"Back-off pulling image \"persona/backend:0.6.0\": ErrImagePull: failed to pull and unpack image ... pull access denied, repository does not exist or may require authorization: server message: insufficient_scope: authorization failed"`. The model's diagnosis matched this exactly. It also performed real differential diagnosis — it called `describe_pod` on all four pods in the namespace, noticed the healthy `persona-redis` pod _has_ `imagePullSecrets` configured while the two broken pods don't, and used that comparison as corroborating evidence rather than pattern-matching a single error string. The recommended fix — add `imagePullSecrets` to both broken deployments — was specific and directly actionable, not generic advice.

opensre investigate — attempt 5, stagnation breakerlog

```bash
# 10 tool calls in ~19s — list_pods, describe_pod, list_deployments,
# get_events, get_pod_logs, get_resource, list_daemonsets,
# list_ingresses, list_services, list_statefulsets
2 consecutive duplicate-only iterations — forcing tool-free conclusion
connection refused  # final synthesis call — server dropped mid-investigation
```

**The hallucination is the finding worth taking seriously, not softening.** A fast, confident, perfectly-structured, 90%-confidence diagnosis that cites tool calls that never happened and contradicts itself mid-sentence is a worse outcome than an honest "unable to determine root cause" — it's the kind of answer someone could act on without checking. The root cause there wasn't infrastructure at all; it was model capacity. 1.7B parameters wasn't enough to reliably follow the tool-calling loop, so the model pattern-completed a plausible-looking incident report instead of gathering more evidence when it had too little.

| # | What actually fixed it | Why it mattered |
| --- | --- | --- |
| 1 | oMLX's genuine grammar-constrained structured-output enforcement | Every other backend tried (MLX proxy, exo, vLLM at its context limit) returned HTTP 200 while silently ignoring response_format — a passing request that produced unusable output |
| 2 | A model with enough real capacity to reason and gather evidence honestly | The 4B-8bit model, not the 1.7B one — capacity is what separated genuine differential diagnosis from a fabricated one |
| 3 | Kubernetes tools pointed at the correct namespace | A config fix made much earlier in the saga, still a precondition for every later attempt to gather real evidence at all |

**Attempt 19 produced a correct, verified root-cause diagnosis** — `validity_score: 1.0`, matched exactly against the raw `kubernetes_describe_pod` error text, corroborated by real differential diagnosis against a healthy pod in the same namespace. The pipeline — Kubernetes tool integration, Grafana integration, local-LLM transport wiring, opensre's stagnation breaker, and the diagnose stage's structured-output contract — is proven end to end, not just in theory. It took nineteen attempts and several more days to get there, and eighteen of those attempts are reported above in exactly as much detail as the one that worked.

## 9 Where it landed

Kubernetes + Grafana integrations verified against real infrastructure — datasources discovered, not assumed

↓

Cloudflare Access edge-block diagnosed and routed around — direct LAN path, not a Grafana bug

↓

Working Grafana admin credentials recovered from live cluster state and git history, not a reset

↓

2 new connectors shipped — 240 tests, 7 real bugs caught by review before implementation

↓

Live investigation — 19 attempts, 1 correct root-cause diagnosis, verified against raw evidence, not self-reported confidence

**Final count:** three integrations wired against real infrastructure, one edge-proxy gotcha correctly diagnosed instead of misattributed to the wrong service, one piece of credential archaeology that avoided an unnecessary password reset, two connector PRs shipped with real bugs caught before any implementation code existed, and — after eighteen failures spread across several more days, a structured-output bug found by testing it directly rather than guessing, and one fabricated diagnosis that was worse than no diagnosis at all — a nineteenth attempt that got it right. Not "plausible." Verified, against the raw evidence, to be right.
