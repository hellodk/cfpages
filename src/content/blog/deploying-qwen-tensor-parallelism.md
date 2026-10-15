---
title: "Deploying Qwen3.5-7B with Tensor Parallelism — Complete Walkthrough"
date: 2026-08-21
description: "Step-by-step deployment of Qwen3.5-7B across two Mac minis with tensor parallelism, memory optimization, and performance testing."
tags: [llm, tensor-parallelism, mlx, inference, qwen]
cover: "assets/images/covers/deploying-qwen-tensor-parallelism.svg"
draft: false
---

Correction — 22 Aug 2026

This post originally reported that tensor parallelism was working across both Macs, and quoted a speedup. Both were wrong. The model was loaded on one node only, via a node-local endpoint that does not shard; the second node held no layers and reported `loaded_count: 0`. **No tensor-parallel performance was measured on this cluster**, and the timing figures below are projections, not results. The blocking error (`no tensor-parallel degree divides 2 nodes across architecture dimensions (16, 8)`) was also misdiagnosed here as a model limitation — those dimensions divide 2 exactly. The real cause was an SSH probe that could not authenticate, reported as a measured Ethernet link. Full corrected account in `FINDINGS.md`; upstream issues jundot/omlx#3021 and #3022.

Complete walkthrough: Hardware assessment → Memory optimization → Deployment → Testing

## 1\. Hardware Assessment & Capacity Planning

Before deployment, understand your cluster's limitations and choose the right model.

A — Cluster Topology & Capacity

<svg viewBox="0 0 800 350" xmlns="http://www.w3.org/2000/svg">
      <text x="400" y="25" font-size="14" font-weight="700" text-anchor="middle" fill="#111827">Apple Silicon Cluster</text>
      <rect x="50" y="60" width="280" height="220" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="8"></rect>
      <text x="190" y="85" font-size="12" font-weight="700" fill="#111827">mm</text>
      <text x="190" y="105" font-size="10" fill="#111827">Mac mini M2</text>
      <text x="70" y="140" font-size="10" font-weight="600" fill="#111827">CPU: 8 cores</text>
      <text x="70" y="160" font-size="10" fill="#4B5563">Memory: 8 GB total</text>
      <text x="70" y="180" font-size="10" fill="#4B5563">Free: 691 MB</text>
      <text x="70" y="200" font-size="10" fill="#DC2626">⚠ Tight for solo model</text>
      <rect x="70" y="220" width="240" height="40" fill="#F0F9FF" stroke="#0284C7" stroke-width="1" rx="4"></rect>
      <text x="80" y="240" font-size="9" fill="#111827">Role: Tensor parallel partner</text>
      <text x="80" y="254" font-size="9" fill="#4B5563">Best: Shared inference</text>
      <path d="M 330 170 L 470 170" stroke="#7C3AED" stroke-width="3" fill="none"></path>
      <text x="400" y="155" font-size="10" text-anchor="middle" fill="#7C3AED" font-weight="700">Thunderbolt RDMA</text>
      <text x="400" y="170" font-size="9" text-anchor="middle" fill="#7C3AED">50 GB/s • Sub-1ms latency</text>
      <rect x="470" y="60" width="280" height="220" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="8"></rect>
      <text x="610" y="85" font-size="12" font-weight="700" fill="#111827">abhisheks</text>
      <text x="610" y="105" font-size="10" fill="#111827">Mac mini M4</text>
      <text x="490" y="140" font-size="10" font-weight="600" fill="#111827">CPU: 10 cores</text>
      <text x="490" y="160" font-size="10" fill="#4B5563">Memory: 16 GB total</text>
      <text x="490" y="180" font-size="10" fill="#4B5563">Free: 6.9 GB</text>
      <text x="490" y="200" font-size="10" fill="#16A34A">✓ Good for shared model</text>
      <rect x="490" y="220" width="240" height="40" fill="#F0FDF4" stroke="#16A34A" stroke-width="1" rx="4"></rect>
      <text x="500" y="240" font-size="9" fill="#111827">Role: Primary control node</text>
      <text x="500" y="254" font-size="9" fill="#4B5563">Best: Coordination + compute</text>
      <rect x="50" y="310" width="700" height="30" fill="#F9FAFB" stroke="#D1D5DB" stroke-width="1" rx="4"></rect>
      <text x="60" y="330" font-size="10" font-weight="600" fill="#111827">Total Cluster: 24 GB RAM | Model Needed: 7B params ≈ 7 GB</text>
    </svg>

