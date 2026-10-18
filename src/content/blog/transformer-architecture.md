---
title: "Transformer Architecture — Complete Visual Guide"
date: 2026-10-18
description: "A decoder-only transformer consumes a token sequence and produces, for every position, a probability distribution over the vocabulary. This tab follows a single token from integer ID through the attention mechanism, with every tensor shape named. Reference configuration: a Qwen3.5-7B-class model —"
tags: [llm, inference, architecture]
draft: false
---

Every tensor, every operation, explained from first principles · Decoder-only LLMs · Shapes traced end to end

## Embeddings · Attention · RoPE

### From Tokens to Context — The Front of the Model

A decoder-only transformer consumes a token sequence and produces, for every position, a probability distribution over the vocabulary. This tab follows a single token from integer ID through the attention mechanism, with every tensor shape named. Reference configuration: a **Qwen3.5-7B-class** model — 28 layers, hidden size 3584, 32 attention heads, GQA grouped KV — unless stated otherwise.

Full forward pass — one token's journey, animated

<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="420" fill="#F8FAFC"></rect>
      <rect x="30" y="60" width="150" height="90" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="105" y="88" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Tokenizer</text>
      <text x="105" y="105" text-anchor="middle" font-size="9" fill="#4F46E5">BPE · vocab ≈ 152k</text>
      <text x="105" y="125" text-anchor="middle" font-size="9" fill="#4B5563">text → [42, 891, 7]</text>
      <rect x="30" y="190" width="150" height="90" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="105" y="218" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Embedding</text>
      <text x="105" y="235" text-anchor="middle" font-size="9" fill="#4B5563">lookup table</text>
      <text x="105" y="255" text-anchor="middle" font-size="9" fill="#4B5563">[T] → [T, 3584]</text>
      <rect x="260" y="40" width="260" height="340" rx="12" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="390" y="68" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Transformer Block ×28</text>
      <rect x="282" y="88" width="216" height="60" rx="6" fill="rgba(99,102,241,.12)" stroke="#C7D2FE" stroke-width="1"></rect>
      <text x="390" y="112" text-anchor="middle" font-size="10" fill="#4338CA" font-weight="600">RMSNorm → QKV + RoPE → Attention</text>
      <text x="390" y="130" text-anchor="middle" font-size="9" fill="#4B5563">mix information across positions</text>
      <rect x="282" y="166" width="216" height="60" rx="6" fill="rgba(99,102,241,.12)" stroke="#C7D2FE" stroke-width="1"></rect>
      <text x="390" y="190" text-anchor="middle" font-size="10" fill="#4338CA" font-weight="600">+ residual · RMSNorm · SwiGLU MLP</text>
      <text x="390" y="208" text-anchor="middle" font-size="9" fill="#4B5563">per-position compute · 3584 → 18432 → 3584</text>
      <rect x="282" y="244" width="216" height="100" rx="6" fill="rgba(99,102,241,.08)" stroke="rgba(68,76,231,.35)" stroke-width="1" stroke-dasharray="4,3"></rect>
      <text x="390" y="284" text-anchor="middle" font-size="10" fill="#4338CA" font-weight="600">… repeat 28 times …</text>
      <text x="390" y="302" text-anchor="middle" font-size="9" fill="#4B5563">residual stream grows richer</text>
      <circle cx="390" cy="322" r="0" fill="#444ce7" opacity=".4">
        <animate attributeName="r" values="0;44" dur="2.6s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".4;0" dur="2.6s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="600" y="100" width="160" height="80" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="680" y="128" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Final RMSNorm</text>
      <text x="680" y="148" text-anchor="middle" font-size="9" fill="#4B5563">[T, 3584] normalized</text>
      <rect x="600" y="210" width="160" height="80" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="680" y="238" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">LM Head</text>
      <text x="680" y="258" text-anchor="middle" font-size="9" fill="#4B5563">3584 → 152k logits</text>
      <rect x="600" y="320" width="160" height="70" rx="10" fill="#fff" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="680" y="346" text-anchor="middle" font-size="12" font-weight="700" fill="#166534">Softmax → next token</text>
      <text x="680" y="364" text-anchor="middle" font-size="9" fill="#16A34A">argmax or sampled</text>
      <path id="f1" d="M105 150 L105 190" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path id="f2" d="M180 235 L260 200" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path id="f3" d="M520 140 L600 132" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path id="f4" d="M680 180 L680 210" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path id="f5" d="M680 290 L680 320" fill="none" stroke="#16A34A" stroke-width="1.5"></path>
      <circle r="4" fill="#444ce7"><animateMotion dur="2s" repeatCount="indefinite" begin="0s"><mpath href="#f1"></mpath></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2s" repeatCount="indefinite" begin=".7s"><mpath href="#f2"></mpath></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2.4s" repeatCount="indefinite" begin="1.2s"><mpath href="#f3"></mpath></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="2s" repeatCount="indefinite" begin="1.8s"><mpath href="#f4"></mpath></animateMotion></circle>
      <circle r="4" fill="#16A34A"><animateMotion dur="2s" repeatCount="indefinite" begin="2.3s"><mpath href="#f5"></mpath></animateMotion></circle>
      <text x="450" y="405" text-anchor="middle" font-size="9" fill="#9CA3AF">every arrow is a tensor moving — shapes: [B=batch, T=sequence, H=hidden]</text>
    </svg>

