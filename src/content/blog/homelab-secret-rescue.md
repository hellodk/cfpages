---
title: "15 Empty Backups, 3 Hidden Bugs, 2 Rotated Passwords: One Afternoon in a GitOps Homelab"
date: 2026-08-09
description: "A merge-conflict fix that unravelled into a corrupt Postgres rescue, three pre-existing Helm bugs, a Grafana CSRF mystery, and moving a secret into OpenBao with zero Kubernetes Secrets."
tags: [homelab, gitops, kubernetes, postgres, openbao]
cover: "assets/images/covers/homelab-secret-rescue.svg"
draft: false
---

## 15 Empty Backups, 3 Hidden Bugs, 2 Rotated Passwords

It started with four words — _"fix this merge conflict"_ — and ended four PRs later having rescued a corrupt Postgres database, uncovered three Helm bugs hiding behind one another, solved a Grafana CSRF mystery caused by a single missing character, and moved a secret into OpenBao where it actually belonged.

<div class="stat-cards">
<div class="stat-card"><span class="stat-card__n">4</span><span class="stat-card__l">PRs opened</span></div>
<div class="stat-card stat-card--warn"><span class="stat-card__n">3</span><span class="stat-card__l">pre-existing bugs found</span></div>
<div class="stat-card stat-card--ok"><span class="stat-card__n">2</span><span class="stat-card__l">passwords rotated</span></div>
<div class="stat-card stat-card--err"><span class="stat-card__n">15 × 20B</span><span class="stat-card__l">nightly backups, gzip of nothing</span></div>
</div>

### 1 · A merge conflict

The ask was tiny. The repo had other ideas.

PR #9 added a first-party Helm chart and had drifted from `main`. Two files conflicted — `ct.yaml` and a Helm-lint workflow — both trivially resolved by taking `main`'s superset. The interesting part was the _push_: a pre-push `gitleaks` hook scans **full history** and found a plaintext Postgres password baked into an old commit.

<aside class="callout"><strong class="callout__title">The trap:</strong><div class="callout__body">deleting a secret from the working tree does nothing to a full-history scan — the string lives in the commit graph forever. The only ways forward are to <em>rotate</em> the value (make it worthless) and <em>allowlist</em> the dead string, or rewrite history. We chose the honest pair: rotate, then allowlist.</div></aside>

That decision — "the leaked password must be rotated" — is the thread that pulled everything else loose.

> Deleting a secret from the working tree does nothing to a full-history scan — the string lives in the commit graph forever.

### 2 · A leaked password that was never live

The Guacamole chart shipped an _empty_ secret. That was the first clue.

The chart referenced a SealedSecret with `encryptedData: {}` — a placeholder. In the cluster, `guacamole-db-creds` had **zero keys**, and `postgres-0` was stuck in CreateContainerConfigError: it couldn't find `POSTGRES_DB` in an empty secret. The infamous leaked password wasn't live anywhere — the database it belonged to had never even started with it.

So this wasn't a rotation, it was an _initialisation_. We generated a fresh password, sealed it (bound to name + namespace), applied it, and the secret finally had three real keys. Then we restarted Postgres — and it got far enough to reveal a much bigger problem.

### 3 · The database that couldn't be saved

Postgres started, tried recovery, and died on a file that wasn't there.

```bash
FATAL: could not open file "global/pg_filenode.map": No such file or directory
```

The data directory was corrupt: `pg_filenode.map` — the map from system catalogs to on-disk files — was missing, and half of `global/` was 0-byte files (one dated `Mar 24 1979`). `pg_resetwal` can't fix that. This was the pre-existing corruption the chart's own comments had warned about; our secret fix simply let Postgres get far enough to hit it.

<aside class="callout callout--err"><strong class="callout__title">Then the backups.</strong><div class="callout__body">A <code>guacamole-backup-pvc</code> held 15 nightly dumps. Every single one was exactly <strong>20 bytes</strong> — the size of a gzip of nothing. The backup job had been dumping an empty database for weeks, because the database was already down. There was nothing to restore.</div></aside>

<aside class="callout callout--ok"><strong class="callout__title">Takeaway:</strong><div class="callout__body">a backup job that never fails is not the same as a backup that works. Assert on dump size, not job success.</div></aside>

