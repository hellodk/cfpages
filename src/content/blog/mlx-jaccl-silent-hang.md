---
title: "Six Loops, No Timeout: The MLX Bug That Hangs a Mac Cluster Forever"
date: 2026-08-16
description: "MLX issue #3910: when a peer dies mid-collective, JACCL spins forever with zero errno, zero exception, zero log output. I read the source. It is six unbounded loops, not one, plus a second unreported bug with a negative-offset pointer. Here is what is actually broken and why Rust would not have"
tags: [mlx, macos, apple-silicon, debugging, distributed-systems]
cover: "assets/images/covers/mlx-jaccl-silent-hang.svg"
draft: false
---

⛔ Silent Failure

A Thunderbolt cable comes loose. The surviving rank keeps polling a dead queue pair — not for a timeout period, but permanently. No errno. No exception. No log line. `SIGKILL` is the only way out, and on macOS it leaves the RDMA pages kernel-held until you reboot. I read the source. The issue understates it in three ways.

Spin Loops

6

All unbounded, one file

Error Signals

0

Verbs reports nothing

Samples In Loop

1156

of 1304, live capture

Recovery

Reboot

Wired pages kernel-held

TL;DR

-   The issue names **one** function. The source has **six identical unbounded loops** — and the reporter's own stack trace was in a different one.
-   The fix being debated in the thread — **checking error codes** — cannot work. On UC transport the verbs layer returns `0`, not an error. There is nothing to check.
-   I found a **second, unreported bug** in the same poll path: a negative return value is added to a running total and used as a pointer offset. That is memory-unsafe, and it produces its own silent hang.
-   The only mechanism that works is a **wall-clock deadline reset on progress**. Downstream projects already bolted this on out-of-band because MLX won't do it in-loop.
-   **Rust would not have prevented this.** An infinite loop with no deadline is a logic bug and compiles fine in every language.

## 1 The Symptom

MLX ships **JACCL**, a distributed backend that runs collectives over RDMA on Thunderbolt. It is the fast path for multi-Mac inference — tens of Gbps, microsecond-scale latency. It is also, when a peer disappears, a permanent deadlock.

When a peer of an established JACCL mesh becomes unreachable mid-operation, `jaccl::MeshImpl::recv` never returns: it polls the dead QP forever. Because the transport is UC with no timeout and no liveness check, the collective never completes, `mx.eval` blocks forever, and the whole distributed job hangs **with zero errno, zero exception, zero log output**. — ml-explore/mlx issue #3910, opened 24 Jul 2026

Two details make this worse than an ordinary hang. First, `SIGTERM` is never acted on: the interpreter is blocked inside native code, so your process manager's polite shutdown does nothing. Second, the `SIGKILL` that follows leaves Metal and RDMA wired pages held by the kernel — which on macOS means a reboot to reclaim them.

A live capture with `sample` found **1156 of 1304 samples** parked inside `MeshImpl::recv`, while the main thread sat in `Event::wait` underneath `mlx::core::eval`.

Peer Dies Mid-Collective — The Loop That Never Exits