## Step 1–2 — Tokenization and Embedding Lookup

Text never enters the model as characters. A **byte-pair encoding (BPE)** tokenizer splits text into subword units from a fixed vocabulary (~152k entries in Qwen tokenizers). Each token becomes one integer. There is no convolution over bytes — the model only ever sees indices.

The embedding layer is a single matrix `E ∈ ℝ^(V×d)` (152007 × 3584 for our reference model, ~545M parameters — often the second-largest single matrix after the LM head). Lookup `E[42]` copies row 42. No computation happens; the "embedding" is learned storage. In practice this is one indexed read per token, which is why embedding tables are memory-bandwidth-cheap during decode but dominate weight memory when V is huge.

```bash
# integer IDs → row vectors
ids   = [42, 891, 7]                 # BPE tokens
X     = E[ids]                        # shape [T=3, d=3584]
# every downstream operation consumes this [T, d] matrix
```

## Step 3 — Attention from First Principles

Attention answers one question per position: _"which earlier tokens should this position listen to?"_ Each token's vector is projected **three** times by learned matrices:

### Query — Q

"What am I looking for?"  
`X·W_Q` → \[T, 3584\]

### Key — K

"What do I contain?"  
`X·W_K` → \[T, _fewer_ dims\]

### Value — V

"What will I contribute?"  
`X·W_V` → \[T, fewer dims\]

The core operation is **scaled dot-product attention**: scores = Q·Kᵀ (how well each query matches each key), scaled by 1/√dk, masked so no position sees the future, softmaxed into weights, then applied to V:

```bash
Attn(Q, K, V) = softmax( Q·Kᵀ / √dk + mask ) · V

Q·Kᵀ      : [T, d] · [d, T] → [T, T]   # every token scores every token
/ √dk   : keeps logits in softmax's trainable range
mask      : upper triangle = −∞        # causal: position i sees only ≤ i
softmax   : rows sum to 1 → attention weights
weights·V : [T, T] · [T, d] → [T, d]   # weighted mix of values
```

<aside class="callout"><strong class="callout__title">Why √d scaling:</strong><div class="callout__body">dot products of d-dimensional vectors with unit-ish components have variance ∝ d. Unscaled, logits like ±20 saturate softmax into one-hot vectors — gradients vanish. Dividing by √d keeps logits near ±1 where softmax is responsive.</div></aside>

<aside class="callout"><strong class="callout__title">Why three projections instead of one:</strong><div class="callout__body">attention is content-addressed memory. Q·K decides <em>routing</em>; that routed mixture of V is the <em>payload</em>. Decoupling them lets one token be a key for many different queries with different meanings — "it" attends to its antecedent via a query the current context constructs, not via the raw word vector.</div></aside>

Multi-head attention with grouped-query (GQA) — the modern default

