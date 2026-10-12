---
title: "Local Tool-Calling Models — Complete Visual Guide"
date: 2026-08-15
description: "While running opensre (an AI-SRE investigation tool) locally through oMLX — a macOS-native MLX inference server — on two Mac Minis, the same real Kubernetes investigation task was pointed at two different open-weight instruct models in turn. Same oMLX server, same tool schemas, same alert. Only the "
tags: [llm, agents, local-llm, inference, tool-calling]
cover: "assets/images/covers/local-tool-calling-models.svg"
draft: false
---

A real head-to-head test, the current open-weight benchmark landscape, and what actually fits on consumer hardware · August 2026

## Head-to-Head · Today's Test

### Qwen3.5-4B vs Llama-3.1-8B — A Real Head-to-Head Test

While running **opensre** (an AI-SRE investigation tool) locally through **oMLX** — a macOS-native MLX inference server — on two Mac Minis, the same real Kubernetes investigation task was pointed at two different open-weight instruct models in turn. Same oMLX server, same tool schemas, same alert. Only the model changed. The outcome was not close, and it was not the one the specs would predict.

Same task, same tools, same server — two very different runs

<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="420" fill="#F8FAFC"></rect>
      <defs>
        <marker id="dnarrow" markerWidth="9" markerHeight="7" refX="4.5" refY="6" orient="auto">
          <polygon points="0 0,9 0,4.5 7" fill="#6B7280"></polygon>
        </marker>
      </defs>
      <rect x="24" y="30" width="414" height="380" rx="12" fill="#f0fdf4" stroke="#16A34A" stroke-width="2"></rect>
      <text x="231" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="#14532d">Qwen3.5-4B-MLX-8bit</text>
      <text x="231" y="76" text-anchor="middle" font-size="12" fill="#166534">4B params · 8-bit quant · ~5GB · 872s total</text>
      <rect x="40" y="96" width="382" height="34" rx="6" fill="#fff" stroke="#bbf7d0" stroke-width="1.5"></rect>
      <text x="231" y="117" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Alert Received</text>
      <line x1="231" y1="130" x2="231" y2="146" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="40" y="148" width="382" height="92" rx="6" fill="#fff" stroke="#bbf7d0" stroke-width="1.5"></rect>
      <text x="231" y="168" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Tool Loop — 6 Real K8s Tool Calls</text>
      <text x="231" y="186" text-anchor="middle" font-size="12" fill="#4B5563">list_pods · list_deployments · get_events</text>
      <text x="231" y="202" text-anchor="middle" font-size="12" fill="#4B5563">list_services · describe_pod · get_resource</text>
      <text x="231" y="222" text-anchor="middle" font-size="12" font-weight="600" fill="#166534">ReAct loop fully engaged</text>
      <line x1="231" y1="240" x2="231" y2="256" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="40" y="258" width="382" height="34" rx="6" fill="#fff" stroke="#bbf7d0" stroke-width="1.5"></rect>
      <text x="231" y="279" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">17 Real Evidence Items Gathered</text>
      <line x1="231" y1="292" x2="231" y2="308" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="40" y="310" width="382" height="48" rx="6" fill="#fff" stroke="#bbf7d0" stroke-width="1.5"></rect>
      <text x="231" y="330" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Differential Diagnosis</text>
      <text x="231" y="347" text-anchor="middle" font-size="12" fill="#4B5563">Healthy Pod (Has Secret) vs Broken Pods (Missing It)</text>
      <line x1="231" y1="358" x2="231" y2="372" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="40" y="374" width="382" height="30" rx="6" fill="#16A34A"></rect>
      <text x="231" y="393" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Diagnosis: ImagePullBackOff — Validity 1.0</text>
      <rect x="462" y="30" width="414" height="380" rx="12" fill="#fef2f2" stroke="#DC2626" stroke-width="2"></rect>
      <text x="669" y="58" text-anchor="middle" font-size="14" font-weight="700" fill="#7f1d1d">Meta-Llama-3.1-8B-Instruct-8bit</text>
      <text x="669" y="76" text-anchor="middle" font-size="12" fill="#991b1b">8B params · 8-bit quant · ~8.3GB · 172s total (5x faster)</text>
      <rect x="478" y="96" width="382" height="34" rx="6" fill="#fff" stroke="#fecaca" stroke-width="1.5"></rect>
      <text x="669" y="117" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Alert Received</text>
      <line x1="669" y1="130" x2="669" y2="146" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="478" y="148" width="382" height="48" rx="6" fill="#fff" stroke="#fecaca" stroke-width="1.5"></rect>
      <text x="669" y="168" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Zero Tool Calls</text>
      <text x="669" y="185" text-anchor="middle" font-size="12" fill="#4B5563">Answered From Alert Text — ReAct Loop Skipped</text>
      <line x1="669" y1="196" x2="669" y2="212" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="478" y="214" width="382" height="48" rx="6" fill="#fff" stroke="#fecaca" stroke-width="1.5"></rect>
      <text x="669" y="234" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">Structured-Output Failure</text>
      <text x="669" y="251" text-anchor="middle" font-size="12" fill="#4B5563">literal_error on a large closed-enum field</text>
      <line x1="669" y1="262" x2="669" y2="278" stroke="#6B7280" stroke-width="1.5" marker-end="url(#dnarrow)"></line>
      <rect x="478" y="280" width="382" height="34" rx="6" fill="#DC2626"></rect>
      <text x="669" y="301" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Result: Unable To Determine Root Cause</text>
      <rect x="478" y="330" width="382" height="50" rx="6" fill="#fff" stroke="#fecaca" stroke-width="1.5"></rect>
      <text x="669" y="351" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">0 Evidence Gathered</text>
      <text x="669" y="368" text-anchor="middle" font-size="12" fill="#4B5563">Bigger, faster — not more correct</text>
    </svg>

