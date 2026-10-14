---
title: "kri: Building an Enterprise Fleet Management Platform for Mac Mini Build Infrastructure"
date: 2026-05-15
description: "How we built a full-stack fleet control plane — Salt, Ansible, FastAPI, React, TimescaleDB — that turns a rack of headless Mac Minis into a managed, observable, drift-detecting build fleet."
tags: [kri, devops, fleet-management]
cover: "assets/images/jenkins/jenkins.png"
draft: false
---

How we built a full-stack fleet control plane — Salt, Ansible, FastAPI, React, TimescaleDB — that turns a rack of headless Mac Minis into a managed, observable, drift-detecting build fleet.

## 1 The Problem: N Mac Minis, Zero Visibility

A iOS/macOS build fleet sounds simple: a few Mac Minis running Xcode, Jenkins agents, and signing tools. In practice, a fleet of even six machines quickly becomes a management nightmare — each one an island of configuration drift, manual SSH sessions, and tribal knowledge.

Before kri, the workflow looked like this: **need to check what version of Homebrew is on mac-mini-04?** SSH in. Need to push an updated cert? SSH in, scp, sudo. **Which nodes are online right now?** Ping them one by one. Did the Xcode update actually land on all nodes? Nobody knows for certain.

<svg viewBox="0 0 680 260" width="100%" style="max-width:680px">
        <defs>
        </defs>
        <text x="340" y="24" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="600" fill="#4B5563">Before kri — every node is an island</text>
        <g class="chaos-mac">
          <rect x="40" y="50" width="80" height="54" rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="80" y="72" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#374151">mac-mini</text>
          <text x="80" y="86" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6B7280">-01</text>
          <rect x="55" y="106" width="50" height="6" rx="3" fill="#D1D5DB"></rect>
        </g>
        <g class="chaos-mac">
          <rect x="160" y="50" width="80" height="54" rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="200" y="72" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#374151">mac-mini</text>
          <text x="200" y="86" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6B7280">-02</text>
          <rect x="175" y="106" width="50" height="6" rx="3" fill="#D1D5DB"></rect>
        </g>
        <g class="chaos-mac">
          <rect x="280" y="50" width="80" height="54" rx="8" fill="#FEF2F2" stroke="#FCA5A5" stroke-width="1.5"></rect>
          <text x="320" y="72" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#B91C1C">mac-mini</text>
          <text x="320" y="86" text-anchor="middle" font-family="system-ui" font-size="9" fill="#DC2626">-03 (offline?)</text>
          <rect x="295" y="106" width="50" height="6" rx="3" fill="#FCA5A5"></rect>
        </g>
        <g class="chaos-mac">
          <rect x="400" y="50" width="80" height="54" rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="440" y="72" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#374151">mac-mini</text>
          <text x="440" y="86" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6B7280">-04</text>
          <rect x="415" y="106" width="50" height="6" rx="3" fill="#D1D5DB"></rect>
        </g>
        <g class="chaos-mac">
          <rect x="520" y="50" width="80" height="54" rx="8" fill="#FFFBEB" stroke="#FCD34D" stroke-width="1.5"></rect>
          <text x="560" y="72" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="600" fill="#92400E">mac-mini</text>
          <text x="560" y="86" text-anchor="middle" font-family="system-ui" font-size="9" fill="#D97706">-05 (stale)</text>
          <rect x="535" y="106" width="50" height="6" rx="3" fill="#FCD34D"></rect>
        </g>
        <g class="qmark"><text x="115" y="52" font-family="system-ui" font-size="20" font-weight="700" fill="#6366F1">?</text></g>
        <g class="qmark"><text x="235" y="52" font-family="system-ui" font-size="20" font-weight="700" fill="#6366F1">?</text></g>
        <g class="qmark"><text x="354" y="52" font-family="system-ui" font-size="20" font-weight="700" fill="#DC2626">!</text></g>
        <g class="qmark"><text x="474" y="52" font-family="system-ui" font-size="20" font-weight="700" fill="#6366F1">?</text></g>
        <g class="qmark"><text x="594" y="52" font-family="system-ui" font-size="20" font-weight="700" fill="#D97706">?</text></g>
        <g class="chaos-person">
          <circle cx="340" cy="185" r="18" fill="#E0E7FF" stroke="#6366F1" stroke-width="1.5"></circle>
          <text x="340" y="190" text-anchor="middle" font-family="system-ui" font-size="18">👤</text>
          <text x="340" y="215" text-anchor="middle" font-family="system-ui" font-size="11" fill="#4B5563">ops engineer</text>
          <text x="340" y="230" text-anchor="middle" font-family="system-ui" font-size="10" fill="#9CA3AF">manually SSHing everywhere</text>
        </g>
        <g>
          <line class="chaos-line" x1="327" y1="168" x2="80" y2="116" stroke="#9CA3AF" stroke-width="1.2" stroke-dasharray="4,3"></line>
          <line class="chaos-line" x1="330" y1="166" x2="200" y2="116" stroke="#9CA3AF" stroke-width="1.2" stroke-dasharray="4,3"></line>
          <line class="chaos-line" x1="340" y1="167" x2="320" y2="116" stroke="#DC2626" stroke-width="1.2" stroke-dasharray="4,3"></line>
          <line class="chaos-line" x1="350" y1="166" x2="440" y2="116" stroke="#9CA3AF" stroke-width="1.2" stroke-dasharray="4,3"></line>
          <line class="chaos-line" x1="353" y1="168" x2="560" y2="116" stroke="#D97706" stroke-width="1.2" stroke-dasharray="4,3"></line>
        </g>
      </svg>

