---
title: "The Local LLM Serving Landscape on Apple Silicon — Full Detail"
date: 2026-10-17
description: "A full-detail, provenance-tagged map of local LLM serving on Apple Silicon: MLX-native servers and apps, GGUF and portable engines, request data paths, kernel cross-credit between oMLX and mlx-serve, and third-party benchmark numbers as reported."
tags: [llm, inference, mlx, apple-silicon]
draft: false
---

🗺️ Landscape Map

Dozens of projects now promise an OpenAI-compatible endpoint on a Mac. They split cleanly into three families: **MLX-native** servers and apps, **GGUF and portable** engines built on llama.cpp, and **research** runtimes from the literature. This post maps all three, compares the request data path of two MLX-native servers in detail, and shows the kernel cross-credit loop between `oMLX` and `mlx-serve`. Every fact cell carries a provenance tag.

**Provenance convention used throughout this post.** I directly verified _only two things_: the **oMLX local repository** (README + source layout) and the **ddalcu/mlx-serve README** (fetched from GitHub). Every factual cell below is tagged: \[verified here\] for those two, \[vendor-stated\] for a claim made by the project itself that I did not independently confirm, and \[third-party\] for numbers or descriptions from another party (blogs, arXiv, directories). No tag appears on a fact I did not actually check, and no unverified number is presented as my own measurement.

MLX-Native Tool Rows

12

servers & apps in Table A

GGUF / Portable + Research

8

6 portable + 2 research in Table B

API Surfaces, One Port

4

mlx-serve on :11234

Projects Named "mlx-serve"

2

ddalcu (Zig) & raspoli (Python)

## 1\. The Landscape

Three families of local inference engines on Apple Silicon, grouped by the runtime they actually execute on.

The grouping matters because the runtime decides almost everything else: which model files load without conversion, which quantization regimes exist, and how much of the serving stack is reusable. **MLX-native** servers execute MLX arrays through Apple's MLX and mlx-lm/mlx-vlm libraries on the Metal GPU. **GGUF / portable** engines execute through llama.cpp's ggml and ship as broad, cross-platform tools. **Research** runtimes come primarily from the literature and are evaluated as systems rather than as products.

Diagram A — Landscape Map: MLX-Native vs GGUF / Portable vs Research Engines

