---
title: "Salt on macOS — How kri Deploys and Operates the Fleet Control Plane"
date: 2026-06-21
description: "A deep dive into how kri deploys salt-master and salt-minion on macOS Mac Minis using Ansible — plist services, PAM auth, salt-api, and how minions find their master."
tags: [saltstack, macos, kri, launchd]
draft: false
---

PKG install · launchd plists · PAM auth · rest\_cherrypy TLS · multi-master failover

## Install & Service

### Installing Salt-Master + Running It as a Service

kri orchestrates the entire Salt infrastructure via Ansible: when you provision a new Mac Mini as a salt-master, kri's API dispatches an Ansible playbook from inside a Docker container that installs, configures, and starts salt-master and salt-api as native launchd daemons on the bare metal. Minions are other Mac Minis on the same LAN; they connect to the master over ZeroMQ (ports 4505/4506) using direct LAN IPs — no DNS or VPN required. kri's API then controls the fleet exclusively through salt-api over HTTPS, keeping the Docker boundary clean.

End-to-End Architecture — kri → Ansible → Salt

<svg viewBox="0 0 780 280" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-ov" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6B7280"></path>
        </marker>
        <marker id="arr-ov-acc" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#444ce7"></path>
        </marker>
        <marker id="arr-ov-grn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
        </marker>
      </defs>
      <rect x="24" y="100" width="140" height="80" rx="8" fill="#E0E7FF" stroke="#6366F1" stroke-width="2"></rect>
      <text x="94" y="128" text-anchor="middle" fill="#3730A3" font-size="12" font-weight="700">kri Platform</text>
      <text x="94" y="146" text-anchor="middle" fill="#4F46E5" font-size="11">Docker container</text>
      <text x="94" y="163" text-anchor="middle" fill="#4F46E5" font-size="11">API + Ansible</text>
      <circle cx="94" cy="140" r="46" fill="none" stroke="#444ce7" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="46;70" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.6;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="164" y1="140" x2="310" y2="140" stroke="#444ce7" stroke-width="1.5"></line>
      <line x1="310" y1="140" x2="310" y2="196" stroke="#444ce7" stroke-width="1.5" marker-end="url(#arr-ov-acc)"></line>
      <text x="237" y="133" text-anchor="middle" fill="#444ce7" font-size="10" font-weight="600">Ansible SSH</text>
      <rect x="240" y="196" width="180" height="60" rx="8" fill="#DCFCE7" stroke="#16A34A" stroke-width="2"></rect>
      <text x="330" y="221" text-anchor="middle" fill="#15803D" font-size="12" font-weight="700">Mac Mini Master</text>
      <text x="330" y="238" text-anchor="middle" fill="#15803D" font-size="10">salt-master · salt-api (launchd)</text>
      <circle cx="330" cy="226" r="50" fill="none" stroke="#16A34A" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="50;76" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.5;0" dur="2.4s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="164" y1="165" x2="270" y2="165" stroke="#444ce7" stroke-width="1.5"></line>
      <line x1="270" y1="165" x2="270" y2="196" stroke="#444ce7" stroke-width="1.5" marker-end="url(#arr-ov-acc)"></line>
      <text x="200" y="159" text-anchor="middle" fill="#444ce7" font-size="11" font-weight="600">HTTPS :4507</text>
      <rect x="500" y="130" width="130" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="565" y="155" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">Minion A</text>
      <text x="565" y="171" text-anchor="middle" fill="#4B5563" font-size="10">Mac Mini node</text>
      <rect x="500" y="200" width="130" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="565" y="225" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">Minion B</text>
      <text x="565" y="241" text-anchor="middle" fill="#4B5563" font-size="10">Mac Mini node</text>
      <line x1="420" y1="206" x2="460" y2="206" stroke="#16A34A" stroke-width="1.5"></line>
      <line x1="460" y1="206" x2="460" y2="158" stroke="#16A34A" stroke-width="1.5"></line>
      <line x1="460" y1="158" x2="498" y2="158" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-ov-grn)"></line>
      <line x1="420" y1="228" x2="498" y2="228" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-ov-grn)"></line>
      <text x="452" y="198" text-anchor="middle" fill="#4B5563" font-size="11">ZMQ 4505/4506</text>
      <circle r="4" fill="#444ce7">
        <animateMotion dur="1.8s" repeatCount="indefinite">
          <mpath href="#path-ansible"></mpath>
        </animateMotion>
      </circle>
      <path id="path-ansible" d="M164,140 L310,140 L310,196" fill="none"></path>
      <circle r="4" fill="#444ce7" opacity="0.7">
        <animateMotion dur="1.4s" repeatCount="indefinite" begin="0.5s">
          <mpath href="#path-https"></mpath>
        </animateMotion>
      </circle>
      <path id="path-https" d="M164,165 L270,165 L270,196" fill="none"></path>
      <circle r="4" fill="#16A34A">
        <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.3s">
          <mpath href="#path-zmq-a"></mpath>
        </animateMotion>
      </circle>
      <path id="path-zmq-a" d="M420,206 L460,206 L460,158 L498,158" fill="none"></path>
      <circle r="4" fill="#16A34A" opacity="0.7">
        <animateMotion dur="1.6s" repeatCount="indefinite" begin="0.9s">
          <mpath href="#path-zmq-b"></mpath>
        </animateMotion>
      </circle>
      <path id="path-zmq-b" d="M420,228 L498,228" fill="none"></path>
      <text x="330" y="30" text-anchor="middle" fill="#111827" font-size="11" font-weight="600">Provision Path</text>
      <text x="565" y="30" text-anchor="middle" fill="#111827" font-size="11" font-weight="600">Fleet Nodes</text>
      <line x1="24" y1="40" x2="240" y2="40" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,3"></line>
      <line x1="480" y1="40" x2="650" y2="40" stroke="#E5E7EB" stroke-width="1" stroke-dasharray="4,3"></line>
    </svg>

## Why Onedir PKG?

Salt's "onedir" bundle is a self-contained `/opt/salt/` tree — Python interpreter, Salt, all dependencies — installed as a macOS PKG. No Homebrew, no system Python, no pip.

Benefits for an air-gapped fleet: the `.pkg` is bundled inside the kri docker image under `playbooks/files/`, copied to the target via Ansible's `copy:` module, and installed with `installer -pkg`. Zero outbound internet from the Mac Mini.

