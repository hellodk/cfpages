# Deploy & security audit

Last reviewed: 2026-06-28. Repo: `hellodk/cfpages`.

## Build / deploy — fixed & verified

| Risk | Status | Notes |
|------|--------|--------|
| `rsync` missing on CF build image | **Fixed** | `sync-public-assets.sh` falls back to `cp -a` |
| `[assets]` in `wrangler.toml` breaks Pages | **Fixed** | Use `pages_build_output_dir` only |
| Deploy command | **OK** | `npm run cf:deploy` → `wrangler pages deploy dist` |
| `functions/` not deployed | **OK** | Wrangler picks up `/functions` from repo root |
| Node version | **OK** | `.node-version` = 22, CF detects 22.x |
| `knowledge-index.json` for chat/search | **OK** | Built in `prebuild` → copied to `dist/` |
| Git hooks in CI | **Fixed** | `npm prepare` skips when `CI` or `CF_PAGES=1` |

### If deploy still fails

1. **Auth 10000** → [CLOUDFLARE-API-TOKEN.md](./CLOUDFLARE-API-TOKEN.md) — recreate token with **Pages Edit**
2. **API token** — set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in build env
3. **Deploy command** must be `npm run cf:deploy`
4. Clear **build cache** in dashboard if account/token was recently changed

---

## Security — fixed in repo

| Area | Mitigation |
|------|------------|
| Secrets in git | `.gitignore`, pre-commit hook, `npm run check:secrets` |
| Hardcoded inbox email | Removed — `CONTACT_TO_EMAIL` required from CF secrets |
| Contact injection | `sanitizeText()`, length limits, no raw Brevo body in logs |
| Open CORS `*` on APIs | Restricted to `hellodk.io`, `www`, localhost, `*.pages.dev` |
| Search fallback XSS | DOM APIs instead of `innerHTML` for post titles |
| API response caching | `Cache-Control: no-store` on `/api/*` |
| Error leakage | Brevo/AI errors log status only, not response bodies |

---

## Your Cloudflare dashboard checklist

Do these once (see [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md)):

- [ ] **Variables and secrets** — all `PUBLIC_*` from `.env.example`
- [ ] **Encrypted secrets** — `BREVO_API_KEY`, `CONTACT_TO_EMAIL`, etc.
- [ ] **Workers AI binding** — name `AI`
- [ ] **Rate limiting** (recommended) — WAF / rate limit rule on `/api/*` to reduce abuse
- [ ] **Custom domains** — `hellodk.io`, `www`
- [ ] **Bulk redirect** — `hellodk.in` → `hellodk.io`

---

## Known limitations (acceptable for v1)

| Item | Why |
|------|-----|
| No CSP header | Giscus + Brevo embeds need flexible `frame-src` / `connect-src` |
| No API rate limit in code | Use Cloudflare WAF; adding KV-based limits is optional later |
| `PUBLIC_*` vars in static HTML | By design for Astro — not secret, but visible in page source |
| Chat prompt injection | RAG limited to public post excerpts; monitor Workers AI usage |
| npm audit warnings | Dev deps (wrangler/esbuild); run `npm audit` periodically |

---

## Before every release

```bash
npm run check:secrets
npm run build
```

Do not commit `.env`, `.dev.vars`, or real IDs into `.env.example`.
