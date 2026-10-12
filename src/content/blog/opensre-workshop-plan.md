---
title: "From Alert to Answer: An OpenSRE Usefulness Workshop — Plan & Live Demo Script"
date: 2026-09-09
description: "A 2-hour, hands-on workshop plan proving OpenSRE on a real org stack (Kubernetes, Nginx, NATS, YugabyteDB, Aerospike, Keycloak, Grafana, Tempo, Victoria Logs, Alertmanager, Jenkins, GitHub). impress.js slide deck that prints as a readable article."
tags: [opensre, sre, observability, devops, workshop]
cover: "assets/images/covers/opensre-workshop-plan.svg"
draft: false
---

**Your browser can't run the 3D presentation.** Everything below still reads top-to-bottom as a normal article — print it to PDF for the handout version.

IntroAct 1Act 2Act 3Act 4Close

2-HOUR WORKSHOP · CHAOS-DRIVEN · YOUR CLUSTERS

One rolling incident, four chaos-driven acts, twelve integrations — all live, all on your own clusters.

Kubernetes · Nginx · NATS · YugabyteDB · Aerospike · Keycloak · Grafana · Tempo · Victoria Logs · Alertmanager · Jenkins · GitHub

Goal of this workshop: replace opinions about OpenSRE with a shared experience. One incident unfolds across four acts — page, blast radius, data plus identity, fix and close — while OpenSRE investigates on the projector and every fault is injected live from the chaos kit. By the end, every attendee has seen all twelve integrations earn their place.

Format: 10 minutes intro, four 25-minute acts, 10 minutes score and backlog. Kubernetes basics assumed. The strip at the top of every slide is the spine — glance at it any time you feel lost about where we are.

IntroAct 1Act 2Act 3Act 4Close

120 MINUTES · FOUR ACTS · ONE INCIDENT

## Inject. Watch. Ask. Revert.

| When | Act | Fault → question it answers |
| --- | --- | --- |
| 0:00 | Intro · 10 min | Map, LLM check, safety contract |
| 0:10 | Act 1 · The page fires · 25 min | Pod kill + flood → k8s · alertmanager · grafana · victoria |
| 0:35 | Act 2 · Blast radius · 25 min | Edge 503 + NATS flood → nginx · tempo · nats |
| 1:00 | Act 3 · Data + identity · 25 min | Slow query + login storm → yugabyte · aerospike · keycloak |
| 1:25 | Act 4 · Fix, ship, close · 25 min | Red build → green → jenkins · github · verify |
| 1:50 | Close · 10 min | 12-integration scorecard + backlog |

Everyone leaves with: the 4-beat loop, a green 12-integration matrix, and the chaos kit on its branch.

Every act runs the same 4-beat loop: inject (1m), symptom (1m), OpenSRE triage (3m per integration), revert plus verify (1m). The revert command is shown before every fault runs — say it out loud, then run it.

Acts chain into one story: a dying pod becomes edge 503s, which uncover queue lag, which coincide with data pressure and an auth storm, which end in a shipped fix. Nobody needs to remember the timetable; the incident carries them.

INTROSET THE STAGE · 10 MINUTES

Transition beat. "Nine o'clock, Tuesday. Checkout is about to page, the edge is about to 503, and the queue is about to drown. You will watch all of it happen — and get solved — on this screen, with faults injected live."

IntroAct 1Act 2Act 3Act 4Close

BEFORE ANYTHING BURNS · 10 MINUTES

## Pre-flight: model, matrix, safety

```bash
# 1 · the model answers from this room:
export CUSTOM_OPENAI_BASE_URL=http://192.0.2.5:8000
uv run opensre health && uv run opensre ask "are you up?"

# 2 · all twelve integrations green:
for s in kubernetes grafana alertmanager victoria-logs tempo nginx nats \
         yugabytedb aerospike keycloak jenkins github; do
  uv run opensre integrations setup $s
done
```

SAFETY

Faults hit **stateless prod echo-services only**. Never two Aerospike nodes or two YB masters — quorum loss is not a demo.

CONTRACT