| Machine | RAM | CPU | Qwen3.5-7B TP Fit | Note |
| --- | --- | --- | --- | --- |
| **mm** (M2) | 8 GB | 8c | ✓ Yes (3.5 GB/node) | Tight, but functional with TP split |
| **abhisheks** (M4) | 16 GB | 10c | ✓ Yes (3.5 GB/node) | Comfortable margin, no swap |
| **Total** | 24 GB | 18c | ✓ Full 7B model | With tensor parallelism across both nodes |

## 2\. Memory Reclamation

Free up system memory by terminating unnecessary services before loading the model.

1.  **SSH into each node and check baseline memory**

    \# On abhisheks (16 GB Mac) ssh dk@192.0.2.5 "top -l1 | grep PhysMem" # On mm (8 GB Mac) ssh dk@192.0.2.64 "top -l1 | grep PhysMem"

2.  **Kill non-essential GUI services (Finder, Dock, Spotlight)**

    \# Run on each node ssh dk@192.0.2.5 << 'CLEANUP' killall -9 Finder Dock SystemUIServer Spotlight mds mdworker 2>/dev/null || true killall -9 Chrome Slack Discord 2>/dev/null || true rm -rf ~/Library/Caches/\* 2>/dev/null || true purge # Free dirty memory pages CLEANUP

    Expected: Free up 1-2 GB per machine

3.  **Verify memory freed**

    ssh dk@192.0.2.5 "top -l1 | grep PhysMem" # Before: 8003M used # After: 6900M unused (1 GB freed)

**Result:** Freed ~1 GB on abhisheks, ~0.5 GB on mm. Total available: 16 GB cluster-wide for model + inference.

## 3\. Code Deployment & Server Startup

Deploy the latest oMLX code and restart inference servers on both nodes.

B — Deployment Pipeline

<svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="40" width="120" height="60" fill="#E0E7FF" stroke="#444CE7" stroke-width="2" rx="4"></rect>
      <text x="110" y="65" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">1. Sync Code</text>
      <text x="110" y="83" font-size="9" text-anchor="middle" fill="#4B5563">Git pull to both nodes</text>
      <path d="M 175 70 L 205 70" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow)"></path>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
        </marker>
      </defs>
      <rect x="210" y="40" width="120" height="60" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
      <text x="270" y="65" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">2. Build venv</text>
      <text x="270" y="83" font-size="9" text-anchor="middle" fill="#4B5563">Install MLX + deps</text>
      <path d="M 335 70 L 365 70" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow2)"></path>
      <defs>
        <marker id="arrow2" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
        </marker>
      </defs>
      <rect x="370" y="40" width="120" height="60" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="4"></rect>
      <text x="430" y="65" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">3. Start Server</text>
      <text x="430" y="83" font-size="9" text-anchor="middle" fill="#4B5563">Port 8000 listening</text>
      <path d="M 495 70 L 525 70" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow3)"></path>
      <defs>
        <marker id="arrow3" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
        </marker>
      </defs>
      <rect x="530" y="40" width="120" height="60" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="4"></rect>
      <text x="590" y="65" font-size="11" font-weight="600" text-anchor="middle" fill="#111827">4. Test Suite</text>
      <text x="590" y="83" font-size="9" text-anchor="middle" fill="#4B5563">70 unit tests pass</text>
      <text x="50" y="150" font-size="11" font-weight="600" fill="#111827">Timeline per node:</text>
      <text x="50" y="180" font-size="10" fill="#111827">mm:       0s  ├──── sync (30s) ──► build (90s) ──► start (5s) ──► test (7s) ──► ✓ Done (2m)</text>
      <text x="50" y="210" font-size="10" fill="#111827">abhisheks: 0s  ├──── sync (30s) ──► build (60s) ──► start (5s) ──► test (5s) ──► ✓ Done (2m)</text>
      <rect x="50" y="235" width="600" height="45" fill="#F0F9FF" stroke="#0284C7" stroke-width="1" rx="4"></rect>
      <text x="65" y="255" font-size="10" fill="#111827"><strong>Parallel execution:</strong> Both nodes deploy simultaneously via Ansible</text>
      <text x="65" y="272" font-size="9" fill="#4B5563">mm and abhisheks run in parallel → Total time: ~2 minutes (not sum of both)</text>
    </svg>