```bash
salt_version: "3007.14"
# Bundled at build time:
playbooks/files/salt-3007.14-py3-arm64.pkg
```

## Role Task Order

-   1

    install\_macos.yml

    Copies & installs the PKG, sets PATH

-   2

    configure.yml

    Writes `/etc/salt/master.d/kri.conf` + `salt-api.conf`

-   3

    pki.yml

    Creates PKI directories for master key

-   4

    pillar.yml / states.yml

    Creates `/etc/salt/pillar` + `/etc/salt/states`

-   5

    api\_user.yml

    Creates `krisalt` system user (PAM)

-   6

    api\_tls.yml

    Self-signed cert/key for salt-api HTTPS

-   7

    service\_macos.yml

    Writes plists, loads + starts both daemons

macOS File Layout After Install

/opt/salt/ \# onedir bundle — binary + Python salt-master salt-api salt-key salt-call salt-minion Python lib/ … /etc/salt/ \# configuration (owned root:wheel) master.d/ kri.conf \# interface, pillar\_roots, external\_auth, netapi\_enable\_clients salt-api.conf \# rest\_cherrypy port + TLS paths pki/ master/ \# master keypair (auto-generated on first start) api/ salt-api.crt \# self-signed TLS cert salt-api.key \# private key (never committed) pillar/ \# per-minion pillar data (ingest\_url, node\_token) states/ \# salt states (grain\_report, heartbeat …) /Library/LaunchDaemons/ \# launchd plist files com.saltstack.salt.master.plist com.saltstack.salt.api.plist /var/log/salt/ \# log files master master-error api api-error

## The launchd Plist — Why Salt Starts Automatically

macOS uses **launchd** as its init system. A plist in `/Library/LaunchDaemons/` (root-owned) defines a system-level daemon that launchd manages. Two keys make salt survive reboots:

```bash
<key>RunAtLoad</key>   <!-- start the daemon when launchd loads the plist (boot or launchctl load) -->
<true/>

<key>KeepAlive</key>   <!-- restart the process automatically if it exits -->
<true/>

<key>ThrottleInterval</key>
<integer>5</integer>  <!-- wait 5 s before restart-on-crash to avoid tight loops -->
```

`RunAtLoad` means launchd starts salt-master immediately when the plist is loaded — at boot, or via `launchctl load -w`. The `-w` flag removes any `Disabled` key so it persists across reboots.

`KeepAlive` means launchd will restart the process if it crashes or exits — exactly like `Restart=always` in systemd.

## salt-master.plist (condensed)

```bash
<key>Label</key>
<string>com.saltstack.salt.master</string>

<key>ProgramArguments</key>
<array>
  <string>/opt/salt/salt-master</string>
  <string>--log-level=info</string>
</array>

<key>UserName</key>
<string>root</string>  # manages PKI dirs
<key>RunAtLoad</key> <true/>
<key>KeepAlive</key>  <true/>
```

## salt-api.plist (condensed)

```bash
<key>Label</key>
<string>com.saltstack.salt.api</string>

<key>ProgramArguments</key>
<array>
  <string>/opt/salt/salt-api</string>
  <string>--log-level=info</string>
</array>

<key>UserName</key>
<string>root</string>
<key>RunAtLoad</key> <true/>
<key>KeepAlive</key>  <true/>
```

## Ansible Loads the Daemon with launchctl

Writing the plist file is not enough — launchd must be told to pick it up. The role does:

```bash
# Unload first (idempotent — ignore errors)
/bin/launchctl unload /Library/LaunchDaemons/com.saltstack.salt.master.plist 2>/dev/null || true
# -w clears the Disabled key so it persists across reboots
/bin/launchctl load -w /Library/LaunchDaemons/com.saltstack.salt.master.plist
# Explicit start (redundant with RunAtLoad, but safe)
/bin/launchctl start com.saltstack.salt.master
```

The same sequence applies to `com.saltstack.salt.api`. The role waits for port 4505 (master) and port 4507 (api) to open before continuing, so Ansible fails fast if the daemon doesn't come up.

<aside class="callout"><strong class="callout__title">Important:</strong><div class="callout__body">On macOS 13+ (Ventura+), prefer <code>launchctl kickstart -k system/com.saltstack.salt.master</code> for restarting rather than stop+start. It is atomic and avoids the window where the service is stopped but not yet restarted.</div></aside>

Boot → Salt Ready — Service Start Flow

<svg viewBox="0 0 760 240" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6B7280"></path>
        </marker>
        <marker id="arr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#444ce7"></path>
        </marker>
      </defs>
      <rect x="24" y="88" width="116" height="60" rx="8" fill="#E0E7FF" stroke="#6366F1" stroke-width="2"></rect>
      <text x="82" y="114" text-anchor="middle" fill="#3730A3" font-size="11" font-weight="700">macOS Boot</text>
      <text x="82" y="131" text-anchor="middle" fill="#4F46E5" font-size="11">launchd starts</text>
      <rect x="188" y="88" width="136" height="60" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="256" y="113" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">Scan LaunchDaemons</text>
      <text x="256" y="130" text-anchor="middle" fill="#4B5563" font-size="10">/Library/LaunchDaemons/</text>
      <rect x="376" y="36" width="150" height="52" rx="8" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="451" y="58" text-anchor="middle" fill="#15803D" font-size="11" font-weight="700">salt-master</text>
      <text x="451" y="75" text-anchor="middle" fill="#15803D" font-size="10">port 4505/4506</text>
      <rect x="376" y="148" width="150" height="52" rx="8" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.5"></rect>
      <text x="451" y="170" text-anchor="middle" fill="#1E40AF" font-size="11" font-weight="700">salt-api</text>
      <text x="451" y="187" text-anchor="middle" fill="#1E40AF" font-size="10">port 4507 HTTPS</text>
      <rect x="586" y="88" width="140" height="60" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="656" y="114" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">KeepAlive</text>
      <text x="656" y="130" text-anchor="middle" fill="#4B5563" font-size="10">auto-restart on crash</text>
      <line x1="140" y1="118" x2="186" y2="118" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr)"></line>
      <line x1="324" y1="102" x2="360" y2="102" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="360" y1="102" x2="360" y2="62" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="360" y1="62" x2="374" y2="62" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr)"></line>
      <text x="342" y="56" text-anchor="middle" fill="#D97706" font-size="10" font-weight="600">RunAtLoad</text>
      <line x1="324" y1="134" x2="360" y2="134" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="360" y1="134" x2="360" y2="174" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="360" y1="174" x2="374" y2="174" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr)"></line>
      <text x="342" y="168" text-anchor="middle" fill="#D97706" font-size="10" font-weight="600">RunAtLoad</text>
      <line x1="526" y1="62" x2="564" y2="62" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="564" y1="62" x2="564" y2="108" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="564" y1="108" x2="584" y2="108" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr)"></line>
      <line x1="526" y1="174" x2="564" y2="174" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="564" y1="174" x2="564" y2="128" stroke="#6B7280" stroke-width="1.5"></line>
      <line x1="564" y1="128" x2="584" y2="128" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr)"></line>
    </svg>