<svg viewBox="0 0 900 380" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="380" fill="#F8FAFC"></rect>
      <text x="120" y="40" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">32 Query Heads</text>
      <text x="700" y="40" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">16 KV Heads (shared)</text>
      <g font-size="8" fill="#1F2937" text-anchor="middle">
        <rect x="40" y="60" width="70" height="26" rx="5" fill="#fff" stroke="#444ce7" stroke-width="1.2"></rect><text x="75" y="77">Q head 0</text>
        <rect x="120" y="60" width="70" height="26" rx="5" fill="#fff" stroke="#444ce7" stroke-width="1.2"></rect><text x="155" y="77">Q head 1</text>
        <rect x="200" y="60" width="70" height="26" rx="5" fill="#fff" stroke="#444ce7" stroke-width="1.2"></rect><text x="235" y="77">Q head 2</text>
        <rect x="40" y="96" width="70" height="26" rx="5" fill="#fff" stroke="#444ce7" stroke-width="1.2"></rect><text x="75" y="113">Q head 3</text>
        <rect x="120" y="96" width="70" height="26" rx="5" fill="#fff" stroke="#444ce7" stroke-width="1.2"></rect><text x="155" y="113">Q head 4</text>
        <rect x="200" y="96" width="70" height="26" rx="5" fill="#fff" stroke="#444ce7" stroke-width="1.2"></rect><text x="235" y="113">Q head 5</text>
        <rect x="40" y="140" width="70" height="26" rx="5" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,2"></rect><text x="75" y="157" fill="#6B7280">… 32 total</text>
      </g>
      <g font-size="8" fill="#1F2937" text-anchor="middle">
        <rect x="630" y="60" width="90" height="26" rx="5" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect><text x="675" y="77" fill="#4338CA">KV pair 0</text>
        <rect x="740" y="60" width="90" height="26" rx="5" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect><text x="785" y="77" fill="#4338CA">KV pair 1</text>
        <rect x="630" y="100" width="90" height="26" rx="5" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect><text x="675" y="117" fill="#4338CA">KV pair 2</text>
        <rect x="740" y="100" width="90" height="26" rx="5" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect><text x="785" y="117" fill="#4338CA">KV pair 3</text>
        <rect x="630" y="140" width="90" height="26" rx="5" fill="#F3F4F6" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="3,2"></rect><text x="675" y="157" fill="#6B7280">… 16 total</text>
      </g>
      <g stroke="#444ce7" stroke-width="1" fill="none" opacity=".6">
        <path d="M110 73 L630 72"></path>
        <path d="M190 73 L630 73"></path>
        <path d="M110 109 L675 100"></path>
        <path d="M190 109 L675 101"></path>
        <path d="M270 109 L675 102"></path>
      </g>
      <circle r="3.5" fill="#444ce7"><animateMotion dur="3s" repeatCount="indefinite" path="M110 73 L630 72"></animateMotion></circle>
      <circle r="3.5" fill="#444ce7"><animateMotion dur="3s" repeatCount="indefinite" begin="1s" path="M190 109 L675 101"></animateMotion></circle>
      <circle r="3.5" fill="#444ce7"><animateMotion dur="3s" repeatCount="indefinite" begin="2s" path="M270 109 L675 102"></animateMotion></circle>
      <rect x="330" y="220" width="240" height="56" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="450" y="244" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">Concat 32 heads → W_O</text>
      <text x="450" y="261" text-anchor="middle" font-size="9" fill="#4B5563">[T, 32 × 112] → [T, 3584]</text>
      <g stroke="#9CA3AF" stroke-width="1" fill="none">
        <path id="om1" d="M75 166 Q75 240 330 244"></path>
        <path id="om2" d="M450 126 L450 220"></path>
        <path id="om3" d="M675 166 Q675 240 570 248"></path>
      </g>
      <circle r="3" fill="#16A34A"><animateMotion dur="2.5s" repeatCount="indefinite" path="M75 166 Q75 240 330 244"></animateMotion></circle>
      <circle r="3" fill="#16A34A"><animateMotion dur="2.5s" repeatCount="indefinite" begin="1.3s" path="M675 166 Q675 240 570 248"></animateMotion></circle>
      <rect x="250" y="300" width="400" height="56" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="450" y="323" text-anchor="middle" font-size="10" font-weight="700" fill="#111827">KV cache holds 16 pairs, not 32</text>
      <text x="450" y="340" text-anchor="middle" font-size="9" fill="#4F46E5">2 query heads share each KV head → cache memory halves vs MHA</text>
    </svg>

## Multi-Head, GQA, MQA — One Spectrum

Running **h** attention operations in parallel on learned subspaces (here 32 heads of 112 dimensions each, 112 × 32 = 3584) lets different heads specialize: syntax, coreference, induction, retrieval — behaviors mechanistically identified inside trained models. Each head's Q/K/V comes from slicing the big projection: `W_Q` is really 32 stacked \[3584, 112\] slices.

The KV _cache_ — every past token's stored K and V — is the dominant memory consumer at long context. Grouped-query attention trades quality for cache size by giving several query heads **one shared KV head**:

| Variant | Q heads : KV heads | Cache vs full MHA | Used by |
| --- | --- | --- | --- |
| MHA | 32 : 32 | 1× (baseline) | GPT-3, original transformer |
| GQA-8 | 32 : 4 | ÷8 | Llama-2-70B |
| GQA | 32 : 16 | ÷2 | Llama-3-8B, Qwen2.5-7B |
| MQA | 32 : 1 | ÷32 | Falcon, PaLM |

<aside class="callout"><strong class="callout__title">Trade-off:</strong><div class="callout__body">GQA reduces cache bandwidth and memory ~ linearly with KV-head count, at a small perplexity cost. MQA is the extreme — historically used for retrieval-heavy workloads, rarely for modern general LLMs.</div></aside>

