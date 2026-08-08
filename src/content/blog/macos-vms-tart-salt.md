---
title: "macOS and Linux VMs on Apple Silicon with tart and SaltStack"
date: 2026-05-27
description: "How to automate tart VM lifecycle on Apple Silicon Mac Minis using SaltStack — install, clone OCI images, set resources, and keep VMs alive with launchd. Covers both macOS Sonoma and Ubuntu VMs for testing the kri fleet platform without touching production nodes."
tags: [macos, saltstack, virtualization]
cover: "assets/images/travel/manali/IMG_75751.JPG"
draft: false
---

<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>

Infrastructure · macOS · SaltStack

I manage a small fleet of Apple Silicon Mac Minis that run iOS CI/CD pipelines. To test the fleet management platform — kri — without touching production nodes, I built Salt states that provision and maintain tart VMs: install tart via Homebrew, clone OCI images, set CPU/memory/disk, and wire up launchd daemons so VMs survive reboots automatically. Here's the exact implementation.

macOS image size

~20 GB

Sonoma base, first pull

Linux image size

~2 GB

cirruslabs/ubuntu:latest

Salt states

4

tap, install, clone, service

Clone timeout

3600s

macOS images on slow links

TL;DR — Four sentences

-   **tart** uses Apple's native `Virtualization.framework` to run both macOS and Linux VMs as OCI images on Apple Silicon — CLI-first, no GUI overhead.
-   The Salt state **installs tart via Homebrew, clones each VM from ghcr.io/cirruslabs, sets per-VM CPU/memory/disk, and drops a launchd plist** into `/Library/LaunchDaemons/` so VMs start at boot and restart on crash.
-   VM configuration lives in pillar — flip **`enabled: false`** to keep a VM defined but dormant; flip to `true` and re-apply to spin it up on demand.
-   Tear everything down with **`salt 'mm1' state.apply tart.remove`** — unloads launchd, stops VMs, deletes disk images, removes plists — no residue on the host.

## ① The Problem — Physical Macs Are Not Disposable

The Mac Minis in the fleet are busy. They run Xcode, Fastlane, the kri Salt minion, and a rotating set of iOS jobs. Testing a new kri feature directly on them means interrupting real CI runs, potentially corrupting minion state, and — if something goes wrong — leaving a Mac in a broken configuration that takes time to diagnose and clean up.

I needed isolated, disposable test nodes that look like Mac Minis to kri's Salt master but don't share any state with the production machines. VMs are the right answer: spin one up, run your tests, tear it down. If the minion config is wrong, delete the VM and clone a fresh one.

The two constraints that shaped the choice:

-   **Must run on Apple Silicon.** The fleet is M1/M2 Mac Minis. x86 hypervisors don't exist here. Any VM solution has to use Apple's own virtualisation stack.
-   **Must be automatable via Salt.** The whole point of kri is Salt-driven fleet management — the VMs themselves need to be provisioned the same way.

* * *

## ② Why tart

**tart** is a virtualisation tool from Cirrus Labs that sits on top of Apple's `Virtualization.framework` — the same framework that powers the macOS Ventura+ Virtualisation UI. It has three properties that make it exactly right for this use case.

Reason 1

Native framework

Virtualization.framework is Apple's own supported API. No kernel extensions, no third-party hypervisor, no compatibility layer. Performance is close to bare metal for CPU-bound workloads.

Reason 2

OCI images

VM images are pushed to and pulled from OCI registries — the same infrastructure as Docker images. Cirrus Labs publishes ready-made macOS and Linux images on ghcr.io. No manual ISO setup.

Reason 3

CLI-first

Every tart operation — clone, run, stop, delete, set — is a single shell command. That makes it trivially automatable from Salt's `cmd.run` states with standard idempotency guards.

Reason 4

Both OS types

The same toolchain handles macOS Sonoma and Ubuntu side by side. One Salt state covers both. kri tests run against whichever OS mix the pillar defines.