## Managing the Service Day-to-Day

| Action | Command |
| --- | --- |
| Check status | `launchctl list \| grep salt` |
| Restart master | `sudo launchctl kickstart -k system/com.saltstack.salt.master` |
| Restart api | `sudo launchctl kickstart -k system/com.saltstack.salt.api` |
| Stop master | `sudo launchctl bootout system/com.saltstack.salt.master` |
| Load plist again | `sudo launchctl bootstrap system /Library/LaunchDaemons/com.saltstack.salt.master.plist` |
| Check master log | `tail -f /var/log/salt/master` |
| List minion keys | `sudo /opt/salt/salt-key -L` |

## Minion Bootstrap

### How the Minion Finds Its Master

There's no DNS magic, no service discovery, no consul. The minion finds its master because Ansible writes the master's IP address directly into `/etc/salt/minion` during bootstrap. Here's the complete picture.

## /etc/salt/minion — The Config That Wires Everything

The bootstrap playbook (`bootstrap_mac_mini.yml`) writes this config on every node:

```bash
master:
  - 192.0.2.64    # mm (primary salt-master, macOS)
  - 192.0.2.10    # cylon (secondary, Linux)

master_type: failover    # try masters in order, switch on failure
master_alive_interval: 60  # probe master every 60 s
master_tries: -1           # keep trying forever (don't give up)
random_master: True        # randomise order on start (load spread)

id: Abhisheks-Mac-mini     # minion ID — set at bootstrap, stable
log_level: info
log_file: /var/log/salt/minion
encryption_algorithm: OAEP-SHA1  # required by salt 3006+
```

<aside class="callout"><strong class="callout__title">No /etc/hosts entry needed.</strong><div class="callout__body">The master address is a LAN IP (e.g. <code>192.0.2.64</code>). The minion resolves it via normal unicast routing — no DNS, no host file. This is intentional: adding a hostname-based entry would require DNS infrastructure that may not exist. IP addresses are stable for fixed Mac Minis.</div></aside>

Minion → Master Authentication Flow (First Contact)

<svg viewBox="0 0 760 290" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#D97706"></path>
        </marker>
        <marker id="arr4" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
        </marker>
        <marker id="arr5" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c3aed"></path>
        </marker>
      </defs>
      <rect x="24" y="110" width="140" height="60" rx="8" fill="#E0E7FF" stroke="#6366F1" stroke-width="2"></rect>
      <text x="94" y="136" text-anchor="middle" fill="#3730A3" font-size="11" font-weight="700">salt-minion</text>
      <text x="94" y="153" text-anchor="middle" fill="#4F46E5" font-size="11">Mac Mini node</text>
      <circle cx="94" cy="140" r="46" fill="none" stroke="#444ce7" stroke-width="1.2" opacity="0">
        <animate attributeName="r" values="46;72" dur="2.2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.5;0" dur="2.2s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="596" y="110" width="140" height="60" rx="8" fill="#DCFCE7" stroke="#16A34A" stroke-width="2"></rect>
      <text x="666" y="136" text-anchor="middle" fill="#15803D" font-size="11" font-weight="700">salt-master</text>
      <text x="666" y="153" text-anchor="middle" fill="#15803D" font-size="10">192.0.2.64:4505</text>
      <rect x="220" y="34" width="160" height="44" rx="6" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="300" y="54" text-anchor="middle" fill="#92400E" font-size="11" font-weight="600">1. Send Public Key</text>
      <text x="300" y="70" text-anchor="middle" fill="#92400E" font-size="10">minion.pub → master</text>
      <rect x="390" y="115" width="150" height="44" rx="6" fill="#EDE9FE" stroke="#7c3aed" stroke-width="1.5"></rect>
      <text x="465" y="135" text-anchor="middle" fill="#6D28D9" font-size="11" font-weight="600">2. Key Pending</text>
      <text x="465" y="151" text-anchor="middle" fill="#6D28D9" font-size="10">kri UI → Accept key</text>
      <rect x="220" y="200" width="160" height="44" rx="6" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="300" y="219" text-anchor="middle" fill="#15803D" font-size="11" font-weight="600">3. Key Accepted</text>
      <text x="300" y="235" text-anchor="middle" fill="#15803D" font-size="10">Encrypted comms begin</text>
      <line x1="164" y1="120" x2="196" y2="120" stroke="#D97706" stroke-width="1.5"></line>
      <line x1="196" y1="120" x2="196" y2="56" stroke="#D97706" stroke-width="1.5"></line>
      <line x1="196" y1="56" x2="218" y2="56" stroke="#D97706" stroke-width="1.5" marker-end="url(#arr3)"></line>
      <line x1="380" y1="56" x2="552" y2="56" stroke="#D97706" stroke-width="1.5"></line>
      <line x1="552" y1="56" x2="552" y2="130" stroke="#D97706" stroke-width="1.5"></line>
      <line x1="552" y1="130" x2="594" y2="130" stroke="#D97706" stroke-width="1.5" marker-end="url(#arr3)"></line>
      <line x1="594" y1="140" x2="542" y2="140" stroke="#7c3aed" stroke-width="1.5" marker-end="url(#arr5)"></line>
      <line x1="465" y1="159" x2="465" y2="222" stroke="#16A34A" stroke-width="1.5"></line>
      <line x1="465" y1="222" x2="382" y2="222" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr4)"></line>
      <line x1="220" y1="222" x2="166" y2="222" stroke="#16A34A" stroke-width="1.5"></line>
      <line x1="166" y1="222" x2="166" y2="172" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr4)"></line>
      <rect x="24" y="210" width="140" height="46" rx="6" fill="#DBEAFE" stroke="#2563EB" stroke-width="1"></rect>
      <text x="94" y="228" text-anchor="middle" fill="#1E40AF" font-size="10" font-weight="600">Optional: Pre-seed</text>
      <text x="94" y="243" text-anchor="middle" fill="#1E40AF" font-size="10">master.pub baked in</text>
      <text x="94" y="256" text-anchor="middle" fill="#1E40AF" font-size="10">→ Skip step 1 delay</text>
    </svg>

