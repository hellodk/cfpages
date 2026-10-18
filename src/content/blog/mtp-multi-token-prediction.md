---
title: "Multi-Token Prediction (MTP) — Complete Visual Guide"
date: 2026-10-18
description: "Decode is memory-bound: every generated token re-reads the entire model from RAM (14 GB per token for a 7B at fp16) to produce a single next token. Multi-Token Prediction attacks this directly — train the model to predict several future tokens per position, then exploit those predictions at"
tags: [llm, inference, mlx]
draft: false
---

Breaking the one-token-per-forward bottleneck · Draft heads · Speculative verification · The λ-weighted training objective

## The Bottleneck · MTP Concept · Training

### Why One Token per Forward Pass Is the Real Limit

Decode is memory-bound: every generated token re-reads the entire model from RAM (14 GB per token for a 7B at fp16) to produce a _single_ next token. **Multi-Token Prediction** attacks this directly — train the model to predict several future tokens per position, then exploit those predictions at inference to draft and verify multiple tokens per forward pass. It appears in two guises: a **training-time objective** (DeepSeek-V3, Qwen3.5) and an **inference-time speedup** (speculative decoding with MTP draft heads).

Same 14 GB weight read — one token vs many, compared

<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="400" fill="#F8FAFC"></rect>
      <text x="230" y="36" text-anchor="middle" font-size="11.5" font-weight="700" fill="#111827">Baseline decode — 1 token per pass</text>
      <rect x="40" y="52" width="380" height="70" rx="9" fill="#EEF2FF" stroke="#DC2626" stroke-width="2"></rect>
      <text x="230" y="80" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Read all weights — 14 GB @ fp16</text>
      <text x="230" y="100" text-anchor="middle" font-size="9" fill="#DC2626">~140 ms on M2-class bandwidth — for ONE token</text>
      <g>
        <rect x="60" y="140" width="52" height="30" rx="5" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
        <text x="86" y="159" text-anchor="middle" font-size="10" font-weight="700" fill="#991b1b">tok</text>
      </g>
      <path id="b1" d="M230 122 L86 140" fill="none" stroke="#DC2626" stroke-width="1.3" stroke-dasharray="4,3"></path>
      <text x="230" y="196" text-anchor="middle" font-size="9.5" fill="#4B5563">4 sequential passes → 4 tokens · 56 GB read · 560 ms</text>
      <g>
        <rect x="130" y="140" width="52" height="30" rx="5" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
        <rect x="190" y="140" width="52" height="30" rx="5" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
        <rect x="250" y="140" width="52" height="30" rx="5" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
        <rect x="310" y="140" width="52" height="30" rx="5" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
        <rect x="370" y="140" width="52" height="30" rx="5" fill="#F3F4F6" stroke="#9CA3AF" stroke-dasharray="3,2"></rect>
        <text x="396" y="159" text-anchor="middle" font-size="9" fill="#6B7280">…</text>
      </g>
      <circle r="4" fill="#DC2626"><animateMotion dur="3s" repeatCount="indefinite" begin="0s" path="M230 122 L86 140"></animateMotion></circle>
      <circle r="4" fill="#DC2626"><animateMotion dur="3s" repeatCount="indefinite" begin=".75s" path="M230 122 L156 140"></animateMotion></circle>
      <circle r="4" fill="#DC2626"><animateMotion dur="3s" repeatCount="indefinite" begin="1.5s" path="M230 122 L216 140"></animateMotion></circle>
      <circle r="4" fill="#DC2626"><animateMotion dur="3s" repeatCount="indefinite" begin="2.25s" path="M230 122 L276 140"></animateMotion></circle>
      <text x="230" y="222" text-anchor="middle" font-size="8.5" fill="#DC2626">each dot = one full 14 GB weight sweep</text>
      <text x="680" y="36" text-anchor="middle" font-size="11.5" font-weight="700" fill="#111827">MTP speculative decode — k tokens per pass</text>
      <rect x="490" y="52" width="380" height="70" rx="9" fill="#EEF2FF" stroke="#16A34A" stroke-width="2"></rect>
      <text x="680" y="80" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Read all weights — 14 GB — ONCE</text>
      <text x="680" y="100" text-anchor="middle" font-size="9" fill="#15803D">forward covers k draft positions in the same sweep</text>
      <g>
        <rect x="530" y="140" width="52" height="30" rx="5" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
        <text x="556" y="159" text-anchor="middle" font-size="9" font-weight="700" fill="#166534">acc</text>
        <rect x="590" y="140" width="52" height="30" rx="5" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
        <text x="616" y="159" text-anchor="middle" font-size="9" font-weight="700" fill="#166534">acc</text>
        <rect x="650" y="140" width="52" height="30" rx="5" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
        <text x="676" y="159" text-anchor="middle" font-size="9" font-weight="700" fill="#166534">acc</text>
        <rect x="710" y="140" width="52" height="30" rx="5" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
        <text x="736" y="159" text-anchor="middle" font-size="9" font-weight="700" fill="#991b1b">rej</text>
        <rect x="770" y="140" width="52" height="30" rx="5" fill="#fffbeb" stroke="#D97706" stroke-width="1.5"></rect>
        <text x="796" y="159" text-anchor="middle" font-size="9" font-weight="700" fill="#92400e">bonus</text>
      </g>
      <path id="b2" d="M680 122 L556 140" fill="none" stroke="#16A34A" stroke-width="1.3" stroke-dasharray="4,3"></path>
      <text x="680" y="196" text-anchor="middle" font-size="9.5" fill="#4B5563">4 accepted tokens from one 14 GB sweep · 140 ms + small draft overhead</text>
      <circle r="4" fill="#16A34A"><animateMotion dur="2s" repeatCount="indefinite" path="M680 122 L556 140"></animateMotion></circle>
      <circle r="4" fill="#16A34A"><animateMotion dur="2s" repeatCount="indefinite" begin=".3s" path="M680 122 L616 140"></animateMotion></circle>
      <circle r="4" fill="#16A34A"><animateMotion dur="2s" repeatCount="indefinite" begin=".6s" path="M680 122 L676 140"></animateMotion></circle>
      <circle r="4" fill="#DC2626"><animateMotion dur="2s" repeatCount="indefinite" begin=".9s" path="M680 122 L736 140"></animateMotion></circle>
      <circle r="4" fill="#D97706"><animateMotion dur="2s" repeatCount="indefinite" begin="1.2s" path="M680 122 L796 140"></animateMotion></circle>
      <text x="680" y="222" text-anchor="middle" font-size="8.5" fill="#166534">rejection sampling keeps the output distribution EXACT — no quality loss</text>
      <rect x="40" y="256" width="830" height="124" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="455" y="286" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">The asymmetry MTP exploits</text>
      <text x="455" y="310" text-anchor="middle" font-size="9.5" fill="#4F46E5">Decode arithmetic intensity: ~1 FLOP per byte read. A forward pass that scores 8 positions costs ≈ the same WEIGHT reads as one position — attention adds only O(T) cache traffic per position.</text>
      <text x="455" y="330" text-anchor="middle" font-size="9.5" fill="#4F46E5">So the marginal cost of verifying k extra drafted tokens ≈ one extra LM-head matvec + attention over the cache. The expensive resource (weight bandwidth) is amortized across everything the pass accepts.</text>
      <text x="455" y="350" text-anchor="middle" font-size="9.5" fill="#4B5563">MTP's specific contribution: the drafts come from the MODEL ITSELF (shared trunk + tiny draft module), not a separate small draft model — better acceptance, zero extra weight memory.</text>
    </svg>

