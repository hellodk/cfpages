---
title: "Salt — Complete Visual Guide"
date: 2026-05-30
description: "SaltStack is a remote execution and configuration management system. One salt-master controls many salt-minions over encrypted ZeroMQ channels. Everything is event-driven and asynchronous."
tags: [saltstack, devops, automation]
draft: false
---

Every concept explained with animated diagrams · Salt 3007.x (Chlorine) · Built for the kri Mac Mini fleet platform

## Architecture · Data · kri

### Salt Architecture — All Components

SaltStack is a remote execution and configuration management system. One **salt-master** controls many **salt-minions** over encrypted ZeroMQ channels. Everything is event-driven and asynchronous.

Complete salt architecture — animated

<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="480" fill="#F8FAFC"></rect>
      <rect x="10" y="10" width="880" height="460" rx="12" fill="none" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="450" y="30" text-anchor="middle" font-size="10" fill="#9CA3AF" font-weight="600">Tailscale overlay network (WireGuard encryption)</text>
      <rect x="30" y="50" width="300" height="380" rx="12" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="180" y="80" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">salt-master  (mm1)</text>
      <text x="180" y="96" text-anchor="middle" font-size="10" fill="#a4bbfc">native launchd service · :4505 · :4506 · :8080</text>
      <rect x="46" y="108" width="268" height="42" rx="6" fill="rgba(68,76,231,.2)" stroke="rgba(68,76,231,.4)" stroke-width="1"></rect>
      <text x="90" y="126" font-size="10" fill="#c7d2fe" font-weight="600">Event Bus</text>
      <text x="90" y="141" font-size="9" fill="#818cf8">fire/subscribe to all salt events</text>
      <text x="300" y="133" text-anchor="middle" font-size="16">📡</text>
      <rect x="46" y="158" width="268" height="42" rx="6" fill="rgba(124,58,237,.2)" stroke="rgba(124,58,237,.4)" stroke-width="1"></rect>
      <text x="90" y="176" font-size="10" fill="#c4b5fd" font-weight="600">Pillar</text>
      <text x="90" y="191" font-size="9" fill="#a78bfa">/srv/salt/pillar/ — per-node secrets</text>
      <text x="300" y="183" text-anchor="middle" font-size="16">🔒</text>
      <rect x="46" y="208" width="268" height="42" rx="6" fill="rgba(22,163,74,.15)" stroke="rgba(22,163,74,.35)" stroke-width="1"></rect>
      <text x="90" y="226" font-size="10" fill="#86efac" font-weight="600">File Server</text>
      <text x="90" y="241" font-size="9" fill="#4ade80">/srv/salt/states/ — SLS files served via salt://</text>
      <text x="300" y="229" text-anchor="middle" font-size="16">📁</text>
      <rect x="46" y="258" width="268" height="42" rx="6" fill="rgba(217,119,6,.15)" stroke="rgba(217,119,6,.35)" stroke-width="1"></rect>
      <text x="90" y="276" font-size="10" fill="#fcd34d" font-weight="600">Reactor</text>
      <text x="90" y="291" font-size="9" fill="#fbbf24">event pattern → trigger action</text>
      <text x="300" y="279" text-anchor="middle" font-size="16">⚡</text>
      <rect x="46" y="308" width="268" height="42" rx="6" fill="rgba(220,38,38,.15)" stroke="rgba(220,38,38,.35)" stroke-width="1"></rect>
      <text x="90" y="326" font-size="10" fill="#fca5a5" font-weight="600">PKI / Key Store</text>
      <text x="90" y="341" font-size="9" fill="#f87171">/etc/salt/pki/master/ — RSA key pairs</text>
      <text x="300" y="329" text-anchor="middle" font-size="16">🔑</text>
      <rect x="46" y="358" width="268" height="42" rx="6" fill="rgba(14,165,233,.15)" stroke="rgba(14,165,233,.35)" stroke-width="1"></rect>
      <text x="90" y="376" font-size="10" fill="#7dd3fc" font-weight="600">salt-api</text>
      <text x="90" y="391" font-size="9" fill="#38bdf8">HTTP REST interface · port 8080 · PAM auth</text>
      <text x="300" y="379" text-anchor="middle" font-size="16">🌐</text>
      <rect x="580" y="55" width="170" height="120" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="665" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">mm2</text>
      <text x="665" y="96" text-anchor="middle" font-size="10" fill="#6B7280">salt-minion · Apple M4</text>
      <rect x="596" y="105" width="138" height="18" rx="4" fill="#F3F4F6"></rect>
      <text x="665" y="118" text-anchor="middle" font-size="9" fill="#374151">Schedule: kri_heartbeat (5m)</text>
      <rect x="596" y="128" width="138" height="18" rx="4" fill="#dcfce7"></rect>
      <text x="665" y="141" text-anchor="middle" font-size="9" fill="#166534">Status: ● online</text>
      <circle cx="730" cy="75" r="5" fill="#16A34A"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"></animate></circle>
      <rect x="580" y="195" width="170" height="120" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="665" y="220" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">mm3</text>
      <text x="665" y="236" text-anchor="middle" font-size="10" fill="#6B7280">salt-minion · Apple M2</text>
      <rect x="596" y="245" width="138" height="18" rx="4" fill="#F3F4F6"></rect>
      <text x="665" y="258" text-anchor="middle" font-size="9" fill="#374151">Schedule: kri_heartbeat (5m)</text>
      <rect x="596" y="268" width="138" height="18" rx="4" fill="#dcfce7"></rect>
      <text x="665" y="281" text-anchor="middle" font-size="9" fill="#166534">Status: ● online</text>
      <circle cx="730" cy="215" r="5" fill="#16A34A"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite" begin=".7s"></animate></circle>
      <rect x="580" y="335" width="170" height="100" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="665" y="360" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">mm4</text>
      <text x="665" y="376" text-anchor="middle" font-size="10" fill="#6B7280">salt-minion (pending)</text>
      <rect x="596" y="385" width="138" height="18" rx="4" fill="#fee2e2"></rect>
      <text x="665" y="398" text-anchor="middle" font-size="9" fill="#991b1b">Key: pending acceptance</text>
      <circle cx="730" cy="355" r="5" fill="#D97706"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite"></animate></circle>
      <path d="M332 115 Q460 80 578 115" fill="none" stroke="#444ce7" stroke-width="1.5" stroke-dasharray="5,3" opacity=".5"></path>
      <path d="M332 180 Q460 200 578 235" fill="none" stroke="#444ce7" stroke-width="1.5" stroke-dasharray="5,3" opacity=".5"></path>
      <path d="M332 240 Q460 310 578 375" fill="none" stroke="#9CA3AF" stroke-width="1" stroke-dasharray="4,4" opacity=".4"></path>
      <defs>
        <path id="p1" d="M332,115 Q460,80 578,115"></path>
        <path id="p2" d="M332,180 Q460,200 578,235"></path>
        <path id="p3" d="M332,240 Q460,310 578,375"></path>
        <path id="r1" d="M578,125 Q460,110 332,130"></path>
        <path id="r2" d="M578,245 Q460,220 332,195"></path>
      </defs>
      <circle r="5" fill="#444ce7" opacity=".9"><animateMotion dur="2s" repeatCount="indefinite" begin="0s"><mpath href="#p1"></mpath></animateMotion></circle>
      <circle r="5" fill="#444ce7" opacity=".9"><animateMotion dur="2s" repeatCount="indefinite" begin=".8s"><mpath href="#p2"></mpath></animateMotion></circle>
      <circle r="4" fill="#16A34A"><animateMotion dur="2.5s" repeatCount="indefinite" begin="1.2s"><mpath href="#r1"></mpath></animateMotion></circle>
      <circle r="4" fill="#16A34A"><animateMotion dur="2.5s" repeatCount="indefinite" begin="2s"><mpath href="#r2"></mpath></animateMotion></circle>
      <rect x="400" y="74" width="80" height="16" rx="4" fill="#444ce7"></rect>
      <text x="440" y="85" text-anchor="middle" font-size="9" fill="#fff" font-weight="600">:4505 PUB</text>
      <rect x="400" y="142" width="80" height="16" rx="4" fill="#16A34A"></rect>
      <text x="440" y="153" text-anchor="middle" font-size="9" fill="#fff" font-weight="600">:4506 RETURN</text>
      <rect x="30" y="445" width="560" height="0" rx="8"></rect>
      <text x="450" y="468" text-anchor="middle" font-size="10" fill="#6B7280">kri API/Worker (Docker) ↔ salt-api (:8080) ↔ salt-master event bus</text>
      <path d="M180 358 L180 390 Q180 410 200 415 L750 415 Q790 415 800 385 L800 180 Q800 160 780 155 L752 145" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="5,3" opacity=".6"></path>
      <circle r="4" fill="#0ea5e9"><animateMotion dur="4s" repeatCount="indefinite" path="M180,358 L180,390 Q180,410 200,415 L750,415 Q790,415 800,385 L800,180 Q800,160 780,155 L752,145"></animateMotion></circle>
      <text x="810" y="290" font-size="9" fill="#0ea5e9" transform="rotate(-90,810,290)">kri → salt-api → master</text>
    </svg>

## Core Components

🖥️