## Key Pre-Seeding

On first contact, the minion sends its public key to the master and waits for acceptance (TOFU — Trust On First Use). This can take minutes if an admin has to manually accept.

kri optionally pre-seeds the **master's public key** onto the minion at bootstrap time:

```bash
# Written to:
/etc/salt/pki/minion/minion_master.pub

# Sourced from:
deploy/salt-pki/master.pub  # stable across provisions
```

With the master's key already trusted, the minion skips re-authentication on reconnect — it just verifies the master's signature and connects immediately.

## Multi-Master Failover

When `master_type: failover` is set with a list of masters, the minion:

-   1

    Connect to first reachable master

    From the random-shuffled list (random\_master: True)

-   2

    Probe master every 60 s

    master\_alive\_interval checks the connection is still healthy

-   3

    Failover on detect

    If probe fails, minion tries the next master in the list

-   4

    Never gives up

    master\_tries: -1 means infinite retry — good for reboots

<aside class="callout"><strong class="callout__title">Note:</strong><div class="callout__body"><code>master_shuffle: True</code> was renamed to <code>random_master: True</code> in Salt 3006. Always use <code>random_master</code> with 3007.</div></aside>

## How Ansible Builds the Master List

The bootstrap playbook receives `salt_masters` as an extra-var (list of IPs). It uses a Jinja2 loop to produce the YAML list format:

```bash
# In bootstrap_mac_mini.yml
master:
{% for m in salt_masters %}
  - {{ m }}
{% endfor %}
```

kri passes `salt_masters` from the `SaltMaster` DB table — it queries all enabled masters and builds the list at dispatch time. This means the minion config always reflects the current set of kri-managed masters, not a hardcoded value.

## Why OAEP-SHA1?

Salt 3006+ changed the default encryption algorithm for the minion→master authentication handshake. The minion must declare the algorithm explicitly or authentication silently fails.

| Salt Version | Default Algorithm | Config Required |
| --- | --- | --- |
| < 3006 | OAEP (implied) | No |
| ≥ 3006 | None enforced — must declare | `encryption_algorithm: OAEP-SHA1` |

Without this key, Salt 3007 minions connecting to a Salt 3007 master produce confusing auth errors. Always set it explicitly.

## Salt-API & Auth

### salt-api: The HTTP Control Plane

salt-api is a CherryPy-based HTTP server that wraps the salt bus. kri's API/worker containers use it to run commands on minions, manage keys, and query fleet status — all over HTTPS from a Docker container to the native salt-master on the Mac Mini.

## Why salt-api Exists

Salt's native transport (ZeroMQ) is not accessible from Python code running in a separate process or container without installing the full salt Python package. salt-api solves this: it exposes an HTTP/JSON interface that any language or container can call.

