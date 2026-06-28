# Observability (logs & traces)

Cloudflare may show a banner suggesting you add this to `wrangler.toml`:

```json
"observability": { "logs": { ... }, "traces": { ... } }
```

**Do not add that to `wrangler.toml` for this project.**

Pages projects only allow a limited set of fields in `wrangler.toml`. Adding `[observability]` causes deploy to fail with:

```text
Configuration file for Pages projects does not support "observability"
```

Your `/api/chat` and `/api/contact` Functions still run on Workers — you enable logging **in the dashboard**, not in the repo config.

---

## Enable in the dashboard (recommended)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
2. Open project **cfpages**
3. **Observability** (or **Settings → Observability** / **Logs**)
4. Turn on:
   - **Workers Logs** — `console.log` / errors from `/api/*`
   - **Traces** *(optional)* — request flow through Functions

Suggested for hellodk.io:

| Setting | Value | Why |
|---------|--------|-----|
| Logs | **Enabled** | Debug contact form + chat failures |
| Log persistence | **On** | View in CF dashboard |
| Invocation logs | **On** | See each `/api/chat` request |
| Traces | **On** *(optional)* | Deeper debugging; free during beta |
| Head sampling | **1** (100%) | Low traffic blog — capture everything |

You do **not** need external OTel destinations unless you use Honeycomb/Grafana/etc.

---

## What stays in `wrangler.toml`

Only Pages-supported settings — see [`wrangler.toml`](../wrangler.toml):

```toml
name = "cfpages"
compatibility_date = "2024-06-01"
pages_build_output_dir = "dist"

[ai]
binding = "AI"
```

---

## Viewing logs after deploy

**Workers & Pages → cfpages → Observability → Logs**

Filter by:
- `/api/contact` — Brevo errors, validation failures
- `/api/chat` — Workers AI errors, fallback mode

Functions already use safe logging (status codes only, not API response bodies).

---

## Export to external providers (optional)

If you later want logs in Datadog/Honeycomb/Grafana:

1. Dashboard → **Observability** → **Add destination** (OpenTelemetry endpoint)
2. Configure export there — **not** in `wrangler.toml` for Pages

See [Cloudflare Workers observability docs](https://developers.cloudflare.com/workers/observability/).
