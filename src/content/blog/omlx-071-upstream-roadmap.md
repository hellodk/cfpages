---
title: "542 Commits In One Fast-Forward: The omlx 0.7.1.dev2 Upstream Merge"
date: 2026-10-15
description: "Merging 542 upstream omlx commits (0.7.0.dev4 → 0.7.1.dev2): 933 files, +147k/−36k lines. New serving endpoints, speculative decoding, MoE offload, and the kernel work behind them."
tags: [omlx, llm, roadmap]
cover: "assets/images/covers/omlx-071-upstream-roadmap.jpg"
draft: false
---

Local sat at `0.7.0.dev4`. Upstream shipped two release candidates, two release tags, and a stream of serving and kernel work. The merge was a clean fast-forward — here is everything that came with it.

## 1\. The Merge, In Numbers

542

commits merged

933

files changed

+147,340

lines added

−36,210

lines removed

| Item | Value |
| --- | --- |
| Local head before merge | `14194fe7` — `0.7.0.dev4` |
| Upstream head | `2369e68b` — `0.7.1.dev2` |
| Merge type | fast-forward — no merge commit, local had no divergent work |
| Subject-prefix breakdown (approximate) | ~71 `feat`, ~90 `perf`, ~288 `fix` |

**Why a fast-forward mattered:** nothing local had diverged from upstream, so the 542 commits applied as a straight line. The diff stats above are the exact output of the range — 933 files touched, a net +111,130 lines.

## 2\. Tag Timeline

The range covers two release lines at once: the tail of 0.7.0 (including its release candidate and final tag) and the head of 0.7.1 development.

dev

`v0.7.0.dev1`, `v0.7.0.dev2`, `v0.7.0.dev4` — the dev line local was tracking; local's head sits at `dev4`.

rc + release

`v0.7.0rc1` then `v0.7.0` — upstream cut a release candidate and a final tag inside this range.

next line

`v0.7.1.dev1`, `v0.7.1.dev2` — 0.7.1 development opens and reaches `dev2`, which is where upstream now sits.

## 3\. Before → After

The codebase grew on every axis: serving surface, model coverage, and kernel code. The diagram below maps what the merge carried from one side to the other.

Diagram A — Before → After: The Codebase After the Merge

