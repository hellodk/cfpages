---
title: "typhoon Was Strangling Itself — WiFi Power-Save & the CPU Governor Trap on a k0s Worker"
date: 2026-06-28
description: "A k0s worker node's pods were stuck ContainerCreating and its CPU 'spiked too soon'. The real culprits weren't load — they were WiFi power-save (10% packet loss) starving the Calico CNI and a powersave governor pinning all cores at 800MHz. Full diagnosis, the fix script, and before/after evidence."
tags: [kubernetes, k0s, calico, networking]
cover: "assets/images/covers/typhoon-wifi-cpu-powersave.svg"
draft: false
---

How WiFi power-save and a CPU governor — not load — wedged a k0s worker node · 2026-06-28

#kubernetes #k0s #calico-cni #wifi-powersave #cpu-governor #packet-loss #containerd #root-cause #homelab

## The Symptom

### "The network is slow and the CPU spikes too soon"

The report on `typhoon` — an x86 k0s worker in the cluster — was two-pronged: networking felt slow, and CPU appeared to spike instantly under the lightest load. Classic symptoms of an overloaded box. Except **typhoon wasn't overloaded at all.** Both complaints traced back to a single theme: aggressive power saving.

Node CPU2%231m of 8 cores — idle

Node Memory16%5.2 / 31 GiB used

Pods stuck11ContainerCreating / Init

<aside class="callout"><strong class="callout__title">The paradox:</strong><div class="callout__body">the metrics said the node was almost completely idle, yet eleven pods were wedged in
    <code>ContainerCreating</code> and <code>Init</code>, and any workload "spiked" CPU immediately. Idle nodes don't behave
    like that — unless something is artificially throttling them.</div></aside>

## What we actually saw

```bash
# kubectl get pods -A -o wide --field-selector spec.nodeName=typhoon
calico-node-24fs9                 0/1   Init:0/1            ...
kube-proxy-mdjqs                  0/1   ContainerCreating   ...
coredns-b8c4c78fd-hrvj8           0/1   ContainerCreating   ...
konnectivity-agent-87zqp          0/1   ContainerCreating   ...
traefik-5786797b56-442m2          0/1   ContainerCreating   ...
kube-prometheus-stack-grafana...  0/3   Init:0/2            ...
# ...and the CNI was screaming in the events:
plugin type="calico" failed (add): Get "https://10.96.0.1:443/.../ippools":
        dial tcp 10.96.0.1:443: connect: network is unreachable
Failed to create pod sandbox: rpc error: code = DeadlineExceeded
```

Two failure signatures dominated: network is unreachable to the Kubernetes API service IP, and DeadlineExceeded on pod-sandbox creation. Both are _timeout_ signatures — the hallmark of a lossy link, not a busy CPU.

## The Hunt

### Following the evidence, not the hunch

The "slow + spiky" framing pointed at resource exhaustion. The data immediately contradicted that, so we worked the node from the inside out.

## Step 1 — Confirm it's not load

```bash
# on typhoon
$ uptime
 20:35:59 up 11:43,  3 users,  load average: 0.24, 0.21, 0.33
$ vmstat 1
 r  b   ... us sy id wa st
 2  0   ...  4  2 93  0  0      # 93% idle, 0% iowait
$ free -h
Mem:  31Gi  used 2.6Gi  avail 28Gi
```

Load 0.24 on 8 cores. Zero iowait. 28 GiB free. There is **no compute, memory, or disk bottleneck.** Whatever is wrong is about _reachability and clock speed_, not capacity.

## Step 2 — Ask how the node reaches the cluster

The CNI error said `10.96.0.1` (the API `Service` VIP) was _unreachable_. So: which interface carries cluster traffic?

```bash
$ ip route get 10.96.0.1
10.96.0.1 via 192.0.2.254 dev wlp5s0 src 192.0.2.52

$ ip -br addr
enp3s0   DOWN            # wired NIC — unplugged
wlp5s0   UP   192.0.2.52  # cluster traffic rides WiFi
```

<aside class="callout"><strong class="callout__title">First domino:</strong><div class="callout__body">the wired NIC <code>enp3s0</code> is down. Every byte
    of cluster traffic — including Calico's synchronous API calls during pod setup — goes over <code>wlp5s0</code>, a
    <strong>WiFi</strong> adapter.</div></aside>

## Step 3 — Measure the WiFi, and check the clock

