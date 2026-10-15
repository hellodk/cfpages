---
title: "21 — LaunchDaemons Keep the Thunderbolt Ring Up: IP + MTU That Survive Link Flaps"
date: 2026-08-09
description: "Every Thunderbolt link re-negotiation — the peer Mac falling asleep, a cable event, an OS network reset — silently reverted en2 to link-local addressing and MTU 1500. Traffic to the peer then leaked out the LAN gateway to a router, and the tensor-parallel ring died. Here is the idempotent"
tags: [macos, networking]
draft: false
---

21 of 21 · network plumbing

Every Thunderbolt link re-negotiation — the peer Mac falling asleep, a cable event, an OS network reset — silently reverted `en2` to link-local addressing and MTU 1500. Traffic to the peer then leaked out the LAN gateway to a router, and the tensor-parallel ring died. Here is the idempotent LaunchDaemon that re-applies `192.0.2.221/.2` and the 8000-byte jumbo MTU every 20 seconds, the break-and-restore test that proved it, and why it matters for the numbers behind it.

## 1The symptom: a router answered our rank1 address

The ring runs on 192.0.2.220/16 over a direct Thunderbolt cable. One afternoon the cluster went healthy → dead while nothing was being touched:

-   `ssh 192.0.2.222` suddenly said **REMOTE HOST IDENTIFICATION HAS CHANGED** — `ssh-keyscan` returned `dropbear_2020.81`: an OpenWrt router, not the Mac mini.
-   `ping 192.0.2.222` worked but at **12–25 ms**, not the ~0.5 ms the cable gives.
-   `route -n get 192.0.2.222` showed `interface: en1, gateway: 192.0.2.254` — the LAN default route had swallowed the Thunderbolt subnet.
-   `ifconfig en2` showed only `169.254.x.x` (link-local). The manual `192.0.2.221` was gone.

Diagnosis in one line: **the peer Mac slept, the Thunderbolt link re-negotiated, and macOS reverted `en2` to auto-configuration**, dropping the statically-assigned ring address and route. The rank1 IP that was supposed to be one hop across a cable was now being answered by whatever LAN device sat at `192.0.2.222`.

!

Thunderbolt has **no Wake-on-LAN**. If a node sleeps, the cable stays dark. Apple’s own RDMA-over-Thunderbolt guide explicitly tells you to disable idle sleep on cluster nodes — but even with sleep off, link events still occur and still reset the interface.

## 2Why a manual `ifconfig` is not enough

The ring address and MTU were being applied by hand:

```bash
sudo ifconfig en2 inet 192.0.2.221 netmask 255.255.0.0 alias
sudo ifconfig en2 mtu 8000
```

That works — until the next link event. The two classic persistence options each fall short here:

| Option | What it does | Why it’s not enough |
| --- | --- | --- |
| `networksetup -setmanual` | Writes the address into the network service config so it survives reboots. | Persists across reboots but not across *link re-negotiation mid-session*, which is exactly when we saw it drop; and the MTU path for Thunderbolt services is fiddly. |
| Manual `ifconfig` | Applies address + MTU immediately. | Zero persistence; lost on the first flap. |

A LaunchDaemon is the intersection: it runs as root on every boot _and_ on a short poll, so a dropped address is restored within seconds — no matter what caused the drop.

## 3The fix: one idempotent script, one plist

The script only acts when the desired state is missing, so a 20-second poll costs nothing when everything is already correct.

### 3.1 `/usr/local/bin/tb4-up.sh`