<svg viewBox="0 0 700 340" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arr" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0,10 3,0 6" fill="#4B5563"></polygon></marker>
      <marker id="arrb" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0,10 3,0 6" fill="#2563EB"></polygon></marker>
    </defs>
    <text x="120" y="40" font-size="14" font-weight="700" fill="#4B5563" text-anchor="middle">Before</text>
    <rect x="30" y="55" width="180" height="46" fill="#FFFFFF" stroke="#4B5563" stroke-width="2" rx="6"></rect>
    <text x="120" y="75" font-size="12" font-weight="600" fill="#111827" text-anchor="middle">Local Tree</text>
    <text x="120" y="90" font-size="10" fill="#4B5563" text-anchor="middle">0.7.0.dev4 &#183; 14194fe7</text>
    <rect x="30" y="120" width="180" height="36" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" rx="5"></rect>
    <text x="120" y="142" font-size="10.5" fill="#4B5563" text-anchor="middle">Single serving path</text>
    <rect x="30" y="166" width="180" height="36" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" rx="5"></rect>
    <text x="120" y="188" font-size="10.5" fill="#4B5563" text-anchor="middle">Fewer model families</text>
    <rect x="30" y="212" width="180" height="36" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" rx="5"></rect>
    <text x="120" y="234" font-size="10.5" fill="#4B5563" text-anchor="middle">Earlier MTP / DFlash</text>
    <path d="M 225 160 L 275 160" stroke="#4B5563" stroke-width="2" fill="none" marker-end="url(#arr)"></path>
    <text x="250" y="148" font-size="10.5" font-weight="600" fill="#4B5563" text-anchor="middle">fast-forward</text>
    <circle r="5" fill="#2563EB">
      <animateMotion path="M 225 160 L 275 160" dur="2.4s" repeatCount="indefinite"></animateMotion>
    </circle>
    <text x="470" y="40" font-size="14" font-weight="700" fill="#2563EB" text-anchor="middle">After</text>
    <rect x="330" y="55" width="180" height="46" fill="#111827" stroke="#2563EB" stroke-width="2" rx="6"></rect>
    <text x="420" y="75" font-size="12" font-weight="600" fill="#FFFFFF" text-anchor="middle">Local Tree</text>
    <text x="420" y="90" font-size="10" fill="#CBD5E1" text-anchor="middle">0.7.1.dev2 &#183; 2369e68b</text>
    <rect x="330" y="120" width="180" height="36" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5" rx="5"></rect>
    <text x="420" y="142" font-size="10.5" font-weight="600" fill="#111827" text-anchor="middle">Decisions + systemone APIs</text>
    <rect x="330" y="166" width="180" height="36" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5" rx="5"></rect>
    <text x="420" y="188" font-size="10.5" font-weight="600" fill="#111827" text-anchor="middle">MiMo, GLM-5.3, Qwen4, D4.1</text>
    <rect x="330" y="212" width="180" height="36" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5" rx="5"></rect>
    <text x="420" y="234" font-size="10.5" font-weight="600" fill="#111827" text-anchor="middle">Batched DFlash, NAX kernels</text>
    <rect x="330" y="258" width="180" height="36" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5" rx="5"></rect>
    <text x="420" y="280" font-size="10.5" font-weight="600" fill="#111827" text-anchor="middle">SSD-streamed MoE offload</text>
    <text x="120" y="290" font-size="10" fill="#4B5563" text-anchor="middle">542 commits, 933 files</text>
    <text x="120" y="306" font-size="10" fill="#4B5563" text-anchor="middle">+147,340 / &minus;36,210</text>
    <g>
      <circle cx="420" cy="138" r="14" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="8;20" dur="2.2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.55;0" dur="2.2s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="420" cy="184" r="14" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="8;20" dur="2.2s" begin="0.5s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.55;0" dur="2.2s" begin="0.5s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="420" cy="230" r="14" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="8;20" dur="2.2s" begin="1s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.55;0" dur="2.2s" begin="1s" repeatCount="indefinite"></animate>
      </circle>
      <circle cx="420" cy="276" r="14" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="8;20" dur="2.2s" begin="1.5s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.55;0" dur="2.2s" begin="1.5s" repeatCount="indefinite"></animate>
      </circle>
    </g>
    <path d="M 520 138 L 540 138 L 540 276 L 520 276" stroke="#2563EB" stroke-width="1.5" fill="none"></path>
    <text x="560" y="210" font-size="10.5" font-weight="600" fill="#2563EB">One serving</text>
    <text x="560" y="226" font-size="10.5" font-weight="600" fill="#2563EB">stack</text>
  </svg>

## 4\. New Features

Roughly 71 `feat`\-prefixed commits in the range. The table below is the user-visible surface: new APIs, new model families, and the speculative-decoding additions.

### Serving API and system-level features

| Area | Feature | Ref |
| --- | --- | --- |
| Serving API | OpenAI Decisions API `/v1/decisions` for any chat model | #4436 |
| Serving API | `/v1/systemone` answers with any chat model | #4552 |
| Serving API | vLLM-compatible `/tokenize` and `/detokenize` | #4331 |
| Serving API | Stream prefill progress via `return_progress` | #4362 |
| Serving API | Reranker accepts request instruction (Qwen3-Reranker) | #4389 |
| Serving API | Embeddings accept audio + OpenAI content parts | #4390, #4419 |
| Serving API | Keyless inference / opt-in unauthenticated inference | #4528, #3730 |
| Sampling | `no_repeat_ngram_size` + `ngram_window` applied | #4510 |
| Scheduler | Requeue under memory pressure; cache cancelled prompts | #4509 |
| Cache | Reuse prefix tail blocks in front of generation prompt | #3835 |

### Model coverage and multimodal

| Area | Feature | Ref |
| --- | --- | --- |
| VLM | Native video input for Qwen3.5-family | #4169 |
| VLM | MiMo V2.6 image/video/audio support | #3860 |
| VLM | Text-only Gemma 4 w/ merged MTP head via mlx-vlm | #3561 |
| Embedding | EmbeddingGemma 2 support | #4333 |
| Qwen | YaRN context extension past native window | #3347 |
| Engine | Serve Qwen3.8/3.6 through Splash as external engine | #4447 |
| Models | Decision 3.0 (d3), Clef, OpenJev via `/v1/systemone` | #4470, #4315 |

