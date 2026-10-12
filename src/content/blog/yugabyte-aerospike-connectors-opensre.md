---
title: "8 Tools, 189 Green Tests, 2 Live Bugs: Building YugabyteDB & Aerospike Connectors for OpenSRE"
date: 2026-08-23
description: "How we built read-only YugabyteDB and Aerospike diagnostic connectors for OpenSRE — the design decisions, the mocked suites that all passed, and the two real bugs live testing against a Kubernetes cluster caught anyway."
tags: [opensre, yugabydb, aerospike, kubernetes, testing]
cover: "assets/images/covers/yugabyte-aerospike-connectors-opensre.svg"
draft: false
---

Two new database connectors shipped into **OpenSRE** this cycle: **YugabyteDB** (five YSQL diagnostic tools) and **Aerospike** (three info-protocol tools). Both are strictly read-only, both follow the repo's integration contract end to end, and both passed their entire mocked test suites before ever touching a real cluster. Then we pointed them at the live Kubernetes databases in the `databases` namespace — and reality found two bugs that 189 passing tests could not.

This post is the full story: design, numbers, what broke, what is still unverified, and how to use the connectors today.

## 01Why These Two, and Why Read-Only

An SRE agent is only as useful as the evidence it can pull. YugabyteDB and Aerospike are common residents of SRE stacks — distributed SQL and low-latency key-value respectively — and neither had any connector in OpenSRE. During an incident, the questions an agent needs answered are narrow and specific: _which nodes are alive? what is running slow right now? which namespace/table is eating resources?_

So the scope was locked to **read-only diagnostics**: no writes, no schema changes, no record-level KV access. Every tool returns a normalized dict stamped with its source, availability, and honest caveats about what it can and cannot see.

Design docs first, code second

Each connector started as a written architecture plan with two independent expert reviews — one for vendor-domain accuracy, one for OpenSRE conventions — folded in before implementation began. Those documents earned their keep: nearly every divergence from the "just mirror PostgreSQL" instinct traces back to a review note.

## 02Architecture: Same Contract, Two Very Different Transports

Connector Call Path — One Contract, Two Transports

<svg viewBox="0 0 920 310" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Connector call path diagram">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#2563EB"></path>
        </marker>
        <path id="p-ab" d="M226,84 L280,84"></path>
        <path id="p-bc" d="M476,84 L530,84"></path>
        <path id="p-cd" d="M696,84 L750,84"></path>
        <path id="p-down" d="M820,116 V232"></path>
      </defs>
      <rect x="36" y="52" width="190" height="64" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
      <text x="131" y="79" text-anchor="middle" font-size="13" font-weight="600" fill="#F9FAFB">LLM Investigation</text>
      <text x="131" y="97" text-anchor="middle" font-size="11.5" fill="#CBD5E1">ReAct Loop Picks A Tool</text>
      <rect x="286" y="52" width="190" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="381" y="79" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">@tool Diagnostic Call</text>
      <text x="381" y="97" text-anchor="middle" font-size="11.5" fill="#4B5563">8 Tools · Read-Only</text>
      <rect x="536" y="52" width="160" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="616" y="79" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Credential Resolver</text>
      <text x="616" y="97" text-anchor="middle" font-size="11.5" fill="#4B5563">Store → Env Fallback</text>
      <rect x="756" y="52" width="128" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="820" y="79" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Transport</text>
      <text x="820" y="97" text-anchor="middle" font-size="11.5" fill="#4B5563">SQL Or Subprocess</text>
      <rect x="236" y="232" width="584" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <circle cx="496" cy="264" r="10" fill="none" stroke="#2563EB" stroke-width="2" class="ping"></circle>
      <circle cx="596" cy="264" r="10" fill="none" stroke="#2563EB" stroke-width="2" class="ping" style="animation-delay:.7s"></circle>
      <circle cx="696" cy="264" r="10" fill="none" stroke="#2563EB" stroke-width="2" class="ping" style="animation-delay:1.4s"></circle>
      <text x="330" y="259" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">databases Namespace</text>
      <text x="330" y="278" text-anchor="middle" font-size="11.5" fill="#4B5563">yb-tserver ×3 · aerospike ×3</text>
      <line x1="226" y1="84" x2="280" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr)"></line>
      <line x1="476" y1="84" x2="530" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr)"></line>
      <line x1="696" y1="84" x2="750" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr)"></line>
      <line x1="820" y1="116" x2="820" y2="232" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr)"></line>
      <text x="253" y="74" text-anchor="middle" font-size="11.5" font-weight="600" fill="#4B5563">Invoke</text>
      <text x="503" y="74" text-anchor="middle" font-size="11.5" font-weight="600" fill="#4B5563">Resolve</text>
      <text x="723" y="74" text-anchor="middle" font-size="11.5" font-weight="600" fill="#4B5563">Connect</text>
      <text x="842" y="180" font-size="11.5" font-weight="600" fill="#4B5563" transform="rotate(90 842,180)">Query Live Cluster</text>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.8s" repeatCount="indefinite" path="M36,84 L226,84"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.8s" begin="0.9s" repeatCount="indefinite" path="M820,116 V232"></animateMotion></circle>
      <rect x="36" y="232" width="170" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="121" y="259" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Credentials Never</text>
      <text x="121" y="277" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">In Tool Signatures</text>
    </svg>