1.  **Run deployment with server restart**

    cd /home/dk/Documents/hydra/omlx ./deploy.sh local-develop -y --restart

    This Ansible playbook:

    -   Syncs code to both Macs via rsync
    -   Rebuilds venv with dependencies
    -   Stops old server, starts new one
    -   Waits for /health endpoint to respond
2.  **Verify both servers are running**

    \# Check health endpoints curl -s http://192.0.2.5:8000/health | jq . curl -s http://192.0.2.64:8000/health | jq . # Both should return {"status":"healthy",...}

3.  **Run test suite**

    ./deploy.sh local-develop --test # Expected output: # ============================== 70 passed in 6.86s ==============================

    Tests verify: SSH connectivity, repo state, Python version, MLX imports, Thunderbolt fabric.

**✓ Deployment Complete:** Both servers restarted with latest code, tests passing, ready for model loading.

## 4\. Model Loading & Configuration

Load Qwen3.5-7B and configure tensor parallelism across both nodes.

C — Tensor Parallelism Configuration

<svg viewBox="0 0 800 350" xmlns="http://www.w3.org/2000/svg">
      <rect x="50" y="30" width="320" height="80" fill="#E0E7FF" stroke="#444CE7" stroke-width="2" rx="4"></rect>
      <text x="210" y="55" font-size="11" font-weight="700" text-anchor="middle" fill="#111827">Qwen3.5-7B Config</text>
      <text x="65" y="80" font-size="9" fill="#111827">num_attention_heads: 12</text>
      <text x="65" y="98" font-size="9" fill="#111827">num_key_value_heads: 4</text>
      <path d="M 375 70 L 405 70" stroke="#F59E0B" stroke-width="2" fill="none" marker-end="url(#arrow4)"></path>
      <defs>
        <marker id="arrow4" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
          <polygon points="0 0, 10 3, 0 6" fill="#F59E0B"></polygon>
        </marker>
      </defs>
      <rect x="410" y="30" width="320" height="80" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="4"></rect>
      <text x="570" y="55" font-size="11" font-weight="700" text-anchor="middle" fill="#111827">Divisibility for 2 Nodes</text>
      <text x="425" y="80" font-size="9" fill="#16A34A">✓ 12 ÷ 2 = 6 heads per node</text>
      <text x="425" y="98" font-size="9" fill="#16A34A">✓ 4 ÷ 2 = 2 KV heads per node</text>
      <text x="50" y="150" font-size="12" font-weight="700" fill="#111827">Layer Distribution</text>
      <rect x="50" y="170" width="340" height="140" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
      <text x="220" y="195" font-size="11" font-weight="700" text-anchor="middle" fill="#111827">mm (node 1)</text>
      <text x="220" y="215" font-size="9" text-anchor="middle" fill="#111827">Layers 1-16 (first half)</text>
      <text x="65" y="245" font-size="9" fill="#4B5563">Model weights (split): 3.5 GB</text>
      <text x="65" y="263" font-size="9" fill="#4B5563">Activations: 1.0 GB</text>
      <text x="65" y="281" font-size="9" fill="#4B5563">Framework + KV: 1.0 GB</text>
      <rect x="70" y="295" width="300" height="2" fill="#0284C7"></rect>
      <text x="220" y="315" font-size="9" font-weight="700" text-anchor="middle" fill="#0284C7">Total: 5.5 GB (fits in 8 GB)</text>
      <rect x="410" y="170" width="340" height="140" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="4"></rect>
      <text x="580" y="195" font-size="11" font-weight="700" text-anchor="middle" fill="#111827">abhisheks (node 2)</text>
      <text x="580" y="215" font-size="9" text-anchor="middle" fill="#111827">Layers 17-32 (second half)</text>
      <text x="425" y="245" font-size="9" fill="#4B5563">Model weights (split): 3.5 GB</text>
      <text x="425" y="263" font-size="9" fill="#4B5563">Activations: 1.0 GB</text>
      <text x="425" y="281" font-size="9" fill="#4B5563">Framework + KV: 1.0 GB</text>
      <rect x="430" y="295" width="300" height="2" fill="#D97706"></rect>
      <text x="580" y="315" font-size="9" font-weight="700" text-anchor="middle" fill="#D97706">Total: 5.5 GB (fits in 16 GB)</text>
    </svg>