**Prerequisite:** tart requires Apple Silicon (M1 or later) and macOS 13 Ventura or newer. It will not run on Intel Macs or older macOS versions. The Virtualization.framework APIs it depends on were introduced in macOS 12 but the nested virtualisation required for macOS guests landed in macOS 13.

* * *

## ③ Architecture

The setup has three layers: the physical Mac Mini host, the tart VMs running on it, and the Salt master that pushes states to everything. launchd acts as the process supervisor that keeps VMs alive between Salt runs.

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>

Architecture — Salt master pushes states to Mac Mini host; tart VMs register as kri nodes

<svg viewBox="0 0 1060 320" role="img" aria-label="tart VM architecture diagram">
            <defs>
              <marker id="ma" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#4B5563"></path></marker>
              <marker id="mb" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#2563EB"></path></marker>
              <marker id="mc" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#16A34A"></path></marker>
              <marker id="md" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#7C3AED"></path></marker>
            </defs>
            <rect x="20" y="90" width="172" height="140" rx="14" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
            <text x="106" y="120" text-anchor="middle" fill="#1D4ED8" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">Salt Master</text>
            <text x="106" y="140" text-anchor="middle" fill="#3B82F6" font-size="12" font-family="ui-monospace,monospace">kri stack</text>
            <rect x="38" y="152" width="136" height="22" rx="6" fill="#DBEAFE" stroke="#93C5FD" stroke-width="1"></rect>
            <text x="106" y="167" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="600" font-family="ui-monospace,monospace">state.apply tart</text>
            <rect x="38" y="180" width="136" height="22" rx="6" fill="#DBEAFE" stroke="#93C5FD" stroke-width="1"></rect>
            <text x="106" y="195" text-anchor="middle" fill="#1D4ED8" font-size="11" font-weight="600" font-family="ui-monospace,monospace">tart.sls pillar</text>
            <text x="106" y="218" text-anchor="middle" fill="#93C5FD" font-size="11" font-family="ui-sans-serif,sans-serif">pushes to minions</text>
            <line x1="193" y1="160" x2="244" y2="160" stroke="#2563EB" stroke-width="1.5" marker-end="url(#mb)"></line>
            <text x="218" y="150" text-anchor="middle" fill="#2563EB" font-size="11" font-weight="600" font-family="ui-sans-serif,sans-serif">ZeroMQ</text>
            <rect x="246" y="28" width="540" height="264" rx="16" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="516" y="56" text-anchor="middle" fill="#374151" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">Mac Mini Host (mm1) — Apple Silicon M2</text>
            <text x="516" y="76" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-monospace,monospace">/opt/homebrew/bin/tart · launchd · Salt Minion</text>
            <rect x="396" y="86" width="240" height="28" rx="8" fill="#374151"></rect>
            <text x="516" y="104" text-anchor="middle" fill="#F9FAFB" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">launchd — /Library/LaunchDaemons/</text>
            <line x1="396" y1="100" x2="342" y2="130" stroke="#6B7280" stroke-width="1.3" stroke-dasharray="4,2" marker-end="url(#ma)"></line>
            <line x1="636" y1="100" x2="690" y2="130" stroke="#6B7280" stroke-width="1.3" stroke-dasharray="4,2" marker-end="url(#ma)"></line>
            <rect x="264" y="120" width="220" height="148" rx="12" fill="#FFF7ED" stroke="#FED7AA" stroke-width="1.5"></rect>
            <text x="374" y="148" text-anchor="middle" fill="#9A3412" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">macOS Sonoma VM</text>
            <text x="374" y="167" text-anchor="middle" fill="#C2410C" font-size="11" font-family="ui-monospace,monospace">kri-test-macos-1</text>
            <rect x="280" y="178" width="188" height="20" rx="5" fill="#FFEDD5" stroke="#FDBA74" stroke-width="1"></rect>
            <text x="374" y="192" text-anchor="middle" fill="#9A3412" font-size="11" font-family="ui-monospace,monospace">4 vCPU · 8192 MB · 60 GB</text>
            <rect x="280" y="204" width="188" height="20" rx="5" fill="#FFEDD5" stroke="#FDBA74" stroke-width="1"></rect>
            <text x="374" y="218" text-anchor="middle" fill="#9A3412" font-size="11" font-family="ui-monospace,monospace">com.tart.kri-test-macos-1</text>
            <text x="374" y="244" text-anchor="middle" fill="#EA580C" font-size="11" font-family="ui-sans-serif,sans-serif">Salt Minion inside</text>
            <text x="374" y="259" text-anchor="middle" fill="#D97706" font-size="11" font-family="ui-sans-serif,sans-serif">registers as kri node</text>
            <rect x="548" y="120" width="220" height="148" rx="12" fill="#F0FDF4" stroke="#86EFAC" stroke-width="1.5"></rect>
            <text x="658" y="148" text-anchor="middle" fill="#14532D" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">Ubuntu VM</text>
            <text x="658" y="167" text-anchor="middle" fill="#166534" font-size="11" font-family="ui-monospace,monospace">kri-test-linux-1</text>
            <rect x="564" y="178" width="188" height="20" rx="5" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="658" y="192" text-anchor="middle" fill="#14532D" font-size="11" font-family="ui-monospace,monospace">2 vCPU · 4096 MB · 20 GB</text>
            <rect x="564" y="204" width="188" height="20" rx="5" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="658" y="218" text-anchor="middle" fill="#14532D" font-size="11" font-family="ui-monospace,monospace">com.tart.kri-test-linux-1</text>
            <text x="658" y="244" text-anchor="middle" fill="#16A34A" font-size="11" font-family="ui-sans-serif,sans-serif">Salt Minion inside</text>
            <text x="658" y="259" text-anchor="middle" fill="#16A34A" font-size="11" font-family="ui-sans-serif,sans-serif">registers as kri node</text>
            <rect x="20" y="270" width="172" height="70" rx="12" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
            <text x="106" y="296" text-anchor="middle" fill="#6D28D9" font-size="13" font-weight="700" font-family="ui-sans-serif,sans-serif">ghcr.io/cirruslabs</text>
            <text x="106" y="313" text-anchor="middle" fill="#7C3AED" font-size="11" font-family="ui-monospace,monospace">macos-sonoma-base</text>
            <text x="106" y="328" text-anchor="middle" fill="#7C3AED" font-size="11" font-family="ui-monospace,monospace">ubuntu:latest</text>
            <path d="M192 290 Q220 290 246 230" stroke="#7C3AED" stroke-width="1.5" stroke-dasharray="5,3" fill="none" marker-end="url(#md)"></path>
            <text x="216" y="278" fill="#7C3AED" font-size="11" font-weight="600" font-family="ui-sans-serif,sans-serif">tart clone</text>
            <rect x="826" y="100" width="212" height="120" rx="14" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
            <text x="932" y="128" text-anchor="middle" fill="#5B21B6" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">kri Platform</text>
            <text x="932" y="148" text-anchor="middle" fill="#7C3AED" font-size="11" font-family="ui-monospace,monospace">Fleet Management</text>
            <rect x="844" y="158" width="176" height="20" rx="5" fill="#EDE9FE" stroke="#C4B5FD" stroke-width="1"></rect>
            <text x="932" y="172" text-anchor="middle" fill="#5B21B6" font-size="11" font-family="ui-monospace,monospace">VM nodes = kri nodes</text>
            <rect x="844" y="184" width="176" height="20" rx="5" fill="#EDE9FE" stroke="#C4B5FD" stroke-width="1"></rect>
            <text x="932" y="198" text-anchor="middle" fill="#5B21B6" font-size="11" font-family="ui-monospace,monospace">E2E tests → VMs</text>
            <text x="932" y="213" text-anchor="middle" fill="#7C3AED" font-size="11" font-family="ui-sans-serif,sans-serif">physical Macs untouched</text>
            <line x1="787" y1="200" x2="825" y2="168" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#md)"></line>
            <text x="810" y="198" text-anchor="middle" fill="#7C3AED" font-size="11" font-family="ui-sans-serif,sans-serif">register</text>
            <text x="516" y="298" text-anchor="middle" fill="#6B7280" font-size="11" font-weight="600" font-family="ui-sans-serif,sans-serif">KeepAlive: true — launchd restarts VMs on unexpected exit</text>
          </svg>

