---
title: "The 5.11 Tokens/Second Server"
date: 2026-09-22
description: "How an 18.5 GB MoE LLM was made usable on a 4 GB gaming laptop: measured 1.53 to 5.11 tokens/sec, then wrapped in rootless systemd supervision with restart backoff, log rotation and boot persistence. Real numbers, real config."
tags: [llm, inference, llama-cpp, systemd, linux]
cover: "assets/images/covers/llama-cpp-systemd.svg"
draft: false
---

An 18.5 GB MoE model on a mid-2020s gaming laptop is an exercise in honesty. The first launch asked the GPU for 11 GB it doesn't have. The CPU-only fallback produced a stutter at 1.53 tokens/sec. A mostly-ignored flag tripled it overnight — and then systemd kept it running. Every number here was measured on the machine, not promised by a README.

<div class="stat-cards">
<div class="stat-card"><span class="stat-card__n"></span><span class="stat-card__l">MiB VRAM requested by first launch — card has 4,096 MiB</span></div>
<div class="stat-card"><span class="stat-card__n"></span><span class="stat-card__l">decode speedup: 1.53 → 5.11 tok/s</span></div>
<div class="stat-card"><span class="stat-card__n"></span><span class="stat-card__l">tokens/sec decode, GPU-assisted config</span></div>
<div class="stat-card"><span class="stat-card__n"></span><span class="stat-card__l">tokens in a single agent-harness request — the real bottleneck</span></div>
</div>

## 01The Setup

The whole experiment happened on one machine and one machine only:

| Component | Value |
| --- | --- |
| CPU | Intel i7-12700H — 14 cores, 20 threads |
| RAM | 62 GiB (≈28 GiB free during runs) |
| GPU | NVIDIA RTX 3050 Ti Laptop — 4 GiB VRAM |
| LLM runtime | llama.cpp (official installer build, b11046) |
| Model | zai-org GLM-4.7-Flash Q4_K_M — 18.47 GB, 30B-A3B MoE |
| OS | Linux on bare metal, no root access for the operator |

The no-root constraint shapes everything downstream. The operator cannot write `/etc/systemd/journald.conf`, cannot add a system-level unit, cannot touch `logrotate.d`. So the supervision layer has to be _rootless by design_: user-level systemd units, logs in `~/logs`, rotation state in `~/.local/state`. That turned out to be a feature — every artifact stayed in one home directory, fully portable to another machine.

## 02The Incident

First launch ambition: put half the model's layers on the GPU. This is the command that looked right and wasn't:

```bash
llama serve -m GLM-4.7-Flash-Q4_K_M.gguf -c 32768 -ngl 30 --fit on
```

The very first log line after loading:

```bash
ggml_backend_cuda_buffer_type_alloc_buffer: allocating 11006.94 MiB on device 0: cudaMalloc failed: out of memory
```

What actually happened: with `-c 32768` and the default four slots, llama.cpp sizes one _unified KV cache_ for the total context (4 × 32k = 64k tokens) and wants it GPU-resident while layers are offloaded. That single buffer came to ≈11 GB — nearly three times the card's entire memory. Setting `-ngl 30` also made `--fit` abort (`n_gpu_layers already set by user`), so nothing was auto-sizing anything.

**Lesson one:** on a small VRAM card, total context × slots is a buffer you never committed to — and explicitly setting `-ngl` defeats the one flag that would have protected you from it.

## 03The Measurement

The sequence that produced real numbers (150-output-token decode, measured with a wall clock):

Attempt 1 — GPU offload, 32k ctx, 4 slots.

Died instantly. 11,006 MiB requested, 4,096 MiB present.

Attempt 2 — pure CPU, `-ngl 0`, 20 threads.

Decode 1.53 tok/s (655 ms/token). Prefill 12.5 tok/s. Technically serving, practically a slideshow.

Attempt 3 — `--fit on -fa on`, bounded context, GPU assistance.

Decode 5.11 tok/s. Prefill 14.3 tok/s. VRAM 2,765/4,096 MiB. The working config.

| Config | Prompt eval | Decode | Outcome |
| --- | --- | --- | --- |
| `-ngl 30 -c 32768 --parallel 4` | — | — | OOM, 11 GB buffer on 4 GB card |
| `-ngl 0`, 20 threads | 12.5 t/s | 1.53 t/s | serves, unusably slow |
| `--fit on -fa on -c 16384` | 14.3 t/s | **5.11 t/s** | best measured config |

Why did `--fit` help so much? It treats VRAM as a budget: it shrinks the KV buffer to fit the card, then auto-picks how many _attention_ layers live on the GPU while the MoE expert matmuls stay on CPU. Attention offload is exactly what decode-bound work wants on a hybrid setup — FlashAttention wins on the Ampere tensor cores, the 3 B active-parameter experts keep the CPU saturated. One flag bought 3.3× decode throughput, because the earlier failure was a memory-layout problem, not a compute problem.

