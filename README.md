<p align="center">
  <a href="https://hellodk.io">
    <img src="public/assets/images/cover1.jpg" alt="hellodk.io" width="100%" style="max-width: 920px; border-radius: 8px;" />
  </a>
</p>

<h1 align="center">hello<strong style="color:#e5645e">dk</strong>.io</h1>

<p align="center">
  <em>Curiosity is the most powerful thing you own.</em><br />
  DevOps, SRE, homelab — notes from the trenches.
</p>

<p align="center">
  <a href="https://hellodk.io"><strong>hellodk.io</strong></a>
  ·
  <a href="https://github.com/hellodk/cfpages">GitHub</a>
  ·
  <a href="https://hellodk.io/feed.xml">RSS</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Astro-6-BC52EE?style=flat-square&logo=astro&logoColor=white" alt="Astro 6" />
  <img src="https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Pages" />
  <img src="https://img.shields.io/badge/Node-22-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 22" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT" />
</p>

---

Personal blog and knowledge base for **[Deepak Gupta](https://hellodk.io/about)** — infrastructure, Kubernetes, homelab builds, and the occasional long-form rabbit hole.

Rebuilt from a decade-old **Jekyll + Jasper** site into a static **Astro 6** app: visual card grid homepage, edge-hosted on **Cloudflare**, fast globally, free to run.

## Highlights

| | |
|---|---|
| **Visual homepage** | Jasper-inspired hero + cover-image post cards |
| **Search** | [Pagefind](https://pagefind.app/) — full-text, runs at build time |
| **Comments** | [Giscus](https://giscus.app/) on GitHub Discussions |
| **Newsletter** | Brevo embedded form |
| **AI assistant** | Workers AI + on-site knowledge index |
| **Analytics** | GA4, GoatCounter, Cloudflare Web Analytics (env-configured) |
| **Contact** | Pages Function → Brevo API |

## Stack

```text
  Content (Markdown)          Astro 6 + TypeScript
         │                              │
         └──────────►  npm run build  ──┼──►  dist/  +  Pagefind index
                                        │
                                        └──►  Cloudflare Pages + Functions
                                              ├── static assets (global CDN)
                                              ├── /api/chat   (Workers AI)
                                              └── /api/contact (Brevo)
```

## Quick start

**Requirements:** Node **22+** (see `.node-version`)

```bash
git clone https://github.com/hellodk/cfpages.git
cd cfpages
npm ci
npm run dev
```

Open **http://127.0.0.1:4321** — assets and the knowledge index sync automatically on `predev`.

```bash
npm run build          # dist/ + search index
npm run preview        # serve production build locally
npm run check:secrets  # scan tracked files before push
```

Git hooks (`.githooks/pre-commit`) install automatically on `npm ci` — see [SECRETS.md](docs/SECRETS.md).

## Project layout

```text
cfpages/
├── src/
│   ├── content/blog/     # posts (Markdown + frontmatter)
│   ├── components/       # UI: cards, sidebars, search, chat
│   ├── layouts/          # Chirping shell + post layout
│   └── pages/            # routes (index, tags, search, …)
├── functions/api/        # Cloudflare Pages Functions
├── public/               # static assets, _redirects, _headers
├── scripts/              # asset sync, knowledge index, deploy
└── docs/                 # launch checklist, DNS, secrets
```

## Deploy to Cloudflare

Connect **`hellodk/cfpages`** in the Cloudflare dashboard:

| Setting | Value |
|---------|--------|
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npm run cf:deploy` |
| Build output directory | `dist` |
| Node.js | `22` |

Then configure **Variables and secrets** and the **Workers AI** binding (`AI`).

| Doc | Purpose |
|-----|---------|
| [Launch checklist](docs/LAUNCH-CHECKLIST.md) | GA4, Giscus, Brevo, DNS, go-live checks |
| [Deploy & security audit](docs/DEPLOY-AND-SECURITY.md) | Build failures, security fixes, CF checklist |
| [Cloudflare API token](docs/CLOUDFLARE-API-TOKEN.md) | Fix deploy auth error 10000 |
| [Cloudflare DNS](docs/cloudflare-dns.md) | Custom domains, `hellodk.in` → `.io` redirect |
| [Secrets policy](docs/SECRETS.md) | What never goes in git |
| [Content migration guide](https://hellodk.io/hellodk-content-migration-guide) | Post-audit & launch tasks |

## Writing a post

Add a file under `src/content/blog/`:

```yaml
---
title: "Your post title"
date: 2026-06-28
description: "One-line summary for cards and SEO"
tags: [devops, kubernetes]
draft: false
cover: "assets/images/your-cover.jpg"
---

Your markdown here.
```

Run `npm run dev` — hot reload picks it up. Set `draft: true` to hide from production builds.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `:4321` |
| `npm run build` | Production build + Pagefind |
| `npm run cf:deploy` | `wrangler pages deploy` (CI deploy step) |
| `npm run check:secrets` | Pre-push secret scan |
| `npm run dev:layouts` | Compare layout B vs C locally (`:4325` / `:4326`) |

## Background

This repo is the successor to [staging.hellodk.in](https://github.com/hellodk/staging.hellodk.in) (legacy Jekyll). The migration story:

**[From Jekyll to the Edge →](https://hellodk.io/hellodk-jekyll-to-astro-cloudflare-migration)**

---

<p align="center">
  <sub>
    MIT · theme portions under <a href="GHOST.txt">Ghost Foundation license</a><br />
    Built with curiosity · Hosted on Cloudflare · Maintained by <a href="https://github.com/hellodk">@hellodk</a>
  </sub>
</p>