Salt state push (ZeroMQ) OCI image pull (tart clone) macOS Sonoma VM Ubuntu VM launchd supervision

The Mac Mini runs a Salt minion as usual. When `state.apply tart` runs, it installs tart, clones the VM images from ghcr.io, configures resources, and drops launchd plists into `/Library/LaunchDaemons/`. From that point on, launchd owns the VM processes — they start at boot and restart automatically if they crash. Salt is only needed again when the pillar changes.

Each VM gets a Salt minion installed inside it (via a separate state, not shown here). That minion registers with the same Salt master, making the VM appear as a normal kri node. kri sees the VM exactly like it sees a physical Mac Mini — same grains, same beacons, same API surface.

* * *

## ④ The Salt State Walkthrough

The state lives at `salt/states/tart/init.sls`. It has two logical blocks: install tart, then loop over the VM map from pillar and provision each one.

### Variables

Three Jinja variables are extracted at the top and used throughout:

salt/states/tart/init.sls — preamble

```json
{% set tart_bin    = '/opt/homebrew/bin/tart' %}
{% set brew_bin    = '/opt/homebrew/bin/brew' %}
{% set run_user    = pillar['tart']['run_user'] %}
{% set vms         = pillar.get('tart', {}).get('vms', {}) %}
```

`run_user` is the macOS user who owns `~/.tart/` — tart stores all VM disk images under the user's home directory, so every `cmd.run` that invokes tart must use `runas: {{ run_user }}`.