salt-master

Control plane. One per fleet. Manages keys, serves state files and pillar, listens on :4505/:4506. In kri: runs natively on mm1 (launchd service).

💻

salt-minion

Agent on each managed node. Subscribes to master events, executes commands locally, returns results. Runs via launchd on macOS.

🌐

salt-api

HTTP REST layer over the master. kri API/worker use it to dispatch ad-hoc commands (test.ping, state.apply). Runs alongside salt-master on mm1.

⚡

salt-call

Run salt functions locally on the minion without going to the master. Used in heartbeat scripts and grain collection (`salt-call grains.items`).

🔑

salt-key

Manage minion RSA keys: list pending/accepted/rejected, accept, reject, delete. kri exposes this via Settings → Minion Keys.

🏃

salt-run

Execute runner modules on the master itself (not on minions). Used for jobs, orchestration, managing jobs cache.

## Communication Model

1

Minion connects

Minion subscribes to master's ZeroMQ PUBLISH socket (:4505). Stays connected. This is a persistent long-lived TCP connection.

2

Master broadcasts job

When you run `salt mm2 test.ping`, master publishes a job to :4505. All minions receive it; only targeted ones execute.

3

Minion executes

Targeted minion runs the function locally (e.g. calls Python code). Completely async — minion doesn't block master.

4

Minion returns

Result is pushed back to master on :4506 (PUSH/PULL socket), tagged with the job ID. Master stores in job cache and returns to caller.

5

Events fire

Every job, return, state run, and minion start/stop fires an event on the master's event bus. Reactor subscriptions trigger on matching patterns.

**Key insight:** Salt never polls minions. All communication is push-based from the master, and minions maintain persistent TCP connections to :4505. This scales to thousands of minions on a single master.

* * *

## kri Integration

kri uses Salt as its fleet control plane. Every Mac Mini runs a salt-minion; mm1 runs the salt-master as a native launchd service. Here is the complete integration map.

kri + Salt complete integration (v0.1.194)

<svg viewBox="0 0 900 360" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="360" fill="#F8FAFC"></rect>
      <rect x="10" y="10" width="530" height="340" rx="12" fill="#F0F4FF" stroke="#444ce7" stroke-width="1.5" stroke-dasharray="6,3"></rect>
      <text x="270" y="32" text-anchor="middle" font-size="11" font-weight="700" fill="#444ce7">Linux Docker Host (Tailscale: 198.51.100.27)</text>
      <rect x="26" y="44" width="498" height="130" rx="10" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="48" y="65" font-size="10" font-weight="600" fill="#6B7280">Docker Compose services</text>
      <rect x="36" y="74" width="90" height="90" rx="6" fill="#444ce7"></rect>
      <text x="81" y="97" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">kri API</text>
      <text x="81" y="112" text-anchor="middle" font-size="9" fill="#c7d2fe">FastAPI</text>
      <text x="81" y="126" text-anchor="middle" font-size="9" fill="#c7d2fe">:8000</text>
      <text x="81" y="140" text-anchor="middle" font-size="9" fill="#c7d2fe">nginx proxy</text>
      <rect x="136" y="74" width="90" height="90" rx="6" fill="#7c3aed"></rect>
      <text x="181" y="97" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">Celery</text>
      <text x="181" y="112" text-anchor="middle" font-size="9" fill="#ddd6fe">Worker</text>
      <text x="181" y="126" text-anchor="middle" font-size="9" fill="#ddd6fe">salt_tasks.py</text>
      <text x="181" y="140" text-anchor="middle" font-size="9" fill="#ddd6fe">→ salt-api</text>
      <rect x="236" y="74" width="90" height="90" rx="6" fill="#0369a1"></rect>
      <text x="281" y="97" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">Postgres</text>
      <text x="281" y="112" text-anchor="middle" font-size="9" fill="#bae6fd">TimescaleDB</text>
      <text x="281" y="126" text-anchor="middle" font-size="9" fill="#bae6fd">nodes, grains</text>
      <text x="281" y="140" text-anchor="middle" font-size="9" fill="#bae6fd">drift, health</text>
      <rect x="336" y="74" width="90" height="90" rx="6" fill="#dc2626"></rect>
      <text x="381" y="97" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">Redis</text>
      <text x="381" y="112" text-anchor="middle" font-size="9" fill="#fecaca">Beat scheduler</text>
      <text x="381" y="126" text-anchor="middle" font-size="9" fill="#fecaca">task queue</text>
      <text x="381" y="140" text-anchor="middle" font-size="9" fill="#fecaca">rate limits</text>
      <rect x="436" y="74" width="82" height="90" rx="6" fill="#16A34A"></rect>
      <text x="477" y="97" text-anchor="middle" font-size="10" font-weight="600" fill="#fff">React</text>
      <text x="477" y="112" text-anchor="middle" font-size="9" fill="#bbf7d0">Frontend</text>
      <text x="477" y="126" text-anchor="middle" font-size="9" fill="#bbf7d0">nginx :80</text>
      <rect x="26" y="188" width="498" height="40" rx="6" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="275" y="206" text-anchor="middle" font-size="10" font-weight="600" fill="#374151">nginx reverse proxy · :80/:443 → api:8000 · Tailscale IP: 198.51.100.27</text>
      <text x="275" y="221" text-anchor="middle" font-size="9" fill="#6B7280">WebSocket support (ip_hash upstream) for SSH/VNC sessions</text>
      <text x="275" y="262" text-anchor="middle" font-size="10" font-weight="600" fill="#374151">Ingest endpoints (called by Mac Minis over Tailscale)</text>
      <rect x="36" y="272" width="148" height="26" rx="4" fill="#dcfce7" stroke="#16A34A" stroke-width="1"></rect>
      <text x="110" y="289" text-anchor="middle" font-size="9" fill="#166534">POST /api/v1/ingest/grains → updates node status</text>
      <rect x="194" y="272" width="148" height="26" rx="4" fill="#dcfce7" stroke="#16A34A" stroke-width="1"></rect>
      <text x="268" y="289" text-anchor="middle" font-size="9" fill="#166534">POST /api/v1/ingest/sbom → SBOM indexing</text>
      <rect x="352" y="272" width="166" height="26" rx="4" fill="#dcfce7" stroke="#16A34A" stroke-width="1"></rect>
      <text x="435" y="289" text-anchor="middle" font-size="9" fill="#166534">POST /api/v1/builds/ingest → Jenkins builds</text>
      <rect x="560" y="10" width="330" height="180" rx="12" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="725" y="35" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">mm1 (198.51.100.75)</text>
      <text x="725" y="52" text-anchor="middle" font-size="10" fill="#a4bbfc">salt-master + salt-api · native launchd · Apple M2</text>
      <rect x="576" y="62" width="138" height="110" rx="8" fill="rgba(68,76,231,.2)" stroke="rgba(68,76,231,.4)" stroke-width="1"></rect>
      <text x="645" y="82" text-anchor="middle" font-size="10" font-weight="600" fill="#a4bbfc">salt-master</text>
      <text x="645" y="97" text-anchor="middle" font-size="9" fill="#818cf8">Pillar: /srv/salt/pillar/</text>
      <text x="645" y="111" text-anchor="middle" font-size="9" fill="#818cf8">States: /srv/salt/states/</text>
      <text x="645" y="125" text-anchor="middle" font-size="9" fill="#818cf8">PKI: /etc/salt/pki/master/</text>
      <text x="645" y="139" text-anchor="middle" font-size="9" fill="#818cf8">ZeroMQ :4505/:4506</text>
      <text x="645" y="153" text-anchor="middle" font-size="9" fill="#818cf8">Reactor: grain on start</text>
      <rect x="724" y="62" width="138" height="110" rx="8" fill="rgba(14,165,233,.15)" stroke="rgba(14,165,233,.35)" stroke-width="1"></rect>
      <text x="793" y="82" text-anchor="middle" font-size="10" font-weight="600" fill="#7dd3fc">salt-api</text>
      <text x="793" y="97" text-anchor="middle" font-size="9" fill="#38bdf8">HTTP :8080</text>
      <text x="793" y="111" text-anchor="middle" font-size="9" fill="#38bdf8">PAM auth: krisalt</text>
      <text x="793" y="125" text-anchor="middle" font-size="9" fill="#38bdf8">POST /run</text>
      <text x="793" y="139" text-anchor="middle" font-size="9" fill="#38bdf8">kri worker calls</text>
      <text x="793" y="153" text-anchor="middle" font-size="9" fill="#38bdf8">this for ad-hoc cmds</text>
      <rect x="560" y="210" width="155" height="70" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="637" y="233" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">mm2 (minion)</text>
      <text x="637" y="249" text-anchor="middle" font-size="9" fill="#6B7280">Heartbeat: 5 min → ingest</text>
      <text x="637" y="263" text-anchor="middle" font-size="9" fill="#16A34A">● online</text>
      <rect x="735" y="210" width="155" height="70" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="812" y="233" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">mm3 (minion)</text>
      <text x="812" y="249" text-anchor="middle" font-size="9" fill="#6B7280">Heartbeat: 5 min → ingest</text>
      <text x="812" y="263" text-anchor="middle" font-size="9" fill="#16A34A">● online</text>
      <defs>
        <marker id="ka" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#0ea5e9"></polygon></marker>
        <marker id="kb" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#444ce7"></polygon></marker>
        <marker id="kc" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#16A34A"></polygon></marker>
      </defs>
      <path d="M226 119 Q390 50 722 119" fill="none" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="5,3"></path>
      <circle r="3" fill="#0ea5e9"><animateMotion dur="3s" repeatCount="indefinite" path="M226,119 Q390,50 722,119"></animateMotion></circle>
      <text x="450" y="48" text-anchor="middle" font-size="9" fill="#0ea5e9">salt-api calls (ad-hoc commands)</text>
      <path d="M637 280 Q400 340 275 285" fill="none" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="4,3"></path>
      <circle r="3" fill="#16A34A"><animateMotion dur="4s" repeatCount="indefinite" path="M637,280 Q400,340 275,285"></animateMotion></circle>
      <path d="M812 280 Q600 340 275 295" fill="none" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="4,3"></path>
      <circle r="3" fill="#16A34A"><animateMotion dur="4s" repeatCount="indefinite" begin="2s" path="M812,280 Q600,340 275,295"></animateMotion></circle>
      <text x="500" y="353" text-anchor="middle" font-size="9" fill="#16A34A">heartbeat POST /api/v1/ingest/grains</text>
      <path d="M645 192 L637 208" stroke="#444ce7" stroke-width="1.5" marker-end="url(#kb)"></path>
      <path d="M793 192 L812 208" stroke="#444ce7" stroke-width="1.5" marker-end="url(#kb)"></path>
    </svg>

