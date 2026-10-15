---
title: "How a Single VPN Misconfiguration Consumed 17 Terabytes in a Week"
date: 2026-04-08
description: "A deep dive into debugging a mysterious network spike in my home Kubernetes cluster"
tags: [networking, incident, debugging]
draft: false
---

*A deep dive into debugging a mysterious network spike in my home Kubernetes cluster*

---

**TL;DR:** My home k8s cluster consumed 1,668 GB in a single day. The culprit? When Tailscale's peer-to-peer connection failed between two nodes, traffic fell back to a relay server — and Kubernetes doesn't like that.

---

## The Alert That Started It All

It was a regular Sunday morning when I noticed something alarming on my ISP's data usage dashboard:

| Date | Usage |
|------|-------|
| Feb 20 | 82 GB |
| Feb 21 | 256 GB |
| **Feb 22** | **1,668 GB** |
| Feb 23 | 14 GB |

1.6 terabytes. In a single day. On my home internet connection.

My immediate thought: *"Something is very, very wrong."*

This is what my ISP's data-usage screen looked like that morning — 22 February towering over every other day:

![Phone screenshot of ISP data-usage bars for 17–23 February; every day stays under 260 GB except 22 February at 1,668.55 GB](/assets/blog/network-spike-investigation/network-spike-1.jpeg)

And the same screen scrolled right: after the 22 February spike, daily usage settles back down:

![Phone screenshot of ISP data-usage bars for 21–28 February; the 22 February spike followed by normal days under 31 GB](/assets/blog/network-spike-investigation/network-spike-2.jpeg)

---

## The Setup: A Homelab Kubernetes Cluster

Before diving into the investigation, here's my setup:

- **5-node Kubernetes cluster** (k0s v1.34.3)
  - 1 control plane node (Ubuntu server)
  - 2 Lima VMs (running on Mac Mini)
  - 1 Raspberry Pi 4
  - 1 Ubuntu workstation
- **Calico CNI** with VXLAN overlay networking
- **Tailscale** for secure mesh networking between nodes
- **Prometheus + Grafana** for monitoring

The nodes communicate using Tailscale's 100.x.x.x CGNAT addresses, creating a secure mesh VPN across my home network.

---

## The Investigation

### Step 1: Identify the Traffic Source

First stop: Prometheus. I queried network traffic by namespace:

```promql
sum(rate(container_network_transmit_bytes_total[1h])) by (namespace)
```

The result was clear: **kube-system** was the culprit, specifically:
- `calico-node-*` pods
- `kube-proxy-*` pods

But why would CNI traffic suddenly explode?

### Step 2: Narrow Down to Specific Nodes

```promql
topk(10, sum(rate(container_network_transmit_bytes_total[1h])) by (pod, namespace))
```

Two nodes stood out:
- `lima-mm0-k0s-ubuntu`: **7,757 GB** transmitted
- `lima-mm1-k0s-ubuntu`: **7,635 GB** transmitted

Both Lima VMs. Both running on the same Mac Mini. Together: **15+ TB in 24 hours**.

### Step 3: The "Aha" Moment — Tailscale

Then I ran the command that revealed everything:

```bash
$ tailscale status
```

```text
198.51.100.82    lima-mm0-k0s-ubuntu  active; direct 192.0.2.64:44340
198.51.100.104  lima-mm1-k0s-ubuntu  active; relay "blr"; offline ⚠️
198.51.100.32     raspberrypi          active; direct 192.0.2.118:41641
```

There it was: **`relay "blr"`**

One of my nodes wasn't using a direct peer-to-peer connection. It was routing through Tailscale's DERP relay server in Bengaluru, India.

---

## Understanding DERP: The Hidden Bandwidth Multiplier

Tailscale uses a protocol called DERP (Designated Encrypted Relay for Packets) as a fallback when direct connections fail.

### Normal Path (Direct P2P):
```text
Node A ←→ Node B (via LAN)
Latency: ~1ms
Traffic: Counted once
```

### DERP Relay Path:
```text
Node A → Upload → ISP → DERP Server → ISP → Download → Node B
Latency: ~28ms (14ms each direction)
Traffic: Counted 4x (upload + download, twice)
```

When my two Lima VMs couldn't establish a direct connection, **every single packet** between them traveled:
1. Out my ISP (upload)
2. To Bengaluru (DERP server)
3. Back to my ISP (download)
4. To the destination VM

For Kubernetes, which generates constant inter-node traffic (API calls, CNI overlay traffic, etcd sync, health checks), this is catastrophic.

---

## Why DERP Exists (And Why P2P Sometimes Fails)

You might wonder: if DERP is so bad for bandwidth, why does Tailscale use it at all?

**The answer: NAT traversal is hard.**

### The NAT Problem

