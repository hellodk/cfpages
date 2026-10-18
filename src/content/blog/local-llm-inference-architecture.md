---
title: "Local LLM Inference Architecture — From Silicon to Stack"
date: 2026-07-17
description: "A unified stack for running, routing, and observing LLMs — currently deployed on a laptop with RTX 3050 Ti, with planned expansions to K8s GPU nodes and Apple Silicon clusters."
tags: [llm, inference, architecture]
cover: "assets/images/covers/local-llm-inference-architecture.svg"
draft: false
---

A unified stack for running, routing, and observing LLMs — currently deployed on a laptop with RTX 3050 Ti, with planned expansions to K8s GPU nodes and Apple Silicon clusters.

✓ Ollama Running ✓ Observability Stack Planned: K8s GPU Planned: Mac Mini MLX

## Current Deployment Status Live

## ✓ Running: Ollama

-   **Endpoint:** localhost:11434
-   **qwen2.5-coder:1.5b** — 986MB, 50 layers GPU
-   **qwen2.5-coder:7b** — 4.7GB, CPU-only
-   **nomic-embed-text** — 274MB embeddings
-   **GPU:** RTX 3050 Ti, 4GB VRAM

## ✓ Running: Observability

-   **Prometheus:** :9090 (metrics)
-   **Grafana:** :3001 (dashboards)
-   **OTEL Collector:** :4317/:4318 (traces)
-   **Loki:** :3100 (logs)
-   **Tempo:** :3200 (traces)

## Planned: Expansion

-   **K8s GPU Node:** Add NVIDIA GPU node
-   **vLLM:** Tensor parallel inference
-   **Mac Mini:** MLX cluster (TBD)
-   **LiteLLM:** Multi-backend routing

## Quick Start Commands

\# Start Ollama  
ollama serve &  

\# Start observability stack  
cd ~/Documents/git/local-llm/observability && docker compose up -d  

\# Verify everything is running  
curl http://localhost:11434/v1/models \# Ollama  
curl http://localhost:9090/-/healthy \# Prometheus  
curl http://localhost:3001/api/health \# Grafana

## The Complete Stack Architecture

## End-to-End Data Flow