<svg viewBox="0 0 1000 480" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Three panels grouping local LLM tools into MLX-native servers and apps, GGUF or portable engines, and research engines, with two labelled bridges below">
            <defs>
              <path id="a-bridge1" d="M174 430 H494"></path>
              <path id="a-bridge2" d="M494 430 H814"></path>
            </defs>
            <rect x="640" y="26" width="12" height="12" rx="3" fill="#EFF6FF" stroke="#2563EB"></rect>
            <text x="658" y="36" font-size="11" fill="#1E3A8A" font-weight="600">MLX-Native</text>
            <rect x="752" y="26" width="12" height="12" rx="3" fill="#F0FDF4" stroke="#16A34A"></rect>
            <text x="770" y="36" font-size="11" fill="#15803D" font-weight="600">GGUF / Portable</text>
            <rect x="886" y="26" width="12" height="12" rx="3" fill="#F5F3FF" stroke="#7C3AED"></rect>
            <text x="904" y="36" font-size="11" fill="#6D28D9" font-weight="600">Research</text>
            <rect x="24" y="56" width="300" height="340" rx="10" fill="#F8FAFF" stroke="#2563EB" stroke-width="1.5"></rect>
            <text x="40" y="82" font-size="12.5" font-weight="700" fill="#1E3A8A">MLX-Native Servers &amp; Apps</text>
            <text x="316" y="82" font-size="11" font-weight="700" fill="#1E3A8A" text-anchor="end">12</text>
            <line x1="24" y1="94" x2="324" y2="94" stroke="#DBEAFE"></line>
            <rect x="36" y="104" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="119" font-size="10.5" fill="#111827" font-weight="600">oMLX (jundot/omlx)</text><text x="306" y="119" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="36" y="128" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="143" font-size="10.5" fill="#111827" font-weight="600">mlx-serve (ddalcu)</text><text x="306" y="143" font-size="9" fill="#4B5563" text-anchor="end">Zig &middot; MLX+GGUF</text>
            <rect x="36" y="152" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="167" font-size="10.5" fill="#111827" font-weight="600">mlx-serve (raspoli)</text><text x="306" y="167" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="36" y="176" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="191" font-size="10.5" fill="#111827" font-weight="600">mlx-openai-server (cubist38)</text><text x="306" y="191" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="36" y="200" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="215" font-size="10.5" fill="#111827" font-weight="600">mlx-lm-server (Ar9av)</text><text x="306" y="215" font-size="9" fill="#4B5563" text-anchor="end">Rust &middot; MLX</text>
            <rect x="36" y="224" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="239" font-size="10.5" fill="#111827" font-weight="600">andychoi/mlx-server</text><text x="306" y="239" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="36" y="248" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="263" font-size="10.5" fill="#111827" font-weight="600">mzbac/mlx-llm-server</text><text x="306" y="263" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="36" y="272" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="287" font-size="10.5" fill="#111827" font-weight="600">mlx-optiq</text><text x="306" y="287" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="36" y="296" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="311" font-size="10.5" fill="#111827" font-weight="600">vMLX / MLX Studio</text><text x="306" y="311" font-size="9" fill="#4B5563" text-anchor="end">MLX engine</text>
            <rect x="36" y="320" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="335" font-size="10.5" fill="#111827" font-weight="600">MLXHub</text><text x="306" y="335" font-size="9" fill="#4B5563" text-anchor="end">mlx-swift</text>
            <rect x="36" y="344" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="359" font-size="10.5" fill="#111827" font-weight="600">Mac MLX (macmlx.app)</text><text x="306" y="359" font-size="9" fill="#4B5563" text-anchor="end">native</text>
            <rect x="36" y="368" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="46" y="383" font-size="10.5" fill="#111827" font-weight="600">mlx_lm.server (ml-explore)</text><text x="306" y="383" font-size="9" fill="#4B5563" text-anchor="end">Python &middot; MLX</text>
            <rect x="344" y="56" width="300" height="340" rx="10" fill="#F7FDF9" stroke="#16A34A" stroke-width="1.5"></rect>
            <text x="360" y="82" font-size="12.5" font-weight="700" fill="#15803D">GGUF / Portable Engines</text>
            <text x="636" y="82" font-size="11" font-weight="700" fill="#15803D" text-anchor="end">6</text>
            <line x1="344" y1="94" x2="644" y2="94" stroke="#DCFCE7"></line>
            <rect x="356" y="104" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="366" y="119" font-size="10.5" fill="#111827" font-weight="600">llama.cpp (llama-server)</text><text x="626" y="119" font-size="9" fill="#4B5563" text-anchor="end">C/C++</text>
            <rect x="356" y="128" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="366" y="143" font-size="10.5" fill="#111827" font-weight="600">Ollama</text><text x="626" y="143" font-size="9" fill="#4B5563" text-anchor="end">Go</text>
            <rect x="356" y="152" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="366" y="167" font-size="10.5" fill="#111827" font-weight="600">LM Studio</text><text x="626" y="167" font-size="9" fill="#4B5563" text-anchor="end">TS + C++</text>
            <rect x="356" y="176" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="366" y="191" font-size="10.5" fill="#111827" font-weight="600">Jan</text><text x="626" y="191" font-size="9" fill="#4B5563" text-anchor="end">desktop</text>
            <rect x="356" y="200" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="366" y="215" font-size="10.5" fill="#111827" font-weight="600">KoboldCpp</text><text x="626" y="215" font-size="9" fill="#4B5563" text-anchor="end">C/C++</text>
            <rect x="356" y="224" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="366" y="239" font-size="10.5" fill="#111827" font-weight="600">Atomic Chat</text><text x="626" y="239" font-size="9" fill="#4B5563" text-anchor="end">mod. llama.cpp</text>
            <rect x="664" y="56" width="300" height="340" rx="10" fill="#FAF8FF" stroke="#7C3AED" stroke-width="1.5"></rect>
            <text x="680" y="82" font-size="12.5" font-weight="700" fill="#6D28D9">Research Engines</text>
            <text x="956" y="82" font-size="11" font-weight="700" fill="#6D28D9" text-anchor="end">2</text>
            <line x1="664" y1="94" x2="964" y2="94" stroke="#EDE9FE"></line>
            <rect x="676" y="104" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="686" y="119" font-size="10.5" fill="#111827" font-weight="600">MLC-LLM</text><text x="946" y="119" font-size="9" fill="#4B5563" text-anchor="end">C++ / Python &middot; TVM</text>
            <rect x="676" y="128" width="276" height="22" rx="5" fill="#FFFFFF" stroke="#E5E7EB"></rect>
            <text x="686" y="143" font-size="10.5" fill="#111827" font-weight="600">PyTorch MPS</text><text x="946" y="143" font-size="9" fill="#4B5563" text-anchor="end">Python</text>
            <text x="684" y="176" font-size="10" font-weight="700" fill="#4B5563">Evaluated in arXiv 2511.05502 (preprint):</text>
            <text x="684" y="194" font-size="9.5" fill="#4B5563">&bull; MLC-LLM: strongest batching / concurrency,</text>
            <text x="684" y="209" font-size="9.5" fill="#4B5563">64k&ndash;128k long context on Apple Silicon</text>
            <text x="684" y="227" font-size="9.5" fill="#4B5563">&bull; PyTorch MPS: no native streaming server;</text>
            <text x="684" y="242" font-size="9.5" fill="#4B5563">described as impractical for production</text>
            <text x="684" y="264" font-size="9.5" fill="#4B5563">Both are research-side baselines, not</text>
            <text x="684" y="279" font-size="9.5" fill="#4B5563">productized Mac servers.</text>
            <line x1="174" y1="396" x2="174" y2="430" stroke="#D1D5DB"></line>
            <line x1="494" y1="396" x2="494" y2="430" stroke="#D1D5DB"></line>
            <line x1="814" y1="396" x2="814" y2="430" stroke="#D1D5DB"></line>
            <line x1="174" y1="430" x2="494" y2="430" stroke="#2563EB" stroke-width="1.5"></line>
            <line x1="494" y1="430" x2="814" y2="430" stroke="#7C3AED" stroke-width="1.5"></line>
            <text x="334" y="418" font-size="10" fill="#1D4ED8" text-anchor="middle" font-weight="600">MLX + GGUF on one port &mdash; mlx-serve (ddalcu)</text>
            <text x="654" y="418" font-size="10" fill="#6D28D9" text-anchor="middle" font-weight="600">Benchmarked together &mdash; arXiv 2511.05502 (preprint)</text>
            <circle cx="174" cy="430" r="4" fill="#2563EB"></circle>
            <circle cx="174" cy="430" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
              <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite"></animate>
              <animate attributeName="stroke-opacity" values="0.7;0" dur="2s" repeatCount="indefinite"></animate>
            </circle>
            <circle cx="494" cy="430" r="4" fill="#2563EB"></circle>
            <circle cx="494" cy="430" r="4" fill="none" stroke="#2563EB" stroke-width="1.5">
              <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite" begin="-0.7s"></animate>
              <animate attributeName="stroke-opacity" values="0.7;0" dur="2s" repeatCount="indefinite" begin="-0.7s"></animate>
            </circle>
            <circle cx="814" cy="430" r="4" fill="#7C3AED"></circle>
            <circle cx="814" cy="430" r="4" fill="none" stroke="#7C3AED" stroke-width="1.5">
              <animate attributeName="r" values="4;16" dur="2s" repeatCount="indefinite" begin="-1.3s"></animate>
              <animate attributeName="stroke-opacity" values="0.7;0" dur="2s" repeatCount="indefinite" begin="-1.3s"></animate>
            </circle>
            <g>
              <circle r="4" fill="#1D4ED8">
                <animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#a-bridge1" xlink:href="#a-bridge1"></mpath></animateMotion>
              </circle>
              <circle r="4" fill="none" stroke="#1D4ED8" stroke-width="1.5">
                <animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#a-bridge1" xlink:href="#a-bridge1"></mpath></animateMotion>
                <animate attributeName="r" values="4;13" dur="0.9s" repeatCount="indefinite"></animate>
                <animate attributeName="stroke-opacity" values="0.8;0" dur="0.9s" repeatCount="indefinite"></animate>
              </circle>
            </g>
            <g>
              <circle r="4" fill="#6D28D9">
                <animateMotion dur="2.6s" repeatCount="indefinite" begin="-1.3s"><mpath href="#a-bridge2" xlink:href="#a-bridge2"></mpath></animateMotion>
              </circle>
              <circle r="4" fill="none" stroke="#6D28D9" stroke-width="1.5">
                <animateMotion dur="2.6s" repeatCount="indefinite" begin="-1.3s"><mpath href="#a-bridge2" xlink:href="#a-bridge2"></mpath></animateMotion>
                <animate attributeName="r" values="4;13" dur="0.9s" repeatCount="indefinite" begin="-0.45s"></animate>
                <animate attributeName="stroke-opacity" values="0.8;0" dur="0.9s" repeatCount="indefinite" begin="-0.45s"></animate>
              </circle>
            </g>
          </svg>

