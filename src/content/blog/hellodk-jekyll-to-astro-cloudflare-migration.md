---
title: "From Jekyll to the Edge: Rebuilding hellodk.io on Astro, Cloudflare Pages, and a Visual Card Grid"
date: 2026-06-15
description: "How I migrated a decade-old Jekyll blog to Astro 6 on Cloudflare Pages — theme choices, layout decisions, search, AI chat, and why I landed on a Jasper-inspired card grid instead of a text-only docs layout."
tags: [devops, migration, astro, cloudflare, hellodk]
draft: false
cover: "assets/images/jasper_screen1.png"
---

> **TL;DR** — hellodk.io lived on Jekyll + GitHub Pages for years. I rebuilt it on **Astro 6**, deployed to **Cloudflare Pages**, kept the visual soul of the old **Jasper** theme as a **card grid**, and added **Pagefind search**, **Giscus comments**, **Brevo newsletter**, and an **AI assistant** backed by Workers AI — without giving up static speed.

---

## The starting point

My blog began life as a fork of **[biomadeira/jasper](https://github.com/biomadeira/jasper)** — a Ghost-inspired Jekyll theme from the mid-2010s. It had:

- A **full-width cover photo** header
- **Post cards** with images, tags, and excerpts
- **Disqus** comments and **Google Analytics**
- Posts written in Markdown (and sometimes raw HTML from the early days)

It felt *alive*. You browsed covers, not bullet lists.

Over time the stack aged: Ruby/Jekyll 3.9, GitHub Pages constraints, stale `_site` artifacts, and a deploy pipeline that nobody enjoyed touching.

---

## Requirements (what “done” meant)

Before writing a line of Astro, I wrote down non-negotiables:

| Requirement | Why it mattered |
|-------------|-----------------|
| **Static-first** | Fast globally, cheap to host, no server babysitting |
| **Visual homepage** | Cards + cover images — not a documentation sidebar |
| **Search** | Readers find “that kube-prometheus post from 2020” |
| **Comments** | Threaded discussion without Disqus baggage |
| **Newsletter** | Brevo/Substack capture for repeat readers |
| **Analytics** | GA4 + privacy-friendly GoatCounter + CF Web Analytics |
| **AI Q&A** | “Which post covers split DNS on Ubuntu 24?” |
| **Legacy URLs** | `/kubernetes_cluster_vagrant` must still resolve |
| **hellodk.in → hellodk.io** | Old domain redirects cleanly |
| **Author/calendar page** | Calendly + booking flow preserved |

---

## Theme exploration (the honest part)

I did not pick the first Astro starter and ship it. I ran **four local previews** side-by-side:

```
┌─────────────────────────────────────────────────────────────┐
│  :4000  Legacy Jekyll Jasper v1   ← the aesthetic I loved   │
│  :4321  Chirping Astro            ← sidebar + features      │
│  :4322  Jasper2 Astro clone       ← pretty, but custom code │
│  :4324  Vanilla jekyllt/jasper2   ← real Jekyll, Ruby pain  │
└─────────────────────────────────────────────────────────────┘
```

**Chirping** won on *features* (search hooks, sidebar nav, modern stack).  
**Legacy Jasper** won on *feel* (visual density, hero imagery).

The first Chirping homepage was **too textual** — titles and descriptions in a list, almost no photography. Only 13 of 35 posts even had a `cover:` field, and images lived outside `public/`, so thumbnails silently failed.

That gap drove the real design work.

---

## Layout A, B, and C

We prototyped three homepage layouts:

### A — Text-only feed (default Chirping)

Plain list. Fast to scan for *writers*, dull for *readers*.

### B — Feed + thumbnails

Featured hero post + rows with 168×112px thumbs. Better, still “newsletter inbox” energy.

### C — Card grid (chosen)

```
┌──────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  HERO BANNER  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
├────────────────────────┬─────────────────────────┤
│ ┌──────┐  FEATURED     │  ┌────┐  ┌────┐  ┌────┐ │
│ │ IMG  │  wide card     │  │img │  │img │  │img │ │
│ └──────┘               │  └────┘  └────┘  └────┘ │
├────────────────────────┴─────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐                  │
│  │img │  │img │  │img │  │img │   ...            │
│  └────┘  └────┘  └────┘  └────┘                  │
└──────────────────────────────────────────────────┘
```

**Layout C** brings back what I loved about Jasper:

- 16:9 cover images on every card
- A **featured wide card** for the latest post
- Tag-colored pills, author row, reading time
- `#f4f8fb` feed background so cards float

Chirping’s **sidebars, search, and chat** stay. We only replaced the main column.

---

## Cover images without hand-curating 35 posts

Every card gets art via a fallback chain:

```
1. frontmatter cover: "assets/images/..."
2. first inline image in the post body
3. tag default (kubernetes → logo, cassandra → astronaut, …)
4. site hero photo
```

Assets sync from the legacy `assets/` tree into `public/assets/` at build time — fixing the silent 404s that made Chirping look broken.

---

## Architecture on Cloudflare

```
 GitHub (staging.hellodk.in)
        │
        ▼
 Cloudflare Pages build
   npm run build
   ├── sync public assets
   ├── build knowledge-index.json
   ├── astro build → dist/
   └── pagefind index → dist/pagefind/
        │
        ▼
 Global CDN (hellodk.io)
   ├── Static HTML/CSS/JS
   ├── /feed.xml RSS
   ├── Pagefind UI at /search
   └── Pages Functions
         ├── POST /api/chat   (Workers AI + RAG)
         └── POST /api/contact (Brevo email)
```

**Workers AI binding** (`AI`) powers the chat widget in production. Locally, the widget falls back to the same `knowledge-index.json` used for dev search — so you can test without Cloudflare credentials.

---

## Search: Pagefind + fallback

Production search uses **[Pagefind](https://pagefind.app/)** — static, zero-API, indexes the built HTML.

In development, Pagefind assets don’t exist until you build. So `/search` detects missing Pagefind and falls back to the knowledge index client-side. Same engine as the chat fallback. One index, two surfaces.

---

## Integrations checklist

| Feature | Tech | Config |
|---------|------|--------|
| Comments | Giscus | `PUBLIC_GISCUS_*` env vars |
| Newsletter | Brevo embedded form | `PUBLIC_BREVO_FORM_URL` |
| Contact | Pages Function + Brevo API | `BREVO_API_KEY` (secret) |
| Chat | Workers AI Llama 3.1 8B + RAG | `AI` binding in wrangler.toml |
| Analytics | GA4, GoatCounter, CF beacon | `PUBLIC_*` vars |
| Redirects | `_redirects` + CF bulk rules | legacy Jekyll slugs |

---

## Content migration lessons

Not all posts migrated cleanly. Early HTML posts survived. Newer posts imported from a component-heavy layout left **sidebar chrome** in the markdown — stats blocks rendered as code fences, orphaned “On This Page” text.

The homepage can look polished while individual posts still need editorial cleanup. **Layout ≠ content quality.** Budget time for both.

---

## What we deliberately did not do

- **Stay on vanilla Jekyll** — Ruby toolchain friction, no edge functions
- **Ship Jasper2 Astro as “the real theme”** — it’s a reimplementation, not jekyllt/jasper2
- **Pick a docs-style theme** — wrong genre for a personal blog with photography
- **Run a dynamic CMS** — static + git is still the right complexity level

---

## Try it yourself

```bash
git clone https://github.com/hellodk/staging.hellodk.in
cd staging.hellodk.in
npm ci
npm run dev          # http://127.0.0.1:4321
npm run build        # dist/ + Pagefind index
```

Browse:

- `/` — card grid homepage
- `/search` — Pagefind (or fallback in dev)
- `/contact` — Brevo-backed form
- floating chat — AI in prod, smart fallback in dev

---

## Closing thought

Migration is not “Jekyll bad, Astro good.” It’s **preserving what readers felt** — imagery, rhythm, personality — while upgrading the engine room: edge deploy, modern search, AI-assisted discovery, and integrations that do not require loading five third-party scripts on every page view.

The old Jasper soul lives in **Layout C**. The new stack carries it forward.

---

*Questions about the migration? Use the chat widget or [contact me](/contact).*
