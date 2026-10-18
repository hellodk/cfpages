---
title: "15 — SGLang on Two Mac Minis: A Scaffold, Not a Benchmark"
date: 2026-08-04
description: "SGLang joins the MLX vs vllm-metal comparison on two Mac Minis as an experimental scaffold — two independent replicas, native Prometheus metrics, and an unverified Apple Silicon device backend stated plainly, not glossed over."
tags: [sglang, llm, macos]
cover: "assets/images/covers/sglang-on-two-mac-minis.svg"
draft: false
---

15 of 19 · Experimental scaffold

A third engine joins the MLX-vs-vllm-metal comparison in `sglang/` — but SGLang's primary backend is CUDA, and nobody has confirmed it runs on Apple Silicon GPUs at all. Here is the independent-replica architecture, the native `sglang:*` metrics already wired into VictoriaMetrics, and the unverified device backend that has to be resolved before any of this produces a real number.

## 1Why SGLang, and why now

The MLX ring backend in `cluster/` has been running and instrumented since blog post 1. `vllm-metal/index.html` documents a draft plan for a second engine — an OpenAI-compatible MLX serving layer, load-balanced across the same two nodes. `sglang/` is the scaffolding for a **third** engine: the goal is a real, measured three-way comparison of MLX vs vllm-metal vs SGLang on the same two Mac Minis (`192.0.2.64`/`203.0.113.1` rank0, `192.0.2.5`/`203.0.113.2` rank1).

3

Engines in the planned comparison

0

Inference requests run against SGLang so far

This work takes inspiration from `hydra`, a much larger, mostly design-stage 28–40 node enterprise LLM fleet project. Hydra already built SGLang-aware Grafana dashboards and Prometheus alert rules (`sglang-inference.json`, `sglang-inference.yaml`) _before_ ever running a real SGLang node. So the question this post exists to ask plainly — does SGLang even run acceptably on this hardware — is not a solved problem on either side of that comparison.

## 2Architecture reality: two independent replicas, not a ring

MLX's `cluster/` setup distributes **one logical model** across both nodes using `mlx.launch --backend ring` — MLX's own NCCL-free ring collectives. SGLang has no equivalent ring or tensor-parallel backend for Apple Silicon: its distributed code paths assume NCCL and CUDA GPUs, neither of which exists here. So `sglang/start_server.sh` launches two **fully independent** SGLang server processes, one per Mac Mini, each serving its own complete copy of the model on its own `:30000` endpoint.