Animated: expanding/fading radar rings at each hub and along both bridges, with flow dots whose motion paths are the exact bridge lines drawn above them. The two bridges mark the points where the families actually meet — mlx-serve runs MLX _and_ GGUF on one port, and the MLC-LLM / PyTorch MPS rows are research baselines evaluated together in one preprint.

**Reading the map:** the MLX-native column is the largest by far, but "MLX-native" only means the engine executes MLX arrays — not that the servers agree on licensing, default ports, or how many models they can hold at once. The next two sections break each row down.

## 2\. MLX-Native Servers & Apps

Every MLX-native row in the landscape, with formats, API surfaces, license, default port, and stated facts.

MLX-native projects all execute through Apple's MLX. Beyond that they diverge: some are Python/FastAPI wrappers around mlx-lm, one is a Zig binary with no Python at all, one is a Rust host with PyO3 glue, and two are GUI apps. The two rows I verified directly are `oMLX` (local repository) and `mlx-serve` by ddalcu (README read on GitHub); the rest are tagged vendor- or third-party-stated.

| Tool | Language / Runtime | Formats | API Surfaces | License | Default Port | Notable Stated Facts | Provenance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| oMLX (jundot/omlx) | Python | MLX | OpenAI, Anthropic, `/v1/responses`, `/tokenize` + `/detokenize`, `/v1/systemone` + `/v1/decisions`, `/v1/audio/*` | Apache-2.0 | 8000 | Tiered KV cache: hot RAM + cold SSD, restored after restart; continuous batching (mlx-lm BatchGenerator); multi-model LRU eviction, pinning, per-model TTL, process memory cap; experimental multi-Mac pipeline ranks over Ring / Thunderbolt RDMA / JACCL; SwiftUI menu-bar app | [verified here] |
| mlx-serve (ddalcu) | Zig, no Python | MLX + GGUF + DeepSeek V4 Flash via ds4 | OpenAI, Anthropic, Ollama API, Responses + WebSocket, `/v1/decisions`, `/v1/images`, `/v1/audio`, `/v1/video`, `/v1/3d` | README license badge says MIT; GitHub header shows Apache-2.0 (unresolved conflict) | 11234 | Single ~7 MB binary; macOS 26.2+; plus Linux x64/arm64 CUDA 13 builds; 4/8-bit KV-cache quantization; PLD + drafter + native MTP speculative decoding; LAN model sharing; MLX Core menu-bar app | [verified here] |
| mlx-serve (raspoli) | Python / FastAPI | MLX | OpenAI | MIT | 8095 | Hot-swaps one model at a time; text / vision / embeddings / TTS / STT / decision (Laya); subprocess isolation | [vendor-stated] |
| mlx-openai-server (cubist38) | Python / FastAPI | MLX | OpenAI | MIT | 8000 | Text / vision / audio / image-gen / image-edit / Whisper / embeddings; speculative decoding (lm only, not the continuous-batch path); JSON-schema structured output; LoRA; request queue; multi-model via YAML, subprocess per model | [vendor-stated] |
| mlx-lm-server / "mlx-local-server" (Ar9av) | Rust + PyO3 (MLX) | MLX | OpenAI, Anthropic | MIT | 8000 / 8001 / 8002 (LLM / audio / image) | Claimed 8 MB idle RSS and 16 ms cold start; embeddings, rerank, vision routing; multiple LoRA hot-swap per request; per-request speculative `num_draft_tokens`; MoE top-k override; "showcased at WWDC 2025" | [vendor-stated] |
| andychoi/mlx-server | Python | MLX | OpenAI / Ollama | MIT | example 11434 | LRU model eviction flags; Prometheus `/metrics`; bearer-token auth; LoRA adapters; launchd service | [vendor-stated] |
| mzbac/mlx-llm-server | Python | MLX | OpenAI | MIT | 8080 default | Early MLX server (created 2023; 33 commits) | [vendor-stated] |
| mlx-optiq | Python (MLX) | MLX | OpenAI + Anthropic | not stated | — | Calibration-driven per-layer mixed-precision weights AND KV cache; sensitivity-aware LoRA; OptiQ Lab browser workbench; sandboxed tools | [vendor-stated] |
| vMLX / MLX Studio (Eric Jinho Jang) | MLX engine | MLX (+ GGUF→MLX converter, JANG quant) | OpenAI, Anthropic, Ollama | MIT | 8000 | SSD-backed full-precision prefix cache surviving restart; paged KV; continuous batching; speculative decoding; macOS 14+, M1–M5 | [vendor-stated] |
| MLXHub | mlx-swift | MLX | OpenAI (`/v1/chat/completions`) | App Store app | — | iOS / iPadOS on-device chat; optional LAN server | [vendor-stated] |
| Mac MLX (macmlx.app) | native | MLX | — | listed "Unfunded" (Tracxn) | — | GUI + CLI for local LLM inference | [third-party] |
| mlx_lm.server (official ml-explore) | Python | MLX | OpenAI | MIT | — | Reference server bundled with mlx-lm | [third-party, arXiv paper] |