## kri Salt Configuration Reference

| Setting | Value | Where |
| --- | --- | --- |
| salt_master_address | 198.51.100.75 | group_vars/all.yml |
| salt_version | 3007.14 | group_vars/all.yml |
| SALT_API_URL | http://198.51.100.75:8080 | .env.docker |
| SALT_API_USER | krisalt | .env.docker |
| Heartbeat interval | 5 minutes | /etc/salt/minion.d/kri-heartbeat.conf |
| Pillar dir | /srv/salt/pillar/ | mm1 (salt-master) |
| States dir | /srv/salt/states/ | mm1 (synced from git) |
| PKI dir | /etc/salt/pki/master/ | mm1 (launchd) |

## kri Salt Flows

1

Node goes online

Minion starts → connects to master → reactor fires → `state.apply base.grain_report` → minion POSTs grains to kri API → node status: online

2

Heartbeat (every 5 min)

`kri_heartbeat` schedule fires → `salt-call --local grains.items` → HTTP POST to ingest API → refreshes `last_seen_at`

3

Quick Actions (UI)

User clicks Test Ping/Reboot → kri API calls Celery → `run_salt_cmd` → POST to salt-api HTTP → ZeroMQ → minion

4

Bootstrap

Ansible playbook (`bootstrap_mac_mini.yml`) installs salt-minion pkg, writes minion config, applies `base.heartbeat` state, POSTs initial grains

5

Mark stale / offline

Celery beat runs `mark_stale_nodes` every 5 min. Nodes stale >15 min, offline >4 hours. Node remains stale/offline until next grain report.

**Install salt-master on mm1:** `ansible-playbook playbooks/setup_salt_master.yml -i playbooks/inventory/hosts.ini -e "kri_salt_api_password=yourpassword"`  
Then update `.env.docker` with SALT\_API\_URL, SALT\_API\_USER, SALT\_API\_PASSWORD.

* * *

## 📊 Data Layer — Grains, Pillar & Mine

### Data — Grains, Pillar & Mine

Three distinct data stores in Salt, each with a different owner, audience, and update mechanism.

Grains vs Pillar vs Mine — who owns it, who sees it

<svg viewBox="0 0 900 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="200" fill="#F8FAFC"></rect>
      <rect x="20" y="30" width="260" height="140" rx="10" fill="#f0fdf4" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="150" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#14532d">Grains</text>
      <text x="150" y="76" text-anchor="middle" font-size="10" fill="#166534">Owner: minion (collected locally)</text>
      <text x="150" y="93" text-anchor="middle" font-size="10" fill="#166534">Audience: master + all minions</text>
      <text x="150" y="110" text-anchor="middle" font-size="10" fill="#166534">Update: on restart or refresh</text>
      <text x="150" y="127" text-anchor="middle" font-size="9" fill="#15803d">os, cpuarch, ip, mem_total</text>
      <text x="150" y="143" text-anchor="middle" font-size="9" fill="#15803d">hostname, saltversion, custom</text>
      <rect x="36" y="155" width="228" height="6" rx="3" fill="#86efac"></rect>
      <text x="150" y="168" text-anchor="middle" font-size="9" fill="#166534" font-weight="600">For targeting and state conditions</text>
      <rect x="320" y="30" width="260" height="140" rx="10" fill="#fdf4ff" stroke="#7c3aed" stroke-width="1.5"></rect>
      <text x="450" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#4c1d95">Pillar</text>
      <text x="450" y="76" text-anchor="middle" font-size="10" fill="#6d28d9">Owner: master (stored on master)</text>
      <text x="450" y="93" text-anchor="middle" font-size="10" fill="#6d28d9">Audience: targeted minion ONLY</text>
      <text x="450" y="110" text-anchor="middle" font-size="10" fill="#6d28d9">Update: saltutil.refresh_pillar</text>
      <text x="450" y="127" text-anchor="middle" font-size="9" fill="#7c3aed">ingest_url, node_token</text>
      <text x="450" y="143" text-anchor="middle" font-size="9" fill="#7c3aed">passwords, API keys, per-node config</text>
      <rect x="336" y="155" width="228" height="6" rx="3" fill="#c4b5fd"></rect>
      <text x="450" y="168" text-anchor="middle" font-size="9" fill="#6d28d9" font-weight="600">For secrets — encrypted in transit</text>
      <rect x="620" y="30" width="260" height="140" rx="10" fill="#eff6ff" stroke="#2563eb" stroke-width="1.5"></rect>
      <text x="750" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#1e3a8a">Mine</text>
      <text x="750" y="76" text-anchor="middle" font-size="10" fill="#1d4ed8">Owner: minion (pushed to master)</text>
      <text x="750" y="93" text-anchor="middle" font-size="10" fill="#1d4ed8">Audience: ALL minions (shared)</text>
      <text x="750" y="110" text-anchor="middle" font-size="10" fill="#1d4ed8">Update: mine.update (scheduled)</text>
      <text x="750" y="127" text-anchor="middle" font-size="9" fill="#2563eb">IP addresses, SSL certs</text>
      <text x="750" y="143" text-anchor="middle" font-size="9" fill="#2563eb">load averages, disk usage</text>
      <rect x="636" y="155" width="228" height="6" rx="3" fill="#93c5fd"></rect>
      <text x="750" y="168" text-anchor="middle" font-size="9" fill="#1d4ed8" font-weight="600">For peer-to-peer data sharing</text>
    </svg>

## 🌱 Grains

Static/semi-static facts about the minion collected locally at startup. Used for targeting (`-G 'os:MacOS'`) and state conditionals. In kri, grains are POSTed to the ingest API as the node's heartbeat.

```bash
# Collect all grains
salt mm2 grains.items

# Get one grain
salt mm2 grains.get cpuarch

# Set a custom grain
salt mm2 grains.set role worker

# Force re-collection
salt mm2 saltutil.refresh_grains

# Target by grain
salt -G 'cpuarch:arm64' state.apply
```

In kri: `kri_heartbeat.py` runs `salt-call --local grains.items` then POSTs to `/api/v1/ingest/grains` every 5 minutes.

## 🔒 Pillar

Secure configuration stored on the master. Each minion only sees its own pillar slice. Never transmitted to other minions. Perfect for tokens, passwords, URLs. Rendered from Jinja2 SLS files.

```bash
# /srv/salt/pillar/mm2.sls
fleet_platform:
  ingest_url: http://198.51.100.27/api/v1/ingest
  node_token: pLmxKN...

# /srv/salt/pillar/top.sls
base:
  'mm2':
    - mm2
  'mm3':
    - mm3

# Refresh after editing
salt mm2 saltutil.refresh_pillar

# Read from state
{% set token = pillar['fleet_platform']['node_token'] %}
```

## ⛏️ Mine

Minions push selected data to the master, which shares it with all other minions. Useful for service discovery — a load balancer minion reads the IP addresses of all web server minions.

```bash
# /etc/salt/minion.d/mine.conf
mine_functions:
  network.ip_addrs: []
  disk.usage: []
  status.loadavg: []

mine_interval: 60  # minutes

# Manually update
salt mm2 mine.update

# Read another minion's mine data
salt mm2 mine.get 'mm3' network.ip_addrs

# Read from a state template
{% set ips = salt['mine.get']('web*','network.ip_addrs') %}
```

kri does not currently use Mine — nodes report grains directly via HTTP. Mine is useful if you need minions to discover each other.

## States · Events · Reactor · Thorium

### States & Execution Modules

States describe _desired configuration_ (declarative, idempotent). Execution modules run _ad-hoc commands_ (imperative, immediate).

State rendering and application pipeline