Every fault script prints its **revert first**, previews with `DRY_RUN=1`, refuses live runs without `--confirm`. Global abort: `./abort-all.sh --confirm`.

Run the health check live — the "are you up" answer is the first time the room hears the model, and it proves the whole chain (terminal, config, LAN endpoint) before any incident depends on it. Step two fills the integration matrix the Close slide scores.

Read the safety card out loud, verbatim. Then point at the two exhibits already burning: Grafana CrashLoopBackOff and 164 cert-manager-cainjector restarts. They are free triage material for Act 1 and proof that this cluster is production, not a sandbox.

IntroAct 1Act 2Act 3Act 4Close

YOUR STACK, ONE PICTURE

## Everything the demo touches

Evidence Sources Around The Kubernetes Core · Twelve Integrations

<svg viewBox="0 0 920 700" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Organisation stack map diagram">
        <defs>
          <marker id="smV" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#6D28D9"></path>
          </marker>
          <marker id="smA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#D97706"></path>
          </marker>
          <marker id="smT" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#047857"></path>
          </marker>
          <marker id="smB" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#2563EB"></path>
          </marker>
          <marker id="smR" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#DC2626"></path>
          </marker>
          <marker id="smD" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#1a1a3e"></path>
          </marker>
        </defs>
        <rect x="360" y="250" width="200" height="90" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
        <circle cx="460" cy="295" r="10" fill="none" stroke="#2563EB" stroke-width="2" class="ping"></circle>
        <text x="460" y="290" text-anchor="middle" font-size="14" font-weight="600" fill="#F9FAFB">Kubernetes</text>
        <text x="460" y="309" text-anchor="middle" font-size="12.5" fill="#CBD5E1">Workloads · Logs · Events</text>
        <rect x="370" y="52" width="180" height="76" rx="10" fill="#FFFFFF" stroke="#D97706" stroke-width="2"></rect>
        <text x="460" y="78" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Nginx</text>
        <text x="460" y="96" text-anchor="middle" font-size="12.5" fill="#4B5563">Edge Proxy</text>
        <text x="460" y="114" text-anchor="middle" font-size="12" font-weight="700" fill="#047857">Native · 6 Tools</text>
        <rect x="320" y="470" width="280" height="64" rx="10" fill="#FFFFFF" stroke="#047857" stroke-width="2"></rect>
        <text x="460" y="494" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">YugabyteDB · Aerospike</text>
        <text x="460" y="512" text-anchor="middle" font-size="12.5" fill="#4B5563">Read-Only Diagnostics</text>
        <rect x="40" y="260" width="180" height="70" rx="10" fill="#FFFFFF" stroke="#6D28D9" stroke-width="2"></rect>
        <text x="130" y="287" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">GitHub</text>
        <text x="130" y="305" text-anchor="middle" font-size="12.5" fill="#4B5563">PRs · Deploys</text>
        <rect x="700" y="260" width="180" height="70" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="790" y="287" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Grafana</text>
        <text x="790" y="305" text-anchor="middle" font-size="12.5" fill="#4B5563">Dashboards · Alert View</text>
        <rect x="40" y="70" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#DC2626" stroke-width="2"></rect>
        <text x="130" y="96" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Alertmanager</text>
        <text x="130" y="114" text-anchor="middle" font-size="12.5" fill="#4B5563">Fires the Page</text>
        <rect x="700" y="70" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="790" y="96" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Victoria Logs</text>
        <text x="790" y="114" text-anchor="middle" font-size="12.5" fill="#4B5563">Error Logs</text>
        <rect x="40" y="450" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="130" y="476" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">VictoriaMetrics</text>
        <text x="130" y="494" text-anchor="middle" font-size="12.5" fill="#4B5563">Metrics Store</text>
        <rect x="700" y="450" width="180" height="64" rx="10" fill="#FFFFFF" stroke="#1a1a3e" stroke-width="2"></rect>
        <text x="790" y="476" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">You · REPL</text>
        <text x="790" y="494" text-anchor="middle" font-size="12.5" fill="#4B5563">Human in the Loop</text>
        <rect x="40" y="580" width="195" height="64" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="137" y="606" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">NATS</text>
        <text x="137" y="624" text-anchor="middle" font-size="12.5" fill="#4B5563">Queue Lag</text>
        <rect x="255" y="580" width="195" height="64" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="352" y="606" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Tempo</text>
        <text x="352" y="624" text-anchor="middle" font-size="12.5" fill="#4B5563">Traces</text>
        <rect x="470" y="580" width="195" height="64" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="567" y="606" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Keycloak</text>
        <text x="567" y="624" text-anchor="middle" font-size="12.5" fill="#4B5563">Identity</text>
        <rect x="685" y="580" width="195" height="64" rx="10" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"></rect>
        <text x="782" y="606" text-anchor="middle" font-size="14" font-weight="600" fill="#111827">Jenkins</text>
        <text x="782" y="624" text-anchor="middle" font-size="12.5" fill="#4B5563">CI/CD</text>
        <line x1="30" y1="666" x2="890" y2="666" stroke="#2563EB" stroke-width="1.5"></line>
        <path d="M30,666 V255 H360" fill="none" stroke="#2563EB" stroke-width="2" marker-end="url(#smB)"></path>
        <line x1="460" y1="128" x2="460" y2="250" stroke="#D97706" stroke-width="2" marker-end="url(#smA)"></line>
        <line x1="460" y1="340" x2="460" y2="470" stroke="#047857" stroke-width="2" marker-end="url(#smT)"></line>
        <line x1="220" y1="295" x2="360" y2="295" stroke="#6D28D9" stroke-width="2" marker-end="url(#smV)"></line>
        <line x1="700" y1="295" x2="570" y2="295" stroke="#2563EB" stroke-width="2" marker-end="url(#smB)"></line>
        <path d="M130,134 V230 H360" fill="none" stroke="#DC2626" stroke-width="2" marker-end="url(#smR)"></path>
        <path d="M790,134 V255 H570" fill="none" stroke="#2563EB" stroke-width="2" marker-end="url(#smB)"></path>
        <path d="M130,450 V335 H360" fill="none" stroke="#2563EB" stroke-width="2" marker-end="url(#smB)"></path>
        <path d="M790,450 V335 H570" fill="none" stroke="#1a1a3e" stroke-width="2" marker-end="url(#smD)"></path>
        <text x="467" y="192" font-size="12.5" font-weight="600" fill="#4B5563">Serves</text>
        <text x="467" y="408" font-size="12.5" font-weight="600" fill="#4B5563">Persists</text>
        <text x="290" y="285" text-anchor="middle" font-size="12.5" font-weight="600" fill="#4B5563">Ships</text>
        <text x="630" y="285" text-anchor="middle" font-size="12.5" font-weight="600" fill="#4B5563">Watches</text>
        <text x="137" y="205" font-size="12.5" font-weight="600" fill="#4B5563">Pages</text>
        <text x="797" y="205" font-size="12.5" font-weight="600" fill="#4B5563">Logs</text>
        <text x="137" y="390" font-size="12.5" font-weight="600" fill="#4B5563">Stores</text>
        <text x="797" y="390" font-size="12.5" font-weight="600" fill="#4B5563">Drives</text>
        <circle r="3.5" fill="#D97706"><animateMotion dur="2.4s" repeatCount="indefinite" path="M460,128 V250"></animateMotion></circle>
        <circle r="3.5" fill="#6D28D9"><animateMotion dur="2.4s" begin="0.8s" repeatCount="indefinite" path="M220,295 H360"></animateMotion></circle>
        <circle r="3.5" fill="#DC2626"><animateMotion dur="3s" begin="0.4s" repeatCount="indefinite" path="M130,134 V230 H360"></animateMotion></circle>
        <circle r="3.5" fill="#1a1a3e"><animateMotion dur="3s" begin="1.4s" repeatCount="indefinite" path="M790,450 V335 H570"></animateMotion></circle>
        <circle r="3.5" fill="#2563EB"><animateMotion dur="3.4s" begin="0.2s" repeatCount="indefinite" path="M30,666 V255 H360"></animateMotion></circle>
      </svg>