The working pipeline

<svg viewBox="0 0 760 210" xmlns="http://www.w3.org/2000/svg">
        <g>
          <rect class="box" x="14" y="52" width="150" height="64" rx="8"></rect>
          <text x="89" y="80" text-anchor="middle" class="flow-title">GLM-4.7-Flash</text>
          <text x="89" y="97" text-anchor="middle" class="flow-label">18.47 GB Q4_K_M</text>
          <rect class="mainbox" x="224" y="52" width="170" height="64" rx="8"></rect>
          <text x="309" y="78" text-anchor="middle" fill="#FFFFFF" class="flow-title">llama serve</text>
          <text x="309" y="96" text-anchor="middle" fill="#9CA3AF" class="flow-label">--fit on, -fa on</text>
          <rect class="box" x="454" y="52" width="150" height="64" rx="8"></rect>
          <text x="529" y="80" text-anchor="middle" class="flow-title">systemd unit</text>
          <text x="529" y="97" text-anchor="middle" class="flow-label">supervise + restart</text>
          <rect class="box" x="664" y="52" width="84" height="64" rx="8"></rect>
          <text x="706" y="80" text-anchor="middle" class="flow-title">127.0.0.1</text>
          <text x="706" y="97" text-anchor="middle" class="flow-label">:11435</text>
          <line class="flow-line" x1="164" y1="84" x2="222" y2="84"></line>
          <polygon class="flow-arrow" points="222,79 234,84 222,89"></polygon>
          <line class="flow-line" x1="394" y1="84" x2="452" y2="84"></line>
          <polygon class="flow-arrow" points="452,79 464,84 452,89"></polygon>
          <line class="flow-line" x1="604" y1="84" x2="662" y2="84"></line>
          <polygon class="flow-arrow" points="662,79 674,84 662,89"></polygon>
        </g>
        <g>
          <rect class="box" x="14" y="168" width="150" height="40" rx="8"></rect>
          <text x="89" y="193" text-anchor="middle" class="flow-label">stdout / stderr</text>
          <rect class="box" x="224" y="168" width="170" height="40" rx="8"></rect>
          <text x="309" y="193" text-anchor="middle" class="flow-label">~/logs/llama-cpp.log</text>
          <rect class="mainbox" x="454" y="168" width="150" height="40" rx="8"></rect>
          <text x="529" y="185" text-anchor="middle" fill="#FFFFFF" class="flow-label">logrotate daily</text>
          <text x="529" y="199" text-anchor="middle" fill="#9CA3AF" class="flow-label">copytruncate + gzip</text>
          <rect class="box" x="664" y="168" width="84" height="40" rx="8"></rect>
          <text x="706" y="193" text-anchor="middle" class="flow-label">-20260922.gz</text>
          <line class="flow-line" x1="164" y1="188" x2="222" y2="188"></line>
          <polygon class="flow-arrow" points="222,183 234,188 222,193"></polygon>
          <line class="flow-line" x1="394" y1="188" x2="452" y2="188"></line>
          <polygon class="flow-arrow" points="452,183 464,188 452,193"></polygon>
          <line class="flow-line" x1="604" y1="188" x2="662" y2="188"></line>
          <polygon class="flow-arrow" points="662,183 674,188 662,193"></polygon>
        </g>
      </svg>

## 04The Unit

A process you start by hand is a process you forget to start. The ad-hoc `nohup` servers had already drifted twice — one died under a 20k-token request, another was silently gone. systemd turned "is it up?" into a property of the machine. Rootless, at `~/.config/systemd/user/llama-cpp.service`:

```json
[Unit]
Description=llama.cpp OpenAI-compatible server (GLM-4.7-Flash Q4_K_M)
Wants=local-fs.target network-online.target
After=local-fs.target network-online.target
StartLimitIntervalSec=300
StartLimitBurst=10

[Service]
Type=simple
ExecStartPre=%h/.local/bin/llama --version >/dev/null
ExecStartPre=/usr/bin/test -f %h/models/zai-org_GLM-4.7-Flash-Q4_K_M.gguf
ExecStart=%h/.local/bin/llama serve \
  -m %h/models/zai-org_GLM-4.7-Flash-Q4_K_M.gguf \
  -c 16384 --parallel 2 --fit on -fa on -t 20 \
  --repeat-penalty 1.0 --host 127.0.0.1 --port 11435
WorkingDirectory=%h
Nice=10
IOSchedulingClass=idle
OOMScoreAdjust=500
NoNewPrivileges=true
PrivateTmp=true
Restart=on-failure
RestartSec=5
StandardOutput=append:%h/logs/llama-cpp.log
StandardError=append:%h/logs/llama-cpp.log

[Install]
WantedBy=default.target
```