With the data unrecoverable and the backups hollow, the only path back to a working Guacamole was to wipe the corrupt volume and let Postgres re-initialise. Nothing recoverable was lost — it was already gone. So we wiped it. And that's when the _real_ bugs showed up.

### 4 · Three bugs hiding behind each other

Each fix revealed the next. Classic onion.

#### Bug #1 — the liveness probe killed `initdb`

On slow NFS, first-time `initdb` takes >75 s. The liveness probe (30 s delay, kills after ~75 s) shot Postgres _mid-initialisation_, leaving a half-written data dir that the entrypoint then refused to re-init. This is almost certainly what corrupted the volume in the first place. Fix: a `startupProbe` with a 300 s budget that gates liveness until Postgres first accepts connections.

```bash
startupProbe:
  exec: {command: ["pg_isready"]}
  failureThreshold: 60
  periodSeconds: 5   # 300 s budget before liveness gates in
```

#### Bug #2 — a service-link env collision

Guacamole came up but its PostgreSQL auth extension refused to start: `Property "postgresql-port" must be an integer`. Because the Service was named `postgres`, Kubernetes injected the legacy Docker-link variable `POSTGRES_PORT=tcp://10.x:5432`, which overrode the intended `POSTGRESQL_PORT=5432`. Fix: `enableServiceLinks: false`.

```yaml
spec:
  enableServiceLinks: false   # stop injecting POSTGRES_PORT-style link vars
```

#### Bug #3 — a Service with no endpoints

Even then, Guacamole timed out reaching `postgres:5432` — while the pod IP worked fine. The Service's classic `Endpoints` object was empty. The cause: the Service used `targetPort: postgres` (a _named_ port), but the container's port had **no name**. The named port never resolved, so the endpoint list stayed empty and the ClusterIP had no backend. Fix: name the container port `postgres`.

```bash
ports:
  - containerPort: 5432
    name: postgres   # must match the Service targetPort by name
```

Why the ClusterIP had no backend

<svg viewBox="0 0 760 250" role="img" aria-label="Named-port mismatch leaves Service endpoints empty">
          <rect x="24" y="100" width="150" height="52" rx="8" fill="#1a1a3e"></rect>
          <text x="99" y="122" fill="#F9FAFB" font-size="13" font-weight="600" text-anchor="middle">Guacamole Pod</text>
          <text x="99" y="140" fill="#CBD5E1" font-size="12" text-anchor="middle">→ postgres:5432</text>
          <rect x="305" y="100" width="150" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="380" y="122" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">Service postgres</text>
          <text x="380" y="140" fill="#DC2626" font-size="12" text-anchor="middle">targetPort: postgres</text>
          <rect x="586" y="100" width="150" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="661" y="122" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">postgres-0</text>
          <text x="661" y="140" fill="#DC2626" font-size="12" text-anchor="middle">Port: (No Name)</text>
          <line x1="174" y1="126" x2="305" y2="126" stroke="#4B5563" stroke-width="2"></line>
          <line x1="455" y1="126" x2="586" y2="126" stroke="#DC2626" stroke-width="2" stroke-dasharray="6 5"></line>
          <circle r="4" fill="#2563EB"><animateMotion dur="1.8s" repeatCount="indefinite" path="M174,126 L305,126"></animateMotion></circle>
          <text x="239" y="112" fill="#4B5563" font-size="12" font-weight="600" text-anchor="middle">Resolves</text>
          <text x="520" y="112" fill="#DC2626" font-size="12" font-weight="600" text-anchor="middle">Name Never Matches</text>
          <text x="380" y="196" fill="#4B5563" font-size="13" font-weight="600" text-anchor="middle">Endpoints = &lt;none&gt;  →  ClusterIP has no backend</text>
          <text x="380" y="216" fill="#4B5563" font-size="13" font-weight="600" text-anchor="middle">→  connection times out</text>
        </svg>

<aside class="callout callout--ok"><strong class="callout__title">End to end:</strong><div class="callout__body">after all three fixes, Postgres re-initialised cleanly with the new password, the Guacamole schema loaded, and a login reached the TOTP-enrolment step — proof the whole chain (Service → auth → DB) finally worked. The chart itself already had the named port and correct probe users; the <em>live</em> deployment had drifted from a much older hand-applied manifest.</div></aside>

