---
title: "DNS Explained"
date: 2020-05-09
description: "A plain-language walkthrough of how DNS works — from query to resolution."
tags: [networking, dns, devops]
draft: false
cover: "assets/images/http.jpg"
---

When you buy a domain, the registrar gives you a control panel full of acronyms — **A**, **AAAA**, **CNAME**, **MX**, **TXT**, **NS**. This post is a practical map of what each one does and when to pick it.

> For a deeper dive on A vs CNAME vs ALIAS vs URL redirects, see [Understanding DNS Records](/understanding-dns).

---

## How a lookup works (30-second version)

1. Your browser asks a **recursive resolver** (often your ISP or `1.1.1.1`) for `www.example.com`.
2. The resolver walks the **DNS tree** — root → `.com` → `example.com` — until it finds an authoritative answer.
3. The **record type** you configured (A, CNAME, MX, …) tells the resolver what kind of answer to expect.

---

## Record types at a glance

| Record | Purpose |
|--------|---------|
| **A** | Maps a hostname → **IPv4** address |
| **AAAA** | Maps a hostname → **IPv6** address |
| **CNAME** | Alias — points one name to **another hostname** |
| **MX** | Mail exchange — where email for the domain is delivered |
| **TXT** | Arbitrary text — SPF, DKIM, domain verification |
| **NS** | Nameserver — which hosts are authoritative for the zone |
| **SRV** | Service location — port + host for a specific service |
| **URL redirect** | HTTP redirect (registrar-specific; not standard DNS) |

---

## A records (the most common)

Use an **A record** when you know the **IP address** and it is stable.

| Host | Points to | Example use |
|------|-----------|-------------|
| `@` | IPv4 | Root domain `example.com` → `203.0.113.10` |
| `www` | IPv4 | `www.example.com` → same or different server |
| `blog` | IPv4 | Subdomain → dedicated VM |
| `*` | IPv4 | Wildcard — catches undefined subdomains |

**Example (Namecheap-style panel):**

```
Type   Host   Value
A      @      203.0.113.10
A      www    203.0.113.10
A      blog   198.51.100.5
A      *      203.0.113.99
```

**Rule of thumb:** never put a CNAME on the root `@` — use A or ALIAS instead.

---

## AAAA records

Same as **A**, but for **IPv6**. If your server has a v6 address and you want dual-stack resolution, add matching AAAA records alongside A.

---

## CNAME (alias)

A **CNAME** says: *this name is really that other name*. The target must be a hostname, not a raw IP.

Typical pattern:

```
CNAME   www   example.com.
```

- `@` (apex) usually **cannot** be a CNAME on most providers.
- Do not mix CNAME with other record types on the same name (e.g. MX on `www` if `www` is a CNAME).

---

## MX records (email)

**MX** tells the world which mail servers accept email for your domain. Lower **priority** number = preferred server.

```
MX   @   10 mail.example.com.
MX   @   20 backup.example.com.
```

Some panels show **MXE** (mail easy) — a simplified single-field MX setup on shared hosting.

---

## TXT records

Used for:

- **SPF** — who may send mail as your domain
- **DKIM** — cryptographic mail signing
- **Domain verification** — Google Workspace, Microsoft 365, etc.

Example SPF:

```
TXT   @   "v=spf1 include:_spf.google.com ~all"
```

---

## NS records

**NS** delegates authority. When you use Cloudflare, AWS Route 53, or another DNS host, you change NS at the registrar to point to their nameservers. They then serve your A/CNAME/MX/TXT records.

---

## URL redirect vs URL frame (registrar extras)

Many registrars (Namecheap, GoDaddy, …) offer non-standard options:

| Option | Behaviour |
|--------|-----------|
| **URL redirect (unmasked)** | Browser shows `301/302` to the target URL — address bar changes |
| **URL frame / masked** | Content loaded in a frame — address bar stays on your domain (avoid for SEO) |

Prefer a proper **A/CNAME + HTTPS** setup on real hosting when you can. Redirects are fine for parked domains or simple forwards.

---

## Choosing a record type (decision tree)

```
Need to point a name to an IP?
  └─ Yes → A (or AAAA for v6)

Need to alias to another hostname?
  └─ Yes → CNAME (not on apex @)

Need email delivery?
  └─ Yes → MX

Need SPF/DKIM/verification string?
  └─ Yes → TXT

Just redirect visitors to another URL?
  └─ URL redirect (registrar) or proper HTTP redirect on your server
```

---

## References

- [Namecheap — A record setup](https://www.namecheap.com/support/knowledgebase/article.aspx/319/2237/how-can-i-set-up-an-a-address-record-for-my-domain)
- [Namecheap — which record type to choose](https://www.namecheap.com/support/knowledgebase/article.aspx/579/2237/which-record-type-option-should-i-choose-for-the-information-im-about-to-enter/)
- Related on hellodk.io: [Understanding DNS Records](/understanding-dns) · [Kubernetes Split DNS on Ubuntu 24.04](/kube-dns-split-dns-ubuntu24)