<svg viewBox="0 0 1100 540" width="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#94A3B8"></path>
        </marker>
        <marker id="arrow-amber" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#D97706"></path>
        </marker>
        <marker id="arrow-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#7C3AED"></path>
        </marker>
      </defs>
      <rect x="10" y="30" width="230" height="500" rx="12" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1" opacity="0.5"></rect>
      <text x="125" y="52" text-anchor="middle" class="svg-title" style="fill:#6366F1">VS Code + Champ</text>
      <rect x="270" y="30" width="180" height="500" rx="12" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1" opacity="0.4"></rect>
      <text x="360" y="52" text-anchor="middle" class="svg-title" style="fill:#D97706">Routing</text>
      <rect x="480" y="30" width="260" height="500" rx="12" fill="#D1FAE5" stroke="#A7F3D0" stroke-width="1" opacity="0.4"></rect>
      <text x="610" y="52" text-anchor="middle" class="svg-title" style="fill:#059669">Inference Backends</text>
      <rect x="770" y="30" width="320" height="500" rx="12" fill="#EDE9FE" stroke="#DDD6FE" stroke-width="1" opacity="0.4"></rect>
      <text x="930" y="52" text-anchor="middle" class="svg-title" style="fill:#7C3AED">Observability</text>
      <rect x="25" y="75" width="200" height="52" rx="8" fill="white" stroke="#818CF8" stroke-width="1.5"></rect>
      <text x="125" y="97" text-anchor="middle" class="svg-label" style="fill:#1E293B">Champ Agent</text>
      <text x="125" y="113" text-anchor="middle" class="svg-sub" style="fill:#64748B">Multi-agent orchestrator</text>
      <line x1="225" y1="101" x2="280" y2="101" stroke="#94A3B8" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="280" y="75" width="160" height="52" rx="8" fill="white" stroke="#F59E0B" stroke-width="1.5"></rect>
      <text x="360" y="97" text-anchor="middle" class="svg-label" style="fill:#1E293B">LiteLLM</text>
      <text x="360" y="113" text-anchor="middle" class="svg-sub" style="fill:#64748B">:4000 fallback + cost</text>
      <line x1="440" y1="101" x2="490" y2="101" stroke="#D97706" stroke-width="1.5" class="flow-line" marker-end="url(#arrow-amber)"></line>
      <rect x="490" y="72" width="240" height="58" rx="8" fill="white" stroke="#10B981" stroke-width="1.5"></rect>
      <text x="610" y="94" text-anchor="middle" class="svg-label" style="fill:#1E293B">Laptop (RTX 3050 Ti)</text>
      <text x="610" y="110" text-anchor="middle" class="svg-sub" style="fill:#64748B">Ollama · Qwen 7B (CPU) + 1.5B (GPU)</text>
      <text x="610" y="122" text-anchor="middle" class="svg-sub" style="fill:#64748B">nomic-embed-text</text>
      <rect x="25" y="170" width="200" height="52" rx="8" fill="white" stroke="#A5B4FC" stroke-width="1"></rect>
      <text x="125" y="192" text-anchor="middle" class="svg-sub" style="fill:#64748B">AnalyticsExporter</text>
      <text x="125" y="206" text-anchor="middle" class="svg-sub" style="fill:#64748B">OTLP JSON → :4318</text>
      <line x1="225" y1="196" x2="280" y2="196" stroke="#94A3B8" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="280" y="170" width="160" height="52" rx="8" fill="white" stroke="#F59E0B" stroke-width="1.5"></rect>
      <text x="360" y="192" text-anchor="middle" class="svg-label" style="fill:#1E293B">llm-d Router</text>
      <text x="360" y="206" text-anchor="middle" class="svg-sub" style="fill:#64748B">KV-cache · EPP + Envoy</text>
      <line x1="440" y1="196" x2="490" y2="196" stroke="#D97706" stroke-width="1.5" class="flow-line" marker-end="url(#arrow-amber)"></line>
      <rect x="490" y="165" width="240" height="64" rx="8" fill="white" stroke="#10B981" stroke-width="1.5"></rect>
      <text x="610" y="185" text-anchor="middle" class="svg-label" style="fill:#1E293B">K8s Cluster (GPU Nodes)</text>
      <text x="610" y="200" text-anchor="middle" class="svg-sub" style="fill:#64748B">vLLM · tensor parallel · P/D disaggregation</text>
      <text x="610" y="213" text-anchor="middle" class="svg-sub" style="fill:#64748B">KV offload GPU→CPU→SSD</text>
      <text x="610" y="224" text-anchor="middle" class="svg-sub" style="fill:#64748B">Prefix-aware scheduling</text>
      <rect x="25" y="265" width="200" height="52" rx="8" fill="white" stroke="#A5B4FC" stroke-width="1"></rect>
      <text x="125" y="287" text-anchor="middle" class="svg-sub" style="fill:#64748B">RAG Indexer</text>
      <text x="125" y="301" text-anchor="middle" class="svg-sub" style="fill:#64748B">AST chunking · vector search</text>
      <line x1="225" y1="291" x2="280" y2="291" stroke="#94A3B8" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="280" y="265" width="160" height="52" rx="8" fill="white" stroke="#F59E0B" stroke-width="1.5"></rect>
      <text x="360" y="287" text-anchor="middle" class="svg-label" style="fill:#1E293B">MLX Launch</text>
      <text x="360" y="301" text-anchor="middle" class="svg-sub" style="fill:#64748B">TB5 / JACCL RDMA</text>
      <line x1="440" y1="291" x2="490" y2="291" stroke="#D97706" stroke-width="1.5" class="flow-line" marker-end="url(#arrow-amber)"></line>
      <rect x="490" y="260" width="240" height="64" rx="8" fill="white" stroke="#10B981" stroke-width="1.5"></rect>
      <text x="610" y="280" text-anchor="middle" class="svg-label" style="fill:#1E293B">Mac Mini Cluster (Apple Silicon)</text>
      <text x="610" y="295" text-anchor="middle" class="svg-sub" style="fill:#64748B">MLX · tensor/pipeline/expert parallel</text>
      <text x="610" y="308" text-anchor="middle" class="svg-sub" style="fill:#64748B">Unified memory · OpenAI-compat server</text>
      <rect x="25" y="360" width="200" height="44" rx="8" fill="white" stroke="#A5B4FC" stroke-width="1"></rect>
      <text x="125" y="380" text-anchor="middle" class="svg-sub" style="fill:#64748B">AuditLog · SHA-256 chain</text>
      <text x="125" y="394" text-anchor="middle" class="svg-sub" style="fill:#64748B">.champ/audit.log</text>
      <rect x="780" y="72" width="280" height="44" rx="8" fill="white" stroke="#7C3AED" stroke-width="1.5"></rect>
      <text x="920" y="92" text-anchor="middle" class="svg-label" style="fill:#1E293B">OTel Collector</text>
      <text x="920" y="106" text-anchor="middle" class="svg-sub" style="fill:#64748B">OTLP receiver → batch → tail sampling</text>
      <path d="M 225,196 L 225,345 L 760,345 L 760,94 L 780,94" stroke="#7C3AED" stroke-width="1.5" fill="none" class="flow-line" marker-end="url(#arrow-purple)"></path>
      <rect x="780" y="140" width="130" height="44" rx="8" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1"></rect>
      <text x="845" y="158" text-anchor="middle" style="font-size:10px;font-weight:600;fill:#92400E">VictoriaMetrics</text>
      <text x="845" y="174" text-anchor="middle" style="font-size:8px;fill:#B45309">MetricsQL · :8428</text>
      <rect x="930" y="140" width="130" height="44" rx="8" fill="#CCFBF1" stroke="#99F6E4" stroke-width="1"></rect>
      <text x="995" y="158" text-anchor="middle" style="font-size:10px;font-weight:600;fill:#134E4A">VictoriaTraces</text>
      <text x="995" y="174" text-anchor="middle" style="font-size:8px;fill:#115E59">Jaeger · :10428</text>
      <line x1="920" y1="116" x2="920" y2="140" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="780" y="200" width="130" height="44" rx="8" fill="#FCE7F3" stroke="#FBCFE8" stroke-width="1"></rect>
      <text x="845" y="218" text-anchor="middle" style="font-size:10px;font-weight:600;fill:#9D174D">VictoriaLogs</text>
      <text x="845" y="234" text-anchor="middle" style="font-size:8px;fill:#BE185D">LogsQL · :9428</text>
      <rect x="930" y="200" width="130" height="44" rx="8" fill="#DBEAFE" stroke="#BFDBFE" stroke-width="1"></rect>
      <text x="995" y="218" text-anchor="middle" style="font-size:10px;font-weight:600;fill:#1E40AF">vmalert</text>
      <text x="995" y="234" text-anchor="middle" style="font-size:8px;fill:#2563EB">Alert rules</text>
      <line x1="920" y1="184" x2="920" y2="200" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="780" y="265" width="280" height="44" rx="8" fill="white" stroke="#7C3AED" stroke-width="1.5"></rect>
      <text x="920" y="285" text-anchor="middle" class="svg-label" style="fill:#1E293B">Grafana :3000</text>
      <text x="920" y="299" text-anchor="middle" class="svg-sub" style="fill:#64748B">LLM Ops · RAG · MCP · GPU · User dashboards</text>
      <line x1="920" y1="244" x2="920" y2="265" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="780" y="330" width="280" height="56" rx="8" fill="white" stroke="#7C3AED" stroke-width="1.5"></rect>
      <text x="920" y="350" text-anchor="middle" class="svg-label" style="fill:#1E293B">Opik :5173</text>
      <text x="920" y="364" text-anchor="middle" class="svg-sub" style="fill:#64748B">Hallucination · RAG quality · Prompt A/B</text>
      <text x="920" y="378" text-anchor="middle" class="svg-sub" style="fill:#64748B">ClickHouse + MySQL backend</text>
      <line x1="920" y1="309" x2="920" y2="330" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="780" y="410" width="280" height="36" rx="8" fill="white" stroke="#7C3AED" stroke-width="1"></rect>
      <text x="920" y="432" text-anchor="middle" class="svg-label" style="fill:#1E293B">dcgm-exporter :9400 — GPU util · VRAM · temp</text>
      <line x1="920" y1="386" x2="920" y2="410" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <circle r="3" fill="#6366F1">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 225,101 L 440,101"></animateMotion>
      </circle>
      <circle r="3" fill="#D97706">
        <animateMotion dur="2s" repeatCount="indefinite" path="M 440,101 L 490,101"></animateMotion>
      </circle>
      <circle r="3" fill="#7C3AED">
        <animateMotion dur="5s" repeatCount="indefinite" path="M 225,196 L 225,345 L 760,345 L 760,94"></animateMotion>
      </circle>
    </svg>