```text
┌─────────────────────────────────────────────────────────────┐
│              WHY PEER-TO-PEER FAILS                         │
│                                                             │
│  Node A (Private IP)          Node B (Private IP)          │
│  ┌──────────────┐             ┌──────────────┐             │
│  │  203.0.113.5    │             │  203.0.113.8    │             │
│  └──────┬───────┘             └──────┬───────┘             │
│         │                            │                      │
│  ┌──────▼───────┐             ┌──────▼───────┐             │
│  │   NAT        │             │   NAT        │             │
│  │ (Symmetric)  │             │ (Symmetric)  │             │
│  └──────┬───────┘             └──────┬───────┘             │
│         │                            │                      │
│         └──────────── X ─────────────┘                      │
│                                                             │
│  Neither side can initiate! Both are behind NAT.           │
└─────────────────────────────────────────────────────────────┘
```

### Common Reasons P2P Fails

| Reason | What Happens |
|--------|--------------|
| **Symmetric NAT** | Router assigns different external ports per destination - hole punching fails |
| **Double NAT** | ISP's CGNAT + your home router = too many layers |
| **Firewalls** | Corporate networks blocking UDP 41641 |
| **VM NAT Layers** | My Lima VMs had: VM NAT → macOS → Router → ISP (4 layers!) |

### My Lima VM Network Path

```text
Lima VM (lima-mm1)
      │
      ▼
Lima's Virtual Network (NAT layer 1)
      │
      ▼
macOS Host Network (NAT layer 2)
      │
      ▼
Home Router (NAT layer 3)
      │
      ▼
ISP (possibly CGNAT - NAT layer 4)
```

Four NAT layers. No wonder P2P failed.

### How to Check Your NAT Type

```bash
$ tailscale netcheck

* UDP: true
* MappingVariesByDestIP: false  ← Good (not symmetric NAT)
* MappingVariesByDestIP: true   ← Bad (symmetric NAT, P2P will struggle)
```

### Fixing P2P for Lima/VMs

The solution for my Lima VMs was switching from NAT to **bridged networking**:

```yaml
# ~/.lima/<vm-name>/lima.yaml
networks:
  - lima: bridged
    interface: "en0"  # Mac's network interface
```

This gives the VM a real LAN IP, eliminating the VM NAT layers.

**Key insight for your homelab:** If you see `relay` in `tailscale status` for nodes on the same LAN, something is misconfigured. LAN nodes should **always** connect directly.

---

## The Cascade Effect

Here's what happened:

```text
┌─────────────────────────────────────────────────────────┐
│             THE INCIDENT FEEDBACK LOOP                  │
│                                                         │
│  Tailscale P2P     →    DERP Relay     →   +28ms       │
│     Failure              Fallback         Latency      │
│        ↑                                     ↓         │
│        │                                     │         │
│   More Traffic    ←    Calico VXLAN    ←   Kubelet    │
│                         Resync             Timeout     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

1. **Tailscale P2P failed** → Traffic routes through DERP
2. **DERP adds ~28ms latency** → Kubelet health checks timeout
3. **Node appears NotReady** → Calico tears down VXLAN tunnels
4. **Node recovers** → Calico rebuilds tunnels (lots of traffic)
5. **Traffic goes through DERP** → Bandwidth explodes
6. **Repeat**

The two Lima VMs were in a constant dance of connecting and disconnecting, each cycle generating gigabytes of CNI synchronization traffic — all routed through the internet.

---

## The Evidence

### Tailscale Interface Traffic During the Spike

| Time (UTC) | lima-mm0 | lima-mm1 |
|------------|----------|----------|
| 17:30 | 22 Mbps | 20 Mbps |
| 18:00 | 92 Mbps | 90 Mbps |
| **18:30** | **141 Mbps** | **141 Mbps** |
| 19:00 | 141 Mbps | 141 Mbps |
| 20:00 | 121 Mbps | 120 Mbps |

Notice how the traffic is **perfectly mirrored** between both nodes — classic bidirectional relay traffic.

### 7-Day Totals via Tailscale Interface

| Node | Traffic | Connection Type |
|------|---------|-----------------|
| lima-mm1-k0s-ubuntu | **8.65 TB** | DERP Relay |
| lima-mm0-k0s-ubuntu | **8.94 TB** | Direct (now) |
| cylon (control plane) | 1.48 TB | Direct |
| raspberrypi | 0.01 TB | Direct |

**17.6 TB** from just two nodes. The nodes with direct connections? Under 2 TB combined.

---

## The Fix

### Immediate: Restore Direct Connectivity

```bash
# On the problematic node
tailscale down && tailscale up

# Verify direct connection
tailscale status | grep lima
# Should show "direct" not "relay"

