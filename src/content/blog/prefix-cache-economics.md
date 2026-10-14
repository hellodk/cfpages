---
title: "92% Cached: The Economics That Let One Mac Serve 12x More Coding Agents"
date: 2026-08-24
description: "A public benchmark showed 92% of coding-agent tokens were served from cache — a 12.5x cost difference. A teardown of oMLX's prefix cache, the six gaps in it, and the three ceilings that decide how many agents one machine can serve."
tags: [llm, inference, caching, agents, apple-silicon]
cover: "assets/images/covers/prefix-cache-economics.svg"
draft: false
---

Inference Economics

One public benchmark — 92% of tokens served from cache — is all it takes to reframe local LLM sizing. Here is why agent traffic is the most cacheable workload there is, what a two-node Mac mini cluster already does right, where it leaks hit rate, and the math that turns a hit rate into a request budget.

hellodk24 Aug 2026 prefix cachingKV cacheApple Siliconcoding agents

92%

of agent tokens served from prefix cache in the referenced benchmark

12.5x

cheaper per token than a general-purpose workload (1 ÷ 0.08)

~1.9 → ~22

req/min sustained on one node: no cache vs the tweet's 92% workload

3

independent ceilings — prefill, decode, KV-RAM — that bound throughput

### 01 · The Tweet That Reframed Cluster Sizing

Most LLM cost discussions start at model price. This one starts with a counter.

dx

@thdxr · dax

Oct 20, 2025

> “some interesting data from our big pickle test — 92% of tokens were cached, this means our GPUs only had to process 8% of tokens. coding agents produce highly cacheable workloads – so our costs are 12.5x cheaper than a general purpose one”

The arithmetic is the point: 12.5x = 1 ÷ 0.08. Only the uncached 8% ever pays full prefill cost.

The claim isn't about a smarter model or faster silicon. It is a statement about **workload shape**: if nearly every token a client sends has been seen before, then nearly every token is free to process — you pay only for the delta. Cost stops scaling with conversation length and starts scaling with novelty. For anyone running inference — cloud GPUs billed per token, or a home lab of Mac minis — that ratio changes what hardware can absorb.

### 02 · Why Coding Agents Are So Cacheable

An agent turn doesn't send a question. It re-sends a world state, plus a tiny append.

Every turn of a coding-agent session ships the same growing payload: the system prompt, the full tool definitions, the accumulated file context, and the entire conversation history — then appends a small delta (one tool result, one model reply). Turn N contains turn N−1 as a strict prefix. A prefix cache turns that structure into an asset:

-   **System prompt + tool definitions** — identical across every call of every session using that agent.
-   **File context and history** — grows by append, never rewritten, so earlier blocks stay valid forever.
-   **The delta** — often a few hundred tokens against a 100k-token prefix: a few percent of the bill.

<svg viewBox="0 0 800 260" role="img" aria-label="Token anatomy of four agent turns: each turn resends the previous prefix as cached blocks and appends a small new delta">
          <rect x="0" y="0" width="800" height="260" fill="#FFFFFF"></rect>
          <text x="400" y="34" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Token Anatomy Of Four Agent Turns (Schematic)</text>
          <text x="24" y="76" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">Turn 1</text>
          <rect x="96" y="58" width="600" height="26" rx="4" fill="#2563EB"></rect>
          <text x="396" y="76" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">New Prompt — Full Prefill Cost</text>
          <text x="706" y="76" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">100% New</text>
          <text x="24" y="116" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">Turn 2</text>
          <rect x="96" y="98" width="500" height="26" rx="4" fill="#1a1a3e" stroke="#2563EB" stroke-width="1">
            <animate attributeName="opacity" values="1;0.85;1" dur="3s" repeatCount="indefinite"></animate>
          </rect>
          <text x="346" y="116" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Cached Prefix</text>
          <rect x="596" y="98" width="100" height="26" rx="4" fill="#2563EB"></rect>
          <text x="706" y="116" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">+5% New</text>
          <text x="24" y="156" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">Turn 3</text>
          <rect x="96" y="138" width="545" height="26" rx="4" fill="#1a1a3e" stroke="#2563EB" stroke-width="1">
            <animate attributeName="opacity" values="1;0.85;1" dur="3s" begin="0.5s" repeatCount="indefinite"></animate>
          </rect>
          <text x="369" y="156" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Cached Prefix</text>
          <rect x="641" y="138" width="55" height="26" rx="4" fill="#2563EB"></rect>
          <text x="706" y="156" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">+3% New</text>
          <text x="24" y="196" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">Turn 4</text>
          <rect x="96" y="178" width="575" height="26" rx="4" fill="#1a1a3e" stroke="#2563EB" stroke-width="1">
            <animate attributeName="opacity" values="1;0.85;1" dur="3s" begin="1s" repeatCount="indefinite"></animate>
          </rect>
          <text x="384" y="196" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF">Cached Prefix</text>
          <rect x="671" y="178" width="25" height="26" rx="4" fill="#2563EB"></rect>
          <text x="706" y="196" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#4B5563">+1% New</text>
          <rect x="96" y="222" width="14" height="14" rx="3" fill="#1a1a3e" stroke="#2563EB" stroke-width="1"></rect>
          <text x="118" y="233" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">Cached Prefix (Re-Sent Each Turn, Not Recomputed)</text>
          <rect x="480" y="222" width="14" height="14" rx="3" fill="#2563EB"></rect>
          <text x="502" y="233" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">New Tokens (Prefill Cost)</text>
        </svg>