## Positional Information — Rotary Embeddings (RoPE)

Attention itself is permutation-invariant — shuffle the tokens and Q·Kᵀ rows shuffle identically. Position must be injected. Modern LLMs use **RoPE**: rather than adding a position vector, it _rotates_ Q and K pairs in 2D subspaces by position-dependent angles, before the dot product.

```bash
# position m, head dimension pair (2i, 2i+1), base θ = 500000
θᵢ = θ^(−2i/d)
rotation(m) = [[cos mθᵢ, −sin mθᵢ],
               [sin mθᵢ,  cos mθᵢ]]

RoPE(x, m) = rotate each 2D slice of x by angle mθᵢ
```

The dot product of two rotated vectors depends only on the **relative** position m−n: rotating both by m and n leaves their inner angle (m−n)θi. So position emerges in attention scores as an absolute angle per dimension-pair, and the model learns patterns like "attenuate distance 1 more than distance 100" from the cosine structure alone. Low-frequency dimensions (small θi) rotate slowly and carry long-range position; high-frequency ones rotate fast and separate neighbors.

### Why rotation, not addition

ALiBi and sinusoidal additive schemes extrapolate poorly or need training at every length. RoPE preserves relative-position structure at any distance and supports **NTK/YaRN scaling** — adjust θ or interpolate frequencies to extend context post-training (e.g. 4k → 128k) without retraining attention.

### Where RoPE is applied

On Q and K _after_ projection, _before_ the Q·Kᵀ product — and the rotated K is what enters the KV cache. V is never rotated. RoPE composes with GQA naturally: each KV head's K has one rotation, shared by its query group.

```bash
# pseudocode of one attention layer, decode step t
q = rmsnorm(x) @ W_q;  k = rmsnorm(x) @ W_k;  v = rmsnorm(x) @ W_v
q, k = rope(q, t), rope(k, t)          # rotate by absolute position t
kv_cache[layer].append(k, v)           # persist for future steps
attn_out = softmax(q @ k_all.T / √d) @ v_all   # k_all = all cached + current
```

<aside class="callout"><strong class="callout__title">Shape recap for our 7B reference model:</strong><div class="callout__body">input [B, T] → embed [B, T, 3584] → per layer: Q [B, T, 32×112], K/V [B, T, 16×112] → attention scores [B, 32, T, T] → out [B, T, 3584]. At batch 1 decode, T grows by one per step and the score matrix is a [1, 32, 1, T] vector — which is why decode is <em>memory-bound</em>, not compute-bound (Tab 3).</div></aside>

## Norms · MLP · Residual Stream

### Inside the Block — Norms, MLP, and the Residual Stream

Attention mixes _across positions_; the MLP processes each position _independently_. Between them runs normalization and a residual "stream" that ties 28 layers together. Every modern LLM block is a variant of: **pre-norm → sublayer → add → pre-norm → sublayer → add**.

One transformer block, tensors annotated

