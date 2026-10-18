---
title: "The Perils of Timezone — A Complete Visual Guide"
date: 2026-08-06
description: "Why UTC is the only sane default, how timezones silently corrupt distributed systems, and the discipline that keeps IST (or any local time) exactly where it belongs — at the edge."
tags: [timezone, distributed-systems, observability]
cover: "assets/images/covers/perils-of-timezone.svg"
draft: false
---

## The Trap

### It works on your laptop. That is the whole problem.

Timezone bugs almost never show up where you write the code. They surface at 2 AM, near midnight, twice a year on a DST boundary, or the first time two services in different regions try to agree on the order of events. The instant is the same everywhere — the _label_ is what betrays you.

One Instant · Five Clocks

<svg viewBox="0 0 720 300" role="img" aria-label="The same instant seen as different wall-clock times across services, breaking log ordering">
          <defs>
            <marker id="ar1" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0.5,0.5 L8,4.5 L0.5,8.5 Z" fill="#4B5563"></path>
            </marker>
            <marker id="ar1r" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0.5,0.5 L8,4.5 L0.5,8.5 Z" fill="#DC2626"></path>
            </marker>
          </defs>
          <rect x="270" y="26" width="180" height="46" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
          <text x="360" y="46" text-anchor="middle" font-size="13" font-weight="700" fill="#FFFFFF">One Real Event</text>
          <text x="360" y="63" text-anchor="middle" font-size="12" fill="#C7CDFF">1754470800 · epoch seconds</text>
          <g>
            <rect x="40" y="128" width="180" height="58" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="130" y="150" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Web (Mumbai)</text>
            <text x="130" y="169" text-anchor="middle" font-size="12" fill="#4B5563">logs 14:30 IST</text>
          </g>
          <g>
            <rect x="270" y="128" width="180" height="58" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="360" y="150" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">API (Container)</text>
            <text x="360" y="169" text-anchor="middle" font-size="12" fill="#4B5563">logs 09:00 UTC</text>
          </g>
          <g>
            <rect x="500" y="128" width="180" height="58" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="590" y="150" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">DB (Oregon)</text>
            <text x="590" y="169" text-anchor="middle" font-size="12" fill="#4B5563">logs 02:00 PDT</text>
          </g>
          <line x1="200" y1="72" x2="200" y2="126" stroke="#4B5563" stroke-width="1.6" marker-end="url(#ar1)"></line>
          <line x1="360" y1="72" x2="360" y2="126" stroke="#4B5563" stroke-width="1.6" marker-end="url(#ar1)"></line>
          <line x1="520" y1="72" x2="520" y2="126" stroke="#4B5563" stroke-width="1.6" marker-end="url(#ar1)"></line>
          <path d="M270,49 L200,49 L200,72" fill="none" stroke="#4B5563" stroke-width="1.6"></path>
          <path d="M450,49 L520,49 L520,72" fill="none" stroke="#4B5563" stroke-width="1.6"></path>
          <rect x="255" y="242" width="210" height="46" rx="9" fill="#FEF2F2" stroke="#DC2626" stroke-width="1.5"></rect>
          <text x="360" y="263" text-anchor="middle" font-size="13" font-weight="700" fill="#DC2626">Which Happened First?</text>
          <text x="360" y="279" text-anchor="middle" font-size="12" fill="#B91C1C">naive ordering is now wrong</text>
          <path d="M130,186 L130,214 L300,214 L300,240" fill="none" stroke="#DC2626" stroke-width="1.5" marker-end="url(#ar1r)"></path>
          <line x1="360" y1="186" x2="360" y2="240" stroke="#DC2626" stroke-width="1.5" marker-end="url(#ar1r)"></line>
          <path d="M590,186 L590,214 L420,214 L420,240" fill="none" stroke="#DC2626" stroke-width="1.5" marker-end="url(#ar1r)"></path>
          <circle cx="360" cy="265" r="8" fill="none" stroke="#DC2626" stroke-width="1.5" opacity="0.7">
            <animate attributeName="r" values="8;60;8" dur="3s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite"></animate>
          </circle>
        </svg>

