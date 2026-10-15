---
title: "3 Root Causes, 2 Identical Errors, 1 Dead NFS Box: Consolidating a Homelab Behind SSO"
date: 2026-08-07
description: "Wiring every homelab service behind one login URL via Keycloak and Cloudflare Tunnel sounded like an afternoon of DNS records. It turned into an accidentally-public admin console, two apps failing OAuth with the identical error for two unrelated reasons, a three-cause Grafana outage, and a dead NFS"
tags: [sso, keycloak, homelab, cloudflare]
draft: false
---

🔐 Incident Log

The plan was simple: one login URL, one Keycloak realm, every service behind it — Grafana, ArgoCD, Prometheus, Guacamole, all of it. Cloudflare Tunnel in front, Cloudflare Access gating the edge, Keycloak doing the real authentication. What actually happened was an accidentally-public admin console, the identical OAuth error on two unrelated apps for two completely different reasons, a Grafana crash loop that turned out to be three bugs deep, and a bare-metal NFS box that had quietly stopped answering pings hours earlier.

TL;DR

-   **The goal:** one hostname (`apps.thecylon.org`) behind Cloudflare Access + Tunnel, backed by a Keycloak realm, fronting every internal service without a per-app DNS record.
-   **First fix, before anything else shipped:** the initial tunnel route forwarded Keycloak's own admin console to the public internet. Blocked at the tunnel with two path rules before touching anything downstream.
-   **The scaling realization:** a hostname per app doesn't survive fifty services. Routing one hostname to Traefik with the `Host` header forced covers every existing path — no new tunnel config, ever, for app #51.
-   **Two apps, one error, two causes:** ArgoCD and Grafana both failed OAuth token exchange with the exact same `unauthorized_client` message — a missing Kubernetes label on one, a client secret a cutover PR silently dropped on the other.
-   **Grafana's crash loop was three bugs, not one:** missing plugins, a dual-pod volume race, and stale rows sitting in its own database from before a migration. Fixing the first two didn't fix the outage.
-   **The night's actual single point of failure** wasn't Kubernetes at all — it was a bare-metal NFS server that had gone completely unreachable, taking a Postgres instance's system catalogs down with it.

Grafana outage

2h+

3 stacked root causes

Apps, identical OAuth error

2

unrelated root causes each

Bugs found in one unsynced chart

6

caught before first sync, not after

Packet loss to the NFS box

100%

root cause of the data loss

## 1 One URL, real SSO

The starting shape of the homelab was normal sprawl: Grafana, ArgoCD, Prometheus, Guacamole, and a handful of other services, each reachable at its own internal path behind Traefik, and each with its own idea of who was logged in. The goal for this pass was to collapse that into one thing: log into Keycloak once, land on a tile launcher, and every tile opens already authenticated — reachable from outside the LAN, not just on it.

The pieces were already half-built. A Cloudflare Tunnel (`cloudflared`) was already running, already fronting one service. A Keycloak instance already had a `homelab` realm with real users. `oauth2-proxy` was already gating a couple of paths behind Traefik. The work was less "build this from scratch" and more "actually wire the pieces that were sitting next to each other unconnected" — which turned out to be a much better source of bugs than building from zero would have been, because every piece had its own slightly different idea of what "the public hostname" meant.

## 2 Mistake #1: the admin console goes public

The first version of the public Keycloak route was scoped by hostname only: `sso.thecylon.org` → the Keycloak service, full stop. That's enough to serve the login pages a normal user needs — and also enough to serve `/auth/admin/master/console`, Keycloak's own superuser panel, to anyone on the internet who found the hostname.

**The actual exposure:** a URL for `security-admin-console` against the `master` realm, reachable with nothing in front of it but a password. An internet-facing identity-provider admin panel is about the highest-value target a homelab can accidentally publish.

The fix was two path-scoped rules in the tunnel's ingress config, evaluated before the catch-all route to the Keycloak service — one blocking `/auth/admin/*`, one blocking the `master` realm's own auth endpoints, both returning a flat `403`:

cloudflared-config — tunnel nsyaml

```bash
ingress:
  - hostname: sso.thecylon.org
    path: ^/auth/admin(/.*)?$
    service: http_status:403
  - hostname: sso.thecylon.org
    path: ^/auth/realms/master(/.*)?$
    service: http_status:403
  - hostname: sso.thecylon.org
    service: http://keycloak-keycloakx-http.utilities.svc.cluster.local:80
```