<svg viewBox="0 0 900 140" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="140" fill="#F8FAFC"></rect>
      <defs><marker id="a1" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,8 3,0 6" fill="#6B7280"></polygon></marker></defs>
      <rect x="20" y="40" width="130" height="60" rx="8" fill="#1e1e2e" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="85" y="66" text-anchor="middle" font-size="11" font-weight="600" fill="#89b4fa">SLS File</text>
      <text x="85" y="82" text-anchor="middle" font-size="9" fill="#cdd6f4">YAML + Jinja2</text>
      <text x="85" y="95" text-anchor="middle" font-size="9" fill="#6c7086">.sls template</text>
      <path d="M152 70 L186 70" stroke="#6B7280" stroke-width="1.5" marker-end="url(#a1)"></path>
      <text x="169" y="62" text-anchor="middle" font-size="9" fill="#9CA3AF">render</text>
      <rect x="188" y="40" width="130" height="60" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="253" y="66" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">Jinja2 Pass</text>
      <text x="253" y="82" text-anchor="middle" font-size="9" fill="#6B7280">pillar, grains</text>
      <text x="253" y="95" text-anchor="middle" font-size="9" fill="#6B7280">substituted</text>
      <path d="M320 70 L354 70" stroke="#6B7280" stroke-width="1.5" marker-end="url(#a1)"></path>
      <text x="337" y="62" text-anchor="middle" font-size="9" fill="#9CA3AF">parse</text>
      <rect x="356" y="40" width="130" height="60" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="421" y="66" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">YAML Parse</text>
      <text x="421" y="82" text-anchor="middle" font-size="9" fill="#6B7280">state dict</text>
      <text x="421" y="95" text-anchor="middle" font-size="9" fill="#6B7280">with requisites</text>
      <path d="M488 70 L522 70" stroke="#6B7280" stroke-width="1.5" marker-end="url(#a1)"></path>
      <text x="505" y="62" text-anchor="middle" font-size="9" fill="#9CA3AF">order</text>
      <rect x="524" y="40" width="130" height="60" rx="8" fill="#fef3c7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="589" y="66" text-anchor="middle" font-size="11" font-weight="600" fill="#92400e">Dependency</text>
      <text x="589" y="82" text-anchor="middle" font-size="9" fill="#b45309">require, watch</text>
      <text x="589" y="95" text-anchor="middle" font-size="9" fill="#b45309">onchanges sorted</text>
      <path d="M656 70 L690 70" stroke="#6B7280" stroke-width="1.5" marker-end="url(#a1)"></path>
      <text x="673" y="62" text-anchor="middle" font-size="9" fill="#9CA3AF">apply</text>
      <rect x="692" y="40" width="130" height="60" rx="8" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="757" y="66" text-anchor="middle" font-size="11" font-weight="600" fill="#166534">Result</text>
      <text x="757" y="82" text-anchor="middle" font-size="9" fill="#15803d">ok / changed</text>
      <text x="757" y="95" text-anchor="middle" font-size="9" fill="#15803d">failed / skipped</text>
      <circle r="5" fill="#444ce7">
        <animateMotion dur="3s" repeatCount="indefinite" path="M85,70 L152,70 L188,70 L253,70 L320,70 L356,70 L421,70 L488,70 L524,70 L589,70 L656,70 L692,70 L757,70"></animateMotion>
      </circle>
      <text x="450" y="125" text-anchor="middle" font-size="10" fill="#9CA3AF">Idempotent — running twice produces the same result. changed=0 on second run.</text>
    </svg>

## State File Anatomy (.sls)

```bash
# base.grain_report
# state ID — must be unique
report_grains_to_fleet_platform:
  # state module.function
  cmd.run:
    - name: |
        python3 - <<'EOF'
        import urllib.request, json
        ...
        EOF
    # Requisites
    - require:
      - file: kri_heartbeat_script
    - onchanges:
      - file: kri_config

# Jinja2 in states
{% set url = pillar.get('fleet_platform',{})
              .get('ingest_url','') %}
{% if url %}
report:
  cmd.run:
    - name: "curl -X POST {{ url }}"
{% endif %}
```

## Requisites — Execution Order

| Requisite | Meaning |
| --- | --- |
| require | This state only runs if the listed states succeeded |
| require_in | The listed state must run after this one |
| watch | Like require, but also runs if the listed state made a change |
| watch_in | Notify another state to run if this one changed |
| onchanges | Only run if one of the listed states reported a change |
| unless | Skip if this shell command returns 0 (exit success) |
| onlyif | Only run if this shell command returns 0 |
| prereq | Run before listed state only if listed state would change |
| use | Copy arguments from another state ID |
| onfail | Run only if the listed state FAILED |

## top.sls — Highstate Routing

The top file maps minions to state trees. Running `state.highstate` applies everything in top.sls that matches the minion.

```bash
# /srv/salt/states/top.sls
base:
  '*':           # all minions
    - base.grain_report
    - base.heartbeat

  'G@os:MacOS':  # grain match
    - macos.defaults

  'mm1':         # exact match
    - role.salt_master

  'web*':        # glob
    - nginx
    - ssl_cert

production:    # saltenv
  'prod*':
    - production.config
```

## State vs Execution Modules

| State module | Execution module |
| --- | --- |
| file.managed | file.read |
| pkg.installed | pkg.install |
| service.running | service.start |
| cmd.run | cmd.run |
| schedule.present | schedule.list |

State modules are called in SLS files and enforce desired state. Execution modules are called ad-hoc via `salt minion module.function`. Some share the same name but have different semantics.

**Rule:** States = idempotent desired state. Execution = one-time imperative action.

## Common State Modules

file.managed

Ensure file content, ownership, permissions

pkg.installed

Ensure package is installed at version

service.running

Ensure daemon is running and enabled

cmd.run

Run shell command, optionally conditional

user.present

Ensure OS user exists with correct settings

git.latest

Keep a git repo at a specific branch/tag

pip.installed

Ensure Python package installed in venv

schedule.present

Create a scheduled job on the minion

* * *

## Orchestrate, Runners & Formulas

Orchestrate coordinates complex multi-stage workflows across multiple minions. Runners execute on the master itself. Formulas are reusable, community-maintained state collections.

## 🎼 Orchestrate — Multi-Stage Workflows

Orchestrate runs on the master (via `salt-run`) and coordinates state runs across multiple minions in a specific order. Unlike regular states (per-minion), orchestrate spans the whole fleet.

```bash
# /srv/salt/states/orch/deploy.sls
# Step 1: Deploy to staging first
deploy_staging:
  salt.state:
    - tgt: staging*
    - sls: app.deploy

# Step 2: Run integration tests
run_tests:
  salt.function:
    - tgt: test-runner
    - fun: cmd.run
    - arg:
      - pytest /tests/
    - require:
      - deploy_staging  # only after staging

# Step 3: Deploy to production
deploy_prod:
  salt.state:
    - tgt: prod*
    - sls: app.deploy
    - require:
      - run_tests  # only if tests pass

# Run it
salt-run state.orchestrate orch.deploy
```

## 🏃 Runners — Master-Side Modules

Runners execute on the master process itself, not on minions. Used for fleet-wide operations, job management, and orchestration.

```bash
# Common runners
# Manage online/offline minions
salt-run manage.present     # online
salt-run manage.absent      # offline
salt-run manage.status      # all with status

# Job history
salt-run jobs.list_jobs     # recent jobs
salt-run jobs.lookup_jid 2026053014000001

# Mine data
salt-run mine.get '*' network.ip_addrs

# Cache
salt-run cache.grains mm2   # cached grains

# Orchestrate
salt-run state.orchestrate orch.deploy
salt-run state.orchestrate orch.upgrade   pillar='{"version": "2.5.0"}'
```

## 📦 Formulas — Reusable State Collections

Formulas are pre-built, community-maintained Salt state collections. Like Ansible roles or Helm charts — install nginx, postgres, docker with a single include.

```bash
# Install a formula (clone to states dir)
cd /srv/salt/states
git clone https://github.com/saltstack-formulas/nginx-formula nginx

# Use in your state or top.sls
# /srv/salt/states/top.sls
base:
  'web*':
    - nginx

# Configure via pillar
# /srv/salt/pillar/nginx.sls
nginx:
  server:
    config:
      worker_processes: auto
  vhosts:
    mysite:
      enabled: True
      name: example.com

# Popular formulas
# nginx-formula, postgres-formula
# docker-formula, users-formula
# git-formula, openssh-formula
```

## 🌍 SaltEnv — Multiple Environments

SaltEnv lets you serve different state trees for different environments (base, dev, staging, prod) from the same master. Minions request a specific saltenv.

```bash
# /etc/salt/master.d/environments.conf
file_roots:
  base:
    - /srv/salt/states/base
  dev:
    - /srv/salt/states/dev
    - /srv/salt/states/base   # fallback
  prod:
    - /srv/salt/states/prod
    - /srv/salt/states/base

pillar_roots:
  base:
    - /srv/salt/pillar/base
  prod:
    - /srv/salt/pillar/prod
    - /srv/salt/pillar/base

# Apply a specific environment
salt mm2 state.apply saltenv=prod

# Pin minion to an env
# /etc/salt/minion
saltenv: prod
```

* * *

## ⚡ Events, Reactor, Schedule & Automation