We also rotated the Guacamole web admin, which was still the well-known `guacadmin / guacadmin` default — hashing the new password with Guacamole's exact algorithm (verified against the known default hash before touching the live row) and storing the new credential in a SealedSecret record.

### 5 · Grafana said "Origin Not Allowed"

Dashboards wouldn't load. The fix was one missing scheme… removed.

The browser console showed the OpenFeature provider failing fatally with `OFREP request failed: forbidden`, and the Grafana Live websocket refused. Grafana's CSRF middleware was returning `origin not allowed`. A previous PR had already set `csrf_trusted_origins` — and it still failed.

Two facts collided. First, Grafana matches the browser's Origin **host** against the trusted list — its own `sample.ini` shows `example.com`, a bare hostname. The config had `https://apps.thecylon.org`, _with_ the scheme, which can never equal the host `apps.thecylon.org`. Second, the Cloudflare tunnel rewrites the `Host` header to `thecylon.local` (needed so Traefik routes it), so Grafana's same-origin shortcut can't apply either.

The Origin that never matched

<svg viewBox="0 0 760 260" role="img" aria-label="Tunnel rewrites Host so Grafana CSRF must trust the Origin host">
          <rect x="24" y="40" width="150" height="52" rx="8" fill="#1a1a3e"></rect>
          <text x="99" y="62" fill="#F9FAFB" font-size="13" font-weight="600" text-anchor="middle">Browser</text>
          <text x="99" y="80" fill="#CBD5E1" font-size="12" text-anchor="middle">Origin: apps.thecylon.org</text>
          <rect x="305" y="40" width="150" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="380" y="62" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">Cloudflare Tunnel</text>
          <text x="380" y="80" fill="#D97706" font-size="12" text-anchor="middle">Host → thecylon.local</text>
          <rect x="586" y="40" width="150" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="661" y="62" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">Grafana</text>
          <text x="661" y="80" fill="#111827" font-size="12" text-anchor="middle">CSRF check</text>
          <line x1="174" y1="66" x2="305" y2="66" stroke="#4B5563" stroke-width="2"></line>
          <line x1="455" y1="66" x2="586" y2="66" stroke="#4B5563" stroke-width="2"></line>
          <circle r="4" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M174,66 L305,66"></animateMotion></circle>
          <circle r="4" fill="#2563EB"><animateMotion dur="2.2s" begin="0.7s" repeatCount="indefinite" path="M455,66 L586,66"></animateMotion></circle>
          <rect x="470" y="140" width="266" height="96" rx="8" fill="#FEF2F2" stroke="#FCA5A5"></rect>
          <text x="486" y="164" fill="#991B1B" font-size="12" font-weight="600">Same-origin?</text>
          <text x="486" y="184" fill="#4B5563" font-size="12">Host apps.thecylon.org ≠ thecylon.local</text>
          <text x="486" y="206" fill="#991B1B" font-size="12" font-weight="600">Trusted?</text>
          <text x="486" y="226" fill="#4B5563" font-size="12">"https://apps…" ≠ host "apps…"</text>
          <path d="M661,92 L661,140" stroke="#DC2626" stroke-width="2" fill="none"></path>
          <text x="150" y="176" fill="#4B5563" font-size="13" font-weight="600">Fix: Trust the Bare Host</text>
          <text x="150" y="198" fill="#4B5563" font-size="13"><tspan font-family="ui-monospace,monospace">apps.thecylon.org thecylon.local</tspan></text>
        </svg>

The fix was to drop the scheme: `csrf_trusted_origins: apps.thecylon.org thecylon.local` — space-separated, host-only. Shipped through the central chart, reconciled by ArgoCD. No live patch.

```bash
# before — scheme included, can never equal the Origin host
csrf_trusted_origins: https://apps.thecylon.org
# after — host-only, space-separated
csrf_trusted_origins: apps.thecylon.org thecylon.local
```

### 6 · A token, and where secrets belong

"Can we put it in GitHub secrets?" led to a better answer: OpenBao, with no Kubernetes Secret at all.

An SRE tool needed to call Grafana's API, so we minted a least-privilege _Viewer_ service-account token. The question was where to keep it. GitHub secrets? Fine — but only a GitHub Actions workflow can read them; a running pod can't. The right home was already installed: **OpenBao**.