## Two Faces of One Idea

### Face 1 — Training objective

During pretraining, every position predicts not just token t+1 but t+2, t+3 … via extra prediction modules sharing the trunk. DeepSeek-V3 uses depth D=1 with a λ=0.3 loss weight; Qwen3.5 ships models whose configs carry `mtp_num_hidden_layers`. The model is _trained to look ahead_, which improves internal representations — and, conveniently, produces ready-made draft heads.

### Face 2 — Inference mechanism

At serving time the MTP module drafts candidate future tokens; the main trunk then _verifies_ all candidates in one forward pass using standard speculative-decoding rejection sampling — output distribution provably identical to plain sampling. The training objective and the inference trick are two halves of the same design: MTP makes speculative decoding cheap by baking the draft head into the model.

<aside class="callout"><strong class="callout__title">Related but distinct designs:</strong><div class="callout__body">Medusa adds several independent prediction heads at layer L (drafts a tree, verified with tree attention). EAGLE/EAGLE-3 autoregress in <em>feature space</em> — a small transformer over hidden states instead of tokens. Classic speculative decoding (Leviathan et al. 2023 / Chen et al. 2023) uses a separate tiny draft model. MTP sits in the middle: a token-space draft module that is <em>part of the trained model</em>, sharing its embedding and output head.</div></aside>