Five Mac Minis, five SSH sessions, zero centralised state. One is offline — or maybe just slow to respond. Nobody knows.

The operational problems compound quickly: **package drift** (each node runs slightly different Homebrew versions after ad-hoc installs), **no audit trail** (who ran what and when), **no SBOM** (what is actually installed on each node?), and **no bootstrap automation** (standing up a new node takes an afternoon of manual work).

kri is the answer to all of these. It is a full control plane — a FastAPI backend, a React dashboard, SaltStack for ongoing configuration management, Ansible for bootstrap automation, and TimescaleDB for time-series drift history — containerised with Docker Compose and designed to run on a small management server (another Mac Mini, a Linux box, anything).

## 2 Architecture Overview

The kri stack is seven services in a single Docker Compose file. The browser talks to nginx (baked into the frontend container), which reverse-proxies the React SPA and forwards `/api/*` to the FastAPI container. Long-running operations — bootstrap, drift, SBOM indexing, playbook runs — are dispatched to Celery workers via Redis. The Salt master runs as a sidecar, maintaining persistent ZeroMQ connections to minions across your LAN.

<svg viewBox="0 0 740 500" width="100%" style="max-width:740px">
        <defs>
          <marker id="arrowBlue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4F46E5"></path>
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#16A34A"></path>
          </marker>
          <marker id="arrowGray" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#9CA3AF"></path>
          </marker>
        </defs>
        <g class="arch-1">
          <rect x="30" y="30" width="120" height="50" rx="10" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
          <text x="90" y="51" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#3730A3">Browser</text>
          <text x="90" y="67" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#6366F1">React + TanStack Query</text>
        </g>
        <g class="arch-line" style="animation-delay:0.35s">
          <line x1="152" y1="55" x2="210" y2="55" stroke="#4F46E5" stroke-width="1.8" marker-end="url(#arrowBlue)"></line>
          <text x="181" y="48" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6366F1">HTTP</text>
        </g>
        <g class="arch-2">
          <rect x="213" y="30" width="120" height="50" rx="10" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
          <text x="273" y="51" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#5B21B6">nginx</text>
          <text x="273" y="67" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#7C3AED">port 80 → api:8000</text>
        </g>
        <g class="arch-line" style="animation-delay:0.55s">
          <line x1="335" y1="55" x2="393" y2="55" stroke="#4F46E5" stroke-width="1.8" marker-end="url(#arrowBlue)"></line>
          <text x="364" y="48" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6366F1">/api/*</text>
        </g>
        <g class="arch-3">
          <rect x="396" y="20" width="150" height="70" rx="10" fill="#4F46E5" stroke="#4338CA" stroke-width="1.5"></rect>
          <text x="471" y="47" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="14" font-weight="700" fill="#FFFFFF">FastAPI</text>
          <text x="471" y="64" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#C7D2FE">api container · port 8000</text>
          <text x="471" y="79" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="9" fill="#A5B4FC">21 routers · JWT auth</text>
        </g>
        <g class="arch-line" style="animation-delay:0.75s">
          <line x1="471" y1="92" x2="471" y2="148" stroke="#4F46E5" stroke-width="1.8" marker-end="url(#arrowBlue)"></line>
        </g>
        <g class="arch-4">
          <rect x="330" y="152" width="130" height="54" rx="10" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="395" y="174" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#14532D">PostgreSQL</text>
          <text x="395" y="190" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#166534">+ TimescaleDB · fleet_demo</text>
        </g>
        <g class="arch-5">
          <rect x="480" y="152" width="110" height="54" rx="10" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
          <text x="535" y="174" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#991B1B">Redis 7.4</text>
          <text x="535" y="190" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#B91C1C">queue + JWT revocation</text>
        </g>
        <g class="arch-line" style="animation-delay:0.95s">
          <line x1="395" y1="208" x2="395" y2="255" stroke="#16A34A" stroke-width="1.8" marker-end="url(#arrowGreen)"></line>
          <line x1="535" y1="208" x2="450" y2="255" stroke="#16A34A" stroke-width="1.8" marker-end="url(#arrowGreen)"></line>
        </g>
        <g class="arch-6">
          <rect x="305" y="258" width="180" height="54" rx="10" fill="#4F46E5" stroke="#4338CA" stroke-width="1.5"></rect>
          <text x="395" y="279" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#FFFFFF">Celery Worker</text>
          <text x="395" y="296" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#C7D2FE">queues: default · drift · sbom · maintenance</text>
        </g>
        <g class="arch-line" style="animation-delay:1.15s">
          <line x1="340" y1="313" x2="220" y2="358" stroke="#4F46E5" stroke-width="1.8" marker-end="url(#arrowBlue)"></line>
        </g>
        <g class="arch-line" style="animation-delay:1.2s">
          <line x1="450" y1="313" x2="565" y2="358" stroke="#4F46E5" stroke-width="1.8" marker-end="url(#arrowBlue)"></line>
        </g>
        <g class="arch-7">
          <rect x="90" y="362" width="150" height="54" rx="10" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="165" y="383" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#78350F">Ansible Runner</text>
          <text x="165" y="399" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#92400E">bootstrap playbooks · SSH</text>
        </g>
        <g class="arch-8">
          <rect x="490" y="362" width="150" height="54" rx="10" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="565" y="383" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#14532D">Salt Master</text>
          <text x="565" y="399" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#166534">ports 4505/4506 · ZeroMQ</text>
        </g>
        <g class="arch-line" style="animation-delay:1.4s">
          <line x1="165" y1="418" x2="100" y2="455" stroke="#D97706" stroke-width="1.8" marker-end="url(#arrowGray)"></line>
          <line x1="165" y1="418" x2="220" y2="455" stroke="#D97706" stroke-width="1.8" marker-end="url(#arrowGray)"></line>
        </g>
        <g class="arch-line" style="animation-delay:1.45s">
          <line x1="565" y1="418" x2="510" y2="455" stroke="#16A34A" stroke-width="1.8" marker-end="url(#arrowGreen)"></line>
          <line x1="565" y1="418" x2="630" y2="455" stroke="#16A34A" stroke-width="1.8" marker-end="url(#arrowGreen)"></line>
        </g>
        <g class="arch-9">
          <rect x="40" y="458" width="120" height="36" rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="100" y="477" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#374151">Mac Minis (SSH)</text>
        </g>
        <g class="arch-9">
          <rect x="175" y="458" width="90" height="36" rx="8" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
          <text x="220" y="477" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#374151">bootstrap</text>
        </g>
        <g class="arch-10">
          <rect x="450" y="458" width="110" height="36" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="505" y="477" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#166534">Mac Minis</text>
        </g>
        <g class="arch-10">
          <rect x="575" y="458" width="110" height="36" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="630" y="477" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#166534">Salt minions</text>
        </g>
        <g class="arch-line" style="animation-delay:1.65s">
          <path d="M 100 458 Q 60 380 340 300" stroke="#9CA3AF" stroke-width="1.2" stroke-dasharray="5,3" fill="none" marker-end="url(#arrowGray)"></path>
          <text x="120" y="375" font-family="system-ui" font-size="9" fill="#9CA3AF">grains → /api/v1/ingest</text>
        </g>
      </svg>