Qwen3.5-4B — full ReAct loop, correct grounded diagnosis Llama-3.1-8B — no tool calls, invalid enum output, no diagnosis

## ✅ Qwen3.5-4B-MLX-8bit

FamilyAlibaba Qwen, general instruct

Size / quant4B params · 8-bit · ~5GB

Total time872s

Tool calls made6 distinct real calls

Evidence gathered17 items

Final validity score1.0

Correctly identified an `ImagePullBackOff` caused by a missing `imagePullSecrets` configuration — verified by cross-referencing the actual Kubernetes API error text, and confirmed with real differential diagnosis: comparing a healthy pod that had `imagePullSecrets` configured against the broken pods that did not.

correct & fully grounded

## ❌ Meta-Llama-3.1-8B-Instruct-8bit

FamilyMeta Llama, general instruct

Size / quant8B params (bigger) · 8-bit · ~8.3GB

Total time172s (5x faster)

Tool calls made0

Evidence gathered0 items

Final result"Unable to determine root cause"

Skipped the ReAct tool-calling loop entirely and tried to answer straight from the alert text. Even that failed: it picked an invalid value for a closed-enum schema field — a `literal_error` Pydantic structured-output validation failure — on a large multi-dozen-value enum.

no tool calls, wrong

<aside class="callout"><strong class="callout__title">The isolated control test matters here:</strong><div class="callout__body">both models were separately verified to correctly return valid <code>response_format: json_schema</code> structured JSON for a trivial 2-field test schema. So the gap wasn't raw structured-output <em>capability</em> — it was (a) whether the model's chat/tool-calling template reliably triggers tool use inside a real multi-tool ReAct loop, and (b) how reliably grammar-constrained decoding holds up on a much larger, more complex closed-enum field under real load. A bigger parameter count and faster inference (no thinking-mode overhead) did not translate into better real-world tool-calling behavior in this test — model family and tool-calling tuning mattered more than raw size or speed.</div></aside>

