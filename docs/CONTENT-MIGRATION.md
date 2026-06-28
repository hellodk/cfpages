# Content migration guide

**Interactive version (recommended):** run the site and open

[/guides/content-migration](/guides/content-migration)

That page includes animated diagrams, the full post audit table, and checklists.

## Summary (22 published posts)

| Status | Count | Meaning |
|--------|------:|---------|
| Clean | 9 | Ready — no body work needed |
| Thin | 4 | Stub or wrong content — needs rewrite |
| HTML-heavy | 6 | Legacy Jekyll HTML — needs markdown conversion |
| Migration junk | 3 | Chirping sidebar debris in body |

## What you need to do

1. **Cloudflare Pages env vars** — Giscus, Brevo form URL, GA4, GoatCounter, CF beacon (`docs/LAUNCH-CHECKLIST.md`)
2. **Workers AI binding** — bind `AI` for production chat (`wrangler.toml`)
3. **Brevo secret** — `BREVO_API_KEY` + contact emails for `/api/contact`
4. **DNS** — hellodk.in → hellodk.io redirects (`docs/cloudflare-dns.md`)
5. **Proofread** — fiction/personal posts after any auto-rewrite
6. **Cover images** — optional `cover:` in post frontmatter
7. **Legacy drafts** — 44 files in `_drafts/` — publish or archive

## What we can automate next

- `node scripts/fix-empty-posts.mjs` — restore bodies from `_jekyll-backup/`
- HTML → markdown for legacy tutorials
- Strip migration junk from kri/graphify posts
- Rewrite thin posts (pattern: `dns-explained` fix)

## Scripts

```bash
node scripts/fix-empty-posts.mjs   # restore from Jekyll HTML backup
npm run build                      # Pagefind + knowledge index
```

See `src/data/content-audit.ts` for the machine-readable audit list.