Full kri architecture. Browser talks to nginx; nginx proxies the React SPA and `/api/*` to FastAPI. Celery workers pull from Redis queues and dispatch to Ansible (bootstrap) or Salt (config management). Mac Minis send grains back via the ingest endpoint.

The services in the Docker Compose file (`deploy/docker-compose.yml`) are: **db** (TimescaleDB on PostgreSQL 17), **redis** (7.4-alpine with authentication), **api** (FastAPI via uvicorn), **worker** (Celery, four queues), **beat** (Celery scheduler for periodic tasks), **salt-master** (saltstack/salt, ZeroMQ on 4505/4506), and **frontend** (React SPA behind nginx, port 80).

The API container and the worker share the same Docker image — the same codebase, just different entry points. Both mount the Salt PKI volume so that accepted key files are shared between the API (which reads/writes keys via the `/api/v1/salt/keys` router) and the Salt master (which authenticates minions against those files).

## 3 Bootstrap Flow: From Unknown to Fleet Member

Standing up a new Mac Mini in kri takes one click. The bootstrap process is a sequence of automated steps that goes from _"we know the IP"_ to _"minion authenticated, grains flowing, node visible in dashboard"_. Here is the sequence:

<svg viewBox="0 0 700 200" width="100%" style="max-width:700px">
        <defs>
          <marker id="stepArr" markerWidth="8" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L8,3.5 z" fill="#C7D2FE"></path>
          </marker>
        </defs>
        <line x1="18" y1="90" x2="682" y2="90" stroke="#E5E7EB" stroke-width="1.5"></line>
        <g class="step-card">
          <rect x="10" y="50" width="95" height="80" rx="8" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
          <text x="57" y="73" text-anchor="middle" font-family="system-ui" font-size="18">🖱️</text>
          <text x="57" y="92" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#3730A3">Click</text>
          <text x="57" y="106" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6366F1">+ Bootstrap</text>
          <text x="57" y="118" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6366F1">Node</text>
        </g>
        <g class="step-arrow" style="animation-delay:0.28s">
          <line x1="107" y1="90" x2="118" y2="90" stroke="#C7D2FE" stroke-width="1.5" marker-end="url(#stepArr)"></line>
        </g>
        <g class="step-card">
          <rect x="120" y="50" width="95" height="80" rx="8" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="167" y="73" text-anchor="middle" font-family="system-ui" font-size="18">🔐</text>
          <text x="167" y="92" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#78350F">Ansible SSH</text>
          <text x="167" y="106" text-anchor="middle" font-family="system-ui" font-size="9" fill="#92400E">connects to</text>
          <text x="167" y="118" text-anchor="middle" font-family="system-ui" font-size="9" fill="#92400E">target IP</text>
        </g>
        <g class="step-arrow" style="animation-delay:0.53s">
          <line x1="217" y1="90" x2="228" y2="90" stroke="#C7D2FE" stroke-width="1.5" marker-end="url(#stepArr)"></line>
        </g>
        <g class="step-card">
          <rect x="230" y="50" width="95" height="80" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="277" y="73" text-anchor="middle" font-family="system-ui" font-size="18">⚙️</text>
          <text x="277" y="92" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#14532D">Salt minion</text>
          <text x="277" y="106" text-anchor="middle" font-family="system-ui" font-size="9" fill="#166534">installed +</text>
          <text x="277" y="118" text-anchor="middle" font-family="system-ui" font-size="9" fill="#166534">configured</text>
        </g>
        <g class="step-arrow" style="animation-delay:0.78s">
          <line x1="327" y1="90" x2="338" y2="90" stroke="#C7D2FE" stroke-width="1.5" marker-end="url(#stepArr)"></line>
        </g>
        <g class="step-card">
          <rect x="340" y="50" width="95" height="80" rx="8" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
          <text x="387" y="73" text-anchor="middle" font-family="system-ui" font-size="18">📡</text>
          <text x="387" y="92" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#3730A3">Grains pushed</text>
          <text x="387" y="106" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6366F1">→ /api/v1</text>
          <text x="387" y="118" text-anchor="middle" font-family="system-ui" font-size="9" fill="#6366F1">/ingest/grains</text>
        </g>
        <g class="step-arrow" style="animation-delay:1.03s">
          <line x1="437" y1="90" x2="448" y2="90" stroke="#C7D2FE" stroke-width="1.5" marker-end="url(#stepArr)"></line>
        </g>
        <g class="step-card">
          <rect x="450" y="50" width="95" height="80" rx="8" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="497" y="73" text-anchor="middle" font-family="system-ui" font-size="18">🖥️</text>
          <text x="497" y="92" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#14532D">Node appears</text>
          <text x="497" y="106" text-anchor="middle" font-family="system-ui" font-size="9" fill="#166534">in fleet</text>
          <text x="497" y="118" text-anchor="middle" font-family="system-ui" font-size="9" fill="#166534">dashboard</text>
        </g>
        <g class="step-arrow" style="animation-delay:1.28s">
          <line x1="547" y1="90" x2="558" y2="90" stroke="#C7D2FE" stroke-width="1.5" marker-end="url(#stepArr)"></line>
        </g>
        <g class="step-card">
          <rect x="560" y="50" width="120" height="80" rx="8" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
          <text x="620" y="73" text-anchor="middle" font-family="system-ui" font-size="18">🔑</text>
          <text x="620" y="92" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#991B1B">Salt key pending</text>
          <text x="620" y="106" text-anchor="middle" font-family="system-ui" font-size="9" fill="#B91C1C">admin accepts</text>
          <text x="620" y="118" text-anchor="middle" font-family="system-ui" font-size="9" fill="#B91C1C">in Minion Keys UI</text>
        </g>
        <g font-family="system-ui" font-size="9" fill="#9CA3AF" text-anchor="middle">
          <text x="57"  y="145">Step 1</text>
          <text x="167" y="145">Step 2</text>
          <text x="277" y="145">Step 3</text>
          <text x="387" y="145">Step 4</text>
          <text x="497" y="145">Step 5</text>
          <text x="620" y="145">Step 6</text>
        </g>
      </svg>