### Events, Reactor, Schedule & Beacons

Salt's event bus is the nervous system. Every action produces an event. Reactor listens and triggers responses. Schedule and Beacons add time-based and condition-based automation.

Event bus flow — everything produces events, reactor subscribes

<svg viewBox="0 0 900 220" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="220" fill="#F8FAFC"></rect>
      <text x="100" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#374151">Event Producers</text>
      <rect x="20" y="35" width="160" height="26" rx="5" fill="#fff" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="100" y="53" text-anchor="middle" font-size="10" fill="#374151">minion start/stop</text>
      <rect x="20" y="67" width="160" height="26" rx="5" fill="#fff" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="100" y="85" text-anchor="middle" font-size="10" fill="#374151">state run complete</text>
      <rect x="20" y="99" width="160" height="26" rx="5" fill="#fff" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="100" y="117" text-anchor="middle" font-size="10" fill="#374151">job published/returned</text>
      <rect x="20" y="131" width="160" height="26" rx="5" fill="#fff" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="100" y="149" text-anchor="middle" font-size="10" fill="#374151">beacon events</text>
      <rect x="20" y="163" width="160" height="26" rx="5" fill="#fff" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="100" y="181" text-anchor="middle" font-size="10" fill="#374151">custom fire_event()</text>
      <rect x="240" y="30" width="200" height="170" rx="10" fill="#1a1a3e" stroke="#444ce7" stroke-width="2"></rect>
      <text x="340" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">Event Bus</text>
      <text x="340" y="76" text-anchor="middle" font-size="10" fill="#a4bbfc">ZeroMQ IPC socket</text>
      <text x="340" y="93" text-anchor="middle" font-size="9" fill="#818cf8">salt/minion/{id}/start</text>
      <text x="340" y="109" text-anchor="middle" font-size="9" fill="#818cf8">salt/job/{jid}/ret/{id}</text>
      <text x="340" y="125" text-anchor="middle" font-size="9" fill="#818cf8">salt/state/ret</text>
      <text x="340" y="141" text-anchor="middle" font-size="9" fill="#818cf8">salt/beacon/{minion}/{type}</text>
      <text x="340" y="157" text-anchor="middle" font-size="9" fill="#818cf8">myapp/custom/event</text>
      <circle cx="340" cy="110" r="0" fill="#444ce7" opacity=".4">
        <animate attributeName="r" values="0;60" dur="2.5s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".4;0" dur="2.5s" repeatCount="indefinite"></animate>
      </circle>
      <text x="720" y="26" text-anchor="middle" font-size="11" font-weight="700" fill="#374151">Subscribers</text>
      <rect x="530" y="35" width="140" height="50" rx="8" fill="#fef3c7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="600" y="57" text-anchor="middle" font-size="11" font-weight="600" fill="#92400e">Reactor</text>
      <text x="600" y="74" text-anchor="middle" font-size="9" fill="#b45309">pattern match → action</text>
      <rect x="530" y="97" width="140" height="50" rx="8" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="1.5"></rect>
      <text x="600" y="119" text-anchor="middle" font-size="11" font-weight="600" fill="#075985">Returner</text>
      <text x="600" y="136" text-anchor="middle" font-size="9" fill="#0369a1">log to DB / Splunk / ES</text>
      <rect x="530" y="159" width="140" height="50" rx="8" fill="#f0fdf4" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="600" y="181" text-anchor="middle" font-size="11" font-weight="600" fill="#166534">External App</text>
      <text x="600" y="198" text-anchor="middle" font-size="9" fill="#15803d">kri, monitoring, alerts</text>
      <path d="M182 70 L238 90" stroke="#444ce7" stroke-width="1" opacity=".5"></path>
      <path d="M182 110 L238 110" stroke="#444ce7" stroke-width="1" opacity=".5"></path>
      <path d="M182 150 L238 130" stroke="#444ce7" stroke-width="1" opacity=".5"></path>
      <path d="M442 70 L528 60" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,3"></path>
      <path d="M442 110 L528 122" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="4,3"></path>
      <path d="M442 150 L528 184" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="4,3"></path>
      <circle r="4" fill="#D97706"><animateMotion dur="3s" repeatCount="indefinite" path="M182,70 L238,90 L340,110 L442,70 L528,60"></animateMotion></circle>
    </svg>

## ⚡ Reactor

The reactor listens to event patterns and triggers actions. kri uses it to fire `grain_report` the instant a minion connects — eliminating the heartbeat delay (from 5 min to <2 seconds).

```bash
# /etc/salt/master.d/kri.conf
reactor:
  - 'salt/minion/*/start':
    - salt://reactor/grain_report_on_start.sls
  - 'salt/beacon/*/disk_usage':
    - salt://reactor/alert_disk.sls

# /srv/salt/states/reactor/grain_report_on_start.sls
fire_grain_report:
  local.state.apply:
    - tgt: "{{ data['id'] }}"
    - arg:
      - base.grain_report
```

The reactor runs on the master and is event-driven. It can trigger local commands, state applies, runner modules, or wheel functions.

## 📅 Schedule

Run jobs on a timer — on the minion (without master involvement) or on the master. kri uses a minion-side schedule stored in `/etc/salt/minion.d/` so it persists across restarts and cache clears.

```bash
# Minion-side — survives cache clears
# /etc/salt/minion.d/kri-heartbeat.conf
schedule:
  kri_heartbeat:
    function: cmd.run
    job_kwargs:
      cmd: /opt/salt/bin/python3.10 /usr/local/bin/kri_heartbeat.py
    minutes: 5
    enabled: True
    run_on_start: True  # fires on minion start

# Master-side (via salt-run)
# runs on master, NOT on minions
salt-run schedule.add nightly_backup \
  function=state.apply \
  job_kwargs="{'arg': ['backup']}" \
  hours=24
```

**schedule.present** (state module) writes to volatile `/var/cache/salt/minion/schedule.p`. kri writes to `/etc/salt/minion.d/` for persistence.

## 🔦 Beacons

Beacons monitor the local system and fire events when conditions are met — without a master initiating anything. Useful for disk full alerts, process monitoring, log file watching.

```bash
# /etc/salt/minion.d/beacons.conf
beacons:
  disk_usage:         # monitor disk
    - /: 80%          # fire if / > 80%
    - /data: 90%
    - interval: 60

  ps:                 # process monitor
    - processes:
        salt-master: running
    - interval: 30

  log:                # log file watcher
    - file: /var/log/salt/minion
    - tags:
        salt.ERROR: {}
    - interval: 10
```

Beacon events: `salt/beacon/{minion}/{type}/{data}`

## 🔄 Returners

By default, job results go back to the master. Returners let you also send results to external systems — databases, log aggregators, monitoring platforms — without changing states.

```bash
# Send all results to Elasticsearch
salt mm2 state.apply base.grain_report \
  --return=elasticsearch

# Configure returner in minion
# /etc/salt/minion.d/returner.conf
elasticsearch.host: "logs.example.internal:9200"
elasticsearch.index: "salt"

# Built-in returners include:
# sqlite3, mysql, postgres, redis
# elasticsearch, splunk, carbon (Graphite)
# sentry, slack, hipchat
```

kri acts as a custom returner — the ingest API receives grain data pushed via HTTP POST from the minion's heartbeat script.

* * *

## Advanced — Syndic, Proxy Minions & More

Advanced Salt patterns for hierarchical deployments, managing non-standard devices, and scaling to thousands of nodes.

## 🔗 Syndic — Hierarchical Masters

The Syndic allows chaining salt-masters. A top-level master controls sub-masters (syndics), which each control their own minions. Used for geo-distributed fleets or organizational separation.

```bash
# Architecture:
# master-of-masters → syndic1 → mm1,mm2
#                  → syndic2 → mm3,mm4

# On syndic master:
# /etc/salt/master
syndic_master: top-master.example.com

# /etc/salt/minion
master: top-master.example.com

# Command flows down the chain:
# salt '*' test.ping (on top master)
# → syndic1 fans out to mm1,mm2
# → syndic2 fans out to mm3,mm4
# Results bubble back up
```

## 🔌 Proxy Minions — Non-Linux Devices

Proxy minions manage devices that can't run a salt-minion: network switches, IoT devices, APIs, legacy systems. The proxy runs on a Linux host and translates salt commands.

```bash
# Proxy minion talks to a REST API device
# /etc/salt/proxy
master: salt-master.example.com

# /srv/salt/pillar/switch01.sls
proxy:
  proxytype: napalm        # network device
  driver: ios
  host: 192.0.2.1
  username: admin
  password: secret

# Start the proxy
salt-proxy --proxyid=switch01 -d

# Use normally
salt switch01 net.interfaces
salt switch01 net.arp
```

## ☁️ salt-cloud — Provision Cloud VMs

Salt-cloud provisions VMs on AWS, GCP, Azure, DigitalOcean etc., installs the salt-minion, and adds them to the fleet automatically. Infrastructure as code.

