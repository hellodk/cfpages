---
title: "192.0.2.64 Kept Freezing After Login — the Trail Ended at a Port Collision on 16GB"
date: 2026-08-02
description: "Two Mac minis headed for Apple MLX distributed inference both froze after SSH login. The hunt crossed an mDNSResponder reverse-DNS stall, a WiFi wake-latency bug with a fix that only half-worked, a Thunderbolt/RDMA detour — and ended with two forgotten background inference servers squatting on the e"
tags: [macos, mlx, debugging, networking]
draft: false
---

The trail ended at a port collision on a 16GB Mac mini · 2026-08-02

#macos #ssh #mdnsresponder #wifi-powersave #apple-mlx #thunderbolt #distributed-inference #root-cause

## The Symptom

### Login, then nothing for a few seconds

Two Mac minis on the LAN, both slated to run Apple MLX distributed inference across a pair of machines. Passwordless SSH to both. And on both, the same complaint: _the terminal goes unresponsive right after login._ Same symptom, reported for both boxes — which turned out to be the first false lead. They didn't share a cause.

Host A192.0.2.5Mac mini M4 · 16GB · 3× TB4

Host B192.0.2.64Mac mini M2 · 8GB · 2× TB4

SymptomFrozenevery login, both hosts, a few seconds

<aside class="callout"><strong class="callout__title">The trap:</strong><div class="callout__body">one symptom, described identically for two machines, invites one diagnosis.
    Treating it as a single bug would have meant fixing whichever cause was found first and declaring
    victory — while the other host kept freezing for a completely unrelated reason.</div></aside>

## Why it mattered beyond SSH comfort

These two minis weren't just admin boxes — they were about to become the two nodes of an [MLX](https://github.com/ml-explore/mlx) distributed ring for running larger models than either machine could hold alone. A network that stalls for a few seconds on an interactive login is an annoyance. The same network stalling mid-tensor-sync is a broken training run. That's the thread this investigation eventually pulled.

## The Hunt

### Two hosts, in parallel, before touching anything

Rather than SSH into one box and start guessing, the first pass ran identical layered diagnostics against both hosts simultaneously — connection timing, PTY-allocated timing, verbose handshake logs, shell rc files, and `who`/`w` timing. The point wasn't speed, it was isolating _which layer_ each host was actually failing at before proposing anything.

## 192.0.2.5 — connects fine, then a black hole

```bash
$ time ssh dk@.5 'who; w'
(no output at all)
real    0m10.005s   # killed by my own timeout
```

Connection was instant. PTY allocation was instant. But `who` and `w` — anything that has to resolve a client IP — returned **zero output** before hitting a 10-second timeout.

## 192.0.2.64 — the first attempt just doesn't answer

```bash
$ for i in 1 2 3 4 5; do time ssh dk@.64 echo ok; done
attempt 1: Connection timed out   real 0m5.024s
attempt 2: ok                        real 0m0.464s
attempt 3: ok                        real 0m0.461s
```

No shell-level hang at all. The very first TCP connection attempt got **no response whatsoever**; every attempt after it was instant.

<aside class="callout"><div class="callout__body">Two completely different failure signatures at two completely different layers: <code>.5</code> hangs
    <em>after</em> authentication, inside a resolver call. <code>.64</code> never even completes the TCP
    handshake on a cold connection. Confirmed early: this needed two separate root causes, not one.</div></aside>

## RCA A · DNS Stall

### Root Cause A — a reverse DNS lookup with nowhere fast to go

`who`, `w`, and sshd's own login banner all resolve the client's IP to a hostname. On macOS that resolution runs through `mDNSResponder`, not a plain `/etc/resolv.conf` lookup — and `.5`'s resolver chain had nothing local to answer with.

Where the 8 seconds wentconfirmed