### YugabyteDB: mirror PostgreSQL, diverge where distribution bites

YSQL is PostgreSQL-wire-compatible, so the connector reuses the existing `psycopg2-binary` dependency and mirrors the PostgreSQL integration file-for-file. Three deliberate divergences:

-   **`connected_node` stamping.** Every query result carries `inet_server_addr()`. Because `pg_stat_*` views are per-node on YugabyteDB — there is no cluster-wide aggregation over a SQL connection — two tool calls through a load balancer can silently land on different nodes and return coherent-looking but mutually inconsistent slices. The stamp makes that detectable.
-   **A dedicated version regex.** YSQL's `version()` returns a compound token like `PostgreSQL 11.2-YB-2026.1.0.1-b0 …`. PostgreSQL's naive `split()[1]` yields the mangled string. A purpose-built regex pulls PG-compat version, YB version, and build number apart — verified live: _"Connected to YugabyteDB 2026.1.0.1 (PG 15.12 compat, build 0)"_.
-   **`yb_servers()` topology instead of replication views.** Streaming-replication queries have no YB equivalent; `yb_servers()` is the documented mechanism for listing live YB-TServers with placement and UUIDs. Tablet-level replication lag is explicitly declared out of scope rather than faked.

### Aerospike: shell out to asinfo, own nothing protocol-level

The official Python client ships a native C extension — a fragile deploy target. Instead the connector wraps `asinfo`, Aerospike's own CLI for the plaintext info protocol, via subprocess. That delegates proto framing, auth handshake, and TLS to the vendor's tool. A structural `Protocol` type breaks the import cycle between transport and config modules, and response parsing lives in pure functions separate from the subprocess seam — which is exactly what made the live bug (below) diagnosable in minutes.

### The shared contract

Credentials are resolved from the integration store or environment and never appear in LLM-visible tool signatures. Timeouts everywhere (`statement_timeout` on YSQL, subprocess timeout on asinfo). Result caps enforced by config. And every failure mode returns a machine-readable `{"available": false, "error": …}` payload instead of raising into the agent loop.

## 03The Mocked Suites: Everything Green

| Suite | Coverage | Result |
| --- | --- | --- |
| YugabyteDB unit + tool contracts | Config normalization, version regex, extract/injected params, per-tool happy/failure paths | 80 passed |
| YugabyteDB e2e (alert → investigation) | Alert-source routing, tool planning, payload flow with mocked DB seam | 11 passed |
| Aerospike unit + client | asinfo argv building, stdout shapes, error taxonomy, latency parser | 86 passed |
| Aerospike e2e | Same investigation wiring with mocked subprocess | 12 passed |

189/189 — and it still wasn't enough