Change Edge Data Observe Incident Human

Walk the map box by box, naming the real system behind each one — and read the legend out loud once, because this color language now runs through the entire deck: violet is change, amber is the edge, teal is data, blue is observation, red is the incident itself. Blue here means the OpenSRE system and its lenses — never the world being investigated.

Count to twelve with the room: Kubernetes, GitHub, Alertmanager, Nginx, Grafana, Victoria Logs, VictoriaMetrics, YugabyteDB, Aerospike, NATS, Tempo, Keycloak, Jenkins — thirteen boxes, twelve integrations, one human. The bottom row (messaging, traces, identity, CI) joins on a shared evidence bus. Land the human-in-the-loop point: OpenSRE proposes with evidence, the engineer disposes.

IntroAct 1Act 2Act 3Act 4Close

WHAT HAPPENS BETWEEN ALERT AND ANSWER · 3 MINUTES

## Six stages. Read-only tools. Evidence or it didn't happen.

The Investigation Pipeline

<svg viewBox="0 0 920 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Investigation pipeline diagram">
        <defs>
          <marker id="arrP" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#2563EB"></path>
          </marker>
        </defs>
        <rect x="24" y="48" width="130" height="72" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="89" y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Intake</text>
        <text x="89" y="97" text-anchor="middle" font-size="12" fill="#4B5563">Alert In</text>
        <rect x="172" y="48" width="130" height="72" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="237" y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Resolve</text>
        <text x="237" y="97" text-anchor="middle" font-size="12" fill="#4B5563">Which Vendors</text>
        <rect x="320" y="48" width="130" height="72" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="385" y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Plan</text>
        <text x="385" y="97" text-anchor="middle" font-size="12" fill="#4B5563">Pick Tools</text>
        <rect x="468" y="48" width="130" height="72" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
        <circle cx="578" cy="84" r="7" fill="none" stroke="#2563EB" stroke-width="2" class="ping"></circle>
        <text x="527" y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="#F9FAFB">Gather</text>
        <text x="527" y="97" text-anchor="middle" font-size="12" fill="#CBD5E1">ReAct Tool Loop</text>
        <rect x="616" y="48" width="130" height="72" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="681" y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Diagnose</text>
        <text x="681" y="97" text-anchor="middle" font-size="12" fill="#4B5563">JSON Verdict</text>
        <rect x="764" y="48" width="130" height="72" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
        <text x="829" y="78" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Report</text>
        <text x="829" y="97" text-anchor="middle" font-size="12" fill="#4B5563">Cause + Claims</text>
        <line x1="154" y1="84" x2="172" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrP)"></line>
        <line x1="302" y1="84" x2="320" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrP)"></line>
        <line x1="450" y1="84" x2="468" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrP)"></line>
        <line x1="598" y1="84" x2="616" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrP)"></line>
        <line x1="746" y1="84" x2="764" y2="84" stroke="#2563EB" stroke-width="1.8" marker-end="url(#arrP)"></line>
        <circle r="3.5" fill="#2563EB"><animateMotion dur="2s" repeatCount="indefinite" path="M450,84 H468"></animateMotion></circle>
        <circle r="3.5" fill="#2563EB"><animateMotion dur="2s" begin="1s" repeatCount="indefinite" path="M598,84 H616"></animateMotion></circle>
      </svg>

