---
title: "2 Faults, 8 Investigations, 4 Fixes: The End-to-End Gauntlet for OpenSRE's Database Connectors"
date: 2026-08-25
description: "We injected real faults into live YugabyteDB and Aerospike clusters and let OpenSRE investigate them using a local MLX LLM. The evidence layer caught everything. Synthesis was another story. Full observations, numbers, and fixes."
tags: [opensre, testing, e2e, kubernetes, reliability]
cover: "assets/images/covers/opensre-connectors-e2e-gauntlet.svg"
draft: false
---

The build log ended with 189 green mocked tests and two live-caught bugs. This chapter is the exam those preparations were for: **inject real faults into the live YugabyteDB and Aerospike clusters, then ask OpenSRE — driven entirely by a local LLM on the LAN — to find them using nothing but the new connectors.** No hosted APIs, no mocks, no shortcuts.

What followed was five acts of debugging that had almost nothing to do with the connectors themselves — a model that couldn't count to 64, a request capturer that exposed the whole game, a schema default that quietly redirected database traffic, a hardcoded token ceiling that shredded JSON, and an ArgoCD app-of-apps that kept un-injecting my faults. The connectors, meanwhile, showed up to work every single run.

## 01The Gauntlet, Stated Precisely

| Element | Configuration |
| --- | --- |
| Investigation driver | tools.investigation.capability.run_investigation(), library mode, alert JSON in → full state out |
| LLM | Local omlx server at 192.0.2.5:8000 — OpenAI-compatible, MLX models on the LAN |
| Fault A | Aerospike StatefulSet scaled 3 → 2 (node-down) |
| Fault B | SELECT pg_sleep(900) via ysqlsh on yb-tserver-1 (runaway query) |
| Fault C | 20,000-row orders_noidx table, deliberately scanned without indexes (seq-scan bait) |
| Alerts | Synthetic JSON: CheckoutLatencySpike (YB) and SessionStoreErrors (AS) |

Ground rule

Every claim below is something a tool returned in-session. Where the pipeline produced garbage, the garbage is reported as garbage — including the runs where the honest answer was "unable to determine root cause."

## 02Testbed: One Pipeline, Two Clusters, Zero Cloud

Investigation Pipeline And Its Dependencies

<svg viewBox="0 0 920 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Investigation pipeline testbed diagram">
      <defs>
        <marker id="arrA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#2563EB"></path>
        </marker>
      </defs>
      <rect x="36" y="40" width="230" height="48" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="151" y="61" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Alert Ingested</text>
      <text x="151" y="78" text-anchor="middle" font-size="12" fill="#4B5563">Synthetic JSON · Two Scenarios</text>
      <rect x="36" y="118" width="230" height="48" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="151" y="139" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Resolve Integrations</text>
      <text x="151" y="156" text-anchor="middle" font-size="12" fill="#4B5563">Env + Store → Active Vendors</text>
      <rect x="36" y="196" width="230" height="48" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="151" y="217" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Plan Evidence</text>
      <text x="151" y="234" text-anchor="middle" font-size="12" fill="#4B5563">Tool Selection Per Stage</text>
      <rect x="36" y="274" width="230" height="64" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
      <circle cx="232" cy="306" r="8" fill="none" stroke="#2563EB" stroke-width="2" class="ping-sm"></circle>
      <text x="140" y="301" text-anchor="middle" font-size="12.5" font-weight="600" fill="#F9FAFB">Gather Evidence</text>
      <text x="140" y="320" text-anchor="middle" font-size="12" fill="#CBD5E1">ReAct Tool Loop</text>
      <rect x="36" y="368" width="230" height="48" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="151" y="389" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Diagnose</text>
      <text x="151" y="406" text-anchor="middle" font-size="12" fill="#4B5563">Structured JSON Verdict</text>
      <rect x="36" y="446" width="230" height="48" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="151" y="467" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Report</text>
      <text x="151" y="484" text-anchor="middle" font-size="12" fill="#4B5563">Root Cause + Validated Claims</text>
      <rect x="420" y="274" width="220" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="530" y="296" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Local LLM — omlx</text>
      <text x="530" y="314" text-anchor="middle" font-size="12" fill="#4B5563">Qwen3.5-4B MLX</text>
      <text x="530" y="330" text-anchor="middle" font-size="12" fill="#4B5563">192.0.2.5:8000</text>
      <rect x="420" y="394" width="464" height="72" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="652" y="418" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Live Targets — databases Namespace</text>
      <text x="652" y="437" text-anchor="middle" font-size="12" fill="#4B5563">YugabyteDB · 3 Masters + 3 TServers · pg_sleep Fault</text>
      <text x="652" y="454" text-anchor="middle" font-size="12" fill="#4B5563">Aerospike CE · 3 Nodes · Node-Down Fault</text>
      <line x1="151" y1="88" x2="151" y2="118" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></line>
      <line x1="151" y1="166" x2="151" y2="196" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></line>
      <line x1="151" y1="244" x2="151" y2="274" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></line>
      <line x1="151" y1="338" x2="151" y2="368" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></line>
      <line x1="151" y1="416" x2="151" y2="446" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></line>
      <line x1="266" y1="306" x2="420" y2="306" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></line>
      <text x="343" y="296" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">Invoke</text>
      <path d="M266,326 H340 V430 H420" fill="none" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrA)"></path>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M151,88 V118"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" begin="0.6s" repeatCount="indefinite" path="M151,244 V274"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite" path="M151,338 V368"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.6s" begin="0.3s" repeatCount="indefinite" path="M266,306 H420"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="3s" begin="0.9s" repeatCount="indefinite" path="M266,326 H340 V430 H420"></animateMotion></circle>
    </svg>

