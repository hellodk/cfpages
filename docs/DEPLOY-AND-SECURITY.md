# Deploy & security audit

Last reviewed: 2026-06-28. Repo: `hellodk/cfpages`.

## Build / deploy — fixed & verified

| Risk | Status | Notes |
|------|--------|--------|
| `rsync` missing on CF build image | **Fixed** | `sync-public-assets.sh` falls back to `cp -a` |
| Deploy command | **OK** | `npm run cf:deploy` → functions build + `wrangler deploy` |
| `[assets]` in wrangler.toml | **OK** | Workers Builds path; `pages_build_output_dir` removed |
| `functions/` not deployed | **OK** | `cf-deploy.sh` runs `wrangler pages functions build` then `wrangler deploy` |
| Node version | **OK** | `.node-version` = 22, CF detects 22.x |
| `knowledge-index.json` for chat/search | **OK** | Built in `prebuild` → copied to `dist/` |
| Git hooks in CI | **Fixed** | `npm prepare` skips when `CI` or `CF_PAGES=1` |

### If deploy still fails

1. **Auth 10000** → should be fixed by `wrangler deploy` (see [CLOUDFLARE-API-TOKEN.md](./CLOUDFLARE-API-TOKEN.md)). If not, check **Settings → Builds → API token** (not runtime Variables).
2. **Deploy command** must be `npm run cf:deploy`
3. Clear **build cache** if a stale token was cached

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