Bootstrap is a one-click operation. Steps 2–4 run asynchronously in the Celery worker. The UI streams live Ansible output during the process.

A critical detail: on re-bootstrap, kri automatically deletes the node's previously accepted Salt key before queuing the Ansible task. This prevents the _"cached the public key"_ authentication loop where a re-imaged Mac Mini presents a new keypair but the master still has the old accepted key on disk. The response tells the operator exactly what happened:

fleet\_platform/api/routes/ansible.py — bootstrap endpoint

```bash
@router.post("/bootstrap", response_model=BootstrapResponse, status_code=202)
@limiter.limit("10/minute")
async def bootstrap(
    request: Request,
    payload: BootstrapRequest,
    db: AsyncSession = Depends(get_db),
    claims: dict = Depends(require_role("operator", "admin")),
):
    # Validate minion_id format: [a-zA-Z0-9._-] only
    if not _MINION_ID_RE.match(payload.minion_id):
        raise HTTPException(status_code=422, ...)

    # 409 if already bootstrapping — prevents double-queue
    if node and node.bootstrap_status == "bootstrapping":
        raise HTTPException(status_code=409, detail="Node is already being bootstrapped")

    # Delete the old accepted Salt key to prevent auth loop on re-bootstrap
    _accepted_key = Path(_pki_base) / "minions" / payload.minion_id
    if _accepted_key.exists():
        _accepted_key.unlink()
        salt_key_deleted = True

    task = bootstrap_node.delay(
        str(node.id), payload.target_ip,
        ssh_username=payload.ssh_username,
        ssh_password=payload.ssh_password,
    )
    return BootstrapResponse(node_id=node.id, job_id=task.id, ...)
```

