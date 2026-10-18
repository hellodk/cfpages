---
title: "MLX Architecture — Complete Visual Guide"
date: 2026-10-18
description: "MLX is Apple's NumPy-compatible array framework for Apple Silicon, built by the same team behind core ML. Its design decision that shapes everything else: CPU and GPU share one physical memory pool, so arrays are never copied between processors — and on top of that foundation sits a lazy evaluation"
tags: [mlx, apple-silicon, inference]
draft: false
---

Apple's array framework from the inside · Unified memory · Lazy evaluation · Transforms · Metal execution

## Unified Memory · Arrays · Lazy Graph

### Why MLX Exists — One Memory, One Address Space

MLX is Apple's NumPy-compatible array framework for Apple Silicon, built by the same team behind core ML. Its design decision that shapes everything else: **CPU and GPU share one physical memory pool**, so arrays are never copied between processors — and on top of that foundation sits a **lazy evaluation graph** with first-class transforms (vmap, grad, jit), a deliberate departure from PyTorch's eager model.

Unified memory vs discrete GPU — the foundational difference

<svg viewBox="0 0 900 400" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="400" fill="#F8FAFC"></rect>
      <text x="230" y="36" text-anchor="middle" font-size="11.5" font-weight="700" fill="#111827">Discrete GPU (CUDA world)</text>
      <rect x="40" y="52" width="380" height="180" rx="10" fill="#fff" stroke="#DC2626" stroke-width="2"></rect>
      <rect x="62" y="74" width="150" height="60" rx="7" fill="#EEF2FF" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="137" y="100" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">CPU RAM</text>
      <text x="137" y="117" text-anchor="middle" font-size="8.5" fill="#DC2626">system DRAM</text>
      <rect x="250" y="74" width="150" height="60" rx="7" fill="#EEF2FF" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="325" y="100" text-anchor="middle" font-size="10.5" font-weight="700" fill="#111827">GPU VRAM</text>
      <text x="325" y="117" text-anchor="middle" font-size="8.5" fill="#DC2626">separate HBM/GDDR</text>
      <path id="pcie" d="M212 104 L250 104" stroke="#DC2626" stroke-width="2" fill="none" stroke-dasharray="5,3"></path>
      <text x="231" y="94" text-anchor="middle" font-size="7.5" fill="#DC2626" font-weight="700">PCIe</text>
      <text x="231" y="146" text-anchor="middle" font-size="8" fill="#DC2626">explicit copy · ~16–32 GB/s</text>
      <text x="231" y="160" text-anchor="middle" font-size="8" fill="#DC2626">cudaMemcpy / .to("cuda")</text>
      <circle r="4" fill="#DC2626"><animateMotion dur="2.6s" repeatCount="indefinite" path="M212 104 L250 104"></animateMotion></circle>
      <circle r="4" fill="#DC2626"><animateMotion dur="2.6s" repeatCount="indefinite" begin="1.3s" path="M250 104 L212 104"></animateMotion></circle>
      <text x="230" y="210" text-anchor="middle" font-size="9" fill="#4B5563">two address spaces · transfers are a bug source</text>
      <text x="230" y="225" text-anchor="middle" font-size="9" fill="#4B5563">peak copy rate ≪ memory bandwidth</text>
      <text x="680" y="36" text-anchor="middle" font-size="11.5" font-weight="700" fill="#111827">Apple Silicon (MLX world)</text>
      <rect x="490" y="52" width="380" height="180" rx="10" fill="#fff" stroke="#16A34A" stroke-width="2"></rect>
      <rect x="530" y="74" width="300" height="90" rx="9" fill="#EEF2FF" stroke="#16A34A" stroke-width="2"></rect>
      <text x="680" y="102" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">Unified Memory Pool</text>
      <text x="680" y="120" text-anchor="middle" font-size="8.5" fill="#15803D">one physical DRAM · CPU · GPU · ANE all see the same bytes</text>
      <rect x="548" y="132" width="120" height="22" rx="5" fill="rgba(22,163,74,.25)" stroke="rgba(134,239,172,.5)"></rect>
      <text x="608" y="147" text-anchor="middle" font-size="8.5" fill="#166534">CPU view (ptr)</text>
      <rect x="692" y="132" width="120" height="22" rx="5" fill="rgba(22,163,74,.25)" stroke="rgba(134,239,172,.5)"></rect>
      <text x="752" y="147" text-anchor="middle" font-size="8.5" fill="#166534">GPU view (same ptr)</text>
      <text x="680" y="190" text-anchor="middle" font-size="9" fill="#166534" font-weight="600">same address → zero-copy handoff</text>
      <text x="680" y="207" text-anchor="middle" font-size="8.5" fill="#4B5563">M2: ~100 GB/s · M2 Pro: ~200 GB/s · M2 Max/M4: 400+ GB/s</text>
      <text x="680" y="222" text-anchor="middle" font-size="8.5" fill="#4B5563">bandwidth ≫ any PCIe transfer — "the copy" is free</text>
      <rect x="40" y="260" width="830" height="120" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="455" y="290" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">What unified memory buys MLX — and costs it</text>
      <text x="455" y="314" text-anchor="middle" font-size="9.5" fill="#4F46E5">✓ no .to(device) semantics — mx.array just has a device tag; buffers are shared   ✓ model weights are ordinary process memory (RSS), easy to profile/inspect</text>
      <text x="455" y="334" text-anchor="middle" font-size="9.5" fill="#4F46E5">✓ multi-tenancy: CPU preprocessing and GPU compute overlap on the same data with zero sync   ✓ MPS contention with other apps is a scheduling concern, not a transfer one</text>
      <text x="455" y="354" text-anchor="middle" font-size="9.5" fill="#4B5563">✗ GPU must access memory through the same controller — lower absolute bandwidth than discrete HBM3   ✗ every GB the model takes is a GB the OS loses</text>
    </svg>