<svg viewBox="0 0 900 300" role="img" aria-label="Cascade from reverse DNS lookup to an 8 second terminal stall">
      <defs>
        <marker id="arrDns" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#9aa3b2"></path>
        </marker>
        <linearGradient id="boxRed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff"></stop><stop offset="1" stop-color="#fef2f2"></stop>
        </linearGradient>
      </defs>
      <g font-family="-apple-system,sans-serif">
        <rect x="15" y="120" width="145" height="62" rx="9" fill="url(#boxRed)" stroke="#e5e7eb"></rect>
        <text x="87" y="146" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">SSH Login</text>
        <text x="87" y="163" text-anchor="middle" font-size="10.5" fill="#b91c1c">who / w / banner</text>
        <line x1="160" y1="151" x2="195" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrDns)"></line>
        <rect x="200" y="120" width="160" height="62" rx="9" fill="url(#boxRed)" stroke="#e5e7eb"></rect>
        <text x="280" y="143" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">mDNSResponder</text>
        <text x="280" y="160" text-anchor="middle" font-size="10.5" fill="#b91c1c">local resolver</text>
        <text x="280" y="174" text-anchor="middle" font-size="10" fill="#b91c1c">reach: Not Reachable</text>
        <circle cx="280" cy="100" r="6" fill="#dc2626">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"></animate>
          <animate attributeName="r" values="5;9;5" dur="1.4s" repeatCount="indefinite"></animate>
        </circle>
        <text x="280" y="86" text-anchor="middle" font-size="9.5" fill="#6b7280">tried anyway, 5s timeout</text>
        <line x1="360" y1="151" x2="395" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrDns)"></line>
        <rect x="400" y="120" width="180" height="62" rx="9" fill="url(#boxRed)" stroke="#e5e7eb"></rect>
        <text x="490" y="143" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Public Resolvers</text>
        <text x="490" y="160" text-anchor="middle" font-size="10" fill="#b91c1c">Cloudflare + ISP, IPv6-only</text>
        <text x="490" y="174" text-anchor="middle" font-size="10" fill="#b91c1c">no 192.0.2.0/24 PTR zone</text>
        <line x1="580" y1="151" x2="615" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrDns)"></line>
        <rect x="620" y="120" width="130" height="62" rx="9" fill="url(#boxRed)" stroke="#e5e7eb"></rect>
        <text x="685" y="146" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">dscacheutil</text>
        <text x="685" y="165" text-anchor="middle" font-size="10.5" fill="#b91c1c">8.006s, no answer</text>
        <line x1="750" y1="151" x2="785" y2="151" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrDns)"></line>
        <rect x="788" y="120" width="97" height="62" rx="9" fill="#fee2e2" stroke="#fca5a5"></rect>
        <text x="836" y="143" text-anchor="middle" font-size="11.5" font-weight="700" fill="#991b1b">Terminal</text>
        <text x="836" y="160" text-anchor="middle" font-size="10" fill="#991b1b">reads as</text>
        <text x="836" y="173" text-anchor="middle" font-size="10" fill="#991b1b">frozen</text>
        <circle r="5" fill="#2563eb">
          <animate attributeName="cx" values="87;280;490;685;836" keyTimes="0;0.25;0.5;0.75;1" dur="3.2s" repeatCount="indefinite"></animate>
          <animate attributeName="cy" values="230" dur="3.2s" repeatCount="indefinite"></animate>
        </circle>
        <text x="450" y="250" text-anchor="middle" font-size="10.5" fill="#9ca3af">reverse lookup of the client IP, in flight</text>
        <path d="M280,182 C280,220 685,220 685,184" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="4 3">
          <animate attributeName="stroke-dashoffset" values="0;-14" dur="0.6s" repeatCount="indefinite"></animate>
        </path>
        <text x="480" y="270" text-anchor="middle" font-size="9.5" fill="#b45309">same dead end, every fresh lookup</text>
      </g>
    </svg>

## The confirming test: bypass macOS's resolver entirely

```bash
$ dig -x 192.0.2.10 +time=5 +tries=1   # straight to the nameserver
;; status: NXDOMAIN
;; Query time: 15 msec
```

A direct query got a fast, correct `NXDOMAIN` in 15 milliseconds. The network path was never the problem — it was specifically macOS's resolver chain, which tries the (unreachable) mDNS path first and only falls back to the public IPv6 resolvers after the mDNS timeout, and those public resolvers have no idea what `192.0.2.0/24` is either.

<aside class="callout"><strong class="callout__title">Honest caveat:</strong><div class="callout__body">this stall is cache-sensitive.
    Re-running the same lookup moments later returns instantly because mDNSResponder caches the miss —
    which is exactly why it reads as "sometimes it freezes" rather than "always." The fix (route LAN
    reverse lookups to the gateway, <code>192.0.2.254</code>, ahead of the public resolvers) was handed
    off as a <code>networksetup -setdnsservers</code> command rather than applied directly.</div></aside>

<aside class="callout"><strong class="callout__title">Revised, after the deeper pass in Tab 5:</strong><div class="callout__body">this DNS stall on <code>.5</code> was real
    and reproducible, but it turns out not to be the dominant explanation. A later round of packet-level
    and kernel-level testing found the same host also carries Apple's <code>MAGICWAKE</code> Wi-Fi
    power-save assertion and produces a near-identical decaying-latency signature on plain ICMP and raw
    TCP connects that never touch a resolver at all. The mDNS reverse-lookup stall looks like a real,
    secondary/compounding factor — the resolver genuinely is slow when it has nowhere to answer from —
    but the common root cause across <em>both</em> hosts turned out to be Wi-Fi client power-save, not
    DNS. See <strong>Tab 5 &middot; Latency Deep-Dive</strong> for the evidence.</div></aside>

## RCA B · WiFi Wake

### Root Cause B — and a fix that only half worked

`.64` had no DNS stall at all — every attempt after the first was instant. The problem was earlier: cold connections it just didn't answer. Along the way, the user mentioned `limactl`, `socket_vmnet`, and `tailscale` had been installed on both machines back in February and "probably" removed — worth checking before chasing anything else.

Still runningsocket\_vmnetroot daemon, active on .5

Half-removedtailscale pliston .64, wrong path guessed first

UntouchedNetworkExtensionTailscale.app remnant on .5

All three were cleaned up and both boxes rebooted. Neither the leftover VM networking tools nor the reboot changed the connection-timeout pattern on `.64` — a useful negative result that ruled out "stray virtual interface" as the cause.

## Catching it live, from the real client

All prior tests had run from the same box the user's own Ubuntu laptop uses — `192.0.2.10` — but in tight back-to-back loops that kept everything warm. Waiting for genuine idle time and firing one real, timestamped `ssh -v` reproduced it outright:

```bash
07:47:12.271  Connecting to 192.0.2.64 [192.0.2.64] port 22.
07:47:18.272  connect to address 192.0.2.64 port 22: Connection timed out   # 6.0s later, hard failure
```

Immediate retry: fail, then instant, then instant — the exact pattern from the first pass, reproduced live from the real client this time.

Cold attempt vs. warm attempt, same command

