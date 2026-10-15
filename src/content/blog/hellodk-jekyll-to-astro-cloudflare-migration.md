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

<svg viewBox="0 0 760 262" role="img" aria-label="Four local previews compared: legacy Jekyll Jasper, Chirping Astro, a Jasper2 Astro clone and vanilla Jekyll">
  <rect x="24" y="24" width="712" height="46" rx="7" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <text x="64" y="53" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="600" fill="#4B5563">:4000</text>
  <text x="150" y="53" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111827">Legacy Jekyll Jasper v1</text>
  <text x="390" y="53" font-family="system-ui,sans-serif" font-size="12.5" fill="#4B5563">The Aesthetic I Loved</text>
  <rect x="24" y="80" width="712" height="46" rx="7" fill="#EFF6FF" stroke="#2563EB" stroke-width="2"/>
  <circle cx="44" cy="103" r="4" fill="#2563EB"><animate attributeName="r" values="4;11;4" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.85;0;0.85" dur="2.4s" repeatCount="indefinite"/></circle>
  <circle cx="44" cy="103" r="4" fill="#2563EB"/>
  <text x="64" y="109" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="600" fill="#4B5563">:4321</text>
  <text x="150" y="109" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111827">Chirping Astro</text>
  <text x="390" y="109" font-family="system-ui,sans-serif" font-size="12.5" fill="#4B5563">Sidebar And Features</text>
  <rect x="624" y="92" width="92" height="22" rx="11" fill="#2563EB"/>
  <text x="670" y="107" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#FFFFFF">Chosen</text>
  <rect x="24" y="136" width="712" height="46" rx="7" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <text x="64" y="165" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="600" fill="#4B5563">:4322</text>
  <text x="150" y="165" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111827">Jasper2 Astro Clone</text>
  <text x="390" y="165" font-family="system-ui,sans-serif" font-size="12.5" fill="#4B5563">Pretty, But Custom Code</text>
  <rect x="24" y="192" width="712" height="46" rx="7" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <text x="64" y="221" font-family="ui-monospace,Menlo,monospace" font-size="13" font-weight="600" fill="#4B5563">:4324</text>
  <text x="150" y="221" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111827">Vanilla Jekyll Jasper2</text>
  <text x="390" y="221" font-family="system-ui,sans-serif" font-size="12.5" fill="#4B5563">Real Jekyll, Ruby Pain</text>
</svg>

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

<svg viewBox="0 0 760 360" role="img" aria-label="Layout C card grid: hero banner, a featured wide card beside three thumbnails, then a row of four cards">
  <rect x="24" y="24" width="712" height="312" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="40" y="40" width="680" height="52" rx="6" fill="#E5E7EB"/>
  <text x="380" y="72" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#111827">Hero Banner</text>
  <line x1="40" y1="104" x2="720" y2="104" stroke="#E5E7EB" stroke-width="1"/>
  <rect x="40" y="112" width="340" height="96" rx="6" fill="#FFFFFF" stroke="#2563EB" stroke-width="2"/>
  <rect x="52" y="126" width="64" height="52" rx="4" fill="#E5E7EB"/>
  <text x="84" y="157" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <text x="130" y="148" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#2563EB">Featured</text>
  <text x="130" y="170" font-family="system-ui,sans-serif" font-size="12.5" fill="#111827">Wide Card</text>
  <rect x="396" y="112" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="406" y="124" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="446" y="192" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <rect x="508" y="112" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="518" y="124" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="558" y="192" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <rect x="620" y="112" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="630" y="124" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="670" y="192" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <line x1="40" y1="216" x2="720" y2="216" stroke="#E5E7EB" stroke-width="1"/>
  <rect x="40" y="224" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="50" y="236" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="90" y="304" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <rect x="152" y="224" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="162" y="236" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="202" y="304" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <rect x="264" y="224" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="274" y="236" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="314" y="304" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <rect x="376" y="224" width="100" height="96" rx="6" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="386" y="236" width="80" height="48" rx="4" fill="#E5E7EB"/>
  <text x="426" y="304" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Img</text>
  <text x="506" y="280" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#4B5563">And So On</text>
</svg>

**Layout C** brings back what I loved about Jasper:

- 16:9 cover images on every card
- A **featured wide card** for the latest post
- Tag-colored pills, author row, reading time
- `#f4f8fb` feed background so cards float

Chirping’s **sidebars, search, and chat** stay. We only replaced the main column.

---

## Cover images without hand-curating 35 posts

Every card gets art via a fallback chain:

```text
1. frontmatter cover: "assets/images/..."
2. first inline image in the post body
3. tag default (kubernetes → logo, cassandra → astronaut, …)
4. site hero photo
```

Assets sync from the legacy `assets/` tree into `public/assets/` at build time — fixing the silent 404s that made Chirping look broken.

---

## Architecture on Cloudflare

<svg viewBox="0 0 760 452" role="img" aria-label="Deploy pipeline: a push to GitHub triggers a Cloudflare Pages build, which publishes to the global CDN">
  <defs>
    <marker id="dp-ar" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="#2563EB"/></marker>
    <path id="dp-f1" d="M380,74 L380,112"/>
    <path id="dp-f2" d="M380,246 L380,284"/>
  </defs>
  <rect x="170" y="24" width="420" height="50" rx="7" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <text x="380" y="46" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111827">GitHub</text>
  <text x="380" y="64" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">staging.hellodk.in</text>
  <line x1="380" y1="74" x2="380" y2="106" stroke="#2563EB" stroke-width="2" marker-end="url(#dp-ar)"/>
  <text x="392" y="97" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#4B5563">Push</text>
  <rect x="170" y="112" width="420" height="134" rx="7" fill="#EFF6FF" stroke="#2563EB" stroke-width="2"/>
  <circle cx="196" cy="136" r="5" fill="#2563EB"><animate attributeName="r" values="5;13;5" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.85;0;0.85" dur="2.4s" repeatCount="indefinite"/></circle>
  <circle cx="196" cy="136" r="4" fill="#2563EB"/>
  <text x="214" y="141" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#111827">Cloudflare Pages Build</text>
  <text x="196" y="168" font-family="system-ui,sans-serif" font-size="12" fill="#374151">Sync Public Assets</text>
  <text x="196" y="188" font-family="system-ui,sans-serif" font-size="12" fill="#374151">Build Knowledge Index</text>
  <text x="196" y="208" font-family="system-ui,sans-serif" font-size="12" fill="#374151">Astro Build</text>
  <text x="196" y="228" font-family="system-ui,sans-serif" font-size="12" fill="#374151">Pagefind Index</text>
  <line x1="380" y1="246" x2="380" y2="278" stroke="#2563EB" stroke-width="2" marker-end="url(#dp-ar)"/>
  <text x="392" y="269" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#4B5563">Publish</text>
  <rect x="170" y="284" width="420" height="144" rx="7" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5"/>
  <text x="196" y="310" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#111827">Global CDN</text>
  <text x="292" y="310" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">hellodk.io</text>
  <text x="196" y="336" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Static HTML, CSS And JS</text>
  <text x="196" y="356" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">RSS Feed</text>
  <text x="196" y="376" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Pagefind Search UI</text>
  <text x="196" y="396" font-family="system-ui,sans-serif" font-size="12" fill="#4B5563">Pages Functions — Chat And Contact</text>
  <text x="196" y="416" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="#16A34A">Served From The Edge</text>
  <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" repeatCount="indefinite"><mpath href="#dp-f1"/></animateMotion></circle>
  <circle r="3.5" fill="#2563EB"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite"><mpath href="#dp-f2"/></animateMotion></circle>
</svg>

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