```bash
# /etc/salt/cloud.providers.d/aws.conf
my-aws:
  driver: ec2
  id: AKIAIOSFODNN7EXAMPLE
  key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  keyname: my-keypair
  securitygroup: default
  location: us-east-1

# /etc/salt/cloud.profiles.d/web.conf
web-server:
  provider: my-aws
  image: ami-0c55b159cbfafe1f0
  size: t3.micro
  minion:
    grains:
      role: web

# Spin up and auto-register
salt-cloud -p web-server prod-web-01

# Destroy
salt-cloud -d prod-web-01
```

## ⚡ Thorium — Reactive System

**Thorium** is Salt's advanced reactive system — a layer above the Reactor. Where Reactor matches single events, Thorium aggregates multiple events over time and fires when conditions are met (e.g., "3 disk alerts in 5 minutes").

```bash
# /srv/salt/thorium/detect_disk_crisis.sls
# Accumulate beacon events from minions
check_disk:
  thresh.count:
    - count: 3          # 3 events needed
    - seconds: 300      # within 5 minutes
    - event_data:
        tag: salt/beacon/*/disk_usage

# When threshold met: fire action
alert_disk_crisis:
  local.state.apply:
    - tgt: "{{ data['id'] }}"
    - arg:
      - disk.emergency_cleanup
    - require:
      - check_disk

# Enable Thorium in master config
# /etc/salt/master.d/thorium.conf
thorium_roots:
  base:
    - /srv/salt/thorium
```

**kri note:** kri uses the simpler Reactor for immediate on-connect events. Thorium would be used for complex fleet-wide condition detection (e.g., cascade failures).

## 📊 Salt Versions — Release Codenames

⚗️

3005

Phosphorus

🟡

3006

Sulfur (LTS)

🟢

3007

Chlorine ← kri uses

🔵

3008

Argon (master)

Versions named after chemical elements. LTS releases (Sulfur/3006) get extended support. kri minions run 3007.14 (Chlorine); salt-master on mm1 runs 3008.0 (Argon) — backward compatible.

* * *

## ⚗️ Custom Module Development

Every Salt module is a Python file. The Salt loader injects special **dunder** (double-underscore) variables that give your module access to grains, pillar, other modules, and configuration.

## Dunder Variables

| Variable | What it gives you |
| --- | --- |
| __salt__ | Call other execution modules: __salt__['cmd.run']('uptime') |
| __grains__ | Read minion grains: __grains__['os'] |
| __pillar__ | Read pillar data: __pillar__.get('key', 'default') |
| __opts__ | Master/minion config options |
| __utils__ | Utility functions shared across modules |
| __states__ | Call state functions from an execution module |
| __context__ | Per-minion persistent cache (survives between calls) |
| __virtualname__ | Override the module name exposed to users |

## Writing a Custom Execution Module

```bash
# /srv/salt/states/_modules/kri_info.py
# salt '*' kri_info.node_summary

def node_summary():
    """Return a kri-specific node summary."""
    os = __grains__['os']
    mem = __grains__['mem_total']
    uptime = __salt__['cmd.run']('uptime -p')
    token = __pillar__.get('fleet_platform', {}).get('node_token', 'none')
    return {'os': os, 'mem_gb': mem//1024, 'uptime': uptime, 'token_set': token != 'none'}

# Custom state module
# /srv/salt/states/_states/kri_node.py
def registered(name, token):
    """Ensure node is registered with kri."""
    result = {'name': name, 'changes': {}, 'result': True, 'comment': ''}
    current = __salt__['kri_info.node_summary']()
    if current['token_set']:
        result['comment'] = 'Already registered'
        return result
    # ... register logic
    result['changes']['registered'] = True
    return result

# Deploy custom modules
salt mm2 saltutil.sync_modules
```

## ✅ Testing with salt-check

salt-check lets you write and run unit tests for your salt states directly on the minion, without mocking.

```bash
# /srv/salt/states/base/test_grain_report.sls
# Tests for the grain_report state
check_heartbeat_script_exists:
  salt_check.run:
    - assertions:
      - assertion: assertTrue
        expr_form: True
        result: "{{ salt['file.file_exists']('/usr/local/bin/kri_heartbeat.py') }}"

check_heartbeat_is_executable:
  salt_check.run:
    - assertions:
      - assertion: assertEqual
        result: "{{ salt['cmd.run']('test -x /usr/local/bin/kri_heartbeat.py && echo ok') }}"
        expected: "ok"

# Run the tests
salt mm2 salt_check.run_state_tests base.grain_report
salt mm2 salt_check.run_highstate_tests
```

## 📋 Job Cache & Event Tags

Every salt command creates a **job** with a unique JID. Results are cached on the master. Event bus tags follow a structured pattern you can use in Reactor subscriptions.

```bash
# Job management
salt-run jobs.list_jobs              # recent jobs
salt-run jobs.lookup_jid 2026053014  # get result
salt-run jobs.active                  # running jobs
salt-run jobs.exit_success <jid>     # did it pass?

# /etc/salt/master.d/jobs.conf
keep_jobs: 72  # hours to keep job cache
job_cache: True

# Event tag patterns (use in Reactor)
salt/job/{jid}/new           # job published
salt/job/{jid}/ret/{minion}  # result returned
salt/minion/{id}/start       # minion connected
salt/minion/{id}/refresh_pillar
salt/state/ret               # state run complete
salt/beacon/{id}/{type}      # beacon fired
salt/presence/present        # presence heartbeat
salt/presence/change         # minion gone/appeared
```

* * *

## 🔐 Advanced Data — Vault & GPG Encrypted Pillar

## HashiCorp Vault Integration

Use Vault as a pillar backend so secrets never touch the salt-master filesystem. Minions request their secrets from Vault via the master as a proxy.

```bash
# /etc/salt/master.d/vault.conf
ext_pillar:
  - vault:
      path: secret/data/nodes/{minion_id}

vault:
  url: https://vault.example.internal:8200
  auth:
    method: token
    token: s.xxxxxxxxxxx

# Minion accesses pillar normally
{% set secret = pillar['my_secret'] %}

# Vault path is per-minion by ID
# vault write secret/data/nodes/mm2 token=xxx
```

## GPG-Encrypted Pillar

Encrypt secrets directly in pillar files using GPG. Salt decrypts on the master before sending to the minion. Secrets are safe to commit to git.

```bash
# Encrypt a value
echo -n "my-secret-password" | gpg   --armor --batch --encrypt   -r salt-master@example.com

# /srv/salt/pillar/mm2.sls
fleet_platform:
  node_token: |
    -----BEGIN PGP MESSAGE-----
    hQEMA7...encrypted...data
    -----END PGP MESSAGE-----

# /etc/salt/master.d/gpg.conf
decrypt_pillar: True
decrypt_pillar_default: gpg
gpg_keydir: /etc/salt/gpgkeys
```

## Security · Targeting · CLI · Reference

### Security, Targeting & Keys

Salt uses RSA public-key cryptography for all master-minion authentication. Every minion has a unique key pair. The master is the trust anchor.

Full key lifecycle — from first boot to trusted minion

<svg viewBox="0 0 900 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="180" fill="#F8FAFC"></rect>
      <defs><marker id="ak" markerWidth="7" markerHeight="5" refX="7" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#6B7280"></polygon></marker></defs>
      <rect x="20" y="50" width="130" height="90" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="85" y="75" text-anchor="middle" font-size="11" font-weight="600" fill="#111827">1. First Boot</text>
      <text x="85" y="92" text-anchor="middle" font-size="9" fill="#6B7280">Minion generates</text>
      <text x="85" y="106" text-anchor="middle" font-size="9" fill="#6B7280">RSA 4096 key pair</text>
      <text x="85" y="120" text-anchor="middle" font-size="9" fill="#6B7280">/etc/salt/pki/minion/</text>
      <text x="85" y="134" text-anchor="middle" font-size="14">🔐</text>
      <path d="M152 95 L190 95" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ak)"></path>
      <rect x="192" y="50" width="130" height="90" rx="8" fill="#fef3c7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="257" y="75" text-anchor="middle" font-size="11" font-weight="600" fill="#92400e">2. Send Pub Key</text>
      <text x="257" y="92" text-anchor="middle" font-size="9" fill="#b45309">Minion sends</text>
      <text x="257" y="106" text-anchor="middle" font-size="9" fill="#b45309">public key to master</text>
      <text x="257" y="120" text-anchor="middle" font-size="9" fill="#b45309">→ minions_pre/</text>
      <text x="257" y="134" text-anchor="middle" font-size="14">📤</text>
      <path d="M324 95 L362 95" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ak)"></path>
      <rect x="364" y="50" width="130" height="90" rx="8" fill="#fee2e2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="429" y="75" text-anchor="middle" font-size="11" font-weight="600" fill="#991b1b">3. Admin Reviews</text>
      <text x="429" y="92" text-anchor="middle" font-size="9" fill="#DC2626">salt-key -L</text>
      <text x="429" y="106" text-anchor="middle" font-size="9" fill="#DC2626">kri UI → Minion Keys</text>
      <text x="429" y="120" text-anchor="middle" font-size="9" fill="#DC2626">Accept or Reject</text>
      <text x="429" y="134" text-anchor="middle" font-size="14">👤</text>
      <path d="M496 95 L534 95" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ak)"></path>
      <rect x="536" y="50" width="130" height="90" rx="8" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="601" y="75" text-anchor="middle" font-size="11" font-weight="600" fill="#166534">4. Accepted</text>
      <text x="601" y="92" text-anchor="middle" font-size="9" fill="#15803d">Key moved to</text>
      <text x="601" y="106" text-anchor="middle" font-size="9" fill="#15803d">minions/</text>
      <text x="601" y="120" text-anchor="middle" font-size="9" fill="#15803d">Mutual auth complete</text>
      <text x="601" y="134" text-anchor="middle" font-size="14">✅</text>
      <path d="M668 95 L706 95" stroke="#6B7280" stroke-width="1.5" marker-end="url(#ak)"></path>
      <rect x="708" y="50" width="170" height="90" rx="8" fill="#eff6ff" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="793" y="75" text-anchor="middle" font-size="11" font-weight="600" fill="#1e3a8a">5. Full Trust</text>
      <text x="793" y="92" text-anchor="middle" font-size="9" fill="#1d4ed8">Master sends</text>
      <text x="793" y="106" text-anchor="middle" font-size="9" fill="#1d4ed8">its pub key to minion</text>
      <text x="793" y="120" text-anchor="middle" font-size="9" fill="#1d4ed8">AES session established</text>
      <text x="793" y="134" text-anchor="middle" font-size="14">🔒</text>
      <text x="450" y="165" text-anchor="middle" font-size="10" fill="#9CA3AF">All payload encrypted with AES after handshake. RSA used only for key exchange.</text>
    </svg>