**Two of these rows carry a name collision.** `mlx-serve` by **ddalcu** (Zig, no Python, port 11234) and `mlx-serve` by **raspoli** (Python/FastAPI, port 8095) are unrelated projects. They share a repository name and an API-compatibility goal, nothing else.

## 3\. GGUF & Portable Engines

The cross-platform layer: llama.cpp and everything built on it, plus the two research runtimes from the literature.

Everything here reaches Macs through a portable runtime rather than through MLX. The format that made this ecosystem possible is **GGUF**, created by llama.cpp; LM Studio and KoboldCpp sit directly on top of it. Ollama is unusual in this list because its 0.32.x line adds its own MLX engine alongside the llama.cpp path. The final two rows (MLC-LLM, PyTorch MPS) are research runtimes evaluated as systems rather than shipped as Mac products.

| Tool | Language | Engine | API | License | Default Port | Stated Facts | Provenance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| llama.cpp (llama-server) | C/C++ (ggml) | own | OpenAI-compatible + web UI | MIT | 8080 (example) | Created the GGUF format; base layer for LM Studio and KoboldCpp | [third-party] |
| Ollama | Go | llama.cpp + its own MLX engine in 0.32.x | OpenAI-compatible | MIT | 11434 | Built-in model registry; MLX engine claimed 1.6× faster prefill / ~2× decode vs its own llama.cpp path | [third-party] |
| LM Studio | TypeScript + C++ | llama.cpp + MLX (default on macOS) | OpenAI-compatible | proprietary, free | 1234 | GUI-first; added CUDA tensor parallelism in 0.4.15 | [third-party] |
| Jan | desktop | — | — | open source | — | Open-source desktop LLM runner | [third-party] |
| KoboldCpp | C/C++ | llama.cpp | — | — | — | llama.cpp-based listing | [third-party] |
| Atomic Chat | — | modified llama.cpp + TurboQuant | — | — | — | Vendor's own local AI app | [third-party] |
| MLC-LLM | C++ / Python | TVM | REST/SSE + OpenAI-style; JS / iOS / Android SDKs | — | — | Paper: strongest batching / concurrency and 64k–128k long-context on Apple Silicon | [third-party, arXiv] |
| PyTorch MPS | Python | PyTorch | none (manual loops) | — | — | Paper: "no native streaming server; impractical for production" | [third-party, arXiv] |

**Do not read Table B as a ranking.** MLC-LLM and PyTorch MPS are included because the same preprint evaluates them on Apple Silicon, not because they are shipping products in the sense llama.cpp or Ollama are. The MLC-LLM "64k–128k long-context" line is the paper's reported finding, quoted as such.

## 4\. Request Data Paths

The same request, two very different shapes: a tiered KV cache with a multi-model pool, versus one port that speaks every protocol.

The MLX-native column is not homogeneous. `oMLX` and `mlx-serve` (ddalcu) both target the same jobs — drop-in OpenAI/Anthropic endpoints for coding agents — but they solve memory and protocol breadth differently. The diagrams below trace one request through each. Only these two paths are drawn because only these two rows were verified here; the other MLX-native servers differ in details I did not confirm.

Diagram B — Request Data Path: oMLX Tiered KV vs mlx-serve One-Port Multi-API