<svg viewBox="0 0 760 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Architecture diagram: clients route through a documented nginx load balancer to two independent SGLang replicas on rank0 and rank1, with no ring or tensor-parallel link between them">
        <defs>
          <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="#5b6072"></path>
          </marker>
        </defs>
        <text x="380" y="26" font-size="13" font-weight="800" text-anchor="middle" fill="#1d1f2b">SGLang On Two Mac Minis &mdash; Independent Replicas, Not A Ring</text>
        <rect x="280" y="50" width="200" height="40" rx="10" fill="#eef0ff" stroke="#c7d2fe" stroke-width="1.5"></rect>
        <text x="380" y="68" font-size="12" font-weight="700" text-anchor="middle" fill="#1d1f2b">Clients</text>
        <text x="380" y="83" font-size="10" text-anchor="middle" fill="#5b6072">OpenAI-Compatible Requests</text>
        <line x1="380" y1="90" x2="380" y2="118" stroke="#5b6072" stroke-width="1.5" marker-end="url(#ah)"></line>
        <rect x="260" y="118" width="240" height="50" rx="10" fill="#fef3d7" stroke="#b45309" stroke-width="1.5" stroke-dasharray="6 4"></rect>
        <text x="380" y="138" font-size="12" font-weight="700" text-anchor="middle" fill="#1d1f2b">nginx Load Balancer</text>
        <text x="380" y="153" font-size="9" text-anchor="middle" fill="#5b6072">Round-Robin &middot; Documented, Not Scripted</text>
        <path d="M380,168 L380,192 L185,192 L185,210" fill="none" stroke="#5b6072" stroke-width="1.5" marker-end="url(#ah)"></path>
        <path d="M380,168 L380,192 L575,192 L575,210" fill="none" stroke="#5b6072" stroke-width="1.5" marker-end="url(#ah)"></path>
        <rect x="40" y="210" width="290" height="180" rx="12" fill="#e6f6f4" stroke="#0f766e" stroke-width="1.5"></rect>
        <text x="185" y="232" font-size="12" font-weight="800" text-anchor="middle" fill="#0f766e">rank0 &middot; 192.0.2.64</text>
        <rect x="52" y="248" width="266" height="58" rx="8" fill="#ffffff" stroke="#c7e9e4" stroke-width="1"></rect>
        <text x="185" y="266" font-size="11" font-weight="700" text-anchor="middle" fill="#1d1f2b">SGLang :30000</text>
        <text x="185" y="280" font-size="9.5" font-weight="700" text-anchor="middle" fill="#ea580c">Device Backend: UNVERIFIED</text>
        <text x="185" y="293" font-size="9" text-anchor="middle" fill="#5b6072">/health &middot; /metrics &middot; sglang:* metrics</text>
        <circle cx="302" cy="256" r="5" fill="#ea580c">
          <animate attributeName="opacity" values="1;.35;1" dur="2s" repeatCount="indefinite"></animate>
        </circle>
        <circle cx="302" cy="256" r="5" fill="none" stroke="#ea580c" stroke-width="1.5">
          <animate attributeName="r" values="5;13;5" dur="2s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".8;0;.8" dur="2s" repeatCount="indefinite"></animate>
        </circle>
        <rect x="52" y="314" width="266" height="50" rx="8" fill="#ffffff" stroke="#c7e9e4" stroke-width="1"></rect>
        <text x="185" y="332" font-size="10" font-weight="700" text-anchor="middle" fill="#1d1f2b">mlx_hw_telemetry :9102</text>
        <text x="185" y="346" font-size="9" text-anchor="middle" fill="#5b6072">Reused As-Is &middot; Engine-Agnostic</text>
        <text x="185" y="378" font-size="8.5" text-anchor="middle" fill="#5b6072">curl 127.0.0.1:30000/health</text>
        <rect x="430" y="210" width="290" height="180" rx="12" fill="#fde8f1" stroke="#db2777" stroke-width="1.5"></rect>
        <text x="575" y="232" font-size="12" font-weight="800" text-anchor="middle" fill="#db2777">rank1 &middot; 192.0.2.5</text>
        <rect x="442" y="248" width="266" height="58" rx="8" fill="#ffffff" stroke="#fad1e1" stroke-width="1"></rect>
        <text x="575" y="266" font-size="11" font-weight="700" text-anchor="middle" fill="#1d1f2b">SGLang :30000</text>
        <text x="575" y="280" font-size="9.5" font-weight="700" text-anchor="middle" fill="#ea580c">Device Backend: UNVERIFIED</text>
        <text x="575" y="293" font-size="9" text-anchor="middle" fill="#5b6072">/health &middot; /metrics &middot; sglang:* metrics</text>
        <circle cx="698" cy="256" r="5" fill="#ea580c">
          <animate attributeName="opacity" values="1;.35;1" dur="2s" begin="1s" repeatCount="indefinite"></animate>
        </circle>
        <circle cx="698" cy="256" r="5" fill="none" stroke="#ea580c" stroke-width="1.5">
          <animate attributeName="r" values="5;13;5" dur="2s" begin="1s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values=".8;0;.8" dur="2s" begin="1s" repeatCount="indefinite"></animate>
        </circle>
        <rect x="442" y="314" width="266" height="50" rx="8" fill="#ffffff" stroke="#fad1e1" stroke-width="1"></rect>
        <text x="575" y="332" font-size="10" font-weight="700" text-anchor="middle" fill="#1d1f2b">mlx_hw_telemetry :9102</text>
        <text x="575" y="346" font-size="9" text-anchor="middle" fill="#5b6072">Reused As-Is &middot; Engine-Agnostic</text>
        <text x="575" y="378" font-size="8.5" text-anchor="middle" fill="#5b6072">curl 192.0.2.5:30000/health</text>
        <text x="380" y="232" font-size="10" font-weight="800" text-anchor="middle" fill="#dc2626">NO RING</text>
        <circle cx="380" cy="277" r="15" fill="#fee2e2" stroke="#dc2626" stroke-width="2"></circle>
        <text x="380" y="282" font-size="14" font-weight="800" text-anchor="middle" fill="#dc2626">&#10005;</text>
        <text x="380" y="310" font-size="9" font-weight="800" text-anchor="middle" fill="#dc2626">NO NCCL/TP</text>
        <text x="380" y="332" font-size="9" font-weight="700" text-anchor="middle" fill="#5b6072">2 INDEPENDENT</text>
        <text x="380" y="346" font-size="9" font-weight="700" text-anchor="middle" fill="#5b6072">REPLICAS</text>
        <circle r="4" fill="#ea580c" opacity=".8">
          <animateMotion dur="2s" repeatCount="indefinite" path="M380,90 L380,118"></animateMotion>
        </circle>
        <circle r="4" fill="#0f766e" opacity=".8">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M380,168 L380,192 L185,192 L185,210"></animateMotion>
        </circle>
        <circle r="4" fill="#db2777" opacity=".8">
          <animateMotion dur="2.5s" begin="1.25s" repeatCount="indefinite" path="M380,168 L380,192 L575,192 L575,210"></animateMotion>
        </circle>
      </svg>

