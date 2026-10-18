---
title: "Hot RAM, Cold SSD: How oMLX's Tiered KV Cache Makes an 8 GB Mac Act Bigger"
date: 2026-10-18
description: "oMLX persists its KV cache as 256-token blocks in safetensors on SSD, restored instead of recomputed — even across a restart. Where the tiered cache actually helps, and how mlx-serve's opt-in SSD tier compares."
tags: [mlx, llm, inference, macos]
draft: false
---

Architecture Deep Dive

On a Mac with unified memory, the KV cache competes directly with the model weights for the same finite pool. oMLX's answer is a paged, block-based cache that keeps hot blocks in RAM and spills the rest to SSD as safetensors — restored on the next matching request instead of recomputed, and still warm after a server restart. Here is how it is built, where it actually pays off, and how mlx-serve's opt-in SSD tier compares.

2026-10-18 oMLX · KV cache · Apple Silicon paged cache safetensors prefix sharing

256

tokens per cache block — the unit of hashing, sharing and SSD persistence

2

tiers: a hot in-RAM pool over a cold SSD store of safetensors blocks

on

by default — the SSD tier needs no flag; the hot RAM tier defaults to off

auto

SSD budget: half of free disk + existing cache, refreshed as it grows

## 01 · Why Two Tiers

The KV cache is the thing that makes a long conversation fast, and on Apple Silicon it is also the thing most likely to evict your model weights. Tiering is how you get both.

Every token the model has already attended to leaves behind a key and a value tensor — the KV cache. Reusing those on the next token is what turns attention from O(n²) recompute into a linear scan. But the cache grows with context, and on a Mac the GPU has no dedicated VRAM: the cache, the weights, and the OS all draw from one pool of unified memory. Let the cache grow unbounded and you push the weights out, or hit the memory guard, and the server stalls or OOMs.

Paged caching, borrowed from vLLM's playbook, is the first half of the fix: chop the cache into fixed blocks and manage them individually rather than as one growing tensor. Tiering is the second half. Blocks that are still being touched stay resident in RAM. Blocks that belong to a finished turn, or a stale branch of the conversation, are written out to SSD and forgotten until something asks for them again.

The core promise. When the next request shares a prefix with something already cached — the same system prompt, the same file tree, the same earlier turns — the matching blocks are read back from disk rather than recomputed. Recomputing a 7,000-token prefill costs real seconds of time-to-first-token; reading it back costs a disk seek. And because the blocks live in files, that warm state outlives the process that wrote it.

## 02 · Anatomy of a Block

A block is 256 tokens and a content-addressed hash. That hash is what lets the cache find, share and deduplicate blocks without ever comparing tensors.

The cache lives in `omlx/cache/` and is built from three cooperating pieces. `PagedCacheManager` owns the block table and the allocator. `PagedSSDCacheManager` owns serialization to disk. `BlockAwarePrefixCache` sits on top and does the prefix matching — it is the only cache kind oMLX supports.

Each block's identity is a hash over its token ids and its parent's hash — a rolling, chain-style fingerprint. Two requests that share their first N tokens will produce identical block hashes for that prefix, no matter when they ran. That single property is what makes prefix sharing, copy-on-write, and SSD reuse all fall out of the same mechanism.

| Piece | Owns | Module |
| --- | --- | --- |
| Paged block manager | Block table, allocator, per-block KV slices | paged_cache.py |
| SSD tier | Safetensors read/write, hash-keyed subdirs, LRU budget, startup scan | paged_ssd_cache.py |
| Prefix cache | Block-hash prefix matching, copy-on-write, boundary snapshots | prefix_cache.py |
| Non-sliceable state | Rotating windows, GDN/recurrent, pooling members stored at block boundaries | boundary_snapshot_store.py |

Blocks are stored one safetensors file each, under hash-prefixed subdirectories so the on-disk tree stays shallow even at hundreds of thousands of blocks. A startup scan walks those directories and re-indexes what it finds — which is how a restart comes back warm.

## 03 · Save, Restore, Survive

The lifecycle is where the two tiers meet: blocks flow down to SSD as they cool, and back up into RAM when a request matches them — including a request that arrives after the server was restarted.