14:30 IST, 09:00 UTC and 02:00 PDT are the **same moment**. Store the label instead of the instant and you can no longer order your own logs.

### Where it bites

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><path d="M12 8v5"></path><circle cx="12" cy="16.5" r=".6" fill="#444CE7"></circle><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path></svg>

Naive local time

`datetime.now()`, `new Date()` without an offset, `CURRENT_TIMESTAMP` in a session-local TZ — each reads the machine's clock, so the value means something different on every host.

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><path d="M3 12h4l3 8 4-16 3 8h4"></path></svg>

The DST cliff

Twice a year a local wall-clock hour repeats or vanishes. Schedules double-fire or skip; "add 24 hours" lands an hour off; durations computed in local time silently gain or lose 3600 seconds.

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18"></path></svg>

Container defaults

A base image is UTC; one team bakes in `TZ=Asia/Kolkata`; another mounts the node's zoneinfo. Now "the logs" are a mix of clocks and nobody remembers which service is in which.

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><path d="M4 7V4h16v3"></path><path d="M9 20h6"></path><path d="M12 4v16"></path></svg>

Offset-less strings

`2026-08-06 14:30:00` with no `Z` and no offset is not a timestamp — it is a riddle. Whoever parses it guesses a zone, and the guess is usually "mine."

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>

The midnight rollover

"Group by day" in local time puts the same UTC instant in two different buckets depending on where the report runs. Financial cut-offs and daily aggregates drift by a day near the boundary.

**The classic bug.** A job "runs daily at midnight" using the container clock. The container is UTC, the operator assumes IST, and the report for the 6th quietly contains 18:30 of the 5th through 18:30 of the 6th. It reconciles perfectly — against the wrong day.

```bash
# Same line of code. Two completely different values.
bad  = datetime.now()                      # naive — whatever the host clock says
good = datetime.now(timezone.utc)          # unambiguous instant, everywhere

# Serialise the instant, not the wall clock:
"2026-08-06 14:30:00"                     # a riddle
"2026-08-06T09:00:00Z"                    # ISO 8601, UTC, self-describing
```

## The Discipline

### One clock inside. Local time only at the glass.

The fix is not clever — it is boring, and boring is the point. Everything that _stores_, _computes_, or _transports_ a time uses UTC. The instant is converted to a human's timezone exactly once: at the moment it is rendered for that human. Local time is a presentation concern, never a storage format.

The Only Place Local Time Belongs

<svg viewBox="0 0 720 300" role="img" aria-label="Layered architecture: storage and transport in UTC, single conversion to IST at the display layer">
          <defs>
            <marker id="ar2" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0.5,0.5 L8,4.5 L0.5,8.5 Z" fill="#4B5563"></path>
            </marker>
            <marker id="ar2g" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0.5,0.5 L8,4.5 L0.5,8.5 Z" fill="#16A34A"></path>
            </marker>
          </defs>
          <rect x="210" y="238" width="300" height="46" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="360" y="259" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Storage — Postgres · VictoriaMetrics · Logs</text>
          <text x="360" y="276" text-anchor="middle" font-size="12" fill="#16A34A">stores UTC · epoch</text>
          <rect x="210" y="158" width="300" height="46" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="360" y="179" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">API &amp; Transport</text>
          <text x="360" y="196" text-anchor="middle" font-size="12" fill="#16A34A">returns ISO 8601 · UTC · trailing Z</text>
          <rect x="210" y="78" width="300" height="46" rx="9" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
          <text x="360" y="99" text-anchor="middle" font-size="13" font-weight="700" fill="#FFFFFF">Display — Grafana · Frontend</text>
          <text x="360" y="116" text-anchor="middle" font-size="12" fill="#C7CDFF">converts to IST here — and only here</text>
          <line x1="300" y1="238" x2="300" y2="206" stroke="#16A34A" stroke-width="1.6" marker-end="url(#ar2g)"></line>
          <line x1="300" y1="158" x2="300" y2="126" stroke="#16A34A" stroke-width="1.6" marker-end="url(#ar2g)"></line>
          <text x="312" y="222" font-size="12" font-weight="600" fill="#16A34A">UTC</text>
          <text x="312" y="142" font-size="12" font-weight="600" fill="#16A34A">UTC</text>
          <rect x="560" y="88" width="132" height="26" rx="6" fill="#EEF0FF" stroke="#C7CDFF"></rect>
          <text x="626" y="105" text-anchor="middle" font-size="12" font-weight="700" fill="#444CE7">convert once</text>
          <line x1="510" y1="101" x2="558" y2="101" stroke="#444CE7" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#ar2)"></line>
          <rect x="28" y="248" width="150" height="26" rx="6" fill="#F0FDF4" stroke="#BBF7D0"></rect>
          <text x="103" y="265" text-anchor="middle" font-size="12" font-weight="700" fill="#16A34A">never store local</text>
          <line x1="208" y1="261" x2="180" y2="261" stroke="#16A34A" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#ar2g)"></line>
          <circle cx="360" cy="101" r="8" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0.6">
            <animate attributeName="r" values="8;54;8" dur="3.4s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3.4s" repeatCount="indefinite"></animate>
          </circle>
        </svg>