## Parallelism Strategies How Models Split

## Tensor Parallelism

Split each layer **by width**. Every node holds part of every layer. All nodes process the same token simultaneously.

All-reduce per layer Low latency Needs fast interconnect

## Pipeline Parallelism

Split model **by depth**. Each node holds a contiguous slice of layers. Activations flow node-to-node in a pipeline.

P2P between stages Higher latency Less bandwidth

## Expert Parallelism

MoE models only. Different **experts** live on different nodes. Router dispatches tokens. Only active experts communicate.

MoE-specific Scales well to 4 nodes Llama 4 Maverick

## How Parallelism Splits a Transformer Block

<svg viewBox="0 0 1000 280" width="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#10B981"></path>
        </marker>
        <marker id="arr-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#7C3AED"></path>
        </marker>
      </defs>
      <rect x="10" y="10" width="310" height="260" rx="10" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1"></rect>
      <text x="165" y="32" text-anchor="middle" class="svg-title" style="fill:#4F46E5">Tensor Parallelism</text>
      <rect x="30" y="50" width="270" height="24" rx="4" fill="#C7D2FE" stroke="#818CF8" stroke-width="1"></rect>
      <text x="165" y="66" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#3730A3">Attention Heads</text>
      <line x1="165" y1="50" x2="165" y2="74" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="3 2"></line>
      <text x="115" y="71" text-anchor="middle" style="font-size:8px;fill:#EF4444">Node 0</text>
      <text x="215" y="71" text-anchor="middle" style="font-size:8px;fill:#EF4444">Node 1</text>
      <rect x="30" y="80" width="270" height="24" rx="4" fill="#BFDBFE" stroke="#60A5FA" stroke-width="1"></rect>
      <text x="165" y="96" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#1E40AF">FFN / MLP</text>
      <line x1="165" y1="80" x2="165" y2="104" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="3 2"></line>
      <line x1="30" y1="120" x2="300" y2="120" stroke="#10B981" stroke-width="1.5" class="flow-line"></line>
      <polygon points="300,116 310,120 300,124" fill="#10B981"></polygon>
      <text x="165" y="136" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#059669">All-Reduce</text>
      <rect x="30" y="150" width="270" height="24" rx="4" fill="#C7D2FE" stroke="#818CF8" stroke-width="1"></rect>
      <text x="165" y="166" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#3730A3">Next Attention Heads</text>
      <rect x="30" y="180" width="270" height="24" rx="4" fill="#BFDBFE" stroke="#60A5FA" stroke-width="1"></rect>
      <text x="165" y="196" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#1E40AF">Next FFN / MLP</text>
      <line x1="30" y1="216" x2="300" y2="216" stroke="#10B981" stroke-width="1.5" class="flow-line"></line>
      <polygon points="300,212 310,216 300,220" fill="#10B981"></polygon>
      <text x="165" y="232" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#059669">All-Reduce</text>
      <circle r="3" fill="#10B981">
        <animateMotion dur="2s" repeatCount="indefinite" path="M 30,120 L 310,120"></animateMotion>
      </circle>
      <circle r="3" fill="#10B981">
        <animateMotion dur="2s" repeatCount="indefinite" path="M 30,216 L 310,216"></animateMotion>
      </circle>
      <rect x="345" y="10" width="310" height="260" rx="10" fill="#D1FAE5" stroke="#A7F3D0" stroke-width="1"></rect>
      <text x="500" y="32" text-anchor="middle" class="svg-title" style="fill:#059669">Pipeline Parallelism</text>
      <rect x="365" y="60" width="80" height="80" rx="6" fill="#A7F3D0" stroke="#34D399" stroke-width="1"></rect>
      <text x="405" y="88" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#065F46">Layers 0–7</text>
      <text x="405" y="104" text-anchor="middle" style="font-size:8px;fill:#047857">Node 0</text>
      <line x1="445" y1="100" x2="475" y2="100" stroke="#059669" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="475" y="60" width="80" height="80" rx="6" fill="#BBF7D0" stroke="#4ADE80" stroke-width="1"></rect>
      <text x="515" y="88" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#065F46">Layers 8–15</text>
      <text x="515" y="104" text-anchor="middle" style="font-size:8px;fill:#047857">Node 1</text>
      <line x1="555" y1="100" x2="585" y2="100" stroke="#059669" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="585" y="60" width="80" height="80" rx="6" fill="#D9F99D" stroke="#A3E635" stroke-width="1"></rect>
      <text x="625" y="88" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#065F46">Layers 16–23</text>
      <text x="625" y="104" text-anchor="middle" style="font-size:8px;fill:#047857">Node 2</text>
      <text x="500" y="165" text-anchor="middle" style="font-size:9px;fill:#065F46">Activations flow sequentially</text>
      <text x="500" y="180" text-anchor="middle" style="font-size:9px;fill:#065F46">Higher latency, less bandwidth</text>
      <circle r="3" fill="#059669">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 405,100 L 625,100"></animateMotion>
      </circle>
      <rect x="680" y="10" width="310" height="260" rx="10" fill="#EDE9FE" stroke="#DDD6FE" stroke-width="1"></rect>
      <text x="835" y="32" text-anchor="middle" class="svg-title" style="fill:#7C3AED">Expert Parallelism (MoE)</text>
      <rect x="805" y="55" width="60" height="30" rx="6" fill="#C4B5FD" stroke="#8B5CF6" stroke-width="1"></rect>
      <text x="835" y="75" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#4C1D95">Router</text>
      <line x1="815" y1="85" x2="815" y2="110" stroke="#7C3AED" stroke-width="1" class="flow-line" marker-end="url(#arr-purple)"></line>
      <line x1="835" y1="85" x2="835" y2="110" stroke="#7C3AED" stroke-width="1" class="flow-line" marker-end="url(#arr-purple)"></line>
      <line x1="855" y1="85" x2="855" y2="110" stroke="#7C3AED" stroke-width="1" class="flow-line" marker-end="url(#arr-purple)"></line>
      <rect x="720" y="110" width="60" height="50" rx="6" fill="#DDD6FE" stroke="#A78BFA" stroke-width="1"></rect>
      <text x="750" y="132" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#5B21B6">Expert 0</text>
      <text x="750" y="146" text-anchor="middle" style="font-size:7px;fill:#7C3AED">Node 0</text>
      <rect x="805" y="110" width="60" height="50" rx="6" fill="#DDD6FE" stroke="#A78BFA" stroke-width="1"></rect>
      <text x="835" y="132" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#5B21B6">Expert 1</text>
      <text x="835" y="146" text-anchor="middle" style="font-size:7px;fill:#7C3AED">Node 1</text>
      <rect x="890" y="110" width="60" height="50" rx="6" fill="#DDD6FE" stroke="#A78BFA" stroke-width="1"></rect>
      <text x="920" y="132" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#5B21B6">Expert 2</text>
      <text x="920" y="146" text-anchor="middle" style="font-size:7px;fill:#7C3AED">Node 2</text>
      <text x="835" y="190" text-anchor="middle" style="font-size:9px;fill:#5B21B6">Only active experts</text>
      <text x="835" y="204" text-anchor="middle" style="font-size:9px;fill:#5B21B6">communicate per token</text>
      <circle cx="835" cy="230" r="4" fill="#10B981" class="pulse-dot"></circle>
      <text x="835" y="250" text-anchor="middle" style="font-size:8px;fill:#059669">Active expert (green dot)</text>
    </svg>