You will watch the **Gather** box work live: each tool call, each payload, narrated as it streams.

Intake normalises the alert. Resolve decides which integrations apply from configuration. Plan selects tools per stage. Gather runs the ReAct loop — this is where connector tools execute against live systems, and the only part of the pipeline the audience watches in full. Notice the color discipline: this diagram is all blue because it is all OpenSRE. Domain colors belong to the world being investigated, never to the machine doing the investigating.

Two properties to stress before the demo starts: every tool is read-only, and every failure degrades into a machine-readable payload instead of crashing the loop. Both will be visible on screen within minutes.

IntroAct 1Act 2Act 3Act 4Close

ONE INCIDENT, FOUR ACTS · PRESS → TO REVEAL

## T+0, a pod dies…

The Rolling Incident — Act By Act

<svg viewBox="0 0 920 250" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Incident timeline diagram">
        <defs>
          <marker id="arrT" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#4B5563"></path>
          </marker>
        </defs>
        <line x1="90" y1="130" x2="850" y2="130" stroke="#E5E7EB" stroke-width="3" marker-end="url(#arrT)"></line>
        <g class="substep">
          <circle cx="90" cy="130" r="9" fill="#DC2626"></circle>
          <text x="90" y="92" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">T+0 Kill</text>
          <text x="90" y="110" text-anchor="middle" font-size="12" fill="#4B5563">payments Pod + Flood</text>
        </g>
        <g class="substep">
          <circle cx="242" cy="130" r="9" fill="#D97706"></circle>
          <text x="242" y="172" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">T+2 Edge 503</text>
          <text x="242" y="190" text-anchor="middle" font-size="12" fill="#4B5563">orders → 0 · NATS Lag</text>
        </g>
        <g class="substep">
          <circle cx="394" cy="130" r="9" fill="#DC2626"></circle>
          <text x="394" y="92" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">T+5 Page</text>
          <text x="394" y="110" text-anchor="middle" font-size="12" fill="#4B5563">Alertmanager Fires</text>
        </g>
        <g class="substep">
          <circle cx="546" cy="130" r="9" fill="#047857"></circle>
          <text x="546" y="172" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">T+8 Pressure</text>
          <text x="546" y="190" text-anchor="middle" font-size="12" fill="#4B5563">YB Slow · AS Hot · Auth Storm</text>
        </g>
        <g class="substep">
          <circle cx="698" cy="130" r="9" fill="#1a1a3e" stroke="#2563EB" stroke-width="2"></circle>
          <text x="698" y="92" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">T+12 Fix</text>
          <text x="698" y="110" text-anchor="middle" font-size="12" fill="#4B5563">Jenkins Green · PR Merged</text>
        </g>
        <g class="substep">
          <circle cx="850" cy="130" r="9" fill="#16A34A"></circle>
          <text x="850" y="172" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">T+15 Score</text>
          <text x="850" y="190" text-anchor="middle" font-size="12" fill="#4B5563">Matrix Green · Backlog Set</text>
        </g>
        <circle r="3.5" fill="#4B5563"><animateMotion dur="4s" repeatCount="indefinite" path="M90,130 H850"></animateMotion></circle>
      </svg>