<aside class="callout"><strong class="callout__title">The obvious next question:</strong><div class="callout__body">if size and speed don't predict good tool-calling behavior, what does? Tab 2 looks at what the wider open-weight field actually reports on dedicated tool-calling and agentic-coding benchmarks — independent of this local test.</div></aside>

## Benchmark Landscape

### The Tool-Calling & Agentic Coding Benchmark Landscape

Today's local test compared two general-purpose instruct models on one task. The broader open-weight field also publishes dedicated tool-calling and agentic-coding benchmark numbers — a different, larger set of models, some purpose-tuned for exactly this behavior. Every figure below is attributed; full links are in Tab 3.

## Function-Calling / Tool-Use Benchmarks

| Model | BFCL v3 Score | Tool-Use Success Rate |
| --- | --- | --- |
| GLM-4.5 | 77.8% | 90.6% |
| Qwen3 | 71.9% | — |
| Kimi K2 | 71.1% | 86.2% |
| Qwen3-Coder | — | 77.1% |

**BFCL v3** is the Berkeley Function-Calling Leaderboard v3. GLM-4.5 leads both measures reported here; note the tool-use success rate for the Qwen family is reported against the Qwen3-Coder variant specifically, not the base Qwen3 BFCL number, so treat those two Qwen rows as related but distinct model variants rather than one apples-to-apples line. source 1

## Coding-Specific Benchmarks

| Model | Headline Score | Params | License | Notes |
| --- | --- | --- | --- | --- |
| Qwen3-Coder-480B | 69.6% SWE-bench Verified | 480B | Apache 2.0 | Supports 358 programming languages |
| DeepSeek-V3.2 | ~70% SWE-bench Verified | 685B total | MIT | 128K context, best price-performance |
| Kimi K2.6 | 58.6% SWE-bench Pro / 66.7% Terminal-Bench 2.0 | — | — | Sustained 4,000+ tool calls over a 13-hour autonomous session |
| Kimi K3 | LiveBench Coding Avg 81.45 / Agentic Coding Avg 57.58 | — | — | Newer, larger generation; current LiveBench leader on both metrics |
| GLM-5.2 | Leads single-node-fitting models | — | — | Ahead of MiniMax M3, DeepSeek V4 Pro, MiMo-V2.5-Pro |
| Claude 4 Sonnet (reference) | 70.4% SWE-bench Verified | — | — | Chinese open models are within 5–6 points of this |

sources 2–4

## Licensing

📜

Apache 2.0 — most permissive

Qwen3 and Gemma 4 both ship under Apache 2.0, the most commercially permissive license in this set.

📜

MIT — also permissive

DeepSeek-V3.2 is MIT licensed, comparably permissive to Apache 2.0 for most commercial use.

## Reading This Table

These are the current leaders on dedicated tool-calling and agentic-coding benchmarks — GLM-4.5 for raw function-calling accuracy and tool-use success rate, Qwen3-Coder and DeepSeek-V3.2 for SWE-bench-style coding correctness, Kimi K2.6/K3 for sustained long-running agentic sessions, GLM-5.2 for whatever still fits a single node.

None of this landscape says anything yet about what runs on small local hardware. That's Tab 3.

## Hardware Reality · Sources

### The Hardware Reality — What Actually Fits

Checked directly against real model sizes from the oMLX/exo catalogs actually available on these two Mac Minis today: `Qwen3-Coder-480B-A35B` is 276GB, `Qwen3-Coder-Next` is 54–65GB even quantized, and `GLM-4.7-Flash` — GLM's _smallest_ variant — is still 18–25GB. The two Mac Minis' actual usable memory ceilings, measured today via oMLX's own memory-guard errors, were 4.00GB and roughly 8.3GB.

Model size vs. what two real Mac Minis can actually hold (log scale)