### Speculative decoding and MoE offload

| Area | Feature | Ref |
| --- | --- | --- |
| Speculative | DFlash in batched engines (removes dflash-mlx) | #4508 |
| Speculative | DFlash2 GLM-5.3 target; DFlash MiMo V2.6 | #3979, #3821 |
| Speculative | Adaptive MTP depth selection | `62171bdf` |
| Speculative | Batched DFlash + improved Lightning MTP | #3797 |
| Speculative | MiMo Lightning MTP w/ oQ preservation | #3877 |
| MoE offload | Expert offload for DeepSeek V4 / glm5_next / GLM DSA / Qwen3.5 | #3720, #3696, #3717 |

### Quantization, cluster, downloads, integrations, UI

| Area | Feature | Ref |
| --- | --- | --- |
| Quantization | V4.1 oQ2–oQ2.7; load/offload mlx_lm affine checkpoints | `93c49d63`, #3713 |
| Cluster | Mac-to-CUDA stage edge over MCDMA RDMA links | #3869 |
| Downloads | Live speed, resumable queues, immediate xet cancel | #3875 |
| Integrations | Mistral Vibe launcher; DeepSeek Harness (dsh) | #4367, #3950 |
| Admin/UI | Chat composer controls; settings sections; Serving Stats tiles | #4446, #4415, #4399 |
| Mac app | Model settings pages w/ autosave; log records view | #4530, #4514 |

**One theme across the serving additions:** the API surface converged on OpenAI-compatible shapes — Decisions API, content-part embeddings, vLLM-style tokenize/detokenize — while `/v1/systemone` opened a second question-answering route that works with any chat model.

## 5\. Serving Data Path

The feature list reads differently when you follow a request through the stack. This diagram places the new endpoints, the scheduler changes, and the engine-level work on one path.

Diagram B — Serving Data Path & Feature Map