Reveal each beat with → as it happens in the room — the timeline doubles as the demo's progress bar. A pod is deleted on screen, the edge starts 503ing, the page fires for real, data pressure and an auth storm pile on, and the fix ships green — while OpenSRE narrates every tool call across Kubernetes, Alertmanager, Grafana, Victoria Logs, Nginx, Tempo, NATS, YugabyteDB, Aerospike, Keycloak, Jenkins and GitHub.

Punchline at T+15: the room has watched one fault cascade through every layer — and watched each layer answer for itself with evidence. Chasing the cascade, not a single culprit, is what converts skeptics.

IntroAct 1Act 2Act 3Act 4Close

RUN-OF-SHOW · EVERY ACT RUNS THE SAME LOOP

## Inject → symptom → ask → revert

1.  ACT 1`./pod-kill.sh --confirm` + flood. Ask: **what fired, which Grafana rule matches, what do victoria-logs say?** Correlate all three.
2.  ACT 2`./scale-to-zero.sh --confirm` + `./nats-flood.sh --confirm`. Ask: **nginx upstreams, 5xx access tail, failing Tempo trace, NATS lag** — cause or casualty?
3.  ACT 3Run `yb-slow-query.sql` + `./keycloak-login-storm.sh --confirm`. Ask: **slow queries, Aerospike latency, login failures** — is the auth storm the outage?
4.  ACT 4Push the breaking commit. Ask: **which Jenkins build failed, open the fix as a GitHub PR, annotate Grafana, verify in victoria-logs + k8s.** Then `./abort-all.sh --confirm`.

→ Next: each of your twelve integrations gets its stage moment on the following slides.

