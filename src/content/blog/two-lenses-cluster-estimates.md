---
title: "22 Points and Two Blind Spots: Estimating the Same Four Bugs Twice"
date: 2026-08-16
description: "Four cluster bugs, estimated independently through an LLM-systems lens and an SRE lens. They converged on three structural calls, disagreed on two numbers, and each caught a severe risk the other missed entirely."
tags: [mlx, ai, debugging, engineering]
cover: "assets/images/covers/two-lenses-cluster-estimates.svg"
draft: false
---

## The same four bugs, estimated twice. The disagreements were worth more than the totals.

Two independent estimates of one backlog — one from an LLM-systems perspective, one from an SRE perspective. They converged on three structural calls, split on two numbers, and each identified a severe risk the other never mentioned.

<div class="stat-cards">
<div class="stat-card"><span class="stat-card__n">22</span><span class="stat-card__l">Story points, systems lens</span></div>
<div class="stat-card"><span class="stat-card__n">5.75</span><span class="stat-card__l">Eng-days, SRE lens, excl. the split</span></div>
<div class="stat-card stat-card--err"><span class="stat-card__n">8</span><span class="stat-card__l">Points both flagged: split it</span></div>
<div class="stat-card stat-card--warn"><span class="stat-card__n">297</span><span class="stat-card__l">Failed probes in one log</span></div>
<div class="stat-card stat-card--err"><span class="stat-card__n">2</span><span class="stat-card__l">Severe risks, each seen once</span></div>
<div class="stat-card stat-card--ok"><span class="stat-card__n">3</span><span class="stat-card__l">Independent structural agreements</span></div>
</div>

### The Four Bugs

All four found while standing up a two-machine Apple Silicon inference cluster.

|  | Bug | Why it matters |
| --- | --- | --- |
| **A** | Activation rejects the default macOS computer name | Setup Assistant names Macs `<Name>'s <Model>` using a curly apostrophe (U+2019). The node-ID validator allows ASCII alphanumerics, dot, underscore, hyphen. Every un-renamed Mac fails at activation. |
| **B** | Correctly installed peer reported as "runtime not installed" | Interpreter discovery looks for a filename the product does not ship. The fallback path hardcodes a "not installed" verdict, which then surfaces as a diagnosis. A budgets endpoint 503s on every dashboard poll. |
| **C** | Non-coordinator answers requests silently | Every node is a full standalone server. A request to the wrong node returns a valid 200 from that node's own model, indistinguishable from a distributed answer. |
| **D** | Coordinator loss ends the deployment, undocumented | No failover, no shard rebalance. Ranks detect the dead launcher and exit rather than hang. Correct behaviour — but written down nowhere. |

D was deliberately filed as three things: document the semantics, surface the crash event, and an optional assisted re-activation. That split turned out to matter.

### Two Estimates

Same inputs, same scale, no contact between them.

Effort Estimate By Lens — Story Points