Both branches also carry the repo-standard setup specs, verifiers, registry entries, docs pages, and alert-routing catalog entries. On paper: done. The next section is why "tests pass" and "it works" are different claims.

## 04Testing Against Reality

The live targets: a 6-pod YugabyteDB cluster (3 masters, 3 tservers) and a 3-node Aerospike CE cluster, all in the `databases` namespace, deployed from the in-house helm charts.

Tunnels up

`kubectl port-forward` mapped YSQL `svc/yb-tserver-service 15433→5433` and Aerospike `13000→3000`. No NodePort exposure, no direct LoadBalancer traffic for debugging paths.

asinfo extracted from the pod

No local aerospike-tools install. Copied the binary out of the container — turns out modern `asinfo` is a PyInstaller bundle needing its `_internal/` directory; a bare copy fails with exit 255 until the whole bundle comes across.

Grammar probes first

Raw `asinfo status / statistics / namespaces / latencies:` calls captured the server's actual output grammar before running any connector code — including generating write load (199 objects via `aql`) to see whether latency histograms populate.

Connector functions run directly

All eight data functions executed against the tunnels from each branch's own virtualenv, then again through the official CLI path: `opensre integrations verify yugabytedb|aerospike`. Both verifications passed against env-var-only config.

Registry discovery check

`get_registered_tools("investigation")` listed all three Aerospike tools — and zero YugabyteDB tools. Bug №2 found.

## 05What Broke — Found Live, Invisible To Mocks

### Bug 1 — Silent zero metrics on a healthy Aerospike node CRITICAL · WRONG DATA

`get_node_status` returned `cluster_size: 0, uptime_seconds: 0, cluster_integrity: false, node_status: ""` against a fully healthy 3-node cluster. Root cause, proven by reversing argument order in a raw probe: **this asinfo build executes only the first command passed via `-v`**. The connector batched `status\nstatistics` into one invocation expecting tab-separated `name\tvalue` lines back; only the first command's unlabeled output arrived, every parsed field fell back to its default, and the tool reported a healthy node as an empty one.

**Fix shape:** one command per subprocess invocation (sequential `send_info_commands`), plus a regression test pinning the real single-command stdout shape captured from the live binary. The unit tests missed it because they mocked the assumed multi-command format from the design doc — the doc itself flagged the wire shape as unconfirmed against a live binary.

### Bug 2 — Five YugabyteDB tools invisible to investigations CRITICAL · WIRING

The Aerospike branch added `"integrations.aerospike.tools"` to `INTEGRATION_TOOL_PACKAGES` (+1 line). The YugabyteDB branch never touched that file — so `integrations.yugabytedb.tools` is never imported and none of its five tools register on any surface. Direct-import unit tests all pass; the end-to-end discovery assertion simply didn't exist. One line to fix, one missing test class to add.

### Finding 3 — Latency histograms: graceful, but unverified HONEST GAP

On this cluster `latencies:` returns header-only segments (`{test}-read:` with no columns) even under write load — server config shows `microsecond-histograms=false`. That shape cannot match the parser's header regex, so `get_latency` correctly degrades to a raw payload with a `parse_warning` — by design, no crash. But it means **the structured histogram path has never been exercised against populated live data**. It stays on the scorecard as unverified, not done.

### Smaller honest notes NOT BUGS · CONTEXT

• Slow-query stats arrive as `Decimal` (from `::numeric` casts); OpenSRE serializes tool results with `json.dumps(..., default=str)` on every provider path, so values reach the model as strings — tolerant, but not JSON-number typed.  
• The asinfo wrapper passes passwords via the `-P` CLI flag — visible in `/proc/*/cmdline` to other local users. Acceptable for single-operator hosts; worth a config-file alternative later.  
• The YB pods showed heavy restart counts during testing (up to 124 on one tserver) — cluster-side churn worth its own investigation, unrelated to the connectors.  
• Idle-cluster `statistics` surfaced `failed_best_practices=true` — exactly the kind of fact a diagnostic tool should surface, now visible to the agent.

## 06Observability: Cluster Telemetry vs Connector Errors