The pipeline is the stock OpenSRE investigation: six semantic stages, with the ReAct gather loop doing the real work. Everything on the right is infrastructure that has to hold for the loop to function — and every act below is the story of one of those supports cracking.

## 03Act I — The Empty Choices Mystery

First run, instant death: `RuntimeError: Ollama API returned an unexpected response: ChatCompletion`. Translation: the server answered _HTTP 200 with a well-formed ChatCompletion object whose `choices` array was empty_. Not a timeout, not an auth failure — a success that contained nothing.

Suspect 1 — the configured model

Llama-3.1-8B on this server renders tool calls as `<|python_tag|>{"name": …}` **text inside content** — never native `tool_calls`. Workable, but a red flag for how much of the tool-calling path this model stack actually exercises.

Suspect 2 — payload size

Bisecting the full 259-tool investigation registry against the server: every schema valid alone (`BAD SCHEMAS: 0`), pairs fine up to 63 tools, **hard HTTP 400 at 64+**. A Llama-template rendering limit, not an OpenSRE bug.

The switch

Qwen3.5-4B swallows all 259 tools and returns proper native `tool_calls` (`finish_reason: tool_calls`, three of them, sensibly chosen). Adopted for all subsequent runs.

Still dying

Same error with Qwen. Time to stop guessing: a spy wrapped around the client captured OpenSRE's literal request — **15,160-char system prompt, 1 message, 4 tools**.

Replay chaos

The captured payload, replayed byte-for-byte: sometimes fine, sometimes empty, sometimes 400. Twelve identical requests → three different fates. Size wasn't the variable. **Server health was.**

Resolution by patience

An hour later, the full sweep — every prompt size from 1k to the full 15,160 chars, paced and unpaced, with and without cache-busting nonces — went **39/39 clean**. Episodic instability on the box. Nothing to fix in OpenSRE; documented and moved on.

Identical Bytes, Three Fates — 12 Replays Of The Same Request

<svg viewBox="0 0 920 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Three outcomes diagram">
      <defs>
        <marker id="arrB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#2563EB"></path>
        </marker>
      </defs>
      <rect x="36" y="60" width="240" height="180" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
      <text x="156" y="105" text-anchor="middle" font-size="13" font-weight="600" fill="#F9FAFB">One Byte-Identical Request</text>
      <text x="156" y="130" text-anchor="middle" font-size="12" fill="#CBD5E1">15,160-Char System Prompt</text>
      <text x="156" y="150" text-anchor="middle" font-size="12" fill="#CBD5E1">1 Message · 4 Tools</text>
      <text x="156" y="175" text-anchor="middle" font-size="12" fill="#CBD5E1">Sent 12 Times Back-To-Back</text>
      <rect x="480" y="63" width="300" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="630" y="89" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">5 of 12 — HTTP 200 With Choices</text>
      <text x="630" y="108" text-anchor="middle" font-size="12" fill="#4B5563">Normal Completion</text>
      <rect x="480" y="133" width="300" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="630" y="159" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">4 of 12 — HTTP 200, choices: []</text>
      <text x="630" y="178" text-anchor="middle" font-size="12" fill="#4B5563">Silent Nothing — Killed The Run</text>
      <rect x="480" y="203" width="300" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="630" y="229" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">3 of 12 — HTTP 400 Bad Request</text>
      <text x="630" y="248" text-anchor="middle" font-size="12" fill="#4B5563">Rejected Outright</text>
      <line x1="276" y1="95" x2="480" y2="95" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrB)"></line>
      <line x1="276" y1="165" x2="480" y2="165" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrB)"></line>
      <line x1="276" y1="235" x2="480" y2="235" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrB)"></line>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M276,95 H480"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite" path="M276,165 H480"></animateMotion></circle>
      <circle r="3.5" fill="#2563EB"><animateMotion dur="2.4s" begin="1.6s" repeatCount="indefinite" path="M276,235 H480"></animateMotion></circle>
    </svg>