Bar widths are schematic. The pattern is real: each turn re-sends everything and adds a sliver.

A general-purpose workload — unrelated chat sessions landing cold — looks nothing like this. Same GPUs, different traffic shape, **12.5x** different economics. Which raises the practical question for a self-hosted setup: does my inference stack actually capture this?

### 03 · Case Study: What oMLX Already Does Right

[oMLX](https://github.com/jundot/omlx) is Apache-2.0 local LLM inference for Apple Silicon. I run it on a personal two-node Mac mini cluster linked over WiFi + Thunderbolt bridge — and its cache design already earns a large slice of the tweet's economics.

| Capability | Where | What it buys |
| --- | --- | --- |
| **Chained content-addressed block hashes** | omlx/cache/paged_cache.py | vLLM-style paged blocks (256 tokens) hashed and chained — a prompt matches wherever its blocks match, so mid-prompt prefix reuse works without exact full-prompt hits. |
| **Two-tier cache** | RAM hot tier + SSD cold tier | Paged SSD tier under a 100GB cap keeps evicted prefixes restorable — warm context survives longer than RAM alone would allow. |
| **Cluster-level cache-aware router** | omlx/cluster/cache_aware_scheduler.py | Scores nodes by prefix-hash overlap, so requests drift toward whichever node already holds their context. |
| **Cache observability** | PrefixCacheStats | tokens_saved, exact hits, partial-block skips — the raw material for exactly the measurement behind the tweet. |
| **Scheduling depth** | max_num_seqs = 256 | Chunked prefill, decode-fairness scheduling, memory-guard watermarks — batch machinery ready to exploit whatever the cache saves. |

This is not a toy: content-addressed chaining, tiering, overlap routing and stats are the same architectural moves as production vLLM deployments. But auditing it against agent workloads surfaced six places where hit rate still leaks.

### 04 · Six Gaps Between Here and 92%

The improvement backlog, ordered roughly by leverage on a small cluster.

1

No session stickiness

New conversations round-robin across nodes. The next turn has a ~50% chance of landing on the node without the warm prefix — on a 2-node cluster this is the single biggest lever, and it halves effective hit rate before any other tuning matters.

Fix: TTL-based session→node pinning, overlap scoring as tiebreak for new sessions.

2

FCFS admission ignores the cache

The queue admits strictly first-come-first-served. Sorting by prefix overlap before admission batches requests that share prefixes together and raises hit rate for free — this is standard vLLM v1 behavior.

Fix: opt-in CACHE\_AWARE scheduling policy ordering admission by matched-block count.

3

256-token blocks waste up to 255 tokens per branch point

Agent conversations branch constantly — parallel tool calls fork from one shared prefix — and every fork discards the unfilled tail of its last shared block. At 256 tokens that is up to 255 wasted prefill tokens per branch.

Fix: selectable block-size profiles; default agent/coding profiles to 64-token blocks.

4

Overlap-only routing ignores load

The router picks max overlap regardless of queue depth. Under bursty traffic the best-overlap node is often the busiest, trading a cache hit for queue delay.

Fix: score = overlap minus a load penalty (queue depth, active seqs), with a tunable weight.

5

No per-client cache economics

tokens\_saved exists but isn't surfaced per API key or session. The tweet is fundamentally a measurement — you can't tune routing, block size, or pricing per workload when cacheability is only visible as one global counter.

Fix: per-key hit-rate and tokens-saved time series in the admin dashboard, plus a cluster rollup.

6

fp16 KV in the hot tier

Resident prefix capacity is bounded by KV bytes. Dropping hot-tier KV to 8-bit doubles the number of resident 100k-token agent contexts on the same RAM.

Fix: opt-in 8-bit KV quantization with a documented quality delta.

### 05 · The Three Ceilings: From Hit Rate to Request Budget

Hit rate is an input. Throughput is a minimum. Sustained request rate R is capped by whichever ceiling binds first.

| Ceiling | Inequality | Meaning |
| --- | --- | --- |
| **Prefill** | R × P × (1−h) ≤ PP_batched | Uncached prompt tokens must fit in the batched prefill budget. P = prompt tokens, h = hit rate. This is the ceiling caching attacks directly. |
| **Decode** | R × O ≤ TG_batched | Every request still generates O output tokens one at a time. Caching does nothing here — decode is paid in full on every request. |
| **KV-RAM** | streams ≤ KV_budget ÷ bytes/token | Concurrent streams must fit resident KV. On memory-constrained machines this binds before compute does. |

### Worked example — reference bench fixture

44GB model on a 128GB machine; batched prefill PP = 3,100 tok/s; decode TG = 180 tok/s at batch 4. Agent turn shape: P = 100,000 prompt tokens, O = 500 output tokens.

| Scenario | Hit Rate | Sustained Rate | Binding Ceiling |
| --- | --- | --- | --- |
| No cache | 0% | **~1.9 req/min** | Prefill — 3,100 tok/s ÷ 100k tokens/request |
| Tweet workload | 92% | **~22 req/min** | Decode + prefill co-bound — both land near 22 |
| Tuned: 95% hit + larger decode batch | 95% | **~30–48 req/min** | Decode aggregate — the remaining wall |

<svg viewBox="0 0 760 320" role="img" aria-label="Sustained request rate equals the minimum of three ceilings: prefill, decode, and KV-RAM">
          <rect x="0" y="0" width="760" height="320" fill="#FFFFFF"></rect>
          <circle cx="380" cy="278" r="18" fill="none" stroke="#2563EB" stroke-width="2" opacity="0.5">
            <animate attributeName="r" values="18;36" dur="2.5s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.5;0" dur="2.5s" repeatCount="indefinite"></animate>
          </circle>
          <text x="380" y="40" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">R = MIN(Prefill Ceiling, Decode Ceiling, KV-RAM Ceiling)</text>
          <rect x="44" y="60" width="216" height="72" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="152" y="82" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Prefill Ceiling</text>
          <text x="152" y="102" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" font-weight="600" fill="#111827">R×P×(1−H) ≤ PP</text>
          <text x="152" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">Prefill Tok/s Budget</text>
          <rect x="272" y="60" width="216" height="72" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="380" y="82" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Decode Ceiling</text>
          <text x="380" y="102" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" font-weight="600" fill="#111827">R×O ≤ TG</text>
          <text x="380" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">Decode Tok/s Budget</text>
          <rect x="500" y="60" width="216" height="72" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="608" y="82" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">KV-RAM Ceiling</text>
          <text x="608" y="102" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" font-weight="600" fill="#111827">Streams ≤ KV ÷ B/tok</text>
          <text x="608" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">Resident Context Limit</text>
          <line x1="152" y1="132" x2="152" y2="170" stroke="#4B5563" stroke-width="1.5"></line>
          <polygon points="147,170 157,170 152,176" fill="#4B5563"></polygon>
          <line x1="380" y1="132" x2="380" y2="170" stroke="#4B5563" stroke-width="1.5"></line>
          <polygon points="375,170 385,170 380,176" fill="#4B5563"></polygon>
          <line x1="608" y1="132" x2="608" y2="170" stroke="#4B5563" stroke-width="1.5"></line>
          <polygon points="603,170 613,170 608,176" fill="#4B5563"></polygon>
          <rect x="44" y="176" width="672" height="40" rx="8" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
          <text x="380" y="201" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">R = Min Of The Three Ceilings</text>
          <line x1="380" y1="216" x2="380" y2="246" stroke="#4B5563" stroke-width="1.5"></line>
          <polygon points="375,246 385,246 380,252" fill="#4B5563"></polygon>
          <rect x="200" y="252" width="360" height="52" rx="8" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.5"></rect>
          <text x="380" y="273" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#111827">Same Silicon, ~12x More Agent Turns</text>
          <text x="380" y="292" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#4B5563">Caching Removes Prefill As The Bottleneck</text>
        </svg>

Raising hit rate pushes R off the prefill ceiling — until decode becomes the wall.

**The punchline:** caching doesn't speed up decode. It removes prefill as the bottleneck — so the same silicon absorbs ~12x more agent traffic, and the binding constraint migrates to decode throughput.

**Memory-constrained footnote:** on a 16GB Mac mini the KV-RAM ceiling binds first — concurrent streams run out of resident KV long before compute saturates. There, session stickiness and 8-bit KV quantization are worth more than raw batch scaling.

### 06 · Takeaways

-   **Coding agents are a cache-native workload.** Append-only prompts make 90%+ hit rates normal, not exceptional — the 92% figure is a property of the traffic, not the vendor.
-   **Cost models should be built on miss rate, not token count.** Price follows the 8% that misses, not the 100% that flows.
-   **Local clusters compete on cache architecture.** Content-addressed block hashing, two-tier storage, and overlap routing put a two-node Mac mini fleet in the same design space as production vLLM farms.
-   **The backlog is specific:** stickiness, cache-aware admission, smaller blocks for branching workloads, load-weighted routing, per-client economics, and KV quantization — six concrete levers between a working cache and the tweet's numbers.
-   **Measure like the tweet measures.** Hit rate per workload is the number that decides whether your cluster serves 2 agents or 24.