UTC flows up untouched. The dark box is the **single** conversion point — push it any lower and every layer beneath inherits a timezone it did not need.

### The five rules

1.  **Store UTC, always.** Databases, caches, message payloads, metric samples, log timestamps — all UTC. This is the one you never bend.
2.  **Transport UTC as ISO 8601 with a `Z` or explicit offset.** A timestamp on the wire must describe its own zone. No bare `YYYY-MM-DD HH:MM:SS`.
3.  **Convert at the edge, once.** The browser, the dashboard, the report renderer applies the viewer's zone. Nothing upstream knows or cares that IST exists.
4.  **Keep the tz database fresh.** Offsets and DST rules change by government decree. Ship `tzdata` and update it; never hardcode `+05:30`.
5.  **Compute durations on instants, not wall clocks.** Subtract epochs. "Same time tomorrow" is a calendar operation done in the target zone — deliberately, not by adding 86400.

Store & compute

#### Instants, in UTC

An instant is a point on the universal timeline. It has no timezone — it _is_ the same for everyone. Keep your data at this level and ordering, diffing and correlation are free.

Present

#### Wall-clock, in the viewer's zone

"14:30 IST" is a human rendering of an instant for one audience. It is derived on demand and thrown away. Two users in two zones see two strings for one row — correctly.

**The litmus test.** Could two servers in two regions, and a browser in a third, all agree on the order and spacing of your events without a conversation? If yes, you stored instants. If no, a wall clock leaked into your data.

## In the Cluster

### Containers are UTC. Keep them that way.

Kubernetes hands you the correct default for free: every container starts in UTC. The tempting "fix" — inject `TZ=Asia/Kolkata` into every pod with a mutating policy — is the anti-pattern. It shifts log prefixes and naive code to IST while your metrics and traces stay UTC, so you have manufactured exactly the split-clock mess from Tab 1. IST goes at the edges instead.

IST at the Edges · UTC in the Core

