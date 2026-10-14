---
title: "Tensor Parallelism in oMLX — Complete Visual Guide"
date: 2026-08-21
description: "Understanding tensor parallelism, attention heads, and model configuration in oMLX. Which models support it, how to read config.json, and why it matters."
tags: [mlx, llm, tensor-parallelism, inference]
cover: "assets/images/covers/tensor-parallelism-omlx.svg"
draft: false
---

Correction — 22 Aug 2026

The 1.78x figure throughout this post is **oMLX's own published number** for a 27B model across two Macs over Thunderbolt RDMA — it is not a general property of tensor parallelism and was not reproduced here. The Phi / Gemma / Mistral rows previously read “Partial”; all of them in fact return `_supports_tensor_parallel = False`. Separately, the error `no tensor-parallel degree divides N nodes across architecture dimensions (...)` is unreliable — it can fire when those dimensions divide the node count exactly. See `MODELS.md` and upstream issues jundot/omlx#3021 and #3022.

Complete Visual Guide — Understanding Attention Heads, Model Configuration, and Distributed Inference

1\. Overview 2\. Attention Architecture 3\. Pipeline Parallelism 4\. Supported Models 5\. Config.json Guide

### What is Tensor Parallelism?

Split a model's layers across multiple nodes so they compute every token together. oMLX reports 1.78x on a 27B across two Macs over Thunderbolt RDMA.

A — Single Node vs. Tensor Parallel

<svg viewBox="0 0 600 300" xmlns="http://www.w3.org/2000/svg">
          <text x="80" y="25" font-size="14" font-weight="600" fill="#444CE7">Single Node</text>
          <rect x="30" y="45" width="100" height="200" fill="#E0E7FF" stroke="#444CE7" stroke-width="2" rx="4"></rect>
          <text x="80" y="95" font-size="12" font-weight="500" text-anchor="middle" fill="#111827">Layer 1</text>
          <text x="80" y="135" font-size="12" font-weight="500" text-anchor="middle" fill="#111827">Layer 2</text>
          <text x="80" y="175" font-size="12" font-weight="500" text-anchor="middle" fill="#111827">Layer 3</text>
          <text x="80" y="215" font-size="12" font-weight="500" text-anchor="middle" fill="#111827">Layer 4</text>
          <text x="80" y="270" font-size="11" text-anchor="middle" fill="#4B5563">Fast, but token latency limited by model size</text>
          <path d="M 160 145 L 210 145" stroke="#D1D5DB" stroke-width="2" fill="none" marker-end="url(#arrowhead)"></path>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#D1D5DB"></polygon>
            </marker>
          </defs>
          <text x="420" y="25" font-size="14" font-weight="600" fill="#444CE7">Tensor Parallel (2 Nodes)</text>
          <rect x="330" y="45" width="80" height="200" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
          <text x="370" y="95" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L1 ½</text>
          <text x="370" y="135" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L2 ½</text>
          <text x="370" y="175" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L3 ½</text>
          <text x="370" y="215" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L4 ½</text>
          <text x="370" y="250" font-size="11" text-anchor="middle" fill="#0284C7" font-weight="500">Node 1</text>
          <rect x="430" y="45" width="80" height="200" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
          <text x="470" y="95" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L1 ½</text>
          <text x="470" y="135" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L2 ½</text>
          <text x="470" y="175" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L3 ½</text>
          <text x="470" y="215" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">L4 ½</text>
          <text x="470" y="250" font-size="11" text-anchor="middle" fill="#0284C7" font-weight="500">Node 2</text>
          <path d="M 405 100 Q 420 85 445 100" stroke="#0284C7" stroke-width="1.5" fill="none" stroke-dasharray="4"></path>
          <path d="M 405 140 Q 420 125 445 140" stroke="#0284C7" stroke-width="1.5" fill="none" stroke-dasharray="4"></path>
          <path d="M 405 180 Q 420 165 445 180" stroke="#0284C7" stroke-width="1.5" fill="none" stroke-dasharray="4"></path>
          <text x="420" y="270" font-size="11" text-anchor="middle" fill="#4B5563">Both nodes work on every token simultaneously</text>
        </svg>

**When to use:** When your model has many attention heads that divide evenly by the number of nodes, and you have a fast link (Thunderbolt, RDMA).

### The Trade-off

### ✓ Tensor Parallelism