kri uses the `rest_cherrypy` backend (salt's built-in WSGI server). It handles auth, dispatches to the salt bus, and returns JSON.

<aside class="callout"><strong class="callout__title">Salt 3006+ Breaking Change:</strong><div class="callout__body">All netapi clients (<code>local</code>, <code>local_async</code>, <code>runner</code>, <code>wheel</code>) are <em>disabled by default</em>. Every client kri uses must be explicitly enabled in master config. Without this, salt-api returns <code>400 Client disabled</code> even with valid credentials.</div></aside>

## salt-api.conf

```bash
rest_cherrypy:
  port: 4507
  disable_ssl: false
  ssl_crt: /etc/salt/pki/api/salt-api.crt
  ssl_key: /etc/salt/pki/api/salt-api.key
  webhook_disable_auth: false
```

TLS is terminated at salt-api itself. The cert is self-signed (generated by `api_tls.yml`). kri connects with `verify=False` since the cert is internal — the encryption is still active, only verification is skipped.

## netapi\_enable\_clients

```bash
# In /etc/salt/master.d/kri.conf
netapi_enable_clients:
  - local        # target.function calls
  - local_async  # non-blocking exec
  - runner       # fleet-wide status
  - wheel        # key management
```

Without all four entries, kri's probe and command endpoints return 400 or 500. This is the most common misconfiguration on an existing salt-master being brought into kri.

## Authentication — PAM User + external\_auth ACL

salt-api supports multiple auth backends (`eauth`). kri uses **PAM** — the simplest approach: a real OS-level user whose credentials are verified by Linux/macOS's Pluggable Authentication Modules.

The role creates a dedicated system account:

```bash
# api_user.yml (macOS)
sysadminctl -addUser krisalt \
  -fullName "kri Salt API" \
  -password "{{ kri_salt_api_password }}" \
  -roleAccount     # no home dir, no login shell
```

Then `kri.conf` maps this user to an ACL via `external_auth`:

## external\_auth ACL — Least-Privilege by Design

```bash
external_auth:
  pam:
    krisalt:
      # Local client — execute these salt functions on minions
      - 'test.ping'
      - 'grains.items'
      - 'state.apply'
      - 'cmd.run'
      - 'pkg.install'
      - 'service.restart'
            … (full function list in kri.conf) …

      # Wheel client — key operations only
      - '@wheel':
        - 'key.list_all'
        - 'key.accept'
        - 'key.reject'
        - 'key.delete'

      # Runner client — fleet status only
      - '@runner':
        - 'manage.up'
        - 'manage.versions'
        - 'manage.status'
```

The ACL enforces that `krisalt` can _only_ call functions in this list — nothing else, regardless of what kri's API sends. This is the second security layer after the PAM password check.

kri → salt-api → salt-master — Request Flow

<svg viewBox="0 0 760 230" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr6" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6B7280"></path>
        </marker>
        <marker id="arr7" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
        </marker>
      </defs>
      <rect x="12" y="80" width="130" height="60" rx="8" fill="#E0E7FF" stroke="#6366F1" stroke-width="2"></rect>
      <text x="77" y="105" text-anchor="middle" fill="#3730A3" font-size="11" font-weight="700">kri Worker</text>
      <text x="77" y="122" text-anchor="middle" fill="#4F46E5" font-size="11">Docker container</text>
      <circle cx="77" cy="110" r="42" fill="none" stroke="#444ce7" stroke-width="1.2" opacity="0">
        <animate attributeName="r" values="42;64" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <rect x="200" y="58" width="168" height="110" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="284" y="83" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">salt-api</text>
      <text x="284" y="100" text-anchor="middle" fill="#4B5563" font-size="10">HTTPS :4507</text>
      <rect x="214" y="108" width="140" height="44" rx="5" fill="#FEF3C7" stroke="#D97706" stroke-width="1"></rect>
      <text x="284" y="126" text-anchor="middle" fill="#92400E" font-size="10" font-weight="600">PAM Auth Check</text>
      <text x="284" y="142" text-anchor="middle" fill="#92400E" font-size="10">krisalt + ACL verify</text>
      <rect x="430" y="58" width="152" height="110" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="506" y="83" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">salt-master</text>
      <text x="506" y="100" text-anchor="middle" fill="#4B5563" font-size="10">ZeroMQ bus</text>
      <rect x="444" y="108" width="124" height="44" rx="5" fill="#DCFCE7" stroke="#16A34A" stroke-width="1"></rect>
      <text x="506" y="126" text-anchor="middle" fill="#15803D" font-size="10" font-weight="600">Dispatch</text>
      <text x="506" y="142" text-anchor="middle" fill="#15803D" font-size="10">local / runner / wheel</text>
      <rect x="644" y="83" width="96" height="58" rx="8" fill="#EDE9FE" stroke="#7c3aed" stroke-width="1.5"></rect>
      <text x="692" y="108" text-anchor="middle" fill="#6D28D9" font-size="11" font-weight="700">Minions</text>
      <text x="692" y="125" text-anchor="middle" fill="#6D28D9" font-size="10">:4505/:4506</text>
      <line x1="142" y1="110" x2="198" y2="110" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr6)"></line>
      <text x="170" y="103" text-anchor="middle" fill="#4B5563" font-size="10" font-weight="600">POST /run</text>
      <line x1="368" y1="113" x2="428" y2="113" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr6)"></line>
      <line x1="582" y1="112" x2="642" y2="112" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr6)"></line>
      <text x="612" y="105" text-anchor="middle" fill="#4B5563" font-size="10" font-weight="600">ZMQ</text>
      <circle r="4" fill="#444ce7">
        <animateMotion dur="1.4s" repeatCount="indefinite">
          <mpath href="#path-req"></mpath>
        </animateMotion>
      </circle>
      <path id="path-req" d="M142,110 L198,110" fill="none"></path>
      <circle r="4" fill="#6B7280">
        <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.4s">
          <mpath href="#path-bus"></mpath>
        </animateMotion>
      </circle>
      <path id="path-bus" d="M368,113 L428,113" fill="none"></path>
      <circle r="4" fill="#7c3aed">
        <animateMotion dur="1.2s" repeatCount="indefinite" begin="0.8s">
          <mpath href="#path-zmq"></mpath>
        </animateMotion>
      </circle>
      <path id="path-zmq" d="M582,112 L642,112" fill="none"></path>
    </svg>

## Client Types — What kri Actually Calls

| Client | What It Does | Example Call | ACL Prefix |
| --- | --- | --- | --- |
| `local` | Execute a function on targeted minion(s) (synchronous) | `test.ping`, `state.apply` | (function name directly) |
| `local_async` | Same as local but returns a job ID immediately | Long-running state runs | (function name directly) |
| `runner` | Fleet-wide status commands that run on the master itself | `manage.up`, `manage.versions` | `@runner` |
| `wheel` | Manage master-side state: keys, configs | `key.list_all`, `key.accept` | `@wheel` |

## kri's Probe — How It Verifies a Master Is Healthy

kri runs a structured probe (`SaltMasterProbe`) whenever "Test connection" is clicked or the background poll fires. It checks in order:

-   1

    DNS

    `socket.getaddrinfo(address)` — the master's IP/hostname resolves

-   2

    TCP 4505 / 4506

    ZeroMQ publish and return ports are open and accepting connections

-   3

    salt\_api\_auth

    POST to `/run` with `client=runner, fun=manage.up` — confirms auth works and the runner client is enabled

-   4

    key\_store

    POST with `client=wheel, fun=key.list_all` — confirms wheel access and PKI is intact

-   5

    version / minions\_up

    `manage.versions` and `manage.up` — reports fleet version consistency and live minion count

<aside class="callout"><strong class="callout__title">All 7 checks must pass</strong><div class="callout__body">for the master to show as <code>healthy</code> in kri. A single fail makes it <code>unreachable</code>; a warning makes it <code>degraded</code>.</div></aside>

## Common Failure Modes and Fixes

| Symptom | Root Cause | Fix |
| --- | --- | --- |
| `salt_api_auth: 400 Client disabled` | `netapi_enable_clients` missing from master config | Add all 4 clients to `/etc/salt/master.d/kri.conf` and restart |
| `salt_api_auth: 500` on `runner.X` | Function not in `@runner` ACL, or calling a local function via runner client | Verify function name is in `@runner` ACL (e.g. `manage.up` not `test.ping`) |
| `key_store: 500` | Calling `key.list_all` via `client=runner` (should be `wheel`) | Use `client=wheel` for all `key.*` functions |
| `salt_api_auth: 401` | Wrong password, or `krisalt` user not created | Re-run provision to reset the PAM user password |
| tcp_4505/4506 fail | salt-master not running, or firewall blocking | `sudo launchctl kickstart -k system/com.saltstack.salt.master` |

## Worked Example — Two-Step salt-api Flow

Every salt-api session is two calls: obtain a token, then use it. kri's `SaltAPIClient` does exactly this on every request.

**Step 1 — Login (exchange PAM credentials for a session token):**