That is six automation strategies in one file — each one chosen in response to a real failure mode, not decoration:

| Directive | Failure it answers |
| --- | --- |
| `Restart=on-failure` | crash, OOM-kill or segfault → back up in 5 s |
| `StartLimitIntervalSec/Burst` | crash-loop: 10 starts in 300 s, then give up and stop failing loudly |
| `ExecStartPre` checks | fail with a clear message before running, not a confusing runtime stack |
| `Nice=10` + `IOSchedulingClass=idle` | decode is CPU-greedy; keep the desktop usable while generating |
| `OOMScoreAdjust=500` | if memory runs out, kill the model first — never the desktop |
| `StandardOutput append + parseable tags` | single log sink, no reinvented logging |

Readiness deserves a note. `systemctl is-active` returned `active` while the model was still loading — llama.cpp answers `/health` with `503` until it's warm. So the status check is not "is the unit active" but "does `/health` return 200". Active is "the process obeyed systemd"; ready is "I can serve a request". On a cold boot that gap is several seconds.

## 05Logs & Rotation

Logging choice was decided by an experiment: `journalctl --user --rotate` returned `Permission denied` — the journal daemon and its rotation are root-owned. So the honest rootless path is a plain file plus `logrotate` running as a user service, rotating in the user's own directories where nothing needs elevation.

```json
[Unit]
Description=Rotate llama-cpp logs with logrotate

[Service]
Type=oneshot
ExecStart=/usr/sbin/logrotate \
  --state %h/.local/state/logrotate/llama-cpp.state \
  %h/.config/logrotate/llama-cpp.conf
```

```bash
# ~/.config/logrotate/llama-cpp.conf
/home/dk/logs/llama-cpp.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    dateext
    su dk dk
}
```

Two details matter. **`copytruncate`** — llama.cpp keeps its file descriptor open and never reopens it, so the log must be copied and truncated in place rather than renamed. Without it the process keeps writing into the removed inode and the disk fills with a "deleted" file. **`dateext`** — archives keep the date in the name (`llama-cpp.log-20260922`), so "which file was today" is self-describing.

The rotation timer, wired to `timers.target` like the service:

```json
[Unit]
Description=Daily llama-cpp log rotation

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

## 06Automation Strategies

Pulling back from the config — these are the strategies carried out of this, in the order they earned their place:

nohup & log-tailing

→

systemd unit

<aside class="callout"><div class="callout__body">declarative supervision beats a shell background job you forgot to restart</div></aside>

crash

→

RestartSec=5

→

back up

<aside class="callout"><div class="callout__body">but bounded by the start-limit so a crash-loop cannot thrash the machine</div></aside>

GPU 4 GiB

→

\--fit

<aside class="callout"><div class="callout__body">let the runtime budget VRAM instead of hand-computing buffer sizes</div></aside>

stdout

→

~/logs/\*.log

→

.gz

<aside class="callout"><div class="callout__body">one sink, one rotator, dated archives, copytruncate for never-reopening fds</div></aside>

boot

→

enable-linger

<aside class="callout"><div class="callout__body">user units survive reboot with no login — no root, no /etc</div></aside>

is-active

→

/health 200

<aside class="callout"><div class="callout__body">readiness is an HTTP contract, not a process state</div></aside>

And one meta-strategy that disciplined all the others: **every claim on this page is a measurement taken on this laptop**. The 3.3× speedup, the 11 GB buffer, the `Permission denied` on journal rotation, the health code 503-while-loading — each was observed, not assume-d from a spec. When the misfit showed up in a number (1.53 tok/s), the design changed; the config did not get explained into compliance.

## 07The Honest Catch

**This server cannot run an agent tool-harness request.** The harness that motivated the whole build sends a single 20,860-token prompt (system persona + tool schemas + retrieval). At the measured ~80 ms/token CPU prefill, one such ask costs roughly 25 minutes before generation even starts. The laptop's real ceiling is chat-and-summary workloads with prompt budgets in the low thousands of tokens. Fixing it means shrinking the harness context, or a model with dense-attention prefill speed — both are future experiments, and neither changes that the unit, restart, and rotation stack now survives a month of restarts regardless.

What shipped, in one line: an 18.5 GB model that first asked for 11 GB it didn't have, now runs at a measured 5.11 tok/s under a rootless systemd unit that restarts itself in 5 seconds, bounds crash-loops at 10/300s, keeps the desktop responsive, and rotates a dated gzipped log every night at `~/logs`. The GPU said 4,096 MiB. The unit says try again.

hellodk · 22 Sep 2026 · systemd, llama.cpp, GLM-4.7-Flash, logrotate, rootless automation