<svg viewBox="0 0 900 320" role="img" aria-label="Bar comparison of a cold SSH connection attempt versus a warm one">
      <g font-family="-apple-system,sans-serif">
        <text x="225" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">Attempt 1 &middot; cold</text>
        <rect x="120" y="60" width="210" height="200" rx="10" fill="#fff" stroke="#e5e7eb"></rect>
        <rect x="140" y="80" width="170" height="160" rx="6" fill="#f3f4f6"></rect>
        <rect x="140" y="80" width="170" height="0" rx="6" fill="#dc2626">
          <animate attributeName="height" values="0;160;160;0" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
        </rect>
        <text x="225" y="285" text-anchor="middle" font-size="12" fill="#b91c1c" font-weight="600">6.009s &#8594; hard timeout</text>
        <text x="225" y="303" text-anchor="middle" font-size="10.5" fill="#6b7280">zero response, no SYN-ACK</text>
        <text x="150" y="74" font-size="10" fill="#9ca3af">wait time</text>
        <line x1="450" y1="55" x2="450" y2="300" stroke="#e5e7eb" stroke-dasharray="3 4"></line>
        <text x="675" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">Attempt 2 &middot; warm</text>
        <rect x="570" y="60" width="210" height="200" rx="10" fill="#fff" stroke="#e5e7eb"></rect>
        <rect x="590" y="80" width="170" height="160" rx="6" fill="#f3f4f6"></rect>
        <rect x="590" y="228" width="170" height="0" rx="6" fill="#16a34a">
          <animate attributeName="height" values="0;12;12;0" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
          <animate attributeName="y" values="240;228;228;240" keyTimes="0;0.25;0.85;1" dur="4s" repeatCount="indefinite"></animate>
        </rect>
        <text x="675" y="285" text-anchor="middle" font-size="12" fill="#15803d" font-weight="600">0.46s &#8594; instant</text>
        <text x="675" y="303" text-anchor="middle" font-size="10.5" fill="#6b7280">interface already awake</text>
        <text x="600" y="74" font-size="10" fill="#9ca3af">wait time</text>
        <text x="450" y="318" text-anchor="middle" font-size="10" fill="#9ca3af">same <code>ssh</code> command, seconds apart in the same retry loop</text>
      </g>
    </svg>

## The kernel-level evidence: MAGICWAKE

`pmset -g log` and `pmset -g assertions` on `.64` told a specific story: display sleep fires after 10 idle minutes, and only once an SSH session actually connects does `powerd` create a `NetworkClientActive` assertion that holds the interface awake. Before that assertion exists, both Wi-Fi interfaces carry a live kernel assertion:

```bash
Kernel Assertions: 0x100=MAGICWAKE
   id=538  ... description=en0 owner=en0
   id=541  ... description=en1 owner=IOSkywalkNetworkBSDClient   # en1 = WiFi, confirmed via networksetup
```

Wake-on-Wireless standby, needing a multi-second radio wake before the first packet after idle gets answered — matching the "fails once, then works" pattern exactly.

<aside class="callout"><strong class="callout__title">Updated: the root cause is now fully proven, not just plausible.</strong><div class="callout__body"><code>sudo pmset -a
    displaysleep 0; sudo pmset -a powernap 0</code> was applied and verified &mdash; <code>pmset -g</code>
    confirmed both settings took. But re-checking <code>pmset -g assertions</code> afterward showed the
    exact same <code>MAGICWAKE</code> assertions on <code>en0</code>/<code>en1</code>, unchanged, and the
    freeze persisted. At the time this read as "confirmed root cause, incomplete fix, left open." A much
    deeper pass since (Tab 5) settled it: <code>.5</code> was independently found to <em>already</em> have
    <code>displaysleep 0</code>, <code>powernap 0</code>, and even <code>SleepDisabled 1</code> set, and
    still produced a clean, measured 1.4-second wake stall with the same <code>MAGICWAKE</code>
    assertion &mdash; direct proof that <code>pmset</code> display/system-sleep settings never controlled
    this behavior at all. It lives entirely in the Wi-Fi driver's 802.11 client power-save state
    (<code>MAGICWAKE</code>/Wake-on-Wireless), independent of macOS system power management, and it's the
    same mechanism on <em>both</em> hosts. No software fix exists on this macOS build, but a mitigation
    (a keepalive ping every 30s) is now deployed on both machines. Full evidence in
    <strong>Tab 5 &middot; Latency Deep-Dive</strong>.</div></aside>

## Latency Deep-Dive

### The real, common root cause: Wi-Fi client power-save

Both prior root causes were real, but neither was the whole story. A deeper pass — extended ICMP bursts, DNS-free raw TCP connects, PHY/signal captures, and kernel assertion dumps, run against both hosts and the gateway at the same time — found one mechanism common to both machines: Apple's `MAGICWAKE` Wake-on-Wireless / 802.11 client power-save state. This tab is the evidence trail and the mitigation that's now actually deployed.

Gateway .2541.86msavg · max 16.9ms · 0 outliers >20ms

.644.6msavg · max 193ms · 1 isolated blip

.539.0msavg · max 1377ms · 7-packet decay

## 150-ping burst, three destinations, same client, same moment

All three targets — the gateway (`192.0.2.254`), `.64`, and `.5` — sit on the same 5GHz/80MHz AP, channel 60. 150 pings at 0.2s intervals, 0% packet loss on all three. The gateway's clean trace rules out the AP/channel itself; the shape of the other two traces is the tell.

Same client, same moment, three very different tracesconfirmed