The node must belong to at least one group before bootstrapping is allowed. This ensures that SSH credentials — stored encrypted with Fernet at the group level — are available to the Ansible runner. The group model is the administrative boundary around a set of nodes.

## 4 Drift Detection: Baseline vs Reality

Drift detection is kri's most operationally valuable feature. It works by comparing a **baseline** — a snapshot of the intended state, pinned from a known-good node — against the **actual state** reported by each node's Salt grains on every check-in. The result is a numeric drift score: 0 means perfectly aligned, higher numbers mean more divergence.

<svg viewBox="0 0 680 300" width="100%" style="max-width:680px">
        <defs>
        </defs>
        <g class="drift-col">
          <rect x="20" y="20" width="200" height="240" rx="10" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
          <text x="120" y="46" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#14532D">Baseline (Expected)</text>
          <text x="120" y="62" text-anchor="middle" font-family="system-ui" font-size="18">🔒</text>
          <g font-family="'SF Mono', monospace" font-size="11" fill="#166534">
            <text x="36" y="96">brew: node@20.11.0</text>
            <text x="36" y="116">brew: python@3.12.2</text>
            <text x="36" y="136">brew: git@2.44.0</text>
            <text x="36" y="156">brew: curl@8.6.0</text>
            <text x="36" y="176">Xcode: 15.3</text>
            <text x="36" y="196">macOS: 14.4.1</text>
          </g>
        </g>
        <g class="drift-col">
          <rect x="460" y="20" width="200" height="240" rx="10" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="560" y="46" text-anchor="middle" font-family="system-ui" font-size="13" font-weight="700" fill="#78350F">Node State (Actual)</text>
          <text x="560" y="62" text-anchor="middle" font-family="system-ui" font-size="18">📡</text>
          <g font-family="'SF Mono', monospace" font-size="11">
            <text x="476" y="96"  fill="#166534">brew: node@20.11.0</text>
            <text x="476" y="116" fill="#166534">brew: python@3.12.2</text>
            <text x="476" y="136" fill="#166534">brew: git@2.44.0</text>
            <text x="476" y="156" fill="#B91C1C">brew: curl@8.7.1 ⬆</text>
            <text x="476" y="176" fill="#B91C1C">Xcode: 15.2 (stale)</text>
            <text x="476" y="196" fill="#166534">macOS: 14.4.1</text>
          </g>
        </g>
        <line class="match-line" x1="220" y1="96"  x2="460" y2="96"  stroke="#16A34A" stroke-width="1.5"></line>
        <line class="match-line" x1="220" y1="116" x2="460" y2="116" stroke="#16A34A" stroke-width="1.5"></line>
        <line class="match-line" x1="220" y1="136" x2="460" y2="136" stroke="#16A34A" stroke-width="1.5"></line>
        <line class="match-line" x1="220" y1="196" x2="460" y2="196" stroke="#16A34A" stroke-width="1.5"></line>
        <line class="miss-line" x1="220" y1="156" x2="460" y2="156" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="6,3"></line>
        <line class="miss-line" x1="220" y1="176" x2="460" y2="176" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="6,3"></line>
        <g class="score-reveal">
          <rect x="282" y="220" width="116" height="50" rx="10" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
          <text x="340" y="240" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#B91C1C">Drift Score</text>
          <text x="340" y="261" text-anchor="middle" font-family="system-ui" font-size="24" font-weight="800" fill="#DC2626">55</text>
        </g>
        <text x="340" y="15" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#4B5563">Drift Engine — comparing baseline vs live node state</text>
        <g font-family="system-ui" font-size="10">
          <text x="340" y="106" text-anchor="middle" fill="#16A34A">✓ match</text>
          <text x="340" y="166" text-anchor="middle" fill="#DC2626">✗ drift</text>
        </g>
      </svg>

Two packages diverged: curl bumped a minor version, Xcode is one release behind. The drift engine produces a score of 55. The `compute_drift` Celery task fires automatically after every grain ingest.

The ingest endpoint triggers drift computation on every grain check-in via a Celery task. Drift data is stored in TimescaleDB as a time-series, meaning you can trend drift scores over time — a useful signal for understanding whether your fleet is drifting further apart or converging after a remediation run.

### Grain extraction: the ingest endpoint