## PKI Directory Structure

```bash
# On salt-master (mm1)
/etc/salt/pki/master/
  master.pem      # RSA private key (NEVER share)
  master.pub      # RSA public key (sent to minions)
  minions/        # accepted minion pub keys
    mm2           # one file per accepted minion
    mm3
  minions_pre/    # pending (not yet accepted)
    mm4
  minions_rejected/ # explicitly rejected
  minions_denied/   # denied (accepted then revoked)

# On salt-minion (each Mac Mini)
/etc/salt/pki/minion/
  minion.pem        # minion private key
  minion.pub        # minion public key (sent to master)
  minion_master.pub # master's public key (for auth)
```

## Key States & Commands

| Command | Action |
| --- | --- |
| salt-key -L | List all keys by state (accepted/pending/rejected) |
| salt-key -a mm3 | Accept a specific pending key |
| salt-key -A -y | Accept ALL pending keys (auto-trust, risky) |
| salt-key -r mm4 | Reject a key (moved to minions_rejected) |
| salt-key -d mm4 | Delete a key entirely (decommission) |
| salt-key -f mm2 | Show fingerprint of a specific key |
| salt-key -F | Show all fingerprints |
| salt-key --gen-keys=test | Generate a key pair (for testing) |

In kri: use Settings → Minion Keys to accept/reject. Never use `-A -y` in production — always inspect fingerprints first.

## External Authentication (salt-api)

When using salt-api, clients authenticate via eauth (external authentication) before they can call salt functions. kri uses PAM auth with a dedicated system user.

```bash
# /etc/salt/master.d/kri.conf
external_auth:
  pam:
    krisalt:       # OS user on mm1
      - '.*'      # allow all functions
      - '@runner' # allow runner modules
      - '@wheel'  # allow key management

# HTTP call to salt-api
POST http://198.51.100.75:8080/run
{
  "client": "local",
  "tgt": "mm2",
  "fun": "test.ping",
  "username": "krisalt",
  "password": "...",
  "eauth": "pam"
}
```

## Encryption Layers

1

Transport encryption

All ZeroMQ traffic is encrypted with a rotating AES session key. The AES key is exchanged using RSA during the authentication handshake.

2

Pillar encryption

Pillar data is encrypted per-minion using the minion's public key. Other minions cannot decrypt pillar data sent to a different minion.

3

Tailscale (kri)

In kri, all traffic also travels through Tailscale's WireGuard tunnel, adding a second encryption layer and network isolation.

4

salt-api TLS

salt-api should use TLS in production. In kri we rely on Tailscale's encryption, so TLS is disabled locally (disable\_ssl: true).

* * *

## Targeting

Every salt command needs a target. Salt supports 8 different targeting methods. Mix them with compound expressions for surgical precision.

Targeting methods — how each selects minions

<svg viewBox="0 0 900 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="200" fill="#F8FAFC"></rect>
      <rect x="20" y="20" width="100" height="60" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5"></rect>
      <text x="70" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#1d4ed8">Glob</text>
      <text x="70" y="60" text-anchor="middle" font-size="9" fill="#1e40af">mm*</text>
      <text x="70" y="73" text-anchor="middle" font-size="8" fill="#3b82f6">default</text>
      <rect x="130" y="20" width="100" height="60" rx="6" fill="#dcfce7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="180" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#166534">-G Grain</text>
      <text x="180" y="60" text-anchor="middle" font-size="9" fill="#15803d">os:MacOS</text>
      <text x="180" y="73" text-anchor="middle" font-size="8" fill="#16A34A">grain match</text>
      <rect x="240" y="20" width="100" height="60" rx="6" fill="#fef3c7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="290" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">-P Regex</text>
      <text x="290" y="60" text-anchor="middle" font-size="9" fill="#b45309">mm[23]</text>
      <text x="290" y="73" text-anchor="middle" font-size="8" fill="#D97706">PCRE regex</text>
      <rect x="350" y="20" width="100" height="60" rx="6" fill="#ede9fe" stroke="#7c3aed" stroke-width="1.5"></rect>
      <text x="400" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#6d28d9">-L List</text>
      <text x="400" y="60" text-anchor="middle" font-size="9" fill="#7c3aed">mm2,mm3</text>
      <text x="400" y="73" text-anchor="middle" font-size="8" fill="#7c3aed">explicit list</text>
      <rect x="460" y="20" width="100" height="60" rx="6" fill="#fff1f2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="510" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#991b1b">-E Grain-P</text>
      <text x="510" y="60" text-anchor="middle" font-size="9" fill="#DC2626">cpuarch:arm.*</text>
      <text x="510" y="73" text-anchor="middle" font-size="8" fill="#DC2626">grain regex</text>
      <rect x="570" y="20" width="100" height="60" rx="6" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="1.5"></rect>
      <text x="620" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#075985">-N NodeGroup</text>
      <text x="620" y="60" text-anchor="middle" font-size="9" fill="#0369a1">webservers</text>
      <text x="620" y="73" text-anchor="middle" font-size="8" fill="#0ea5e9">named group</text>
      <rect x="680" y="20" width="100" height="60" rx="6" fill="#fdf4ff" stroke="#a855f7" stroke-width="1.5"></rect>
      <text x="730" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#7e22ce">-I Pillar</text>
      <text x="730" y="60" text-anchor="middle" font-size="9" fill="#9333ea">role:web</text>
      <text x="730" y="73" text-anchor="middle" font-size="8" fill="#a855f7">pillar data</text>
      <rect x="790" y="20" width="100" height="60" rx="6" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"></rect>
      <text x="840" y="46" text-anchor="middle" font-size="10" font-weight="700" fill="#9a3412">-C Compound</text>
      <text x="840" y="60" text-anchor="middle" font-size="9" fill="#c2410c">G@ and not L@</text>
      <text x="840" y="73" text-anchor="middle" font-size="8" fill="#ea580c">mix methods</text>
      <rect x="20" y="100" width="860" height="80" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="34" y="122" font-size="11" font-weight="600" fill="#111827">Compound targeting examples:</text>
      <text x="34" y="142" font-size="10" fill="#444ce7" font-family="monospace">salt -C 'G@os:MacOS and not L@mm1,mm3' state.apply</text>
      <text x="34" y="158" font-size="9" fill="#6B7280">→ All macOS nodes EXCEPT mm1 and mm3</text>
      <text x="450" y="142" font-size="10" fill="#444ce7" font-family="monospace">salt -C 'mm* or G@role:web' test.ping</text>
      <text x="450" y="158" font-size="9" fill="#6B7280">→ All mm* minions OR those with grain role=web</text>
    </svg>

## Targeting Syntax Reference

| Flag | Type | Example |
| --- | --- | --- |
| (none) | Glob (default) | mm* web[12] |
| -G | Grain | os:MacOS cpuarch:arm64 |
| -P | Grain PCRE | os:Mac.* |
| -E | PCRE minion ID | mm[0-9]+ |
| -L | Comma list | mm1,mm2,mm3 |
| -N | Nodegroup | production |
| -I | Pillar | role:primary |
| -J | Pillar PCRE | role:web.* |
| -S | Subnet/IP | 192.0.2.0/24 |
| -C | Compound | G@os:MacOS and not mm1 |

## Nodegroups

Named groups of minions defined in the master config. Can include any targeting expression. Reusable across commands and states.

```bash
# /etc/salt/master.d/kri.conf
nodegroups:
  fleet: 'mm1 or mm2 or mm3'
  arm_minis: 'G@cpuarch:arm64'
  prod: 'I@env:production'
  all_except_master: '* and not mm1'

# Use them
salt -N fleet test.ping
salt -N arm_minis state.apply base.grain_report
salt -N prod state.highstate

# In top.sls
base:
  'N@arm_minis':
    - macos.arm_optimizations
```

## Batch Execution — Limiting Blast Radius