We wrote the token to KV at `secret/opensre/grafana` and set up a read-only policy. But the real goal was to avoid materialising a Kubernetes `Secret` at all — so instead of the External Secrets Operator (which syncs _into_ a Secret), we wired the **Agent Injector**: the token lands as a file in the pod, backed by tmpfs, and no Secret object ever exists.

Injector flow — a secret with no Secret

<svg viewBox="0 0 760 230" role="img" aria-label="OpenBao Agent Injector delivers a secret as a file with no Kubernetes Secret">
          <rect x="24" y="90" width="160" height="54" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="104" y="112" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">OpenSRE Pod</text>
          <text x="104" y="130" fill="#4B5563" font-size="12" text-anchor="middle">ServiceAccount JWT</text>
          <rect x="300" y="90" width="160" height="54" rx="8" fill="#1a1a3e"></rect>
          <text x="380" y="112" fill="#F9FAFB" font-size="13" font-weight="600" text-anchor="middle">OpenBao</text>
          <text x="380" y="130" fill="#CBD5E1" font-size="12" text-anchor="middle">K8s Auth → Policy</text>
          <rect x="576" y="90" width="160" height="54" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="656" y="112" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">/vault/secrets/grafana</text>
          <text x="656" y="130" fill="#16A34A" font-size="12" text-anchor="middle">File · Tmpfs · No Secret</text>
          <line x1="184" y1="117" x2="300" y2="117" stroke="#4B5563" stroke-width="2"></line>
          <line x1="460" y1="117" x2="576" y2="117" stroke="#4B5563" stroke-width="2"></line>
          <circle r="4" fill="#2563EB"><animateMotion dur="2s" repeatCount="indefinite" path="M184,117 L300,117"></animateMotion></circle>
          <circle r="4" fill="#16A34A"><animateMotion dur="2s" begin="0.6s" repeatCount="indefinite" path="M460,117 L576,117"></animateMotion></circle>
          <text x="242" y="103" fill="#4B5563" font-size="12" font-weight="600" text-anchor="middle">Login</text>
          <text x="518" y="103" fill="#4B5563" font-size="12" font-weight="600" text-anchor="middle">Render</text>
          <text x="380" y="184" fill="#4B5563" font-size="12" text-anchor="middle">KV: secret/opensre/grafana  →  read-only policy</text>
          <text x="380" y="202" fill="#4B5563" font-size="12" text-anchor="middle">→  injected sidecar writes the file</text>
        </svg>

All of it went into the central charts as GitOps: the injector flag, plus a bootstrap Job that enables OpenBao's Kubernetes auth and creates the role. Two honest caveats came with the PR — the OpenBao ArgoCD app is currently Degraded on an immutable-selector sync error, and OpenSRE isn't deployed yet — so the change is verified by render and lint, not yet live.

### 7 · The unseal-key near-miss

Turning the injector on meant walking straight into OpenBao's crown jewels — and a placeholder nobody had filled.

To make the injector actually work, its ArgoCD app had to sync — and it wouldn't. The first blocker was a classic: the `openbao-unsealer` Deployment had a **immutable selector** that no longer matched the chart, so every sync failed. Deleting the Deployment let ArgoCD recreate it cleanly, and the Agent Injector finally rolled out. Then the _next_ failure surfaced:

```bash
SealedSecret/openbao-keys: failed update:
Resource "openbao-keys" already exists and is not managed by SealedSecret
```

The chart shipped `openbao-keys` as a SealedSecret with an **empty placeholder** — `encryptedData: {}` — with a comment reminding whoever came next to "seal the real values before first sync." Nobody ever did. Meanwhile the _live_ `openbao-keys` was a plain Secret holding the root token and three unseal keys — the values that let OpenBao come back to life after a restart. Get this wrong and OpenBao locks sealed, permanently.

> Get this wrong and OpenBao locks sealed, permanently.

<aside class="callout callout--err"><strong class="callout__title">The near-miss.</strong><div class="callout__body">The safe plan was "verify then adopt": back up the keys, delete the plain Secret, and let the SealedSecret recreate it. It <em>didn't</em> recreate — the placeholder had no data to produce — leaving the keys momentarily gone. The backup went straight back in; fingerprints matched byte-for-byte, and because <code>openbao-0</code> never restarted, it stayed unsealed the whole time. Verification result: the committed SealedSecret was useless.</div></aside>

