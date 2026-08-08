---
title: "Operating kri — The Fleet Manager's Field Guide"
date: 2026-05-21
description: "You've deployed kri. Postgres and Redis are in Docker, the FastAPI backend is on port 8000, and the React dashboard is on 5173. This post is the practical reference for the first week of operating it: starting services, reading logs, and diagnosing a node that won't bootstrap."
tags: [kri, operations, devops]
draft: false
---

DevOps Field Guide

* * *

You've deployed kri. Postgres and Redis are in Docker, the FastAPI backend is on port 8000, and the React dashboard is on 5173. This post is the practical reference for the first week of operating it: starting services, reading logs, and diagnosing a node that won't bootstrap.

## 1\. Starting kri

Everything goes through `./scripts/kri.sh`. It handles startup order, PID files, health checks on the Docker containers, and log routing.

### Command reference

| Command | What it does |
| --- | --- |
| ./scripts/kri.sh start | Brings up postgres + redis (Docker), waits for healthy, then starts API, Celery worker, and Vite frontend in that order |
| ./scripts/kri.sh stop | Kills frontend, worker, API (reverse order), then calls docker compose stop |
| ./scripts/kri.sh restart | stop + start |
| ./scripts/kri.sh status | Reads each PID file, checks if the process is alive, and prints Docker container health |
| ./scripts/kri.sh logs api\|worker\|frontend | tail -f on the requested log file — Ctrl-C to exit |
| ./scripts/kri.sh test [grep] | Runs the Playwright E2E suite; pass an optional grep pattern to filter specs |

```bash
# Normal startup sequence
./scripts/kri.sh start

# Expected output
  kri fleet management platform
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Infrastructure ready
✓ API running on :8000 (log: .kri-logs/api.log)
✓ Celery worker running (log: .kri-logs/worker.log)
✓ Frontend running on :5173 (log: .kri-logs/frontend.log)

✓ kri is up →  http://localhost:5173
   API     →  http://localhost:8000/docs
```

ℹ

The script waits up to 20 seconds for both Docker containers to report `healthy` before starting the application services. If they stay unhealthy, run `docker compose -f deploy/docker-compose.yml ps` to investigate.

### Under the hood — PID tracking

Each process writes its PID to `.kri-pids/<name>.pid`. The `status` command reads these files and runs `kill -0 <pid>` to confirm the process is alive. If kri.sh crashes mid-start, stale PID files can cause the next `start` to emit false "already running" warnings — just delete `.kri-pids/` and try again.

## 2\. Where Logs Live

| Service | Log path | What to look for |
| --- | --- | --- |
| API | .kri-logs/api.log | HTTP requests, SQL queries, auth events, FastAPI startup errors |
| Worker | .kri-logs/worker.log | Bootstrap task lifecycle, Ansible stdout lines, drift computation, SBOM tasks |
| Frontend | .kri-logs/frontend.log | Vite dev server output, HMR reload events, TypeScript compile errors |

### Useful log commands

```bash
# Use the kri.sh shortcut
./scripts/kri.sh logs worker

# Or tail directly
tail -f .kri-logs/api.log
tail -f .kri-logs/worker.log

# Filter bootstrap-related lines
grep -i "bootstrap" .kri-logs/worker.log | tail -50

# Surface errors in the last 200 lines of the API log
tail -200 .kri-logs/api.log | grep -i "error\|exception\|traceback"

# Live filter — only worker lines mentioning a task
tail -f .kri-logs/worker.log | grep --line-buffered "Task\|TASK\|bootstrap"
```

### Log and telemetry architecture