## mx.array — NumPy's Shape, a New Contract

MLX mirrors the NumPy API deliberately: `mx.array` supports dtypes, shapes, broadcasting, slicing, and the familiar reduction names. The differences are the interesting part:

📌

Device tag, not a copy

Every array carries `mx.cpu` or `mx.gpu` — but under unified memory the "transfer" is a cache-flush + fence, not a byte copy. Moving an array to GPU costs microseconds regardless of size.

🧊

Lazy by default

`c = a + b` does not add. It creates a node in a computation graph that references `a` and `b`. Nothing runs until the value is _evaluated_ — `mx.eval(c)`, use in a Python `if`/`while`, printing, or passing to a downstream non-MLX consumer.

🧵

Graphs power transforms

Because every op is recorded before execution, the same graph can be transformed — differentiated (grad), batched (vmap), or compiled (jit) — without a separate tracing framework. The lazy graph _is_ MLX's TorchScript/AF equivalent.

```python
import mlx.core as mx

a = mx.random.normal((1024, 1024))          # allocates buffer, fills on eval
b = a + a.T @ a                              # builds graph nodes only
print(b.shape)                               # shape known WITHOUT evaluating — cheap metadata
mx.eval(b)                                   # schedule + run on GPU, returns real values
mx.eval(a)                                   # already evaluated → no-op, cached buffer
```

<aside class="callout"><strong class="callout__title">mx.eval is the sync point</strong><div class="callout__body">— the equivalent of PyTorch's implicit per-op eager dispatch, but explicit and <em>bulk</em>: <code>mx.eval(a, b, c)</code> evaluates three subtrees in one scheduling pass, which is how MLX gets whole-layer fusion windows PyTorch eager can't see. Forcing evaluation inside a training step at the loss is the standard pattern.</div></aside>

## The Lazy Graph — What Actually Gets Built

```bash
# two-line expression
x = mx.random.normal((4096,))
y = mx.exp(x / mx.sum(x*x)) + 1.0

# graph recorded (simplified):
          ┌─────────┐
          │  prim::exp│──┐
          └────▲─────┘  │
               │add     │
          ┌────┴─────┐  │
          │ prim::add │◄─┘
          └────▲─────┘
      ┌────────┴────────┐
┌─────┴─────┐    ┌──────┴──────┐
│prim::divide│    │prim::full(1)│
└─────▲─────┘    └─────────────┘
┌─────┴─────┐
│ prim::sum  │   (x*x → prim::multiply)
└─────▲─────┘
   [x buffer]
```