<svg viewBox="0 0 880 300" role="img" aria-label="Rank 0 polls the completion queue, which returns zero forever after Rank 1 is lost">
              <defs>
                <marker id="ah-red" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#DC2626"></path>
                </marker>
                <marker id="ah-gray" viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#4B5563"></path>
                </marker>
                <path id="loopback" d="M 440 148 V 232 H 135 V 148" ></path>
              </defs>
              <text x="40" y="40" font-size="13" font-weight="600" fill="#4B5563"
                    font-family="ui-sans-serif, system-ui">Established Mesh · Traffic Flowing · Then A Cable Drops</text>
              <circle cx="440" cy="112" r="46" fill="none" stroke="#DC2626" stroke-width="2" opacity="0">
                <animate attributeName="r" values="46;86" dur="2.4s" repeatCount="indefinite"></animate>
                <animate attributeName="opacity" values="0.38;0" dur="2.4s" repeatCount="indefinite"></animate>
              </circle>
              <circle cx="440" cy="112" r="46" fill="none" stroke="#DC2626" stroke-width="2" opacity="0">
                <animate attributeName="r" values="46;86" dur="2.4s" begin="1.2s" repeatCount="indefinite"></animate>
                <animate attributeName="opacity" values="0.38;0" dur="2.4s" begin="1.2s" repeatCount="indefinite"></animate>
              </circle>
              <rect x="40" y="76" width="190" height="72" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="2"></rect>
              <text x="135" y="107" font-size="14" font-weight="700" fill="#FFFFFF" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">Rank 0</text>
              <text x="135" y="128" font-size="12" fill="#CBD5E1" text-anchor="middle"
                    font-family="ui-monospace, Menlo, monospace">StreamThread</text>
              <rect x="345" y="76" width="190" height="72" rx="10" fill="#FFFFFF" stroke="#DC2626" stroke-width="2"></rect>
              <text x="440" y="107" font-size="14" font-weight="700" fill="#111827" text-anchor="middle"
                    font-family="ui-monospace, Menlo, monospace">ibv_poll_cq</text>
              <text x="440" y="128" font-size="12" fill="#4B5563" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">Bare Passthrough</text>
              <rect x="650" y="76" width="190" height="72" rx="10" fill="#FEF2F2" stroke="#DC2626" stroke-width="2" stroke-dasharray="6 5"></rect>
              <text x="745" y="107" font-size="14" font-weight="700" fill="#111827" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">Rank 1</text>
              <text x="745" y="128" font-size="12" font-weight="600" fill="#DC2626" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">Peer Lost</text>
              <line x1="230" y1="112" x2="337" y2="112" stroke="#4B5563" stroke-width="2" marker-end="url(#ah-gray)"></line>
              <text x="283" y="104" font-size="12" font-weight="600" fill="#4B5563" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">Poll</text>
              <line x1="535" y1="112" x2="642" y2="112" stroke="#DC2626" stroke-width="2" stroke-dasharray="6 5" marker-end="url(#ah-red)"></line>
              <text x="588" y="104" font-size="12" font-weight="600" fill="#DC2626" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">No Reply</text>
              <path d="M 440 148 V 232 H 135 V 148" fill="none" stroke="#DC2626" stroke-width="2" marker-end="url(#ah-red)"></path>
              <text x="287" y="250" font-size="13" font-weight="600" fill="#DC2626" text-anchor="middle"
                    font-family="ui-sans-serif, system-ui">Returns 0 — in_flight Never Decrements</text>
              <circle r="5" fill="#DC2626">
                <animateMotion dur="2.6s" repeatCount="indefinite">
                  <mpath href="#loopback"></mpath>
                </animateMotion>
              </circle>
            </svg>

## 2 The Code

Here is the loop, verbatim. Six lines of it are the entire bug.

mlx/distributed/jaccl/lib/jaccl/mesh\_impl.h:513 C++

```bash
// Main loop
while (in_flight > 0) {
  // Poll the hardware for completions.
  ibv_wc wc[WC_NUM];
  int n = connections_[src].poll(WC_NUM, wc);
  for (int i = 0; i < n; i++) {
    in_flight--;
    /* ... copy out, maybe repost ... */
  }
}   // no deadline, no iteration bound, no liveness check
```

And `poll()` itself is a bare passthrough — there is no layer between this loop and the driver where a timeout could already be hiding:

mlx/distributed/jaccl/lib/jaccl/rdma.h:217 C++

```bash
int poll(int num_completions, ibv_wc* work_completions) {
  return ibv_poll_cq(completion_queue, num_completions, work_completions);
}
```

**The loop is structurally incapable of terminating.** `ibv_poll_cq` returns `0` when there is nothing to report. A dead peer reports nothing. `in_flight` therefore never decrements, and the exit condition is never evaluated to false. This is not a race or a timing window — it is unconditional.

## 3 Why The Obvious Fix Fails

The thread converged on checking error codes from the verbs layer. That is the natural instinct, and it is wrong here. A contributor instrumented the poll loop on two M4 Pro Mac minis direct-attached over Thunderbolt 5, killed rank 1, and measured what the driver actually said:

Two ranks in a tight `all_sum` loop, then `SIGKILL` on rank 1. The survivor … it reports **nothing**, so neither of the error-checking approaches under discussion can detect it. — reproduction on macOS 26.5.1, Thunderbolt 5