| Probe | Result When Unhealthy | Verdict |
| --- | --- | --- |
| Short message + same 4 tools | 10/10 OK | Small prompts always fine |
| Big system prompt, no tools | 5/10 | Size-correlated… apparently |
| 6-second pacing between calls | 5/8 | Pacing irrelevant |
| Temperature 0.2 | 5/8 | Sampling irrelevant |
| System truncated to 7,000 chars | 5/8 | "Size threshold" theory dead |
| Full sweep an hour later (all sizes, nonces, pacing) | 39/39 OK | Episodic server state. Case closed. |

## 04Act II — Why The Agent Couldn't See The Connectors

With LLM calls finally stable, the first complete investigation finished — and produced a beautifully confident, completely evidence-free answer. The state dump explained why: `available_sources: ['knowledge']`, `resolved_integrations: []`. The agent had been handed exactly four tools — `execute_python_code`, `memory_remember`, `work_task_list`, `work_task_add` — and asked to investigate a database incident with them.

Root cause: **a test-harness artifact, not a product bug.** Integration resolution adapters are installed by process entrypoints via `install_harness_ports()`; a library-mode driver that imports `run_investigation` directly never triggers that boot step, so the port defaults return empty lists. Two lines in the driver — `install_harness_adapters()` before running — and the next run resolved `yugabytedb`, planned five connector tools, and executed them for real. Product entrypoints (CLI, REPL) were never affected.

The funnel, quantified

259 investigation tools registered → resolution gates vendor tools by config → the planner narrows per-alert. Pre-wiring, the gather stage saw 4 generic tools. Post-wiring: the five YugabyteDB diagnostics joined the menu — and the very next iteration called four of them by name.

## 05Act III — The Port Clobber

The first genuinely fault-visible run captured the sleeper in its very first iteration — then torched itself. Iteration 1, the agent re-sent every tool call with an explicit argument it had invented: `{"port": 5433}`. The schema default. Which pointed not at the 15433 tunnel but at whatever PostgreSQL-ish thing answers on localhost:5433:

```json
{'error': 'connection to server at "127.0.0.1", port 5433 failed:
           FATAL:  role "yugabyte" does not exist'}
# tool_args: {'port': 5433}   ← the model's contribution
```

Three burned iterations, two `[yugabytedb] … validation failed` warnings, zero new evidence. The flaw was ours: `port` is resolved from integration config like a credential, yet sat in the LLM-visible schema as a settable parameter with a default begging to be copied. The fix mirrors how `host` already works — hide it from the model, keep it callable:

```bash
# before
injected_params=("host",)
def get_yugabytedb_server_status(host, database=None, port=5433): ...

# after
injected_params=("host", "port")   # pruned from public_input_schema
def get_yugabytedb_server_status(host, database=None, port=5433): ...
```

TDD: a parametrized failing test asserting `"port"` appears in no public schema across all eight tools (five YB, three AS), while staying a real parameter for direct callers. Shipped on both branches. Post-fix runs show every connection on 15433 — the clobber class is extinct. Same treatment applied to the Aerospike tools preventively.

## 06Act IV — The 1024 Ceiling

Next recurring corpse: `Structured diagnosis parse failed, falling back: LLM did not return valid JSON payload` — followed by `root_cause: "Unable to determine root cause"` regardless of how good the evidence was. The ollama code path hardcodes `max_tokens=1024` for every call. The diagnose stage's structured JSON verdict, built from rich evidence, doesn't fit. Silent truncation, invalid JSON, fallback, blank verdict.

Fix: an `OLLAMA_MAX_TOKENS` environment override with the default pinned at 1024, guarded by tests for the unset, raised, and garbage-value cases. First run at 4096: the diagnosis JSON parsed for the first time — and the validated-claims list suddenly read like an actual incident review.

Why the default didn't move

1024 exists to stop small local models from rambling. Raising it globally trades one failure mode for another. An env knob lets operators with bigger models raise the ceiling without changing behavior for everyone else.

