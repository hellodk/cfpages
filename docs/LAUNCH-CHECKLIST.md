# Launch Checklist

## Cloudflare dashboard — where things are

All paths start here:

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** (left sidebar)
2. Click your project (e.g. **cfpages**)
3. Open the **Settings** tab

Cloudflare renamed **“Environment variables”** to **“Variables and secrets”**. That is the same place — not a separate hidden menu.

You will see copy like:

> *Define the environment variables and secrets for your Worker used at runtime*

That wording is generic. For this Astro site, most `PUBLIC_*` vars are read **during `npm run build`** and baked into the static HTML. You still add them under **Variables and secrets**, then **redeploy** so the build step sees them.

---

## Cloudflare Pages — build settings

Use these values for **hellodk/cfpages** (Git-connected Pages):

| Setting | Value |
|---------|--------|
| Production branch | `main` (must contain the Astro code) |
| Root directory | `/` |
| Build command | `npm run build` |
| Deploy command | `npm run cf:deploy` |
| Version command | `npx wrangler versions upload` (if CF requires it) |
| **Build output directory** | **`dist`** |
| Node.js | **22** — `NODE_VERSION=22` or `.node-version` in repo |

Deploy uses [`wrangler.toml`](../wrangler.toml) (`pages_build_output_dir = "dist"`, `AI` binding).

**Settings → Build** (or **Build & deployments → Build configuration**) is where build command / output directory live.

**Settings → Variables and secrets** is where env vars live (see below).

**Settings → Functions → Bindings** is where Workers AI (`AI`) is attached.

---

## Variables and secrets — step by step

**Path:** Workers & Pages → **cfpages** → **Settings** → **Variables and secrets**

1. Click **Add** (or **+ Add variable**)
2. **Type:** Plain text (for `PUBLIC_*`) or Encrypt (for API keys)
3. **Variable name:** e.g. `PUBLIC_GA4_ID`
4. **Value:** your real value
5. **Environment:** check **Production** (and **Preview** if you want branch builds to work too)
6. Save
7. **Deployments → … → Retry deployment** (or push a commit) so the next build picks up new vars

### Build-time variables (`PUBLIC_*`)

Astro inlines these at build time. Without them, GA4/Giscus/etc. simply won’t appear in the built site.

Copy from [`.env.example`](../.env.example):

| Name | Type | Example |
|------|------|---------|
| `PUBLIC_GA4_ID` | Plain text | `G-XXXXXXXXXX` |
| `PUBLIC_GOATCOUNTER_CODE` | Plain text | `hellodk` |
| `PUBLIC_CF_BEACON_TOKEN` | Plain text | CF Web Analytics token |
| `PUBLIC_BREVO_FORM_URL` | Plain text | `https://sibforms.com/serve/...` |
| `PUBLIC_GISCUS_REPO` | Plain text | `hellodk/cfpages` |
| `PUBLIC_GISCUS_REPO_ID` | Plain text | from giscus.app |
| `PUBLIC_GISCUS_CATEGORY` | Plain text | `General` |
| `PUBLIC_GISCUS_CATEGORY_ID` | Plain text | from giscus.app |
| `PUBLIC_CHAT_ENABLED` | Plain text | `true` |
| `NODE_VERSION` | Plain text | `22` |

### Runtime secrets (Pages Functions only)

Used by `/api/contact` and `/api/chat` — **Encrypt** these:

| Name | Used by |
|------|---------|
| `BREVO_API_KEY` | Contact form |
| `CONTACT_TO_EMAIL` | Contact form |
| `CONTACT_FROM_EMAIL` | Contact form |
| `CONTACT_FROM_NAME` | Contact form |

### Workers AI binding (not a variable)

**Path:** Settings → **Functions** → **Bindings** → **Add** → **Workers AI** → variable name **`AI`**

See [`wrangler.toml`](../wrangler.toml).

---

## Analytics setup

### GA4
1. analytics.google.com → Admin → Create Property → Web → hellodk.io
2. Copy Measurement ID (`G-XXXXXXXXXX`)
3. **Variables and secrets** → add `PUBLIC_GA4_ID` = `G-XXXXXXXXXX` (Production)
4. Redeploy
5. Verify: DevTools → Network → filter `googletagmanager` on production

### GoatCounter
1. goatcounter.com → Sign up → code: `hellodk`
2. **Variables and secrets** → `PUBLIC_GOATCOUNTER_CODE` = `hellodk`
3. Redeploy → verify pageviews in GoatCounter within ~60s

### Cloudflare Web Analytics
1. CF dashboard → **Analytics** → **Web Analytics** → Add site → hellodk.io
2. Copy beacon token → **Variables and secrets** → `PUBLIC_CF_BEACON_TOKEN`
3. Redeploy (or enable edge injection in the Web Analytics dashboard)

---

## AI chat (optional)

1. **Functions → Bindings** → Workers AI → name `AI`
2. **Variables and secrets** → `PUBLIC_CHAT_ENABLED` = `true`
3. Redeploy → open site → chat widget → ask *“kubernetes monitoring”*

---

## Comments (Giscus)

1. github.com/hellodk/cfpages → Settings → Features → **Enable Discussions**
2. [giscus.app](https://giscus.app) → enter repo → mapping: **pathname** → category: **General**
3. Copy repo ID and category ID
4. **Variables and secrets** → set all `PUBLIC_GISCUS_*` vars
5. Redeploy → open any post → Giscus iframe at bottom

---

## Newsletter (Brevo)

1. Brevo → Contacts → Forms → Create → **Embedded**
2. Copy form action URL (`https://sibforms.com/serve/...`)
3. **Variables and secrets** → `PUBLIC_BREVO_FORM_URL`
4. Redeploy → test `/newsletter`

---

## DNS setup

See [`docs/cloudflare-dns.md`](./cloudflare-dns.md).

**Custom domains:** Workers & Pages → **cfpages** → **Custom domains** → add `hellodk.io` and `www.hellodk.io`

```
CNAME  @    <project>.pages.dev   Proxied
CNAME  www  <project>.pages.dev   Proxied
```

### hellodk.in → hellodk.io

CF dashboard → **Bulk Redirects** → Create rule:

- Source: `hellodk.in/*`
- Target: `https://hellodk.io/$1`
- Status: **301**
- Preserve path: ✓

---

## Post-launch verification

- [ ] hellodk.io loads with card grid of posts
- [ ] Individual post pages render correctly
- [ ] `/feed.xml` returns valid RSS
- [ ] `/search` shows Pagefind UI and returns results
- [ ] `/newsletter` shows Brevo form
- [ ] `/about` page loads
- [ ] Nav links all resolve
- [ ] Giscus comments load on post pages (if configured)
- [ ] GA4 firing in Network tab (production only)
- [ ] GoatCounter dashboard shows pageviews
- [ ] hellodk.in redirects to hellodk.io (301)
- [ ] `/author` shows calendar + Calendly link
- [ ] `/contact` form submits (requires `BREVO_API_KEY` secret)
- [ ] Chat widget returns answers (requires `AI` binding)

---

## Troubleshooting

**“I added PUBLIC_GA4_ID but analytics still missing”**

- Confirm the var is set for **Production**
- **Retry deployment** after adding vars (build must re-run)
- View page source on production — search for `G-`; if absent, the build did not see the variable

**“I only see Worker runtime variables, not build settings”**

- Open **Settings** (not Deployments)
- Scroll for **Build** / **Build configuration** separately from **Variables and secrets**
- If **Deploy command** is empty, CF will show **Required** — use `npx wrangler deploy`

**Repo / branch**

**Repo:** `hellodk/cfpages` on branch **`main`**
