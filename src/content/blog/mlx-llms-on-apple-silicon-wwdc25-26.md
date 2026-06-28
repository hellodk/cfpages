---
title: "From One Mac to a Desk-Sized AI Cluster: Running LLMs with MLX (WWDC25 & WWDC26)"
date: 2026-06-20
description: "A practical walkthrough of Apple's MLX framework for local LLMs — inference, quantization, fine-tuning on a single Mac, then scaling to multi-Mac clusters with JACCL and Thunderbolt 5."
tags: [mlx, apple, llm, machine-learning, devops]
draft: false
cover: "assets/images/Coding_with_Style-2_uhd.jpg"
---

> **TL;DR** — Apple’s MLX stack lets you run, quantize, and fine-tune large language models entirely on your Mac — no cloud, no API keys. WWDC25 showed how to do it on a single machine; WWDC26 showed how to wire multiple Macs together over Thunderbolt 5 and run trillion-parameter models at your desk. This post distills both sessions into something you can actually use.

---

## Why MLX matters

Cloud LLM APIs are convenient, but they come with trade-offs: latency, cost, data leaving your network, and rate limits. MLX is Apple’s open-source machine learning framework built specifically for Apple silicon. It uses Metal for GPU acceleration and unified memory so the CPU and GPU can work on the same data without expensive copies.

The result: you can load state-of-the-art models — including ones with hundreds of billions of parameters — and interact with them locally at faster-than-reading speeds.

Two WWDC sessions cover the full arc:

| Session | Focus | Watch |
|---------|-------|-------|
| **WWDC25** — Explore LLMs on Apple silicon with MLX | Single-Mac inference, quantization, fine-tuning, Swift integration | [YouTube](https://www.youtube.com/watch?v=tn2Hvw7eCsw) |
| **WWDC26** — Distributed inference and training with MLX | Multi-Mac clusters, JACCL, trillion-parameter models | [YouTube](https://www.youtube.com/watch?v=CzgK02zsRg4) |

If you are new to MLX entirely, start with Apple’s [Get Started with MLX for Apple silicon](https://developer.apple.com/videos/play/wwdc2025/315) session first.

---

## Part 1: LLMs on a single Mac (WWDC25)

### The demo that sets the bar

In the WWDC25 session, Angelos from the MLX team loads **DeepSeek’s 670B model** — quantized to 4.5 bits per weight, still ~380 GB of weights — on an **M3 Ultra with 512 GB unified memory**. He asks it trivia, has it write code, and gets real-time generation. No datacenter required.

That demo frames what MLX LM is for: making serious LLM work accessible from a Mac.

### MLX LM: your entry point

**MLX LM** is a Python package and CLI toolkit built on top of MLX. Install it once:

```bash
pip install mlx-lm
```

From there you can generate text, quantize models, fine-tune adapters, and fuse them back — often without writing any Python at all.

#### Generate text from the terminal

The fastest way to try a model:

```bash
mlx_lm.generate \
  --model mistralai/Mistral-7B-Instruct-v0.3 \
  --prompt "Write a Swift implementation of quicksort"
```

MLX LM downloads the model from Hugging Face if needed, runs the prompt, and prints the response. Flags like `--temp`, `--top-p`, and `--max-tokens` behave like any standard generation setup. Run `mlx_lm.generate --help` for the full list.

#### Generate text from Python

When you need control or want to embed generation in a pipeline:

```python
from mlx_lm import load, generate

model, tokenizer = load("mistralai/Mistral-7B-Instruct-v0.3")
response = generate(model, tokenizer, prompt="Write a Swift quicksort")
print(response)
```

The model returned by `load()` is not an opaque black box — it is a full MLX neural network. You can inspect layers, peek at weights, and even swap modules for custom fine-tuning experiments.

#### Multi-turn conversations with a KV cache

Single-prompt generation is fine for one-shot tasks. Chat applications need something more: a **key-value (KV) cache** that stores attention keys and values from earlier tokens so the model does not recompute everything on every turn.

```python
from mlx_lm import load, generate
from mlx_lm.models.cache import make_prompt_cache

model, tokenizer = load("mistralai/Mistral-7B-Instruct-v0.3")
cache = make_prompt_cache(model)

response1 = generate(model, tokenizer, prompt="What is MLX?", prompt_cache=cache)
response2 = generate(model, tokenizer, prompt="Give me a code example.", prompt_cache=cache)
```

The cache persists context across turns — essential for chatbots and assistants.

### Quantization: smaller, faster, same workflow

Models ship in float16 or float32. That is accurate but heavy. **Quantization** compresses weights to int8 or 4-bit precision, cutting memory use and speeding inference — often with minimal quality loss.

In most ecosystems, quantization means conversion scripts and compatibility headaches. In MLX, it is built in:

```bash
mlx_lm.convert \
  --hf-path mistralai/Mistral-7B-Instruct-v0.3 \
  --mlx-path ./mistral-7b-4bit \
  --quantize
```

The converted model lands in `./mistral-7b-4bit` and works immediately with the same CLI and Python tools. Upload it back to Hugging Face with `--upload-repo` if you want to share.

For finer control, you can keep sensitive layers at higher precision:

```python
from mlx_lm import convert

def quantize_predicate(path, param):
    if "embed" in path or "lm_head" in path:
        return {"bits": 6, "group_size": 64}
    return {"bits": 4, "group_size": 64}

convert(
    hf_path="mistralai/Mistral-7B-Instruct-v0.3",
    mlx_path="./mistral-7b-mixed",
    quantize_predicate=quantize_predicate,
)
```

Embedding and projection layers at 6-bit, everything else at 4-bit — a common sweet spot.

### Fine-tuning on your Mac, on your data

MLX LM supports two fine-tuning modes:

| Mode | What updates | Best for |
|------|-------------|----------|
| **Full fine-tuning** | All model parameters | Maximum flexibility, highest resource cost |
| **LoRA (Low-Rank Adapters)** | Small adapter layers only | Fast, memory-efficient, great on local hardware |

The WWDC25 demo fine-tunes Mistral 7B on Super Bowl trivia. Before training, the model gives a correct but outdated answer (knowledge cutoff). After a few minutes of LoRA training on a small Q&A dataset, it answers with current scores and player names.

Launch fine-tuning with one command:

```bash
mlx_lm.lora \
  --model ./mistral-7b-4bit \
  --train \
  --data ./superbowl_data \
  --iters 600
```

Because quantization is deeply integrated, you can train adapters **on top of quantized models** — roughly 3.5× less memory for the base weights compared to full precision.

For serious runs, use a YAML config file to control batch size, learning rate schedules, evaluation intervals, and optimizer settings.

After training, fuse the adapter into the base model for easier deployment:

```bash
mlx_lm.fuse \
  --model ./mistral-7b-4bit \
  --adapter-path ./adapters \
  --save-path ./mistral-7b-finetuned
```

The fused model has the same architecture as the original — just with your updated knowledge baked in. Upload to Hugging Face and share.

### Swift integration

MLX is not Python-only. The same workflow — load, tokenize, generate — fits in roughly 28 lines of Swift:

```swift
import MLX
import MLXLMCommon
import MLXLLM

let modelContainer = try await LLMModelFactory.shared.loadContainer(
    configuration: ModelConfiguration(id: "mlx-community/Mistral-7B-Instruct-v0.3-4bit")
)

let prompt = "Write a Swift quicksort"
let tokens = try await modelContainer.perform { context in
    let input = try context.tokenizer.encode(text: prompt)
    return try generate(input: input, parameters: GenerateParameters(), context: context)
}
print(try context.tokenizer.decode(tokens: tokens))
```

Add a KV cache and a token iterator for multi-turn chat — a few extra lines, same concept as the Python API. If you are building a native macOS or iOS app, this is the path.

---

## Part 2: Scaling across multiple Macs (WWDC26)

Single-Mac MLX is impressive. But models keep growing, contexts get longer, and eventually one machine hits a wall — memory, compute, or bandwidth.

WWDC26 answers the next question: **what if you have four Macs on your desk?**

### The hardware stack

Distributed MLX on Apple silicon rests on three layers:

```
┌─────────────────────────────────────────────────┐
│  MLX / MLX LM                                   │  ← Your code (CLI, Python, Swift)
├─────────────────────────────────────────────────┤
│  JACCL                                          │  ← Collective communication (all-reduce, etc.)
├─────────────────────────────────────────────────┤
│  RDMA over Thunderbolt 5                        │  ← Low-latency memory-to-memory transfer
└─────────────────────────────────────────────────┘
```

**RDMA (Remote Direct Memory Access)** over Thunderbolt 5 ships in **macOS 26.2**. It moves data directly between machines’ memory, bypassing most CPU and OS overhead — the kind of low-latency, high-bandwidth link distributed ML needs.

**JACCL** (Jack and Angelos’ Collective Communication Library) sits on top. It provides the collective primitives — all-reduce, all-gather, broadcast — that distributed training and inference require. Think of it as Apple’s answer to NVIDIA’s NCCL, but over Thunderbolt instead of NVLink.

### Building a cluster

The WWDC26 demo uses **four M3 Ultra Macs** connected with Thunderbolt 5 cables.

#### Choose a topology

JACCL supports two wiring patterns:

| Topology | Latency | Bandwidth | Cables |
|----------|---------|-----------|--------|
| **Full mesh** | Lowest — every Mac talks to every other Mac in one hop | Good | More cables and ports |
| **Ring** | Higher — non-adjacent nodes route through intermediaries | Can be higher — multiple cables per link | Fewer cables, easier to scale |

JACCL picks the best topology automatically based on message size: mesh for small messages where latency dominates, ring for large messages where bandwidth dominates.

#### Enable RDMA

On each Mac: **Settings → search "RDMA" → Enable RDMA over Thunderbolt → reboot**.

#### Generate a hostfile

MLX provides a helper to discover your topology and write the cluster config:

```bash
mlx.distributed_config \
  --hosts mac-studio-1 mac-studio-2 mac-studio-3 mac-studio-4 \
  --output ./hostfile.json \
  --auto-setup \
  --backend jaccl
```

The hostfile is a JSON array — one entry per node with SSH hostname, local-network IP for coordination, and RDMA device names for each Thunderbolt peer. You can also set environment variables (like `MLX_METAL_FAST_SYNCH=1` for faster GPU-to-CPU sync) that get applied on every node at launch.

#### Launch distributed jobs

`mlx.launch` orchestrates the cluster from any machine with SSH access:

```bash
mlx.launch --hostfile ./hostfile.json -- \
  /path/on/remote/mac/mlx_lm.chat \
  --model Qwen/Qwen3-27B \
  --max-tokens 512
```

The command after `--` is the same one you would run on a single Mac. MLX LM shards the model and coordinates distributed inference automatically. MLX must be installed on every node, and the executable path must be reachable on all machines.

### Distributed inference: the numbers

In the side-by-side demo, **Qwen 3.6 (27B)** on four M3 Ultras generates tokens at nearly **3× the rate** of a single machine.

But speed is not the only reason to go distributed. Some models simply do not fit on one Mac.

**Kimi 2.6** has **1 trillion parameters**. Even at 8-bit quantization, weights alone need ~1 TB of memory — beyond a single M3 Ultra’s 512 GB, but feasible across four of them.

### Pipeline vs. tensor parallelism

MLX supports two sharding strategies:

| Strategy | How it splits | Speed | Communication |
|----------|--------------|-------|---------------|
| **Pipeline parallelism** | By depth — each Mac holds a group of layers | Does not speed up inference (tokens still pass sequentially) | Simple — activations exchanged only at layer boundaries |
| **Tensor parallelism** | By width — each Mac holds part of every layer | Faster — all Macs process the same token in parallel | Heavy — communication at every layer, every token |

Tensor parallelism is the default in MLX LM. For pipeline mode, append `--pipeline` to the command (not all models support it).

Running Kimi 2.6 across the cluster:

```bash
mlx.launch --hostfile ./hostfile.json -- \
  /path/on/remote/mac/mlx_lm.chat \
  --model moonshotai/Kimi-K2.6
```

One command. A trillion-parameter model, answering questions locally.

### Distributed fine-tuning

Fine-tuning scales with **data parallelism**: replicate the model on every Mac, give each machine a different batch, compute gradients locally, then average them across the cluster.

```bash
mlx.launch --hostfile ./hostfile.json -- \
  /path/on/remote/mac/mlx_lm.lora \
  --model Qwen/Qwen3.5-9B \
  --train \
  --data ./training_data \
  --batch-size 16
```

Scale `--batch-size` by the number of devices so each machine processes the same per-step sample count as a single-device run.

In the WWDC26 demo, a single M3 Ultra processes ~180 tokens/sec during LoRA fine-tuning. The four-Mac cluster hits ~600 tokens/sec — again, roughly **3× speedup**. Your data never leaves your machines.

### Low-level APIs

Everything shown via CLI also exists in Python, Swift, and C++:

```python
import mlx.core as mx
from mlx_lm import sharded_load

# Initialize distributed group, shard model, generate as usual
model, tokenizer = sharded_load("Qwen/Qwen3-27B", parallelism="tensor")
```

For even finer control, shard individual layers with `shard_linear`, or call `mx.distributed.all_sum()` directly. JACCL also exposes a standalone C++ API if you need distributed communication outside of MLX entirely.

---

## Putting it together: a practical progression

Here is a reasonable path from zero to a multi-Mac cluster:

1. **Install MLX LM** on one Mac and generate text with `mlx_lm.generate`
2. **Quantize** a model you care about with `mlx_lm.convert`
3. **Fine-tune** a LoRA adapter on local data with `mlx_lm.lora`, then **fuse** it
4. **Try Swift** if you are building a native app
5. **Add Macs** — connect over Thunderbolt 5, enable RDMA, generate a hostfile
6. **Launch distributed** inference or fine-tuning with `mlx.launch`
7. **Serve** models with the built-in MLX LM server for agent workflows

That last step connects to Apple’s companion WWDC26 session on [running local agentic AI on the Mac using MLX](https://developer.apple.com/videos/play/wwdc2026/232) — agents that call tools, integrate with Xcode, and never send your code to the cloud.

---

## Key resources

| Resource | Link |
|----------|------|
| MLX framework | [mlx-framework.org](https://mlx-framework.org) |
| MLX LM (Python) | [github.com/ml-explore/mlx-lm](https://github.com/ml-explore/mlx-lm) |
| MLX Swift | [github.com/ml-explore/mlx-swift](https://github.com/ml-explore/mlx-swift) |
| MLX Swift LM | [github.com/ml-explore/mlx-swift-lm](https://github.com/ml-explore/mlx-swift-lm) |
| Distributed docs | [Distributed Communication — MLX docs](https://ml-explore.github.io/mlx/build/html/usage/distributed.html) |
| WWDC25 — LLMs on Apple silicon | [developer.apple.com/videos/play/wwdc2025/298](https://developer.apple.com/videos/play/wwdc2025/298) |
| WWDC26 — Distributed MLX | [developer.apple.com/videos/play/wwdc2026/233](https://developer.apple.com/videos/play/wwdc2026/233) |
| WWDC26 — Local agentic AI | [developer.apple.com/videos/play/wwdc2026/232](https://developer.apple.com/videos/play/wwdc2026/232) |

---

## Closing thoughts

The through-line across both sessions is consistency: the same commands, the same Python API, the same Swift patterns — whether you are on one Mac or four. Quantization works the same way. Fine-tuning works the same way. You wrap with `mlx.launch` and the framework handles sharding and communication.

For a blog that has spent years on Kubernetes clusters, Vagrant labs, and edge deployments, there is something satisfying about a cluster that fits on your desk, connects with a Thunderbolt cable, and runs a trillion-parameter model without a cloud invoice.

The hardware is not cheap — four M3 Ultras is a serious investment. But the software stack is open source, the data stays local, and the path from `pip install mlx-lm` to a distributed training cluster is shorter than most people expect.

---

*Sources: [WWDC25 — Explore LLMs on Apple silicon with MLX](https://www.youtube.com/watch?v=tn2Hvw7eCsw) (Angelos, MLX team) and [WWDC26 — Explore distributed inference and training with MLX](https://www.youtube.com/watch?v=CzgK02zsRg4) (Tatiana, MLX team).*