## 07Act V — Fighting ArgoCD For The Right To Break Things

Scaling Aerospike 3 → 2 stuck for exactly one minute: `selfHeal` snapped it back. Disabling selfHeal stuck for ten: the `thecylon-platform` app-of-apps re-applied the child Application spec — including sync policy — from git. You cannot inject a fault into infrastructure whose controller believes it owns reality.

STEP 1

Patch selfHeal Off

Merge-patch the child App CR — buys a reconciliation window.

STEP 2

Scale 3 → 2

StatefulSet shrinks; pods confirm 2/2 Running.

STEP 3

Verify Through Connector

`get_node_status`: cluster\_size 2, new cluster\_key — fault real.

STEP 4

Investigate Immediately

All inside one uninterrupted shell chain — evidence lands before any reconciler wakes.

STEP 5

Restore

Scale back to 3, selfHeal on — regardless of run outcome.

Lesson about GitOps

App-of-apps heals not just workloads but the management layer itself. Fault injection under GitOps means racing the reconciler or owning the manifest. Racing is faster; owning is cleaner. We raced, and won narrowly — evidence was captured in iteration 0.

## 08Run Ledger — Every Investigation, Honestly Graded

| # | Setup | Evidence Captured | Synthesis Verdict |
| --- | --- | --- | --- |
| 1 | Llama-3.1-8B, first attempt | — | Crashed — empty choices |
| 2 | Qwen, integrations unresolved | 3 × sandboxed python guesses | Confident nonsense — generic DB folklore, zero cluster contact |
| 3 | Driver wired, YB tools live | Cluster/server/slow-query/table payloads; 2 tool errors | Parse failed — diagnosis JSON truncated |
| 4 | Tunnel aimed at tserver-1 pod | pg_sleep caught live (pid + pg_stat_statements); then port clobber ×3 | Unable to determine |
| 5 | Port fix shipped | 4 clean payloads; 6 wrong-database FATALs | Honest refusal — "insufficient evidence" |
| 6 | OLLAMA_MAX_TOKENS=4096 | Claims validated: pg_sleep visible, orders_noidx found (0 live tuples), 0% cache hit | Parses — honest, evidence-cited refusal |
| 7 | Aerospike, healthy control | cluster_size 3, namespace test 211 objects, latency histograms parsed | Correct — declined to invent a fault |
| 8 | Aerospike, node-down window | cluster_size 2, new cluster_key in evidence-0 | Parse failed — 3 loops, server flaked again |

### The money shots — what the connectors actually returned mid-incident

```bash
# YB — current queries, live catch:
'total_queries': 1, 'queries': [{'pid': 37776, 'username': 'yugabyte',
  'application_name': 'ysqlsh', 'state': 'active',
  'query': 'SELECT pg_sleep(900)'}]

# YB — independent corroboration via pg_stat_statements:
{'queryid': '-7611524858906631594', 'query_truncated': 'SELECT pg_sleep($1)',
  'calls': 3, 'total_time': …}

# AS — during the node-down window:
{'node_status': 'ok', 'cluster_size': 2,          # was 3
 'cluster_key': 'E00C0AA1AA2F',              # changed — reformation event
 'cluster_integrity': True}
```

Read the ledger twice and the pattern jumps out: **rows 4–8 never once failed at evidence collection.** Five consecutive runs, two different databases, one injected fault each — the connector layer returned truthful, well-stamped, correctly-degrading data every time. Every failure after that point belongs to synthesis: a 4-billion- parameter model on a flaky LAN server, asked to turn good evidence into a confident verdict.

The most honest sentence a model ever said to me

Final YB verdict, verbatim: _"Insufficient evidence to determine root cause. The only queries visible are test queries (pg\_sleep) and monitoring queries. No actual checkout business logic queries are visible in the slow query log."_ The model noticed its prime suspect looked synthetic and refused to convict. For a fault-injection exercise that is simultaneously a miss (it was the fault!) and a bullseye (refusing to overclaim is exactly what you want from an SRE agent).

## 09The Local LLM Report Card

Every synthesis failure above traces to one component. Isolating its performance, because "the local LLM" is actually three things being graded at once: the server, the model choice, and whatever model you pick acting as an agent.

### Model vs model — the first decision was forced

|  | Llama-3.1-8B (as configured) | Qwen3.5-4B (switched to) |
| --- | --- | --- |
| Tool calling | Broken — renders calls as <\|python_tag\|> text inside content, never native tool_calls | Native — proper finish_reason: tool_calls, sensibly chosen |
| Tool capacity | Hard HTTP 400 at ≥64 tools; opensre's registry sends up to 259 | All 259 accepted |
| Ran investigations | 0 — died on attempt one | 7 of 7 remaining runs, end to end |