```bash
# POST /login — PAM credentials for krisalt
curl -sk -X POST https://192.0.2.64:4507/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"krisalt","password":"<secret>","eauth":"pam"}'

# Response
{
  "return": [{
    "token":  "e3b0c44298fc1c149afb...",  # use this in step 2
    "expire": 1750524123.4,
    "user":   "krisalt",
    "eauth":  "pam",
    "perms":  ["test.ping", "@wheel", "@runner", ...]
  }]
}
```

**Step 2 — Run a salt-api call (using the token from step 1):**

```bash
# POST /run — fleet-wide minion status via runner
curl -sk -X POST https://192.0.2.64:4507/run \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: e3b0c44298fc1c149afb...' \
  -d '{"client":"runner","fun":"manage.up"}'

# Response — list of minions currently up
{
  "return": [[
    "Abhisheks-Mac-mini",
    "DKs-Mac-mini",
    "Cyruss-Mac-mini"
  ]]
}
```

<aside class="callout"><strong class="callout__title">Token lifetime:</strong><div class="callout__body">The default CherryPy token expires after 12 hours. kri re-authenticates automatically on each probe cycle — it never caches tokens across requests to avoid stale-auth failures.</div></aside>

## Probe Checks → Exact salt-api Calls

Every check in `SaltMasterProbe` maps to a concrete socket operation or salt-api POST:

| Check Name | Type | Exact Call | What It Verifies |
| --- | --- | --- | --- |
| `dns` | Socket | `socket.getaddrinfo(address, None)` | Master IP/hostname is resolvable from the kri container |
| `tcp_4505` | Socket | `socket.connect((address, 4505))` | ZeroMQ publish port open (minions subscribe here) |
| `tcp_4506` | Socket | `socket.connect((address, 4506))` | ZeroMQ return port open (minions return results here) |
| `salt_api_auth` | HTTP POST | `client=runner, fun=manage.up` | PAM auth works; runner client enabled; salt bus reachable |
| `key_store` | HTTP POST | `client=wheel, fun=key.list_all` | Wheel ACL works; PKI directory readable by salt-master |
| `version` | HTTP POST | `client=runner, fun=manage.versions` | Consistent Salt version across master and connected minions |
| `minions_up` | HTTP POST | `client=runner, fun=manage.up` | At least one minion is currently connected and responsive |

<aside class="callout"><strong class="callout__title">Security Model — Defense in Depth</strong><div class="callout__body"><br><br>
    Four independent layers protect the salt-api surface:<br><br>
    <strong>1. PAM password check</strong> — krisalt's OS password must match. No token is issued without a valid PAM session.<br>
    <strong>2. external_auth ACL</strong> — Even with a valid token, every function call is checked against the per-user allowlist in <code>kri.conf</code>. Calling anything not listed returns 403.<br>
    <strong>3. TLS at rest_cherrypy</strong> — All traffic is encrypted via the self-signed cert on port 4507. Credentials are never sent in plaintext.<br>
    <strong>4. LAN-only, not Tailscale</strong> — salt-api binds to the LAN interface (192.168.x.x). Traffic never traverses DERP relays. The attack surface is physically bounded to the local network.</div></aside>

## TL;DR — How It All Fits Together

-   1

    kri provisions via Ansible

    Docker → SSH → installs salt 3007.14 PKG, writes configs, creates launchd plists

-   2

    salt-master and salt-api start as root launchd daemons

    KeepAlive + RunAtLoad ensure they survive reboots and crashes

-   3

    Minions connect via LAN IP

    Ansible writes the master IP list directly into /etc/salt/minion — no DNS needed

-   4

    kri controls everything via salt-api HTTPS

    POST /login → token; POST /run with token → salt executes; PAM + ACL enforce least privilege

-   5

    SaltMasterProbe validates health end-to-end

    7 checks: DNS → TCP → auth → wheel → runner — all must pass for status = healthy

## Liveness vs Freshness

### Liveness ≠ Freshness — Why a Running Minion Still Goes Stale

The single most important operational insight: **launchd guarantees process liveness**, but kri's "stale" badge measures **data freshness**. A salt-minion can be perfectly alive — process running, KeepAlive respawning on crash, RunAtLoad started at boot — while the node simultaneously shows a stale badge in kri, because the two signals are completely independent of each other.

## The Two Signals

| Signal | What It Means | Who Guarantees It |
| --- | --- | --- |
| Process Liveness | salt-minion / salt-master / salt-api process is running | launchd — `RunAtLoad` starts on boot; `KeepAlive` respawns on crash with a 5 s throttle |
| Data Freshness | kri refreshed `last_seen_at` for this node recently | the presence-refresh chain (pull path via Celery beat + push path via grain_report) |

<aside class="callout"><strong class="callout__title">Key insight:</strong><div class="callout__body">kri's node status is computed purely as <code>now &#8722; last_seen_at</code>. Nothing about the badge inspects whether any process is alive. The thresholds (from <code>node_status.classify_status</code>): <strong>&#8804; 15 min = online</strong>, <strong>15 min&#8211;4 h = stale</strong>, <strong>&gt; 4 h = offline</strong>.</div></aside>

## Two Paths That Refresh `last_seen_at`

A node stays online only while at least one of the two paths keeps firing. Miss both for 15 minutes and the badge flips to stale.

### Pull Path

-   1

    Celery beat fires every 90 s

    `sync_minion_presence` task — `salt_presence_tasks.py:126`

-   2

    Calls `runner manage.up`

    Sent to the **default-flagged master only** via salt-api HTTPS

-   3

    Sets `last_seen_at = now`

    For every minion returned in the up-list

### Push Path

-   1

    Minion runs `grain_report` state

    On its own scheduled interval — pillar provides `ingest_url` + `node_token`

-   2

    POSTs grains to kri ingest API

    HTTP POST to `/ingest` with the node's grain data

-   3

    Sets `last_seen_at = now`

    `ingest.py:242` — ingest handler writes the timestamp directly

<aside class="callout"><strong class="callout__title">mark_stale_nodes</strong><div class="callout__body">runs every <strong>5 min</strong> and applies the thresholds: online &#8594; stale (gap &gt; 15 min), stale &#8594; offline (gap &gt; 4 h). A node goes stale only when <em>both</em> refresh paths stop updating it for 15 minutes.</div></aside>

Presence Refresh Paths — Pull + Push → last\_seen\_at → Status Badge