## KV-Cache Architecture llm-d

## Hierarchical KV-Cache with Prefix-Aware Routing

<svg viewBox="0 0 1000 400" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="30" width="180" height="80" rx="10" fill="#FEE2E2" stroke="#FECACA" stroke-width="1.5"></rect>
      <text x="120" y="52" text-anchor="middle" class="svg-label" style="fill:#991B1B">GPU HBM</text>
      <text x="120" y="68" text-anchor="middle" class="svg-sub" style="fill:#64748B">Fastest · ~80 GB · Hot blocks</text>
      <rect x="50" y="78" width="140" height="20" rx="4" fill="#EF4444" opacity="0.3"></rect>
      <text x="120" y="92" text-anchor="middle" style="font-size:8px;fill:#991B1B">Tier 0 · ns access</text>
      <line x1="120" y1="110" x2="120" y2="130" stroke="#94A3B8" stroke-width="1.5" class="flow-line"></line>
      <polygon points="116,130 120,138 124,130" fill="#94A3B8"></polygon>
      <rect x="30" y="140" width="180" height="80" rx="10" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1.5"></rect>
      <text x="120" y="162" text-anchor="middle" class="svg-label" style="fill:#92400E">CPU DRAM</text>
      <text x="120" y="178" text-anchor="middle" class="svg-sub" style="fill:#64748B">Medium · ~64 GB · Warm blocks</text>
      <rect x="50" y="188" width="140" height="20" rx="4" fill="#F59E0B" opacity="0.3"></rect>
      <text x="120" y="202" text-anchor="middle" style="font-size:8px;fill:#92400E">Tier 1 · μs access</text>
      <line x1="120" y1="220" x2="120" y2="240" stroke="#94A3B8" stroke-width="1.5" class="flow-line"></line>
      <polygon points="116,240 120,248 124,240" fill="#94A3B8"></polygon>
      <rect x="30" y="250" width="180" height="80" rx="10" fill="#DBEAFE" stroke="#BFDBFE" stroke-width="1.5"></rect>
      <text x="120" y="272" text-anchor="middle" class="svg-label" style="fill:#1E40AF">Shared SSD / FS</text>
      <text x="120" y="288" text-anchor="middle" class="svg-sub" style="fill:#64748B">Largest · TB-scale · Cold blocks</text>
      <text x="120" y="320" text-anchor="middle" style="font-size:8px;fill:#1E40AF">Tier 2 · ms access · cross-replica</text>
      <rect x="280" y="30" width="360" height="100" rx="10" fill="white" stroke="#E2E8F0" stroke-width="1.5"></rect>
      <text x="460" y="50" text-anchor="middle" class="svg-title" style="fill:#1E293B">Incoming Request</text>
      <text x="460" y="66" text-anchor="middle" class="svg-sub" style="fill:#64748B">"Explain the refund policy for order #1234..."</text>
      <rect x="295" y="76" width="150" height="22" rx="5" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1"></rect>
      <text x="370" y="91" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#166534">Tokenize + Hash prefix</text>
      <rect x="460" y="76" width="165" height="22" rx="5" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1"></rect>
      <text x="542" y="91" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#92400E">Query KV-Block Index</text>
      <rect x="280" y="104" width="360" height="22" rx="5" fill="#EDE9FE" stroke="#DDD6FE" stroke-width="1"></rect>
      <text x="460" y="119" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#5B21B6">EPP Scores Pods → Route to warmest cache</text>
      <line x1="210" y1="115" x2="260" y2="115" stroke="#94A3B8" stroke-width="1.5" class="flow-line"></line>
      <line x1="260" y1="70" x2="260" y2="290" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4 3"></line>
      <line x1="210" y1="70" x2="260" y2="70" stroke="#EF4444" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="225" y="58" width="50" height="18" rx="9" fill="#10B981"></rect>
      <text x="250" y="71" text-anchor="middle" style="font-size:8px;font-weight:700;fill:white">Score 9</text>
      <line x1="210" y1="180" x2="260" y2="180" stroke="#F59E0B" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="225" y="168" width="50" height="18" rx="9" fill="#F59E0B"></rect>
      <text x="250" y="181" text-anchor="middle" style="font-size:8px;font-weight:700;fill:white">Score 5</text>
      <line x1="210" y1="290" x2="260" y2="290" stroke="#3B82F6" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="225" y="278" width="50" height="18" rx="9" fill="#EF4444"></rect>
      <text x="250" y="291" text-anchor="middle" style="font-size:8px;font-weight:700;fill:white">Score 1</text>
      <rect x="700" y="30" width="270" height="120" rx="10" fill="white" stroke="#E2E8F0" stroke-width="1.5"></rect>
      <text x="835" y="48" text-anchor="middle" class="svg-title" style="fill:#1E293B">vLLM Pod Fleet</text>
      <rect x="715" y="58" width="115" height="34" rx="6" fill="#D1FAE5" stroke="#6EE7B7" stroke-width="1"></rect>
      <text x="772" y="74" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#065F46">Pod A (warm)</text>
      <text x="772" y="86" text-anchor="middle" style="font-size:7px;fill:#047857">prefix cached ✓</text>
      <rect x="845" y="58" width="115" height="34" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1"></rect>
      <text x="902" y="74" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#92400E">Pod B (partial)</text>
      <text x="902" y="86" text-anchor="middle" style="font-size:7px;fill:#B45309">prefix 60%</text>
      <rect x="715" y="98" width="115" height="34" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"></rect>
      <text x="772" y="114" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#991B1B">Pod C (cold)</text>
      <text x="772" y="126" text-anchor="middle" style="font-size:7px;fill:#B91C1C">no cache match</text>
      <rect x="845" y="98" width="115" height="34" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1"></rect>
      <text x="902" y="114" text-anchor="middle" style="font-size:8px;font-weight:600;fill:#92400E">Pod D (partial)</text>
      <text x="902" y="126" text-anchor="middle" style="font-size:7px;fill:#B45309">prefix 40%</text>
      <rect x="700" y="170" width="270" height="90" rx="10" fill="white" stroke="#E2E8F0" stroke-width="1.5"></rect>
      <text x="835" y="190" text-anchor="middle" class="svg-title" style="fill:#1E293B">KV-Events (Write Path)</text>
      <text x="835" y="206" text-anchor="middle" class="svg-sub" style="fill:#64748B">vLLM emits BlockStored / BlockRemoved via ZMQ</text>
      <rect x="715" y="216" width="240" height="18" rx="4" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1"></rect>
      <text x="835" y="229" text-anchor="middle" style="font-size:8px;fill:#166534">Event Subscriber → KV-Block Index (in-memory LRU)</text>
      <rect x="715" y="240" width="240" height="18" rx="4" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1"></rect>
      <text x="835" y="253" text-anchor="middle" style="font-size:8px;fill:#4338CA">PrefixStore caches tokenized prompt prefixes</text>
      <rect x="280" y="300" width="690" height="80" rx="10" fill="white" stroke="#E2E8F0" stroke-width="1.5"></rect>
      <text x="625" y="320" text-anchor="middle" class="svg-title" style="fill:#1E293B">Performance Impact</text>
      <text x="420" y="346" text-anchor="middle" class="svg-sub" style="fill:#64748B">Without KV routing</text>
      <text x="420" y="364" text-anchor="middle" style="font-size:11px;font-weight:700;fill:#EF4444">TTFT: 2,850ms</text>
      <text x="625" y="346" text-anchor="middle" class="svg-sub" style="fill:#64748B">With KV routing</text>
      <text x="625" y="364" text-anchor="middle" style="font-size:11px;font-weight:700;fill:#10B981">TTFT: 340ms (88% faster)</text>
      <text x="830" y="346" text-anchor="middle" class="svg-sub" style="fill:#64748B">Cache hit rate</text>
      <text x="830" y="364" text-anchor="middle" style="font-size:11px;font-weight:700;fill:#6366F1">87.4%</text>
      <circle r="3" fill="#EF4444">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 460,115 L 260,115 L 260,70 L 210,70"></animateMotion>
      </circle>
      <circle r="3" fill="#10B981">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 772,92 L 772,170 L 835,190"></animateMotion>
      </circle>
    </svg>