### Install tart

salt/states/tart/init.sls — install block

```bash
# 1. Tap the Cirrus Labs Homebrew tap (idempotent)
tart_tap:
  cmd.run:
    - name: {{ brew_bin }} tap cirruslabs/cli
    - unless: {{ brew_bin }} tap | grep -q 'cirruslabs/cli'
    - runas: {{ run_user }}

# 2. Install tart (skip if binary already exists)
tart_install:
  cmd.run:
    - name: {{ brew_bin }} install cirruslabs/cli/tart
    - unless: test -x {{ tart_bin }}
    - runas: {{ run_user }}
    - require:
      - cmd: tart_tap
```

The `unless` guards make both states idempotent: the tap is skipped if already present, and tart is skipped if the binary exists. On subsequent `state.apply` runs these execute in milliseconds with no network traffic.

### Per-VM provisioning loop

The Jinja `{% for vm_name, vm in vms.items() %}` loop generates one set of states per VM. The `{% if vm.get('enabled', True) %}` check skips VMs whose pillar has `enabled: false` — they stay defined but dormant until you flip the flag and re-apply.

salt/states/tart/init.sls — per-VM states

```json
{% for vm_name, vm in vms.items() %}
{% if vm.get('enabled', True) %}

{% set cpu    = vm.get('cpu', 2) %}
{% set memory = vm.get('memory', 4096) %}
{% set disk   = vm.get('disk', 20) %}
{% set image  = vm['image'] %}
{% set label  = 'com.tart.' ~ vm_name %}
{% set plist  = '/Library/LaunchDaemons/' ~ label ~ '.plist' %}

# Clone from OCI registry — pulls image automatically if not cached
tart_clone_{{ vm_name }}:
  cmd.run:
    - name: {{ tart_bin }} clone {{ image }} {{ vm_name }}
    - unless: {{ tart_bin }} list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx '{{ vm_name }}'
    - runas: {{ run_user }}
    - timeout: 3600
    - require:
      - cmd: tart_install

# Set CPU / memory / disk — only runs on first clone (onchanges)
tart_set_{{ vm_name }}:
  cmd.run:
    - name: >-
        {{ tart_bin }} set {{ vm_name }}
        --cpu {{ cpu }}
        --memory {{ memory }}
        --disk {{ disk }}
    - onchanges:
      - cmd: tart_clone_{{ vm_name }}
    - runas: {{ run_user }}

# Drop the launchd plist — rendered from Jinja template
tart_plist_{{ vm_name }}:
  file.managed:
    - name: {{ plist }}
    - source: salt://tart/files/com.tart.vm.plist.jinja
    - template: jinja
    - context:
        vm_name: {{ vm_name }}
        tart_bin: {{ tart_bin }}
        run_user: {{ run_user }}
        label: {{ label }}
    - user: root
    - group: wheel
    - mode: '0644'

# Load the daemon — skip if already registered with launchctl
tart_service_{{ vm_name }}:
  cmd.run:
    - name: launchctl load -w {{ plist }}
    - unless: launchctl list 2>/dev/null | grep -q '{{ label }}'
    - require:
      - file: tart_plist_{{ vm_name }}
      - cmd: tart_set_{{ vm_name }}

{% endif %}
{% endfor %}
```