Everything the `homelab` realm's actual users need — login, token exchange, JWKS — lives under a different path and keeps working. The master realm's admin console now only answers on the internal hostname, reachable from the LAN or a private tunnel route, never the public one.

## 3 One hostname, not fifty

The obvious next step — add a tunnel hostname for Grafana, one for ArgoCD, one for Prometheus — worked immediately and was the wrong design. Cloudflare Access requires its own registration per hostname, each new app needs its own DNS record, and none of that scales past a handful of services before the tunnel config and the Access dashboard both become their own maintenance burden.

The actual fix had already been half-built and just needed noticing: Traefik was already doing path-based routing for every service under one internal hostname (`thecylon.local`), including a tile-launcher app at `/apps` that was already gated by `oauth2-proxy`. The tunnel didn't need one route per app — it needed _one_ route that forwarded to Traefik with the `Host` header forced to match, and every existing path would just work.

One Public Hostname, Every Existing Path

<svg viewBox="0 0 1000 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#2563EB"></path>
              </marker>
              <marker id="arrow-muted" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#4B5563"></path>
              </marker>
            </defs>
            <rect x="380" y="40" width="240" height="64" rx="10" fill="#1a1a3e" stroke="#2563EB" stroke-width="1.5"></rect>
            <text x="500" y="66" text-anchor="middle" font-size="14" font-weight="700" fill="#F9FAFB">Cloudflare Access + Tunnel</text>
            <text x="500" y="84" text-anchor="middle" font-size="12" fill="#CBD5E1">Email Otp Gate, One Connector</text>
            <circle cx="500" cy="72" r="30" fill="none" stroke="#2563EB" stroke-width="1.5" opacity="0.6">
              <animate attributeName="r" values="30;60;30" dur="3s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite"></animate>
            </circle>
            <rect x="150" y="144" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="260" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">sso.thecylon.org</text>
            <text x="260" y="184" text-anchor="middle" font-size="12" fill="#4B5563">Keycloak, Homelab Realm</text>
            <rect x="590" y="144" width="220" height="56" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="700" y="168" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">apps.thecylon.org</text>
            <text x="700" y="184" text-anchor="middle" font-size="12" fill="#4B5563">Traefik, Host Header Forced</text>
            <path d="M 500,104 L 500,124 L 260,124 L 260,144" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <path d="M 500,104 L 500,124 L 700,124 L 700,144" stroke="#2563EB" stroke-width="1.5" fill="none" marker-end="url(#arrow)"></path>
            <rect x="470" y="260" width="105" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="522" y="282" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">/apps</text>
            <text x="522" y="298" text-anchor="middle" font-size="12" fill="#4B5563">Tile Launcher</text>
            <rect x="590" y="260" width="105" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="642" y="282" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">/grafana</text>
            <text x="642" y="298" text-anchor="middle" font-size="12" fill="#4B5563">Own Oidc Login</text>
            <rect x="710" y="260" width="105" height="52" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="762" y="282" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">/argocd</text>
            <text x="762" y="298" text-anchor="middle" font-size="12" fill="#4B5563">Own Oidc Login</text>
            <rect x="830" y="260" width="120" height="52" rx="8" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="890" y="282" text-anchor="middle" font-size="12" font-weight="600" fill="#111827">+ N More</text>
            <text x="890" y="298" text-anchor="middle" font-size="12" fill="#4B5563">Zero New Dns</text>
            <path d="M 700,200 L 700,222 L 522,222 L 522,260" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <path d="M 700,200 L 700,222 L 642,222 L 642,260" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <path d="M 700,200 L 700,222 L 762,222 L 762,260" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <path d="M 700,200 L 700,222 L 890,222 L 890,260" stroke="#4B5563" stroke-width="1.5" fill="none" marker-end="url(#arrow-muted)"></path>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,104 L 500,124 L 260,124 L 260,144"></animateMotion></circle>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite" path="M 500,104 L 500,124 L 700,124 L 700,144"></animateMotion></circle>
            <circle r="3" fill="#4B5563"><animateMotion dur="2.6s" repeatCount="indefinite" path="M 700,200 L 700,222 L 522,222 L 522,260"></animateMotion></circle>
            <circle r="3" fill="#4B5563"><animateMotion dur="2.6s" repeatCount="indefinite" path="M 700,200 L 700,222 L 642,222 L 642,260"></animateMotion></circle>
            <circle r="3" fill="#4B5563"><animateMotion dur="2.6s" repeatCount="indefinite" path="M 700,200 L 700,222 L 762,222 L 762,260"></animateMotion></circle>
            <circle r="3" fill="#4B5563"><animateMotion dur="2.6s" repeatCount="indefinite" path="M 700,200 L 700,222 L 890,222 L 890,260"></animateMotion></circle>
          </svg>