Two fully independent SGLang server processes, one per Mac Mini, each behind its own `:30000` endpoint — the same independent-replica shape as vllm-metal, not the ring-backend shape MLX uses in `cluster/`. The orange pulsing dot marks the one thing this diagram cannot vouch for: whether the device backend behind that endpoint is actually the GPU.

| Engine | Distribution model | What runs where |
| --- | --- | --- |
| MLX (`cluster/`) | Ring backend (`mlx.launch --backend ring`) | One logical model, sharded across both nodes |
| vllm-metal (`vllm-metal/`) | Independent replicas, nginx round-robin | Two full model copies, load-balanced |
| SGLang (`sglang/`) | Independent replicas, nginx round-robin (reused pattern) | Two full model copies, load-balanced — no ring/TP option on Apple Silicon |

Load balancing across the two SGLang replicas is **documented, not scripted** in this repo: `sglang/start_server.sh` deliberately does not duplicate an nginx config, and instead points at `vllm-metal/index.html` section 5 ("Load balancing and routing"), which already covers exactly this two-node-independent-replica shape.

## 3The unverified device backend — stated plainly

⚠ Read this before running anything SGLang's primary backend is **CUDA** — NVIDIA GPUs via FlashInfer/Triton kernels. There is **no confirmed, mainstream Metal/MLX backend for SGLang** analogous to vLLM's MLX fork (`vllm-metal`, already documented in this repo). Nothing in `sglang/` claims SGLang runs on Apple Silicon GPUs — let alone runs well. `sglang/start_server.sh` leaves `SGLANG_DEVICE` unset on purpose: the correct value here, if one even exists, is **unverified**. Running the script as-is lets SGLang auto-detect a device, which will most likely fall back to CPU — and a CPU fallback would almost certainly be too slow to be a meaningful comparison point against MLX or vllm-metal, both of which run on the GPU. Confirm device support against SGLang's own documentation and `--help` output before this scaffold is useful for anything beyond exercising the launch/log/health-check plumbing.

This is why `sglang/hosts.json` and `start_server.sh` are written the way they are: they wire up the parts that don't depend on the answer — two independent processes, log paths, health/metrics polling — and refuse to guess at the part that does. `SGLANG_MODEL` also has no default; the MLX-quantized model id used by `cluster/` (`mlx-community/Qwen3-1.7B-4bit`) is not loadable by SGLang, so a real HuggingFace checkpoint has to be chosen explicitly once the device question is answered.

## 4Plugging into the existing observability stack

MLX's `mlx_lm.server` ships with zero metrics, which is why `cluster/mlx_metrics_proxy.py` exists as a sidecar. SGLang needs no such thing: like vllm-metal, it emits **native Prometheus metrics** directly on `:30000/metrics`, under the `sglang:*` namespace — for example `sglang:time_to_first_token_seconds_bucket`, `sglang:num_running_reqs`, `sglang:num_waiting_reqs`, `sglang:token_usage`, `sglang:cache_hit_rate`, and `sglang:gen_throughput`. Health lives at `:30000/health`.

Hardware telemetry needs no new code either. `cluster/mlx_hw_telemetry.py` is engine-agnostic — it reads Apple Silicon CPU, RAM, GPU and power data via `ioreg`, `powermetrics`, and `pmset`, with nothing MLX-specific in it — and it is already running on both nodes at `:9102` via `cluster/start_server.sh`. It is reused as-is.