**Faster responses.** oMLX's published figure is 1.78x, measured on a 27B over Thunderbolt RDMA — not a general guarantee.

⚠ Requires fast link between nodes and even head division.

Best for speed

### → Pipeline Parallelism

**Bigger models:** Each node holds different layers, no model size limit.

✓ Works on any link, any model.

Best for capacity

### How Attention Heads Work

The dimensions that matter for tensor parallelism, explained visually.

B — Multi-Head Attention Architecture

<svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg">
          <text x="50" y="30" font-size="13" font-weight="600" fill="#111827">Query (24 heads)</text>
          <g id="query-heads">
            <rect x="50" y="45" width="560" height="60" fill="none" stroke="#444CE7" stroke-width="2" stroke-dasharray="4" rx="4"></rect>
            <rect x="55" y="50" width="20" height="50" fill="#E0E7FF" stroke="#444CE7" stroke-width="1"></rect>
            <text x="65" y="83" font-size="9" text-anchor="middle" fill="#444CE7">1</text>
            <rect x="80" y="50" width="20" height="50" fill="#E0E7FF" stroke="#444CE7" stroke-width="1"></rect>
            <text x="90" y="83" font-size="9" text-anchor="middle" fill="#444CE7">2</text>
            <rect x="105" y="50" width="20" height="50" fill="#E0E7FF" stroke="#444CE7" stroke-width="1"></rect>
            <text x="115" y="83" font-size="9" text-anchor="middle" fill="#444CE7">3</text>
            <text x="150" y="83" font-size="10" font-weight="500" fill="#4B5563">...</text>
            <rect x="180" y="50" width="20" height="50" fill="#E0E7FF" stroke="#444CE7" stroke-width="1"></rect>
            <text x="190" y="83" font-size="9" text-anchor="middle" fill="#444CE7">24</text>
          </g>
          <text x="50" y="140" font-size="13" font-weight="600" fill="#111827">Key-Value (with GQA: 8 heads)</text>
          <text x="50" y="160" font-size="11" fill="#4B5563">Grouped Query Attention: Many query heads share one KV head</text>
          <g id="kv-heads">
            <rect x="50" y="175" width="560" height="60" fill="none" stroke="#0891B2" stroke-width="2" stroke-dasharray="4" rx="4"></rect>
            <rect x="55" y="180" width="65" height="50" fill="#CFFAFE" stroke="#0891B2" stroke-width="1"></rect>
            <text x="87" y="213" font-size="9" text-anchor="middle" fill="#0891B2">KV 1</text>
            <rect x="125" y="180" width="65" height="50" fill="#CFFAFE" stroke="#0891B2" stroke-width="1"></rect>
            <text x="157" y="213" font-size="9" text-anchor="middle" fill="#0891B2">KV 2</text>
            <rect x="195" y="180" width="65" height="50" fill="#CFFAFE" stroke="#0891B2" stroke-width="1"></rect>
            <text x="227" y="213" font-size="9" text-anchor="middle" fill="#0891B2">KV 3</text>
            <text x="280" y="213" font-size="10" font-weight="500" fill="#4B5563">...</text>
            <rect x="310" y="180" width="65" height="50" fill="#CFFAFE" stroke="#0891B2" stroke-width="1"></rect>
            <text x="342" y="213" font-size="9" text-anchor="middle" fill="#0891B2">KV 8</text>
          </g>
          <text x="50" y="280" font-size="12" font-weight="600" fill="#111827">Why This Matters for Tensor Parallelism:</text>
          <text x="50" y="305" font-size="11" fill="#4B5563">To split a model across 2 nodes:</text>
          <text x="70" y="325" font-size="11" fill="#4B5563">• 24 query heads ÷ 2 = 12 heads per node ✓ (divides evenly)</text>
          <text x="70" y="345" font-size="11" fill="#4B5563">• 8 KV heads ÷ 2 = 4 heads per node ✓ (divides evenly)</text>
        </svg>

**Key Concept:** Tensor parallelism requires all architecture dimensions to divide evenly by the number of nodes. If you have 24 heads and 2 nodes, that works. If you have 23 heads and 2 nodes, it doesn't.

C — Sharding a Layer Across Two Nodes