<svg viewBox="0 0 720 260" role="img" aria-label="Kubernetes: containers stay UTC, CronJob timeZone and Grafana handle IST at the edges">
          <defs>
            <marker id="ar3" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
              <path d="M0.5,0.5 L8,4.5 L0.5,8.5 Z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="255" y="102" width="210" height="56" rx="10" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
          <text x="360" y="126" text-anchor="middle" font-size="13.5" font-weight="700" fill="#FFFFFF">Workload Containers</text>
          <text x="360" y="145" text-anchor="middle" font-size="12" fill="#C7CDFF">clock = UTC · unchanged</text>
          <rect x="30" y="30" width="200" height="52" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="130" y="51" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">CronJob Schedule</text>
          <text x="130" y="69" text-anchor="middle" font-size="12" fill="#4B5563">spec.timeZone: Asia/Kolkata</text>
          <rect x="490" y="30" width="200" height="52" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="590" y="51" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Grafana Display</text>
          <text x="590" y="69" text-anchor="middle" font-size="12" fill="#4B5563">default_timezone: ist</text>
          <rect x="260" y="200" width="200" height="46" rx="9" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="360" y="221" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Frontend</text>
          <text x="360" y="238" text-anchor="middle" font-size="12" fill="#4B5563">toLocaleString('en-IN')</text>
          <path d="M130,82 L130,130 L253,130" fill="none" stroke="#4B5563" stroke-width="1.6" marker-end="url(#ar3)"></path>
          <path d="M590,82 L590,130 L467,130" fill="none" stroke="#4B5563" stroke-width="1.6" marker-end="url(#ar3)"></path>
          <line x1="360" y1="158" x2="360" y2="198" stroke="#4B5563" stroke-width="1.6" marker-end="url(#ar3)"></line>
          <text x="150" y="122" font-size="12" font-weight="600" fill="#4B5563">fires</text>
          <text x="500" y="122" font-size="12" font-weight="600" fill="#4B5563">renders</text>
          <text x="372" y="182" font-size="12" font-weight="600" fill="#4B5563">renders</text>
          <circle cx="360" cy="130" r="9" fill="none" stroke="#444CE7" stroke-width="1.5" opacity="0.6">
            <animate attributeName="r" values="9;58;9" dur="3.2s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.5;0;0.5" dur="3.2s" repeatCount="indefinite"></animate>
          </circle>
        </svg>

Three edges speak IST to humans and the scheduler; the core keeps one clock. No pod's `TZ` was harmed.

### The tools, each at its layer

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M3 9h18M8 2v4M16 2v4"></path></svg>

Scheduling → `CronJob.spec.timeZone`

Stable since Kubernetes 1.27. The job fires at IST wall-clock — DST-aware — while its container still runs in UTC. This is the right way to make "midnight IST" happen.

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><path d="M3 3v18h18"></path><path d="M7 14l4-4 3 3 5-6"></path></svg>

Dashboards → Grafana `default_timezone`

Grafana queries UTC and renders in IST per-org or per-user. The data behind the panel never moves; only the axis labels do.

<svg viewBox="0 0 24 24" fill="none" stroke="#444CE7" stroke-width="2"><rect x="2" y="4" width="20" height="14" rx="2"></rect><path d="M8 20h8M12 18v2"></path></svg>

UI → `toLocaleString` with an explicit zone

The browser converts on render. Always pass the zone explicitly — never trust the visitor's machine to be in the zone your label claims.

<svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M15 9l-6 6M9 9l6 6"></path></svg>

Anti-pattern → cluster-wide `TZ` mutation

A Kyverno/admission policy stamping `TZ=Asia/Kolkata` on every pod looks tidy and quietly desynchronises logs from metrics from traces. Resist it.

```yaml
# Scheduling: fire at IST wall-clock, container stays UTC (k8s ≥ 1.27)
apiVersion: batch/v1
kind: CronJob
spec:
  schedule: "0 0 * * *"        # 00:00 …
  timeZone: "Asia/Kolkata"    # … interpreted as IST, DST-aware

# Grafana: query UTC, display IST — no container clock touched
grafana.ini:
  users:
    default_timezone: ist

# Frontend: convert on render, zone always explicit
new Date(e.event_at).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', hour12: false,
}) + ' IST';
```

**If you must go cluster-wide.** With no policy engine installed and a modern (~1.34) cluster, the least-bad way to inject an env everywhere is a native `MutatingAdmissionPolicy` (CEL, no extra controller) — but understand you are overriding a correct default. Reserve it for genuinely display-only fleets, never for anything that stores or correlates time.

### One-line rules of thumb

| Situation | Do this |
| --- | --- |
| Persisting a timestamp | UTC. No exceptions. |
| Sending one over the wire | ISO 8601 with `Z` / offset. |
| Showing one to a person | Convert at render, zone explicit, suffix the label (`IST`). |
| Running a job at a local hour | `CronJob.spec.timeZone` — not a container clock. |
| Tempted to set container `TZ` | Don't, unless the workload is display-only. |
| Computing a duration | Subtract instants (epochs), never wall clocks. |

**The whole guide in one sentence:** keep one clock in the machine and let people wear their own.

Written after one too many "it was fine locally" debugging sessions. Store UTC, render local, and sleep through the DST weekend.