A few things worth noting in the clone step: `tart clone` both resolves the OCI image and copies the disk image to `~/.tart/VMs/<vm_name>/`. The `unless` guard uses `tart list` and `awk 'NR>1'` to skip the header row before grepping — without that, the header line would produce a false positive.

**First clone of a macOS image takes up to 20 minutes.** The Sonoma base image from ghcr.io/cirruslabs is roughly 20 GB. Salt's default command timeout is 5 minutes — which is why the clone state explicitly sets `timeout: 3600`. Without it, Salt kills the download mid-stream and leaves a partial VM that confuses subsequent runs.

The `tart_set` state uses `onchanges` rather than `require`. This means it only runs when the clone step actually changed something — i.e., on first creation. On re-apply to an already-running VM the set command is skipped entirely, which prevents tart from trying to resize a running VM's disk (that would fail).

* * *

## ⑤ The launchd Plist Template

The plist template at `salt/states/tart/files/com.tart.vm.plist.jinja` is rendered once per VM and written to `/Library/LaunchDaemons/com.tart.<vm_name>.plist` as a root-owned file. launchd reads it from there and manages the VM process for the lifetime of the host.

salt/states/tart/files/com.tart.vm.plist.jinja

```bash
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{{ label }}</string>

    <key>ProgramArguments</key>
    <array>
        <string>{{ tart_bin }}</string>
        <string>run</string>
        <string>{{ vm_name }}</string>
        <string>--no-graphics</string>
    </array>

    <!-- Run as the user who owns ~/.tart/ -->
    <key>UserName</key>
    <string>{{ run_user }}</string>

    <key>RunAtLoad</key>
    <true/>

    <!-- Restart automatically if the VM exits unexpectedly -->
    <key>KeepAlive</key>
    <true/>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>/var/log/tart-{{ vm_name }}.log</string>

    <key>StandardErrorPath</key>
    <string>/var/log/tart-{{ vm_name }}.err</string>
</dict>
</plist>
```

Three keys are worth explaining in detail:

### UserName

LaunchDaemons run as root by default. tart stores all VM disk images under `~/.tart/VMs/` — the home directory of whichever user owns the tart installation. Without `UserName`, the daemon would launch as root and try to find VMs at `/var/root/.tart/`, which doesn't exist. Setting `UserName` to the correct user causes launchd to switch to that user before executing the tart process.

### KeepAlive

`KeepAlive: true` tells launchd to restart the process whenever it exits, for any reason. If the VM crashes, if tart is force-killed, or if the host comes back from sleep and the VM process is gone — launchd respawns it. This is what turns tart into a self-healing VM service rather than a one-shot command. Combined with `RunAtLoad: true`, the VMs are always running as long as the host is up.

### ThrottleInterval