<svg viewBox="0 0 900 460" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="460" fill="#F8FAFC"></rect>
      <path id="spine" d="M120 40 L120 420" fill="none" stroke="#444ce7" stroke-width="3"></path>
      <text x="120" y="28" text-anchor="middle" font-size="10" fill="#444ce7" font-weight="700">residual stream (3584-d)</text>
      <rect x="55" y="50" width="130" height="34" rx="8" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="120" y="71" text-anchor="middle" font-size="10" fill="#111827">x  [T, 3584]</text>
      <path d="M120 84 L120 100 Q120 110 140 110 L220 110" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="220" y="92" width="150" height="36" rx="7" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="295" y="107" text-anchor="middle" font-size="10" font-weight="600" fill="#111827">RMSNorm</text>
      <text x="295" y="121" text-anchor="middle" font-size="8.5" fill="#4B5563">scale-only, no mean shift</text>
      <path d="M370 110 L400 110" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="400" y="86" width="210" height="48" rx="7" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="505" y="106" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Attention (QKV · RoPE · softmax)</text>
      <text x="505" y="123" text-anchor="middle" font-size="8.5" fill="#4F46E5">32 heads · causal mask · GQA-16</text>
      <path d="M610 110 L660 110 Q670 110 670 122 L670 200" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <circle cx="670" cy="212" r="12" fill="#fff" stroke="#444ce7" stroke-width="1.5"></circle>
      <text x="670" y="217" text-anchor="middle" font-size="13" font-weight="700" fill="#444ce7">+</text>
      <path d="M120 200 L658 200" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <text x="380" y="192" text-anchor="middle" font-size="8.5" fill="#444ce7">residual bypass — carries x unchanged</text>
      <path d="M670 224 L670 244 Q670 254 650 254 L590 254" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="420" y="236" width="170" height="36" rx="7" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="505" y="251" text-anchor="middle" font-size="10" font-weight="600" fill="#111827">RMSNorm</text>
      <text x="505" y="265" text-anchor="middle" font-size="8.5" fill="#4B5563">fresh norm before MLP</text>
      <path d="M420 254 L400 254" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="180" y="228" width="220" height="52" rx="7" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="290" y="248" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">SwiGLU MLP</text>
      <text x="290" y="265" text-anchor="middle" font-size="8.5" fill="#4F46E5">3584 → 18432 → 3584</text>
      <path d="M180 254 L140 254 Q120 254 120 266 L120 340" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <circle cx="120" cy="352" r="12" fill="#fff" stroke="#444ce7" stroke-width="1.5"></circle>
      <text x="120" y="357" text-anchor="middle" font-size="13" font-weight="700" fill="#444ce7">+</text>
      <path d="M670 340 Q670 352 650 352 L132 352" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <text x="400" y="344" text-anchor="middle" font-size="8.5" fill="#444ce7">second residual bypass</text>
      <path d="M120 364 L120 420" fill="none" stroke="#444ce7" stroke-width="3"></path>
      <rect x="55" y="420" width="130" height="30" rx="8" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="120" y="439" text-anchor="middle" font-size="10" fill="#111827">x' → next layer</text>
      <circle r="4" fill="#D97706"><animateMotion dur="3.4s" repeatCount="indefinite" begin="0s"><mpath href="#spine"></mpath></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="3s" repeatCount="indefinite" begin=".5s" path="M120 84 L120 100 Q120 110 140 110 L220 110 L400 110 L610 110 L660 110 Q670 110 670 122 L670 200"></animateMotion></circle>
      <circle r="4" fill="#444ce7"><animateMotion dur="3s" repeatCount="indefinite" begin="1.7s" path="M670 224 L670 244 Q670 254 650 254 L420 254 L180 254 L140 254 Q120 254 120 266 L120 340"></animateMotion></circle>
    </svg>

## RMSNorm — Cheaper Than LayerNorm, Just as Effective

LayerNorm normalizes by subtracting the mean and dividing by standard deviation, then applies learned per-dimension scale γ and shift β. **RMSNorm** drops the mean subtraction and the shift:

```bash
LayerNorm:  x̂ = (x − μ) / √(σ² + ε) · γ + β
RMSNorm:    x̂ = x / RMS(x) · γ,      RMS(x) = √(mean(x²) + ε)
```

Mean subtraction costs a full reduction pass and a second elementwise kernel; empirically it contributes little once γ is learned — Llama, Qwen, Mistral, Gemma all use RMSNorm. At d=3584 it saves two memory passes over every block boundary, twice per block, 28 blocks. On memory-bound decode every saved pass is real latency.

<aside class="callout"><strong class="callout__title">Why normalize at all:</strong><div class="callout__body">deep residual stacks accumulate vectors whose norms grow with depth. Un-normalized, later-layer logits explode into saturated softmax and training destabilizes. Norm keeps each sublayer's input on a consistent scale — the residual stream can then grow in <em>direction</em> (meaning), not raw magnitude.</div></aside>

## SwiGLU MLP — The Per-Position Compute

The MLP is where each token's representation is transformed individually — no cross-token mixing. Modern blocks use a **gated linear unit** with SiLU (Swish) activation:

```bash
h = rmsnorm(x)
up   = h @ W_up     # [T, 18432] — expand
gate = h @ W_gate   # [T, 18432] — learned per-neuron gate
ffn  = (SiLU(gate) ⊙ up) @ W_down   # ⊙ = elementwise; → [T, 3584]

SiLU(z) = z · sigmoid(z)   # smooth, non-monotone; ≈ ReLU for large z
```

Three matrices instead of the classic two — W\_gate adds 3584×18432 ≈ 66M parameters per layer. The gate decides, _per neuron and per token_, how much of the up-projection passes through: a soft input-dependent switch. SwiGLU consistently beats ReLU/GeLU MLPs at matched parameter counts; models pay the extra matrix gladly.

| Component | Matrices per layer | Params (d=3584, dff=18432) | Share of model |
| --- | --- | --- | --- |
| Attention (Q,K,V,O) | 4 | ~18.9M | ~13% |
| SwiGLU MLP | 3 | ~198M | ~85% |
| Norms | 2 × γ | ~7k | <1% |