```bash
#!/bin/zsh
# tb4-up.sh — persist the Thunderbolt ring addressing + MTU across link flaps.
#   rank0:  en2 192.0.2.221 255.255.0.0 8000
#   rank1:  en2 192.0.2.222 255.255.0.0 8000
IFACE="${1:-en2}"; IP="${2:-192.0.2.221}"; MASK="${3:-255.255.0.0}"; MTU="${4:-8000}"
LOG=/var/log/tb4-up.log
now() { /bin/date '+%Y-%m-%dT%H:%M:%S%z'; }

# --- IP alias: add only if not already present ---
if ! /sbin/ifconfig "$IFACE" 2>/dev/null | /usr/bin/grep -q "inet $IP "; then
  /sbin/ifconfig "$IFACE" inet "$IP" netmask "$MASK" alias \
    && echo "$(now) added $IP/$MASK on $IFACE" >> "$LOG" \
    || echo "$(now) FAILED to add $IP on $IFACE (link down?)" >> "$LOG"
fi

# --- MTU: set only if it differs ---
cur=$(/sbin/ifconfig "$IFACE" 2>/dev/null | /usr/bin/awk '/^[a-zA-Z0-9]+: /{print $4}')
if [ -n "$cur" ] && [ "$cur" != "$MTU" ]; then
  /sbin/ifconfig "$IFACE" mtu "$MTU" \
    && echo "$(now) set mtu $MTU on $IFACE (was $cur)" >> "$LOG" \
    || echo "$(now) FAILED to set mtu $MTU on $IFACE" >> "$LOG"
fi
```

### 3.2 `/Library/LaunchDaemons/com.hydra.tb4.plist`

```bash
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>         <string>com.hydra.tb4</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/tb4-up.sh</string>
    <string>en2</string>                  <!-- rank1 plist: 192.0.2.222 -->
    <string>192.0.2.221</string>
    <string>255.255.0.0</string>
    <string>8000</string>
  </array>
  <key>RunAtLoad</key>    <true/>
  <key>StartInterval</key><integer>20</integer>
  <key>StandardOutPath</key>  <string>/var/log/tb4-up.log</string>
  <key>StandardErrorPath</key>  <string>/var/log/tb4-up.log</string>
</dict>
</plist>
```

### 3.3 Install & load (rank0; rank1 uses `192.0.2.222`)

```bash
sudo cp cluster/tb4-up.sh /usr/local/bin/tb4-up.sh
sudo chmod 755 /usr/local/bin/tb4-up.sh
sudo cp com.hydra.tb4.plist /Library/LaunchDaemons/com.hydra.tb4.plist
sudo chown root:wheel /Library/LaunchDaemons/com.hydra.tb4.plist
sudo chmod 644 /Library/LaunchDaemons/com.hydra.tb4.plist
sudo launchctl bootstrap system /Library/LaunchDaemons/com.hydra.tb4.plist
sudo launchctl print system/com.hydra.tb4   # verify state = active
```

## 4The restore loop, one picture

LaunchDaemons run as root, so the script needs no `sudo`. Every 20 seconds it compares the live interface against the desired state and only writes when they differ.

com.hydra.tb4 · poll → diff → act → log · 20s cadence

<svg viewBox="0 0 820 300" role="img" aria-label="LaunchDaemon restore loop">
      <g font-family="inherit">
        <text class="label" x="18" y="22">launchd (system domain, root)</text>
        <line x1="20" y1="28" x2="800" y2="28" stroke="#c7cbd9" stroke-width="1" stroke-dasharray="3 3"></line>
        <rect class="dbox" x="20" y="48" width="180" height="54"></rect>
        <text class="bigname" x="30" y="68">tb4-up.sh</text>
        <text class="label" x="30" y="84">StartInterval = 20s</text>
        <text class="label" x="30" y="96">RunAtLoad</text>
        <rect class="dbox" x="300" y="48" width="200" height="54"></rect>
        <text class="bigname" x="310" y="68">diff vs desired</text>
        <text class="label" x="310" y="84">inet 192.0.2.221 present?</text>
        <text class="label" x="310" y="96">mtu == 8000?</text>
        <rect class="dbox" x="600" y="48" width="200" height="54"></rect>
        <text class="bigname" x="610" y="68">ifconfig en2</text>
        <text class="label" x="610" y="84">add alias / set mtu</text>
        <text class="label" x="610" y="96">only when state differs</text>
        <path class="dflow" d="M200 75 H300" marker-end="url(#arrow)"></path>
        <path class="dflow" d="M500 75 H600" marker-end="url(#arrow)"></path>
        <path class="dflow green" d="M700 102 V150 H360 V102" marker-end="url(#arrowGreen)"></path>
        <text class="label" x="430" y="182">loop every 20s</text>
        <rect class="dbox" x="20" y="210" width="400" height="60" stroke="#0f766e"></rect>
        <text class="bigname" x="30" y="232">en2 (Thunderbolt ring)</text>
        <text class="label" x="30" y="250">inet 192.0.2.221 + 169.254 link-local</text>
        <text class="label" x="30" y="262">mtu 8000 &middot; route via en2, ~0.5 ms RTT</text>
        <path class="dflow amber" d="M420 240 H600" marker-end="url(#arrowAmber)"></path>
        <text class="label" x="460" y="232">broken by link flap</text>
        <rect class="dbox" x="20" y="150" width="180" height="46"></rect>
        <text class="bigname" x="30" y="168">/var/log/tb4-up.log</text>
        <text class="label" x="30" y="184">added IP / set mtu</text>
        <path class="dflow dash" d="M620 102 V180 H200" marker-end="url(#arrow)"></path>
      </g>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#818cf8"></path></marker>
        <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0f766e"></path></marker>
        <marker id="arrowAmber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="#d97706"></path></marker>
      </defs>
    </svg>