<svg viewBox="0 0 900 340" role="img" aria-label="Ping latency comparison across gateway, .64, and .5 showing a clean baseline, one isolated blip, and a seven-packet decay">
      <g font-family="-apple-system,sans-serif">
        <line x1="312" y1="20" x2="312" y2="320" stroke="#e5e7eb" stroke-width="1.4" stroke-dasharray="3 4"></line>
        <line x1="607" y1="20" x2="607" y2="320" stroke="#e5e7eb" stroke-width="1.4" stroke-dasharray="3 4"></line>
        <text x="165" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">Gateway &middot; .254</text>
        <text x="165" y="50" text-anchor="middle" font-size="12" fill="#4b5563">shared channel 60 AP</text>
        <line x1="35" y1="250" x2="295" y2="250" stroke="#e5e7eb" stroke-width="1.4"></line>
        <rect x="55" y="238" width="22" height="12" rx="2" fill="#16a34a"></rect>
        <rect x="99" y="236" width="22" height="14" rx="2" fill="#16a34a"></rect>
        <rect x="143" y="240" width="22" height="10" rx="2" fill="#16a34a"></rect>
        <rect x="187" y="234" width="22" height="16" rx="2" fill="#16a34a"></rect>
        <rect x="231" y="239" width="22" height="11" rx="2" fill="#16a34a"></rect>
        <text x="165" y="268" text-anchor="middle" font-size="12" fill="#4b5563">150/150 received, 0% loss</text>
        <text x="165" y="286" text-anchor="middle" font-size="12" font-weight="700" fill="#15803d">avg 1.86ms &middot; max 16.9ms</text>
        <text x="165" y="304" text-anchor="middle" font-size="12" fill="#4b5563">0 outliers &gt;20ms &mdash; AP is healthy</text>
        <text x="460" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">.64</text>
        <text x="460" y="50" text-anchor="middle" font-size="12" fill="#4b5563">already warm going in</text>
        <line x1="330" y1="250" x2="590" y2="250" stroke="#e5e7eb" stroke-width="1.4"></line>
        <rect x="350" y="238" width="22" height="12" rx="2" fill="#16a34a"></rect>
        <rect x="388" y="236" width="22" height="14" rx="2" fill="#16a34a"></rect>
        <rect x="426" y="240" width="22" height="10" rx="2" fill="#16a34a"></rect>
        <rect x="464" y="100" width="22" height="150" rx="2" fill="#d97706"></rect>
        <text x="475" y="90" text-anchor="middle" font-size="12" font-weight="700" fill="#92400e">193ms</text>
        <rect x="502" y="239" width="22" height="11" rx="2" fill="#16a34a"></rect>
        <rect x="540" y="237" width="22" height="13" rx="2" fill="#16a34a"></rect>
        <text x="460" y="268" text-anchor="middle" font-size="12" fill="#4b5563">150/150 received, 0% loss</text>
        <text x="460" y="286" text-anchor="middle" font-size="12" font-weight="700" fill="#92400e">avg 4.6ms &middot; max 193ms</text>
        <text x="460" y="304" text-anchor="middle" font-size="12" fill="#4b5563">1 mid-stream blip &middot; seq 116</text>
        <text x="750" y="34" text-anchor="middle" font-size="13" font-weight="700" fill="#111827">.5</text>
        <text x="750" y="50" text-anchor="middle" font-size="12" fill="#4b5563">cold at test start</text>
        <line x1="615" y1="250" x2="875" y2="250" stroke="#e5e7eb" stroke-width="1.4"></line>
        <rect x="630" y="80" width="20" height="170" rx="2" fill="#dc2626"></rect>
        <text x="640" y="70" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b">1377ms</text>
        <rect x="654" y="105" width="20" height="145" rx="2" fill="#dc2626"></rect>
        <rect x="678" y="130" width="20" height="120" rx="2" fill="#dc2626"></rect>
        <rect x="702" y="155" width="20" height="95" rx="2" fill="#e0574a"></rect>
        <rect x="726" y="180" width="20" height="70" rx="2" fill="#e0574a"></rect>
        <rect x="750" y="204" width="20" height="46" rx="2" fill="#ec8377"></rect>
        <rect x="774" y="228" width="20" height="22" rx="2" fill="#ec8377"></rect>
        <rect x="798" y="241" width="20" height="9" rx="2" fill="#16a34a"></rect>
        <rect x="822" y="240" width="20" height="10" rx="2" fill="#16a34a"></rect>
        <rect x="846" y="242" width="20" height="8" rx="2" fill="#16a34a"></rect>
        <text x="750" y="268" text-anchor="middle" font-size="12" fill="#4b5563">150/150 received, 0% loss</text>
        <text x="750" y="286" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b">avg 39.0ms &middot; max 1377ms</text>
        <text x="750" y="304" text-anchor="middle" font-size="12" fill="#4b5563">7-pkt decay, then clean</text>
      </g>
    </svg>

## The decay, packet by packet

Seven packets caught behind a waking interface, draining in send order once the radio was up. The step size — roughly 205ms per packet — lands almost exactly on the 200ms send interval used. That's the signature of a queue draining, not RF interference and not random jitter.

| Seq | RTT | Δ vs prior |
| --- | --- | --- |
| 1 | 1377 ms | — |
| 2 | 1176 ms | −201 ms |
| 3 | 975 ms | −201 ms |
| 4 | 766 ms | −209 ms |
| 5 | 559 ms | −207 ms |
| 6 | 350 ms | −209 ms |
| 7 | 142 ms | −208 ms |
| 8–150 | <20 ms | clean — 143 packets |

## DNS-free proof: raw TCP connects by IP, no hostname involved

20 raw `/dev/tcp` connects straight to port 22 by IP — no resolver call at all — reproduce the exact same signature on `.5`, which rules out DNS as the mechanism for this specific delay.

```bash
$ for i in $(seq 1 20); do time (exec 3<>/dev/tcp/192.0.2.5/22) 2>&1; done
.5   attempt 1:      1.3792s
.5   attempts 2-20:  0.0069s – 0.0116s   # all fast, no resolver in the path

$ ...same loop against 192.0.2.64
.64  attempts 1-20:  0.0061s – 0.0141s   # uniform, already warm this run
```

## PHY / signal — both clean, rules out RF