Each node is a **primitive** (a known op with a registered evaluation kernel) referencing other nodes or raw buffers. Traversal is topological; when `mx.eval(y)` walks it, MLX's scheduler assigns work to CPU or GPU threads, reuses intermediate buffers where lifetime analysis allows, and fuses eligible runs (Tab 2).

### What lazy buys

**Fusion windows** — a chain of 10 elementwise ops becomes one kernel with no intermediate round-trips to memory. **Memory planning** — intermediates get arena-allocated and recycled. **Transforms** — the graph is data MLX rewrites for grad/vmap. **Fewer kernel launches** — the launch granularity is the eval, not the Python line.

### What lazy costs

**Memory invisibility** — a graph of 1000 unbuilt nodes references many pending outputs; peak memory is only visible after planning, which is why large models sometimes blow up only at eval. **Control-flow friction** — `if x.sum() > 0` forces evaluation; MLX added `mx.array` bool conversion policies to make this explicit. **Debugging** — errors surface at eval time, not op time.

<aside class="callout"><strong class="callout__title">Practical rule:</strong><div class="callout__body">in serving code, evaluate once per forward at the logits/sampling boundary — MLX's <code>mlx_lm</code> generate loop does exactly this. Evaluating inside inner elementwise chains (or not at all before a Python branch) either serializes the graph or forces needless syncs.</div></aside>

## Transforms · Compilation · Metal Kernels

### Transforms and the Metal Execution Path

Three composable transformations over the lazy graph — **vmap** (batching), **grad** (differentiation), **compile** (kernel fusion + memory planning) — and the Metal backend that executes the result. This is where MLX's design diverges most sharply from PyTorch.

One graph, three transforms, composable