<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
          <text x="100" y="25" font-size="12" font-weight="600" fill="#0284C7">Node 1 (Mac mini 1)</text>
          <rect x="30" y="40" width="140" height="180" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
          <text x="100" y="75" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">Query Heads 1-12</text>
          <text x="100" y="105" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">KV Heads 1-4</text>
          <text x="100" y="165" font-size="11" text-anchor="middle" fill="#4B5563">Compute attention</text>
          <text x="100" y="182" font-size="11" text-anchor="middle" fill="#4B5563">for 12 heads</text>
          <path d="M 175 130 L 200 130" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow-orange)"></path>
          <text x="187" y="120" font-size="10" fill="#F59E0B" font-weight="500">All-reduce</text>
          <defs>
            <marker id="arrow-orange" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
            </marker>
          </defs>
          <text x="530" y="25" font-size="12" font-weight="600" fill="#0284C7">Node 2 (Mac mini 2)</text>
          <rect x="460" y="40" width="140" height="180" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
          <text x="530" y="75" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">Query Heads 13-24</text>
          <text x="530" y="105" font-size="11" font-weight="500" text-anchor="middle" fill="#111827">KV Heads 5-8</text>
          <text x="530" y="165" font-size="11" text-anchor="middle" fill="#4B5563">Compute attention</text>
          <text x="530" y="182" font-size="11" text-anchor="middle" fill="#4B5563">for 12 heads</text>
          <path d="M 175 210 L 200 230 L 460 230 L 485 210" stroke="#7C3AED" stroke-width="3" fill="none"></path>
          <text x="330" y="250" font-size="11" text-anchor="middle" fill="#7C3AED" font-weight="500">Thunderbolt (50 GB/s)</text>
          <text x="330" y="270" font-size="10" text-anchor="middle" fill="#4B5563">Gradient and activation sync per layer</text>
        </svg>

### Pipeline Parallelism — The Alternative

When tensor parallelism won't work, split the model's layers across nodes instead.

D — Pipeline vs. Tensor Parallelism

<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
          <text x="100" y="25" font-size="12" font-weight="600" fill="#444CE7">Tensor Parallelism</text>
          <text x="100" y="45" font-size="10" fill="#4B5563">Both nodes work on every token</text>
          <rect x="30" y="65" width="70" height="180" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
          <text x="65" y="85" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L1 ½</text>
          <text x="65" y="110" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L2 ½</text>
          <text x="65" y="135" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L3 ½</text>
          <text x="65" y="160" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L4 ½</text>
          <text x="65" y="185" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L5 ½</text>
          <path d="M 105 155 L 125 155" stroke="#F59E0B" stroke-width="2" fill="none"></path>
          <text x="115" y="150" font-size="9" fill="#F59E0B" font-weight="500">Sync</text>
          <rect x="130" y="65" width="70" height="180" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
          <text x="165" y="85" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L1 ½</text>
          <text x="165" y="110" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L2 ½</text>
          <text x="165" y="135" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L3 ½</text>
          <text x="165" y="160" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L4 ½</text>
          <text x="165" y="185" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L5 ½</text>
          <text x="100" y="270" font-size="10" text-anchor="middle" fill="#4B5563">Faster latency, but needs a fast link and even head division</text>
          <text x="500" y="25" font-size="12" font-weight="600" fill="#D97706">Pipeline Parallelism</text>
          <text x="500" y="45" font-size="10" fill="#4B5563">Each node holds different layers</text>
          <rect x="430" y="65" width="70" height="180" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="4"></rect>
          <text x="465" y="85" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L1</text>
          <text x="465" y="110" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L2</text>
          <text x="465" y="135" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L3</text>
          <text x="465" y="185" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">Node 1</text>
          <path d="M 505 155 L 525 155" stroke="#7C3AED" stroke-width="2" fill="none" marker-end="url(#arrow-pipeline)"></path>
          <text x="515" y="150" font-size="9" fill="#7C3AED" font-weight="500">Seq</text>
          <defs>
            <marker id="arrow-pipeline" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#7C3AED"></polygon>
            </marker>
          </defs>
          <rect x="530" y="65" width="70" height="180" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="4"></rect>
          <text x="565" y="85" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L4</text>
          <text x="565" y="110" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L5</text>
          <text x="565" y="185" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">Node 2</text>
          <text x="500" y="270" font-size="10" text-anchor="middle" fill="#4B5563">Works on any model and any link</text>
        </svg>

### How Pipeline Parallelism Works

1.  **Node 1 processes token through layers 1-3**

    All attention heads and weights for those layers stay on Node 1