| Metric | .5 | .64 |
| --- | --- | --- |
| RSSI | −51 to −52 dBm | −55 to −56 dBm |
| Noise | −94 dBm | −94 dBm |
| SNR | ~43 dB | ~39 dB |
| Tx Rate | 866 Mbps (MCS9) | 650–702 Mbps (MCS7) |
| CCA busy | 27% | 22% |
| Ierrs/Oerrs/Coll (en1) | 0 / 0 / 0 | 0 / 0 / 0 |

Strong signal, same AP/channel on both, zero driver-level errors. CCA 22–27% is moderate contention — microsecond-to-millisecond scale, nowhere near enough to explain a 1.3-second stall.

## Kernel proof: identical mechanism on both hosts

```bash
$ pmset -g assertions   # en1 on each host
.5:  Kernel Assertions: 0x104=USB,MAGICWAKE
     ... description=en1 owner=IOSkywalkNetworkBSDClient
.64: Kernel Assertions: 0x100=MAGICWAKE
     ... description=en1 owner=IOSkywalkNetworkBSDClient
```

Both Wi-Fi interfaces carry the same Wake-on-Wireless kernel assertion — not a coincidence, the same mechanism on both machines.

<aside class="callout"><strong class="callout__title">The pmset falsification.</strong><div class="callout__body"><code>.5</code> was checked for the first time in this pass
    and turns out to <em>already</em> have <code>displaysleep 0</code>, <code>powernap 0</code>, and even
    <code>SleepDisabled 1</code> (system sleep permanently disabled) &mdash; the exact settings applied to
    <code>.64</code> earlier as an attempted fix (Tab 4). Yet <code>.5</code> still carries the
    <code>MAGICWAKE</code> assertion and still produced the measured 1.4s wake stall above. Clean proof
    that <code>pmset</code> display/system-sleep settings never controlled this behavior at all &mdash;
    it lives in the Wi-Fi driver's 802.11 client power-save state, entirely independent of macOS system
    power management.</div></aside>

## `wdutil info` — no fix found, and a useful reframe

Run by the user directly, on both hosts (`sudo`, so not run by the assistant — strict no-sudo policy). Neither host's output contains a "Power Save" field at all — this macOS build (26.5.1) doesn't expose a controllable PSM toggle through this tool. `sudo wdutil dump` produced no stdout on either host and wasn't pursued further.

<aside class="callout"><strong class="callout__title">WIFI FAULTS LAST HOUR: None</strong><div class="callout__body">Both hosts report ,
    <strong>RECOVERIES: None</strong>, <strong>LINK TESTS: None</strong> &mdash; despite <code>.5</code>
    having just produced a real, measured 1.3s wake stall inside that same hour. macOS's own Wi-Fi
    diagnostics don't classify this as a fault. It's standard, expected 802.11 client power-save behavior,
    working as designed from Apple's perspective &mdash; not a hidden bug with an undiscovered off-switch,
    just standard behavior two always-on compute nodes don't want. The old <code>airport</code> CLI that
    used to allow disabling this was removed by Apple on Apple Silicon; <code>wdutil</code> needs sudo and
    doesn't expose the control anyway.</div></aside>

## Checked and ruled out: leftover limactl / socket\_vmnet / tailscale config

The user's own hypothesis, investigated directly: could a stray bridge or route left over from the removed VM networking tools be contributing?

-   The original `bridge100` reject route from `socket_vmnet` is completely gone from `netstat -rn` on both hosts post-cleanup+reboot — one clean default route via `en1` remains on each.
-   No orphaned vmnet/bridge/lima interfaces in `ifconfig -a` on either host.
-   `NetworkInterfaces.plist` (read directly, world-readable) shows only genuine hardware ports — zero orphaned virtual interface entries.
-   `net.inet.ip.forwarding` is `0` on both — never left enabled.
-   `scutil --proxy` shows only default macOS proxy exceptions, nothing injected by lima.

<aside class="callout"><strong class="callout__title">One genuine unresolved leftover:</strong><div class="callout__body"><code>com.apple.vmnet.plist</code> &mdash; Apple's own Vmnet framework state file, not
    <code>socket_vmnet</code>'s own file, so <code>brew uninstall socket_vmnet</code> never touches it
    &mdash; still exists, root-owned, on both hosts (13KB on .5, 18KB on .64). Couldn't be read without
    sudo, so its content and relevance are unverified. There's no established mechanism connecting VM
    NAT/DHCP lease bookkeeping to physical Wi-Fi radio power management, so this is reported as an honest
    gap, not a claimed cause.</div></aside>

**Verdict:** not supported by available evidence. `MAGICWAKE`/802.11 client power-save is standard, built-in Wi-Fi driver behavior on every Mac's `en1` — not something an app installs — and almost certainly predates the vmnet/lima/tailscale tools. The more likely (but unprovable — no historical logs reach back to February) explanation for "it used to work fine" is a change in usage pattern: these minis used to be touched more continuously, so the Wi-Fi interface rarely idled long enough to re-arm power-save. Becoming sparsely-touched headless compute nodes made the idle windows long enough for always-present behavior to start being noticed.

## The mitigation actually deployed — not a fix, a workaround

A non-sudo, user-level LaunchAgent on both hosts, pinging the gateway every 30 seconds so the interface never idles long enough to re-arm the wake penalty. Confirmed armed via `launchctl print` showing `run interval = 30 seconds`.

```bash
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.dk.wifi-keepalive</string>
  <key>ProgramArguments</key>
  <array><string>/sbin/ping</string><string>-c</string><string>1</string><string>192.0.2.254</string></array>
  <key>StartInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>/dev/null</string>
  <key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>
# deployed on both hosts:
$ launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dk.wifi-keepalive.plist
```