## The MTP Training Objective

Plain next-token training: at every position t, minimize cross-entropy against token t+1 under the trunk's hidden state Ht. MTP adds, at every position, **D additional prediction heads** that each see the trunk state _fused with the embedding of the actual future token_ and must predict the token beyond:

```bash
# depth-D MTP, DeepSeek-V3 formulation
main loss:   L_main = CE(Head(H_t),            token[t+1])

MTP module i (i = 1..D):
  h_t^(i) = Block_i( Proj_i( [ H_t^(i-1) ⊕ Emb(token[t+i]) ] ) )
  L_mtp_i = CE( SharedHead(h_t^(i)),          token[t+i+1] )

total:       L = L_main + λ · Σᵢ L_mtp_i        # λ = 0.3 in DeepSeek-V3
```

The fusion line is the crux: the module receives the trunk's hidden state _and_ the embedding of the token actually occurring at t+i (teacher-forced during training). It must predict one step _beyond_ what it was told — so it learns "given where the trunk is and what token was at the horizon, what comes next." At inference, the same module gets its own predicted token instead of the true one, and generates drafts autoregressively.

<aside class="callout"><strong class="callout__title">Why λ = 0.3 and not bigger:</strong><div class="callout__body">the MTP losses are auxiliary — the main next-token objective must stay dominant or the trunk over-optimizes for the lookahead task. DeepSeek-V3 reports the dual benefit: mild gains in the main benchmark metrics <em>plus</em> a draft head achieving 80–90% single-token acceptance, i.e. the auxiliary task improved representation quality <em>and</em> yielded free inference speedup.</div></aside>

## Module Anatomy · Shared Head · Hidden Fusion

### Inside the MTP Module — Deep Internals

An MTP module is deliberately tiny — under 1% of the model — yet it can draft because it rides entirely on the main trunk's infrastructure: the **embedding table**, the **output head**, and the trunk's already-computed **hidden states and KV cache**. Here is the exact tensor flow, module by module.

MTP module anatomy — tensor flow at draft time (D=1)