## MLX Mac Cluster Apple Silicon

## Thunderbolt 5 Mesh — JACCL RDMA

<svg viewBox="0 0 800 360" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="100" y="30" width="140" height="70" rx="12" fill="#EEF2FF" stroke="#818CF8" stroke-width="2"></rect>
      <text x="170" y="55" text-anchor="middle" class="svg-label" style="fill:#4338CA">Mac Mini 0</text>
      <text x="170" y="70" text-anchor="middle" class="svg-sub" style="fill:#64748B">Coordinator</text>
      <text x="170" y="84" text-anchor="middle" class="svg-sub" style="fill:#64748B">Rank 0 · mlx.launch</text>
      <rect x="540" y="30" width="140" height="70" rx="12" fill="#D1FAE5" stroke="#34D399" stroke-width="2"></rect>
      <text x="610" y="55" text-anchor="middle" class="svg-label" style="fill:#065F46">Mac Mini 1</text>
      <text x="610" y="70" text-anchor="middle" class="svg-sub" style="fill:#64748B">Rank 1 · Worker</text>
      <text x="610" y="84" text-anchor="middle" class="svg-sub" style="fill:#64748B">TB5 RDMA peer</text>
      <rect x="100" y="210" width="140" height="70" rx="12" fill="#FEF3C7" stroke="#FBBF24" stroke-width="2"></rect>
      <text x="170" y="235" text-anchor="middle" class="svg-label" style="fill:#92400E">Mac Mini 2</text>
      <text x="170" y="250" text-anchor="middle" class="svg-sub" style="fill:#64748B">Rank 2 · Worker</text>
      <text x="170" y="264" text-anchor="middle" class="svg-sub" style="fill:#64748B">TB5 RDMA peer</text>
      <rect x="540" y="210" width="140" height="70" rx="12" fill="#FCE7F3" stroke="#F472B6" stroke-width="2"></rect>
      <text x="610" y="235" text-anchor="middle" class="svg-label" style="fill:#9D174D">Mac Mini 3</text>
      <text x="610" y="250" text-anchor="middle" class="svg-sub" style="fill:#64748B">Rank 3 · Worker</text>
      <text x="610" y="264" text-anchor="middle" class="svg-sub" style="fill:#64748B">TB5 RDMA peer</text>
      <line x1="240" y1="65" x2="540" y2="65" stroke="#94A3B8" stroke-width="2" class="flow-line"></line>
      <text x="390" y="58" text-anchor="middle" style="font-size:8px;fill:#64748B">TB5 80 Gbps</text>
      <line x1="240" y1="245" x2="540" y2="245" stroke="#94A3B8" stroke-width="2" class="flow-line"></line>
      <text x="390" y="238" text-anchor="middle" style="font-size:8px;fill:#64748B">TB5 80 Gbps</text>
      <line x1="170" y1="100" x2="170" y2="210" stroke="#94A3B8" stroke-width="2" class="flow-line"></line>
      <text x="185" y="160" style="font-size:8px;fill:#64748B">TB5</text>
      <line x1="610" y1="100" x2="610" y2="210" stroke="#94A3B8" stroke-width="2" class="flow-line"></line>
      <text x="625" y="160" style="font-size:8px;fill:#64748B">TB5</text>
      <rect x="60" y="300" width="680" height="50" rx="8" fill="white" stroke="#E2E8F0" stroke-width="1"></rect>
      <text x="400" y="318" text-anchor="middle" class="svg-title" style="fill:#1E293B">Model Tensor Parallelism across 4 Macs</text>
      <rect x="80" y="328" width="50" height="14" rx="3" fill="#C7D2FE"></rect>
      <rect x="135" y="328" width="50" height="14" rx="3" fill="#BBF7D0"></rect>
      <rect x="190" y="328" width="50" height="14" rx="3" fill="#FDE68A"></rect>
      <rect x="245" y="328" width="50" height="14" rx="3" fill="#FBCFE8"></rect>
      <text x="162" y="345" text-anchor="middle" style="font-size:7px;fill:#64748B">Layer 0 (heads split across 4 ranks)</text>
      <rect x="340" y="328" width="50" height="14" rx="3" fill="#C7D2FE"></rect>
      <rect x="395" y="328" width="50" height="14" rx="3" fill="#BBF7D0"></rect>
      <rect x="450" y="328" width="50" height="14" rx="3" fill="#FDE68A"></rect>
      <rect x="505" y="328" width="50" height="14" rx="3" fill="#FBCFE8"></rect>
      <text x="422" y="345" text-anchor="middle" style="font-size:7px;fill:#64748B">Layer 1 (heads split across 4 ranks)</text>
      <rect x="600" y="328" width="20" height="14" rx="3" fill="#E2E8F0"></rect>
      <text x="610" y="340" text-anchor="middle" style="font-size:9px;fill:#94A3B8">…</text>
      <circle r="3" fill="#6366F1">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 240,65 L 540,65"></animateMotion>
      </circle>
      <circle r="3" fill="#10B981">
        <animateMotion dur="2.5s" repeatCount="indefinite" begin="0.5s" path="M 540,65 L 240,65"></animateMotion>
      </circle>
    </svg>