Set to 10 seconds. This prevents launchd from rapid-fire-respawning a VM that's crashing immediately on start (a crash loop). If tart exits within 10 seconds of starting, launchd waits before trying again. Without this, a misconfigured VM could hammer the host with restart attempts. Check `/var/log/tart-<vm_name>.err` if a VM keeps restarting.

The `--no-graphics` flag tells tart to start the VM headless — no window, no VNC. That's correct for unattended CI nodes. SSH in via the VM's IP if you need a shell; use `tart ip <vm_name>` to get it.

* * *

## ⑥ The Pillar

VM configuration is entirely in pillar. No VM names or sizes are hardcoded in the state. Copy the example to your minion's active pillar path and you're done.

salt/pillar/tart.sls.example

```bash
tart:
  # macOS user who owns ~/.tart/  (tart VMs are stored per-user)
  run_user: dk

  vms:
    # macOS Sonoma — mirrors a real Mac Mini node for kri testing
    kri-test-macos-1:
      image: ghcr.io/cirruslabs/macos-sonoma-base:latest
      cpu: 4          # virtual CPUs
      memory: 8192    # MB
      disk: 60        # GB
      enabled: true

    # Second macOS VM — for multi-node kri scenarios
    kri-test-macos-2:
      image: ghcr.io/cirruslabs/macos-sonoma-base:latest
      cpu: 4
      memory: 8192
      disk: 60
      enabled: false  # flip to true when needed

    # Lightweight Linux VM — for non-macOS-specific kri API / worker tests
    kri-test-linux-1:
      image: ghcr.io/cirruslabs/ubuntu:latest
      cpu: 2
      memory: 4096    # MB
      disk: 20        # GB
      enabled: true
```

The `enabled: false` pattern for `kri-test-macos-2` is the right way to manage on-demand VMs. The VM is defined in pillar — grains, CPU/memory, image source all documented — but it doesn't consume host resources until you need it. Flip it to `true`, run `state.apply tart`, and the VM is up within however long the image takes to clone (seconds for Linux, up to 20 minutes for macOS).

**Top.sls entry:** to activate this pillar for minion `mm1`, add the following to `salt/pillar/top.sls`:

```bash
base:
  'mm1':
    - tart
```

Available images from ghcr.io/cirruslabs:

-   `ghcr.io/cirruslabs/macos-sonoma-base:latest` — macOS 14 Sonoma, ~20 GB
-   `ghcr.io/cirruslabs/macos-ventura-base:latest` — macOS 13 Ventura, ~20 GB
-   `ghcr.io/cirruslabs/ubuntu:latest` — Ubuntu LTS, ~2 GB
-   `ghcr.io/cirruslabs/debian:latest` — Debian, ~2 GB

* * *

## ⑦ How to Apply

With the pillar in place, applying the state to a Mac Mini minion is one command:

```bash
# Apply to a single minion
salt 'mm1' state.apply tart

# Apply to all Mac Mini minions at once
salt 'mm*' state.apply tart
```

Salt executes the states in dependency order. On a host with no previous tart installation the sequence is: tap → install → clone macOS VM → set resources → drop plist → load daemon → clone Linux VM → set resources → drop plist → load daemon.

**First run is slow.** The macOS Sonoma base image is ~20 GB. On a typical home broadband connection or a Mac Mini on a shared office network, the clone step can take 15–20 minutes. The `timeout: 3600` in the state covers this. Salt will appear to hang on `tart_clone_kri-test-macos-1` — that's expected. Monitor progress on the minion with: `tail -f /var/log/salt/minion`

Once the state completes, get the VM IPs:

```bash
# Run on the Mac Mini directly, or via salt cmd.run
tart ip kri-test-linux-1
# → 192.0.2.212  (example; DHCP assigns the actual IP)

tart ip kri-test-macos-1
# → 192.0.2.213

# Or via Salt
salt 'mm1' cmd.run 'tart ip kri-test-linux-1' runas=dk
```

SSH in to verify:

```bash
ssh admin@192.0.2.212   # Linux VM — default user is 'admin'
ssh admin@192.0.2.213   # macOS VM — same
```