<svg viewBox="0 0 900 440" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="440" fill="#F8FAFC"></rect>
      <rect x="40" y="40" width="200" height="64" rx="9" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="140" y="66" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Trunk hidden H_t</text>
      <text x="140" y="84" text-anchor="middle" font-size="8.5" fill="#4F46E5">[1, d] — last trunk layer output</text>
      <rect x="40" y="140" width="200" height="64" rx="9" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="140" y="164" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Embed(ŷ_t)</text>
      <text x="140" y="182" text-anchor="middle" font-size="8.5" fill="#4B5563">shared embedding table</text>
      <path d="M240 72 L300 100" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <path d="M240 172 L300 120" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="300" y="78" width="170" height="64" rx="9" fill="#fff" stroke="#7c3aed" stroke-width="2"></rect>
      <text x="385" y="104" text-anchor="middle" font-size="10.5" font-weight="700" fill="#6d28d9">Concat → Linear_proj</text>
      <text x="385" y="122" text-anchor="middle" font-size="8.5" fill="#4B5563">[1, 2d] → [1, d]</text>
      <circle r="3.5" fill="#7c3aed"><animateMotion dur="2.4s" repeatCount="indefinite" path="M240 72 L300 100"></animateMotion></circle>
      <circle r="3.5" fill="#7c3aed"><animateMotion dur="2.4s" repeatCount="indefinite" begin="1s" path="M240 172 L300 120"></animateMotion></circle>
      <path d="M470 110 L510 110" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="510" y="52" width="220" height="116" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="620" y="78" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Transformer Block (×1–2)</text>
      <text x="620" y="98" text-anchor="middle" font-size="8.5" fill="#4F46E5">RMSNorm · attention · MLP</text>
      <text x="620" y="116" text-anchor="middle" font-size="8.5" fill="#4B5563">attends over MTP-layer KV state</text>
      <text x="620" y="136" text-anchor="middle" font-size="8.5" fill="#4B5563">≈ 200–400M params vs 7B trunk</text>
      <circle cx="620" cy="150" r="0" fill="#444ce7" opacity=".5">
        <animate attributeName="r" values="0;26" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".5;0" dur="2.4s" repeatCount="indefinite"></animate>
      </circle>
      <path d="M730 110 L770 110" fill="none" stroke="#444ce7" stroke-width="1.5"></path>
      <rect x="770" y="78" width="110" height="64" rx="9" fill="#fff" stroke="#16A34A" stroke-width="2"></rect>
      <text x="825" y="104" text-anchor="middle" font-size="10.5" font-weight="700" fill="#166534">Shared LM Head</text>
      <text x="825" y="122" text-anchor="middle" font-size="8.5" fill="#4B5563">[1,d] → [1,V]</text>
      <path d="M825 142 L825 190" fill="none" stroke="#16A34A" stroke-width="1.5"></path>
      <rect x="745" y="190" width="160" height="46" rx="8" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="825" y="210" text-anchor="middle" font-size="10" font-weight="700" fill="#166534">Draft token ŷ_t+1</text>
      <text x="825" y="226" text-anchor="middle" font-size="8" fill="#166534">feeds next module step (recursion)</text>
      <path id="loop" d="M825 236 Q825 300 640 320 Q380 340 140 310 L140 204" fill="none" stroke="#D97706" stroke-width="1.5" stroke-dasharray="5,4"></path>
      <circle r="4" fill="#D97706"><animateMotion dur="3s" repeatCount="indefinite"><mpath href="#loop"></mpath></animateMotion></circle>
      <text x="480" y="352" text-anchor="middle" font-size="8.5" fill="#92400e">ŷ becomes the next module input — drafting continues (D steps or until stop)</text>
      <rect x="40" y="380" width="620" height="46" rx="8" fill="#EEF2FF" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="350" y="400" text-anchor="middle" font-size="9.5" font-weight="700" fill="#111827">Zero new big weights: embedding + head + trunk KV cache are all REUSED</text>
      <text x="350" y="416" text-anchor="middle" font-size="8.5" fill="#4F46E5">the module adds only its proj layer + 1–2 transformer blocks + an extra KV state</text>
    </svg>

## Component by Component

1

RMSNorm (module input)

Normalizes the fused \[trunk\_hidden ⊕ embed\] projection before it enters the block — same recipe as the trunk, different learned parameters.

2

Linear projection — the fusion point

`[H_t ⊕ Emb(token)] ∈ ℝ^2d → ℝ^d`. This single matrix is where "where the trunk is" and "what the horizon token was" merge into one vector the block can process at the trunk's native dimension.

3

Transformer block(s)

1–2 standard pre-norm blocks (attention + SwiGLU). They maintain their _own_ KV cache — a separate, small cache holding the MTP layer's keys/values — while reusing the trunk's weights pattern (often a copied first layer, often untied in training but architecturally identical).

4

Shared output head

The trunk's LM head (or tied embedding) projects the module's final hidden to vocabulary logits. Sharing forces the module into the trunk's "logit space" — its drafts are directly comparable to trunk logits during verification, and adds no V×d parameters.

<aside class="callout"><strong class="callout__title">The catch inside the cache story:</strong><div class="callout__body">MTP doesn't get verification for free. Verification needs the trunk to score all draft positions — which means the <em>trunk</em> must run attention over those positions too. Implementations either (a) run one batched forward over [context + D draft positions], appending the drafts' KV as they're verified, or (b) keep a speculative buffer and roll it back on rejection. Either way the MTP layer's KV cache is an extra, usually small, memory line item — visible in per-layer cache accounting on serving stacks.</div></aside>

## Drafting Loop — Exact Pseudocode

