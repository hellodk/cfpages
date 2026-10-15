---
title: "LinkedIn Post - Network Spike Investigation"
date: 2026-03-01
description: "My home Kubernetes cluster consumed 1,668 GB in a single day."
tags: [networking, incident]
draft: true
---

---

## Short Version (for direct LinkedIn post)

---

**My home Kubernetes cluster consumed 1,668 GB in a single day.**

Here's what happened and what I learned:

I run a 5-node k8s cluster connected via Tailscale mesh VPN. One day, I noticed my ISP dashboard showing 1.6 TB of data usage. In 24 hours.

The investigation revealed a cascade of failures:

1️⃣ **Two nodes couldn't establish direct VPN connections**
   → Traffic fell back to Tailscale's DERP relay (via Bengaluru)

2️⃣ **DERP relay added ~28ms latency**
   → Kubelet health checks started timing out

3️⃣ **Nodes appeared as NotReady**
   → Calico CNI tore down and rebuilt VXLAN tunnels

4️⃣ **CNI resync traffic went through the relay**
   → Bandwidth exploded (4x multiplication through relay)

5️⃣ **Repeat** for hours

**The result:** 17.6 TB transmitted in 7 days from just 2 nodes.

**The fix:** Ensure direct peer-to-peer connectivity. One command:
```text
tailscale status | grep relay
```

If you see "relay" instead of "direct" — that's your problem.

---

**Key lessons:**

→ VPN relay fallback is a silent bandwidth killer
→ Kubernetes + overlay network + VPN = triple encapsulation overhead  
→ Monitor `tailscale0` interface, not just container traffic
→ Node flapping has exponential costs when traffic is relayed

---

Full technical writeup in comments 👇

#kubernetes #sre #devops #tailscale #networking #homelab #incidentresponse

---

## Image Caption Suggestions

**For the data usage screenshot:**
"The moment I knew something was very wrong"

**For architecture diagram:**
"When your k8s traffic takes a detour through Bengaluru"

---

## Carousel Post Option (7 slides)

### Slide 1 (Hook)
```text
My Kubernetes cluster
consumed 1,668 GB
in ONE day.

Here's what went wrong →
```

### Slide 2 (The Setup)
```text
THE SETUP:
• 5-node k8s cluster
• Tailscale mesh VPN
• Calico CNI (VXLAN)
• Home internet

Everything was working fine...
until it wasn't.
```

### Slide 3 (The Discovery)
```text
THE DISCOVERY:

tailscale status

Two nodes showed:
"relay blr" ⚠️

Instead of:
"direct 192.168.x.x" ✓
```

### Slide 4 (The Problem)
```text
THE PROBLEM:

Normal path:
Node A → Node B
(1ms, counted once)

Relay path:
Node A → ISP → India → ISP → Node B
(28ms, counted 4x)
```

### Slide 5 (The Cascade)
```text
THE CASCADE:

Relay adds latency
      ↓
Kubelet times out
      ↓
Node flaps NotReady
      ↓
Calico rebuilds tunnels
      ↓
Traffic goes through relay
      ↓
REPEAT
```

### Slide 6 (The Damage)
```text
THE DAMAGE:

7-day totals:

• Node using relay: 8.65 TB
• Other relay node: 8.94 TB
• Direct nodes: 0.01 TB each

17.6 TB from 2 nodes
vs
0.02 TB from the rest
```

### Slide 7 (The Lesson)
```text
THE LESSON:

Before running k8s over VPN:

1. Monitor connection types
2. Alert on relay fallback
3. Check: tailscale status
4. Look for "direct" not "relay"

One misconfigured node
can cost you terabytes.
```

---

## Hashtag Recommendations

**Primary:**
#kubernetes #sre #devops #tailscale #networking

**Secondary:**
#homelab #cloudnative #infrastructure #techblog #learninpublic

**Engagement:**
#incidentresponse #postmortem #lessonslearned

---

## Engagement Questions (pick one for your post)

- "Have you experienced similar VPN overlay issues with Kubernetes?"
- "What's the most surprising root cause you've found in an incident investigation?"
- "How do you monitor your mesh VPN connections in production?"