<svg viewBox="0 0 720 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arr2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><polygon points="0 0,10 3,0 6" fill="#2563EB"></polygon></marker>
    </defs>
    <text x="80" y="36" font-size="11" font-weight="700" fill="#4B5563">Client</text>
    <rect x="24" y="50" width="112" height="40" fill="#FFFFFF" stroke="#4B5563" stroke-width="2" rx="6"></rect>
    <text x="80" y="74" font-size="11" font-weight="600" fill="#111827" text-anchor="middle">HTTP Request</text>
    <path d="M 140 70 L 190 70" stroke="#2563EB" stroke-width="2" fill="none" marker-end="url(#arr2)"></path>
    <circle r="4.5" fill="#2563EB">
      <animateMotion path="M 140 70 L 190 70" dur="2s" repeatCount="indefinite"></animateMotion>
    </circle>
    <text x="275" y="36" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">Serving API</text>
    <rect x="195" y="50" width="160" height="120" fill="#111827" stroke="#2563EB" stroke-width="2" rx="6"></rect>
    <text x="275" y="72" font-size="10.5" font-weight="600" fill="#FFFFFF" text-anchor="middle">/v1/chat/completions</text>
    <text x="275" y="92" font-size="10.5" font-weight="600" fill="#FFFFFF" text-anchor="middle">/v1/decisions</text>
    <text x="275" y="112" font-size="10.5" font-weight="600" fill="#FFFFFF" text-anchor="middle">/v1/systemone</text>
    <text x="275" y="132" font-size="10" fill="#CBD5E1" text-anchor="middle">/tokenize /detokenize</text>
    <text x="275" y="152" font-size="10" fill="#CBD5E1" text-anchor="middle">return_progress streaming</text>
    <g>
      <circle cx="275" cy="110" r="12" fill="none" stroke="#60A5FA" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="8;26" dur="2.6s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.6;0" dur="2.6s" repeatCount="indefinite"></animate>
      </circle>
    </g>
    <path d="M 360 90 L 410 90" stroke="#2563EB" stroke-width="2" fill="none" marker-end="url(#arr2)"></path>
    <circle r="4.5" fill="#2563EB">
      <animateMotion path="M 360 90 L 410 90" dur="2s" begin="0.4s" repeatCount="indefinite"></animateMotion>
    </circle>
    <text x="385" y="80" font-size="9.5" fill="#4B5563" text-anchor="middle">schedule</text>
    <text x="480" y="36" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">Scheduler</text>
    <rect x="415" y="50" width="130" height="120" fill="#EFF6FF" stroke="#2563EB" stroke-width="2" rx="6"></rect>
    <text x="480" y="74" font-size="10" font-weight="600" fill="#111827" text-anchor="middle">Batch concurrent</text>
    <text x="480" y="88" font-size="10" font-weight="600" fill="#111827" text-anchor="middle">prompt prefills</text>
    <text x="480" y="112" font-size="10" fill="#4B5563" text-anchor="middle">Requeue under</text>
    <text x="480" y="126" font-size="10" fill="#4B5563" text-anchor="middle">memory pressure</text>
    <text x="480" y="148" font-size="10" fill="#4B5563" text-anchor="middle">Prefix tail reuse</text>
    <text x="480" y="162" font-size="10" fill="#4B5563" text-anchor="middle">Shared sampler</text>
    <path d="M 550 110 L 590 110 L 590 220 L 550 220" stroke="#2563EB" stroke-width="2" fill="none" marker-end="url(#arr2)"></path>
    <circle r="4.5" fill="#2563EB">
      <animateMotion path="M 550 110 L 590 110 L 590 220 L 550 220" dur="2.6s" begin="0.8s" repeatCount="indefinite"></animateMotion>
    </circle>
    <text x="615" y="170" font-size="9.5" fill="#4B5563">forward pass</text>
    <text x="370" y="204" font-size="11" font-weight="700" fill="#2563EB" text-anchor="middle">Engine &amp; Kernels</text>
    <rect x="300" y="216" width="245" height="86" fill="#FFFFFF" stroke="#2563EB" stroke-width="2" rx="6"></rect>
    <text x="422" y="238" font-size="10" font-weight="600" fill="#111827" text-anchor="middle">NAX attention &#183; JIT kernels &#183; split-K</text>
    <text x="422" y="256" font-size="10" fill="#4B5563" text-anchor="middle">Fused MoE decode &#183; SSD-streamed offload</text>
    <text x="422" y="274" font-size="10" fill="#4B5563" text-anchor="middle">Batched DFlash &#183; adaptive MTP depth</text>
    <text x="422" y="292" font-size="10" fill="#4B5563" text-anchor="middle">TurboQuant &#183; streaming detokenizer</text>
    <g>
      <circle cx="422" cy="259" r="12" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="8;28" dur="2.6s" begin="1.2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.6;0" dur="2.6s" begin="1.2s" repeatCount="indefinite"></animate>
      </circle>
    </g>
    <path d="M 422 302 L 422 330" stroke="#2563EB" stroke-width="2" fill="none" marker-end="url(#arr2)"></path>
    <circle r="4.5" fill="#2563EB">
      <animateMotion path="M 422 302 L 422 330" dur="1.6s" begin="1.4s" repeatCount="indefinite"></animateMotion>
    </circle>
    <text x="422" y="352" font-size="11" font-weight="700" fill="#4B5563" text-anchor="middle">Weights &amp; Cache</text>
    <rect x="260" y="362" width="140" height="30" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" rx="5"></rect>
    <text x="330" y="381" font-size="10" fill="#4B5563" text-anchor="middle">SSD-streamed experts</text>
    <rect x="415" y="362" width="140" height="30" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" rx="5"></rect>
    <text x="485" y="381" font-size="10" fill="#4B5563" text-anchor="middle">Paged KV + index caches</text>
    <path d="M 24 210 L 24 210" stroke="none"></path>
    <text x="100" y="216" font-size="10" font-weight="600" fill="#4B5563">Edge</text>
    <rect x="24" y="228" width="160" height="56" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" rx="6"></rect>
    <text x="104" y="250" font-size="10" fill="#111827" font-weight="600" text-anchor="middle">Mac-to-CUDA stage</text>
    <text x="104" y="264" font-size="9.5" fill="#4B5563" text-anchor="middle">MCDMA RDMA links</text>
    <text x="104" y="278" font-size="9.5" fill="#4B5563" text-anchor="middle">#3869</text>
    <path d="M 184 256 L 300 256" stroke="#E5E7EB" stroke-width="1.5" fill="none" stroke-dasharray="4"></path>
  </svg>