```bash
# D = mtp depth (DeepSeek-V3, Qwen3.5: 1); k = extra drafted tokens
drafts = []
h = trunk_hidden(t)                       # trunk has processed through token t
tok = last_token                          # ŷ_t — the token just emitted/committed

for i in range(k):
    x = mtp_proj(concat(h, emb(tok)))     # [2d] → [d] fusion
    h = mtp_block(x, mtp_cache[i])        # 1–2 layers, own small KV
    logits = shared_head(h)               # reuse trunk LM head
    tok = argmax/sample(logits)           # draft token, NOT committed yet
    drafts.append(tok)

# verification: trunk scores all drafts in ONE batched forward
for j, d in enumerate(drafts):
    accept, commit = verify(d, trunk_logits[j])   # rejection sampling (Tab 3)
    if not accept: truncate remaining drafts; sample replacement from residual
    if all_accepted: bonus_token = sample(trunk_logits[k])  # free extra token
```

<aside class="callout"><strong class="callout__title">Cost accounting per iteration:</strong><div class="callout__body">draft phase = k passes through a ~1%-size module (still reads <em>trunk</em> hidden + its own tiny weights — cheap but not free); verify phase = 1 trunk pass covering k+1 positions. Net win requires acceptance high enough that saved passes &gt; draft overhead. At 85% single-token acceptance and k=1: ~1.85× decode. This is why MTP models are the ones where speculative decoding actually pays off — hand-picked draft models often can't beat the acceptance threshold on code/math domains.</div></aside>

## Qwen3.5 — MTP Meets Hybrid Attention

Qwen3.5-style architectures expose MTP in their config as `mtp_num_hidden_layers` — your cluster's `mlx_model_info` collector reads exactly this field and exports it as `mlx_model_info{attr="mtp_layers"}` to Prometheus, feeding the "MTP layers" panel of the model-internals dashboard. These models pair MTP with **hybrid linear attention**:

### Linear-attention layers

Fixed-size recurrent state instead of a per-token KV cache (128-d key/value, 4-tap conv on inputs) — constant memory per layer regardless of context length.

### Grouped full attention

GQA layers (16 KV heads on the 7B) keep genuine retrieval ability where it matters; the linear layers absorb the "carry state" workload.

### \+ 1 MTP layer

One draft module on top — the served model can emit 2× tokens per verified pass with the acceptance rate its training objective bought.

The combination is coherent once you see all three through the bandwidth lens: linear attention cuts the KV-cache half of decode traffic, GQA halves the rest, and MTP amortizes the weight-read half across multiple accepted tokens. Three independent attacks on the same memory-bound bottleneck.

## Draft & Verify · Acceptance Math · Observability

### Verification, the Math, and Watching It in Production

Speculative decoding is only useful if it is **lossless** — the verified output distribution must be _exactly_ what plain sampling would have produced. The rejection-sampling construction achieves this, and its acceptance statistics dictate the real-world speedup. Then: what to measure when it's running on your hardware.

Rejection sampling — one verification step, k=3 drafts