Adding app #51 later means one line in a Helm values file — a new path entry in the existing routing config — never a new Cloudflare hostname, a new DNS record, or a new Access application. That's the actual scaling fix, not a workaround bolted on top of the per-app approach.

## 4 The same error, twice, for different reasons

With routing sorted, ArgoCD and Grafana both needed their own Keycloak client wired in — each already had one, each already had a client secret sitting in a Kubernetes Secret. Both failed login with the exact same message:

token exchangeerror

```bash
oauth2: "unauthorized_client" "Invalid client or Invalid client credentials"
```

The identical error suggested one bug. It was two, and neither was the client secret's actual value.

ArgoCD's cause

Missing Label

`argocd-oidc-credentials` lacked `app.kubernetes.io/part-of: argocd`

Grafana's cause

Missing Secret

A cutover PR dropped `client_secret` entirely — not wired anywhere

ArgoCD resolves secret references in its config with a `$secretName:key` syntax — but only for secrets carrying that specific label. Without it, ArgoCD silently fell back to treating the literal string `$argocd-oidc-credentials:client-secret` as the actual password and sent that to Keycloak. The secret's real value had been correct the entire time; nothing was ever going to read it.

argocd-server logsoutput

```bash
level=warning msg="secret key does not exist in secret"
level=info msg="Callback: /auth/callback?state=...&code=..."
```

Grafana's cause was blunter: an unrelated VictoriaMetrics migration had rewritten its SSO overlay file, carrying over `client_id`, `auth_url`, `token_url`, and `api_url` — and dropping `client_secret` on the floor entirely. Not wrong, not blank — simply never mentioned again, in the ConfigMap or as an env var. Grafana had been sending Keycloak no secret at all.

<aside class="callout"><strong class="callout__title">The actual lesson:</strong><div class="callout__body">"OAuth is failing" is a symptom with more causes than
          the error message suggests. Chasing the exact same log line on a second app on the
          assumption it's the same bug wastes exactly as much time as assuming it isn't.</div></aside>

## 5 The Grafana outage: three bugs, not one

Fixing the login secret didn't bring Grafana back — it had already been in `CrashLoopBackOff` for two hours by that point, for reasons that had nothing to do with login. Three separate bugs were stacked on top of each other, and fixing the first two only revealed the third.

Bug 1

Missing plugins

A custom plugin-installer image (`hellodk/grafana-plugins:v1`) had never been updated for a VictoriaMetrics migration — it installed 10 unrelated plugins (clickhouse, opensearch, redis-datasource…) and neither of the two the new datasource config actually needed. Grafana logged `"Datasource provisioning error: data source not found"` and crashed. Fixed with `GF_INSTALL_PLUGINS`, Grafana's own built-in installer, no image rebuild required.

Bug 2

Dual-pod volume race

Each plugin download took roughly 2m20s. The default `RollingUpdate` strategy briefly ran the old and new pod together — and both mounted the same `ReadWriteOnce`, SQLite-backed volume at once, producing `SQLITE_BUSY` lock errors on top of the plugin failure. Switched to `Recreate` so the old pod is fully gone before the new one starts.

Bug 3 — the actual cause

Stale rows in its own database

With both of the above fixed, the exact same `"Datasource provisioning error: data source not found"` kept firing. Mounting the PVC into a throwaway debug pod and querying SQLite directly found the real cause: an orphaned `Prometheus` datasource row from before the migration, and an `Alertmanager` row whose `uid` case (`alertmanager`) didn't match what the new config specified (`Alertmanager`). Deleted the orphan, corrected the case, and the crash loop stopped for good.