<svg viewBox="0 0 780 320" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-s1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#6B7280"></path>
        </marker>
        <marker id="arr-s-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path>
        </marker>
        <marker id="arr-s-grn" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
        </marker>
        <marker id="arr-s-ora" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#D97706"></path>
        </marker>
        <marker id="arr-s-pur" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#7c3aed"></path>
        </marker>
      </defs>
      <rect x="24" y="44" width="148" height="60" rx="8" fill="#DBEAFE" stroke="#2563EB" stroke-width="2"></rect>
      <text x="98" y="69" text-anchor="middle" fill="#1E40AF" font-size="12" font-weight="700">kri Beat Task</text>
      <text x="98" y="86" text-anchor="middle" fill="#1E40AF" font-size="11">sync_minion_presence</text>
      <text x="98" y="101" text-anchor="middle" fill="#3B82F6" font-size="10">every 90 s</text>
      <circle cx="98" cy="74" r="40" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="40;66" dur="2s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values="0.55;0" dur="2s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="172" y1="74" x2="266" y2="74" stroke="#2563EB" stroke-width="1.5" marker-end="url(#arr-s-blue)"></line>
      <text x="219" y="66" text-anchor="middle" fill="#2563EB" font-size="10" font-weight="600">manage.up</text>
      <rect x="268" y="44" width="156" height="60" rx="8" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="346" y="69" text-anchor="middle" fill="#15803D" font-size="11" font-weight="700">Default Master</text>
      <text x="346" y="86" text-anchor="middle" fill="#15803D" font-size="10">salt-api HTTPS</text>
      <text x="346" y="101" text-anchor="middle" fill="#15803D" font-size="10">runner manage.up</text>
      <line x1="424" y1="74" x2="516" y2="74" stroke="#16A34A" stroke-width="1.5" marker-end="url(#arr-s-grn)"></line>
      <text x="470" y="66" text-anchor="middle" fill="#15803D" font-size="10" font-weight="600">up-list</text>
      <rect x="24" y="196" width="148" height="60" rx="8" fill="#EDE9FE" stroke="#7c3aed" stroke-width="2"></rect>
      <text x="98" y="221" text-anchor="middle" fill="#6D28D9" font-size="12" font-weight="700">salt-minion</text>
      <text x="98" y="238" text-anchor="middle" fill="#6D28D9" font-size="11">grain_report state</text>
      <text x="98" y="253" text-anchor="middle" fill="#7c3aed" font-size="10">scheduled by Salt</text>
      <circle cx="98" cy="226" r="40" fill="none" stroke="#7c3aed" stroke-width="1.5" opacity="0">
        <animate attributeName="r" values="40;66" dur="2.3s" repeatCount="indefinite" begin="0.6s"></animate>
        <animate attributeName="opacity" values="0.5;0" dur="2.3s" repeatCount="indefinite" begin="0.6s"></animate>
      </circle>
      <line x1="172" y1="226" x2="266" y2="226" stroke="#7c3aed" stroke-width="1.5" marker-end="url(#arr-s-pur)"></line>
      <text x="219" y="218" text-anchor="middle" fill="#7c3aed" font-size="10" font-weight="600">POST /ingest</text>
      <rect x="268" y="196" width="156" height="60" rx="8" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="346" y="221" text-anchor="middle" fill="#92400E" font-size="11" font-weight="700">kri Ingest API</text>
      <text x="346" y="238" text-anchor="middle" fill="#92400E" font-size="10">ingest.py:242</text>
      <text x="346" y="253" text-anchor="middle" fill="#92400E" font-size="10">grains + node_token</text>
      <line x1="424" y1="226" x2="470" y2="226" stroke="#D97706" stroke-width="1.5"></line>
      <line x1="470" y1="226" x2="470" y2="136" stroke="#D97706" stroke-width="1.5"></line>
      <line x1="470" y1="136" x2="516" y2="136" stroke="#D97706" stroke-width="1.5" marker-end="url(#arr-s-ora)"></line>
      <text x="484" y="185" text-anchor="middle" fill="#D97706" font-size="10" font-weight="600">write ts</text>
      <rect x="518" y="52" width="120" height="100" rx="8" fill="#F3F4F6" stroke="#6B7280" stroke-width="2"></rect>
      <text x="578" y="82" text-anchor="middle" fill="#111827" font-size="11" font-weight="700">last_seen_at</text>
      <text x="578" y="100" text-anchor="middle" fill="#4B5563" font-size="10">PostgreSQL field</text>
      <text x="578" y="118" text-anchor="middle" fill="#4B5563" font-size="10">updated by either</text>
      <text x="578" y="133" text-anchor="middle" fill="#4B5563" font-size="10">refresh path</text>
      <line x1="578" y1="152" x2="578" y2="196" stroke="#6B7280" stroke-width="1.5" marker-end="url(#arr-s1)"></line>
      <rect x="510" y="198" width="136" height="60" rx="8" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="578" y="223" text-anchor="middle" fill="#991B1B" font-size="11" font-weight="700">mark_stale_nodes</text>
      <text x="578" y="240" text-anchor="middle" fill="#991B1B" font-size="10">Celery beat — every 5 min</text>
      <text x="578" y="255" text-anchor="middle" fill="#991B1B" font-size="10">applies 15 min / 4 h cutoffs</text>
      <line x1="646" y1="228" x2="706" y2="228" stroke="#DC2626" stroke-width="1.5" marker-end="url(#arr-s1)"></line>
      <rect x="708" y="204" width="48" height="50" rx="8" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="732" y="226" text-anchor="middle" fill="#92400E" font-size="10" font-weight="700">stale</text>
      <text x="732" y="243" text-anchor="middle" fill="#92400E" font-size="10">badge</text>
      <text x="98" y="28" text-anchor="middle" fill="#2563EB" font-size="11" font-weight="700">Pull Path (90 s)</text>
      <text x="98" y="182" text-anchor="middle" fill="#7c3aed" font-size="11" font-weight="700">Push Path (grain_report)</text>
      <circle r="4" fill="#2563EB">
        <animateMotion dur="1.5s" repeatCount="indefinite">
          <mpath href="#sp-pull-1"></mpath>
        </animateMotion>
      </circle>
      <path id="sp-pull-1" d="M172,74 L266,74" fill="none"></path>
      <circle r="4" fill="#16A34A">
        <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.5s">
          <mpath href="#sp-pull-2"></mpath>
        </animateMotion>
      </circle>
      <path id="sp-pull-2" d="M424,74 L516,74" fill="none"></path>
      <circle r="4" fill="#7c3aed">
        <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.3s">
          <mpath href="#sp-push-1"></mpath>
        </animateMotion>
      </circle>
      <path id="sp-push-1" d="M172,226 L266,226" fill="none"></path>
      <circle r="4" fill="#D97706">
        <animateMotion dur="2.2s" repeatCount="indefinite" begin="0.8s">
          <mpath href="#sp-push-2"></mpath>
        </animateMotion>
      </circle>
      <path id="sp-push-2" d="M424,226 L470,226 L470,136 L516,136" fill="none"></path>
      <circle r="4" fill="#6B7280">
        <animateMotion dur="1.8s" repeatCount="indefinite" begin="1.1s">
          <mpath href="#sp-stale"></mpath>
        </animateMotion>
      </circle>
      <path id="sp-stale" d="M578,152 L578,198" fill="none"></path>
      <circle r="4" fill="#DC2626">
        <animateMotion dur="1.2s" repeatCount="indefinite" begin="1.5s">
          <mpath href="#sp-badge"></mpath>
        </animateMotion>
      </circle>
      <path id="sp-badge" d="M646,228 L706,228" fill="none"></path>
    </svg>