<svg viewBox="0 0 900 380" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="380" fill="#F8FAFC"></rect>
      <rect x="60" y="40" width="200" height="70" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="160" y="68" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">User function</text>
      <text x="160" y="88" text-anchor="middle" font-size="9" fill="#4F46E5">def model(x, y): return loss(...)</text>
      <rect x="350" y="30" width="220" height="80" rx="10" fill="#fff" stroke="#7c3aed" stroke-width="2"></rect>
      <text x="460" y="56" text-anchor="middle" font-size="11" font-weight="700" fill="#6d28d9">mx.grad / value_and_grad</text>
      <text x="460" y="74" text-anchor="middle" font-size="8.5" fill="#4B5563">reverse-mode autodiff over the graph</text>
      <text x="460" y="90" text-anchor="middle" font-size="8.5" fill="#4B5563">vjp pushed into every primitive</text>
      <rect x="350" y="140" width="220" height="80" rx="10" fill="#fff" stroke="#0f766e" stroke-width="2"></rect>
      <text x="460" y="166" text-anchor="middle" font-size="11" font-weight="700" fill="#0f766e">mx.vmap</text>
      <text x="460" y="184" text-anchor="middle" font-size="8.5" fill="#4B5563">lifts scalar fn to batched op</text>
      <text x="460" y="200" text-anchor="middle" font-size="8.5" fill="#4B5563">vectorize without Python loops</text>
      <rect x="350" y="250" width="220" height="80" rx="10" fill="#fff" stroke="#D97706" stroke-width="2"></rect>
      <text x="460" y="276" text-anchor="middle" font-size="11" font-weight="700" fill="#92400e">mx.compile</text>
      <text x="460" y="294" text-anchor="middle" font-size="8.5" fill="#4B5563">graph → fused Metal kernels</text>
      <text x="460" y="310" text-anchor="middle" font-size="8.5" fill="#4B5563">+ arena memory plan + no Python</text>
      <path id="tg1" d="M260 75 L350 70" fill="none" stroke="#7c3aed" stroke-width="1.5"></path>
      <path id="tg2" d="M260 75 L350 180" fill="none" stroke="#0f766e" stroke-width="1.5"></path>
      <path id="tg3" d="M260 75 L350 290" fill="none" stroke="#D97706" stroke-width="1.5"></path>
      <circle r="4" fill="#7c3aed"><animateMotion dur="2.4s" repeatCount="indefinite" path="M260 75 L350 70"></animateMotion></circle>
      <circle r="4" fill="#0f766e"><animateMotion dur="2.4s" repeatCount="indefinite" begin=".8s" path="M260 75 L350 180"></animateMotion></circle>
      <circle r="4" fill="#D97706"><animateMotion dur="2.4s" repeatCount="indefinite" begin="1.6s" path="M260 75 L350 290"></animateMotion></circle>
      <rect x="640" y="110" width="220" height="110" rx="10" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="750" y="140" text-anchor="middle" font-size="11" font-weight="700" fill="#111827">All three compose</text>
      <text x="750" y="162" text-anchor="middle" font-size="9" fill="#4F46E5">loss_and_grad = mx.value_and_grad(step)</text>
      <text x="750" y="180" text-anchor="middle" font-size="9" fill="#4F46E5">batched = mx.vmap(per_sample)</text>
      <text x="750" y="198" text-anchor="middle" font-size="9" fill="#4B5563">fast = mx.compile(train_step) — like JAX, unlike PyTorch</text>
      <path d="M570 70 L640 130" fill="none" stroke="#7c3aed" stroke-width="1.3"></path>
      <path d="M570 180 L640 165" fill="none" stroke="#0f766e" stroke-width="1.3"></path>
      <path d="M570 290 L640 200" fill="none" stroke="#D97706" stroke-width="1.3"></path>
      <path id="rxp" d="M750 220 Q750 300 460 330 Q170 355 160 110" fill="none" stroke="#444ce7" stroke-width="1.3" stroke-dasharray="5,4"></path>
      <circle r="3.5" fill="#444ce7"><animateMotion dur="3.4s" repeatCount="indefinite"><mpath href="#rxp"></mpath></animateMotion></circle>
      <text x="455" y="352" text-anchor="middle" font-size="8.5" fill="#444ce7">the composed, compiled function is what actually executes</text>
    </svg>

## grad — Differentiation as a Graph Rewrite

MLX implements reverse-mode autodiff the JAX way: every primitive registers a **vector-Jacobian product (vjp)** — given the gradient of the output, compute the gradient of the input through this one op. `mx.grad(f)(x)` evaluates f's graph, seeds the output gradient with 1, and walks backward composing vpjs:

```python
def loss_fn(params, x, y):
    pred = model(params, x)          # pure function over mlx arrays
    return mx.mean((pred - y)**2)

grad_fn = mx.grad(loss_fn)          # function transform — no graph yet
g = grad_fn(params, x, y)           # builds fwd graph, evals, walks vjp chain
params = tree_map(lambda p, d: p - lr*d, params, g)   # functional update
```

