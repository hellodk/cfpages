---
title: "Gated Off: Why oMLX's Speculative Decoding Sat Idle in the Benchmark"
date: 2026-10-18
description: "oMLX has three speculative-decoding mechanisms — Lightning MTP, DFlash and a prompt-lookup proposer — but for Qwen3.5-4B all of them were inert: the checkpoint ships no mtp.* weights and there is no model-agnostic fallback. The 12 places it does not engage."
tags: [mlx, llm, inference, debugging]
draft: false
---

Architecture Deep Dive

oMLX implements speculative decoding three different ways — a native MTP-head drafter, a block-diffusion drafter, and a prompt-lookup proposer — all sharing one draft-verify-rollback pipeline wired into the engine. And yet in the benchmark against mlx-serve, it decoded exactly one token per step. The machinery was there; the checkpoint was not. This is a tour of how it works, and the twelve quiet conditions under which it declines to engage.

2026-10-18 oMLX · speculative decoding · MTP draft-verify Qwen3.5 PLD

3

spec-decode mechanisms: Lightning MTP, DFlash drafter, prompt-lookup proposer

0

`mtp.*` tensors in the benchmark model — the gate that closed everything

on

mlx-serve's PLD by default — model-agnostic, no special weights needed

~5%

the decode gap that asymmetry produced in the benchmark

## 01 · The Idea

Generating one token at a time leaves the GPU under-fed: a single forward pass to produce a single token, most of the model's weights read for one token's worth of work. Speculative decoding fixes that by writing ahead and checking later.

A cheap drafter proposes the next k tokens. The expensive model then verifies all k in a single forward pass — the same pass that would have produced just one token anyway — accepting the longest correct prefix and discarding the rest. When the drafter is right more often than it is wrong, you get k tokens for the cost of one forward pass, and the output distribution is unchanged, because the target model still decides what is accepted.

The catch is entirely in the drafter. It must be far cheaper than the target, and it must be right often enough that verification is not wasted. oMLX's designs differ mainly in where the draft tokens come from.

## 02 · Three Mechanisms

All three live under `omlx/patches/mlx_lm_mtp/` and share one verify-and-rollback core. They differ in their drafter, and in what they need from the checkpoint.

| Mechanism | Draft source | Needs special weights? | Wired in |
| --- | --- | --- | --- |
| Lightning MTP | Native multi-token-prediction head fused with the backbone's hidden state | yes — `mtp.*` tensors + config heads | qwen35_model.py |
| DFlash | A separate block-diffusion drafter model | yes — a drafter checkpoint | drafter_target.py |
| VLM MTP | An assistant drafter through mlx-vlm | yes | gemma4_text_model.py |
| Prompt-lookup | n-gram matches from earlier context (their PLD analogue) | no — but only inside a live MTP chain | context_copy.py |

Lightning MTP is the flagship. The MTP head takes the backbone's pre-norm hidden state at position t and fuses it with the embedding of the token sampled at t+1, predicting t+2. Chained k times, that yields k draft tokens, verified together in one target forward. The draft-verify loop is folded directly into the batch generator's `next()` so the paged, prefix and SSD cache stack keeps working underneath it.

The fourth row is the important one. oMLX does have a prompt-lookup proposer — the same idea as mlx-serve's PLD, matching n-grams against earlier context to draft tokens for free. But it is not an independent path: it runs only inside an active MTP chain. With no MTP head loaded, there is nothing for it to attach to, and it never fires.

Not to be confused with SpecPrefill. `omlx/patches/specprefill.py` is a different feature — attention-based sparse prefill that uses a draft model to pick which tokens matter, to cut time-to-first-token. It is off by default and has nothing to do with decode-side speculation. Similar name, opposite end of the request.

## 03 · Draft, Verify, Roll Back

The shared core is a small, careful state machine. Draft k tokens, verify them in one pass, and — this is the hard part — cleanly undo whatever the target rejected, including the cache state.