<svg viewBox="0 0 960 400" role="img" aria-label="Bar comparison of story point estimates from the systems lens and the SRE lens across six work items">
        <line x1="300" y1="52"  x2="300" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="380" y1="52"  x2="380" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="460" y1="52"  x2="460" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="540" y1="52"  x2="540" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="620" y1="52"  x2="620" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="700" y1="52"  x2="700" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="780" y1="52"  x2="780" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="860" y1="52"  x2="860" y2="348" stroke="#E5E7EB" stroke-width="1"></line>
        <text x="300" y="368" text-anchor="middle" font-size="12" fill="#4B5563">1</text>
        <text x="380" y="368" text-anchor="middle" font-size="12" fill="#4B5563">2</text>
        <text x="460" y="368" text-anchor="middle" font-size="12" fill="#4B5563">3</text>
        <text x="540" y="368" text-anchor="middle" font-size="12" fill="#4B5563">4</text>
        <text x="620" y="368" text-anchor="middle" font-size="12" fill="#4B5563">5</text>
        <text x="700" y="368" text-anchor="middle" font-size="12" fill="#4B5563">6</text>
        <text x="780" y="368" text-anchor="middle" font-size="12" fill="#4B5563">7</text>
        <text x="860" y="368" text-anchor="middle" font-size="12" fill="#4B5563">8</text>
        <text x="580" y="390" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">Story Points</text>
        <rect x="300" y="24" width="14" height="14" rx="3" fill="#2563EB"></rect>
        <text x="322" y="36" font-size="12" font-weight="600" fill="#4B5563">Systems Lens</text>
        <rect x="440" y="24" width="14" height="14" rx="3" fill="#7C3AED"></rect>
        <text x="462" y="36" font-size="12" font-weight="600" fill="#4B5563">SRE Lens</text>
        <text x="286" y="76" text-anchor="end" font-size="12.5" font-weight="600" fill="#111827">A Node ID</text>
        <rect x="300" y="62" width="160" height="14" rx="3" fill="#2563EB"></rect>
        <rect x="300" y="80" width="80"  height="14" rx="3" fill="#7C3AED"></rect>
        <text x="286" y="122" text-anchor="end" font-size="12.5" font-weight="600" fill="#111827">B Runtime Probe</text>
        <rect x="300" y="108" width="320" height="14" rx="3" fill="#2563EB"></rect>
        <rect x="300" y="126" width="320" height="14" rx="3" fill="#7C3AED"></rect>
        <text x="286" y="168" text-anchor="end" font-size="12.5" font-weight="600" fill="#111827">C Silent Answer</text>
        <rect x="300" y="154" width="160" height="14" rx="3" fill="#2563EB"></rect>
        <rect x="300" y="172" width="320" height="14" rx="3" fill="#7C3AED"></rect>
        <text x="286" y="214" text-anchor="end" font-size="12.5" font-weight="600" fill="#111827">D1 Document</text>
        <rect x="300" y="200" width="80" height="14" rx="3" fill="#2563EB"></rect>
        <rect x="300" y="218" width="80" height="14" rx="3" fill="#7C3AED"></rect>
        <text x="286" y="260" text-anchor="end" font-size="12.5" font-weight="600" fill="#111827">D2 Surface Event</text>
        <rect x="300" y="246" width="160" height="14" rx="3" fill="#2563EB"></rect>
        <rect x="300" y="264" width="240" height="14" rx="3" fill="#7C3AED"></rect>
        <text x="286" y="306" text-anchor="end" font-size="12.5" font-weight="600" fill="#111827">D3 Re-Activate</text>
        <rect x="300" y="292" width="640" height="14" rx="3" fill="#2563EB"></rect>
        <rect x="300" y="310" width="640" height="14" rx="3" fill="#7C3AED"></rect>
        <text x="300" y="342" font-size="12" font-weight="600" fill="#DC2626">Both Lenses Independently Said: Split This One Out</text>
      </svg>

Totals are not directly comparable, and that is worth being precise about. The systems lens gave **22 points, roughly 9–10 engineer-days including the re-activation feature**. The SRE lens gave **about 5.75 engineer-days explicitly excluding it**, on the grounds that an unscoped feature should not be inside a total that someone might commit to a sprint. Strip re-activation from both and they land within about a day and a half of each other.

### Where They Converged

Three structural calls, reached independently. That is the useful signal.

Split the assisted re-activation out

Both rated it 8 points — the "split it" value on the scale — and both said the same thing about why: bundling a new feature with a documentation task means the whole ticket blocks on its hardest fraction. One framed the risk as restarting a collective rendezvous after a hard process exit, with socket reuse and stale rank state unproven. The other framed it as needing a sleep-aware reachability precheck, since these machines sleep and "the same node set as last time" may not all be awake. Different reasons, same verdict.

Do not ship the refusal behaviour with the observability fix

Bug C offered three designs: response headers, a health-endpoint role field, or having a non-coordinator refuse requests outright with a redirect. Both lenses said the first two are additive and near-zero risk, and the third is a breaking behaviour change wearing an observability costume. One added the sharper point: a future implementer will pick the refusal precisely because it looks like the most complete option.

Do not build a general Unicode slugifier

The reported failure is one specific naming pattern. The operating system already computes a sanitised host name for exactly this purpose. Both said: prefer that value, treat any general-purpose slugify as a narrow fallback, and do not invite emoji and non-Latin edge cases that nobody reported.

Three independent agreements on scope, from two angles that share no vocabulary, is a stronger signal than either estimate's arithmetic. All three were things the original tickets got wrong.

### Where They Split

Two disagreements. In both cases one side was simply better informed.

**Bug A — is there a migration problem?**

The systems lens priced in a migration risk: node IDs are persisted in deployment records, so changing how they are derived could make a stored rank point at a different physical host. The SRE lens said flatly that no migration is needed, because _activation rejects invalid IDs before anything is persisted_ — a bad ID could never have reached the stored record in the first place.

