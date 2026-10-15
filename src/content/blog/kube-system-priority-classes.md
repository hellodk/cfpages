---
title: "Ensuring kube-system Pods Always Start First in Kubernetes"
date: 2026-05-11
description: "When a node restarts, Kubernetes makes no guarantee about which pods come up first — unless you tell it to. This post covers how to use PriorityClasses to ensure kube-system pods (coredns, calico, kube-proxy, etc.) are always scheduled before workload pods, and walks through a real-world containerd"
tags: [kubernetes, scheduling]
draft: true
---

When a node restarts, Kubernetes makes no guarantee about which pods come up first — unless you tell it to. This post covers how to use **PriorityClasses** to ensure `kube-system` pods (coredns, calico, kube-proxy, etc.) are always scheduled before workload pods, and walks through a real-world containerd snapshot corruption incident we hit along the way.

---

## Background: How Kubernetes Scheduling Priority Works

Kubernetes assigns every pod a numeric priority. When resources are tight, higher-priority pods preempt lower-priority ones. Two built-in `PriorityClass` objects cover system pods:

| PriorityClass            | Value        | Intended for                        |
|--------------------------|--------------|-------------------------------------|
| `system-node-critical`   | 2000001000   | Per-node essentials (kube-proxy, calico-node) |
| `system-cluster-critical`| 2000000000   | Cluster-wide services (coredns, metrics-server) |
| *(none)*                 | 0            | Regular workloads                   |

Any pod without a `priorityClassName` gets priority `0` — the same as any random user workload. That means on a cold node boot, coredns could lose a scheduling slot to a Grafana pod.

---

## Step 1: Check What You Have

```bash
# List all priority classes
kubectl get priorityclasses

# See which kube-system pods are missing one
kubectl get pods -n kube-system -o json \
  | jq -r '.items[]
      | "\(.metadata.name)\t\(.spec.priorityClassName // "MISSING")"' \
  | column -t
```

In our cluster, three Deployments had no `priorityClassName`:

```text
my-headlamp-...                          MISSING
nfs-subdir-external-provisioner-...      MISSING
sealed-secrets-controller-...            MISSING
```

---

## Step 2: Patch the Offending Deployments

```bash
# Patch Deployments
kubectl get deployments -n kube-system -o json \
  | jq -r '.items[]
      | select(.spec.template.spec.priorityClassName == null or .spec.template.spec.priorityClassName == "")
      | .metadata.name' \
  | while read -r deploy; do
      kubectl patch deployment "$deploy" -n kube-system \
        --type=json \
        -p='[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"system-cluster-critical"}]'
    done

# Patch DaemonSets (use system-node-critical for per-node daemons)
kubectl get daemonsets -n kube-system -o json \
  | jq -r '.items[]
      | select(.spec.template.spec.priorityClassName == null or .spec.template.spec.priorityClassName == "")
      | .metadata.name' \
  | while read -r ds; do
      kubectl patch daemonset "$ds" -n kube-system \
        --type=json \
        -p='[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"system-node-critical"}]'
    done
```

---

## Step 3: Verify the Rollout

```bash
kubectl get deployments -n kube-system -o name \
  | xargs -I{} kubectl rollout status {} -n kube-system

# Final check — every pod should show a priority class
kubectl get pods -n kube-system -o json \
  | jq -r '.items[]
      | "\(.metadata.name)\t\(.spec.priorityClassName // "MISSING")"' \
  | column -t
```

---

## Bonus: The Consolidated Script

Save this as `kube-system-priority.sh` and run it once on any cluster. It is fully idempotent — safe to re-run.

```bash
#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="kube-system"

echo "=== Step 1: Verify built-in priority classes ==="
kubectl get priorityclass system-cluster-critical system-node-critical \
  --no-headers -o custom-columns='NAME:.metadata.name,VALUE:.value'

echo ""
echo "=== Step 2: Patch Deployments missing a priority class ==="
kubectl get deployments -n "$NAMESPACE" -o json \
  | jq -r '.items[]
      | select(.spec.template.spec.priorityClassName == null or .spec.template.spec.priorityClassName == "")
      | .metadata.name' \
  | while read -r deploy; do
      echo "  Patching deployment: $deploy → system-cluster-critical"
      kubectl patch deployment "$deploy" -n "$NAMESPACE" \
        --type=json \
        -p='[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"system-cluster-critical"}]'
    done

echo ""
echo "=== Step 3: Patch DaemonSets missing a priority class ==="
kubectl get daemonsets -n "$NAMESPACE" -o json \
  | jq -r '.items[]
      | select(.spec.template.spec.priorityClassName == null or .spec.template.spec.priorityClassName == "")
      | .metadata.name' \
  | while read -r ds; do
      echo "  Patching daemonset: $ds → system-node-critical"
      kubectl patch daemonset "$ds" -n "$NAMESPACE" \
        --type=json \
        -p='[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"system-node-critical"}]'
    done

echo ""
echo "=== Step 4: Wait for rollouts ==="
kubectl get deployments -n "$NAMESPACE" -o name \
  | xargs -I{} kubectl rollout status {} -n "$NAMESPACE"

echo ""
echo "=== Step 5: Final verification ==="
kubectl get pods -n "$NAMESPACE" -o json \
  | jq -r '.items[]
      | "\(.metadata.name)\t\(.spec.priorityClassName // "MISSING")"' \
  | column -t

MISSING=$(kubectl get pods -n "$NAMESPACE" -o json \
  | jq -r '.items[]
      | select(.spec.priorityClassName == null or .spec.priorityClassName == "")
      | .metadata.name')

if [ -z "$MISSING" ]; then
  echo ""
  echo "All kube-system pods have a priority class."
else
  echo "WARNING: still missing priority class: $MISSING"
  exit 1
fi
```