<svg viewBox="0 0 820 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The drafter proposes k tokens, the target verifies them in one forward pass, accepted tokens commit and rejected tokens are rolled back from the KV cache">
          <defs>
            <marker id="arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#4B5563"></path>
            </marker>
          </defs>
          <rect x="0" y="0" width="820" height="300" fill="#FFFFFF"></rect>
          <text x="410" y="40" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="#111827">One Verify Pass, k Candidates</text>
          <rect x="30" y="120" width="150" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="105" y="146" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Drafter</text>
          <text x="105" y="166" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">proposes k tokens</text>
          <rect x="270" y="86" width="230" height="132" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
          <circle cx="385" cy="106" r="4" fill="#2563EB"></circle>
          <circle cx="385" cy="106" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
            <animate attributeName="r" values="4;11" dur="1.8s" repeatCount="indefinite"></animate>
            <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite"></animate>
          </circle>
          <text x="385" y="136" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="#111827">Target verify</text>
          <text x="385" y="158" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="#4B5563">one forward pass</text>
          <text x="385" y="180" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">accept longest prefix</text>
          <text x="385" y="198" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">reject the tail</text>
          <rect x="590" y="66" width="200" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="690" y="92" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Commit accepted</text>
          <text x="690" y="112" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">advance k tokens</text>
          <rect x="590" y="188" width="200" height="64" rx="10" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <text x="690" y="214" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12.5" font-weight="700" fill="#111827">Roll back rejected</text>
          <text x="690" y="234" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10.5" fill="#4B5563">trim KV · restore SSM</text>
          <path d="M180,152 H266" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M500,130 H545 V98 H586" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <path d="M500,174 H545 V220 H586" fill="none" stroke="#4B5563" stroke-width="1.5" marker-end="url(#arr1)"></path>
          <text x="223" y="144" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">draft</text>
          <text x="545" y="150" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">accept</text>
          <text x="552" y="212" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10.5" fill="#4B5563">reject</text>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.4s" repeatCount="indefinite" path="M180,152 H266"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" begin="0.7s" repeatCount="indefinite" path="M500,130 H545 V98 H586"></animateMotion></circle>
          <circle r="3" fill="#2563EB"><animateMotion dur="2.2s" begin="1.3s" repeatCount="indefinite" path="M500,174 H545 V220 H586"></animateMotion></circle>
        </svg>

The drafter writes ahead; the target decides. Rejected drafts are not just discarded — their KV state is trimmed and, on hybrid models, the conv/SSM state is restored and replayed so the cache is exactly as if the drafts had never been proposed.

Rollback is where the engineering lives. Full-attention layers can be unwound by trimming the KV cache back to the last accepted token. Hybrid models with GatedDeltaNet layers cannot — their recurrent state is not a simple suffix — so those are restored from a snapshot and replayed forward. An undo-log handles rotated caches, and an adaptive depth controller watches the acceptance rate per sequence, dialing the draft depth up when the drafter is on a streak and down — all the way to zero — when it is not.

## 04 · Why the Benchmark Ran Serial

Every one of those mechanisms requires something the benchmark model does not have. Lightning MTP is triple-gated, and Qwen3.5-4B-MLX-4bit fails the last two gates outright.

To activate, Lightning MTP needs all three of: a supported `model_type`, MTP heads declared in the model config, and real `mtp.*` tensors in the checkpoint. The benchmark checkpoint has none of the latter two:

| Gate | Required | Qwen3.5-4B-MLX-4bit | Result |
| --- | --- | --- | --- |
| Supported architecture | whitelisted `model_type` | qwen3_5 ✓ | pass |
| Config-declared heads | `mtp_num_hidden_layers` > 0 | absent | fail |
| Checkpoint weights | `mtp.*` tensors present | 0 found | fail |

The config declares no MTP fields at all, and the safetensors index contains zero `mtp` or `nextn` tensors. There is no `mtp/` subdirectory beside the weights either. The gate closes, MTP stays inactive, and the engine decodes one token per forward pass.

The structural gap. With MTP inactive, the prompt-lookup proposer has no chain to attach to, so it never fires either. That leaves oMLX with no speculative decoding at all on this model — while mlx-serve's PLD, which needs no special weights and is on by default, keeps drafting. The benchmark's ~5% decode edge is that asymmetry, not a verdict that PLD is the better technique.

## 05 · Twelve Ways It Disengages

The gating above is the one that bit the benchmark. But it is far from the only path back to serial decode — a sampling flag, a grammar, or a busy server can each quietly turn speculation off.