This is the slide the facilitator rehearses from. Two projectors if possible: terminal on the left, Grafana plus Alertmanager on the right. Say every revert out loud before the fault runs — the audience should hear the safety net before they see the fire.

Rehearse the failure modes too: if the model stalls, narrate the last good evidence while it recovers; if a tool degrades, point at the degraded envelope as a feature ("watch it keep going"). Both have happened in real runs and both play well live.

IntroAct 1Act 2Act 3Act 4Close

ACTS 1–2 · EACH GETS A STAGE MOMENT

## Page. Edge. Trace.

KubernetesACT 1

Show

Deleted pod recreating, restart counts, event timeline — plus the real Grafana CrashLoop.

Takeaway

Ground truth lives in pods and events — everything else interprets them.

AlertmanagerACT 1

Show

The raw firing alert JSON, silences, and which Grafana rule it matches.

Takeaway

The page is structured data — the investigation starts from the payload, not a screenshot.

GrafanaACT 1

Show

Error-rate panel climbing live, alert rules pulled via connector, deploy annotated at fix time.

Takeaway

The chart everyone trusts, pulled by the agent — not screenshotted by a human.

Victoria LogsACT 1

Show

Error spike for store-payments in the last 5 minutes, correlated to the alert window.

Takeaway

Logs confirm the page is real — and bound its blast radius to one service.

NginxACT 2

Show

Upstream health with orders at zero, 5xx access-log summary, error-log tail.

Takeaway

The edge names the failing upstream — the RCA points at a service, not a layer.

TempoACT 2

Show

One failing checkout trace, span by span, ending at the dead upstream.

Takeaway

A trace turns "the site is slow" into "this hop, this service, this second".

→ Next: data, identity, and the fix — six more integrations.

Read a card, then read its takeaway; the pairs are written to survive being photographed. The first four cards convict the fault (something really died); the last two trace exactly where the user feels it.

Pace: three minutes per integration — one minute of symptom, two of triage. If an answer is slow, narrate the question while the loop works; never stand silent waiting for tokens.

IntroAct 1Act 2Act 3Act 4Close

ACTS 3–4 · EACH GETS A STAGE MOMENT

## Data. Identity. Ship.

NATSACT 3

Show

Stream depth and consumer lag after the flood, connections holding steady.

Takeaway

Lag answers "cause or casualty" — the queue absorbed the flood, it didn't start it.

YugabyteDBACT 3

Show

Slow-query top list with the probe visible, cluster and tserver status green.

Takeaway

The database shows its own work — pressure is measured, not guessed.

AerospikeACT 3

Show

Namespace stats, cluster size 3, write latency under load.

Takeaway

A cleared suspect is evidence too — exoneration makes verdicts stick.

KeycloakACT 3

Show

Login-failure burst for the probe user, sessions intact, no lockouts on real users.

Takeaway

Auth storms look like outages — identity evidence separates the two.

JenkinsACT 4

Show

The red build, the failing stage, then the green rebuild after the fix.

Takeaway

CI is the first witness for "did the fix work" — before users ever could be.

GitHubACT 4

Show

The fix opened as a PR, CI checks attached, merged on screen.

Takeaway

Every incident ends as a change — the loop closes where it opened.

→ Next: the payloads behind the takeaways, quoted verbatim.

This is the slide for anyone who asked "but will it cover X" — all twelve integrations now map to a timestamped moment. The back half flips the story: two cards exonerate (data, identity) while two convict-and-fix (CI, change).

End Act 3 on the Keycloak line — "auth storms look like outages" is the most-retweeted sentence of the workshop. Then break before Act 4; the fix lands better after a pause.

ACT IVFIX · SHIP · CLOSE THE LOOP · 25 MINUTES

Transition beat. "Three acts of breaking. Now watch the same machine that found everything help ship the fix — red build, pull request, annotation, green. Then we score it."

IntroAct 1Act 2Act 3Act 4Close

NOT SLIDEWARE — REAL OUTPUT SHOWN LIVE

## Ruling out is a feature