Two consequences of the functional style: parameters are a pytree of arrays updated immutably (no `opt.step()` side effects — MLX's `mx.optimizers` provide `mx.update(params, grads, optimizer_state)` for the same pattern), and gradients flow through _any_ composition of primitives — including through other grads (higher-order) and through vmap (per-example gradients).

## compile — Where the Real Speed Lives

`mx.compile(f)` snapshots f's lazy graph on first call and thereafter executes a **pre-optimized program** instead of re-walking Python. The compilation pipeline:

1

Trace

Run f once, recording the primitive graph. Shapes and dtypes are baked in — recompiles on shape change (same trade-off as torch.compile dynamic shapes).

2

Kernel fusion

Maximal runs of elementwise/broadcast/reduce primitives are collapsed into single Metal kernels — the intermediate results never round-trip to DRAM. A 12-op MLP activation chain becomes one pass over memory.

3

Memory planning

The whole graph's intermediates are arena-planned: lifetimes computed, buffers reused, allocations eliminated where an output can overwrite an input. Compiled graphs can allocate _less_ than eager execution of the same code.

4

Dispatch

Each planned node maps to a CPU or GPU task on MLX's scheduler. GPU work hits the Metal command queue in large batches; CPU/GPU tasks overlap where the graph allows — the scheduler is work-stealing across all efficiency cores too.

<aside class="callout"><strong class="callout__title">Measured effect on LLM inference:</strong><div class="callout__body">compile typically buys 15–40% on decode-heavy loops in mlx-lm, and much more on small elementwise-heavy models — because decode is bandwidth-bound (see the transformer post) and fusion's entire value is <em>fewer bytes moved</em>, not fewer FLOPs.</div></aside>

## Metal — The Only Backend (Plus CPU)

MLX does not go through Vulkan or a vendor-neutral layer. Primitives have hand-tuned **Metal Shading Language kernels**, compiled at install/first-use and cached. The stack:

```bash
Python API (mlx.core, mlx.nn)
        │
C++ core (libmlx) ── primitives · lazy graph · scheduler · transforms
        │
Metal kernels (MSL) ── one (or few) specialized kernel per primitive family
        │
MTLCommandQueue / MTLCommandBuffer ── GPU execution, MPS-tracked
        │
Apple GPU (M-series: 8–40 cores, unified-memory controller)
```

Notable backend facts:

⚙️

Matmul goes through MPS Graph

GEMMs — the backbone of every transformer layer — are delegated to Apple's Metal Performance Shaders graph API, which picks the best tiled/async-accumulating kernel for the shape and precision (fp16/bf16/fp32, int8/int4 quantized).

🧵

CPU is a first-class backend

Every primitive also has a CPU implementation (accelerate/BNNS + custom SIMD). `mx.cpu` arrays run on efficiency+performance cores with threadpool parallelism — tokenization, preprocessing, and small ops can overlap GPU generation on the same memory.

🔬

Precision defaults

MLX defaults to float32, but mlx-lm runs inference in float16/bfloat16 with float32 accumulation where needed. Apple GPUs have fast fp16 paths and no Tensor Cores — bf16 support arrived via emulation-friendly paths; int8/int4 matmul has native unit formats.

🌊

Streams and async\_eval

`mx.async_eval(x)` schedules evaluation and returns immediately; `mx.synchronize()` waits. Custom `mx.streams` let heavy work run on a separate command queue — used by mlx-lm to overlap sampling CPU work with the next forward's GPU work.

## MLX vs PyTorch — Design Delta

| Dimension | PyTorch (eager) | MLX |
| --- | --- | --- |
| Execution | immediate, per-op dispatch | lazy graph, bulk eval |
| Memory model | two pools + explicit copies | one unified pool, zero-copy |
| Autograd | tape on live objects (side-effecting) | graph rewrite (functional) |
| Fusion | torch.compile / Inductor (needs graph capture) | built-in on every eval |
| Transforms | functorch bolted on | vmap/grad/compile native + composable |
| Backend | CUDA/ROCm/CPU (+ XLA, TensorRT) | Metal + CPU only |
| Portability | everywhere | Apple Silicon (unofficial builds elsewhere) |

<aside class="callout"><strong class="callout__title">Read it as a specialization, not a winner:</strong><div class="callout__body">PyTorch optimizes for the CUDA ecosystem, research flexibility, and hardware breadth. MLX optimizes for one hardware family it deeply understands — trading portability for zero-copy memory, always-on fusion, and a framework small enough to read end-to-end.</div></aside>

## nn · Quantization · Distributed · Serving

### The Ecosystem — How Models Actually Run

The framework layer (nn, optimizers, quantization), the distributed runtime (`mlx.launch` across machines over MPI-style collectives — as used on a two-Mac-mini cluster with ring allreduce over Thunderbolt), and the serving layer (`mlx_lm.server`, the OpenAI-compatible process serving gemma-4-e2b on mm1:8080).

## mx.nn — Functional Modules

`mlx.nn.Module` follows Flax more than PyTorch: modules are parameter containers, layers are just array math. State is explicit:

```python
class MLP(mx.nn.Module):
    def __init__(self, d, hidden):
        self.gate = mx.nn.Linear(d, hidden)
        self.up   = mx.nn.Linear(d, hidden)
        self.down = mx.nn.Linear(hidden, d)

    def __call__(self, x):
        return self.down(mx.silu(self.gate(x)) * self.up(x))

model = MLP(3584, 18432)
params = model.parameters()          # nested dict of arrays — plain data
mx.eval(params)                      # materialize before training
model.update(tree_apply(params))     # immutable-style update
```

Because `parameters()` returns a pytree of ordinary mlx arrays, everything downstream — optimizers, `mx.load/safetensors` I/O, quantize, distribution — operates on plain data. Loading a converted Hugging Face model is: read safetensors → set parameters → eval.

## Quantization — What Makes 7B Fit a Mac Mini

MLX supports **group-wise quantization**: weights are chunked (typically 64 elements), each group carries a scale (and the elements are packed int4 or int8). At inference a QuantizedLinear reads 4-bit weights straight from unified memory and scales activations into the integer domain inside the matmul kernel:

```bash
fp16 7B model         : 14.0 GB   → won't fit 8 GB Mac, tight on 16 GB
int4 (group 64)       : ~3.9 GB   → + per-group fp16 scales (~0.2%)
                       : mlx_lm loads 4-bit safetensors directly on M-series GPU

# group-wise scheme, per 64-weight chunk:
w_group → argmax abs → scale = max/7 (int8) or max/7 (int4)
dequant inside kernel: w_fp = w_int · scale          # fused, no materialization
```

### Why int4 barely hurts quality

Weight distributions in trained transformers are near-Gaussian and peaked; per-group scales absorb outliers. 4-bit quantization (NF4-style) typically costs <1% relative quality on 7B+ models — and decode _speeds up_ because decode is bandwidth-bound and int4 halves the bytes read (Tab 2 of the transformer post applies directly).

### Who quantizes

`mlx_lm.convert` takes any HF checkpoint → `mlx-community/*-4bit` on the Hub — which is why every model you see served on Apple Silicon has a `mlx-community` prefix. Activations stay fp16; only weights (and optionally KV cache) go low-bit.

Distributed MLX — tensor parallelism across two Mac minis

<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="420" fill="#F8FAFC"></rect>
      <rect x="40" y="50" width="340" height="250" rx="12" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="210" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">mm1 — Mac mini M2</text>
      <text x="210" y="97" text-anchor="middle" font-size="9" fill="#4F46E5">rank 0 · mlx_lm.server · :8080</text>
      <rect x="62" y="112" width="140" height="52" rx="7" fill="rgba(99,102,241,.12)" stroke="#C7D2FE"></rect>
      <text x="132" y="132" text-anchor="middle" font-size="9" fill="#4338CA" font-weight="600">Weights shard 0/2</text>
      <text x="132" y="148" text-anchor="middle" font-size="8" fill="#4B5563">8 Q-heads · 8 KV · half MLP</text>
      <rect x="218" y="112" width="140" height="52" rx="7" fill="rgba(99,102,241,.12)" stroke="#C7D2FE"></rect>
      <text x="288" y="132" text-anchor="middle" font-size="9" fill="#4338CA" font-weight="600">Local KV cache</text>
      <text x="288" y="148" text-anchor="middle" font-size="8" fill="#4B5563">its half of every layer</text>
      <rect x="62" y="180" width="296" height="44" rx="7" fill="rgba(22,163,74,.15)" stroke="rgba(134,239,172,.4)"></rect>
      <text x="210" y="198" text-anchor="middle" font-size="9" fill="#166534" font-weight="600">Local partial sums of attention/MLP output</text>
      <text x="210" y="214" text-anchor="middle" font-size="8" fill="#15803D">each rank computes on its shard only</text>
      <rect x="62" y="238" width="296" height="44" rx="7" fill="rgba(217,119,6,.15)" stroke="rgba(253,230,138,.4)"></rect>
      <text x="210" y="256" text-anchor="middle" font-size="9" fill="#92400E" font-weight="600">Ring allreduce — Thunderbolt 4 link</text>
      <text x="210" y="272" text-anchor="middle" font-size="8" fill="#92400E">192.0.2.221 ↔ 192.0.2.222 · ~75 MB/s during generation</text>
      <rect x="520" y="50" width="340" height="250" rx="12" fill="#EEF2FF" stroke="#444ce7" stroke-width="2"></rect>
      <text x="690" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">mm2 — Mac mini M4</text>
      <text x="690" y="97" text-anchor="middle" font-size="9" fill="#4F46E5">rank 1 · mlx_lm worker</text>
      <rect x="542" y="112" width="140" height="52" rx="7" fill="rgba(99,102,241,.12)" stroke="#C7D2FE"></rect>
      <text x="612" y="132" text-anchor="middle" font-size="9" fill="#4338CA" font-weight="600">Weights shard 1/2</text>
      <text x="612" y="148" text-anchor="middle" font-size="8" fill="#4B5563">8 Q-heads · 8 KV · half MLP</text>
      <rect x="698" y="112" width="140" height="52" rx="7" fill="rgba(99,102,241,.12)" stroke="#C7D2FE"></rect>
      <text x="768" y="132" text-anchor="middle" font-size="9" fill="#4338CA" font-weight="600">Local KV cache</text>
      <text x="768" y="148" text-anchor="middle" font-size="8" fill="#4B5563">its half of every layer</text>
      <rect x="542" y="180" width="296" height="44" rx="7" fill="rgba(22,163,74,.15)" stroke="rgba(134,239,172,.4)"></rect>
      <text x="690" y="198" text-anchor="middle" font-size="9" fill="#166534" font-weight="600">Local partial sums of attention/MLP output</text>
      <text x="690" y="214" text-anchor="middle" font-size="8" fill="#15803D">identical code, mirrored shard</text>
      <rect x="542" y="238" width="296" height="44" rx="7" fill="rgba(217,119,6,.15)" stroke="rgba(253,230,138,.4)"></rect>
      <text x="690" y="256" text-anchor="middle" font-size="9" fill="#92400E" font-weight="600">Ring allreduce — Thunderbolt 4 link</text>
      <text x="690" y="272" text-anchor="middle" font-size="8" fill="#92400E">dedicated 2nd NIC · never touches LAN routing</text>
      <path id="ring" d="M380 260 Q450 330 520 260" fill="none" stroke="#D97706" stroke-width="2.5"></path>
      <path id="ring2" d="M520 245 Q450 175 380 245" fill="none" stroke="#D97706" stroke-width="2.5" stroke-dasharray="4,3"></path>
      <circle r="4.5" fill="#D97706"><animateMotion dur="2.2s" repeatCount="indefinite"><mpath href="#ring"></mpath></animateMotion></circle>
      <circle r="4.5" fill="#D97706"><animateMotion dur="2.2s" repeatCount="indefinite" begin="1.1s"><mpath href="#ring2"></mpath></animateMotion></circle>
      <text x="450" y="352" text-anchor="middle" font-size="9.5" font-weight="700" fill="#92400e">mlx.launch — every allreduce in 2 ranks = one round trip</text>
      <text x="450" y="369" text-anchor="middle" font-size="8.5" fill="#4B5563">MLX_N_PROC=2 on both hosts · SSH transport (MPI-style) · NCCL-style collective API</text>
      <text x="450" y="30" text-anchor="middle" font-size="10" fill="#4B5563">one model, two machines — weights sharded, activations synchronized twice per layer</text>
    </svg>

## mlx.launch — Multi-Machine Execution

MLX's distributed layer mirrors its single-machine design: collectives (`all_reduce`, `all_gather`, `send/recv`) are array-level primitives that _return lazy arrays_ — they compose with grad/compile exactly like math ops.

```bash
import mlx.distributed as dist

dist.init()                              # rank/world from env (set by mlx.launch)
y = x.sum()
y = dist.sum(y)                            # lazy collective — composes with everything
mx.eval(y)

# launch on 2 hosts (SSH on both, same mlx-lm version):
mlx.launch --host-file hosts --n-processes 2 \
  python -m mlx_lm.server --model-path ./qwen3.5-7b --port 8080
```

🔁

Ring allreduce over Thunderbolt

With n=2, allreduce = one send/recv in each direction carrying N/n bytes each — total traffic 2·(n−1)/n·N ≈ N bytes per rank. On the mm1↔mm2 cluster the ring runs over the direct Thunderbolt link (192.168.2.x), keeping generation's ~75 MB/s of collective traffic off the LAN — measurable in `mlx_net_*` Prometheus metrics scraped by mlx-oc.

⛔

The TP-divisibility constraint

Tensor parallel degree must divide every sharded dimension — attention heads, KV heads, MLP intermediate. A 7B with 16 KV heads and intermediate 9216 divides 2 cleanly; a model with, say, 12 heads and intermediate 5504 would fail with "no tensor-parallel degree divides N nodes" — the exact error seen during cluster bring-up.

## Serving — mlx\_lm.server Anatomy

The process on mm1:8080 is exactly this: `mlx_lm.server --model mlx-community/gemma-4-e2b-it-4bit --host 0.0.0.0 --port 8080 --max-tokens 512` — an OpenAI-compatible FastAPI app over the mlx-lm generate loop.

```bash
# decode loop, simplified from mlx_lm.generate
while not stopped:
    logits = model(prompt_or_last_token, kv_cache)   # compiled fwd, lazy
    mx.eval(logits)                                  # THE sync point
    token = sample(logits[:, -1], temp, top_p)        # CPU, on real values
    cache.trim(over_budget)                          # KV eviction / rollover
```

| Endpoint | Behavior | Internals touched |
| --- | --- | --- |
| GET /v1/models | lists discovered models | model dir scan; hub ids |
| POST /v1/chat/completions | chat template → generate | tokenizer chat template, sampling, KV cache |
| GET /v1/completions | raw completion | same loop, no template |
| streaming (SSE) | token-by-token | async_eval pipelining hides sample latency |

<aside class="callout"><strong class="callout__title">The system_fingerprint in responses</strong><div class="callout__body">(<code>0.32.0-0.32.3-macOS-…-applegpu_…</code>) encodes the mlx-lm / Metal stack versions and GPU family — the server self-reports its build, which is how you verify what engine answered a request.</div></aside>

## The Full Picture — MLX in One Stack View

```bash
┌─ Applications ──────────────────────────────────────────────┐
│  mlx_lm.server :8080   omlx (cluster mgmt)   custom mlx apps │
├─ Ecosystem ─────────────────────────────────────────────────┤
│  mlx-lm (generate, server, convert)   mlx-vlm   mlx-audio    │
├─ Framework ─────────────────────────────────────────────────┤
│  mx.nn · optimizers · quantization · distributed collectives│
├─ Core ──────────────────────────────────────────────────────┤
│  mx.array · lazy graph · grad/vmap/compile · scheduler      │
├─ Execution ─────────────────────────────────────────────────┤
│  Metal kernels (MPS Graph matmul)   CPU (accelerate/SIMD)   │
├─ Hardware ──────────────────────────────────────────────────┤
│  unified memory pool · Apple GPU · ANE · Thunderbolt links  │
└─────────────────────────────────────────────────────────────┘
```

<aside class="callout"><strong class="callout__title">The one-paragraph summary:</strong><div class="callout__body">MLX is a NumPy-shaped array framework whose two foundational choices — unified memory (zero-copy between CPU and GPU, weights are plain process memory) and a lazy evaluation graph (bulk eval, always-on fusion, memory planning, and first-class grad/vmap/compile transforms) — make it a JAX-like system specialized for Apple Silicon. Group-wise int4 quantization plus bandwidth-optimal decode makes 7B-class models practical on a Mac mini; <code>mlx.launch</code> extends the same primitives across machines with ring allreduce over Thunderbolt, and <code>mlx_lm.server</code> wraps it all in an OpenAI-compatible API.</div></aside>