## Why the Pull Path Breaks

| Cause | What Happens | Scope |
| --- | --- | --- |
| **Wrong master polled — multi-master failover** | kri polls only the master flagged `is_default`. With `master_type: failover` + `random_master: True`, a minion may attach to a non-default master (e.g. `cylon`) while kri polls `mm1`. `manage.up` on `mm1` will not list it → stale, even though the minion is healthily connected. | Per-node |
| **Default master's salt-api broken** | Any error from salt-api (Salt 3006+ `netapi_enable_clients` 400, runner/wheel ACL 500, expired PAM password, TLS failure) returns nothing → *no node* is refreshed. The entire fleet goes stale in 15 min and offline in 4 h. | Fleet-wide |
| **No master flagged default** | The query `WHERE is_default IS TRUE` returns nothing → the task skips entirely → everything stale. | Fleet-wide |
| **`manage.up` is a live ping with a short timeout** | The runner pings every minion and waits a few seconds. A slow, loaded, or briefly unresponsive minion misses that window and is absent from the up-list, causing it to flap in and out of the stale state. | Per-node |

## Why the Push Path Breaks

-   1

    macOS sleep / App Nap / Power Nap

    A Mac Mini that sleeps suspends all scheduled Salt states. `KeepAlive` keeps the process _registered_ with launchd, but a sleeping Mac runs no schedule — no heartbeat is sent. Operational fix: `sudo pmset -a sleep 0 powernap 0 disablesleep 1` on always-on fleet nodes.

-   2

    Missing pillar

    The grain\_report state needs `ingest_url` + `node_token` from pillar. If pillar was not rendered or the minion attached to a master that lacks it, the heartbeat silently no-ops — no POST is ever sent.

-   3

    Key pending or rejected

    After a master rebuild or re-key, the minion process runs but cannot exchange jobs. The minion appears alive to launchd but is invisible to both refresh paths.

-   4

    Clock skew

    Freshness is computed as `now − last_seen_at`. A skewed clock on the minion host or the kri server distorts this calculation — a node can appear stale even though `last_seen_at` was just written.

<aside class="callout"><strong class="callout__title">On "they don’t start automatically":</strong><div class="callout__body">The master and salt-api plists ARE configured to auto-start (<code>RunAtLoad</code>) and respawn (<code>KeepAlive</code>) — verified in the kri repo templates. If they genuinely do not come up at boot, the usual macOS causes are: a crash-loop (check <code>sudo launchctl print system/com.saltstack.salt.master</code> and <code>/var/log/salt/master-error</code>), wrong plist location or permissions (must be <code>/Library/LaunchDaemons/</code>, owned <code>root:wheel</code>, mode <code>0644</code>), or the Mac sleeping. The throttle is 5 s, so a crash-looping daemon retries every 5 s.</div></aside>

<aside class="callout"><strong class="callout__title">Honesty caveats — what is NOT verified here:</strong><div class="callout__body"><br><br>
    The <strong>minion</strong> launchd plist is installed by the Salt PKG installer, NOT the kri repo — verify its <code>RunAtLoad</code>/<code>KeepAlive</code> keys on the host with <code>sudo launchctl print system/com.saltstack.salt.minion</code>.<br><br>
    Which master each minion is currently attached to is runtime state — check on the master with <code>sudo /opt/salt/salt-run manage.up</code> and on the minion with <code>salt-call --local grains.get master</code>.</div></aside>

## Operator’s Triage Checklist — Node Shows Stale

-   1

    Is the minion process alive?

    `sudo launchctl print system/com.saltstack.salt.minion` on the node — check state is `running`.

-   2

    Which master is it connected to?

    `salt-call --local config.get master` on the node — is that address the kri default master?

-   3

    Does the DEFAULT master see it?

    `sudo /opt/salt/salt-run manage.up` on the default master — is the node’s minion ID in the list?

-   4

    Is salt-api answering for kri?

    kri UI → Masters → "Test connection" on the default master — all 7 probe checks must be green.

-   5

    Is the Mac asleep?

    `pmset -g` on the node — check `sleep` and `powernap` settings. Always-on fleet nodes must have sleep disabled.

-   6

    Is the key accepted?

    `sudo /opt/salt/salt-key -L` on the default master — the minion ID must appear under _Accepted Keys_, not _Unaccepted_ or _Rejected_.

<aside class="callout"><strong class="callout__title">TL;DR:</strong><div class="callout__body">&#8220;Stale&#8221; is a freshness alarm, not a crash alarm. launchd keeps the processes up; staleness means the refresh chain — minion &#8594; ingest, or kri &#8594; default-master <code>manage.up</code> — was broken for 15 minutes. In a multi-master fleet the <strong>#1 cause</strong> is a minion attached to a non-default master that kri never polls. Fleet-wide staleness almost always means the default master&#8217;s salt-api is down.</div></aside>