```bash
# Aerospike, mid-incident:
'node_status': 'ok', 'cluster_size': 3, 'cluster_integrity': True

# YugabyteDB, same window:
'node_count': 3, 'active': 4, 'cache_hit_ratio_percent': 0.0  # idle, not sick

# NATS, after the flood:
'stream': 'orders.events', 'lag': 4120, 'state': 'catching_up'  # absorbed it

# Keycloak, during the storm:
'login_failures': 50, 'user': 'workshop-chaos-probe', 'real_users_locked': 0
```

✓Yugabyte measured ✓Aerospike healthy ✓Queue absorbed it ✓Auth storm isolated  →  chase the cascade, not one culprit.

→ Next: what we refuse to build — and why restraint ships demos.

These are verbatim shapes from live fault-injection runs against real clusters — node counts, integrity flags, per-node connection counters. In the demo the same payloads arrive in the terminal in real time while the room watches. This slide is the zoomed-in proof behind the takeaways on the previous slide.

The rhetorical point to land: an SRE tool earns trust as much by clearing suspects with evidence as by naming culprits. Three healthy databases, stated plainly, is what makes the Nginx verdict believable instead of convenient.

IntroAct 1Act 2Act 3Act 4Close

SCOPE DISCIPLINE, STATED UP FRONT

## What we will not build

✕cert-manager integration

Slow-burn expiry, not a 2-hour story — k8s + logs already cover it. Backlog ticket.

✕Chaos Mesh today

kubectl + hey + nats-box cover all 12 integrations. Mesh is the follow-up pilot.

✕A second RCA engine

OpenSRE reasons; nothing competes with it

✕A full dashboard in v1

One static incident page from real JSON

Each rejected item is a rabbit hole that has swallowed similar demos. The cert-manager call deserves one sentence: all certificates read True today, expiry is a slow burn that cannot fire on stage, and the failure modes are already reachable through the Kubernetes and Victoria Logs integrations.

Say this slide's message out loud in the room: constraints are what make the demo shippable in two hours.

IntroAct 1Act 2Act 3Act 4Close

NO FAULT INJECTION REQUIRED · ALREADY BURNING

## The cluster is already on fire (a little)

EXHIBIT A

**Grafana CrashLoopBackOff (2/3).** Ask: `why is monitoring-grafana crashlooping? pods, events, last logs.` Free Act 1 triage.

EXHIBIT B

**cert-manager-cainjector, 164 restarts.** Ask: `is issuance healthy despite the restarts? certificates, issuers, recent events.` The cert-manager verdict, live.

EXHIBIT C

**Konnectivity refused on one node** — log fetches can fail there. Narrate it as degraded evidence, not a bug.

Real production is never clean — say so, and spend five minutes on Exhibit A inside Act 1. Triaging a fault nobody injected is the most convincing minute of the workshop: no script, no safety net, just the loop against a genuinely sick pod.

Exhibit B doubles as the cert-manager discussion: restarts with all certificates True is exactly why expiry monitoring is backlog, not blockers. Exhibit C is your rehearsed demo of graceful degradation — when a log fetch fails, point at the envelope continuing, not the error.

IntroAct 1Act 2Act 3Act 4Close

THE MACHINERY · BRANCH opensre-workshop · ISSUE #6244

## Eight faults. One abort.

```bash
# every script: revert first · DRY_RUN=1 previews · --confirm or refuse
workshop/chaos/pod-kill.sh            # Act 1 · delete one payments pod
workshop/chaos/scale-to-zero.sh       # Act 2 · orders → 0, --revert restores
workshop/chaos/nats-flood.sh          # Act 2 · 5000 msgs via nats-box
workshop/chaos/keycloak-login-storm.sh # Act 3 · 50 wrong-password logins
workshop/chaos/log-flood.sh           # Act 1 · short-lived log emitter
workshop/chaos/yb-slow-query.sql      # Act 3 · read-only probe
workshop/chaos/cpu-hog-job.yaml       # spare · pinned image, 5-min fuse
workshop/chaos/abort-all.sh           # global revert · rescales prod to 2
```