The `_extract_node_updates` function is responsible for translating raw Salt grains — the facts the minion reports about itself — into structured node fields. It handles IP address resolution, hostname sanitisation (including filtering out reverse-DNS artefacts from Tailscale), and hardware metadata:

fleet\_platform/api/routes/ingest.py — grain extraction

```bash
def _extract_node_updates(grains: dict) -> dict:
    ip: str | None = None
    _skip_prefixes = ("127.", "169.254.", "::1", "fe80")

    ip4 = grains.get("ip4_interfaces", {})
    for iface, addrs in ip4.items():
        if iface in ("lo", "lo0"):
            continue
        for addr in addrs:
            if not any(addr.startswith(p) for p in _skip_prefixes):
                ip = addr; break

    # Hostname priority:
    # 1. `host` grain — uname -n, always reliable
    # 2. `fqdn` — only if NOT a reverse-DNS artefact (.ip6.arpa)
    # 3. `id` grain — minion ID, always present as last resort
    raw_host = grains.get("host") or ""
    raw_fqdn = grains.get("fqdn") or ""
    fqdn_valid = raw_fqdn and not raw_fqdn.lower().endswith(
        (".ip6.arpa", ".in-addr.arpa")
    )
    hostname = raw_host or (raw_fqdn if fqdn_valid else None) or grains.get("id")

    return {
        "hostname":       hostname,
        "ip_address":     ip,
        "os_version":     grains.get("osrelease"),
        "hardware_model": grains.get("productname"),
        "cpu_cores":      grains.get("num_cpus"),
        "ram_gb":         grains.get("mem_total", 0) / 1024 if grains.get("mem_total") else None,
        "storage_gb":     _extract_storage_gb(grains),
        "status":         "online",
    }
```

## 5 Salt Key Lifecycle

SaltStack's security model requires that a minion's public key be explicitly accepted by the master before any communication can happen. kri enforces a **no-auto-accept policy**: keys always land in _pending_ and require an administrator action. This is the correct posture for a production fleet — it prevents rogue minions from connecting without authorisation.

<svg viewBox="0 0 340 520" width="100%" style="max-width:340px">
        <defs>
          <marker id="flowArr" markerWidth="8" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L0,7 L8,3.5 z" fill="#6B7280"></path>
          </marker>
        </defs>
        <g class="flow-node">
          <rect x="60" y="10" width="220" height="50" rx="10" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
          <text x="170" y="31" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#3730A3">Bootstrap triggered</text>
          <text x="170" y="48" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#6366F1">Ansible run queued in Celery</text>
        </g>
        <g class="flow-connector" style="animation-delay:0.25s">
          <line x1="170" y1="62" x2="170" y2="84" stroke="#6B7280" stroke-width="1.5" marker-end="url(#flowArr)"></line>
        </g>
        <g class="flow-node">
          <rect x="60" y="88" width="220" height="50" rx="10" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
          <text x="170" y="109" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#991B1B">Old key auto-deleted</text>
          <text x="170" y="126" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#B91C1C">/etc/salt/pki/master/minions/{id}</text>
        </g>
        <g class="flow-connector" style="animation-delay:0.45s">
          <line x1="170" y1="140" x2="170" y2="162" stroke="#6B7280" stroke-width="1.5" marker-end="url(#flowArr)"></line>
        </g>
        <g class="flow-node">
          <rect x="60" y="166" width="220" height="50" rx="10" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
          <text x="170" y="187" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#78350F">Ansible SSH bootstrap</text>
          <text x="170" y="204" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#92400E">installs salt-minion + new keypair</text>
        </g>
        <g class="flow-connector" style="animation-delay:0.65s">
          <line x1="170" y1="218" x2="170" y2="240" stroke="#6B7280" stroke-width="1.5" marker-end="url(#flowArr)"></line>
        </g>
        <g class="flow-node">
          <polygon points="170,248 260,278 170,308 80,278" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></polygon>
          <text x="170" y="274" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#14532D">New key arrives</text>
          <text x="170" y="289" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#166534">in pending queue</text>
        </g>
        <g class="flow-connector" style="animation-delay:0.85s">
          <line x1="170" y1="310" x2="170" y2="332" stroke="#6B7280" stroke-width="1.5" marker-end="url(#flowArr)"></line>
        </g>
        <g class="flow-node">
          <rect x="60" y="336" width="220" height="50" rx="10" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"></rect>
          <text x="170" y="357" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#3730A3">Admin reviews Minion Keys</text>
          <text x="170" y="374" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#6366F1">POST /api/v1/salt/keys/{id}/accept</text>
        </g>
        <g class="flow-connector" style="animation-delay:1.05s">
          <line x1="170" y1="388" x2="170" y2="410" stroke="#16A34A" stroke-width="1.8" marker-end="url(#flowArr)"></line>
        </g>
        <g class="flow-node">
          <rect x="60" y="414" width="220" height="50" rx="10" fill="#F0FDF4" stroke="#86EFAC" stroke-width="2"></rect>
          <text x="170" y="435" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#14532D">Node authenticated ✓</text>
          <text x="170" y="452" text-anchor="middle" dominant-baseline="middle" font-family="system-ui" font-size="10" fill="#166534">Salt commands now work</text>
        </g>
      </svg>