Two levers not yet pursued: shortening the AP's DTIM interval would reduce (not eliminate) the wake penalty at the source, if the user ever gets admin access to the router. Wired Ethernet isn't available for these specific machines right now — though both already have Ethernet as network-service priority #1, so it would take over automatically with zero config if ever connected.

<aside class="callout"><strong class="callout__title">Final verdict.</strong><div class="callout__body">One common root cause across both hosts, proven with packet-level and
    kernel-level evidence: macOS Wi-Fi client power-save (<code>MAGICWAKE</code>). Not two unrelated bugs.
    No confirmed software fix exists on this macOS build &mdash; the old <code>airport</code> toggle is
    gone on Apple Silicon and <code>wdutil</code> doesn't expose one. A keepalive mitigation is deployed
    and running on both machines today. The DNS stall on <code>.5</code> (Tab 3) was real but secondary;
    the leftover-vmnet-config hypothesis was checked and ruled out, bar one unread, unverified plist.</div></aside>

## Thunderbolt Detour

### A detour: can Thunderbolt do RDMA for MLX?

Mid-investigation, the actual point of these two machines came up: run Apple MLX distributed inference and training across both. Both minis carry Thunderbolt/USB4 ports — worth checking before cabling anything.

|  | 192.0.2.5 | 192.0.2.64 |
| --- | --- | --- |
| Model | Mac mini M4 (Mac16,10) | Mac mini M2 (Mac14,3) |
| Cores | 10 (4P + 6E) | 8 (4P + 4E) |
| Unified memory | 16 GB | 8 GB |
| Thunderbolt/USB4 | 3× ports, 40 Gb/s each | 2× ports, 40 Gb/s each |

<aside class="callout"><strong class="callout__title">No, Thunderbolt Bridge is not RDMA.</strong><div class="callout__body">macOS exposes it to the OS as a plain virtual
    Ethernet adapter &mdash; regular TCP/IP sockets ride on top, just at 40 Gb/s instead of shared WiFi
    bandwidth. There's no RoCE, no InfiniBand verbs, no kernel-bypass DMA exposed to userspace on macOS.
    MLX's <code>ring</code> distributed backend &mdash; built specifically for multi-Mac setups &mdash;
    uses exactly this: fast IP over a direct Thunderbolt link, not RDMA semantics.</div></aside>

Where MLX ring traffic runs, before and after

<svg viewBox="0 0 900 300" role="img" aria-label="Comparison of MLX traffic over shared WiFi versus a direct Thunderbolt link">
      <defs>
        <marker id="arrTb" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L9,4.5 L0,9 Z" fill="#9aa3b2"></path>
        </marker>
      </defs>
      <g font-family="-apple-system,sans-serif">
        <text x="225" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">Today &middot; Shared WiFi</text>
        <rect x="155" y="55" width="140" height="50" rx="9" fill="#fef2f2" stroke="#fca5a5"></rect>
        <text x="225" y="76" text-anchor="middle" font-size="11.5" font-weight="700" fill="#991b1b">WiFi Access Point</text>
        <text x="225" y="92" text-anchor="middle" font-size="9.5" fill="#b91c1c">shared with rest of LAN</text>
        <line x1="225" y1="105" x2="225" y2="140" stroke="#9aa3b2" stroke-width="2"></line>
        <line x1="145" y1="140" x2="305" y2="140" stroke="#9aa3b2" stroke-width="2"></line>
        <line x1="145" y1="140" x2="145" y2="168" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrTb)"></line>
        <line x1="305" y1="140" x2="305" y2="168" stroke="#9aa3b2" stroke-width="2" marker-end="url(#arrTb)"></line>
        <rect x="70" y="170" width="150" height="60" rx="9" fill="#fff" stroke="#e5e7eb"></rect>
        <text x="145" y="196" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">.5 &middot; M4</text>
        <text x="145" y="213" text-anchor="middle" font-size="10.5" fill="#4b5563">16GB</text>
        <rect x="230" y="170" width="150" height="60" rx="9" fill="#fff" stroke="#e5e7eb"></rect>
        <text x="305" y="196" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">.64 &middot; M2</text>
        <text x="305" y="213" text-anchor="middle" font-size="10.5" fill="#4b5563">8GB</text>
        <text x="225" y="260" text-anchor="middle" font-size="10.5" fill="#b91c1c">ring traffic shares the same radio that just froze</text>
        <line x1="450" y1="0" x2="450" y2="300" stroke="#e5e7eb" stroke-dasharray="3 4"></line>
        <text x="675" y="34" text-anchor="middle" font-size="14" font-weight="700" fill="#111827">Proposed &middot; Direct Thunderbolt</text>
        <rect x="500" y="170" width="150" height="60" rx="9" fill="#fff" stroke="#2563eb" stroke-width="1.6"></rect>
        <text x="575" y="196" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">.5 &middot; M4</text>
        <text x="575" y="213" text-anchor="middle" font-size="10.5" fill="#4b5563">192.0.2.201</text>
        <rect x="700" y="170" width="150" height="60" rx="9" fill="#fff" stroke="#2563eb" stroke-width="1.6"></rect>
        <text x="775" y="196" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">.64 &middot; M2</text>
        <text x="775" y="213" text-anchor="middle" font-size="10.5" fill="#4b5563">192.0.2.202</text>
        <line x1="650" y1="200" x2="700" y2="200" stroke="#2563eb" stroke-width="2.5"></line>
        <text x="675" y="185" text-anchor="middle" font-size="10.5" fill="#1E40AF" font-weight="600">TB4 &middot; 40 Gb/s</text>
        <circle r="4" fill="#2563eb">
          <animate attributeName="cx" values="650;700;650" dur="1.6s" repeatCount="indefinite"></animate>
          <animate attributeName="cy" values="200" dur="1.6s" repeatCount="indefinite"></animate>
        </circle>
        <text x="675" y="260" text-anchor="middle" font-size="10.5" fill="#15803d">no AP, no shared radio, no power-save wake</text>
      </g>
    </svg>