<svg width="720" height="320" viewBox="0 0 720 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Diagram showing where kri writes log and telemetry data">
        <rect x="0"   y="0" width="240" height="320" rx="8" fill="#F0F9FF"></rect>
        <rect x="240" y="0" width="240" height="320" rx="8" fill="#F0FDF4"></rect>
        <rect x="480" y="0" width="240" height="320" rx="8" fill="#FFFBEB"></rect>
        <text x="120" y="28" text-anchor="middle" fill="#1D4ED8" font-size="12" font-weight="600">Application Layer</text>
        <text x="360" y="28" text-anchor="middle" fill="#065F46" font-size="12" font-weight="600">Persistent Store</text>
        <text x="600" y="28" text-anchor="middle" fill="#92400E" font-size="12" font-weight="600">File Outputs</text>
        <rect x="20" y="50" width="200" height="54" rx="6" fill="#2563EB" opacity="0.9"></rect>
        <text x="120" y="72" text-anchor="middle" fill="white" font-size="13" font-weight="600">FastAPI :8000</text>
        <text x="120" y="90" text-anchor="middle" fill="#BFDBFE" font-size="11">HTTP / auth / routes</text>
        <rect x="20" y="130" width="200" height="54" rx="6" fill="#059669" opacity="0.9"></rect>
        <text x="120" y="152" text-anchor="middle" fill="white" font-size="13" font-weight="600">Celery Worker</text>
        <text x="120" y="170" text-anchor="middle" fill="#A7F3D0" font-size="11">bootstrap_node task</text>
        <rect x="20" y="210" width="200" height="54" rx="6" fill="#7C3AED" opacity="0.85"></rect>
        <text x="120" y="232" text-anchor="middle" fill="white" font-size="13" font-weight="600">Vite Frontend :5173</text>
        <text x="120" y="250" text-anchor="middle" fill="#DDD6FE" font-size="11">React / HMR dev server</text>
        <rect x="260" y="50" width="200" height="80" rx="6" fill="#0F766E" opacity="0.9"></rect>
        <text x="360" y="75" text-anchor="middle" fill="white" font-size="13" font-weight="600">PostgreSQL</text>
        <text x="360" y="93" text-anchor="middle" fill="#99F6E4" font-size="10">nodes.bootstrap_status</text>
        <text x="360" y="109" text-anchor="middle" fill="#99F6E4" font-size="10">nodes.bootstrap_logs (stdout)</text>
        <rect x="260" y="148" width="200" height="54" rx="6" fill="#0F766E" opacity="0.7"></rect>
        <text x="360" y="170" text-anchor="middle" fill="white" font-size="13" font-weight="600">audit_events</text>
        <text x="360" y="188" text-anchor="middle" fill="#A7F3D0" font-size="10">every user action logged</text>
        <rect x="260" y="220" width="200" height="54" rx="6" fill="#B91C1C" opacity="0.85"></rect>
        <text x="360" y="242" text-anchor="middle" fill="white" font-size="13" font-weight="600">Redis</text>
        <text x="360" y="260" text-anchor="middle" fill="#FECACA" font-size="10">Celery broker + results</text>
        <rect x="500" y="50"  width="200" height="40" rx="6" fill="#D97706" opacity="0.85"></rect>
        <text x="600" y="75" text-anchor="middle" fill="white" font-size="12" font-weight="500">.kri-logs/api.log</text>
        <rect x="500" y="106" width="200" height="40" rx="6" fill="#D97706" opacity="0.85"></rect>
        <text x="600" y="131" text-anchor="middle" fill="white" font-size="12" font-weight="500">.kri-logs/worker.log</text>
        <rect x="500" y="162" width="200" height="40" rx="6" fill="#D97706" opacity="0.7"></rect>
        <text x="600" y="187" text-anchor="middle" fill="white" font-size="12" font-weight="500">.kri-logs/frontend.log</text>
        <rect x="500" y="220" width="200" height="40" rx="6" fill="#78716C" opacity="0.75"></rect>
        <text x="600" y="240" text-anchor="middle" fill="white" font-size="11" font-weight="500">/srv/salt/pillar/</text>
        <text x="600" y="254" text-anchor="middle" fill="#D6D3D1" font-size="10">&lt;minion_id&gt;.sls</text>
        <path d="M220 77 L258 77" stroke="#2563EB" stroke-width="1.5" marker-end="url(#arr-blue)"></path>
        <path d="M220 95 L498 70" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-amber)"></path>
        <path d="M220 155 L258 120" stroke="#059669" stroke-width="1.5" marker-end="url(#arr-green)"></path>
        <path d="M220 170 L258 172" stroke="#059669" stroke-width="1.5" marker-end="url(#arr-green)"></path>
        <path d="M220 183 L258 240" stroke="#B91C1C" stroke-width="1.5" marker-end="url(#arr-red)"></path>
        <path d="M220 157 L498 126" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-amber)"></path>
        <path d="M220 175 L498 235" stroke="#78716C" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-grey)"></path>
        <path d="M220 237 L498 182" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#arr-amber)"></path>
        <circle r="5" fill="#2563EB" opacity="0.7">
          <animateMotion dur="2.5s" repeatCount="indefinite">
            <mpath href="#path-api-pg"></mpath>
          </animateMotion>
        </circle>
        <path id="path-api-pg" d="M220 77 L258 77" fill="none"></path>
        <circle r="5" fill="#059669" opacity="0.7">
          <animateMotion dur="3s" repeatCount="indefinite" begin="1s">
            <mpath href="#path-wk-pg"></mpath>
          </animateMotion>
        </circle>
        <path id="path-wk-pg" d="M220 155 L258 120" fill="none"></path>
        <defs>
          <marker id="arr-blue"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#2563EB"></path>
          </marker>
          <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#059669"></path>
          </marker>
          <marker id="arr-amber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#D97706"></path>
          </marker>
          <marker id="arr-red"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#B91C1C"></path>
          </marker>
          <marker id="arr-grey"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#78716C"></path>
          </marker>
        </defs>
      </svg>