The full Salt key lifecycle. kri never auto-accepts — every key requires a deliberate accept action from an operator or admin.

The Salt key API is intentionally thin — it reads directly from the Salt PKI directory mounted as a shared volume, mirroring what `salt-key -L` would show. This avoids any state synchronisation problem: the source of truth is always the filesystem the Salt master itself reads.

fleet\_platform/api/routes/salt\_keys.py — key management

```bash
@router.post("/keys/{minion_id}/accept")
async def accept_key(
    minion_id: str,
    _: dict = Depends(require_role("operator", "admin")),
):
    "Accept a pending minion key — moves file from minions_pre/ to minions/"
    _validate_minion_id(minion_id)
    dirs = _dirs()
    src = dirs["pending"] / minion_id
    if not src.exists():
        raise HTTPException(status_code=404, detail=f"No pending key for '{minion_id}'")
    dirs["accepted"].mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dirs["accepted"] / minion_id))
    return {"status": "accepted", "minion_id": minion_id}

@router.delete("/keys/{minion_id}")
async def delete_key(
    minion_id: str,
    _: dict = Depends(require_role("admin")),
):
    "Delete a key from any status bucket (accepted, pending, rejected, denied)"
    _validate_minion_id(minion_id)
    for path in _dirs().values():
        target = path / minion_id
        if target.exists():
            target.unlink()
            return {"status": "deleted", "minion_id": minion_id}
    raise HTTPException(status_code=404, detail=f"No key found for '{minion_id}'")
```

**Why not use `salt-key` CLI via subprocess?** We considered it. The problem is that the Salt master container may not be reachable from the API container via subprocess, and shelling out into another container is fragile. Reading/writing the shared PKI volume directly is simpler, faster, and has no external dependency beyond the shared Docker volume mount.

## 6 Security Architecture

kri is designed to manage infrastructure that signs iOS apps and has privileged SSH access to build machines. Security is a first-class concern, not an afterthought. Here is the full security stack:

Fernet encryption at rest

SSH passwords, SSH keys, playbook source tokens, and all node secrets are encrypted with Fernet (symmetric, authenticated) before being written to PostgreSQL. The key lives in the environment, never in the database.

JWT + Redis revocation

Access tokens are JWTs (short-lived). Refresh tokens are stored in Redis with a TTL. Logout invalidates the Redis entry immediately — no waiting for the JWT to expire naturally.

WebSSH with command blocking

The WebSSH terminal (proxied via the `/api/v1/webssh` router) supports a configurable denylist of commands. Dangerous operations can be blocked at the proxy level without touching the target node's sudoers.

SBOM + CVE scanning (Trivy)

Every node reports its installed packages via Salt grains. kri indexes these as a Software Bill of Materials and can run Trivy CVE scans against the SBOM, surfacing vulnerable packages in the dashboard.

Salt minion key approval gate

No minion is ever auto-accepted. Every new key lands in _pending_ and requires an explicit admin action. This prevents rogue or mis-configured machines from joining the Salt bus.

Pre-push credential hooks

Git pre-push hooks (committed into the repo) scan staged diffs for secrets using `detect-secrets`. A push that contains a credential pattern is blocked before it reaches the remote.

**Node tokens:** Each Mac Mini authenticates to the ingest endpoint using a per-node token (bcrypt-hashed in PostgreSQL, transmitted via the `X-Node-Token` header). This token is generated at bootstrap time and written to the node's Salt pillar. The API never stores the plaintext token after generation.

The FastAPI app itself applies rate limiting (via slowapi) to all ingest and bootstrap endpoints, CORS is restricted to the configured frontend origin, and the Swagger UI is disabled in production (only available when `is_development=True`).

## 7 API Router Structure

The FastAPI application (`fleet_platform/api/main.py`) registers 21 routers at startup. Each router is a focused module with a single responsibility. The full list gives a clear picture of kri's surface area:

| Router | Prefix | Purpose |
| --- | --- | --- |
| health | `/health` | Liveness / readiness probe |
| auth | `/api/v1/auth` | Login, refresh, logout, user management |
| nodes | `/api/v1/nodes` | Node CRUD, tags, facts history |
| ingest | `/api/v1/ingest` | Grain ingest, execution results, SBOM upload |
| fleet | `/api/v1/fleet` | Fleet summary, status aggregates |
| groups | `/api/v1/groups` | Node grouping, group SSH credentials |
| baselines | `/api/v1/baselines` | Baseline snapshots, pinning, comparison |
| drift | `/api/v1/drift` | Per-node drift scores and history |
| ansible | `/api/v1/ansible` | Bootstrap, playbook discovery and execution |
| salt_keys | `/api/v1/salt` | Minion key list, accept, reject, delete |
| salt_ops | `/api/v1/salt-ops` | Ad-hoc Salt command execution |
| sbom | `/api/v1/sbom` | SBOM records, CVE scan results |
| webssh | `/api/v1/webssh` | WebSocket SSH terminal proxy |
| vnc | `/api/v1/vnc` | VNC proxy (screen sharing) |
| security | `/api/v1/security` | Secrets scanning, security policies |
| audit | `/api/v1/audit` | Audit log of all admin actions |
| node_secrets | `/api/v1/node-secrets` | Per-node encrypted secrets |
| group_secrets | `/api/v1/group-secrets` | Group-scoped encrypted secrets |
| alerts | `/api/v1/alerts` | Drift/SBOM alert rules |
| ios_tracking | `/api/v1/ios` | Xcode version, cert expiry, signing identities |
| platform_settings | `/api/v1/settings` | Runtime config panel, playbook sources |

