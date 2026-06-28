# Observability (logs & traces)

Cloudflare may suggest adding this to `wrangler.toml`:

```toml
[observability.logs]
enabled = true
invocation_logs = true
```

**Yes — this is feasible now.** The project deploys as a **Worker** (`wrangler deploy` with `main` + `[assets]`), not a Pages-only project. That block is already in [`wrangler.toml`](../wrangler.toml) and passes `wrangler deploy --dry-run`.

The old “do not add `[observability]`” warning applied when we used **Pages-only** config (`pages_build_output_dir` without `main`). That path rejected observability in `wrangler.toml`.

---

## Config in repo (recommended)

[`wrangler.toml`](../wrangler.toml):

```toml
[observability.logs]
enabled = true
invocation_logs = true
```

Deploy once (push to `main` or retry build) so production picks up the change.

**What you get:**

| Setting | Effect |
|---------|--------|
| `enabled = true` | Workers Logs for `/api/chat`, `/api/contact` |
| `invocation_logs = true` | One log line per Function invocation (path, status, timing) |

Traces are optional — enable in the dashboard first, or add `[observability.traces]` later if you want it in config.

---

## Dashboard (still useful)

**Workers & Pages → cfpages → Observability**

Use the dashboard for:

- Live log tail / search
- Trace viewer
- External OTel destinations (Datadog, Honeycomb, etc.)

Repo config and dashboard settings should stay aligned; dashboard changes may overwrite until the next deploy from git.

Suggested for hellodk.io:

| Setting | Value | Why |
|---------|--------|-----|
| Logs | **Enabled** | Debug contact form + chat failures |
| Invocation logs | **On** | See each `/api/chat` request |
| Traces | **On** *(optional)* | Deeper debugging |
| Head sampling | **1** (100%) | Low traffic — capture everything |

---

## Viewing logs

**Workers & Pages → cfpages → Observability → Logs**

Filter by:

- `/api/contact` — Brevo errors, validation failures
- `/api/chat` — Workers AI errors, fallback mode

Functions already use safe logging (status codes only, not API response bodies).

---

## Local dev

`wrangler dev` does not mirror production log shipping. Use the dashboard (or `wrangler tail`) against the deployed Worker to debug `/api/*` in production.

See [Cloudflare Workers observability docs](https://developers.cloudflare.com/workers/observability/).