```bash
$ ping -c 20 192.0.2.10
20 transmitted, 18 received, 10% packet loss

$ iwconfig wlp5s0
Bit Rate=433.3 Mb/s   Power Management:on

$ cat .../cpu0/cpufreq/scaling_governor   # x8
powersave
$ cat .../scaling_cur_freq   .../scaling_max_freq
800105            3400000     # pinned at 0.8 of 3.4 GHz
```

Two smoking guns in one screen: WiFi **power management is on** with **10% packet loss**, and the CPU governor is **powersave**, locking all 8 cores to their 800 MHz floor. Two independent power-saving features, two independent symptoms.

## Root Cause A · WiFi

### Root Cause A — WiFi power-save starves the CNI

A Kubernetes node on WiFi is already living dangerously. Add radio power-save and you get intermittent packet loss exactly when the control plane needs a reliable round-trip.

The power-save cascadefailing

<svg viewBox="0 0 900 300" role="img" aria-label="Animated cascade from WiFi power-save to wedged pods">
      <defs>
        <marker id="arrA" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#9aa3b2"></path>
        </marker>
        <linearGradient id="boxred" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff"></stop><stop offset="1" stop-color="#fef2f2"></stop>
        </linearGradient>
      </defs>
      <g font-family="-apple-system,sans-serif">
        <rect x="20" y="120" width="150" height="62" rx="9" fill="url(#boxred)" stroke="#e5e7eb"></rect>
        <text x="95" y="146" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">WiFi radio</text>
        <text x="95" y="165" text-anchor="middle" font-size="11" fill="#b91c1c">power_save: ON</text>
        <circle cx="95" cy="100" r="6" fill="#dc2626">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"></animate>
          <animate attributeName="r" values="5;9;5" dur="1.4s" repeatCount="indefinite"></animate>
        </circle>
        <text x="95" y="86" text-anchor="middle" font-size="9.5" fill="#6b7280">sleeps between beacons</text>
        <line x1="170" y1="151" x2="205" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrA)"></line>
        <rect x="210" y="120" width="150" height="62" rx="9" fill="url(#boxred)" stroke="#e5e7eb"></rect>
        <text x="285" y="146" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">~10% packet loss</text>
        <text x="285" y="165" text-anchor="middle" font-size="11" fill="#b91c1c">RTT spikes to 200ms</text>
        <line x1="360" y1="151" x2="395" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrA)"></line>
        <rect x="400" y="120" width="160" height="62" rx="9" fill="url(#boxred)" stroke="#e5e7eb"></rect>
        <text x="480" y="143" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Calico CNI call</text>
        <text x="480" y="160" text-anchor="middle" font-size="10" fill="#b91c1c">GET 10.96.0.1:443</text>
        <text x="480" y="174" text-anchor="middle" font-size="10" fill="#b91c1c">network unreachable</text>
        <line x1="560" y1="151" x2="595" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrA)"></line>
        <rect x="600" y="120" width="150" height="62" rx="9" fill="url(#boxred)" stroke="#e5e7eb"></rect>
        <text x="675" y="146" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Pod sandbox</text>
        <text x="675" y="165" text-anchor="middle" font-size="11" fill="#b91c1c">DeadlineExceeded</text>
        <line x1="750" y1="151" x2="785" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrA)"></line>
        <rect x="788" y="120" width="92" height="62" rx="9" fill="#fee2e2" stroke="#fca5a5"></rect>
        <text x="834" y="143" text-anchor="middle" font-size="11.5" font-weight="700" fill="#991b1b">Pods</text>
        <text x="834" y="160" text-anchor="middle" font-size="10" fill="#991b1b">stuck +</text>
        <text x="834" y="173" text-anchor="middle" font-size="10" fill="#991b1b">retry loop</text>
        <circle r="5" fill="#2563eb">
          <animate attributeName="cx" values="95;285" dur="1.6s" repeatCount="indefinite"></animate>
          <animate attributeName="cy" values="200;200;230" keyTimes="0;0.7;1" dur="1.6s" repeatCount="indefinite"></animate>
          <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="1.6s" repeatCount="indefinite"></animate>
        </circle>
        <text x="190" y="255" text-anchor="middle" font-size="9.5" fill="#9ca3af">packet dropped &#8595;</text>
        <path d="M810,182 C760,250 540,250 480,184" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#arrA)">
          <animate attributeName="stroke-dashoffset" values="0;-14" dur="0.6s" repeatCount="indefinite"></animate>
        </path>
        <text x="645" y="245" text-anchor="middle" font-size="9.5" fill="#b45309">kubelet retries &#8594; "sandbox name reserved" loop</text>
      </g>
    </svg>

