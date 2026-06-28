# Cloudflare DNS & Redirect Setup

Primary canonical URL: **https://hellodk.io**

## Cloudflare Pages — Custom Domains

1. Workers & Pages → your project → **Custom domains**
2. Add `hellodk.io` (apex) and `www.hellodk.io`
3. Enable **Redirect www to apex** (or use rule below)

## DNS Records (hellodk.io zone)

```
CNAME  @    <project-name>.pages.dev   Proxied
CNAME  www  <project-name>.pages.dev   Proxied
```

Cloudflare may auto-create these when you attach domains in Pages.

## Redirect Rules (Bulk Redirects or Redirect Rules)

### www → apex (hellodk.io)

| Field | Value |
|-------|-------|
| Match | `www.hellodk.io/*` |
| Target | `https://hellodk.io/${1}` |
| Status | 301 |

### hellodk.in → hellodk.io

Apply in the **hellodk.in** zone (or via Bulk Redirects on the account):

| Field | Value |
|-------|-------|
| Match | `hellodk.in/*` and `www.hellodk.in/*` |
| Target | `https://hellodk.io/${1}` |
| Status | 301 |
| Preserve path | Yes |

No separate hosting is needed for `hellodk.in` — redirect only.

## Static `_redirects` (in repo)

Legacy Jekyll URL slugs are handled in [`public/_redirects`](../public/_redirects). Cloudflare Pages applies these automatically at the edge.

## Workers AI binding (chat widget)

Pages → Settings → Functions → **Bindings**:

| Type | Variable name |
|------|---------------|
| Workers AI | `AI` |

See [`docs/LAUNCH-CHECKLIST.md`](./LAUNCH-CHECKLIST.md) for analytics, Giscus, and Brevo setup.