## 3\. Debugging a Stuck Bootstrap

A bootstrap runs as a Celery task that SSHs into the target Mac Mini via Ansible, installs the Salt minion, writes a pillar file, and waits for the minion to check in. Failures at any stage surface through the API.

### The bootstrap flow

<svg width="680" height="200" viewBox="0 0 680 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Bootstrap flow: Celery task to Ansible to Mac Mini to Salt minion connecting">
        <rect x="10" y="70" width="120" height="60" rx="8" fill="#2563EB"></rect>
        <text x="70" y="95" text-anchor="middle" fill="white" font-size="12" font-weight="600">FastAPI</text>
        <text x="70" y="111" text-anchor="middle" fill="#BFDBFE" font-size="10">POST /bootstrap</text>
        <text x="70" y="124" text-anchor="middle" fill="#BFDBFE" font-size="10">enqueues task</text>
        <rect x="170" y="70" width="120" height="60" rx="8" fill="#059669"></rect>
        <text x="230" y="95" text-anchor="middle" fill="white" font-size="12" font-weight="600">Celery Worker</text>
        <text x="230" y="111" text-anchor="middle" fill="#A7F3D0" font-size="10">bootstrap_node()</text>
        <text x="230" y="124" text-anchor="middle" fill="#A7F3D0" font-size="10">reads Settings</text>
        <rect x="330" y="70" width="120" height="60" rx="8" fill="#7C3AED"></rect>
        <text x="390" y="95" text-anchor="middle" fill="white" font-size="12" font-weight="600">ansible-runner</text>
        <text x="390" y="111" text-anchor="middle" fill="#DDD6FE" font-size="10">SSH → Mac Mini</text>
        <text x="390" y="124" text-anchor="middle" fill="#DDD6FE" font-size="10">install salt pkg</text>
        <rect x="490" y="70" width="180" height="60" rx="8" fill="#B45309"></rect>
        <text x="580" y="92" text-anchor="middle" fill="white" font-size="12" font-weight="600">Mac Mini</text>
        <text x="580" y="108" text-anchor="middle" fill="#FDE68A" font-size="10">salt-minion starts</text>
        <text x="580" y="122" text-anchor="middle" fill="#FDE68A" font-size="10">connects to salt-master</text>
        <path d="M130 100 L168 100" stroke="#94A3B8" stroke-width="2" marker-end="url(#arr-gray2)"></path>
        <path d="M290 100 L328 100" stroke="#94A3B8" stroke-width="2" marker-end="url(#arr-gray2)"></path>
        <path d="M450 100 L488 100" stroke="#94A3B8" stroke-width="2" marker-end="url(#arr-gray2)"></path>
        <circle r="5" fill="#FCD34D" opacity="0.9">
          <animateMotion dur="3s" repeatCount="indefinite" begin="0s">
            <mpath href="#flow-1"></mpath>
          </animateMotion>
        </circle>
        <path id="flow-1" d="M130 100 L168 100" fill="none"></path>
        <circle r="5" fill="#FCD34D" opacity="0.9">
          <animateMotion dur="3s" repeatCount="indefinite" begin="1s">
            <mpath href="#flow-2"></mpath>
          </animateMotion>
        </circle>
        <path id="flow-2" d="M290 100 L328 100" fill="none"></path>
        <circle r="5" fill="#FCD34D" opacity="0.9">
          <animateMotion dur="3s" repeatCount="indefinite" begin="2s">
            <mpath href="#flow-3"></mpath>
          </animateMotion>
        </circle>
        <path id="flow-3" d="M450 100 L488 100" fill="none"></path>
        <text x="70"  y="160" text-anchor="middle" fill="#6B7280" font-size="11">① queued</text>
        <text x="230" y="160" text-anchor="middle" fill="#6B7280" font-size="11">② task starts</text>
        <text x="390" y="160" text-anchor="middle" fill="#6B7280" font-size="11">③ SSH + install</text>
        <text x="580" y="160" text-anchor="middle" fill="#6B7280" font-size="11">④ minion online</text>
        <text x="230" y="185" text-anchor="middle" fill="#94A3B8" font-size="10">status written to DB at each step</text>
        <defs>
          <marker id="arr-gray2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#94A3B8"></path>
          </marker>
        </defs>
      </svg>