## 5Proof: break it, watch it heal

Rather than trusting the config, we deliberately destroyed the state and let the daemon restore it. From the log file, unedited:

```bash
# rank0: removed the IP alias and dropped the MTU to 1500
$ sudo ifconfig en2 inet 192.0.2.221 -alias && sudo ifconfig en2 mtu 1500
$ sleep 25   # one StartInterval + margin

# 25 seconds later — both restored, and the log shows why
en2: flags=8863<UP,BROADCAST,SMART,RUNNING,SIMPLEX,MULTICAST> mtu 8000
    inet 169.254.164.93 netmask 0xffff0000 broadcast 169.254.255.255
    inet 192.0.2.221 netmask 0xffff0000 broadcast 192.0.2.225

$ sudo cat /var/log/tb4-up.log
2026-08-09T19:27:06+0530 added 192.0.2.221/255.255.0.0 on en2
2026-08-09T19:27:06+0530 set mtu 8000 on en2 (was 1500)

# rank1: same test, MTU only
2026-08-09T19:28:06+0530 set mtu 8000 on en2 (was 1500)
```

✓

Both nodes now self-heal within one 20-second interval. The route to `192.0.2.222` stays on `en2`, the LAN router never sees the ring traffic, and `hw1` telemetry stays green.

## 6Why the MTU matters at all

The 8000-byte MTU isn’t decoration — it’s the jumbo-frame setting from the TB4-vs-Ethernet benchmark. On the same ring, same workload, same day:

| concurrency | throughput MTU 1500 | throughput MTU 8000 | Δ | total p50 |
| --- | --- | --- | --- | --- |
| conc8 | 29.0 tok/s | 29.7 tok/s | +2.4% | 20.62 → 20.17s |
| **conc16** | **43.2 tok/s** | **46.5 tok/s** | **+7.6%** | **28.43 → 26.83s** |

Jumbo frames help where the ring is bandwidth-bound: fewer packets per all-reduce means less per-packet CPU and fewer interrupts. The gain is small at low concurrency and meaningful at the head of the curve.

i

The physical path MTU is ~8180 bytes, not 9000 — `mtu 9000` is accepted by `ifconfig` but silently drops 9000-byte frames. 8000 is a safe margin below the real ceiling.

## 7Operational notes and gotchas

-   **Interface identity.** The script hardcodes `en2`. Confirm it matches `networksetup -listallhardwareports` on each box — if the cable moves to another Thunderbolt port, the interface (and plist argument) changes.
-   **Primary vs alias.** On rank0 the ring IP is an _alias_ beside the link-local address; the script re-adds it with `alias`. On rank1 the ring IP is the primary `inet`; the idempotency check skips it when present, so the same script works on both.
-   **Wake-on-LAN is a myth on Thunderbolt.** The daemon cannot revive a sleeping peer — it only fixes the local side. Disable idle sleep on cluster nodes, or add wake scheduling.
-   **Logs.** Every action is appended to `/var/log/tb4-up.log`; failures are logged too (e.g. when the link is genuinely down), which makes forensics trivial.
-   **Reboot safety.** `RunAtLoad` re-applies the state on boot before the ring comes up, closing the gap the manual setup had.