This is by design. JACCL uses **UC** — Unreliable Connection — which has no acknowledgement, no retransmission, and no QP-level timeout. That is exactly why it's fast. It also means the transport has no concept of "my peer is gone." There is no error to propagate, so there is no error to check.

**Consequence:** any fix that inspects a return value, an `errno`, or a work-completion status is inspecting a channel that stays silent. The signal has to come from somewhere the transport doesn't control — and the only such signal available is elapsed time.

## 4 A Second Bug, Unreported

While reading the poll path I found a separate defect that nobody has filed. It is in the multi-connection `poll` helper:

mlx/distributed/jaccl/lib/jaccl/rdma.h:238 C++

```bash
int n = ibv_poll_cq(
    c.completion_queue,
    num_completions - completions,
    work_completions + completions);

completions += n;   // n is negative on error — never checked
```

`ibv_poll_cq` returns a _negative_ value on failure. Two things follow.

**One: another silent hang.** A negative `n` reaches the caller's `for (int i = 0; i < n; i++)`, which simply doesn't execute. `in_flight` never decrements. You get the identical forever-spin, this time from a genuine hardware error rather than a dead peer.

**Two: a memory-safety bug.** On the next iteration of that loop, `completions` is negative, so `work_completions + completions` points _before_ the caller's stack array, and `num_completions - completions` grows larger than the buffer. That is an out-of-bounds write handed straight to the driver.

**This is independent of #3910** and deserves its own issue and its own patch. It needs a two-line guard, not a design discussion. Bundling it into the timeout work would bury a memory-safety fix inside a feature PR.

## 5 Blast Radius: Six Loops, Not One

The issue title names `MeshImpl::recv`. But the same unbounded pattern appears six times in the same header — and the reporter's own stack trace was in `all_reduce`, not `recv`. Patching the named function would have left the actual reported path broken.

| Location | Collective | Why It Matters |
| --- | --- | --- |
| mesh_impl.h:89 / 135 | all_reduce | Hot path Every training step and every tensor-parallel token |
| mesh_impl.h:197 | all_reduce drain | Pipeline flush after the main loop |
| mesh_impl.h:245 | all_gather | Weight and activation collection |
| mesh_impl.h:345 | reduce_scatter | Large-message all_reduce path (> 32 KB) |
| mesh_impl.h:468 | send | Point-to-point |
| mesh_impl.h:513 | recv | Named in issue The one everyone is looking at |

<aside class="callout"><strong class="callout__title">Note on the large-message path.</strong><div class="callout__body"><code class="inl">all_reduce</code> switches to
          reduce-scatter-plus-all-gather above 32 KB with more than two ranks. So a four-node cluster
          moving real tensors hits <em>two</em> of these loops per collective, not one.</div></aside>

## 6 What Downstream Built To Survive It

The strongest evidence that this matters is not the issue thread. It is that a shipping project independently rediscovered the bug and wrote a whole subsystem to work around it.

**oMLX** is an Apple Silicon inference server with multi-Mac support. Its cluster package is 25,107 lines across 41 modules. One of those modules opens with this:

omlx/cluster/liveness.py Python · docstring

```bash
"""Notice when a peer Mac goes away, instead of waiting forever.

A collective has no timeout. If a peer sleeps, loses its cable, or its rank
dies, every surviving rank blocks inside the all-reduce and the deployment
hangs until someone kills it by hand — which is exactly what happened when a
Thunderbolt cable was unplugged mid-session.
"""
```

Their workaround is an out-of-band heartbeat: each rank writes a marker file with a timestamp, and a coordinator reads them over SSH, treating three missed intervals as death. It is careful, well-documented work — the docstring even states its own two structural limits rather than papering over them.

**But detection is not recovery.** The watchdog can tell you a peer died. It cannot unblock the thread already spinning inside native code. The documented behaviour is to tear the job down — fail-fast, not fail-over. That is the correct engineering choice, and it is also an admission that the problem cannot be solved from above.

The lesson generalises: **every project built on `mx.distributed` inherits this.** More stars does not buy a different transport.

## 7 The Fix That Works