### The server underneath — episodic, not broken

Same byte-identical request, twelve replays: 5 OK / 4 empty / 3×400. Hours later, 39/39 clean. Short prompts never flaked even while long ones did — then long ones stopped flaking too. Wall-clock per investigation: 570–782s. No OpenSRE-side retry policy survives that pattern reliably; capacity or replacement is the actual fix.

### Qwen3.5-4B as the investigating agent

| Earned credit | Charged for |
| --- | --- |
| • Called connector tools by name once integrations resolved• Caught both injected faults, every faulted run• Correct negative control — invented nothing on the healthy cluster• Refused to convict pg_sleep on suspicion it was synthetic | • Copied schema defaults into arguments ({"port": 5433}) — 3 iterations burned• Flailed 6+ FATALs guessing nonexistent databases instead of listing catalogs• Diagnosis JSON parse failed twice (one truncation-caused, fixed; one raw flake)• Never attributed either fault by name in a final verdict |

Net grade: evidence collection A, synthesis C

Across five consecutive faulted runs, the evidence layer never missed once and the agent never misread it. Every failure lived in the last mile — turning good evidence into a confident verdict. That is precisely the gap between a 4-billion-parameter model on a homelab box and a hosted mid-tier model. Run this exact gauntlet against the latter and the ledger's bottom rows almost certainly flip from refusals to convictions.

## 10Honest Limitations

-   **The local LLM server is episodically unstable.** ~40–50% transient failure under load earlier in the day (identical payloads yielding 200-empty and 400 responses), fully healthy hours later (39/39 — see §09). No OpenSRE-side retry policy survives that reliably; capacity or replacement is the fix.
-   **4B-parameter synthesis is the ceiling.** Evidence-to-verdict is where every run wobbled. The pipeline structure held; the judge is small.
-   **Wrong-database guessing burned loops.** Six FATAL errors across two runs from names like `checkout` and `production`. Improvement candidate, ticket-worthy: unknown-database errors should return the available-database list so the agent self-corrects in one step.
-   **Per-node visibility is a contract, not a bug — but it hides things.** pg\_sleep was invisible until the tunnel targeted the node actually running it. Real deployments need the query surface to reach all tservers, or alerts routed with node affinity.
-   **YugabyteDB stats counters lie here.** `orders_noidx` served sequential scans that `seq_scan=0` never recorded; 20,000 inserted rows showed 0 live tuples. Cluster-side anomaly, worth its own investigation before trusting table-stats tooling anywhere.
-   **tserver churn predates this work.** Restart counts climbed 110/130/68 → 134/134/78 across the session, including a CrashLoopBackOff episode that delayed cleanup. Unrelated to the connectors; noted because it shaped the testing.

## 11Commit & Cleanup Ledger

### Shipped (local, both branches)

| Branch | Change | Trigger |
| --- | --- | --- |
| feat/yugabytedb-integration 791653e4d | port → injected_params on all 5 tools + schema tests | Port clobber (Act III) |
| feat/aerospike-integration | Same fix, all 3 tools | Preventive mirror |
| feat/yugabytedb-integration c41381f84 | OLLAMA_MAX_TOKENS override, default 1024 unchanged | Truncated diagnoses (Act IV) |
| feat/aerospike-integration ec0c41593 | Stale latency tests aligned to real grammar | Leftover pre-fix assertions |

Merge note

`c41381f84` touches core LLM plumbing shared by both branches. Land it once — cherry-pick, don't merge twice.

### Cleanup verification

-   Aerospike restored: replicas 3, `selfHeal` true, pods 3/3 Running.
-   All `pg_sleep` sessions expired — 0 active at final check.
-   `orders_noidx` dropped (`DROP TABLE` confirmed after waiting out a tserver churn episode).
-   Test tunnels terminated; unrelated infrastructure untouched.
-   Focused suites green post-fixes: 106 (YB side), 93 (AS side); ruff + mypy clean on every changed file.

The meta-lesson

Mocked tests prove the code matches its assumptions. Live clusters prove the assumptions. **This gauntlet proved something else again: in a local-LLM world, your evidence layer can be flawless while your incident outcomes hinge on a toy model and a homelab inference server.** Budget testing time accordingly — and instrument the boundary between "the data was there" and "the conclusion was reached," because that seam is where these systems now fail.
