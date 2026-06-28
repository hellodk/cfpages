# Cloudflare API token for Git deploy

## Why deploy failed after adding secrets

You added `CLOUDFLARE_API_TOKEN` under **Variables and secrets** (runtime). That is **not** what the deploy step uses.

Workers Builds authenticates deploy with the token in **Settings → Builds → API token** (yours is named **cfpages build token**). That auto-generated token has **Workers Scripts → Edit** but **not Cloudflare Pages → Edit**.

Our deploy script was calling `wrangler pages deploy`, which needs the **Pages API** → auth 10000 even when `whoami` succeeds.

**Fix (in repo):** deploy now uses `wrangler deploy` (Workers API), which matches the build token you already have. No new token required.

---

## If deploy still fails

### 1. Check Builds API token

**Workers & Pages → cfpages → Settings → Builds → API token**

Default **cfpages build token** permissions (auto-created):

| Permission | Access |
|------------|--------|
| Workers Scripts | Edit |
| Workers Routes | Edit (all zones) |
| Account Settings | Read |
| User Details | Read |

That is enough for `wrangler deploy`. You do **not** need Pages Edit anymore.

To rotate: **Create new token** in Builds settings, or edit the existing token at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens).

### 2. Runtime vs build secrets

| Location | When used |
|----------|-----------|
| **Settings → Builds → API token** | Build + deploy (wrangler auth) |
| **Settings → Builds → Build variables** | Build step only |
| **Settings → Variables and secrets** | Runtime (Functions, `/api/*`) |

`CLOUDFLARE_API_TOKEN` in Variables and secrets is **not** read by wrangler during deploy unless you also add it under **Build variables** (not needed with the new deploy script).

Runtime secrets you still need in **Variables and secrets**:

- `BREVO_API_KEY`, `CONTACT_*` (contact form)
- `PUBLIC_*` analytics IDs (build-time for Astro — set as build vars too if missing in HTML)

Optional:

- `CLOUDFLARE_ACCOUNT_ID` = `d78f7ab0a83aeb09e9d06ad8dc6757c3` (deploy script defaults this)

### 3. Build settings

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Deploy command | `npm run cf:deploy` |
| Version command | *(leave empty)* |

---

## Verify locally (optional)

```bash
npm run build
npm run cf:deploy   # needs CLOUDFLARE_API_TOKEN + Workers Scripts Edit
```

See also [DEPLOY-AND-SECURITY.md](./DEPLOY-AND-SECURITY.md).