| Layer | What looked broken | What actually was |
| --- | --- | --- |
| Plugins | datasource provisioning error | init image never updated for the migration |
| Storage | `SQLITE_BUSY`, random crashes | `RollingUpdate` + RWO volume, two pods, one file |
| Database | same provisioning error, after both fixes | a leftover row and a case-mismatched `uid` |

**The pattern worth keeping:** when the same log line survives two real fixes, stop patching the process around it and go look at the actual state it's failing against — in this case, three tables in a SQLite file nobody had opened directly in months.

## 6 The real single point of failure was a NAS

Separately, and earlier the same day: the shared Postgres instance backing several services had lost its data. Its `global/` system-catalog directory — normally hundreds of files — was down to a single `pg_control`. Recreating the PVC and letting it re-initialize hung indefinitely, stuck in the kernel's uninterruptible I/O wait state on a completely empty, freshly-provisioned volume.

A brand-new volume hanging on write ruled out corrupted data as the cause. What was left was the storage layer itself:

ping test from inside the clusteroutput

```bash
PING 192.0.2.118 (192.0.2.118): 56 data bytes

--- 192.0.2.118 ping statistics ---
3 packets transmitted, 0 packets received, 100% packet loss
```

The NFS server backing the cluster's default storage class was completely unreachable. Every symptom traced back to that one box: the original Postgres corruption (writes silently interrupted while the server was down), the fresh-volume hang (still down), and — in hindsight — an unrelated Guacamole Postgres pod that had been crash-looping with the identical `pg_filenode.map missing` signature for over a day, on the same storage class, dismissed earlier as "someone else's problem" before the actual cause was visible.

**No backup existed.** Not for this instance. The honest resolution was accepting data loss for the affected databases and re-initializing clean once the NFS box was confirmed back online — the one incident in this whole day that Kubernetes configuration had no part in causing, and no part in fixing.

## 7 Reading the cluster beats guessing from a manifest

Guacamole was the last piece to get Keycloak SSO — a public OpenID client, no secret (Guacamole's OpenID extension doesn't support confidential clients), wired against a plugin jar that turned out to already be bundled in the image, just never enabled.

Wiring that in meant reading the live Deployment's actual environment and comparing it against a Helm chart for the same app that had been vendored earlier from an old manifest but never synced. The two disagreed in six places — every one of them would have broken the app on its first real deploy, and none of them were syntax errors a linter would ever catch:

| Assumed | Actually running | Would have broken |
| --- | --- | --- |
| Service `guacamole` | `guacamole-svc` | the public tunnel route, silently |
| Service `guac-postgres` | `postgres` | the app's own DB connection |
| Secret `guac-db-secret` | `guacamole-db-creds` | DB credentials lookup |
| Deployment + standalone PVC | StatefulSet + volumeClaimTemplate | first sync, wrong resource kind |
| Env prefix `POSTGRES_*` | `POSTGRESQL_*` | the image ignores the wrong prefix entirely |
| Health check path `/guacamole/` | `/` (`WEBAPP_CONTEXT=ROOT`) | both liveness and readiness probes |

**None of this showed up in `helm lint` or `helm template`.** Every one of the six is semantically wrong, not syntactically — a chart can render perfectly clean YAML that still points at a Service, Secret, or path that doesn't exist. The only way to catch it was `kubectl get` against the thing actually running, before trusting what the chart assumed.

## 8 Where it landed

apps.thecylon.org live — one hostname, every existing path, Access + Keycloak + TOTP

↓

ArgoCD + Grafana login fixed, both root causes corrected in git, not just live

↓

Grafana stable — plugins, deploy strategy, and stale DB rows all fixed and committed

↓

Guacamole SSO live, chart corrected — 17 charts vendored total, migration still paused

↓

NFS box + Postgres rebuild — still open, waiting on the physical server

**Final count:** one public login URL covering every service behind it, two identical-looking OAuth failures traced to two unrelated causes, a three-layer Grafana outage resolved layer by layer instead of patched at the symptom, and six real bugs in an unsynced Helm chart caught by comparing it against the cluster before it ever shipped. The NFS box and the Postgres rebuild are the one piece that's still someone else's next step — hardware doesn't take a `git push`.