Setup is a static IP on each side, no coordination with any network team needed — the bridge is a private point-to-point link invisible outside these two machines:

```bash
# on .5
sudo networksetup -setmanual "Thunderbolt Bridge" 192.0.2.201 255.255.255.0
# on .64
sudo networksetup -setmanual "Thunderbolt Bridge" 192.0.2.202 255.255.255.0
```

## The Real Culprit

### The actual MLX run, and the error that changed everything

With the WiFi theory still open, the user ran the real thing: `mlx.launch --backend ring` across both minis, serving `Llama-3.1-8B-Instruct-8bit`. It connected, it fetched model metadata from HuggingFace on both nodes — and then broke, mid-session.

```json
[ring] Rank 1 connecting to 0
[ring] Attempt 0 waiting 1000 ms (error: 61)
[ring] Rank 0 accepting  # normal startup race, resolved by retry
...
2026-08-02 08:15:19 - HTTP Request: GET huggingface.co/.../revision/main "200 OK"   # both nodes, model loaded
...
[ring] Receiving from socket 10 failed with errno 54
[ring] Receiving from socket 10 failed with errno 54
[ring] Too many send/recv errors. Aborting...
[ring] Sending to socket 4 failed with errno 32
[ring] Too many send/recv errors. Aborting...
```

errno 61Refusedstartup race — harmless, self-resolves

errno 54Resetlive socket killed mid-session — the real fault

errno 32Broken Pipefallout from the peer's reset, not a separate cause

"It works and then stops and then works" was the description. Then, checking what else was already running on `.5` before this new job even started:

```bash
$ launchctl list | grep -i mlx
1462  0   com.hetu.vllm-mlx-embedding
1892  -6  com.hetu.vllm-mlx

# both already serving:
vllm-mlx serve embeddinggemma-300m-6bit  --host 0.0.0.0 --port 8080
vllm-mlx serve Qwen3.5-4B-MLX-8bit       --host 0.0.0.0 --port 8081 --continuous-batching
```

<aside class="callout"><strong class="callout__title">Port collision.</strong><div class="callout__body">The new <code>mlx_lm.server</code> was launched with
    <code>--port 8080</code> &mdash; the exact port a pre-existing, launchd-managed
    <code>vllm-mlx</code> embedding server was already <code>LISTEN</code>ing on, confirmed live via
    <code>lsof</code>. Two servers on the same port means the kernel arbitrates which one answers each
    incoming connection &mdash; a direct mechanism for "works, then a request goes to the wrong server,
    then works again."</div></aside>

16GB, three models, one port fought over twiceopen before fix

<svg viewBox="0 0 900 320" role="img" aria-label="Three models sharing 16GB of unified memory with a port collision between two of them">
      <g font-family="-apple-system,sans-serif">
        <text x="110" y="30" font-size="12.5" font-weight="700" fill="#111827">Host .5 &mdash; 16GB Unified Memory</text>
        <rect x="110" y="46" width="680" height="28" rx="4" fill="#f3f4f6" stroke="#e5e7eb"></rect>
        <rect x="110" y="46" width="13" height="28" fill="#93c5fd"></rect>
        <rect x="123" y="46" width="170" height="28" fill="#60a5fa"></rect>
        <rect x="293" y="46" width="340" height="28" fill="#2563eb"></rect>
        <text x="800" y="65" text-anchor="middle" font-size="10.5" fill="#6b7280">16GB</text>
        <text x="110" y="94" font-size="12" fill="#4b5563">77% committed to raw model weights alone &mdash; before KV-cache and runtime overhead</text>
        <rect x="60" y="130" width="220" height="74" rx="9" fill="#fff" stroke="#e5e7eb"></rect>
        <text x="170" y="158" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Embedding Gemma 300M</text>
        <text x="170" y="176" text-anchor="middle" font-size="10.5" fill="#4b5563">launchd &middot; already running</text>
        <text x="170" y="191" text-anchor="middle" font-size="10.5" fill="#b91c1c" font-weight="600">port 8080</text>
        <rect x="340" y="130" width="220" height="74" rx="9" fill="#fff" stroke="#e5e7eb"></rect>
        <text x="450" y="158" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Qwen3.5 4B</text>
        <text x="450" y="176" text-anchor="middle" font-size="10.5" fill="#4b5563">launchd &middot; already running</text>
        <text x="450" y="191" text-anchor="middle" font-size="10.5" fill="#4b5563" font-weight="600">port 8081</text>
        <rect x="620" y="130" width="220" height="74" rx="9" fill="#fff" stroke="#2563eb" stroke-width="1.6"></rect>
        <text x="730" y="158" text-anchor="middle" font-size="12.5" font-weight="700" fill="#111827">Llama 3.1 8B Instruct</text>
        <text x="730" y="176" text-anchor="middle" font-size="10.5" fill="#4b5563">mlx.launch &middot; just started</text>
        <text x="730" y="191" text-anchor="middle" font-size="10.5" fill="#b91c1c" font-weight="600">port 8080</text>
        <line x1="170" y1="204" x2="170" y2="235" stroke="#dc2626" stroke-width="1.6"></line>
        <line x1="730" y1="204" x2="730" y2="235" stroke="#dc2626" stroke-width="1.6"></line>
        <line x1="170" y1="235" x2="730" y2="235" stroke="#dc2626" stroke-width="1.6"></line>
        <circle cx="450" cy="235" r="6" fill="#dc2626">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite"></animate>
          <animate attributeName="r" values="5;10;5" dur="1.2s" repeatCount="indefinite"></animate>
        </circle>
        <circle r="4" fill="#2563eb">
          <animate attributeName="cx" values="170;450" dur="1.4s" repeatCount="indefinite"></animate>
          <animate attributeName="cy" values="235" dur="1.4s" repeatCount="indefinite"></animate>
        </circle>
        <circle r="4" fill="#2563eb">
          <animate attributeName="cx" values="730;450" dur="1.4s" repeatCount="indefinite"></animate>
          <animate attributeName="cy" values="235" dur="1.4s" repeatCount="indefinite"></animate>
        </circle>
        <text x="450" y="262" text-anchor="middle" font-size="12" font-weight="700" fill="#991b1b">SAME PORT &middot; 8080</text>
      </g>
    </svg>