## Why power-save is uniquely toxic for a CNI

Calico's CNI plugin makes a **synchronous** call to the API server (via the `10.96.0.1` Service VIP) every single time a pod sandbox is created or destroyed. When the WiFi radio is asleep or a packet is dropped, that call returns `network is unreachable` or simply never completes — and containerd's sandbox operation hits `DeadlineExceeded`.

kubelet then retries, but the half-built sandbox is still registered, producing the tell-tale spam:

```bash
FailedCreatePodSandBox: failed to reserve sandbox name
   "coredns-...": name is reserved for "<previous-attempt-id>"
```

That "name is reserved" loop is not corruption — it's the _retry storm_ of a node that can never finish a single network setup. Image pulls suffered the same fate: the events showed pulls taking 16m–21m or dying on `TLS handshake timeout`.

## Root Cause B · CPU

### Root Cause B — the governor makes CPU "spike too soon"

The node was idle, yet the user saw CPU "spike instantly." That's not a load problem — it's a frequency-scaling artifact. Under the `powersave` governor, the cores never leave their floor.

Same workload, two governors

<svg viewBox="0 0 900 320" role="img" aria-label="Animated comparison of powersave vs performance governor utilization">
      <g font-family="-apple-system,sans-serif">
        <text x="225" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">powersave &middot; 800 MHz</text>
        <rect x="120" y="60" width="210" height="200" rx="10" fill="#fff" stroke="#e5e7eb"></rect>
        <rect x="140" y="80" width="170" height="160" rx="6" fill="#f3f4f6"></rect>
        <rect x="140" y="240" width="170" height="0" rx="6" fill="#dc2626">
          <animate attributeName="height" values="0;160;160;0" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
          <animate attributeName="y"      values="240;80;80;240" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
        </rect>
        <text x="225" y="285" text-anchor="middle" font-size="12" fill="#b91c1c" font-weight="600">light task &#8594; 100% instantly</text>
        <text x="225" y="303" text-anchor="middle" font-size="10.5" fill="#6b7280">slow core saturates &amp; throttles</text>
        <text x="150" y="74" font-size="10" fill="#9ca3af">CPU%</text>
        <line x1="450" y1="55" x2="450" y2="300" stroke="#e5e7eb" stroke-dasharray="3 4"></line>
        <text x="675" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">performance &middot; 3.4 GHz</text>
        <rect x="570" y="60" width="210" height="200" rx="10" fill="#fff" stroke="#e5e7eb"></rect>
        <rect x="590" y="80" width="170" height="160" rx="6" fill="#f3f4f6"></rect>
        <rect x="590" y="240" width="170" height="0" rx="6" fill="#16a34a">
          <animate attributeName="height" values="0;40;40;0" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
          <animate attributeName="y"      values="240;200;200;240" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
        </rect>
        <text x="675" y="285" text-anchor="middle" font-size="12" fill="#15803d" font-weight="600">same task &#8594; ~25%</text>
        <text x="675" y="303" text-anchor="middle" font-size="10.5" fill="#6b7280">4&times; headroom, no false spike</text>
        <text x="600" y="74" font-size="10" fill="#9ca3af">CPU%</text>
        <text x="450" y="320" text-anchor="middle" font-size="10" fill="#9ca3af">&#9203; identical workload arrives at t=1s in both</text>
      </g>
    </svg>

<aside class="callout"><strong class="callout__title">The mechanism:</strong><div class="callout__body">at 800&nbsp;MHz a single core has ~&frac14; the throughput it does at 3.4&nbsp;GHz.
    A trivial task that should sit at ~25% utilization instead saturates the slow core to 100% almost instantly — so
    every dashboard shows CPU "spiking too soon." The governor was lying to the metrics.</div></aside>

## Why was it on `powersave`?

This is the Linux default on many desktop/mini-PC platforms (and anything that booted without a tuned profile). It's great for a laptop on battery and terrible for a 24/7 cluster node, where you want the silicon to ramp to full clock the instant work arrives.

## The Fix

### The fix — one idempotent, persistent script

Ethernet wasn't an option, so the brief was: make WiFi behave and stop throttling the CPU, in a way that survives reboots. The script (`fix-typhoon.sh`, archived beside this post) does three things.

1 · WiFi

### Kill radio power-save

Runtime via `iw`/`iwconfig`, persisted in NetworkManager (`wifi.powersave = 2`) plus a boot-time systemd unit as a belt-and-suspenders.

2 · CPU

### Pin governor to performance

Write `performance` to every core now, and a `cpu-performance.service` systemd unit re-applies it on every boot — no extra packages required.