<aside class="callout"><strong class="callout__title">Counter-intuitive but standard:</strong><div class="callout__body">the MLP — not attention — holds ~85% of a decoder's weights. Attention's job is routing and retrieval; the MLP is the knowledge store. This split matters for quantization (the three big MLP matrices usually absorb 4-bit quantization well) and for MTP/speculative decoding designs (which often reuse the shared MLP stack — see the MTP post).</div></aside>

## The Residual Stream — a Shared Bus, Not a Pipeline

The most useful mental model of a transformer: the residual stream is a **writeable memory bus** of d dimensions that every layer reads from (via RMSNorm) and writes to (via its sublayer output, added, never replaced):

```bash
x₀ = embedding(x)
x₁ = x₀ + Attn(Norm(x₀))      # attention writes its findings
x₂ = x₁ + MLP(Norm(x₁))       # MLP writes per-token knowledge
… 28 blocks …
logits = LMHead(Norm(x₅₆))     # only the last position is read at decode
```

Because writes are _added_, information is never destroyed — layer 17 can still read what layer 2 wrote. This explains several phenomena:

### Logit lens

Apply the final LM head to _intermediate_ xℓ and read the prediction at each depth. Predictions sharpen progressively — early layers resolve syntax, later layers commit to content. The stream accumulates the answer before the final norm reads it out.

### Residual edits

Because each sublayer only _adds_, ablating a layer removes its contribution without corrupting the rest — behavior degrades gracefully. Mechanistic interpretability exploits this: activation patching finds where a fact or behavior is written into the stream.

### Pre-norm vs post-norm

Original 2017 transformer: `x + Norm(sublayer(x))` (post-norm) — gradient flow through 28 unscaled additions needs warmup. Modern: `x + sublayer(Norm(x))` (pre-norm) — the identity path is clean, deep stacks train stably. Every mainstream LLM is pre-norm.

### Where depth buys what

Attention layers implement _algorithms_ (moving information between positions — induction heads copy, previous-token heads shift); MLP layers implement _lookup tables_ (stored facts, formatting rules). Depth stacks these alternately: retrieve context with attention, transform it with MLP, 28 times.

## LM Head — Stream to Vocabulary

```bash
logits = Norm(x)[−1] @ Eᵀ     # [T, 3584] @ [3584, 152k] → [T, 152k]
probs  = softmax(logits / temperature)
next   = argmax(probs) | sample(top_p)
```

Two details that matter in practice:

🔗

Weight tying

Many models reuse the embedding matrix E as the LM head (tied embeddings) — saves ~545M parameters at V=152k. Qwen ties; older GPT-2 tied; Llama unties. Tying biases the model toward frequent tokens and constrains very large vocabularies.

🎯

The 152k×d matvec dominates decode cost

At every decode step the final \[3584, 152k\] projection reads ~545M weights (≈1.1 GB at fp16) for a _single token_ — often 15–25% of total decode bandwidth. Serving stacks (MLX, llama.cpp) keep it resident and fuse it with sampling; speculative decoding amortizes it across drafted tokens (see the MTP post).

<aside class="callout"><strong class="callout__title">Common misconception:</strong><div class="callout__body">"transformers are attention." Attention is one of two sublayers. For a 7B model the MLP is ~6× the parameters of attention, and the embedding + LM head together are ~1.1B. The full block — norm, attention, residual, norm, MLP, residual — is the unit that repeats; understanding it end-to-end is understanding the whole architecture.</div></aside>

## KV Cache · Prefill vs Decode · Training

### Inference Economics and Training Mechanics

A trained transformer is used in two radically different regimes. **Prefill** processes the whole prompt at once — a giant matrix multiply, compute-bound. **Decode** emits one token per step, re-reading all weights each time — bandwidth-bound. Everything in inference engineering follows from that asymmetry, and everything in training follows from one objective: predict the next token, everywhere, simultaneously.

Prefill vs decode — two regimes, one model