That is correct, and it is the sharper observation. But it does not fully dispose of the concern. The risk is not about previously-invalid IDs; it is about previously-_valid_ ones. A machine that was manually renamed already has a valid ID today, and switching the derivation to prefer a different name source could yield a different valid ID tomorrow. Both are right about different inputs. The resolution both would accept: never silently remap — force the change through the existing content-hash approval gate, which is loud, safe and already built.

**Bug C — 3 points or 5?**

The systems lens called it mostly plumbing, on the assumption that role and deployment-membership state already exists and just needs exposing. The SRE lens priced the hard part explicitly: correctly distinguishing "enrolled as a non-coordinator in an active deployment" from "standalone node that was never part of one". Without that distinction, any refusal behaviour breaks people deliberately running nodes standalone.

Having gone looking, I could find no membership signal on the worker side at all. The higher estimate is the better grounded one, and it is higher precisely because it questioned an assumption rather than inheriting it.

### Blind Spot One: Fluent Wrong Answers

Seen only by the systems lens. The most severe item in the whole set.

Rank assignment is a coordination artifact. The collective library does not validate it semantically. There is no runtime check that the weights resident on rank 2 are actually shard 2.

<aside class="callout callout--err"><strong class="callout__title">The failure mode</strong><div class="callout__body"><p>
      If a node-ID change or a plan replay ever binds a stored shard to a different physical host than
      the one approved, the collectives will run happily across the wrong topology. The model does not
      crash. It produces <strong>fluent, confident, wrong tokens</strong>.
    </p></div></aside>

That single observation reclassifies bug A. It looked like a cosmetic validator complaint about a curly apostrophe. It is actually the entry point to a silent-corruption path, and it is the reason any ambiguity in ID derivation has to fail loudly through the approval gate rather than being reconciled cleverly.

The same lens flagged a second one, out of scope but adjacent: fixing the runtime probe restores the check that a peer _has_ the runtime, but nothing verifies that peers agree on library _versions_. Two ranks on mismatched builds in a ring collective can corrupt results or hang, rather than failing with a clean version-mismatch error.

### Blind Spot Two: Fixing The Symptom Leaves The Gap

Seen only by the SRE lens. Changes what "done" means for bug B.

Bug B has an obvious fix: teach interpreter discovery about the file the product actually ships. That removes the false "runtime not installed" verdict and stops the dashboard flapping.

It does nothing about the design underneath. A peer that is genuinely asleep or offline still gets hit on a ten-second timer by every open dashboard tab, because health is evaluated on demand with no cache and no backoff. Fixing the discovery bug removes the _visible_ symptom and leaves the cost in place — which is the ideal conditions for the work to be quietly dropped.

Two Problems Wearing One Symptom

<svg viewBox="0 0 960 250" role="img" aria-label="One visible symptom traced back to two independent causes, only one of which the obvious fix addresses">
        <defs>
          <marker id="a1" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
            <path d="M0,1 L8,4.5 L0,8 z" fill="#4B5563"></path>
          </marker>
          <path id="m1" d="M300,74 L392,74"></path>
          <path id="m2" d="M300,176 L392,176"></path>
        </defs>
        <rect x="24" y="46" width="276" height="56" rx="8" fill="#FFFFFF" stroke="#DC2626" stroke-width="2"></rect>
        <text x="162" y="70" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Cause One</text>
        <text x="162" y="90" text-anchor="middle" font-size="12" fill="#4B5563">Discovery Misses The Shipped File</text>
        <rect x="24" y="148" width="276" height="56" rx="8" fill="#FFFFFF" stroke="#D97706" stroke-width="2"></rect>
        <text x="162" y="172" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Cause Two</text>
        <text x="162" y="192" text-anchor="middle" font-size="12" fill="#4B5563">No Health Cache, No Backoff</text>
        <line x1="300" y1="74"  x2="392" y2="74"  stroke="#4B5563" stroke-width="2" marker-end="url(#a1)"></line>
        <line x1="300" y1="176" x2="392" y2="176" stroke="#4B5563" stroke-width="2" marker-end="url(#a1)"></line>
        <circle r="4" fill="#2563EB"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#m1"></mpath></animateMotion></circle>
        <circle r="4" fill="#2563EB"><animateMotion dur="2s" begin="1s" repeatCount="indefinite"><mpath href="#m2"></mpath></animateMotion></circle>
        <rect x="396" y="97" width="240" height="56" rx="8" fill="#1a1a3e" stroke="#2563EB" stroke-width="2"></rect>
        <text x="516" y="121" text-anchor="middle" font-size="12.5" font-weight="600" fill="#F9FAFB">One Visible Symptom</text>
        <text x="516" y="141" text-anchor="middle" font-size="12" fill="#CBD5E1">Dashboard Flapping</text>
        <circle cx="516" cy="125" r="40" fill="none" stroke="#2563EB" stroke-width="2" opacity="0">
          <animate attributeName="r" values="40;92" dur="2.8s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".45;0" dur="2.8s" repeatCount="indefinite"></animate>
        </circle>
        <line x1="636" y1="125" x2="716" y2="125" stroke="#4B5563" stroke-width="2" marker-end="url(#a1)"></line>
        <text x="676" y="114" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">Obvious Fix</text>
        <rect x="720" y="60" width="216" height="52" rx="8" fill="#F0FDF4" stroke="#16A34A" stroke-width="2"></rect>
        <text x="828" y="83" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Cause One Fixed</text>
        <text x="828" y="102" text-anchor="middle" font-size="12" fill="#4B5563">Symptom Disappears</text>
        <rect x="720" y="140" width="216" height="52" rx="8" fill="#FEF2F2" stroke="#DC2626" stroke-width="2"></rect>
        <text x="828" y="163" text-anchor="middle" font-size="12.5" font-weight="600" fill="#111827">Cause Two Remains</text>
        <text x="828" y="182" text-anchor="middle" font-size="12" fill="#4B5563">And Now Invisible</text>
        <text x="480" y="228" text-anchor="middle" font-size="12.5" fill="#4B5563">A Fix That Hides Its Sibling Is Worse Than One That Does Not</text>
      </svg>