<svg viewBox="0 0 820 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A request checks the hot RAM tier first; on a miss the cold SSD tier restores matching 256-token blocks; on a miss in both, only the missing suffix is prefilled">
          <defs>
            <marker id="arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="0" y="0" width="820" height="320" fill="#FFFFFF"></rect>
          <text x="410" y="42" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#111827">A Matching Prefix, Restored Not Recomputed</text>
          <rect x="30" y="128" width="150" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="105" y="154" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">New request</text>
          <text x="105" y="174" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">shared prefix</text>
          <rect x="240" y="66" width="190" height="76" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
          <circle cx="335" cy="86" r="4" fill="#2563EB"></circle>
          <circle cx="335" cy="86" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
            <animate attributeName="r" values="4;11" dur="1.8s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"></animate>
          </circle>
          <text x="335" y="112" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Hot tier · RAM</text>
          <text x="335" y="132" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">resident blocks</text>
          <rect x="240" y="196" width="190" height="76" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="335" y="222" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Cold tier · SSD</text>
          <text x="335" y="242" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">~/.omlx/cache · safetensors</text>
          <rect x="560" y="66" width="220" height="76" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="670" y="92" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Prefill missing suffix</text>
          <text x="670" y="112" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">only the new tokens</text>
          <rect x="560" y="196" width="220" height="76" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="670" y="222" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Blocks promoted to RAM</text>
          <text x="670" y="242" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">hot path for next turn</text>
          <path d="M180,152 H210 V104 H236" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M210,152 V234 H236" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M430,104 H495 V104 H556" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M430,234 H495 V234 H556" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <text x="210" y="98" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#4B5563">hit</text>
          <text x="216" y="270" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="#4B5563">miss → SSD</text>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M180,152 H210 V104 H236"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" begin="0.7s" repeatCount="indefinite" path="M210,152 V234 H236"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" begin="1.2s" repeatCount="indefinite" path="M430,104 H495 V104 H556"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" begin="1.7s" repeatCount="indefinite" path="M430,234 H495 V234 H556"></animateMotion></circle>
        </svg>

Lookup walks the tiers top-down: RAM first, SSD on a miss, and only the genuinely new suffix is ever computed. Matched blocks are promoted back to the hot tier for the next turn.

Three moments matter. When a block cools, it is serialized to its safetensors file and evicted from RAM by the byte budget. When a request matches a prefix, the corresponding blocks are loaded back — into RAM if the hot tier is on, or referenced directly from disk. And when the server starts, the SSD store is scanned so the index knows what is already on disk before the first request arrives.

The write-through option ties the tiers together: with it enabled, every saved block is kept in RAM and persisted to SSD immediately, giving RAM-speed resume for recent sessions without giving up SSD durability for old ones.

## 04 · Where It Helps

The tiered cache is not a universal speedup — it is a targeted one. These are the workloads where it earns its disk space.

1

Faster TTFT on repeated and shared prefixes

The primary benefit. A matching block-hash prefix is restored from disk instead of recomputed, so the prefill cost of a repeated system prompt or file tree drops toward zero. This is the mechanism behind cache-fed prefill numbers.

2

Warm cache survives a restart

The startup scan re-indexes the on-disk store, so a server that crashed or was restarted comes back able to restore prefixes it cached before the restart — the prefill work was not thrown away with the process.

3

Effective cache larger than GPU memory

Blocks that would not fit in the resident pool can live on SSD. On an 8 GB Mac where the weights already claim most of unified memory, this is the difference between holding a long session and thrashing.

4

Prompt-heavy agentic and long-context coding

The workload the cache is sized for: a coding agent that re-sends the same growing context every turn. Each turn's prefill is mostly a cache hit on the previous turn's blocks, with only the new tool output computed.

5

State that cannot be sliced cleanly

Rotating windows, recurrent GDN state and pooling members are not simple per-token arrays. The boundary snapshot store exists precisely so these, too, can be persisted and restored at block boundaries rather than rebuilt.

6

Cluster-safe prefix reuse

In a pipeline-parallel deployment, a boundary restore has to be agreed by every rank. The design elects an all-ranks vote so a failed disk write cannot silently desync the pipeline — the cluster store mirrors the local policy on purpose.

Where it does not help. A cold, unique prompt every time — the exact condition the benchmark used to keep its prefill numbers honest — never hits the cache, so the tiering buys nothing on that workload. The cache is an investment that pays off on repetition, not on first-contact throughput.

## 05 · Turning the Dials

The SSD tier is on out of the box. The hot RAM tier is not. Both are configurable from the CLI or the admin panel, with the CLI taking precedence.

```bash
# Point the SSD tier at a directory (default: ~/.omlx/cache)
omlx serve --model-dir ~/models --paged-ssd-cache-dir ~/.omlx/cache

# Size the hot in-RAM tier (default: 0 = disabled, e.g. "8GB" or "20%")
omlx serve --model-dir ~/models --hot-cache-max-size 20%

# Fixed SSD budget instead of the default "auto"
omlx serve --model-dir ~/models --paged-ssd-cache-max-size 20GB
```