<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="400" fill="#F8FAFC"></rect>
      <text x="450" y="34" text-anchor="middle" font-size="10.5" fill="#4B5563">per position: accept draft with probability min(1, p(x)/q(x)) — p = trunk, q = MTP module</text>
      <rect x="40" y="56" width="260" height="120" rx="10" fill="#fff" stroke="#16A34A" stroke-width="2"></rect>
      <text x="170" y="80" text-anchor="middle" font-size="10.5" font-weight="700" fill="#166534">Position 1 — accept</text>
      <text x="170" y="102" text-anchor="middle" font-size="9" fill="#4B5563">draft x="the"  q(x)=0.60</text>
      <text x="170" y="119" text-anchor="middle" font-size="9" fill="#4B5563">trunk p(x)=0.72  →  min(1, 1.2)=1</text>
      <text x="170" y="142" text-anchor="middle" font-size="9.5" font-weight="700" fill="#166534">committed as-is — zero extra cost</text>
      <circle cx="290" cy="66" r="5" fill="#16A34A"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"></animate></circle>
      <rect x="320" y="56" width="260" height="120" rx="10" fill="#fff" stroke="#16A34A" stroke-width="2"></rect>
      <text x="450" y="80" text-anchor="middle" font-size="10.5" font-weight="700" fill="#166534">Position 2 — accept</text>
      <text x="450" y="102" text-anchor="middle" font-size="9" fill="#4B5563">draft x="cat"  q(x)=0.44</text>
      <text x="450" y="119" text-anchor="middle" font-size="9" fill="#4B5563">trunk p(x)=0.51  →  min(1, 1.16)=1</text>
      <text x="450" y="142" text-anchor="middle" font-size="9.5" font-weight="700" fill="#166534">committed as-is</text>
      <circle cx="570" cy="66" r="5" fill="#16A34A"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite" begin=".5s"></animate></circle>
      <rect x="600" y="56" width="260" height="120" rx="10" fill="#fff" stroke="#DC2626" stroke-width="2"></rect>
      <text x="730" y="80" text-anchor="middle" font-size="10.5" font-weight="700" fill="#991b1b">Position 3 — reject</text>
      <text x="730" y="102" text-anchor="middle" font-size="9" fill="#4B5563">draft x="runs"  q(x)=0.38</text>
      <text x="730" y="119" text-anchor="middle" font-size="9" fill="#4B5563">trunk p(x)=0.11  →  0.11/0.38 = 0.29 &lt; coin</text>
      <text x="730" y="139" text-anchor="middle" font-size="9.5" font-weight="700" fill="#991b1b">discard draft; sample replacement</text>
      <text x="730" y="153" text-anchor="middle" font-size="8.5" fill="#991b1b">from residual  max(0, p−q)/Σ(p−q)₊  →  "sits"</text>
      <circle cx="850" cy="66" r="5" fill="#DC2626"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"></animate></circle>
      <rect x="40" y="200" width="820" height="88" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="450" y="228" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">Why the output is EXACTLY the trunk's distribution</text>
      <text x="450" y="252" text-anchor="middle" font-size="9.5" fill="#4F46E5">accept keeps x with prob min(1, p(x)/q(x)); reject then resamples from the residual (p−q)₊ normalized. Summed over both paths:</text>
      <text x="450" y="272" text-anchor="middle" font-size="9.5" fill="#4B5563">P(output = x) = q(x)·min(1, p/q) + [reject prob]·residual(x) = p(x)  — for every x. No approximation, no quality drift.</text>
      <rect x="40" y="310" width="390" height="72" rx="10" fill="#fff" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="235" y="336" text-anchor="middle" font-size="10" font-weight="700" fill="#166534">Bonus token on full acceptance</text>
      <text x="235" y="356" text-anchor="middle" font-size="8.5" fill="#4B5563">if all k drafts pass, the trunk's logits at position k+1</text>
      <text x="235" y="370" text-anchor="middle" font-size="8.5" fill="#4B5563">yield one more committed token — the pass paid for k+1.</text>
      <rect x="470" y="310" width="390" height="72" rx="10" fill="#fff" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="665" y="336" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">Partial rejection truncates</text>
      <text x="665" y="356" text-anchor="middle" font-size="8.5" fill="#4B5563">everything after the first reject is thrown away —</text>
      <text x="665" y="370" text-anchor="middle" font-size="8.5" fill="#4B5563">drafts after a wrong guess were conditioned on it.</text>
    </svg>

## The Acceptance Math — What Speedup Actually Looks Like

Let α = per-token acceptance probability (assumed roughly stationary), k = draft length. The classic sequential-rejection result: the number of accepted tokens per verification pass is geometric, with expected value:

```bash
E[accepted per pass] ≈ (1 − α^(k+1)) / (1 − α)        # incl. bonus token

α = 0.85, k = 1  → 1.85 tokens/pass  → ~1.85×  # D=1 MTP sweet spot
α = 0.85, k = 3  → 2.44 tokens/pass  → ~2.4×   # diminishing returns
α = 0.70, k = 1  → 1.70 tokens/pass  → but draft cost eats it → ~1.2–1.4×
α = 0.40, k = 1  → < 1.4/pass → disable — you're SLOWER than plain decode
```

| Factor | Effect on α | Notes |
| --- | --- | --- |
| domain shift | α ↓↓ | draft module trained on pretraining mix; code/math/JSON tend to accept worse than prose |
| temperature ↑ | α ↓ | high-temp sampling diverges from the module's argmax-ish drafts; greedy ≈ best case |
| context length ↑ | α ~ flat | module sees trunk hidden — context quality transfers through the trunk, not the module |
| MTP trained-in (λ-loss) | α ↑ | the entire point: the module was optimized jointly with the trunk |