3 · Recover

### Un-wedge the pods

Force-delete the stuck `kube-system` pods so the DaemonSets/Deployments rebuild cleanly on the now-healthy network.

## The core of fix-typhoon.sh

```bash
# 1 — WiFi power-save OFF (runtime + persistent)
iw dev wlp5s0 set power_save off
cat >/etc/NetworkManager/conf.d/wifi-powersave-off.conf <<'EOF'
[connection]
wifi.powersave = 2
EOF
nmcli connection modify "UP 72" 802-11-wireless.powersave 2

# 2 — CPU governor -> performance (runtime + persistent)
for g in /sys/devices/system/cpu/cpu[0-9]*/cpufreq/scaling_governor; do
  echo performance > "$g"
done
# + cpu-performance.service systemd unit (WantedBy=multi-user.target)
```

```bash
# 3 — kick the wedged pods (run from the control plane)
kubectl -n kube-system delete pod \
  calico-node-24fs9 kube-proxy-mdjqs coredns-b8c4c78fd-hrvj8 \
  konnectivity-agent-87zqp calico-kube-controllers-86cf48cf8f-jfp4z \
  --grace-period=0 --force
```

<aside class="callout"><strong class="callout__title">Why systemd units, not just sysfs writes?</strong><div class="callout__body">A bare <code>echo &gt; scaling_governor</code>
  evaporates on reboot, and NetworkManager can re-enable WiFi power-save when a connection re-activates. The units make
  both fixes stick.</div></aside>

## Verification

### Test again — what changed

Same probes, after the fix. The throttles are gone and the pod retry-storm is broken.

800 MHz→3.4 GHz

CPU clock (cpu0), governor now `performance` on all 8 cores

PM: on→PM: off

WiFi power management, signal `-48 dBm` (strong), link 62/70

timeouts→10–16 ms

TCP+TLS to API `192.0.2.10:6443`, 5/5 stable

## The metric that actually matters: real TCP, not ICMP

Residual ICMP ping still shows a few percent "loss" — but that's WiFi APs deprioritizing ICMP, a measurement artifact. The workload-relevant path is TCP/TLS handshakes (exactly what Calico and image pulls use), and it is now fast and rock-steady:

```bash
$ for i in 1..5; do curl -kso /dev/null -w \
   "connect=%{time_connect} tls=%{time_appconnect} total=%{time_total}\n" \
   https://192.0.2.10:6443/healthz; done
connect=0.0033 tls=0.0137 total=0.0166
connect=0.0017 tls=0.0092 total=0.0115
connect=0.0020 tls=0.0121 total=0.0156
connect=0.0020 tls=0.0077 total=0.0099
connect=0.0017 tls=0.0075 total=0.0100   # 0 failures
```

## Pods un-wedge and progress cleanly

After deleting the stuck pods, the new ones move forward with **no** `DeadlineExceeded` and **no** `network is unreachable` — the CNI calls now succeed:

```bash
calico-node-4ntcg  # events, post-fix
  Pulled   install-cni image already present
  Created  init container
  Started  init container          # ← sandbox setup SUCCEEDS now
  Pulling  calico-node:v3.32.0-0    # just downloading, not erroring
```

<aside class="callout"><strong class="callout__title">One honest caveat.</strong><div class="callout__body">The node was on k0s <code>v1.36.1</code> but only had <em>older</em> system
      images cached (calico-node <code>v3.29.7</code>, kube-proxy <code>v1.34/35</code>). Every system image now has to be
      pulled <em>fresh</em> — and watching containerd live, throughput to <code>quay.io</code>/<code>docker.io</code> is
      only ~1.6 Mbps. That's the <em>internet&rarr;registry</em> leg over WiFi+WAN, not the node config. Pre-fix those
      pulls timed out entirely; now they complete, just slowly.</div></aside>

## Raw evidence — watching containerd crawl

The cleanest proof that the bottleneck is now _pure bandwidth_ (not a stall or a config fault): sampling containerd's active downloads 5 seconds apart, layers grow by only ~1 MB while three others sit queued at `0B` behind containerd's default 3-concurrent-download limit.