<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="400" fill="#F8FAFC"></rect>
      <text x="240" y="40" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Prefill — process the prompt</text>
      <rect x="60" y="60" width="360" height="180" rx="10" fill="#fff" stroke="#444ce7" stroke-width="2"></rect>
      <g font-size="8" fill="#1F2937" text-anchor="middle">
        <rect x="80" y="80" width="40" height="24" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect><text x="100" y="96">The</text>
        <rect x="126" y="80" width="40" height="24" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect><text x="146" y="96">cat</text>
        <rect x="172" y="80" width="40" height="24" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect><text x="192" y="96">sat</text>
        <rect x="218" y="80" width="40" height="24" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect><text x="238" y="96">on</text>
        <rect x="264" y="80" width="40" height="24" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect><text x="284" y="96">the</text>
        <rect x="310" y="80" width="40" height="24" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect><text x="330" y="96">mat</text>
        <rect x="356" y="80" width="40" height="24" rx="4" fill="#F3F4F6" stroke="#9CA3AF" stroke-dasharray="2,2"></rect><text x="376" y="96" fill="#6B7280">…</text>
      </g>
      <text x="240" y="140" text-anchor="middle" font-size="10" fill="#4B5563">all T positions in ONE forward pass</text>
      <text x="240" y="160" text-anchor="middle" font-size="10" fill="#4B5563">attention scores: [32, T, T] — huge GEMMs</text>
      <rect x="80" y="180" width="150" height="44" rx="6" fill="#f0fdf4" stroke="#16A34A"></rect>
      <text x="155" y="198" text-anchor="middle" font-size="9.5" font-weight="700" fill="#166534">Compute-bound</text>
      <text x="155" y="213" text-anchor="middle" font-size="8.5" fill="#16A34A">GPU at 60–90% utilization</text>
      <rect x="250" y="180" width="150" height="44" rx="6" fill="#fffbeb" stroke="#D97706"></rect>
      <text x="325" y="198" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">Fills the KV cache</text>
      <text x="325" y="213" text-anchor="middle" font-size="8.5" fill="#D97706">every K,V persisted per layer</text>
      <text x="680" y="40" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">Decode — one token at a time</text>
      <rect x="500" y="60" width="360" height="180" rx="10" fill="#fff" stroke="#D97706" stroke-width="2"></rect>
      <g font-size="8" text-anchor="middle">
        <rect x="520" y="80" width="34" height="22" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect>
        <rect x="560" y="80" width="34" height="22" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect>
        <rect x="600" y="80" width="34" height="22" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect>
        <rect x="640" y="80" width="34" height="22" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect>
        <rect x="680" y="80" width="34" height="22" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect>
        <rect x="720" y="80" width="34" height="22" rx="4" fill="#e0e9ff" stroke="#444ce7"></rect>
        <rect x="760" y="80" width="46" height="22" rx="4" fill="#EEF2FF" stroke="#D97706" stroke-width="1.5"></rect>
        <text x="783" y="95" fill="#92400E" font-weight="700">new</text>
      </g>
      <path id="dc" d="M806 91 Q850 91 850 120 L850 170 Q850 195 820 195 L790 195" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,3"></path>
      <circle r="4" fill="#D97706"><animateMotion dur="2s" repeatCount="indefinite"><mpath href="#dc"></mpath></animateMotion></circle>
      <text x="680" y="140" text-anchor="middle" font-size="10" fill="#4B5563">only the LAST position computed</text>
      <text x="680" y="160" text-anchor="middle" font-size="10" fill="#4B5563">past K,V read from cache — never recomputed</text>
      <rect x="520" y="180" width="150" height="44" rx="6" fill="#fef2f2" stroke="#DC2626"></rect>
      <text x="595" y="198" text-anchor="middle" font-size="9.5" font-weight="700" fill="#991b1b">Bandwidth-bound</text>
      <text x="595" y="213" text-anchor="middle" font-size="8.5" fill="#DC2626">one GEMV per step — ~1–3% FLOPs</text>
      <rect x="690" y="180" width="150" height="44" rx="6" fill="#fffbeb" stroke="#D97706"></rect>
      <text x="765" y="198" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">Cache grows +1 row/layer</text>
      <text x="765" y="213" text-anchor="middle" font-size="8.5" fill="#D97706">2 × L × n_kv × d_h × bytes</text>
      <rect x="60" y="270" width="800" height="110" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="460" y="298" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">Why decode is bandwidth-bound — the arithmetic</text>
      <text x="460" y="322" text-anchor="middle" font-size="9.5" fill="#4F46E5">7B model at fp16 = 14 GB of weights. Each decode step: 2 × 7e9 FLOPs (one GEMV per layer) but must READ all 14 GB from memory.</text>
      <text x="460" y="342" text-anchor="middle" font-size="9.5" fill="#4F46E5">M2 memory bandwidth ≈ 100 GB/s → floor = 14 GB ÷ 100 GB/s = 140 ms/token ≈ 7 tok/s, while the GPU does ~1% of peak FLOPs.</text>
      <text x="460" y="362" text-anchor="middle" font-size="9.5" fill="#4B5563">Bigger batches and speculative decoding both work by reusing each weight read for MORE than one token — the only currencies that matter in decode.</text>
    </svg>

## The KV Cache — What Makes Long Context Expensive