### Doing The Poll Maths

The number I had read as noise turned out to be a load statement.

I had counted 297 failed probes in one log and treated it as a count. The SRE reading turned it into a rate: at a ten-second cadence, 297 failures is roughly **fifty minutes of continuous failure**, from one dashboard tab on a two-node cluster. It scales with node count and with open tabs, because each poll fans out to every peer.

Then the part I had not considered at all — what each probe actually costs:

-   Each probe is a full remote session: authentication, shell initialisation, and a subprocess spawned to hunt for an interpreter. Tens to low hundreds of milliseconds, not the sub-millisecond fabric latency elsewhere in the system.
-   **That overhead runs on the machine being monitored**, competing for CPU with the inference process — on the 8 GB node, the smaller of the two.
-   Authentication log entries accumulate on every peer at that rate, adding noise an operator has to filter past while debugging something unrelated.

<aside class="callout callout--warn"><strong class="callout__title">The expensive cost is not CPU</strong><div class="callout__body"><p>
      Continuous flapping trains an operator to distrust the alert. That is precisely the mechanism by
      which a real outage later gets waved off as "probably that bug again". The monitoring system was
      loading the thing it monitored and eroding trust in its own signal at the same time.
    </p></div></aside>

One caveat on my own arithmetic: 297 is the total across the whole log file. The window I actually observed directly spanned a few minutes. The fifty-minute figure assumes a constant cadence across the file, which is a reasonable inference but not something I measured end to end.

### What Changed As A Result

Four tickets went in. Four things about them were wrong.

| Ticket | What the reviews changed |
| --- | --- |
| **A** | Reframed from a validator nit to the entry point of a silent-corruption path. Two "candidate fixes" collapsed to one preferred source with a narrow fallback. Migration framing dropped in favour of failing loudly through the existing approval gate. |
| **B** | Split conceptually in two: the discovery fix, and the health-cache and backoff work that must be ticketed separately so it does not vanish when the flapping stops. |
| **C** | Acceptance criteria narrowed to the two additive designs. Estimate raised, because the hard part is distinguishing an enrolled non-coordinator from a standalone node — and no membership signal appears to exist. |
| **D** | Split into three. Documentation is a quarter-day. Event surfacing is a day and depends on B's plumbing. Assisted re-activation is an unscoped feature that should never have shared a ticket with a writing task. |

The totals were the least interesting output. What the two lenses were actually good for was catching what the other could not see: one found a path to confidently wrong answers hiding inside a typography bug, the other found that the obvious fix would conceal its own sibling. Neither found both. A single reviewer, however senior, would have shipped with one of those two still in the backlog and no idea it was there.

<aside class="callout"><strong class="callout__title">The cheap version of this</strong><div class="callout__body"><p>
      Two perspectives on the same backlog, briefed identically, with no contact between them. Where
      they agree, trust it. Where they disagree, one of them usually knows something the other does not
      — and finding out which is faster than re-deriving the answer yourself.
    </p></div></aside>
