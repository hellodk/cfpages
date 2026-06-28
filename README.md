# hellodk.io

Personal blog of **Deepak Gupta** — DevOps, SRE, homelab, and infrastructure writing.

Built with [Astro 6](https://astro.build) (Chirping layout + card grid homepage), deployed via [Cloudflare](https://pages.cloudflare.com) from this repo.

- **Production:** https://hellodk.io
- **Repo:** https://github.com/hellodk/cfpages

## Local development

```bash
npm ci
npm run dev          # http://127.0.0.1:4321
```

Syncs assets + knowledge index automatically via `predev`.

## Build

```bash
npm run build        # dist/ + Pagefind + knowledge-index.json
npm run preview
```

## Deploy (Cloudflare — hellodk/cfpages)

Dashboard build settings:

| Setting | Value |
|---------|--------|
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npm run cf:deploy` |
| Build output directory | `dist` |
| Node.js | 22 |

Add **Variables and secrets** and **Workers AI** binding (`AI`) per [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## License

MIT (theme portions under Ghost Foundation license — see GHOST.txt)