<svg viewBox="0 0 1000 500" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Two vertical data paths side by side: on the left, an oMLX request passing through an engine pool, batched engine, hot RAM KV tier and cold SSD KV tier; on the right, an mlx-serve request through one port, API dispatch, format router and speculative decode">
            <defs>
              <marker id="b-arrowB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#2563EB"></path></marker>
              <marker id="b-arrowP" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#7C3AED"></path></marker>
              <path id="b-L1" d="M250 118 V140"></path>
              <path id="b-L2" d="M250 182 V204"></path>
              <path id="b-L3" d="M250 246 V268"></path>
              <path id="b-L4" d="M250 310 V332"></path>
              <path id="b-L5" d="M250 374 V396"></path>
              <path id="b-R1" d="M750 118 V140"></path>
              <path id="b-R2" d="M750 182 V204"></path>
              <path id="b-R3" d="M750 246 V268"></path>
              <path id="b-R4" d="M750 310 V332"></path>
              <path id="b-R5" d="M750 374 V396"></path>
            </defs>
            <text x="110" y="56" font-size="12.5" font-weight="700" fill="#1E3A8A">oMLX &mdash; Tiered KV Cache, Multi-Model Pool</text>
            <text x="610" y="56" font-size="12.5" font-weight="700" fill="#6D28D9">mlx-serve &mdash; One Port, Many APIs</text>
            <line x1="500" y1="66" x2="500" y2="492" stroke="#E5E7EB" stroke-dasharray="5 5"></line>
            <rect x="110" y="76" width="280" height="42" rx="7" fill="#EFF6FF" stroke="#BFDBFE"></rect>
            <text x="250" y="97" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Client Request</text>
            <text x="250" y="111" font-size="9.5" fill="#4B5563" text-anchor="middle">OpenAI &middot; Anthropic &middot; Responses</text>
            <rect x="110" y="140" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#DBEAFE"></rect>
            <text x="250" y="161" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Engine Pool</text>
            <text x="250" y="175" font-size="9.5" fill="#4B5563" text-anchor="middle">LRU Eviction &middot; Pinning &middot; Per-Model TTL</text>
            <rect x="110" y="204" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#DBEAFE"></rect>
            <text x="250" y="225" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">BatchedEngine</text>
            <text x="250" y="239" font-size="9.5" fill="#4B5563" text-anchor="middle">Continuous Batching (mlx-lm BatchGenerator)</text>
            <rect x="110" y="268" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#DBEAFE"></rect>
            <text x="250" y="289" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Hot Tier &mdash; KV in RAM</text>
            <text x="250" y="303" font-size="9.5" fill="#4B5563" text-anchor="middle">Frequently accessed blocks stay resident</text>
            <rect x="110" y="332" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#DBEAFE"></rect>
            <text x="250" y="353" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Cold Tier &mdash; KV on SSD</text>
            <text x="250" y="367" font-size="9.5" fill="#4B5563" text-anchor="middle">Offloaded as safetensors blocks</text>
            <rect x="110" y="396" width="280" height="42" rx="7" fill="#F0FDF4" stroke="#86EFAC"></rect>
            <text x="250" y="417" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Response</text>
            <text x="250" y="431" font-size="9.5" fill="#4B5563" text-anchor="middle">SSD blocks restored after restart</text>
            <line x1="250" y1="118" x2="250" y2="140" stroke="#2563EB" stroke-width="1.5" marker-end="url(#b-arrowB)"></line>
            <line x1="250" y1="182" x2="250" y2="204" stroke="#2563EB" stroke-width="1.5" marker-end="url(#b-arrowB)"></line>
            <line x1="250" y1="246" x2="250" y2="268" stroke="#2563EB" stroke-width="1.5" marker-end="url(#b-arrowB)"></line>
            <line x1="250" y1="310" x2="250" y2="332" stroke="#2563EB" stroke-width="1.5" marker-end="url(#b-arrowB)"></line>
            <line x1="250" y1="374" x2="250" y2="396" stroke="#2563EB" stroke-width="1.5" marker-end="url(#b-arrowB)"></line>
            <rect x="610" y="76" width="280" height="42" rx="7" fill="#F5F3FF" stroke="#DDD6FE"></rect>
            <text x="750" y="97" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Client Request</text>
            <text x="750" y="111" font-size="9.5" fill="#4B5563" text-anchor="middle">Same URL for every protocol</text>
            <rect x="610" y="140" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#EDE9FE"></rect>
            <text x="750" y="161" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">One Port &mdash; :11234</text>
            <text x="750" y="175" font-size="9.5" fill="#4B5563" text-anchor="middle">No Python &mdash; single ~7 MB Zig binary</text>
            <rect x="610" y="204" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#EDE9FE"></rect>
            <text x="750" y="225" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">API Dispatch</text>
            <text x="750" y="239" font-size="9" fill="#4B5563" text-anchor="middle">OpenAI &middot; Anthropic &middot; Ollama &middot; Responses + WS</text>
            <rect x="610" y="268" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#EDE9FE"></rect>
            <text x="750" y="289" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Format Router</text>
            <text x="750" y="303" font-size="9.5" fill="#4B5563" text-anchor="middle">MLX &middot; GGUF &middot; DeepSeek V4 Flash (ds4)</text>
            <rect x="610" y="332" width="280" height="42" rx="7" fill="#FFFFFF" stroke="#EDE9FE"></rect>
            <text x="750" y="353" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Speculative Decode</text>
            <text x="750" y="367" font-size="9.5" fill="#4B5563" text-anchor="middle">PLD &middot; Drafter &middot; Native MTP &middot; 4/8-bit KV</text>
            <rect x="610" y="396" width="280" height="42" rx="7" fill="#F0FDF4" stroke="#86EFAC"></rect>
            <text x="750" y="417" font-size="12" font-weight="700" fill="#111827" text-anchor="middle">Response</text>
            <text x="750" y="431" font-size="9.5" fill="#4B5563" text-anchor="middle">One wire, many protocols</text>
            <line x1="750" y1="118" x2="750" y2="140" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#b-arrowP)"></line>
            <line x1="750" y1="182" x2="750" y2="204" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#b-arrowP)"></line>
            <line x1="750" y1="246" x2="750" y2="268" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#b-arrowP)"></line>
            <line x1="750" y1="310" x2="750" y2="332" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#b-arrowP)"></line>
            <line x1="750" y1="374" x2="750" y2="396" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#b-arrowP)"></line>
            <g>
              <circle r="4" fill="#2563EB"><animateMotion dur="1.1s" repeatCount="indefinite"><mpath href="#b-L1" xlink:href="#b-L1"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite"><mpath href="#b-L1" xlink:href="#b-L1"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#2563EB"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.3s"><mpath href="#b-L2" xlink:href="#b-L2"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.3s"><mpath href="#b-L2" xlink:href="#b-L2"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.15s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.15s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#2563EB"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.6s"><mpath href="#b-L3" xlink:href="#b-L3"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.6s"><mpath href="#b-L3" xlink:href="#b-L3"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.3s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.3s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#2563EB"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.85s"><mpath href="#b-L4" xlink:href="#b-L4"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.85s"><mpath href="#b-L4" xlink:href="#b-L4"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.42s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.42s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#2563EB"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-1.0s"><mpath href="#b-L5" xlink:href="#b-L5"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-1.0s"><mpath href="#b-L5" xlink:href="#b-L5"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.5s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.5s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#7C3AED"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.15s"><mpath href="#b-R1" xlink:href="#b-R1"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#7C3AED" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.15s"><mpath href="#b-R1" xlink:href="#b-R1"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.1s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.1s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#7C3AED"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.45s"><mpath href="#b-R2" xlink:href="#b-R2"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#7C3AED" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.45s"><mpath href="#b-R2" xlink:href="#b-R2"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.22s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.22s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#7C3AED"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.75s"><mpath href="#b-R3" xlink:href="#b-R3"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#7C3AED" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.75s"><mpath href="#b-R3" xlink:href="#b-R3"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.37s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.37s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#7C3AED"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.9s"><mpath href="#b-R4" xlink:href="#b-R4"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#7C3AED" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-0.9s"><mpath href="#b-R4" xlink:href="#b-R4"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.45s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.45s"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#7C3AED"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-1.05s"><mpath href="#b-R5" xlink:href="#b-R5"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#7C3AED" stroke-width="1.5"><animateMotion dur="1.1s" repeatCount="indefinite" begin="-1.05s"><mpath href="#b-R5" xlink:href="#b-R5"></mpath></animateMotion><animate attributeName="r" values="4;11" dur="0.55s" repeatCount="indefinite" begin="-0.5s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.55s" repeatCount="indefinite" begin="-0.5s"></animate></circle>
            </g>
            <text x="110" y="458" font-size="10" fill="#4B5563">KV blocks live in a hot RAM tier and a cold SSD tier; SSD blocks</text>
            <text x="110" y="472" font-size="10" fill="#4B5563">are restored after a restart instead of being recomputed.</text>
            <text x="610" y="458" font-size="10" fill="#4B5563">Protocol breadth is the point: one process, one URL, four API</text>
            <text x="610" y="472" font-size="10" fill="#4B5563">surfaces, and MLX or GGUF chosen by format at request time.</text>
          </svg>