| Setting | Default | Meaning |
| --- | --- | --- |
| ssd_cache_dir | ~/.omlx/cache | Where cold blocks are written as safetensors |
| ssd_cache_max_size | auto | Half of free disk + existing cache; refreshed as it grows, never shrinks on restart |
| hot_cache_max_size | 0 (off) | RAM budget for the hot tier; a percentage or a byte size |
| hot_cache_write_through | false | Keep saved blocks in RAM and persist to SSD immediately |
| initial_cache_blocks | 256 | Starting block count; the pool grows dynamically from there |

The default that surprises people. `auto` is not a fixed cap — it reserves half the sum of free disk space and the cache files already on disk, and the budget is refreshed during use. It does not shrink just because the cache grew or the server restarted. Set an explicit `--paged-ssd-cache-max-size` if you want a predictable ceiling.

## 06 · Does mlx-serve Have It?

Yes — mlx-serve also has a two-tier (RAM + SSD) prefix cache. Structurally it is the same idea, but the defaults differ in a way that matters for any head-to-head comparison.

mlx-serve's prefix cache is configured with three flags: a RAM tier sized in KV bytes, an LRU entry capacity, and an SSD tier that persists under `~/.mlx-serve/kv-cache` and is restored across restarts and RAM evictions. A separate `--ssm-checkpoint-stride` handles the hybrid-model case, letting a request sharing a prefix restore mid-prompt instead of re-prefilling.

| Behavior | oMLX | mlx-serve |
| --- | --- | --- |
| Two-tier (RAM + SSD) | yes | yes |
| SSD tier default | on | off (opt-in) |
| SSD location | ~/.omlx/cache | ~/.mlx-serve/kv-cache |
| Persistence across restart | yes | yes |
| Block granularity | 256 tokens | prefix-level LRU |
| Cluster-aware restore | yes (all-ranks vote) | not applicable |

The benchmark caveat. In the oMLX vs mlx-serve run, mlx-serve was launched without `--prefix-cache-disk`, so its SSD tier was off — it ran RAM-tier only — while oMLX had its SSD tier active. Both engines have the feature; only one had it enabled on the day. Any "cache" number from that run should be read with that asymmetry in mind.

## 07 · What Breaks (and the Fixes)

Four things to know before trusting a tiered cache with your time-to-first-token.

1

A cache hit is a different measurement than a cold prefill

A prefill served from restored blocks is not the cost of processing those tokens. Reporting it as throughput quietly inflates the number.

FIX — send a unique prefix per measurement when you want honest prefill cost; treat cache-fed numbers as a separate, explicitly-labelled metric.

2

The auto budget is not a fixed size

Relying on `auto` to bound disk use is a mistake — it tracks free space and grows with the cache rather than capping it.

FIX — set `--paged-ssd-cache-max-size` explicitly on any node where predictable disk use matters.

3

The hot tier is off by default

New installs get the SSD tier but no RAM tier, so the fastest path — a resident block — is not active until you size `hot_cache_max_size`.

FIX — if recent-session resume matters, set a hot budget and consider write-through so blocks are both resident and durable.

4

Not every cache member slices per token

Rotating windows, recurrent state and pooling features cannot be stored as clean per-token arrays, so a naive per-block scheme would drop them.

FIX — the boundary snapshot store persists these at block boundaries; make sure the model's cache path routes through it rather than the plain prefix path.

## 08 · Takeaways

| Tiering is how 8 GB acts bigger | Paged blocks over a hot-RAM/cold-SSD split let the cache exceed the resident pool without evicting the weights — the whole reason it exists on unified memory. |
| --- | --- |
| One hash does it all | A rolling block hash is simultaneously the key for prefix matching, copy-on-write sharing and SSD dedup. No tensor comparisons anywhere. |
| Warmth outlives the process | Because blocks are files and startup re-indexes them, a restart does not cost you your prefill work. |
| It pays on repetition only | Unique cold prompts never hit it. Measure cold to be honest, measure warm to be realistic — and label which is which. |
| Defaults differ between engines | oMLX ships the SSD tier on; mlx-serve's is opt-in. A comparison that ignores the flags compares configurations, not features. |

Read alongside the benchmark. The cache-fed prefill numbers in the [oMLX vs mlx-serve benchmark](../2026-10-17-omlx-vs-mlx-serve-benchmark/2026-10-17-omlx-vs-mlx-serve-benchmark.html) are this mechanism in action — and the reason the harness used unique prompts to defeat it. The other half of that story, why oMLX's speculative decoding stayed idle, is in the [speculative-decoding deep-dive](../2026-10-18-omlx-speculative-decoding/2026-10-18-omlx-speculative-decoding.html).