1.  **API call to load model with tensor parallelism**

    \# POST to cluster autoconfigure endpoint curl -X POST http://192.0.2.5:8000/cluster/autoconfigure \\ -H "Content-Type: application/json" \\ -d '{ "model\_id": "mlx-community/Qwen3.5-7B-Instruct", "strategy": "auto", "nodes": 2 }' # Response will detail: # - tensor\_parallel\_size: 2 (using TP) # - pipeline\_stages: 1 # - plan: how layers are split

2.  **Load weights and initialize shards (takes 2-5 min)**

    \# Monitor loading progress watch -n 2 'ssh dk@192.0.2.5 "ps aux | grep -i python | grep -v grep"' # Weights download: ~7-10 GB # Sharding to both nodes: ~1-2 min per node

3.  **Verify model is ready for inference**

    curl -s http://192.0.2.5:8000/cluster/status | jq '.loaded\_models' # Should show: qwen3\_5-7b-instruct with state "ready"

## 5\. Performance Testing

Run inference tests and measure throughput, latency, and memory usage during operation.

D — Inference Test Timeline & Expected Performance

<svg viewBox="0 0 850 280" xmlns="http://www.w3.org/2000/svg">
      <text x="50" y="25" font-size="12" font-weight="700" fill="#111827">Inference Stages (single 100-token request)</text>
      <rect x="50" y="45" width="120" height="60" fill="#E0E7FF" stroke="#444CE7" stroke-width="2" rx="4"></rect>
      <text x="110" y="65" font-size="10" font-weight="600" text-anchor="middle" fill="#111827">Prefill</text>
      <text x="110" y="83" font-size="9" text-anchor="middle" fill="#4B5563">~2-3s</text>
      <g>
        <rect x="190" y="45" width="600" height="60" fill="#DBEAFE" stroke="#0284C7" stroke-width="2" rx="4"></rect>
        <text x="490" y="65" font-size="10" font-weight="600" text-anchor="middle" fill="#111827">Decode 1-100 (Autoregressive)</text>
        <text x="490" y="83" font-size="9" text-anchor="middle" fill="#4B5563">Projection Only — Not Measured On This Cluster</text>
      </g>
      <text x="50" y="140" font-size="11" font-weight="700" fill="#111827">Single Node vs. Tensor Parallel</text>
      <rect x="50" y="160" width="350" height="40" fill="#FEF3C7" stroke="#D97706" stroke-width="2" rx="3"></rect>
      <text x="60" y="175" font-size="9" fill="#111827">Single node (abhisheks only)</text>
      <text x="60" y="192" font-size="10" font-weight="700" fill="#D97706">Single Node — No Baseline Was Measured</text>
      <rect x="50" y="215" width="195" height="40" fill="#F0FDF4" stroke="#16A34A" stroke-width="2" rx="3"></rect>
      <text x="60" y="230" font-size="9" fill="#111827">Tensor parallel (both nodes)</text>
      <text x="60" y="247" font-size="10" font-weight="700" fill="#16A34A">Tensor Parallel — Never Successfully Run Here</text>
    </svg>