All routers are async-first. Database sessions are injected via `get_db` (SQLAlchemy async session factory), authentication is enforced with `require_role("viewer" | "operator" | "admin")` dependency injection, and the unhandled exception handler logs structured errors (via structlog) and returns a consistent `{"error": {"code": ..., "message": ...}}` envelope.

## 8 Tech Stack Rationale

Every technology choice in kri came with a deliberate trade-off evaluation. Here is the honest account:

| Technology | Why chosen | Trade-off accepted |
| --- | --- | --- |
| FastAPI | Async-first (native asyncio), auto-generates OpenAPI docs, Pydantic v2 for schema validation, excellent ecosystem | Python async has gotchas; CPU-bound tasks must be offloaded to Celery (we do) |
| PostgreSQL + TimescaleDB | TimescaleDB hypertables give us automatic partitioning for time-series drift/SBOM data without a separate TSDB. Standard Postgres SQL for everything else | Heavier than SQLite; requires a real DB server, but appropriate for production fleet data |
| Celery + Redis | Distributed task queue with proper retry semantics, multiple named queues (drift, sbom, maintenance, default), and built-in result backend. Redis also serves as the JWT revocation store — dual use | Redis is an additional service to operate; we accept this because we need it for JWT revocation anyway |
| SaltStack | Pull-based architecture: minions maintain long-lived ZeroMQ connections to the master and react to commands without requiring inbound firewall rules. Excellent macOS grain support | Salt's learning curve is steep; we wrap most operations behind the kri API so operators never touch `salt` CLI directly |
| Ansible | Idiomatic bootstrap automation — SSH-based, agentless, mature macOS support via community.general. The salt-minion install playbook is simple YAML any engineer can read and audit | Ansible is push-based: bootstrap requires SSH access. After bootstrap, Salt takes over for ongoing management |
| React + TanStack Query | TanStack Query provides background refetch, stale-while-revalidate, and optimistic updates out of the box. The fleet dashboard stays live without manual polling code | React bundle size; acceptable because this is an internal tool, not a consumer app |
| Python (backend) | Not CPU-bound (all heavy work is in Ansible/Salt/Celery), native macOS system integration via pyobjc if needed, vast ecosystem for security tooling (cryptography, bcrypt, detect-secrets) | GIL limits true CPU parallelism — mitigated by Celery workers and async I/O for everything else |
| uv (package manager) | 10–100x faster than pip for dependency resolution and install. Lockfile-based reproducible builds. Drop-in replacement for pip in Docker layers | Newer tool — some CI environments may need `pip install uv` first |

**Why Python for the backend?** The common objection is performance. kri's API is not CPU-bound — it spends its time waiting on database queries, Redis calls, and dispatching Celery tasks. Async FastAPI handles hundreds of concurrent requests efficiently in this I/O-bound regime. The work that is CPU-intensive (Ansible playbooks, Salt state execution, Trivy scans) runs in the worker container and never blocks the API event loop.

## 9 What's Next

kri is under active development. The roadmap for the next quarter, in rough priority order:

-   **Node Secrets → Salt Pillar injection**

    Encrypted per-node secrets (API keys, signing certificates) automatically injected into the Salt pillar at bootstrap time, so playbooks can reference them as `{{ pillar['secret_name'] }}` without anyone manually managing pillar files.

-   **Scheduled Salt state execution**

    Celery Beat already runs periodic tasks. The next step is a scheduler UI where admins can define _"run state X on group Y every 6 hours"_ — continuous desired-state enforcement, not just drift reporting.

-   **iOS-specific tracking improvements**

    The `/api/v1/ios` router already exists. Next: Xcode version matrix across the fleet, code signing certificate expiry alerts (30-day, 7-day, 1-day thresholds), and Jenkins agent status tracking per node.

-   **Deployment history timeline**

    A per-node timeline view showing all bootstrap runs, playbook executions, Salt state applications, and drift score changes on a single axis — full operational history in one place.

-   **Alert webhooks**

    The alerts router exists but currently only surfaces alerts in the dashboard. Slack and PagerDuty webhook delivery for drift threshold breaches and CVE discoveries is the obvious next step.

* * *