| Port | Service | Node(s) | Notes |
| --- | --- | --- | --- |
| `:30000` | SGLang server (API + /health + /metrics) | Both, independent | Native Prometheus metrics under `sglang:*` |
| `:9102` | `mlx_hw_telemetry.py` | Both | Reused as-is, engine-agnostic, no changes needed |
| `:8080` | `mlx_metrics_proxy.py` | rank0 only | MLX-only sidecar — SGLang needs no equivalent |
| `:8000` | vllm-metal API | Both, independent | Also native metrics, no proxy |

### Scrape job (already added to `observability/vm-scrape.tmpl.yml`)

```bash
# Experimental / unverified: two independent sglang replicas (no ring/TP
# backend on Apple Silicon). Native sglang:* Prometheus metrics, no proxy
# sidecar needed. See sglang/ and README.md "SGLang (experimental)".
- job_name: sglang
  scrape_interval: 15s
  metrics_path: /metrics
  static_configs:
    - targets:
        - "__MLX_IP__:30000"
      labels:
        service: sglang
        node: rank0
        provider: "sglang"
    - targets:
        - "__RANK1_IP__:30000"
      labels:
        service: sglang
        node: rank1
        provider: "sglang"
```

The `provider: "sglang"` label is deliberate: it is the same key MLX and vllm-metal would carry if a cross-engine normalization layer (recording rules folding `mlx_*`/`vllm:*`/`sglang:*` into one `mlxoc:llm:*` namespace) is added later, following the pattern `suggestions.md` describes from Hydra.

One real thing this section is not claimingThe scrape job is wired in and will happily return "no data" or connection-refused metrics for `up{job="sglang"}` until an actual SGLang process is listening on `:30000`. Wiring the pipe is not the same as confirming what flows through it.

## 5Status: experimental scaffold

### Done

-   `sglang/hosts.json` — describes the two-node independent-replica shape (not a ring hostfile like `cluster/hosts.json`)
-   `sglang/start_server.sh` / `stop_server.sh` — launch/log/health-check plumbing for two independent processes, one local, one over ssh
-   `observability/vm-scrape.tmpl.yml` — `sglang` scrape job added, labeled `provider: "sglang"`
-   README `## SGLang (experimental)` section documenting all of the above

### Not done

-   No SGLang process has been started on either Mac Mini
-   No real inference request has been sent to `:30000`
-   No benchmark numbers exist — none of the vllm-metal-style "~30 tok/s" figures apply here; this post has zero of its own
-   Device backend (CPU vs any GPU path) is unconfirmed
-   `SGLANG_MODEL` is unset (`REPLACE_ME_HF_MODEL_ID` placeholder)
-   nginx load balancer for the two replicas is not scripted, only documented by reference

### Next steps, in order

1.  Confirm SGLang's actual device support for Apple Silicon against SGLang's own docs and `python3 -m sglang.launch_server --help` — does a Metal/MPS path exist at all, or is CPU-only the honest answer?
2.  If a real GPU path exists: set `SGLANG_DEVICE` explicitly and pick a real `SGLANG_MODEL` (a standard HuggingFace checkpoint — not an MLX-quantized artifact).
3.  If it's CPU-only: decide whether a CPU number is even worth recording next to MLX's and vllm-metal's GPU numbers, or whether SGLang gets marked "not comparable on this hardware" instead of forcing a misleading side-by-side.
4.  Once genuinely live, run the same measurement methodology already used for the MLX ring — the `tools/bench.py` streaming TTFT / token-rate / concurrency approach documented in the README's Benchmarks section and blog post 7 — so all three engines are measured the same way, not three different ways.

## 6Further reading

The full comparison against Hydra — including a diagnosed vLLM-MLX bug Hydra hit on this exact same rank1 IP (`192.0.2.5`), and the case for treating mlx-oc as the better base for real 2-node benchmarking — lives in [`suggestions.md`](../suggestions.md) at the repo root. Hydra's own SGLang dashboards and alert rules (`sglang-inference.json`, `sglang-inference.yaml`) were built ahead of any live SGLang node too, so the uncertainty documented here isn't a solved problem on either side of the fence.