1

No model-agnostic path

A checkpoint without MTP weights gets zero speculation — there is no standalone PLD/n-gram route to fall back on.

2

Off in the schema by default

`mtp_enabled` defaults to false; it only auto-enables after a first-discovery probe finds real MTP weights.

3

Grammar-constrained decoding disables it

Any structured-output grammar in play turns MTP off — verified tokens can violate the automaton.

4

XTC sampling disables it

The exclusion-thumbs-up sampling technique is mutually exclusive with the draft-verify loop.

5

Concurrency locks it out

Under sustained multi-row load, MTP can fail to re-engage once requests are already batched — under load it may never come back.

6

It can be net-slower, and knows it

Measured at 0.67× on a large Gemma at its best depth; after enough losing streaks the runtime parks the depth at zero and stops trying.

7

Gains are content-dependent

Prose and chat settle at depth one — predictable, repetitive text is where drafting wins, and open-ended answers are where it does not.

8

Batch MTP is Qwen-only

Multi-row batched speculation works only for the Qwen family; every other architecture gets single-request speculation.

9

Mutually exclusive features

MTP cannot run alongside DFlash, a grammar, or a distributed/cluster deployment — each of those forces serial decode.

10

Verify numerics can diverge at depth ≥ 2

Quantized matrix-multiply kernels introduce small numeric drift on deeper drafts, a correctness concern the pipeline has to guard against.

11

Every exception falls back to serial

Ten separate fallback sites catch spec-path exceptions and quietly continue one-token-at-a-time — by design, but invisibly.

12

Memory overhead even when off

On vision-model loads the MTP head stays resident despite being disabled — paying memory for speculation that is not running.

## 06 · mlx-serve's Other Route

mlx-serve reaches the same goal by a different path, and the difference in defaults is what showed up in the benchmark.

mlx-serve treats speculative decoding as a priority chain — native MTP head if the checkpoint ships one, then a drafter, then prompt-lookup decoding. PLD sits at the bottom of that chain but requires nothing: it matches n-grams against the request's own earlier context and drafts from them, so it works on any model, including one with no special weights at all. It is on by default, which is why a stock `mlx-serve` invocation was already speculating on the benchmark model while oMLX was not.

| Property | oMLX | mlx-serve |
| --- | --- | --- |
| Model-agnostic spec decode | no — lookup only inside MTP | yes — PLD, any model |
| On by default | no — gated on weights | yes |
| Native MTP head | yes (Lightning MTP) | yes, when shipped |
| Fallback when weights absent | serial decode | PLD |

The fair reading. On a checkpoint that actually ships MTP weights, the comparison would be genuinely different — oMLX would be drafting from a trained head rather than n-gram matching, which is typically the stronger drafter. The benchmark could not exercise that, because the model had no MTP weights to load.

## 07 · Takeaways

| It implements it — thoroughly | Three drafter mechanisms over one draft-verify-rollback core, with adaptive per-sequence depth and cache rollback across hybrid attention. This is not a stub. |
| --- | --- |
| But it is gated on the checkpoint | No `mtp.*` weights means no MTP, and no MTP means no prompt-lookup either. On a stripped checkpoint the whole stack is inert. |
| Twelve roads back to serial | Grammar, XTC, concurrency, cluster mode, or a losing streak — each silently returns to one-token-at-a-time. Plan for it in any performance work. |
| PLD wins by being unconditional | mlx-serve's default-on, weight-free PLD is not a better drafter; it is a drafter that always shows up. That is what the benchmark measured. |
| Read the flags before the numbers | Any spec-decode comparison should name which mechanisms each side could actually engage on that model — otherwise you are timing configurations, not techniques. |

Part of the benchmark series. The ~5% decode gap this explains appears in the [oMLX vs mlx-serve benchmark](../2026-10-17-omlx-vs-mlx-serve-benchmark/2026-10-17-omlx-vs-mlx-serve-benchmark.html), now annotated with this fairness note. The other half of the story — the cache both engines were racing against — is in the [tiered-SSD-cache deep-dive](../2026-10-18-omlx-tiered-ssd-cache/2026-10-18-omlx-tiered-ssd-cache.html).