**Contract, tested:** dry runs touch nothing · unconfirmed live runs are refused · abort restores all four prod deploys. Seven pytest cases guard it.

Show this slide once, right before Act 4 — by now the room has seen six of these run and trusts the machinery. The point to land: chaos with a contract. DRY\_RUN previews, --confirm gates, abort-all restores, and a test suite proves all three.

Invite the room to steal it: the kit plus its tests are the take-home for any team that wants game-days next quarter. That is the adoption seed — don't sell it, just leave it visible.

IntroAct 1Act 2Act 3Act 4Close

ACT 4 · 25 MINUTES · RED TO GREEN

## Ship the fix on stage

1.  PUSHCommit the breaking assertion to the demo repo. Watch Jenkins go **red** on the projector.
2.  ASK`which build failed and why? open the minimal fix as a GitHub PR.` Review the diff together.
3.  MERGEMerge on screen. Jenkins rebuilds **green**. Annotate the deploy in Grafana.
4.  VERIFYError rate falls in victoria-logs, rollout healthy in k8s. Run `./abort-all.sh --confirm`. Incident closed.

→ Next: score all twelve, file the backlog.

Act 4 is the emotional payoff — the same loop that spent an hour finding faults now helps ship. Slow down at the merge: let the room see the PR, the checks, the green build, the annotation. Verification is the sermon — "we don't believe it's fixed, we query that it's fixed."

Run abort-all live as the closing gesture. Prod rescales, chaos-load drains, pods return. The incident ends the way it should: with the cluster visibly whole.

IntroAct 1Act 2Act 3Act 4Close

CLOSE · 10 MINUTES · TWELVE FOR TWELVE

## Scorecard

ACT 1 · PAGE

k8s · alertmanager · grafana · victoria

Pod kill triaged, alert correlated, logs bound the blast radius

ACT 2 · EDGE

nginx · tempo · nats

Upstream named, trace pinned the hop, queue cleared itself

ACT 3 · DEPTH

yugabyte · aerospike · keycloak

Pressure measured, suspects exonerated, storm isolated

ACT 4 · SHIP

jenkins · github

Red to green on stage, PR merged, deploy annotated + verified

Backlog: **cert-manager ticket** · Chaos Mesh pilot in `poc` · weekly game-days. Kit lives on branch `opensre-workshop` (#6244).

→ Next: what Monday looks like.

Read the four cards fast — the room just lived them. The scorecard's job is a photograph: twelve integrations, four verdicts, one page of proof. Ask for a show of hands on which act surprised them most; that answer tells you which team adopts first.

Name the backlog out loud and assign nothing yet — assignment happens on the next slide, with a named owner.

CLOSESCORE + BACKLOG · 10 MINUTES

Transition beat. "You have watched production break on purpose — and get fixed faster than most real incidents get triaged. Here is how those two hours become a decision."

IntroAct 1Act 2Act 3Act 4Close

LEAVING WITH MORE THAN PHOTOS

## Take-home + 30/60/90

TAKE-HOME

In your hands

Green 12-integration matrix · the 4-beat loop · chaos kit branch (#6244) · this deck as the runbook

ROADMAP

What follows

**30** — first game-day on a real service · **60** — Chaos Mesh pilot + cert-manager ticket · **90** — MTTR trend vs today, expand services

Two questions to close the room: **which service gets the first game-day?** and **who owns it?**

The integration matrix from pre-flight is the adoption artifact: twelve rows, all green, witnessed live. The 4-beat loop is the method every future game-day repeats. The chaos kit branch is the seed — any team can run DRY\_RUN previews this week.

End with a named service and a named owner for the first game-day. Workshops that close on a question get answers; workshops that close on a summary get applause and nothing else.

The integration matrix from pre-flight is the adoption artifact: twelve rows, all green, witnessed live. The 4-beat loop is the method every future game-day repeats. The chaos kit branch is the seed — any team can run DRY\_RUN previews this week.

End with a named service and a named owner for the first game-day. Workshops that close on a question get answers; workshops that close on a summary get applause and nothing else.

← → navigate  ·  H help  ·  P console  ·  F5 fullscreen  ·  print for the article version