<aside class="callout"><strong class="callout__title">The operational rule:</strong><div class="callout__body">MTP/speculative is a runtime decision, not a model property. Serving stacks should measure realized acceptance per request and fall back to plain decode when it drops — a 0.4-acceptance domain with k=3 drafts is a guaranteed regression. When it works, speedup is free quality: lossless by construction.</div></aside>

## Where Verification Sits in the Forward Pass

```bash
# verification as ONE trunk forward over [context … drafts]
seq      = [committed_tokens … draft_tokens]          # k drafts appended
logits   = trunk(seq, kv_cache)        # batched prefill-style pass, k+1 new positions
         = trunk computes ALL positions' distributions in one weight read ✓

for j in range(k):
    p_j = softmax(logits[ctx_len + j − 1])            # trunk at draft position j
    q_j = mtp_probs[j]                                # module's draft distribution
    if uniform() > min(1, p_j[draft_j] / q_j[draft_j]):
        rollback: drop drafts > j, append sample(residual(p_j − q_j))
        break
else:
    append sample(p_k)                                # bonus token
trim kv_cache to committed length                     # rejected positions never persisted
```

The subtle implementation detail: during verification the trunk must **not** pollute its KV cache with positions that get rejected. Practical approaches: compute draft-position KV into a scratch region and only "commit" on acceptance, or cache-then-trim. On MLX, where the KV cache is per-layer mlx arrays in unified memory, the trim is an O(1) length bookkeeping change — the scratch buffers get overwritten next pass.

## Observability — Watching MTP on a Real Cluster

On the mlx-oc monitored fleet, MTP is a first-class model attribute, scraped alongside every other architecture fact:

```bash
# Prometheus — model capability inventory (per model label)
mlx_model_info{model="qwen3.5-7b", attr="mtp_layers"}            1
mlx_model_info{model="qwen3.5-7b", attr="linear_key_heads"}      16
mlx_model_info{model="qwen3.5-7b", attr="linear_conv_kernel_dim"} 4

# Grafana model-internals dashboard surfaces it as a capability card:
# "Linear attention · MTP layers · KV dims" — config truth, not a guess
```

### What config-level metrics give you

`mtp_layers > 0` tells you the deployed checkpoint _can_ draft — the capability baseline for capacity planning (extra MTP KV state) and for interpreting decode-rate panels: a model with MTP enabled should show ~1.5–1.9× tok/s vs the same trunk without it, and a flat rate with MTP enabled is a red flag that verification is disabled server-side.

### What to add for full MTP SLOs

The metric that actually decides value: **acceptance rate** (accepted/committed per pass) and **draft length** histograms from the serving layer, labeled by model and endpoint. Combined with `mlx_kv_*` and `mlx_net_*` (ring traffic), you can attribute any tok/s regression to domain shift vs cache pressure vs network — the same triage discipline as every other resource, applied to a new one: _speculative efficiency_.

## Design Spectrum — MTP Among Its Peers

| Approach | Draft source | Extra memory | Lossless? | Typical speedup |
| --- | --- | --- | --- | --- |
| Plain decode | — | — | — | 1× |
| Spec. + tiny draft model | separate 100–500M model | draft weights + cache | yes | 1.5–2.5× |
| Medusa | N heads on trunk layer L | heads + tree KV buffers | yes (tree verify) | 2–3× |
| EAGLE-3 | feature-space autoregression | ~150M feature module | yes | 2.5–3.5× |
| MTP (DSv3-style) | trained-in module, shared head | <1% weights + small KV | yes | 1.5–1.9× (D=1) |

<aside class="callout"><strong class="callout__title">The one-paragraph summary:</strong><div class="callout__body">MTP makes the model predict multiple tokens ahead at training time via a tiny module fused from trunk hidden state + future-token embedding, sharing the big embedding and LM head, trained with a λ-weighted auxiliary loss. At inference the same module drafts, and the trunk verifies all drafts in a single weight read via lossless rejection sampling — converting decode's wasted bandwidth headroom into accepted tokens. On hybrid models like Qwen3.5 it's the third pillar of decode efficiency alongside linear attention (no KV growth) and GQA (smaller KV), and it's the one you can watch live: <code>mlx_model_info{attr="mtp_layers"}</code> on the cluster dashboard tells you which deployed models carry the capability.</div></aside>