<svg viewBox="0 0 900 420" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="420" fill="#F8FAFC"></rect>
      <line x1="278" y1="50" x2="278" y2="360" stroke="#D97706" stroke-width="1.5" stroke-dasharray="5,4"></line>
      <text x="278" y="42" text-anchor="middle" font-size="12" font-weight="600" fill="#92400e">4.00GB Ceiling</text>
      <line x1="376.4" y1="50" x2="376.4" y2="360" stroke="#D97706" stroke-width="1.5" stroke-dasharray="5,4"></line>
      <text x="376.4" y="42" text-anchor="middle" font-size="12" font-weight="600" fill="#92400e">~8.3GB Ceiling</text>
      <text x="24" y="76" font-size="12.5" font-weight="600" fill="#111827">Qwen3.5-4B-MLX-8bit</text>
      <text x="24" y="90" font-size="12" fill="#4B5563">4B · 8-bit quant</text>
      <text x="308.1" y="64" text-anchor="middle" font-size="12" font-weight="600" fill="#166534">5GB · Ran Today</text>
      <circle cx="308.1" cy="80" r="6" fill="#16A34A"></circle>
      <text x="24" y="140" font-size="12.5" font-weight="600" fill="#111827">Meta-Llama-3.1-8B-Instruct</text>
      <text x="24" y="154" font-size="12" fill="#4B5563">8B · 8-bit quant</text>
      <text x="376.4" y="128" text-anchor="middle" font-size="12" font-weight="600" fill="#166534">8.3GB · Ran Today</text>
      <circle cx="376.4" cy="144" r="6" fill="#16A34A"></circle>
      <text x="24" y="204" font-size="12.5" font-weight="600" fill="#111827">GLM-4.7-Flash</text>
      <text x="24" y="218" font-size="12" fill="#4B5563">GLM's smallest variant</text>
      <text x="502.65" y="192" text-anchor="middle" font-size="12" font-weight="600" fill="#991b1b">18–25GB · Too Large</text>
      <line x1="480.5" y1="208" x2="524.8" y2="208" stroke="#DC2626" stroke-width="2"></line>
      <circle cx="480.5" cy="208" r="5" fill="#DC2626"></circle>
      <circle cx="524.8" cy="208" r="5" fill="#DC2626"></circle>
      <text x="24" y="268" font-size="12.5" font-weight="600" fill="#111827">Qwen3-Coder-Next</text>
      <text x="24" y="282" font-size="12" fill="#4B5563">Quantized</text>
      <text x="641.1" y="256" text-anchor="middle" font-size="12" font-weight="600" fill="#991b1b">54–65GB · Too Large</text>
      <line x1="628.6" y1="272" x2="653.6" y2="272" stroke="#DC2626" stroke-width="2"></line>
      <circle cx="628.6" cy="272" r="5" fill="#DC2626"></circle>
      <circle cx="653.6" cy="272" r="5" fill="#DC2626"></circle>
      <text x="24" y="332" font-size="12.5" font-weight="600" fill="#111827">Qwen3-Coder-480B-A35B</text>
      <text x="24" y="346" font-size="12" fill="#4B5563">480B, benchmark leader from Tab 2</text>
      <text x="848.6" y="320" text-anchor="end" font-size="12" font-weight="600" fill="#991b1b">276GB · Too Large</text>
      <circle cx="848.6" cy="336" r="6" fill="#DC2626"></circle>
      <line x1="260" y1="360" x2="860" y2="360" stroke="#9CA3AF" stroke-width="1"></line>
      <line x1="278" y1="360" x2="278" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="278" y="380" text-anchor="middle" font-size="12" fill="#6B7280">4</text>
      <line x1="371.1" y1="360" x2="371.1" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="371.1" y="380" text-anchor="middle" font-size="12" fill="#6B7280">8</text>
      <line x1="464.9" y1="360" x2="464.9" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="464.9" y="380" text-anchor="middle" font-size="12" fill="#6B7280">16</text>
      <line x1="558.6" y1="360" x2="558.6" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="558.6" y="380" text-anchor="middle" font-size="12" fill="#6B7280">32</text>
      <line x1="652.5" y1="360" x2="652.5" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="652.5" y="380" text-anchor="middle" font-size="12" fill="#6B7280">64</text>
      <line x1="746.3" y1="360" x2="746.3" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="746.3" y="380" text-anchor="middle" font-size="12" fill="#6B7280">128</text>
      <line x1="840" y1="360" x2="840" y2="366" stroke="#9CA3AF" stroke-width="1"></line>
      <text x="840" y="380" text-anchor="middle" font-size="12" fill="#6B7280">256</text>
      <text x="560" y="402" text-anchor="middle" font-size="12" fill="#4B5563">Model Size — Log Scale (GB)</text>
    </svg>