### Common failures at a glance

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| UNREACHABLE | Wrong IP or Mac Mini is off | Verify IP; test with ping <ip> |
| Authentication failure | Wrong SSH credentials | Settings → Bootstrap — update SSH username / password |
| Timeout at 20 min | Salt minion installed but cannot reach master | Check network path; verify Salt master address in Settings |
| no hosts matched | minion_id contains illegal characters | Only [a-zA-Z0-9._-] allowed, max 128 chars |
| ansible.posix not found | Missing Ansible collection | ansible-galaxy collection install ansible.posix |
| Stuck in bootstrapping | Celery worker crashed mid-task | Cancel via API then retry (see below) |

### Step-by-step debug procedure

1.  **Find the node in the database.** The minion\_id is the Salt identifier — usually `hostname.local` or `hostname.domain`.

    ```bash
    docker exec deploy-postgres-1 psql -U fleet -d fleet_demo -c \
      "SELECT id, minion_id, bootstrap_status, bootstrap_error, bootstrap_ip \
       FROM nodes WHERE minion_id LIKE '%mm1%';"
    ```

2.  **Check the worker log** for the last Ansible task name — the worker writes `[blocked at: TASK <name>]` into `bootstrap_error` every 5 seconds while running.

    ```bash
    grep -i "bootstrap\|blocked\|TASK" .kri-logs/worker.log | tail -30
    ```

3.  **Pull the full bootstrap log** from the API. This returns the complete Ansible stdout stored in the database after the run ends.

    ```bash
    curl -s http://localhost:8000/api/v1/ansible/bootstrap/<node_id>/logs \
      -H "Authorization: Bearer <token>" \
      | jq '{status: .bootstrap_status, stdout: .ansible_stdout}'
    ```

4.  **Cancel a stuck bootstrap** if the status is `bootstrapping` or `pending` and the worker log has gone silent. This resets the status to `failed` so you can retry.

    ```bash
    curl -s -X POST http://localhost:8000/api/v1/ansible/bootstrap/<node_id>/cancel \
      -H "Authorization: Bearer <token>"
    ```

5.  **Fix the root cause**, then trigger a fresh bootstrap from Fleet → Add Node. Re-submitting with the same minion\_id is safe — kri reuses the existing node row.

## 4\. Reading Bootstrap Telemetry

kri stores fine-grained telemetry for every bootstrap attempt. You don't need to log into the Mac Mini to know what happened.

### What kri captures

| Data | DB column | Notes |
| --- | --- | --- |
| Current status | nodes.bootstrap_status | pending → bootstrapping → completed or failed |
| Target IP | nodes.bootstrap_ip | IP used for the Ansible SSH connection |
| Error / last task | nodes.bootstrap_error | Human-readable failure reason, or [blocked at: TASK <name>] while running |
| Full Ansible stdout | nodes.bootstrap_logs | Stored after the run ends (success or failure); exposed by the /logs endpoint |
| User actions | audit_events table | Every bootstrap trigger, cancel, and Settings change is recorded with actor + timestamp |

### API endpoints

GET `/api/v1/ansible/bootstrap/{node_id}/status`

Lightweight poll — returns status, bootstrap\_ip, and bootstrap\_error. No stdout. Use this to track progress in a loop.

GET `/api/v1/ansible/bootstrap/{node_id}/logs`

Full detail — returns status, complete Ansible stdout (`ansible_stdout`), pillar file path, and pillar file contents. Use this for post-mortem on failures.

```bash
# Extract just the useful fields from the logs endpoint
curl -s http://localhost:8000/api/v1/ansible/bootstrap/<node_id>/logs \
  -H "Authorization: Bearer <token>" \
  | jq '{
      status:     .bootstrap_status,
      last_error: (.ansible_stdout // "no stdout yet"),
      pillar_ok:  (.pillar | startswith("(") | not)
    }'

# Poll status until it leaves 'bootstrapping'
watch -n5 'curl -s http://localhost:8000/api/v1/ansible/bootstrap/<node_id>/status \
  -H "Authorization: Bearer <token>" | jq .bootstrap_status'
```

### Enabling verbose Ansible output

By default Ansible runs at verbosity 0 (minimal output). To get SSH connection details, module arguments, and return values in the worker log, set `ANSIBLE_VERBOSITY=2` in your `.env` file and restart the worker. Use level 4 for full debug output (very noisy).

```bash
# .env — add or update this line
ANSIBLE_VERBOSITY=2

# Apply by restarting
./scripts/kri.sh restart
```

⚠

Verbosity 2 and above will log SSH credentials and host details to `.kri-logs/worker.log`. Rotate or delete the log after debugging.

### Querying audit events directly

```bash
docker exec deploy-postgres-1 psql -U fleet -d fleet_demo -c \
  "SELECT action, actor, resource_type, event_at \
   FROM audit_events ORDER BY event_at DESC LIMIT 20;"
```