2.  **Hidden states are sent to Node 2**

    Only the intermediate results (small tensors) cross the Thunderbolt link

3.  **Node 2 processes layers 4-5**

    Completes the forward pass

4.  **One full token generated per iteration**

    Takes longer than tensor parallelism, but uses less memory

E — Pipeline Parallelism Timeline

<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">
          <text x="50" y="25" font-size="11" font-weight="600" fill="#111827">Token 1</text>
          <rect x="50" y="40" width="80" height="40" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="3"></rect>
          <text x="90" y="67" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L1-3</text>
          <text x="90" y="82" font-size="9" text-anchor="middle" fill="#4B5563">Node 1</text>
          <path d="M 135 60 L 155 60" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow-orange-pipe)"></path>
          <defs>
            <marker id="arrow-orange-pipe" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
            </marker>
          </defs>
          <rect x="160" y="40" width="80" height="40" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="3"></rect>
          <text x="200" y="67" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L4-5</text>
          <text x="200" y="82" font-size="9" text-anchor="middle" fill="#4B5563">Node 2</text>
          <path d="M 245 60 L 280 60" stroke="#16A34A" stroke-width="2" fill="none" marker-end="url(#arrow-success)"></path>
          <defs>
            <marker id="arrow-success" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#16A34A"></polygon>
            </marker>
          </defs>
          <rect x="285" y="40" width="80" height="40" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="3"></rect>
          <text x="325" y="67" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">Output 1</text>
          <text x="325" y="82" font-size="9" text-anchor="middle" fill="#4B5563">Token generated</text>
          <text x="50" y="155" font-size="11" font-weight="600" fill="#111827">Token 2</text>
          <rect x="50" y="170" width="80" height="40" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="3"></rect>
          <text x="90" y="197" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L1-3</text>
          <text x="90" y="212" font-size="9" text-anchor="middle" fill="#4B5563">Node 1</text>
          <path d="M 135 190 L 155 190" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow-orange-pipe2)"></path>
          <defs>
            <marker id="arrow-orange-pipe2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
            </marker>
          </defs>
          <rect x="160" y="170" width="80" height="40" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="3"></rect>
          <text x="200" y="197" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">L4-5</text>
          <text x="200" y="212" font-size="9" text-anchor="middle" fill="#4B5563">Node 2</text>
          <path d="M 245 190 L 280 190" stroke="#16A34A" stroke-width="2" fill="none" marker-end="url(#arrow-success2)"></path>
          <defs>
            <marker id="arrow-success2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#16A34A"></polygon>
            </marker>
          </defs>
          <rect x="285" y="170" width="80" height="40" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="3"></rect>
          <text x="325" y="197" font-size="10" font-weight="500" text-anchor="middle" fill="#111827">Output 2</text>
          <text x="325" y="212" font-size="9" text-anchor="middle" fill="#4B5563">Token generated</text>
          <text x="50" y="270" font-size="10" fill="#4B5563">⏱ Total time = Token 1 + Token 2 + Token 3... (Sequential per token)</text>
        </svg>

### Tensor vs. Pipeline: When to Use Each

### ✓ Use Tensor Parallelism When:

-   Model has many attention heads that divide evenly
-   You need **fast token latency**
-   You have a fast link (Thunderbolt, RDMA)
-   Qwen3, Qwen3.5, Nemotron-H, Llama 3

### ✓ Use Pipeline Parallelism When:

-   Model doesn't support tensor sharding (like Qwen3.8)
-   You need **larger context windows** (fits bigger models)
-   Any architecture, any link
-   Works on slow links, even Wi-Fi

**Pipeline stages add latency per token:** While tensor parallelism speeds up responses (oMLX reports 1.78x on a 27B over TB RDMA), pipeline parallelism may be **slightly slower** than a single node. The trade-off is **fitting larger models** that wouldn't run on one Mac alone.

### Your Qwen3.8 Question: Yes, on 2 Nodes

#### ✓ Can you deploy Qwen3.8-27B on 2 Mac minis?

Yes — using **pipeline parallelism**.