Ran on a Mac Mini today Too large for either Mac Mini tested ┅ Amber dashed = measured memory-guard ceiling

## Size vs. Fit — Reference Table

| Model | Disk Size | Fits 4.00GB Mac Mini | Fits ~8.3GB Mac Mini |
| --- | --- | --- | --- |
| Qwen3.5-4B-MLX-8bit | ~5GB | No | Ran today |
| Meta-Llama-3.1-8B-Instruct-8bit | ~8.3GB | No | Ran today, at the ceiling |
| GLM-4.7-Flash (GLM's smallest) | 18–25GB | No | No |
| Qwen3-Coder-Next | 54–65GB (quantized) | No | No |
| Qwen3-Coder-480B-A35B | 276GB | No | No |

<aside class="callout"><strong class="callout__title">The honest takeaway:</strong><div class="callout__body">none of the models that lead the tool-calling and agentic-coding benchmarks in Tab 2 have a variant that fits Mac-Mini-class consumer hardware. The real choice on hardware like this is between small general-purpose models — what was actually tested today, Qwen3.5-4B/9B and Llama-3.1-8B — not the SWE-bench and BFCL leaders, which are a different conversation entirely, relevant only to hosted or much bigger local hardware. Benchmark leaderboards and "what fits on your Mac Mini" are two different questions. Know which one you're answering before picking a model.</div></aside>

* * *

## Sources

-   Tool-calling benchmark figures (GLM-4.5, Kimi K2, Qwen3 / Qwen3-Coder — BFCL v3 and tool-use success rate) [medium.com/@cognidownunder — Kimi K2 vs Qwen3-Coder vs GLM-4.5](https://medium.com/@cognidownunder/kimi-k2-vs-qwen-3-coder-vs-glm-4-5-why-kimi-k2-is-eating-everyones-lunch-130b8e9475b6)
-   Coding benchmark landscape and licensing (Qwen3-Coder, DeepSeek-V3.2, licensing notes) [mindstudio.ai/blog — Best Open Source LLMs for Agentic Coding 2026](https://www.mindstudio.ai/blog/best-open-source-llms-agentic-coding-2026)
-   Coding model comparison (SWE-bench Verified figures, license details) [morphllm.com — Best Open Source Coding Model 2026](https://www.morphllm.com/best-open-source-coding-model-2026)
-   Kimi K2.6 / GLM-5.1 / Qwen3.6 Plus / MiniMax M2.7 coding comparison (Kimi K2.6 SWE-bench Pro, Terminal-Bench 2.0, sustained tool-call session) [atlascloud.ai/blog/guides — Kimi K2.6 vs GLM-5.1 vs Qwen3.6 Plus vs MiniMax M2.7](https://www.atlascloud.ai/blog/guides/kimi-k2-6-vs-glm-5-1-vs-qwen-3-6-plus-vs-minimax-m2-7-coding-2026)
-   Best open-weight LLMs for agentic coding (Kimi K3 LiveBench figures, GLM-5.2 single-node leadership) [howaiworks.ai/blog — Best Open-Weight LLM for Agentic Coding](https://howaiworks.ai/blog/best-open-weight-llm-agentic-coding)