Animated: radar-ping flow dots travel each connector exactly along the drawn arrow lines, emitting expanding/fading rings. Left: one request walks the oMLX pool and both KV tiers. Right: one request enters the single mlx-serve port and fans out across the protocol and format layers.

## 5\. Kernel Cross-Credit: oMLX ↔ mlx-serve

The two verified projects are not independent codebases. Each one's README names the other as the source of specific Metal kernels.

This is the single most important caveat in the whole landscape, and it is easy to miss. When the `oMLX` README lists its acknowledgements, it credits `mlx-serve` (ddalcu) for a fused GDN verify-prework kernel, for Qwen4 fused GDN decode and prefill kernels, and for a QSA 128-bit K/V staging path. When the `mlx-serve` README lists its own acknowledgements, it credits **oMLX by jundot** for the GatedDeltaNet blocked-sequence prefill kernel and the chunked-dispatch budget. The credit runs both ways.

Diagram C — Provenance & Attribution: Kernel Cross-Credit Between oMLX and mlx-serve

<svg viewBox="0 0 1000 440" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="Two boxes, oMLX and mlx-serve, connected by two horizontal arrows pointing in opposite directions, each labelled with what one project credits the other for, plus a shared-upstream strip below">
            <defs>
              <marker id="c-arrowR" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path></marker>
              <marker id="c-arrowL" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#7C3AED"></path></marker>
              <path id="c-top" d="M408 150 H584"></path>
              <path id="c-bottom" d="M592 250 H416"></path>
            </defs>
            <text x="24" y="40" font-size="13.5" font-weight="700" fill="#111827">Kernel cross-credit: oMLX &harr; mlx-serve</text>
            <rect x="48" y="112" width="360" height="168" rx="10" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"></rect>
            <text x="70" y="150" font-size="15" font-weight="800" fill="#1E3A8A">oMLX</text>
            <text x="70" y="170" font-size="10.5" fill="#4B5563">jundot/omlx &middot; Apache-2.0</text>
            <line x1="70" y1="182" x2="386" y2="182" stroke="#DBEAFE"></line>
            <text x="70" y="202" font-size="10" font-weight="700" fill="#111827">Credited by mlx-serve for:</text>
            <text x="70" y="220" font-size="9.5" fill="#4B5563">&bull; GatedDeltaNet blocked-sequence prefill kernel</text>
            <text x="70" y="236" font-size="9.5" fill="#4B5563">&bull; Chunked-dispatch budget that keeps long-context</text>
            <text x="70" y="250" font-size="9.5" fill="#4B5563">prefill off the macOS preemption cliff</text>
            <rect x="592" y="112" width="360" height="168" rx="10" fill="#F5F3FF" stroke="#7C3AED" stroke-width="1.5"></rect>
            <text x="614" y="150" font-size="15" font-weight="800" fill="#6D28D9">mlx-serve</text>
            <text x="614" y="170" font-size="10.5" fill="#4B5563">ddalcu/mlx-serve &middot; MIT per README</text>
            <line x1="614" y1="182" x2="930" y2="182" stroke="#EDE9FE"></line>
            <text x="614" y="202" font-size="10" font-weight="700" fill="#111827">Credited by oMLX for:</text>
            <text x="614" y="220" font-size="9.5" fill="#4B5563">&bull; Fused GDN verify prework kernel</text>
            <text x="614" y="236" font-size="9.5" fill="#4B5563">&bull; Qwen4 fused GDN decode / prefill (transformer.zig)</text>
            <text x="614" y="250" font-size="9.5" fill="#4B5563">&bull; QSA 128-bit K/V staging (msv_attn_p256)</text>
            <line x1="408" y1="150" x2="584" y2="150" stroke="#2563EB" stroke-width="1.5" marker-end="url(#c-arrowR)"></line>
            <text x="500" y="140" font-size="10.5" fill="#1E3A8A" text-anchor="middle" font-weight="600">oMLX credits mlx-serve</text>
            <line x1="592" y1="250" x2="416" y2="250" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#c-arrowL)"></line>
            <text x="500" y="270" font-size="10.5" fill="#6D28D9" text-anchor="middle" font-weight="600">mlx-serve credits oMLX</text>
            <g>
              <circle r="4" fill="#2563EB"><animateMotion dur="1.6s" repeatCount="indefinite"><mpath href="#c-top" xlink:href="#c-top"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#2563EB" stroke-width="1.5"><animateMotion dur="1.6s" repeatCount="indefinite"><mpath href="#c-top" xlink:href="#c-top"></mpath></animateMotion><animate attributeName="r" values="4;12" dur="0.8s" repeatCount="indefinite"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.8s" repeatCount="indefinite"></animate></circle>
            </g>
            <g>
              <circle r="4" fill="#7C3AED"><animateMotion dur="1.6s" repeatCount="indefinite" begin="-0.8s"><mpath href="#c-bottom" xlink:href="#c-bottom"></mpath></animateMotion></circle>
              <circle r="4" fill="none" stroke="#7C3AED" stroke-width="1.5"><animateMotion dur="1.6s" repeatCount="indefinite" begin="-0.8s"><mpath href="#c-bottom" xlink:href="#c-bottom"></mpath></animateMotion><animate attributeName="r" values="4;12" dur="0.8s" repeatCount="indefinite" begin="-0.4s"></animate><animate attributeName="stroke-opacity" values="0.8;0" dur="0.8s" repeatCount="indefinite" begin="-0.4s"></animate></circle>
            </g>
            <rect x="360" y="300" width="280" height="58" rx="8" fill="#FFFBEB" stroke="#D97706"></rect>
            <text x="378" y="322" font-size="10.5" font-weight="700" fill="#B45309">Not Independent Codebases</text>
            <text x="378" y="340" font-size="9.5" fill="#4B5563">Both READMEs credit the other for imported</text>
            <text x="378" y="353" font-size="9.5" fill="#4B5563">Metal kernels.</text>
            <rect x="48" y="376" width="904" height="34" rx="8" fill="#F3F4F6" stroke="#E5E7EB"></rect>
            <text x="64" y="398" font-size="10" font-weight="700" fill="#4B5563">Shared Upstream</text>
            <text x="170" y="398" font-size="10" fill="#4B5563">MLX &middot; mlx-lm &middot; mlxfast-challenge (Layr Labs) &middot; MTPLX &middot; dflash-mlx &middot; Splash</text>
          </svg>