Check launchd service status on the host:

```bash
# List all tart services
launchctl list | grep com.tart

# Check a specific VM's status (0 = running)
launchctl list com.tart.kri-test-linux-1

# Tail VM logs
tail -f /var/log/tart-kri-test-linux-1.log
tail -f /var/log/tart-kri-test-linux-1.err
```

* * *

## ⑧ Tearing Down

The remove state at `salt/states/tart/remove.sls` is intentionally destructive. It unloads the launchd daemon, stops the VM with a 30-second graceful timeout, deletes the disk image, and removes the plist. Nothing is left on the host.

salt/states/tart/remove.sls

```bash
# Unload daemon first — prevents launchd from restarting the VM
tart_unload_{{ vm_name }}:
  cmd.run:
    - name: launchctl unload -w {{ plist }}
    - onlyif: launchctl list 2>/dev/null | grep -q '{{ label }}'

# Stop the VM gracefully (30s timeout)
tart_stop_{{ vm_name }}:
  cmd.run:
    - name: {{ tart_bin }} stop {{ vm_name }} --timeout 30
    - onlyif: {{ tart_bin }} list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx '{{ vm_name }}'
    - runas: {{ run_user }}
    - require:
      - cmd: tart_unload_{{ vm_name }}

# Delete disk image — permanent, no recovery
tart_delete_{{ vm_name }}:
  cmd.run:
    - name: {{ tart_bin }} delete {{ vm_name }}
    - onlyif: {{ tart_bin }} list 2>/dev/null | awk 'NR>1 {print $1}' | grep -qx '{{ vm_name }}'
    - runas: {{ run_user }}
    - require:
      - cmd: tart_stop_{{ vm_name }}

# Remove plist
tart_plist_absent_{{ vm_name }}:
  file.absent:
    - name: {{ plist }}
    - require:
      - cmd: tart_unload_{{ vm_name }}
```

Run it:

```bash
salt 'mm1' state.apply tart.remove
```

**This reads from the same pillar.** `remove.sls` iterates over all VMs in the pillar — `enabled` flag is ignored, every defined VM is torn down. If you only want to remove a single VM, either comment it out of the pillar before running, or stop and delete it manually with `tart stop <name>` and `tart delete <name>` on the host.

The `onlyif` guards in the remove state mean it's safe to run against a host that was never provisioned or is already clean — every step is a no-op if the VM or plist doesn't exist.

* * *

## ⑨ What's Next

The VMs are up. launchd keeps them running. Now the rest of the kri testing infrastructure can land on top of them.

Step 1

Register as kri nodes

Install the kri Salt minion inside each VM. The minion connects to the same Salt master and appears in kri's node inventory alongside physical Mac Minis — same grains, same beacon events.

Step 2

Run E2E tests against VMs

kri's Playwright test suite can target VM IPs directly. Any test that exercises Salt state pushes, job dispatch, or minion health checks can run against a VM node without affecting production.

Step 3

Test destructive operations

Playbooks that reboot a node, reinstall Xcode, or wipe a build cache are too risky to run on physical machines during active sprints. On a VM, if it goes wrong, delete it and clone fresh from the OCI image.

Step 4

Keep physical Macs pristine

Production Mac Minis run iOS builds. They stay clean. All kri development and feature testing happens inside VMs. When a feature is proven on VMs, it ships to the fleet.

**The core insight:** tart VMs on the Mac Mini host look identical to physical Mac Minis from kri's perspective. Salt grains, network connectivity, launchd, Homebrew, Xcode — all of it works the same way inside a VM. The isolation is real, the fidelity is high, and the cost to clone a fresh one is a `state.apply` plus a 20-minute wait for the macOS image pull.

The Salt states for tart are three files, about 150 lines total including comments. They have been running cleanly on a single Mac Mini during kri development — provisioning a macOS VM for API/minion integration tests and a Linux VM for the kri backend worker tests. The physical Mac Minis stay untouched during development sprints.