-   **Tensor parallelism:** Not yet supported (MLX hasn't added shard() for qwen3\_8)
-   **Pipeline parallelism:** Splits layers across nodes ✓ Works immediately
-   **Speed:** Slightly slower than one node, but you can run the full 27B model
-   **Memory:** ~14 GB per Mac (fits 24GB MacBook Pro)

#### How to Deploy Qwen3.8 on 2 Nodes:

1.  Load the model in oMLX dashboard
2.  Select **"Deploy on 2 Macs"**
3.  Choose strategy: **"Pipeline"** (not Automatic, which tries Tensor first)
4.  oMLX splits layers: roughly 16 layers on each Mac
5.  Done — model runs across both nodes

### Which Models Support Tensor vs. Pipeline Parallelism?

Only models with a native MLX shard() implementation support distributed tensor parallelism.

| Model Family | Examples | Tensor TP Support | Key Dimensions |
| --- | --- | --- | --- |
| **Qwen3** | qwen3-32b, qwen3-27b | ✓ Yes | num_attention_heads, num_key_value_heads |
| **Qwen3-Next** | qwen3-next-32b, qwen3-next-7b | ✓ Yes | num_attention_heads, num_key_value_heads, linear_num_key_heads, linear_num_value_heads |
| **Qwen3.5** | qwen3.5-32b, qwen3.5-7b | ✓ Yes | num_attention_heads, num_key_value_heads, linear_num_key_heads, linear_num_value_heads |
| **Qwen3-MoE** | qwen3-moe-128b | ✓ Yes | num_attention_heads, num_key_value_heads |
| **Nemotron-H** | nemotron-h-405b | ✓ Yes | num_attention_heads, mamba_num_heads, n_groups |
| **Llama** | llama-3-70b, llama-2-7b | ✓ Yes | num_attention_heads, num_key_value_heads |
| **Phi** | phi-3-mini, phi-4 | No | _supports_tensor_parallel returns False (phi3, phi3small, phimoe) |
| **Gemma** | gemma-2-27b | No | _supports_tensor_parallel returns False (gemma2, gemma3) |
| **Mistral** | mistral-7b | No | _supports_tensor_parallel returns False (mistral, mixtral) |

**Important:** Just because a model isn't in the "full support" list doesn't mean it won't work. MLX can dynamically detect if a model has a `shard()` method. Check the oMLX dashboard — it will tell you if a specific model supports tensor parallelism when you try to load it.

### How to Check a Specific Model

1.  **Find the model's config.json** — Usually in the model directory on Hugging Face or your local storage.
2.  **Look for architecture dimensions:**
    -   `num_attention_heads` — Primary dimension, must be divisible
    -   `num_key_value_heads` — GQA dimension (optional, usually same or smaller)
    -   `linear_num_key_heads` — Qwen3-Next only
    -   `mamba_num_heads` — Nemotron-H only
3.  **Divide by node count:** If you have 2 nodes, all dimensions must be divisible by 2 with no remainder.

D — Why This Model Failed: 16 ÷ 2 = 8, But 4 ÷ 2 = 2, And 32 ÷ 2 = 16

<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg">
          <text x="50" y="30" font-size="12" font-weight="600" fill="#DC2626">Your Error Case</text>
          <text x="50" y="55" font-size="11" fill="#111827">Model dimensions: (16, 4, 32)</text>
          <text x="50" y="75" font-size="11" fill="#111827">Trying to use: 2 nodes</text>
          <rect x="50" y="95" width="100" height="50" fill="#FEE2E2" stroke="#DC2626" stroke-width="2" rx="4"></rect>
          <text x="100" y="120" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">16 ÷ 2 = 8</text>
          <text x="100" y="135" font-size="10" text-anchor="middle" fill="#16A34A">✓ Divides</text>
          <rect x="180" y="95" width="100" height="50" fill="#FEE2E2" stroke="#DC2626" stroke-width="2" rx="4"></rect>
          <text x="230" y="120" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">4 ÷ 2 = 2</text>
          <text x="230" y="135" font-size="10" text-anchor="middle" fill="#16A34A">✓ Divides</text>
          <rect x="310" y="95" width="100" height="50" fill="#FEE2E2" stroke="#DC2626" stroke-width="2" rx="4"></rect>
          <text x="360" y="120" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">32 ÷ 2 = 16</text>
          <text x="360" y="135" font-size="10" text-anchor="middle" fill="#16A34A">✓ Divides</text>
          <text x="50" y="190" font-size="12" font-weight="600" fill="#DC2626">Why It Failed:</text>
          <text x="50" y="210" font-size="11" fill="#111827">✗ Model doesn't declare <code>supports_tensor_parallel=True</code> in config.json</text>
          <text x="50" y="230" font-size="11" fill="#111827">✗ MLX implementation for this model type doesn't have a <code>shard()</code> method</text>
          <text x="50" y="250" font-size="11" fill="#111827">✗ The sharding method isn't layer-safe (can't shard individual pipeline stages)</text>
          <rect x="450" y="95" width="230" height="150" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="4"></rect>
          <text x="565" y="120" font-size="11" font-weight="600" text-anchor="middle" fill="#16A34A">Solutions</text>
          <text x="465" y="145" font-size="10" fill="#111827">1. Use pipeline parallelism</text>
          <text x="475" y="162" font-size="9" fill="#4B5563">(split layers, not tensors)</text>
          <text x="465" y="185" font-size="10" fill="#111827">2. Run on 1 node only</text>
          <text x="475" y="202" font-size="9" fill="#4B5563">(model fits in one Mac)</text>
          <text x="465" y="225" font-size="10" fill="#111827">3. Try a different model</text>
          <text x="475" y="242" font-size="9" fill="#4B5563">(one known to support TP)</text>
        </svg>