## MLX Distributed Stack

-   **JACCL** — RDMA over Thunderbolt 5, 80 Gbps direct memory
-   **mlx.distributed** — all\_reduce, all\_gather, send/recv primitives
-   **mlx-lm** — sharded\_load, stream\_generate, --pipeline flag
-   **mlx.launch** — SSH orchestration from your MacBook

## Scaling Numbers

| Setup | Tok/s | TTFT | Max Model (4-bit) |
| --- | --- | --- | --- |
| 2x Mac Mini M4 16GB | ~12 | ~700ms | ~24 GB |
| 4x Mac Mini M4 16GB | ~20 | ~500ms | ~48 GB |
| 2x Mac Studio M5 Ultra | ~14 | ~740ms | ~400B MoE |
| 4x Mac Studio M5 Ultra | ~35 | ~400ms | 1T params |

## Prefill/Decode Disaggregation llm-d on K8s

## Separated Prefill and Decode Stages

<svg viewBox="0 0 900 260" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="100" width="90" height="50" rx="8" fill="#EEF2FF" stroke="#818CF8" stroke-width="1.5"></rect>
      <text x="65" y="120" text-anchor="middle" class="svg-label" style="fill:#4338CA">Client</text>
      <text x="65" y="136" text-anchor="middle" class="svg-sub" style="fill:#64748B">Champ / API</text>
      <line x1="110" y1="125" x2="140" y2="125" stroke="#94A3B8" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="140" y="95" width="100" height="60" rx="8" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.5"></rect>
      <text x="190" y="118" text-anchor="middle" class="svg-label" style="fill:#92400E">Envoy</text>
      <text x="190" y="132" text-anchor="middle" class="svg-sub" style="fill:#64748B">Gateway</text>
      <text x="190" y="144" text-anchor="middle" class="svg-sub" style="fill:#64748B">ext_proc → EPP</text>
      <line x1="240" y1="125" x2="270" y2="125" stroke="#94A3B8" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="270" y="95" width="130" height="60" rx="8" fill="#EDE9FE" stroke="#8B5CF6" stroke-width="1.5"></rect>
      <text x="335" y="118" text-anchor="middle" class="svg-label" style="fill:#5B21B6">EPP Scheduler</text>
      <text x="335" y="132" text-anchor="middle" class="svg-sub" style="fill:#64748B">KV-cache aware</text>
      <text x="335" y="144" text-anchor="middle" class="svg-sub" style="fill:#64748B">+ load-aware</text>
      <line x1="400" y1="115" x2="430" y2="115" stroke="#94A3B8" stroke-width="1.5" class="flow-line"></line>
      <line x1="430" y1="75" x2="430" y2="175" stroke="#94A3B8" stroke-width="1" stroke-dasharray="3 2"></line>
      <line x1="430" y1="75" x2="450" y2="75" stroke="#10B981" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <line x1="430" y1="175" x2="450" y2="175" stroke="#3B82F6" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="450" y="35" width="180" height="80" rx="10" fill="#D1FAE5" stroke="#10B981" stroke-width="1.5"></rect>
      <text x="540" y="55" text-anchor="middle" class="svg-label" style="fill:#065F46">Prefill Workers</text>
      <rect x="465" y="65" width="45" height="22" rx="4" fill="#A7F3D0"></rect>
      <text x="487" y="80" text-anchor="middle" style="font-size:8px;fill:#065F46">P1</text>
      <rect x="518" y="65" width="45" height="22" rx="4" fill="#A7F3D0"></rect>
      <text x="540" y="80" text-anchor="middle" style="font-size:8px;fill:#065F46">P2</text>
      <rect x="571" y="65" width="45" height="22" rx="4" fill="#A7F3D0"></rect>
      <text x="593" y="80" text-anchor="middle" style="font-size:8px;fill:#065F46">P3</text>
      <text x="540" y="105" text-anchor="middle" class="svg-sub" style="fill:#64748B">Compute-bound · wide EP</text>
      <rect x="450" y="145" width="180" height="80" rx="10" fill="#DBEAFE" stroke="#3B82F6" stroke-width="1.5"></rect>
      <text x="540" y="165" text-anchor="middle" class="svg-label" style="fill:#1E40AF">Decode Workers</text>
      <rect x="465" y="175" width="45" height="22" rx="4" fill="#BFDBFE"></rect>
      <text x="487" y="190" text-anchor="middle" style="font-size:8px;fill:#1E40AF">D1</text>
      <rect x="518" y="175" width="45" height="22" rx="4" fill="#BFDBFE"></rect>
      <text x="540" y="190" text-anchor="middle" style="font-size:8px;fill:#1E40AF">D2</text>
      <text x="540" y="215" text-anchor="middle" class="svg-sub" style="fill:#64748B">Latency-bound · more TP</text>
      <line x1="540" y1="115" x2="540" y2="145" stroke="#8B5CF6" stroke-width="2" class="flow-line" marker-end="url(#arrow)"></line>
      <text x="560" y="133" style="font-size:7px;font-weight:600;fill:#7C3AED">KV transfer</text>
      <text x="560" y="142" style="font-size:7px;fill:#7C3AED">(NIXL/UCCL)</text>
      <rect x="680" y="75" width="180" height="100" rx="10" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1.5"></rect>
      <text x="770" y="95" text-anchor="middle" class="svg-label" style="fill:#92400E">Shared KV Storage</text>
      <text x="770" y="112" text-anchor="middle" class="svg-sub" style="fill:#64748B">GPU → CPU → SSD</text>
      <text x="770" y="126" text-anchor="middle" class="svg-sub" style="fill:#64748B">Cross-replica reuse</text>
      <text x="770" y="140" text-anchor="middle" class="svg-sub" style="fill:#64748B">Hybrid model HMA-aware</text>
      <text x="770" y="154" text-anchor="middle" class="svg-sub" style="fill:#64748B">Scale-to-zero capable</text>
      <line x1="630" y1="75" x2="680" y2="100" stroke="#FDE68A" stroke-width="1" class="flow-line"></line>
      <line x1="630" y1="185" x2="680" y2="150" stroke="#FDE68A" stroke-width="1" class="flow-line"></line>
      <rect x="680" y="195" width="180" height="50" rx="8" fill="white" stroke="#10B981" stroke-width="1.5"></rect>
      <text x="770" y="215" text-anchor="middle" style="font-size:9px;font-weight:600;fill:#059669">P/D vs Aggregated</text>
      <text x="770" y="231" text-anchor="middle" style="font-size:9px;fill:#059669">E2E latency: −47% | ITL: −67%</text>
      <text x="770" y="243" text-anchor="middle" style="font-size:8px;fill:#64748B">at 45 QPS, 20:1 ISL:OSL ratio</text>
      <circle r="3" fill="#10B981">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 65,125 L 240,125 L 400,125 L 430,125 L 430,75 L 450,75"></animateMotion>
      </circle>
      <circle r="3" fill="#3B82F6">
        <animateMotion dur="2s" repeatCount="indefinite" begin="1s" path="M 540,115 L 540,145"></animateMotion>
      </circle>
    </svg>