Without a cache, generating token T+1 would recompute attention over all T+1 positions — O(T²) work per step, O(T³) per sequence. The cache stores each layer's K and V for every past position once; each new step appends one row and attends against the full table.

```bash
cache size = 2 · L · T · n_kv · d_head · dtype_bytes
           = 2 · 28 · T · 16 · 112 · 2 bytes
           ≈ 200 KB per token   (reference 7B, GQA-16, fp16)

32k context → ≈ 6.4 GB   ·   128k context → ≈ 25 GB
```

<aside class="callout"><strong class="callout__title">Consequences you can see in production:</strong><div class="callout__body">KV cache — not weights — is what dies first at long context. It's why GQA (÷2 here), quantized KV caches (fp8/int8 → ÷2 again), paged attention (no fragmentation), and linear/attention-hybrid architectures (Qwen3.5's linear-attention layers keep only a fixed-size state, no per-token cache) all exist. Every serving-layer feature for context length is a KV-cache feature.</div></aside>

## Continuous Batching — Serving's Real Trick

Naive batching waits for all requests in a batch to finish — one slow request idles every GPU cycle. **Continuous (iteration-level) batching** rebuilds the batch every step: finished requests leave, waiting requests join mid-generation. Implemented in vLLM, SGLang, and omlx as a scheduler around the model loop.

```bash
# decode loop, conceptually
while batch.not_empty():
    logits = model.forward(last_tokens, kv_caches)   # one step for all
    for req in batch:
        req.append(sample(logits[req], req.sampler_state))
        if req.finished(stop_criteria): batch.retire(req)
    batch.admit(waiting_queue)          # new prefill joins next iteration
```

Combined with **prefill/decode disaggregation** (chunked prefill or separate engines), this keeps the GPU at high utilization: prefill batches are compute-heavy, decode batches are bandwidth-heavy, and mixing them thoughtfully smooths the pipeline.

## Training — One Objective, Stacked Everywhere

Training is stunningly simple relative to inference machinery: run the full sequence through, shift targets by one, and apply cross-entropy at **every position simultaneously**:

```bash
input:  [The, cat, sat, on, the, mat]
target: [cat,  sat, on, the, mat, <eos>]

loss = mean over t of −log P(token_t+1 | tokens_≤t)
      = CE(logits[:, :-1], labels[:, 1:])   # [B, T, V] vs [B, T]
```

### Forward

Full \[B, T\] sequence, causal mask inside attention. Activations for all T positions retained — training is the _prefill_ regime, compute-bound by design.

### Backward

Reverse-mode autodiff through all layers/positions. Memory: activations (~14 GB per 7B layer-stack batch at fp16 with recompute choices) + optimizer states (AdamW: 2 × params) + gradients (1 × params).

### Update

AdamW with weight decay, lr warmup + cosine decay, gradient clipping (usually 1.0). 7B training at these settings is commodity now; the _data_ and RLHF/RL stages dominate cost.

<aside class="callout"><strong class="callout__title">Next-token prediction is the whole curriculum.</strong><div class="callout__body">Induction circuits, syntax, factual recall, even chain-of-thought — all emerge because predicting the next token <em>better</em> requires building internal algorithms and storing knowledge. Post-training (SFT + preference optimization) refines the same objective on curated data; it never changes the architecture or the loss form.</div></aside>

## Reference — Anatomy of a 7B Decoder

| Component | Typical value | Notes |
| --- | --- | --- |
| Layers (L) | 28 | depth — how many attention+MLP alternations |
| Hidden (d) | 3584 | residual stream width |
| Q heads | 32 × 112 | 32·112 = 3584 = d |
| KV heads (GQA) | 16 × 112 | 2 Q per KV |
| MLP hidden | 18432 | ≈ 5.15 × d, SwiGLU-gated |
| Norm | RMSNorm, pre-norm | ×2 per block + final |
| Position | RoPE θ=5e6 | on Q,K; NTK/YaRN for long context |
| Vocab | ~152k | BPE; LM head ≈ 545M params |
| Params total | ~7.6B | MLP ~85%, attention ~13% |

<aside class="callout"><strong class="callout__title">The one-paragraph summary:</strong><div class="callout__body">tokens become vectors by table lookup; 28 identical blocks alternately <em>route information across positions</em> (attention, with RoPE providing relative position and GQA shrinking the KV cache) and <em>transform it per position</em> (SwiGLU MLP), all written additively into a shared residual stream that the final norm reads into vocabulary logits. Training applies next-token cross-entropy everywhere at once; inference reuses the KV cache and lives or dies by memory bandwidth — which is exactly why everything from GQA to speculative decoding (MTP) exists.</div></aside>