### Reading Model Config.json Files

The configuration file that tells oMLX how a model is structured and whether it can be parallelized.

### Essential Fields for Tensor Parallelism

{ "model\_type": "qwen3", "hidden\_size": 3584, "num\_attention\_heads": 24, // Primary dimension for sharding "num\_key\_value\_heads": 8, // GQA dimension (optional) "num\_hidden\_layers": 32, "intermediate\_size": 18944, "vocab\_size": 128000, "max\_position\_embeddings": 32768, }

### `model_type`

Architecture name: `qwen3`, `llama`, `nemotron_h`, etc. oMLX uses this to find the MLX implementation and check for `shard()`.

### `num_attention_heads`

Total query attention heads. Must divide evenly by node count. Example: 24 heads ÷ 2 nodes = 12 per node ✓

### `num_key_value_heads`

**Grouped Query Attention:** Fewer KV heads than query heads to save memory. Must also divide evenly.

### `hidden_size`

Total embedding dimension. Usually `num_attention_heads × head_size`. Example: 24 × 149.33 ≈ 3584

### Extended Fields (Model-Specific)

{ "linear\_num\_key\_heads": 16, // Qwen3-Next: linear attention dimension "linear\_num\_value\_heads": 4, // Must also divide evenly "mamba\_num\_heads": 4, // Nemotron-H: Mamba layer heads "n\_groups": 32, // Nemotron-H: group dimension }

**Qwen3-Next & Qwen3.5:** These models combine standard attention with linear attention. All four dimensions must divide evenly.  

**Nemotron-H:** Hybrid Mamba + Attention architecture. Uses `mamba_num_heads` and `n_groups` instead of traditional heads.

### Quick Check: Can This Model Use Tensor Parallelism?

1.  **Open the model's config.json**

    Find it in your model directory or on Hugging Face

2.  **Find the architecture dimensions**

    Look for: `num_attention_heads`, `num_key_value_heads`, and any `linear_*` or `mamba_*` fields

3.  **Divide by your node count**

    Example: 2 nodes → all dimensions must divide by 2 with remainder 0

4.  **Check the verdict**

    All divide evenly → Tensor parallelism possible (if MLX has `shard()`)  
    At least one doesn't divide → Use pipeline parallelism or 1 node

E — Real-World Example: Qwen3-32B Config

<svg viewBox="0 0 700 350" xmlns="http://www.w3.org/2000/svg">
          <text x="50" y="25" font-size="12" font-weight="600" fill="#111827">From qwen3-32b config.json:</text>
          <rect x="50" y="40" width="320" height="280" fill="#111827" rx="4" stroke="#444CE7" stroke-width="1"></rect>
          <text x="70" y="70" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"model_type"</text>
          <text x="200" y="70" font-family="Monaco, monospace" font-size="10" fill="#34D399">: "qwen3"</text>
          <text x="70" y="95" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"num_attention_heads"</text>
          <text x="300" y="95" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 24</text>
          <text x="70" y="120" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"num_key_value_heads"</text>
          <text x="300" y="120" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 8</text>
          <text x="70" y="145" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"hidden_size"</text>
          <text x="300" y="145" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 5120</text>
          <text x="70" y="170" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"num_hidden_layers"</text>
          <text x="300" y="170" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 32</text>
          <text x="70" y="195" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"intermediate_size"</text>
          <text x="300" y="195" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 13824</text>
          <text x="70" y="220" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"vocab_size"</text>
          <text x="300" y="220" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 152064</text>
          <text x="70" y="245" font-family="Monaco, monospace" font-size="10" fill="#60A5FA">"max_position_embeddings"</text>
          <text x="300" y="245" font-family="Monaco, monospace" font-size="10" fill="#F59E0B">: 32768</text>
          <text x="400" y="50" font-size="11" font-weight="600" fill="#111827">Tensor Parallelism Check:</text>
          <rect x="400" y="70" width="280" height="230" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="4"></rect>
          <text x="420" y="95" font-size="10" fill="#111827">Can use 2 nodes?</text>
          <text x="430" y="120" font-size="10" fill="#16A34A">✓</text>
          <text x="450" y="120" font-size="10" fill="#111827">24 ÷ 2 = 12 heads/node</text>
          <text x="430" y="145" font-size="10" fill="#16A34A">✓</text>
          <text x="450" y="145" font-size="10" fill="#111827">8 ÷ 2 = 4 KV/node</text>
          <text x="420" y="175" font-size="10" fill="#111827">Can use 4 nodes?</text>
          <text x="430" y="200" font-size="10" fill="#16A34A">✓</text>
          <text x="450" y="200" font-size="10" fill="#111827">24 ÷ 4 = 6 heads/node</text>
          <text x="430" y="225" font-size="10" fill="#16A34A">✓</text>
          <text x="450" y="225" font-size="10" fill="#111827">8 ÷ 4 = 2 KV/node</text>
          <text x="420" y="260" font-size="10" fill="#111827">Can use 3 nodes?</text>
          <text x="430" y="285" font-size="10" fill="#DC2626">✗</text>
          <text x="450" y="285" font-size="10" fill="#111827">8 ÷ 3 = 2.67 ✗</text>
        </svg>

**Real Model:** Qwen3-32B with 24 heads and 8 KV heads works with 2 or 4 nodes, but not 3 nodes. This is exactly why oMLX's autoconfigure picks the best split automatically.

### Model Folder Structure and File Types

What each file in a model directory does and why it matters for oMLX.

model-directory/ ├── config.json ← Architecture and metadata ├── model.safetensors ← Weights (MLX format) ├── model-00001-of-00005.safetensors ├── model-00002-of-00005.safetensors ├── ... ├── model.safetensors.index.json ← Weight sharding map ├── tokenizer.model ← Token vocabulary ├── tokenizer.json ├── generation\_config.json ← Inference defaults ├── README.md └── .gitattributes

### `config.json`

**Architecture blueprint.** Defines model structure (attention heads, layers, hidden size). oMLX reads this to determine if tensor parallelism is possible.

Required for: Parallelism detection

### `model.safetensors`  
or  
`model-00001-of-N.safetensors`

**Model weights.** The actual parameters (~32 GB for Qwen3-32B). Stored in MLX native format for fast loading. Large files are sharded into parts (00001, 00002, etc.) to avoid disk overhead.

Required for: Running inference

### `model.safetensors.index.json`

**Weight shard map.** Lists which weights live in which shard file. Tells oMLX how to load layers progressively without loading the entire model.

Required for: Progressive layer loading

### `tokenizer.model`  
and  
`tokenizer.json`

**Vocabulary and encoding.** Converts text to tokens (numbers). Model-specific; not interchangeable across architectures.

Required for: Text input processing

### `generation_config.json`

**Inference defaults.** Settings like max tokens, temperature, top\_p. oMLX uses these as fallbacks if you don't override them.

Optional: Defaults if not specified

### `README.md`

**Model documentation.** License, usage notes, training data, known limitations. Always read this before deployment.

Important for: Legal and operational context

F — How oMLX Uses Model Files

<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg">
            <rect x="50" y="40" width="120" height="50" fill="#E0E7FF" stroke="#444CE7" stroke-width="2" rx="4"></rect>
            <text x="110" y="60" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">1. Read</text>
            <text x="110" y="77" font-size="10" text-anchor="middle" fill="#111827">config.json</text>
            <path d="M 175 65 L 205 65" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow-flow)"></path>
            <defs>
              <marker id="arrow-flow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
              </marker>
            </defs>
            <rect x="210" y="40" width="120" height="50" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
            <text x="270" y="60" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">2. Check</text>
            <text x="270" y="77" font-size="10" text-anchor="middle" fill="#111827">Heads divisible?</text>
            <path d="M 335 65 L 365 65" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow-flow2)"></path>
            <defs>
              <marker id="arrow-flow2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
              </marker>
            </defs>
            <rect x="370" y="40" width="120" height="50" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="4"></rect>
            <text x="430" y="60" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">3. Pick</text>
            <text x="430" y="77" font-size="10" text-anchor="middle" fill="#111827">Parallelism</text>
            <path d="M 495 65 L 525 65" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow-flow3)"></path>
            <defs>
              <marker id="arrow-flow3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
              </marker>
            </defs>
            <rect x="530" y="40" width="120" height="50" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="4"></rect>
            <text x="590" y="60" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">4. Load</text>
            <text x="590" y="77" font-size="10" text-anchor="middle" fill="#111827">Weights (shards)</text>
            <text x="50" y="140" font-size="10" fill="#111827" font-weight="600">Files used at each stage:</text>
            <rect x="50" y="160" width="120" height="100" fill="#F5F3FF" stroke="#444CE7" stroke-width="1" rx="3"></rect>
            <text x="110" y="180" font-size="9" font-weight="500" text-anchor="middle" fill="#111827">config.json</text>
            <text x="110" y="200" font-size="8" text-anchor="middle" fill="#4B5563">num_attention_heads</text>
            <text x="110" y="213" font-size="8" text-anchor="middle" fill="#4B5563">num_key_value_heads</text>
            <text x="110" y="226" font-size="8" text-anchor="middle" fill="#4B5563">num_hidden_layers</text>
            <text x="110" y="239" font-size="8" text-anchor="middle" fill="#4B5563">model_type</text>
            <rect x="210" y="160" width="120" height="100" fill="#F0F9FF" stroke="#0284C7" stroke-width="1" rx="3"></rect>
            <text x="270" y="180" font-size="9" font-weight="500" text-anchor="middle" fill="#111827">config.json</text>
            <text x="270" y="200" font-size="8" text-anchor="middle" fill="#4B5563">Check divisibility</text>
            <text x="270" y="213" font-size="8" text-anchor="middle" fill="#4B5563">math only, no I/O</text>
            <rect x="370" y="160" width="120" height="100" fill="#FFFBEB" stroke="#D97706" stroke-width="1" rx="3"></rect>
            <text x="430" y="180" font-size="9" font-weight="500" text-anchor="middle" fill="#111827">Plan created</text>
            <text x="430" y="200" font-size="8" text-anchor="middle" fill="#4B5563">Tensor parallelism</text>
            <text x="430" y="213" font-size="8" text-anchor="middle" fill="#4B5563">or Pipeline or</text>
            <text x="430" y="226" font-size="8" text-anchor="middle" fill="#4B5563">Single node</text>
            <rect x="530" y="160" width="120" height="100" fill="#F7FEE7" stroke="#16A34A" stroke-width="1" rx="3"></rect>
            <text x="590" y="180" font-size="9" font-weight="500" text-anchor="middle" fill="#111827">Weights loaded</text>
            <text x="590" y="200" font-size="8" text-anchor="middle" fill="#4B5563">Shards or index.json</text>
            <text x="590" y="213" font-size="8" text-anchor="middle" fill="#4B5563">Progressive loading</text>
            <text x="590" y="226" font-size="8" text-anchor="middle" fill="#4B5563">per-layer</text>
          </svg>

**Why the safetensors format?** Modern models use safetensors (safe, fast, and designed for MLX). Older models might use \`.bin\` (PyTorch) or \`.gguf\` (GGML), but oMLX converts to safetensors on load. Always prefer safetensors — they load 10-20x faster.

### Quick File Checklist Before Running a Model

#### ✓ Required Files (Model Won't Load Without These)

-    `config.json` — Architecture definition
-    `model*.safetensors` (or all shards) — Weights
-    `tokenizer.model` or `tokenizer.json` — Token encoding

#### ⚠ Important (Deployment Will Fail Without Proper Values)

-    `model.safetensors.index.json` (if weights are sharded) — Weight location map
-    All shard files present if index.json references them

#### ✓ Optional (Nice to Have)

-    `generation_config.json` — Inference defaults
-    `README.md` — Documentation