## Observability Stack Metrics · Traces · Logs

## Signal Flow — From Code to Dashboards

<svg viewBox="0 0 1000 300" width="100%" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="140" height="260" rx="10" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1"></rect>
      <text x="90" y="40" text-anchor="middle" class="svg-title" style="fill:#4F46E5">Sources</text>
      <rect x="35" y="52" width="110" height="28" rx="5" fill="white" stroke="#818CF8" stroke-width="1"></rect>
      <text x="90" y="70" text-anchor="middle" class="svg-sub" style="fill:#64748B">Ollama /metrics</text>
      <rect x="35" y="88" width="110" height="28" rx="5" fill="white" stroke="#818CF8" stroke-width="1"></rect>
      <text x="90" y="106" text-anchor="middle" class="svg-sub" style="fill:#64748B">OTEL SDK spans</text>
      <rect x="35" y="124" width="110" height="28" rx="5" fill="white" stroke="#818CF8" stroke-width="1"></rect>
      <text x="90" y="142" text-anchor="middle" class="svg-sub" style="fill:#64748B">App logs</text>
      <rect x="35" y="160" width="110" height="28" rx="5" fill="white" stroke="#818CF8" stroke-width="1"></rect>
      <text x="90" y="178" text-anchor="middle" class="svg-sub" style="fill:#64748B">System metrics</text>
      <line x1="160" y1="66" x2="180" y2="66" stroke="#94A3B8" stroke-width="1" class="flow-line"></line>
      <line x1="160" y1="102" x2="180" y2="102" stroke="#94A3B8" stroke-width="1" class="flow-line"></line>
      <line x1="160" y1="138" x2="180" y2="138" stroke="#94A3B8" stroke-width="1" class="flow-line"></line>
      <line x1="160" y1="174" x2="180" y2="174" stroke="#94A3B8" stroke-width="1" class="flow-line"></line>
      <line x1="180" y1="66" x2="180" y2="174" stroke="#94A3B8" stroke-width="1.5"></line>
      <line x1="180" y1="120" x2="220" y2="120" stroke="#94A3B8" stroke-width="1.5" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="220" y="50" width="140" height="176" rx="10" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.5"></rect>
      <text x="290" y="72" text-anchor="middle" class="svg-label" style="fill:#92400E">OTel Collector</text>
      <text x="290" y="88" text-anchor="middle" class="svg-sub" style="fill:#64748B">OTLP receiver</text>
      <text x="290" y="102" text-anchor="middle" class="svg-sub" style="fill:#64748B">Batch processor</text>
      <text x="290" y="116" text-anchor="middle" class="svg-sub" style="fill:#64748B">Memory limiter</text>
      <text x="290" y="130" text-anchor="middle" class="svg-sub" style="fill:#64748B">Export by signal:</text>
      <text x="290" y="152" text-anchor="middle" style="font-size:8px;fill:#B45309">metrics → Prometheus</text>
      <text x="290" y="166" text-anchor="middle" style="font-size:8px;fill:#B45309">traces → Tempo</text>
      <text x="290" y="180" text-anchor="middle" style="font-size:8px;fill:#B45309">logs → Loki</text>
      <text x="290" y="194" text-anchor="middle" style="font-size:8px;fill:#B45309">Prometheus :8889</text>
      <line x1="360" y1="90" x2="410" y2="90" stroke="#F59E0B" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <line x1="360" y1="138" x2="410" y2="138" stroke="#14B8A6" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <line x1="360" y1="186" x2="410" y2="186" stroke="#EC4899" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="410" y="55" width="140" height="60" rx="8" fill="#FEF3C7" stroke="#FDE68A" stroke-width="1"></rect>
      <text x="480" y="78" text-anchor="middle" class="svg-label" style="fill:#92400E">Prometheus</text>
      <text x="480" y="94" text-anchor="middle" class="svg-sub" style="fill:#64748B">TSDB · 7d retention</text>
      <text x="480" y="106" text-anchor="middle" class="svg-sub" style="fill:#64748B">:9090</text>
      <rect x="410" y="125" width="140" height="50" rx="8" fill="#CCFBF1" stroke="#99F6E4" stroke-width="1"></rect>
      <text x="480" y="145" text-anchor="middle" class="svg-label" style="fill:#134E4A">Tempo</text>
      <text x="480" y="161" text-anchor="middle" class="svg-sub" style="fill:#64748B">Trace storage · :3200</text>
      <rect x="410" y="185" width="140" height="50" rx="8" fill="#FCE7F3" stroke="#FBCFE8" stroke-width="1"></rect>
      <text x="480" y="205" text-anchor="middle" class="svg-label" style="fill:#9D174D">Loki</text>
      <text x="480" y="221" text-anchor="middle" class="svg-sub" style="fill:#64748B">Log aggregation · :3100</text>
      <line x1="550" y1="85" x2="600" y2="85" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <line x1="550" y1="150" x2="600" y2="120" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <line x1="550" y1="210" x2="600" y2="155" stroke="#94A3B8" stroke-width="1" class="flow-line" marker-end="url(#arrow)"></line>
      <rect x="600" y="50" width="170" height="170" rx="10" fill="white" stroke="#E2E8F0" stroke-width="1.5"></rect>
      <text x="685" y="70" text-anchor="middle" class="svg-title" style="fill:#1E293B">Grafana Dashboards</text>
      <rect x="615" y="82" width="140" height="20" rx="4" fill="#EEF2FF"></rect>
      <text x="685" y="96" text-anchor="middle" style="font-size:8px;fill:#4338CA">LLM Inference Dashboard</text>
      <rect x="615" y="107" width="140" height="20" rx="4" fill="#D1FAE5"></rect>
      <text x="685" y="121" text-anchor="middle" style="font-size:8px;fill:#065F46">GPU Metrics</text>
      <rect x="615" y="132" width="140" height="20" rx="4" fill="#FEF3C7"></rect>
      <text x="685" y="146" text-anchor="middle" style="font-size:8px;fill:#92400E">Trace Explorer</text>
      <rect x="615" y="157" width="140" height="20" rx="4" fill="#EDE9FE"></rect>
      <text x="685" y="171" text-anchor="middle" style="font-size:8px;fill:#5B21B6">Log Analytics</text>
      <rect x="615" y="182" width="140" height="20" rx="4" fill="#FCE7F3"></rect>
      <text x="685" y="196" text-anchor="middle" style="font-size:8px;fill:#9D174D">Alert Rules</text>
      <rect x="810" y="50" width="170" height="110" rx="10" fill="white" stroke="#EF4444" stroke-width="1.5"></rect>
      <text x="895" y="70" text-anchor="middle" class="svg-title" style="fill:#DC2626">Alert Rules</text>
      <text x="895" y="88" text-anchor="middle" class="svg-sub" style="fill:#64748B">Service down → critical</text>
      <text x="895" y="104" text-anchor="middle" class="svg-sub" style="fill:#64748B">Error rate > 5% → warn</text>
      <text x="895" y="120" text-anchor="middle" class="svg-sub" style="fill:#64748B">Latency p99 > 10s → warn</text>
      <text x="895" y="136" text-anchor="middle" class="svg-sub" style="fill:#64748B">GPU temp > 85°C → crit</text>
      <circle r="2.5" fill="#6366F1">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 90,66 L 180,66 L 180,120 L 220,120 L 360,120 L 410,120"></animateMotion>
      </circle>
    </svg>

