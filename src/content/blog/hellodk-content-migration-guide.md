---
title: "Launch Checklist: What Still Needs Fixing Before hellodk.io Goes Live"
date: 2026-06-14
description: "Layout C is done. Search, chat, and Cloudflare wiring are in place. What remains is mostly post bodies — the words inside each article. Here's the audit, who does what, and your action items."
tags: [devops, migration, hellodk, launch]
draft: false
cover: "assets/images/jasper_screen2.png"
---

> **TL;DR** — The **theme and integrations are ready**. Thirteen of twenty-two published posts still need body work (thin stubs, legacy HTML, or migration debris). **You** own secrets, DNS, and personal content. **Scripts and agent passes** can restore and rewrite the rest from `_jekyll-backup`.

For the interactive version with animated diagrams, see the [visual content migration guide](/guides/content-migration).

---

## Where problems live

The homepage can look great while individual posts still hurt. These are separate layers:

1. **Layout C (theme)** — Cards, hero, sidebars, search, chat. **Done.**
2. **Post markdown body** — `src/content/blog/*.md`. **13 posts need work.**
3. **Reader view** — Title + cover + prose. Only as good as the body.

---

## Published posts audit (22 scanned)

| Status | Count | Meaning |
|--------|------:|---------|
| **Clean** | 9 | Proper markdown, headings, readable — ship as-is |
| **Thin** | 4 | Title exists; body is notes or wrong topic |
| **HTML-heavy** | 6 | Legacy Jekyll `<p>` / `<ul>` markup — needs conversion |
| **Migration junk** | 3 | Chirping layout text baked into the body |

### Clean (9)

- [Kubernetes Monitoring](/kubernetes-monitoring)
- [pnpm: The Package Manager](/pnpm-smarter-package-manager)
- [Kubernetes Split DNS on Ubuntu 24.04](/kube-dns-split-dns-ubuntu24)
- [kri: Fleet Management Platform](/kri-fleet-management)
- [406 Million Wasted Tokens](/graphify-token-enforcement)
- [GNOME Thumbnails Broke](/gnome-thumbnails-broke)
- [Working with aureport](/working-with-aureport)
- [DNS Explained](/dns-explained)
- [Jekyll → Astro Migration](/hellodk-jekyll-to-astro-cloudflare-migration)

### Thin (4) — restore or rewrite

| Post | Issue |
|------|-------|
| [Exploring the Linux top Command](/exploring-top-command) | Body is QEMU/Vagrant commands — wrong topic |
| [Generating SSL Certificates](/generating-ssl-certificates) | Stub — only a few lines |
| [Vagrant with QEMU/KVM](/vagrant-with-qemu-kvm) | Command fragments, not an article |
| [Understanding DNS Records](/understanding-dns) | Prose wrapped in `<html>` tags, no headings |

### HTML-heavy (6) — convert to markdown

| Post | Issue |
|------|-------|
| [Kubernetes Cluster on Vagrant](/kubernetes-cluster-vagrant) | Legacy HTML lists |
| [MySQL Master-Master Replication](/mysql-master-master-replication) | Legacy HTML from Jekyll |
| [Understanding LVM Basics](/understanding-lvm-basics) | Heavy `<ul>` / `<code>` HTML |
| [Yum Commands Quick Reference](/yum-commands-quick-reference) | HTML table/list reference |
| [The Road to Kingdom](/the-road-to-a-kingdom) | Fiction — HTML paragraphs (manual review) |
| [DataStax Cassandra Cert](/how-to-pass-datastax-cassandra-administrator-certification) | Body may be wrong post — verify source |

### Migration junk (3) — strip debris

| Post | Issue |
|------|-------|
| [kri + graphify Knowledge Graph](/kri-knowledge-graph-graphify) | Chirping sidebar chrome in body |
| [macOS VMs with tart + Salt](/macos-vms-tart-salt) | Broken heading lines + layout debris |
| [Browser RDP Zero Ports](/browser-rdp-zero-ports) | Liquid/code-fence artifacts possible |

---

## Who does what

### You

1. **Cloudflare environment variables** — `PUBLIC_GISCUS_*`, `PUBLIC_BREVO_FORM_URL`, `PUBLIC_GA4_ID`, `PUBLIC_GOATCOUNTER_CODE`, `PUBLIC_CF_BEACON_TOKEN`. See `docs/LAUNCH-CHECKLIST.md`.
2. **Workers AI binding** — Bind Workers AI as `AI` in Cloudflare Pages → Functions. Without this, chat uses search-only fallback. See `wrangler.toml`.
3. **Contact form secret** — `BREVO_API_KEY` + `CONTACT_*` emails for `/api/contact`. See `.env.example`.
4. **Domain redirects** — `hellodk.in` → `hellodk.io` and www → apex. See `docs/cloudflare-dns.md`.
5. **Personal / fiction posts** — Review *The Road to a Kingdom* and any draft fiction — only you can judge tone and privacy.
6. **Proofread after auto-rewrite** — When posts are restored from `_jekyll-backup`, skim for accuracy.
7. **44 legacy drafts** — Files in `_drafts/` and `_jekyll-backup/_drafts/` — decide publish, merge, or archive.

### Scripts / agent passes

- Run `scripts/fix-empty-posts.mjs` against `_jekyll-backup` HTML sources
- Convert html-heavy posts to clean markdown (headings, lists, code blocks)
- Rewrite thin posts from backup or scratch using original intent
- Strip Chirping migration junk ("On This Page", sidebar blocks)
- Fix wrong-body duplicates (e.g. Cassandra cert vs K8s cluster)

Say **"fix all html-heavy posts"** or **"fix thin posts from backup"** to run the next batch.

---

## Related

- [Visual migration guide with diagrams](/guides/content-migration)
- [Jekyll → Astro migration story](/hellodk-jekyll-to-astro-cloudflare-migration)
- **Launch checklist (ops)** — `docs/LAUNCH-CHECKLIST.md` in the repo; set env vars before go-live