---

## Incident: Containerd Snapshot Corruption (k0s)

While applying the patches, every pod in the cluster got stuck in `ContainerCreating` with this error:

```text
failed to create containerd container: failed to stat parent:
stat /var/lib/k0s/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/1/fs:
no such file or directory
```

### Root Cause

The overlayfs snapshotter stores image layer chains as a linked list of numeric directories under `.../snapshots/`. Snapshot directory `1` — the base layer for the pause/sandbox image — had been garbage-collected off disk but its reference remained in the snapshotter's `metadata.db`. Every `RunPodSandbox` call tried to stat that missing parent and failed.

This affects all pods cluster-wide because every pod sandbox (pause container) shares the same image layer chain.

### Key detail for k0s clusters

k0s ships its own containerd binary at `/var/lib/k0s/bin/containerd` with socket at `/run/k0s/containerd.sock`. The system `containerd.service` (if present) is separate and **not** what k0s uses. Restarting `containerd.service` does nothing for k0s pods.

### Fix

```bash
# 1. Find the k0s containerd PID and kill it
#    k0scontroller will restart it automatically
sudo kill -9 $(cat /run/k0s/containerd.pid)

# 2. While containerd is down, wipe the corrupted snapshotter state
sudo cp /var/lib/k0s/containerd/io.containerd.snapshotter.v1.overlayfs/metadata.db \
        /var/lib/k0s/containerd/io.containerd.snapshotter.v1.overlayfs/metadata.db.bak
sudo rm  /var/lib/k0s/containerd/io.containerd.snapshotter.v1.overlayfs/metadata.db
sudo rm -rf /var/lib/k0s/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots

# 3. Wipe the main metadata DB (it holds stale blob/snapshot references)
sudo cp /var/lib/k0s/containerd/io.containerd.metadata.v1.bolt/meta.db \
        /var/lib/k0s/containerd/io.containerd.metadata.v1.bolt/meta.db.bak
sudo rm /var/lib/k0s/containerd/io.containerd.metadata.v1.bolt/meta.db

# 4. Wipe the content blobs (they are now orphaned with no metadata)
sudo rm -rf /var/lib/k0s/containerd/io.containerd.content.v1.content/blobs

# 5. Recreate the snapshots directory (containerd won't create it automatically)
sudo mkdir -p /var/lib/k0s/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots

# 6. k0scontroller has already restarted containerd by now.
#    Force delete stuck pods so they are recreated with fresh image pulls.
kubectl delete pods -n kube-system --all --grace-period=0 --force
```

After this, k0s pulls the pause image fresh, then kubelet pulls each pod's image on demand. Cluster recovers fully within a few minutes (depending on image sizes and network speed).

### Why the backup matters

The `.bak` files let you diff the old and new metadata DBs if you need to understand which images or snapshots were lost, or to restore specific image entries without a full re-pull.

---

## Summary

| What | How |
|------|-----|
| Ensure kube-system starts first | Assign `system-cluster-critical` / `system-node-critical` `priorityClassName` to all kube-system Deployments and DaemonSets |
| Detect missing priority classes | `kubectl get pods -n kube-system -o json \| jq -r '.items[] \| "\(.metadata.name)\t\(.spec.priorityClassName // \"MISSING\")"'` |
| Fix containerd snapshot corruption (k0s) | Kill k0s containerd PID, wipe `metadata.db` + `snapshots/` + `meta.db` + `blobs/`, recreate `snapshots/` dir, force-delete stuck pods |
| Identify k0s containerd socket | `/run/k0s/containerd.sock` (not the system `/run/containerd/containerd.sock`) |
