---
title: "Grafana Screenshot Guide for Blog Post"
date: 2026-03-01
description: "Open each URL in your browser, login (admin/prom-operator), and take a screenshot."
tags: [grafana, monitoring]
draft: true
---

## Quick URLs for Screenshots

Open each URL in your browser, login (admin/prom-operator), and take a screenshot.

---

## Screenshot 1: Network Spike - Feb 22 (lima-mm0)
**Purpose:** Shows the massive spike on the problematic node

```text
http://203.0.113.177/d/rYdddlPWk/node-exporter-full?orgId=1&from=2026-02-21T00:00:00.000Z&to=2026-02-23T23:59:59.000Z&timezone=browser&var-datasource=default&var-job=node-exporter&var-node=198.51.100.82:9100&viewPanel=74
```

**Suggested filename:** `network-spike-lima-mm0-feb22.png`

---

## Screenshot 2: Network Spike - Feb 22 (lima-mm1)
**Purpose:** Shows the mirrored spike on the other problematic node

```text
http://203.0.113.177/d/rYdddlPWk/node-exporter-full?orgId=1&from=2026-02-21T00:00:00.000Z&to=2026-02-23T23:59:59.000Z&timezone=browser&var-datasource=default&var-job=node-exporter&var-node=198.51.100.104:9100&viewPanel=74
```

**Suggested filename:** `network-spike-lima-mm1-feb22.png`

---

## Screenshot 3: Network Spike - Feb 28 (lima-mm0)
**Purpose:** Shows the second incident

```text
http://203.0.113.177/d/rYdddlPWk/node-exporter-full?orgId=1&from=2026-02-27T00:00:00.000Z&to=2026-03-01T23:59:59.000Z&timezone=browser&var-datasource=default&var-job=node-exporter&var-node=198.51.100.82:9100&viewPanel=74
```

**Suggested filename:** `network-spike-lima-mm0-feb28.png`

---

## Screenshot 4: Normal Node Comparison (cylon)
**Purpose:** Shows what normal traffic looks like on a stable node

```text
http://203.0.113.177/d/rYdddlPWk/node-exporter-full?orgId=1&from=2026-02-21T00:00:00.000Z&to=2026-02-23T23:59:59.000Z&timezone=browser&var-datasource=default&var-job=node-exporter&var-node=198.51.100.27:9100&viewPanel=74
```

**Suggested filename:** `network-normal-cylon-feb22.png`

---

## Screenshot 5: Normal Node Comparison (raspberrypi)
**Purpose:** Shows minimal traffic on direct-connected nodes

```text
http://203.0.113.177/d/rYdddlPWk/node-exporter-full?orgId=1&from=2026-02-21T00:00:00.000Z&to=2026-02-23T23:59:59.000Z&timezone=browser&var-datasource=default&var-job=node-exporter&var-node=198.51.100.32:9100&viewPanel=74
```

**Suggested filename:** `network-normal-raspberrypi-feb22.png`

---

## Screenshot 6: Full Dashboard Overview
**Purpose:** Shows the overall system health during the incident

```text
http://203.0.113.177/d/rYdddlPWk/node-exporter-full?orgId=1&from=2026-02-21T00:00:00.000Z&to=2026-02-23T23:59:59.000Z&timezone=browser&var-datasource=default&var-job=node-exporter&var-node=198.51.100.82:9100
```

**Suggested filename:** `dashboard-overview-feb22.png`

---

## Screenshot Tips

1. **Use Full-Screen Mode:** Press `V` in Grafana to view panel in fullscreen before screenshotting
2. **Dark Theme:** The dark theme looks better in blog posts (should already be default)
3. **Expand the Panel:** Click the panel title → "View" to see it in isolation
4. **Browser Screenshot:** Use browser's built-in screenshot (Ctrl+Shift+S in Firefox) for clean captures

---

## Alternative: Install Grafana Image Renderer

If you want automatic screenshot export, install the renderer plugin:

```bash
# On the Grafana server
kubectl exec -n monitoring -it $(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana -o name | head -1) -- grafana-cli plugins install grafana-image-renderer

# Or via Helm values
# grafana.plugins: ["grafana-image-renderer"]
```

---

## Panel ID Reference

| Panel ID | Name | Best For |
|----------|------|----------|
| 74 | Network Traffic Basic | Main traffic spike visualization |
| 77 | CPU Basic | Correlation with CPU during spike |
| 78 | Memory Basic | Memory impact during incident |
| 152 | Disk Space Used Basic | Overall system health |

---

## Recommended Blog Images

### For the Hook/Opening:
- Your ISP data usage screenshot (already have)
- Full dashboard overview showing the spike

### For Technical Deep-Dive:
- Network Traffic comparison: problem node vs stable node
- Side-by-side: lima-mm0 and lima-mm1 showing mirrored traffic

### For the Conclusion:
- Before/after comparison (if you have post-fix data)
- Tailscale status showing "relay" vs "direct"