Animated: two radar-ping dots travel the opposing arrows — each motion path is the exact straight line beneath it — showing that the attribution loop closes in both directions. Read this before treating either project's benchmark numbers as an independent comparison.

**Consequence for benchmark reading.** Because `oMLX` and `mlx-serve` share kernel lineage and each credits the other, a head-to-head speed comparison between them is _not_ a comparison between independent implementations. Treat any such number as a tuning comparison, not a codebase-quality comparison.

## 6\. Reported Benchmarks

Numbers as reported by their sources. I did not run any of these benchmarks, and none of the figures below were reproduced here.

**Every row in Table C is \[third-party\].** These are numbers published elsewhere, quoted so the landscape has scale, not because they were verified. Setup and hardware differ row to row, so do not stack them into a single ranking.

| What | Setup | Numbers | Source |
| --- | --- | --- | --- |
| asiai.dev, Mar 29 2026 | Mac mini M4 Pro 64 GB, Qwen3-Coder-30B (Ollama Q4_K_M vs LM Studio MLX 4-bit) | LM Studio (MLX) 102.2 tok/s vs Ollama (llama.cpp) 69.8 tok/s; TTFT 291 ms vs 175 ms; 8.2 vs 4.5 tok/s per watt | morphllm.com |
| zephel01, May 2026 | MacBook Pro M3 Max 64 GB, Qwen3.6-35B-A3B 4-bit | raw mlx-lm 163 tok/s vs Ollama default llama.cpp 47–55 tok/s | morphllm.com |
| Ollama MLX engine announcement, early 2026 | — | Claimed 1.6× prefill / nearly 2× decode over its llama.cpp path | morphllm.com |
| dev.to, 2026 | M-series Mac, same model | LM Studio MLX "20–40% faster" than Ollama | dev.to |
| atomic.chat, Jun 26 2026 | RTX 5090 | llama.cpp ~2.3× Ollama; 5 concurrent: llama.cpp 455 tok/s vs Ollama 200 tok/s, median TTFT 393 ms vs 1193 ms | atomic.chat |
| dev.to, 2026 | 32 GB MacBook Air, 9B Q4_K_M | ~17.1 tok/s; gen speed near neck-and-neck, Ollama faster default prefill | dev.to |
| Verification status | This post | No facts verified by me about any of these numbers — label them as third-party only. | — |

**What the numbers do and do not say.** Across rows the pattern people quote is "MLX beats llama.cpp on Apple Silicon, and quant/runtime defaults move the result by margins larger than the headline differences." But the rows use different models, different machines, and different quantizations — including one RTX 5090 row that is not Apple Silicon at all. None of it is a controlled comparison run by this author.

## 7\. Versions & Sources to Quote Verbatim

Exact release and paper facts, with the date each refers to. These are the sentences safe to reproduce word-for-word.