If the transport is silent, elapsed time is the only signal left. A wall-clock deadline inside the spin loop, **reset on any progress**:

**Reset on progress, not at loop entry**

Any `n > 0` restarts the clock. A large multi-chunk transfer makes steady progress across many iterations; deadlining the whole operation would false-positive on exactly the big transfers the fast path exists for.

**Follow the existing env convention**

JACCL already reads paired variables — `JACCL_RANK` / `MLX_RANK`, `JACCL_COORDINATOR` / `MLX_JACCL_COORDINATOR`. A timeout knob should match that shape, not invent a new one.

**Pick the default carefully**

oMLX's first attempt used 45 seconds and turned a healthy idle cluster into a self-destruct timer. Too aggressive is worse than the hang, because it breaks working deployments.

**Verify the throw actually propagates**

The spin runs on `StreamThread`. Whether an exception there surfaces in Python through `mx.eval` or terminates the process is the open question. If it terminates, the fix converts a hang into a crash — better, but not what the issue asks for.

**Testable seam.** The deadline policy — construct, tick on progress, report expiry — has no verbs dependency. It can be extracted into a small header-only class and unit-tested on any machine, including Linux CI. Only the call-site integration needs real hardware. That split is what makes this fix reviewable.

## 8 Why Is This C++ And Not Go Or Rust?

Fair question, and the answer is visible in the build files rather than in anyone's taste.

| Constraint | Evidence In Repo | Effect |
| --- | --- | --- |
| Metal has no Apple-supplied Go/Rust binding | CMakeLists.txt:229 fetches metal-cpp; device.h:5 includes <Metal/Metal.hpp> | Apple's official C++ interface *is* the GPU surface. Zero `.mm` files in the tree. |
| libibverbs is a C API | rdma.h:5 includes <infiniband/verbs.h> | C++ calls it with zero marshalling; JACCL dlopens the symbols at runtime. |
| Python is the product | python/src/CMakeLists.txt:1 nanobind_add_module | nanobind is a C++ library. Arrays are zero-copy shared with NumPy's buffer protocol. |
| Sub-50 µs latency target | mesh_impl.h — tight ibv_poll_cq spin | Go's cgo transition per call plus GC pauses make this its worst case. |

Go is disqualified by the poll loop specifically. A tight loop calling into C thousands of times a second, on a latency budget measured in microseconds, is the scenario cgo handles worst.

**Rust is a genuinely reasonable alternative** — no GC, cheap C FFI, and it would plausibly have caught two real defects in this codebase: the `int16` overflow that silently corrupts long-context inference, and the negative-offset pointer arithmetic in section 4. Both are exactly what bounds checking and checked arithmetic exist for.

**But Rust would not have prevented this bug.** `while (in_flight > 0) { poll(); }` with no deadline compiles cleanly in Rust, in Go, in C++, in anything. There is no memory error, no data race, no undefined behaviour — just a loop whose exit condition depends on an event that will never arrive. **Language choice buys you memory safety. It does not buy you liveness.**

That is the uncomfortable part. The most damaging bug in MLX's distributed stack is the one class of bug that no borrow checker, no garbage collector, and no type system would have flagged.

## 9 What I Could Not Verify

This is a source read, not a reproduction. Being explicit about the boundary:

| Claim | Status |
| --- | --- |
| Six unbounded loops in `mesh_impl.h` | Verified read directly from source |
| `poll()` is a bare `ibv_poll_cq` passthrough | Verified rdma.h:217 |
| Negative `n` is unchecked at rdma.h:243 | Verified read directly from source |
| Verbs reports nothing on peer loss | Reported by a contributor's hardware repro, not by me |
| Whether a throw on `StreamThread` reaches Python | Unknown needs a real run |
| That a deadline fix actually resolves the hang | Untested needs two Macs with Thunderbolt RDMA |

<aside class="callout"><div class="callout__body">JACCL is gated to Darwin in <code class="inl">mlx/distributed/jaccl/CMakeLists.txt:2</code>. On a Linux
          workstation the code under discussion does not even compile, let alone run. Anyone proposing a patch
          here needs at minimum two Macs on a Thunderbolt link and the willingness to hard-kill a rank
          mid-collective — and to reboot afterwards.</div></aside>