For large fleets, apply changes in batches to avoid taking down everything at once.

```bash
# Apply to 10% at a time
salt --batch=10% \
  '*' state.apply

# Apply to 3 at a time
salt --batch=3 \
  'mm*' pkg.upgrade
```

```bash
# Async — don't wait for results
salt --async mm2 \
  state.apply base.grain_report

# Get result of async job
salt-run jobs.lookup_jid \
  20260530140000123456
```

```bash
# Timeout — don't wait forever
salt -t 30 mm2 state.apply

# Show progress
salt --progress \
  '*' test.ping
```

* * *

## 📋 CLI, Config Files, Ports & Logs

### CLI Reference — All Salt Commands

Complete reference for `salt`, `salt-call`, `salt-key`, `salt-run`, and `salt-api`.

## `salt` — Run commands on minions

| Command | Description |
| --- | --- |
| salt '*' test.ping | Ping all minions |
| salt mm2 grains.items | Get all grains from mm2 |
| salt mm2 state.apply base.grain_report | Apply a specific state |
| salt mm2 state.highstate | Apply all states in top.sls |
| salt mm2 state.apply test=True | Dry run — show what would change |
| salt mm2 cmd.run 'uptime' | Run a shell command |
| salt mm2 saltutil.refresh_grains | Force grains re-collection |
| salt mm2 saltutil.refresh_pillar | Reload pillar from master |
| salt mm2 saltutil.sync_all | Sync all custom modules/states |
| salt -G 'os:MacOS' test.ping | Target by grain |
| salt -L 'mm1,mm2,mm3' test.ping | Target by list |
| salt --batch=2 '*' state.apply | Apply 2 at a time |
| salt --async mm2 state.apply | Fire and forget |
| salt -t 10 mm2 cmd.run 'uptime' | 10 second timeout |
| salt mm2 system.reboot | Reboot the minion OS |
| salt mm2 schedule.list | List scheduled jobs on minion |

## `salt-call` — Run locally on minion

Run salt functions locally without needing the master. Used in heartbeat scripts and bootstrapping.

```bash
# Run on the minion itself (no master)
salt-call --local grains.items

# Apply a state locally
salt-call --local state.apply base.grain_report

# Get pillar (needs master)
salt-call pillar.items

# JSON output for scripting
salt-call --local --out=json grains.items

# kri heartbeat uses this:
raw = subprocess.check_output(
  ["/opt/salt/salt-call", "--local",
   "grains.items", "--out=json"]
)
```

## `salt-run` — Runner modules (master-side)

Execute runner modules on the master itself. Not dispatched to minions.

```bash
# List all recent jobs
salt-run jobs.list_jobs

# Look up a specific job result
salt-run jobs.lookup_jid 2026053014000012

# Check which minions are active
salt-run manage.present
salt-run manage.absent

# Cache status
salt-run manage.status

# Orchestrate (multi-state workflow)
salt-run state.orchestrate orch.deploy

# Mine stats
salt-run mine.get '*' network.ip_addrs
```

## `salt-key` — Key management

```bash
# List all keys by state
salt-key -L

# Accept specific        # Accept all pending
salt-key -a mm3 -y            salt-key -A -y

# Reject                  # Delete (decommission)
salt-key -r mm4 -y            salt-key -d mm4 -y

# Show fingerprints       # Show specific
salt-key -F                   salt-key -f mm2

# Generate standalone key pair (testing)
salt-key --gen-keys=test --gen-keys-dir=/tmp/
```

## 🔌 Ports Reference

| Port | Protocol | Direction | Purpose | Who listens |
| --- | --- | --- | --- | --- |
| 4505 | TCP (ZeroMQ PUB) | master → minions | Command publish channel. Minions subscribe and stay connected. | salt-master on mm1 |
| 4506 | TCP (ZeroMQ PULL) | minions → master | Return channel. Minions push job results back here. | salt-master on mm1 |
| 8080 | HTTP (REST) | kri → master | salt-api endpoint. kri worker POSTs commands here. | salt-api on mm1 |
| 80 / 443 | HTTP / HTTPS | browser → kri | kri web frontend + API. nginx reverse proxy. | Docker host |
| 8000 | HTTP | nginx → api | FastAPI internal port (not exposed externally). | Docker container |
| 5432 | PostgreSQL | internal | TimescaleDB. Only accessible inside Docker network. | Docker container |
| 6379 | Redis | internal | Celery broker + rate limiting. Internal only. | Docker container |

**Firewall:** Only 4505, 4506, and 8080 need to be reachable on mm1 from other Mac Minis. In kri these are protected by Tailscale — no public exposure.

## 📄 Configuration Files

| File / Directory | Purpose |
| --- | --- |
| /etc/salt/master | Main salt-master config |
| /etc/salt/master.d/*.conf | Drop-in master config files (kri.conf, salt-api.conf) |
| /etc/salt/minion | Minion config (master address, id, log level) |
| /etc/salt/minion.d/*.conf | Drop-in minion config — kri writes kri-heartbeat.conf here |
| /etc/salt/pki/master/ | Master RSA keys + all minion public keys |
| /etc/salt/pki/minion/ | Minion private key + cached master.pub |
| /srv/salt/states/ | State files (.sls) served via salt:// |
| /srv/salt/pillar/ | Pillar files — per-node secrets and config |
| /Library/LaunchDaemons/com.saltstack.salt.master.plist | macOS launchd plist for salt-master |
| /Library/LaunchDaemons/com.saltstack.salt.api.plist | macOS launchd plist for salt-api |
| /Library/LaunchDaemons/com.saltstack.salt.minion.plist | macOS launchd plist for salt-minion |
| /usr/local/bin/kri_heartbeat.py | kri heartbeat script (managed by base.heartbeat state) |

## 📋 Log Files & Debugging

| Log File | What it contains |
| --- | --- |
| /var/log/salt/master | salt-master activity, auth events, job dispatch |
| /var/log/salt/master-error | salt-master errors and exceptions |
| /var/log/salt/api | salt-api HTTP requests and responses |
| /var/log/salt/minion | Minion connection, job execution, state results |
| /var/log/salt/minion-error | Minion errors (look here first when things break) |

```bash
# Tail master log
tail -f /var/log/salt/master

# Tail minion log on mm2 (via SSH)
ssh 198.51.100.62 "sudo tail -f /var/log/salt/minion"

# Increase verbosity (troubleshooting)
# In /etc/salt/minion:
log_level: debug

# Watch events in real time (on master)
salt-run state.event pretty=True

# Check job history
salt-run jobs.list_jobs
```

* * *

## 🔗 salt-ssh — Agentless Mode

**salt-ssh** runs salt commands over SSH without installing a minion. No ZeroMQ, no PKI keys, no persistent connection. Uses a thin client library injected over SSH. Perfect for bootstrapping new nodes or managing legacy systems.

## salt-ssh vs salt-minion

| Feature | salt-ssh | salt-minion |
| --- | --- | --- |
| Agent needed | No — SSH only | Yes |
| Transport | SSH (port 22) | ZeroMQ (4505/4506) |
| Auth | SSH keys/password | RSA key pairs |
| Speed | Slower (per-connection) | Fast (persistent) |
| Scale | Hundreds | Tens of thousands |
| State support | Full | Full |
| Grains | Limited (no cache) | Full + cached |
| Best for | Bootstrap, one-offs | Production fleet |

## Roster — ssh Inventory

The roster file defines SSH targets. Like an Ansible inventory.

```bash
# /etc/salt/roster
mm1:
  host: 198.51.100.75
  user: dk
  sudo: True
  priv: /root/.ssh/id_ed25519

mm2:
  host: 198.51.100.62
  user: dk
  sudo: True

# Use it
salt-ssh mm1 test.ping
salt-ssh '*' state.apply base.grain_report
salt-ssh mm1 grains.items

# kri uses Ansible (not salt-ssh) for
# bootstrap because Ansible has better
# macOS support and the bootstrap playbook
# installs the full salt-minion afterwards
```

* * *

## 🏗️ High Availability — Multi-Master

## Multi-Master Setup

Minions can connect to multiple masters simultaneously. If one master fails, minions failover to the next. Both masters must have identical PKI keys (same master.pem/pub).

```bash
# /etc/salt/minion (on each minion)
master:
  - mm1.tailscale           # primary
  - mm1-backup.tailscale    # failover

master_alive_interval: 30   # check every 30s
master_tries: -1            # retry forever

# Both masters MUST share PKI
# Copy master.pem + master.pub to backup
# Both masters share accepted minion keys
# Use shared file system or DB for job cache

# kri note: single master on mm1 is sufficient
# for a home lab. Multi-master for production
# fleets with SLA requirements.
```

## Peer Runner — Minion-to-Minion

Allow minions to request data from other minions or trigger runners, via the master as a proxy. Useful for service discovery and coordination.

```bash
# Allow mm2 to call runners on master
# /etc/salt/master.d/peer.conf
peer:
  mm2:                  # this minion ID
    - network.ip_addrs  # can call these
    - grains.items
    - mine.get

peer_run:
  mm2:
    - manage.present    # can call these runners

# From mm2 (via salt-call)
salt-call publish.publish 'mm3' network.ip_addrs
salt-call publish.runner manage.present
```