```bash
$ k0s ctr -a /run/k0s/containerd.sock -n k8s.io content active   # t=0
REF                       SIZE
layer-sha256:b1badc6e...  15.73MB
layer-sha256:f68adc1d...  13.63MB
layer-sha256:5c7dc6a3...  20.97MB
layer-sha256:38b81130...  0B      # queued — waiting for a slot
layer-sha256:3997b183...  0B      # queued

$ sleep 5; k0s ctr ... content active                            # t=+5s
REF                       SIZE
layer-sha256:b1badc6e...  16.78MB   # +1.05 MB in 5s
layer-sha256:f68adc1d...  14.68MB   # +1.05 MB in 5s  => ~1.6 Mbps
layer-sha256:5c7dc6a3...  20.97MB   # parked, not finalizing
layer-sha256:38b81130...  0B      # still queued
```

<aside class="callout"><strong class="callout__title">~1.05 MB / 5s ≈ 1.6 Mbps</strong><div class="callout__body">on a link advertising 433 Mb/s. The radio is healthy
      (signal <code>-48 dBm</code>); the ceiling is the WAN&rarr;registry path. After <strong>22 minutes</strong>
      <code>calico-node</code> still hadn't finished a ~50&nbsp;MB image. This is why the next step isn't "wait" — it's
      to stop pulling heavy bytes over the air entirely.</div></aside>

## The actual remedy applied — side-load over the LAN

Rather than let WiFi grind, the system images were pulled on `cylon` (wired control-plane) and streamed straight into typhoon's containerd over the LAN — the same principle as a pull-through registry mirror, done by hand:

```bash
# on cylon (wired): fetch once, pipe into typhoon's containerd over LAN
k0s ctr images pull quay.io/k0sproject/calico-node:v3.32.0-0
k0s ctr images export - quay.io/k0sproject/calico-node:v3.32.0-0 \
  | ssh root@192.0.2.52 'k0s ctr -n k8s.io images import -'
```

LAN RTT is 1–4 ms with real throughput, so a transfer that crawled for 20+ minutes over WiFi finishes in seconds. The durable version of this is a **pull-through registry cache on cylon** referenced from every worker's `containerd` `hosts.toml` — so no worker ever pulls a heavy layer over the air again.

| Signal | Before | After |
| --- | --- | --- |
| CPU governor / clock | powersave / 800 MHz | performance / 3.4 GHz |
| WiFi power management | on | off (persistent) |
| API TCP+TLS latency | timeout / unreachable | 10–16 ms, 0 fail |
| Pod sandbox creation | DeadlineExceeded loop | succeeds |
| Image pulls (WiFi→WAN) | 16–21 min / TLS timeout | ~1.6 Mbps, didn't converge |
| Image pulls (side-load via LAN) | — | 6 sys images in ~80s |
| kube-system pods on typhoon | stuck 22+ min | all 1/1 Running |

<aside class="callout"><strong class="callout__title">Outcome.</strong><div class="callout__body">Side-loading the six <code>quay.io/k0sproject/*</code> system images from cylon over the
    LAN took <strong>~80 seconds total</strong> (vs. 22+ minutes of non-converging WiFi pulls). After a pod restart,
    <code>calico-node</code>, <code>kube-proxy</code>, <code>coredns</code>, <code>konnectivity-agent</code> and
    <code>calico-kube-controllers</code> all went <code>1/1 Running</code> — the node is fully healthy. Workload images
    (node-exporter, kube-state-metrics, grafana, traefik) were side-loaded the same way.</div></aside>

## Lessons

### Lessons & takeaways

## 1\. "Slow + CPU spikes" is not always load

The node was 93% idle. When metrics and symptoms disagree, trust the metrics and ask _what is artificially capping the resource_ — here, two power-saving features were the cap.

## 2\. `powersave` governor ≠ low usage; it means "spikes too soon"

Pinning cores to their floor makes light work look like saturation. For 24/7 nodes, set `performance` (or `schedutil` with a sane floor) and make it persistent.

## 3\. WiFi + CNI is a trap; power-save makes it a crater

Calico's per-pod synchronous API calls cannot tolerate a radio that naps. If a node _must_ run on WiFi, `wifi.powersave = 2` is mandatory, not optional.

## 4\. Read past ICMP loss

APs deprioritize ICMP, so ping can lie. Measure the protocol your workload actually uses — TCP connect/TLS time told the true story (10–16 ms, zero failures).

## 5\. Next step: a LAN registry mirror

The only remaining slowness is fresh image pulls over the WAN. Standing up a pull-through cache on the wired control plane removes the WiFi from the heavy-bytes path entirely.

<aside class="callout"><strong class="callout__title">Net result:</strong><div class="callout__body">CPU throttle removed, WiFi power-save eliminated, the
  CNI sandbox retry-storm broken, and pods recovering — all from a single reboot-safe script. No hardware changes, no
  ethernet required.</div></aside>