Combined raw model weights — embeddinggemma (≈0.3GB) + Qwen3.5-4B-8bit (≈4GB) + Llama-3.1-8B-8bit (≈8GB) — land around 77% of `.5`'s 16GB unified memory, before any KV-cache growth or Metal/runtime overhead. On a machine where GPU and system RAM share one pool, that's enough pressure on its own to stall an active socket long enough to blow past the ring backend's timeout — independent of, and probably compounding, the still-open WiFi issue.

## The Fix

### Cleared the port, moved the plists, re-routed the ring

Two forgotten background services, stopped and archived rather than deleted — in case they were serving something else the user cared about.

```bash
$ launchctl bootout gui/$(id -u)/com.hetu.vllm-mlx-embedding
$ launchctl bootout gui/$(id -u)/com.hetu.vllm-mlx
$ mv ~/Library/LaunchAgents/com.hetu.vllm-mlx*.plist ~/Documents/

$ launchctl list | grep -i mlx        (empty)
$ lsof -iTCP -sTCP:LISTEN | grep -E "8080|8081"   (empty)
```

| Check | Before | After |
| --- | --- | --- |
| launchctl list | 2 hetu.vllm-mlx entries | none |
| Port 8080 | held by embedding server | free |
| Port 8081 | held by Qwen3.5 4B | free |
| Plist location | ~/Library/LaunchAgents (auto-loads) | ~/Documents (archived, inert) |

<aside class="callout"><strong class="callout__title">Recommended next step, not yet applied:</strong><div class="callout__body">point the MLX <code>device.json</code>
    hostfile at the Thunderbolt Bridge addresses (<code>192.0.2.201</code> / <code>.2</code>) instead of
    the WiFi IPs. That takes ring traffic off the still-unresolved flaky radio entirely, regardless of how
    the WiFi wake-latency bug eventually gets fixed.</div></aside>

## Lessons

### Lessons & open items

## 1\. One reported symptom can be two unrelated bugs

Running identical diagnostics on both hosts in parallel, before touching either, is what separated a DNS-resolver stall from a WiFi wake-latency bug. Fixing whichever was found first would have left the other host silently still broken.

## 2\. A reverse DNS lookup can freeze a macOS login

`who`, `w`, and sshd's own banner all resolve the client IP. With no LAN-aware DNS server configured, that resolution burns through a 5-second mDNS timeout before falling through to public resolvers that were never going to answer for a private address.

## 3\. Not every root cause gets a clean fix on the first try

`displaysleep 0` was correctly applied and verified, and the symptom persisted anyway. Reporting "confirmed root cause, incomplete fix" honestly is more useful than declaring victory on a setting that didn't actually change the kernel-level `MAGICWAKE` state.

## 4\. The most convincing lead isn't always the real one

Hours went into WiFi power management before a single `launchctl list | grep -i mlx` surfaced two forgotten inference servers sitting on the exact port, and a meaningful share of the RAM, the new job needed. Check what's already running before debugging what's new.

## 5\. Don't fight WiFi power-save for latency-sensitive traffic — route around it

MLX's ring backend needs a stable, low-latency link for tensor sync. Rather than keep chasing an unresolved kernel power-management bug, moving that specific traffic to a dedicated Thunderbolt Bridge sidesteps the problem entirely — 40 Gb/s, no access point, no radio to sleep.

## 6\. Two different-looking symptoms can still share one root cause

A resolver stall on `.5` and a dropped cold connection on `.64` read as two unrelated bugs, and Tab 2's parallel-diagnostics discipline correctly kept them separate at first. But a deeper cross-host pass (Tab 5) found the same `MAGICWAKE` kernel assertion and the same decaying-latency signature on both machines. Don't stop at the first plausible per-host explanation when a common-cause explanation fits the evidence better across hosts — run the same deep test against every affected host before closing the investigation.

<aside class="callout"><strong class="callout__title">Current state: mitigated, not fixed.</strong><div class="callout__body">The WiFi wake-latency root cause is now fully
    proven on both hosts &mdash; packet-level and kernel-level evidence, and <code>.5</code> independently
    falsifies the earlier pmset-based explanation (Tab 5). No confirmed software toggle exists on this
    macOS build to disable 802.11 client power-save; the old <code>airport</code> CLI is gone on Apple
    Silicon and <code>wdutil</code> doesn't expose one. A non-sudo keepalive LaunchAgent, pinging the
    gateway every 30 seconds, is deployed and running on both machines as a workaround. Wired Ethernet
    isn't an option for these specific machines right now. The MLX path has its own way around it via
    Thunderbolt Bridge (Tab 6), independent of whether the underlying Wi-Fi issue ever gets a real fix.</div></aside>