## docker-compose.yml

\# Location:  
~/Documents/git/local-llm/observability/  

\# Services:  
prometheus:9090  
grafana:3001  
otel-collector:4317/:4318  
loki:3100  
tempo:3200

## Grafana Credentials

\# URL:  
http://localhost:3001  

\# Username: admin  
\# Password: admin  

\# Pre-provisioned datasources:  
Prometheus (default)  
Tempo  
Loki  
OTEL (collector metrics)

## Key Metrics What to Monitor

## LLM Performance

| Metric | Type |
| --- | --- |
| champ_llm_ttft_seconds | Histogram |
| champ_llm_request_duration_seconds | Histogram |
| champ_llm_tokens_per_second | Gauge |
| champ_llm_input_tokens_total | Counter |
| champ_llm_output_tokens_total | Counter |
| champ_llm_cost_usd_total | Counter |
| champ_llm_errors_total | Counter |

## Agent & Tool

| Metric | Type |
| --- | --- |
| champ_agent_step_duration_seconds | Histogram |
| champ_tool_call_duration_seconds | Histogram |
| champ_mcp_tool_call_duration_seconds | Histogram |
| champ_rag_query_duration_seconds | Histogram |
| champ_rag_result_count | Histogram |
| champ_hallucination_score | Histogram |

## Infrastructure

| Metric | Source |
| --- | --- |
| DCGM_FI_DEV_GPU_UTIL | dcgm-exporter |
| DCGM_FI_DEV_FB_USED | dcgm-exporter |
| DCGM_FI_DEV_TEMP_GPU | dcgm-exporter |
| vllm:gpu_cache_usage_perc | vLLM /metrics |
| vllm:num_requests_running | vLLM /metrics |
| kv_cache_hit_rate | llm-d EPP |

## Quick Reference Config Cheatsheet

## Champ → LiteLLM (Single URL)

Champ sees one OpenAI-compatible endpoint. LiteLLM routes to everything.

champ.provider: openai-compatible  
champ.openaiCompatible.baseUrl: http://localhost:4000  
champ.openaiCompatible.model: coding  
champ.openaiCompatible.apiKey: sk-champ  
champ.autocomplete.model: fast  
champ.indexing.embeddingProvider: ollama

## LiteLLM → Model Fleet

One config file, every backend behind one port.

model\_list:  
  - model\_name: coding  
    litellm\_params:  
      model: ollama/qwen2.5-coder:7b  
      api\_base: http://localhost:11434  
fallbacks: \[{coding: \[fast\]}\]