## 6\. Kernel & Perf Work

~90 `perf`\-prefixed commits in the range — the largest category after fixes. Grouped by the subsystem they touch.

### Scheduler, pool, attention

| Area | Improvement | Ref |
| --- | --- | --- |
| Scheduler | Batch concurrent prompt prefills into one forward | #4361 |
| Scheduler | 8192-token MiMo & GLM-5.3 prefill chunks on NAX | #3992, #3988 |
| Scheduler | 4096-token MiMo prefill chunks w/ paged-cache block | #3973 |
| Engine pool | Keep GPU out of idle power state between requests | #3974 |
| Attention | Long-context NAX attention in key-range passes | #4032 |
| Attention | JIT NAX attention kernel for 192/128 head dims | #3994 |
| Attention | Zero-copy blocked sliding-window attention for MiMo | #3991 |

### Mixture-of-Experts and MTP

| Area | Improvement | Ref |
| --- | --- | --- |
| MoE | Faster prefill/decode with SSD-streamed offloaded experts | #4240, #4313 |
| MoE | Fetch/compute overlap on SSD streaming | #4037 |
| MoE | Fuse MiMo & GLM-5.3 expert gate/up into one gather_qmm | #3993, #4022 |
| MoE | NAX sorted gather_qmm w/ segmented tile scheduling | #3995 |
| MTP | Stop shared MTP from slowing busy batches | #4112 |
| MTP | Context-copy drafts for DeepSeek DSpark | #4363 |
| MTP | Share 8-bit projections across partial row tiles | #4475 |

### Per-model kernel work

| Area | Improvement | Ref |
| --- | --- | --- |
| GLM-5.3 | Split-K attention for sparse decode | #4523 |
| GLM-5.3 | Exact fused decode/verify kernels; fused 3-bit decode | #3989, #4255 |
| Qwen4 | Batched one-token decode + batched GDN step | #4106 |
| Qwen4 | Fused MoE, DeltaNet, attention one-token decode | #4039 |
| Qwen | Fused MoE decode for FP16 and top-8 routing | #4335 |
| DeepSeek V4.1 | Faster bit-exact decode/long-prompt prefill kernels | #4360 |
| DeepSeek V4.1 | Grow compressed KV & index caches in place | #4365 |
| Qwen3.5 | Q8 GS64 prefill projections as W8A8 on M5 | #4350 |

### Cross-cutting

| Area | Improvement | Ref |
| --- | --- | --- |
| TurboQuant | Simdgroup-matrix attention for one-seq decode & MTP verify | #4408 |
| Reranker | Forward shared instruction/query once per request | #4407 |
| Sampling | Share one sampler between requests with equal params | #4376 |
| Tokenizer | Build streaming detokenizer once per tokenizer | #3975 |

**What this post does not claim:** no benchmark numbers, throughput figures, or speedup percentages are stated here — none were part of the verified merge facts, so none are invented. The refs above are the review/PR numbers from the commit range.

## 7\. Closing

A fast-forward is the least dramatic kind of merge — no conflict resolution, no merge commit — but the content is not small: 542 commits, 933 files, a net +111,130 lines. The through-lines:

**Serving broadened.** `/v1/decisions` and `/v1/systemone` added two new question routes beside chat completions; tokenization endpoints matched vLLM's shapes; prefill progress and keyless inference rounded out the API.

**Speculative decoding consolidated.** DFlash moved into the batched engines (dflash-mlx is gone), DFlash2 gained a GLM-5.3 target, and MTP work continued with adaptive depth selection, Lightning MTP improvements, and MiMo oQ preservation.

**Kernels went deeper per model.** NAX attention passes, JIT kernels for specific head dims, split-K sparse decode for GLM-5.3, fused one-token decode for Qwen4, SSD-streamed MoE offload with fetch/compute overlap — the ~90 perf commits are mostly this layer.

If you were tracking omlx from `0.7.0.dev4`, this is the delta in full.