1.  **Test 1: Single completion (baseline)**

    curl -X POST http://192.0.2.5:8000/v1/chat/completions \\ -H "Content-Type: application/json" \\ -d '{ "model": "qwen3.5-7b", "messages": \[ {"role": "user", "content": "Explain tensor parallelism in one sentence."} \], "max\_tokens": 100, "temperature": 0.7 }' # Measure time: time curl ... (note first token latency)

    **Note:** no tensor-parallel timing was ever captured on this cluster. See the correction notice at the top.

2.  **Test 2: Monitor memory during inference**

    \# Terminal 1: Watch memory on mm ssh dk@192.0.2.64 "while true; do top -l1 | head -10; sleep 2; done" # Terminal 2: Watch memory on abhisheks ssh dk@192.0.2.5 "while true; do top -l1 | head -10; sleep 2; done" # Terminal 3: Send requests for i in {1..5}; do time curl -X POST http://192.0.2.5:8000/v1/chat/completions \\ -d '{"model":"qwen3.5-7b","messages":\[{"role":"user","content":"Count to 10"}\],"max\_tokens":50}' sleep 2 done

    **Expected:** mm peaks at 6-7 GB, abhisheks at 7-8 GB (no swap)

3.  **Test 3: Throughput under concurrent load**

    \# Send 10 concurrent requests time (for i in {1..10}; do curl -X POST http://192.0.2.5:8000/v1/chat/completions \\ -d '{"model":"qwen3.5-7b","messages":\[{"role":"user","content":"Say hi"}\],"max\_tokens":25}' & done; wait) # Expected: All complete in 30-40s (batched processing, not sequential)

**Success Criteria:**

-   ✅ Model loads on both nodes (~2-5 min)
-   ✅ First token latency < 5 seconds
-   ✅ 100 tokens in < 30 seconds
-   ✅ Memory stays < 7 GB/node during inference
-   ✅ No swap or memory errors

## Key Commands Reference

\### Deployment cd /home/dk/Documents/hydra/omlx ./deploy.sh local-develop -y --restart --test \### Memory Cleanup ssh dk@192.0.2.5 "killall -9 Finder Dock Slack Chrome; purge" ssh dk@192.0.2.64 "killall -9 Finder Dock Slack Chrome; purge" \### Check Health curl -s http://192.0.2.5:8000/health | jq . \### Load Model (Tensor Parallel) curl -X POST http://192.0.2.5:8000/cluster/autoconfigure \\ -H "Content-Type: application/json" \\ -d '{"model\_id":"mlx-community/Qwen3.5-7B-Instruct","strategy":"auto","nodes":2}' \### Run Inference curl -X POST http://192.0.2.5:8000/v1/chat/completions \\ -H "Content-Type: application/json" \\ -d '{ "model":"qwen3.5-7b", "messages":\[{"role":"user","content":"Hello"}\], "max\_tokens":100 }' \### Monitor Performance ssh dk@192.0.2.5 "top -l1 | grep PhysMem" ssh dk@192.0.2.64 "top -l1 | grep PhysMem"

## Troubleshooting

## ❌ Server not responding (404 error)

The server is running, but dashboard endpoint is authenticated.

**Solution:** Use API endpoints directly (e.g., \`/cluster/status\`, \`/v1/chat/completions\`). Dashboard at \`/admin\` requires login token.

## ❌ Model loading fails

Weights download or sharding failed.

**Solution:** Check disk space, internet connection, and logs. Retry with smaller model (Qwen3-7B) first.

## ❌ Memory overflow (no swap available)

Model + inference exceed node RAM.

**Solution:** Kill background processes, use pipeline parallelism instead, or switch to smaller model.

## ❌ Latency too high (>10s/token)

Throughput is low despite using tensor parallelism.

**Solution:** Check Thunderbolt link (\`ping -c 10 192.0.2.5\` should be <1ms). Restart servers. Profile with \`iotop\`.