| Fact | What To Quote Verbatim | Provenance |
| --- | --- | --- |
| Ollama release | Ollama **v0.32.15** released **2026-08-19**. | [third-party: morphllm] |
| LM Studio release | LM Studio **0.4.21** released **2026-08-12**. | [third-party: morphllm] |
| arXiv preprint | arXiv **2511.05502**, dated **2025-10-09**, "Production-Grade Local LLM Inference on Apple Silicon", evaluated on **Mac Studio M2 Ultra 192 GB**; recommended **MLX** as the default for Apple-centric deployments and **MLC-LLM** as the best alternative for quantization flexibility / long context. **Label as PREPRINT.** | [third-party] · PREPRINT |

### Timeline of the dated facts

-   2025-10-09

    arXiv **2511.05502** is dated. Titled "Production-Grade Local LLM Inference on Apple Silicon", evaluated on a Mac Studio M2 Ultra with 192 GB. It recommends MLX as the default for Apple-centric deployments and MLC-LLM as the best alternative for quantization flexibility and long context. This is a **preprint, not peer-reviewed**. \[third-party\]

-   2026-08-12

    LM Studio **0.4.21** released. \[third-party: morphllm\]

-   2026-08-19

    Ollama **v0.32.15** released. \[third-party: morphllm\]

-   2026-10-17

    This post. Author verified **only** the oMLX local repository and the ddalcu/mlx-serve README. Everything else is tagged vendor- or third-party-stated.

## 8\. Caveats

Five facts that change how the tables above should be read.

### 1\. Two unrelated projects named "mlx-serve"

There are at least two projects named `mlx-serve`: **ddalcu** (Zig, no Python) and **raspoli** (Python/FastAPI). They are unrelated. Table A lists both, on separate rows, with different default ports (11234 and 8095).

### 2\. ddalcu/mlx-serve license is unresolved

The ddalcu/mlx-serve **README license badge shows MIT**, while the **GitHub header shows Apache-2.0**. This conflict is unresolved in what I read. Do not rely on either as the final answer without checking the repository's `LICENSE` and `NOTICE` files.

### 3\. oMLX and ddalcu/mlx-serve are not independent codebases

Each credits the other for imported Metal kernels (both READMEs). The oMLX acknowledgements name mlx-serve for a fused GDN verify-prework kernel, Qwen4 fused GDN decode/prefill kernels, and a QSA 128-bit K/V staging path; the mlx-serve acknowledgements name "oMLX by jundot" for the GatedDeltaNet blocked-sequence prefill kernel and the chunked-dispatch budget. See Diagram C. This is why a head-to-head speed comparison between the two is not an independent comparison.

### 4\. The arXiv source is a preprint, not peer-reviewed

arXiv 2511.05502 is a **preprint**. Its findings — including the MLX-default recommendation and the MLC-LLM long-context claim — are quoted as the paper's reported conclusions, not as established results.

### 5\. Verification boundary

I verified only **oMLX** (local repository) and **ddalcu/mlx-serve** (README read directly). All other rows are vendor- or third-party-stated. Where a row is marked \[vendor-stated\] it means the project describes itself that way; where it is \[third-party\] it comes from an outside source.

## 9\. Sources & Provenance

Where each family of facts came from. The first entry is the only one whose full contents I read in a local repository; the second is the only README fetched directly from GitHub.

### Verified directly for this post

-   **oMLX repository README + local repo** — jundot/omlx, Apache-2.0, port 8000, tiered KV cache, continuous batching, LRU/pinning/TTL, multi-Mac pipeline ranks, SwiftUI menu-bar app. \[verified here\]
-   [https://github.com/ddalcu/mlx-serve](https://github.com/ddalcu/mlx-serve) — Zig, no Python, port 11234, MLX + GGUF + DeepSeek V4 Flash via ds4, one-port multi-API, MIT badge vs Apache-2.0 header conflict. \[verified here\]

### Vendor- and third-party sources

-   [https://github.com/raspoli/mlx-serve](https://github.com/raspoli/mlx-serve) — the second, unrelated "mlx-serve" (Python/FastAPI, port 8095)
-   [https://github.com/cubist38/mlx-openai-server](https://github.com/cubist38/mlx-openai-server)
-   [https://github.com/Ar9av/mlx-lm-server](https://github.com/Ar9av/mlx-lm-server)
-   [https://github.com/andychoi/mlx-server](https://github.com/andychoi/mlx-server)
-   [https://github.com/mzbac/mlx-llm-server](https://github.com/mzbac/mlx-llm-server)
-   [https://mlx-optiq.com/docs/serving](https://mlx-optiq.com/docs/serving)
-   [https://vmlx.net/](https://vmlx.net/)
-   [https://apps.apple.com/…/mlxhub-local-ai-llm-server/id6766485144](https://apps.apple.com/app/mlxhub-local-ai-llm-server/id6766485144)
-   [https://llama-cpp.com/llama-cpp-vs-ollama](https://llama-cpp.com/llama-cpp-vs-ollama)
-   [https://www.morphllm.com/comparisons/ollama-vs-lm-studio](https://www.morphllm.com/comparisons/ollama-vs-lm-studio)
-   [https://atomic.chat/blog/guides/ollama-vs-llamacpp](https://atomic.chat/blog/guides/ollama-vs-llamacpp)
-   [https://arxiv.org/pdf/2511.05502](https://arxiv.org/pdf/2511.05502) — PREPRINT
-   [https://huggingface.co/models?library=mlx](https://huggingface.co/models?library=mlx)

**Bottom line.** The MLX-native family is the field to watch on Apple Silicon, with `oMLX` and `mlx-serve` (ddalcu) as the two reference points I could verify — but they are cross-crediting relatives, not rivals, and the portable GGUF layer (llama.cpp, Ollama, LM Studio) still carries most users. Read the tags before you read the numbers.