The split is deliberate. The **databases' health signals** belong to the cluster's monitoring stack — exporter endpoints scraped by ServiceMonitors into VictoriaMetrics in the `monitoring` namespace, alerts as VMRules, dashboards as ConfigMaps. The **connectors themselves** need no scrape endpoint and no spans: they are short-lived diagnostic calls whose failure path is Sentry-captured and whose degraded payloads feed the agent.

Two Pipelines, Two Jobs

<svg viewBox="0 0 920 330" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Observability split diagram">
      <defs>
        <marker id="arr2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#2563EB"></path>
        </marker>
      </defs>
      <text x="36" y="40" font-size="12" font-weight="700" fill="#4B5563" letter-spacing="1.4">CONNECTOR ERRORS — IN-APP</text>
      <text x="500" y="40" font-size="12" font-weight="700" fill="#4B5563" letter-spacing="1.4">DATASTORE TELEMETRY — CLUSTER SIDE</text>
      <rect x="36" y="64" width="220" height="56" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
      <text x="146" y="88" text-anchor="middle" font-size="12.5" font-weight="600" fill="#F9FAFB">Tool Call Raises</text>
      <text x="146" y="105" text-anchor="middle" font-size="11" fill="#CBD5E1">Timeout · Binary Missing · Refused</text>
      <rect x="36" y="150" width="220" height="56" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="146" y="174" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">report_exception → Sentry</text>
      <text x="146" y="191" text-anchor="middle" font-size="11" fill="#4B5563">Tags: integration · method · event</text>
      <rect x="36" y="236" width="220" height="56" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="146" y="260" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">available:false Payload</text>
      <text x="146" y="277" text-anchor="middle" font-size="11" fill="#4B5563">Back Into Agent Context</text>
      <line x1="146" y1="120" x2="146" y2="150" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr2)"></line>
      <line x1="146" y1="206" x2="146" y2="236" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr2)"></line>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M146,64 V150"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M146,206 V236"></animateMotion></circle>
      <rect x="500" y="64" width="190" height="56" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="595" y="88" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">DB Exporters :9145</text>
      <text x="595" y="105" text-anchor="middle" font-size="11" fill="#4B5563">Sidecars On Every Pod</text>
      <rect x="730" y="64" width="158" height="56" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="809" y="88" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">ServiceMonitor</text>
      <text x="809" y="105" text-anchor="middle" font-size="11" fill="#4B5563">Scrape · Verified Live</text>
      <rect x="730" y="236" width="158" height="56" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
      <text x="809" y="260" text-anchor="middle" font-size="12.5" font-weight="600" fill="#F9FAFB">VictoriaMetrics</text>
      <text x="809" y="277" text-anchor="middle" font-size="11" fill="#CBD5E1">monitoring Namespace</text>
      <rect x="500" y="236" width="190" height="56" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="595" y="255" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Grafana + VMRule Alerts</text>
      <text x="595" y="272" text-anchor="middle" font-size="11" fill="#4B5563">Watchdog Dead-Man Switch</text>
      <text x="595" y="287" text-anchor="middle" font-size="11" fill="#4B5563">Down · Missing Target · Undersized</text>
      <line x1="690" y1="92" x2="730" y2="92" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr2)"></line>
      <line x1="809" y1="120" x2="809" y2="236" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr2)"></line>
      <line x1="730" y1="264" x2="690" y2="264" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arr2)"></line>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.6s" repeatCount="indefinite" path="M809,120 V236"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2s" begin=".6s" repeatCount="indefinite" path="M690,92 L730,92"></animateMotion></circle>
    </svg>

What the charts already ship and what was verified running: ServiceMonitors for `aerospike-aerospike`, `yugabyte-yb-master`, and `yugabyte-yb-tserver` in the `databases` namespace; VMRules with a dead-man's-switch watchdog per database plus availability, missing-target, and undersized-cluster alerts; Grafana dashboards for both. If connector-call-level telemetry (per-tool latency, success counters) is ever wanted, it goes to the same monitoring namespace via the OTEL gateway — as its own ticket, not smuggled into these connectors.

## 07Honest Scorecard