The real fix was to seal the **current** keys — the exact live values, so the sealed blob is guaranteed to decrypt to what's already running — fill the placeholder, and adopt the existing Secret _in place_ with the `sealedsecrets.bitnami.com/managed` annotation. No delete, no risk. The plaintext copy of the keys sitting in the Secret's `last-applied-configuration` annotation got stripped in the same pass.

Seal what's real, adopt in place

<svg viewBox="0 0 760 210" role="img" aria-label="Sealing the current keys and adopting the Secret in place">
          <rect x="24" y="80" width="170" height="52" rx="8" fill="#1a1a3e"></rect>
          <text x="109" y="102" fill="#F9FAFB" font-size="13" font-weight="600" text-anchor="middle">Live Secret</text>
          <text x="109" y="120" fill="#CBD5E1" font-size="12" text-anchor="middle">Root + 3 Unseal Keys</text>
          <rect x="300" y="80" width="160" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="380" y="102" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">kubeseal</text>
          <text x="380" y="120" fill="#4B5563" font-size="12" text-anchor="middle">Current Values</text>
          <rect x="566" y="80" width="170" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB"></rect>
          <text x="651" y="102" fill="#111827" font-size="13" font-weight="600" text-anchor="middle">Sealed Secret (Git)</text>
          <text x="651" y="120" fill="#16A34A" font-size="12" text-anchor="middle">Adopts in Place</text>
          <line x1="194" y1="106" x2="300" y2="106" stroke="#4B5563" stroke-width="2"></line>
          <line x1="460" y1="106" x2="566" y2="106" stroke="#4B5563" stroke-width="2"></line>
          <circle r="4" fill="#2563EB"><animateMotion dur="2s" repeatCount="indefinite" path="M194,106 L300,106"></animateMotion></circle>
          <circle r="4" fill="#2563EB"><animateMotion dur="2s" begin="0.6s" repeatCount="indefinite" path="M460,106 L566,106"></animateMotion></circle>
          <text x="247" y="92" fill="#4B5563" font-size="12" font-weight="600" text-anchor="middle">Seal</text>
          <text x="513" y="92" fill="#4B5563" font-size="12" font-weight="600" text-anchor="middle">Commit</text>
          <text x="380" y="166" fill="#4B5563" font-size="12" text-anchor="middle">Managed annotation → controller patches the Secret to the same keys</text>
          <text x="380" y="184" fill="#4B5563" font-size="12" text-anchor="middle">→  zero change</text>
        </svg>

<aside class="callout"><strong class="callout__title">One more trap, defused.</strong><div class="callout__body"><code>main</code> still held the empty placeholder. With self-heal on, ArgoCD would happily apply <code>encryptedData: {}</code> and empty the Secret — wiping the keys. So auto-sync got paused the instant the live change went in, and stays paused until the "seal the real keys" PR merges. Only then does self-heal come back on.</div></aside>

### 8 · Takeaways

| Signal | Lesson |
| --- | --- |
| Empty placeholder secret | An `encryptedData: {}` that "deployed fine" is a pod that never started. Check the workload, not just the sync status. |
| 20-byte backups | A backup job that never fails is not the same as a backup that works. Assert on dump size. |
| Probe killed `initdb` | First-init on slow storage needs a `startupProbe`. An aggressive liveness probe is a data-corruption risk, not just a restart. |
| Named ports | A Service `targetPort` by name needs a matching *named* container port, or endpoints stay silently empty. |
| CSRF host vs URL | Read the tool's own sample config. One scheme prefix was the whole bug. |
| Where secrets live | GitHub secrets reach workflows; pods need Vault/OpenBao or SealedSecrets. Match the store to the consumer. |
| Placeholder SealedSecrets | An `encryptedData: {}` "TODO: seal before first sync" is a live landmine — it can empty the very Secret it's meant to protect. Seal the real values or don't ship the resource. |
| Adopt, don't delete | For crown-jewel Secrets, the `sealedsecrets.bitnami.com/managed` annotation adopts in place — no delete window where the keys are gone. |
| Pause before you seal | Changing a Secret live while GitOps still holds the old value invites a self-heal to overwrite it. Pause auto-sync until git and reality agree. |

The four-word request was real: the merge conflict got fixed. Everything after it was the repo telling us, one failure at a time, what it had been hiding. Four words in, four PRs out — and a homelab that finally tells the truth about itself. That's the job.