# Force P2P connection attempt
tailscale ping --c 10 198.51.100.82
# Watch for "via DERP" vs "direct"
```

### Long-term: Prevent Future DERP Fallback

**1. Fix VM Networking (for Lima/VirtualBox/etc.)**

Switch from NAT to bridged networking:
```yaml
# Lima VM config
networks:
  - lima: bridged
    interface: "en0"
```

**2. Open Firewall Ports**

Ensure UDP 41641 is open between all nodes:
```bash
sudo ufw allow 41641/udp
```

**3. Monitor Connection Types**

Add a simple check to your monitoring:
```bash
# Alert if any node is using relay
tailscale status --json | jq '.Peer | to_entries[] | 
  select(.value.Relay != "") | 
  {name: .value.HostName, relay: .value.Relay}'
```

**4. Verify NAT Type**

Run on all nodes to identify problematic NATs:
```bash
tailscale netcheck | grep -E "UDP|Mapping"
# "MappingVariesByDestIP: true" = symmetric NAT = P2P problems
```

**5. Consider Disabling DERP (Nuclear Option)**

```bash
# WARNING: Nodes will be unreachable if P2P fails
tailscale up --derp=false
```

Only do this if you're 100% sure all nodes can always reach each other directly.

### Prometheus Alert for Future Detection

```yaml
- alert: TailscaleHighTraffic
  expr: rate(node_network_transmit_bytes_total{device="tailscale0"}[5m]) > 52428800
  for: 10m
  annotations:
    summary: "High Tailscale traffic - possible DERP relay"
```

---

## Lessons Learned

### 1. VPN Relay Fallback is a Silent Killer

DERP relay is designed to "just work" when direct connections fail. But for bandwidth-intensive applications like Kubernetes, "just working" can mean thousands of dollars in bandwidth bills (or angry ISP throttling).

**The insidious part:** Tailscale doesn't alert you when it falls back to DERP. It just works — expensively.

### 2. Kubernetes + Overlay Networks + VPN = Triple Encapsulation

My traffic path was:
```text
App → Pod Network → Calico VXLAN → Tailscale WireGuard → DERP Relay → Internet
```

Each layer adds overhead. When the VPN goes to relay mode, you're sending encapsulated, encrypted, tunneled traffic across the internet. Twice.

### 3. Monitor Your Network Interfaces, Not Just Pods

I had Prometheus monitoring container network traffic, but the smoking gun was in:
```promql
rate(node_network_transmit_bytes_total{device="tailscale0"}[5m])
```

The `tailscale0` interface traffic correlated perfectly with the spikes.

### 4. Node Flapping Has Exponential Costs

A flapping node doesn't just affect its own workloads. Every state transition triggers:
- CNI route recalculation
- Service endpoint updates  
- Pod rescheduling attempts
- etcd replication

When that traffic routes through a relay? Boom. Terabytes.

### 5. VMs Add Hidden NAT Layers

My Lima VMs had four NAT layers between them and the internet:
```text
VM NAT → macOS NAT → Router NAT → ISP CGNAT
```

Each layer makes P2P hole-punching harder. For Kubernetes nodes, always use **bridged networking** for VMs, not NAT.

### 6. "It Works" Isn't Good Enough

Tailscale's DERP relay meant connectivity "worked" — my nodes could reach each other. But at 140 Mbps through my ISP instead of 1 Gbps on my LAN.

**Always verify connection types:**
```bash
tailscale status | grep -E "direct|relay"
```

If you see "relay" for LAN nodes, you have a problem waiting to explode.

---

## Monitoring Commands Cheat Sheet

```bash
# Check Tailscale connection types
tailscale status

# Find nodes using relay
tailscale status --json | jq '.Peer | to_entries[] | 
  select(.value.Relay != "") | 
  {name: .value.HostName, relay: .value.Relay}'

# Network connectivity check
tailscale netcheck

# Test specific peer connectivity
tailscale ping <tailscale-ip>
```

---

## Conclusion

What looked like a runaway container or DDoS attack turned out to be a simple VPN misconfiguration. Two VMs couldn't talk directly, so Tailscale did what it's designed to do: route traffic through a relay. 

The problem? Kubernetes generates *a lot* of inter-node traffic, and nobody expects their CNI overlay to route through Bengaluru.

**Key takeaway:** If you're running Kubernetes over Tailscale (or any mesh VPN), monitor your connection types. A single node falling back to relay can cascade into terabytes of unexpected traffic.

---

*Have you experienced similar issues with VPN overlays and Kubernetes? I'd love to hear your war stories in the comments.*

---

### Tools Used in This Investigation

- **Prometheus** - Metrics collection and querying
- **Tailscale** - Mesh VPN
- **Calico** - Kubernetes CNI
- **k0s** - Lightweight Kubernetes distribution

### Tags

`#kubernetes` `#sre` `#devops` `#tailscale` `#networking` `#homelab` `#incident-response`

---

*Originally published: March 2026*