| Capability | Live Verdict | Evidence |
| --- | --- | --- |
| YB validate + version parse | Verified | "YugabyteDB 2026.1.0.1 (PG 15.12 compat, build 0)" from compound version() string |
| YB server status + node stamping | Verified | Per-node counters with connected_node stamp |
| YB cluster topology (yb_servers) | Verified | 3 tservers, placement + UUIDs returned |
| YB current queries / table stats | Verified | Empty-by-reality results, correct envelope |
| YB slow queries (pg_stat_statements) | Verified | Extension present, 8 statements with timings |
| YB tools registered for agents | Broken | Missing INTEGRATION_TOOL_PACKAGES entry — bug №2 |
| AS connectivity + validation | Verified | CLI verify passed; binary-missing path degrades cleanly |
| AS namespace stats | Verified | ns "test", rf=2, single_node scope explicit |
| AS node status | Broken | All-zero fields on healthy node — bug №1 (asinfo batching) |
| AS structured latency histograms | Unverified | Degrades to raw; populated-data path never seen (microsecond-histograms=false) |
| Both: investigation/chat registration (AS) | Verified | get_registered_tools lists all three on both surfaces |

## 08How To Use The Connectors

STEP 1

Reachability

Tunnel or DNS to the cluster service — YSQL 5433, asinfo port 3000. Keep asinfo (aerospike-tools) on PATH for the Aerospike side.

STEP 2

Configure

Env vars below — or `opensre integrations setup <vendor>`, which persists to store, keyring, and .env in one shot.

STEP 3

Verify

`opensre integrations verify yugabytedb` / `aerospike` — one command, real connection attempt, version echo.

STEP 4

Investigate

Tools surface automatically to the investigation and chat surfaces once registered; the agent calls them like any other evidence source.

```bash
# YugabyteDB — env config
export YUGABYTEDB_HOST=127.0.0.1     # LB VIP, round-robin DNS, or tunnel
export YUGABYTEDB_PORT=5433          # YSQL default (not 5432)
export YUGABYTEDB_DATABASE=yugabyte  # default DB name
export YUGABYTEDB_USERNAME=yugabyte
# YUGABYTEDB_PASSWORD / YUGABYTEDB_SSL_MODE=prefer optional

# Aerospike — env config
export AEROSPIKE_HOST=aerospike.example.net
export AEROSPIKE_PORT=3000           # plain info protocol
# AEROSPIKE_USERNAME / AEROSPIKE_PASSWORD only when security is enabled

# Verify both through the CLI
uv run opensre integrations verify yugabytedb   # → ✓ Connected to YugabyteDB 2026.1…
uv run opensre integrations verify aerospike    # → ✓ Connected to Aerospike node … status ok
```

What the agent gets

Eight evidence sources: YB server status, current queries, table stats, cluster topology, slow queries; AS node health, namespace stats, latency. Per-node scope is stamped and annotated in every response, so the agent can tell whether two observations came from the same node — the difference between correlating evidence and comparing apples to oranges.

## 09Before Merge: The Uncomfortable List

-   **Ticket + fix bug №1:** one asinfo command per invocation; add a test pinning the real captured stdout shape.
-   **Ticket + fix bug №2:** add `"integrations.yugabytedb.tools"` to `INTEGRATION_TOOL_PACKAGES`; add an end-to-end registry-discovery test so this class of miss can't recur.
-   **Decide on the latency parser:** either verify against a cluster with microsecond-histograms enabled or document the degradation as the contract.
-   **Rebase onto current main** — both branches forked weeks ago; the naive diff is ~93k lines of noise.
-   **Clean commit trailers** — both pushed commits carry AI-attribution trailers that violate repo policy; since they're already pushed, history rewrite is an explicit owner decision, not a silent amend.
-   **Run CI gates on the rebased branches** — lint, format, typecheck, full suite — before PRs.

The meta-lesson

189 green mocked tests proved the code matched its assumptions. Only the live cluster could prove the assumptions. Budget the live-test hour every time — especially when the design doc itself says "not confirmed against a live binary".
