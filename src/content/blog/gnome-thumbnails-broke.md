---
title: "How apt upgrade Silently Broke GNOME Thumbnails for a Week — Ubuntu 24.04 bwrap AppArmor Fix"
date: 2026-05-23
description: "A routine apt upgrade broke GNOME thumbnails silently for 8 days on Ubuntu 24.04. Three root causes: stale gdk-pixbuf loader in memory, corrupt Tracker3 database, and bubblewrap (bwrap) sandboxing blocked by AppArmor. Includes the exact fix."
tags: [linux, ubuntu, gnome, debugging]
cover: "assets/images/screen2.png"
draft: false
---

<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>

Post-mortem · Linux · GNOME

A May 15 gdk-pixbuf security patch rebuilt the loader cache on disk while Nautilus was still running with the old one in memory. Tracker3's database went corrupt. And underneath both of those — Ubuntu 24.04's AppArmor was silently blocking `bwrap`, the sandbox that `libgnome-desktop 44` wraps around every thumbnailer call. Three independent failures. Zero user-visible errors. Eight days of broken thumbnails.

Fail cache entries

7,907

at peak, May 23 morning

Root causes

3

loader · DB · bwrap sandbox

Trigger event

May 15

heif-gdk-pixbuf upgrade

Fix commands

4

including sysctl for bwrap

TL;DR — Three sentences

-   **Root cause 1:** `heif-gdk-pixbuf` upgraded on May 15 rewrote the gdk-pixbuf loaders cache on disk, but the already-running Nautilus process held a stale copy in memory — silently misrouting thumbnail requests.
-   **Root cause 2:** The Tracker3 SQLite file at `~/.cache/tracker3/files/meta.db` became corrupt; in GNOME 46 this severs the thumbnail job queue, so every request immediately wrote a permanent fail record.
-   **Root cause 3 (the real blocker):** `libgnome-desktop 44` now runs every thumbnailer inside a `bwrap` sandbox. Ubuntu 24.04 blocks unprivileged user namespaces via AppArmor — `bwrap` exits with "Permission denied" on every single call, so no thumbnail ever generates regardless of how healthy Tracker3 is.
-   **Fix:** `tracker3 reset -s -r` → clear `~/.cache/thumbnails/fail/` → restart Nautilus → `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` (make permanent via `/etc/sysctl.d/`). Done.

## ① How GNOME Thumbnail Generation Works

There are more moving parts in the thumbnail pipeline than most users realise. Understanding them makes the failure obvious in hindsight.

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>

Animation — normal thumbnail pipeline from file on disk to Nautilus display

<svg viewBox="0 0 1100 270" role="img" aria-label="GNOME thumbnail pipeline">
            <defs>
              <marker id="a0" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#4B5563"></path></marker>
              <marker id="a1" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#16A34A"></path></marker>
            </defs>
            <text x="110" y="28" text-anchor="middle" fill="#4B5563" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">① Browse</text>
            <text x="328" y="28" text-anchor="middle" fill="#4B5563" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">② Render PNG</text>
            <text x="556" y="28" text-anchor="middle" fill="#4B5563" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">③ Queue Job</text>
            <text x="784" y="28" text-anchor="middle" fill="#4B5563" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">④ Write to Cache</text>
            <text x="996" y="28" text-anchor="middle" fill="#4B5563" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">⑤ Display</text>
            <rect x="30" y="44" width="160" height="96" rx="12" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
            <text x="110" y="78"  text-anchor="middle" fill="#1D4ED8" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">File on disk</text>
            <text x="110" y="98"  text-anchor="middle" fill="#3B82F6" font-size="12" font-family="ui-monospace,monospace">image / video / PDF</text>
            <text x="110" y="116" text-anchor="middle" fill="#93C5FD" font-size="12" font-family="ui-sans-serif,sans-serif">any format</text>
            <line x1="191" y1="92" x2="236" y2="92" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a0)"></line>
            <rect x="238" y="36" width="180" height="112" rx="12" fill="#F5F3FF" stroke="#DDD6FE" stroke-width="1.5"></rect>
            <text x="328" y="70"  text-anchor="middle" fill="#6D28D9" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">Thumbnailer</text>
            <text x="328" y="90"  text-anchor="middle" fill="#7C3AED" font-size="12" font-family="ui-monospace,monospace">gdk-pixbuf</text>
            <text x="328" y="107" text-anchor="middle" fill="#7C3AED" font-size="12" font-family="ui-monospace,monospace">ffmpegthumbnailer</text>
            <text x="328" y="124" text-anchor="middle" fill="#7C3AED" font-size="12" font-family="ui-monospace,monospace">heif-thumbnailer</text>
            <line x1="419" y1="92" x2="464" y2="92" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a0)"></line>
            <rect x="466" y="36" width="180" height="112" rx="12" fill="#ECFDF5" stroke="#34D399" stroke-width="2"></rect>
            <text x="556" y="70"  text-anchor="middle" fill="#065F46" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">Tracker3</text>
            <text x="556" y="90"  text-anchor="middle" fill="#059669" font-size="12" font-family="ui-monospace,monospace">tracker-miner-fs-3</text>
            <text x="556" y="107" text-anchor="middle" fill="#059669" font-size="12" font-family="ui-sans-serif,sans-serif">thumbnail job queue</text>
            <rect x="490" y="116" width="132" height="20" rx="5" fill="#059669"></rect>
            <text x="556" y="130" text-anchor="middle" fill="white" font-size="11" font-weight="700" font-family="ui-sans-serif,sans-serif">NEW in GNOME 46</text>
            <line x1="647" y1="92" x2="692" y2="92" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a0)"></line>
            <rect x="694" y="44" width="180" height="96" rx="12" fill="#FFF7ED" stroke="#FED7AA" stroke-width="1.5"></rect>
            <text x="784" y="78"  text-anchor="middle" fill="#C2410C" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">Thumbnail Factory</text>
            <text x="784" y="97"  text-anchor="middle" fill="#EA580C" font-size="12" font-family="ui-monospace,monospace">gnome-thumbnail-factory</text>
            <text x="784" y="115" text-anchor="middle" fill="#EA580C" font-size="12" font-family="ui-sans-serif,sans-serif">writes PNG to cache</text>
            <line x1="875" y1="92" x2="920" y2="92" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a0)"></line>
            <rect x="922" y="48" width="148" height="88" rx="12" fill="#F9FAFB" stroke="#E5E7EB" stroke-width="1.5"></rect>
            <text x="996" y="82"  text-anchor="middle" fill="#374151" font-size="28">📁</text>
            <text x="996" y="108" text-anchor="middle" fill="#374151" font-size="14" font-weight="700" font-family="ui-sans-serif,sans-serif">Nautilus</text>
            <text x="996" y="125" text-anchor="middle" fill="#4B5563" font-size="12" font-family="ui-sans-serif,sans-serif">Renders Thumbnail</text>
            <circle class="smil" r="12" fill="none" stroke="#2563EB" stroke-width="1" opacity="0">
              <animate attributeName="cx" dur="3.5s" repeatCount="indefinite" values="110;328;556;784;996" keyTimes="0;0.22;0.47;0.7;0.9" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"></animate>
              <animate attributeName="cy" dur="3.5s" repeatCount="indefinite" values="92;92;92;92;92"></animate>
              <animate attributeName="r"   dur="3.5s" repeatCount="indefinite" values="6;18;6;18;6"></animate>
              <animate attributeName="opacity" dur="3.5s" repeatCount="indefinite" values="0;0.4;0;0.4;0" keyTimes="0;0.1;0.3;0.6;1"></animate>
              <animate attributeName="stroke" dur="3.5s" repeatCount="indefinite" values="#2563EB;#7C3AED;#059669;#EA580C;#374151"></animate>
            </circle>
            <circle class="smil" r="7" fill="#2563EB">
              <animate attributeName="cx" dur="3.5s" repeatCount="indefinite" values="110;328;556;784;996" keyTimes="0;0.22;0.47;0.7;0.9" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"></animate>
              <animate attributeName="cy" dur="3.5s" repeatCount="indefinite" values="92;92;92;92;92"></animate>
              <animate attributeName="opacity" dur="3.5s" repeatCount="indefinite" values="0;1;1;1;1;0" keyTimes="0;0.04;0.22;0.8;0.93;1"></animate>
              <animate attributeName="fill" dur="3.5s" repeatCount="indefinite" values="#2563EB;#7C3AED;#059669;#EA580C;#374151"></animate>
            </circle>
            <path d="M556 150 L556 182" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="4,3" fill="none" marker-end="url(#a0)"></path>
            <rect x="456" y="183" width="200" height="52" rx="10" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
            <text x="556" y="205" text-anchor="middle" fill="#991B1B" font-size="13" font-weight="600" font-family="ui-sans-serif,sans-serif">Failure path</text>
            <text x="556" y="223" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-monospace,monospace">→ fail/ written, never retried</text>
            <text x="556" y="254" text-anchor="middle" fill="#059669" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">▲  Tracker3 breaks here → all thumbnails stall</text>
          </svg>

packet travelling through pipeline success → cached in large/ failure → written to fail/ Tracker3 (GNOME 46 addition)

The critical detail: **in GNOME 46, Nautilus routes thumbnail job requests through Tracker3**. This is a newer coupling that didn't exist in GNOME 42/43. If Tracker's SQLite database can't be opened, the entire queue stalls — and every failed request gets written to `~/.cache/thumbnails/fail/` as a permanent block.

## ② The Timeline of Failure

8 May 2026 · 07:39

gnome-shell → 46.0-0ubuntu6~24.04.14

Routine security update. No thumbnail impact on its own — but this version tightens the Tracker3 integration.

15 May 2026 · 08:05

heif-gdk-pixbuf + heif-thumbnailer upgraded

Post-install hook rewrites `loaders.cache` on disk. Nautilus is already running and never reads it again until restarted. Thumbnail generation for HEIF and related formats begins silently failing with no user-visible error.

Between May 15–22

Tracker3 database becomes corrupt

`~/.cache/tracker3/files/meta.db` can no longer be opened. Journal: _"Could not open sqlite3 database: unable to open database file."_ All thumbnail job requests now return a D-Bus error and immediately write fail entries. Fail cache grows silently in the background.

22 May · First diagnosis

1,754 fail entries found — all external drives

`show-image-thumbnails` changed to `always`, fail cache cleared. Local thumbnails recover briefly, but Tracker3 is still broken and refills the cache overnight.

23 May · 07:54 — morning

Fail cache back to 7,907 entries

EOG also reporting "Thumbnail creation failed." dconf database recreated (indicates a background GNOME settings event). Tracker3 still throwing database errors on every Nautilus browse.

23 May · Partial fix

tracker3 reset + fail cache cleared + Nautilus restarted

Tracker3 rebuilds clean. Fail cache wiped. But thumbnails still fail — EOG logging "Thumbnail creation failed" continuously. Root cause not yet fully identified.

23 May · Deeper diagnosis

bwrap sandbox identified as the real blocker

`GnomeDesktopThumbnailFactory` tested directly via Python — throws `g-spawn-exit-error-quark: Child process exited with code 1`. Traced to `bwrap: setting up uid map: Permission denied`. Ubuntu 24.04 AppArmor restricts unprivileged user namespaces; `bwrap` needs them to create its sandbox around every thumbnailer call.

23 May · Full fix applied

sysctl kernel.apparmor\_restrict\_unprivileged\_userns=0

Unprivileged user namespaces enabled. `bwrap` can now create sandboxes. Fail cache cleared. Thumbnails generate for all file types — images, videos, PDFs. Fix made permanent via `/etc/sysctl.d/60-userns.conf`.

## ③ Root Cause 1 — gdk-pixbuf Loader Hot-Swap

When `apt upgrade` installs a new `heif-gdk-pixbuf`, the post-install script calls `update-gdk-pixbuf-loaders`, which rewrites the loaders cache file on disk. This is correct behaviour. The problem is that any process that already read that file at startup gets no notification — it keeps its in-memory copy unchanged.

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>

Animation — on-disk loader cache (updated) vs in-memory state (stale)

<svg viewBox="0 0 1100 240" role="img" aria-label="gdk-pixbuf stale loader mismatch">
            <defs>
              <marker id="adiv" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#D97706"></path></marker>
            </defs>
            <rect x="30" y="20" width="460" height="200" rx="14" fill="#F0FDF4" stroke="#BBF7D0" stroke-width="1.5"></rect>
            <text x="260" y="48" text-anchor="middle" fill="#166534" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">On disk — updated 15 May 08:05</text>
            <text x="260" y="67" text-anchor="middle" fill="#16A34A" font-size="12" font-family="ui-monospace,monospace">/usr/lib/x86_64-linux-gnu/gdk-pixbuf-2.0/2.10.0/loaders.cache</text>
            <rect x="52" y="80" width="416" height="26" rx="6" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="66" y="98" fill="#166534" font-size="12" font-family="ui-monospace,monospace">image/jpeg   →  gdk-pixbuf      2.42.10+dfsg  ✓</text>
            <rect x="52" y="112" width="416" height="26" rx="6" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="66" y="130" fill="#166534" font-size="12" font-family="ui-monospace,monospace">image/heic   →  heif-gdk-pixbuf 1.17.6        ✓  ← updated</text>
            <rect x="52" y="144" width="416" height="26" rx="6" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="66" y="162" fill="#166534" font-size="12" font-family="ui-monospace,monospace">image/webp   →  webp-pixbuf     0.0.5         ✓</text>
            <rect x="52" y="176" width="416" height="26" rx="6" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="66" y="194" fill="#166534" font-size="12" font-family="ui-monospace,monospace">video/mp4    →  ffmpegthumbnailer 2.2.2        ✓</text>
            <text x="260" y="216" text-anchor="middle" fill="#16A34A" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">✓  correct — freshly written by post-install hook</text>
            <path d="M492 120 Q546 120 546 120 Q600 120 608 120" stroke="#D97706" stroke-width="2" stroke-dasharray="6,3" fill="none" marker-end="url(#adiv)"></path>
            <text x="550" y="108" text-anchor="middle" fill="#D97706" font-size="12" font-weight="700" font-family="ui-sans-serif,sans-serif">diverged</text>
            <text x="550" y="125" text-anchor="middle" fill="#D97706" font-size="11" font-family="ui-sans-serif,sans-serif">no restart</text>
            <rect x="610" y="20" width="460" height="200" rx="14" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
            <text x="840" y="48" text-anchor="middle" fill="#991B1B" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">In memory — Nautilus (already running)</text>
            <text x="840" y="67" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-sans-serif,sans-serif">loaded at launch · never reloaded at runtime</text>
            <rect x="632" y="80" width="416" height="26" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"></rect>
            <text x="646" y="98" fill="#991B1B" font-size="12" font-family="ui-monospace,monospace">image/jpeg   →  gdk-pixbuf      2.42.10+dfsg</text>
            <rect x="632" y="112" width="416" height="26" rx="6" fill="#FECACA" stroke="#F87171" stroke-width="1.5"></rect>
            <text x="646" y="130" fill="#B91C1C" font-size="12" font-family="ui-monospace,monospace">image/heic   →  heif-gdk-pixbuf 1.17.4.2     ← STALE</text>
            <rect x="978" y="116" width="44" height="17" rx="4" fill="#DC2626"></rect>
            <text x="1000" y="129" text-anchor="middle" fill="white" font-size="9" font-weight="700" font-family="ui-sans-serif,sans-serif">STALE</text>
            <rect x="632" y="144" width="416" height="26" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"></rect>
            <text x="646" y="162" fill="#991B1B" font-size="12" font-family="ui-monospace,monospace">image/webp   →  webp-pixbuf     0.0.5</text>
            <rect x="632" y="176" width="416" height="26" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"></rect>
            <text x="646" y="194" fill="#991B1B" font-size="12" font-family="ui-monospace,monospace">video/mp4    →  ffmpegthumbnailer 2.2.2</text>
            <text x="840" y="216" text-anchor="middle" fill="#DC2626" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">✗  heif requests fail silently — old ABI, new binary</text>
            <circle class="smil" cx="960" cy="125" r="5" fill="#DC2626">
              <animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="1;0.15;1"></animate>
            </circle>
          </svg>

on-disk — correct after upgrade in-memory — stale, never reloaded diverged at upgrade, fixed only by restart

**Why silent?** gdk-pixbuf doesn't crash when a loader version is mismatched — it returns a null pixbuf and the thumbnail factory silently writes the result to the fail cache. No desktop notification, no terminal error, no log entry the average user would see.

## ④ Root Cause 2 — Tracker3 Database Corruption

In GNOME 46, Nautilus tightly integrates with Tracker3 for file search — and, less obviously, for the thumbnail job queue. When Nautilus needs a thumbnail it doesn't have cached, it posts the request via D-Bus to Tracker3. If Tracker can't open its SQLite database, the request immediately returns an error and a fail entry is written.

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>

Animation — Nautilus ↔ Tracker3 D-Bus failure loop and fail counter

<svg viewBox="0 0 1100 260" role="img" aria-label="Tracker3 database failure loop">
            <defs>
              <marker id="aerr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#DC2626"></path></marker>
              <marker id="awrn" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#D97706"></path></marker>
            </defs>
            <rect x="30" y="60" width="200" height="120" rx="14" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
            <text x="130" y="92"  text-anchor="middle" fill="#1D4ED8" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">Nautilus</text>
            <text x="130" y="113" text-anchor="middle" fill="#3B82F6" font-size="12" font-family="ui-sans-serif,sans-serif">sends thumbnail request</text>
            <text x="130" y="131" text-anchor="middle" fill="#3B82F6" font-size="12" font-family="ui-sans-serif,sans-serif">via D-Bus to Tracker3</text>
            <text x="130" y="168" text-anchor="middle" fill="#93C5FD" font-size="12" font-family="ui-sans-serif,sans-serif">On Every Browse</text>
            <line x1="232" y1="108" x2="309" y2="108" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a0)"></line>
            <text x="270" y="97" text-anchor="middle" fill="#4B5563" font-size="12" font-family="ui-sans-serif,sans-serif">D-Bus Call</text>
            <rect x="312" y="36" width="250" height="168" rx="14" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
            <text x="437" y="68"  text-anchor="middle" fill="#991B1B" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">Tracker3</text>
            <text x="437" y="88"  text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-monospace,monospace">tracker-miner-fs-3</text>
            <rect x="332" y="100" width="210" height="44" rx="8" fill="#FEE2E2" stroke="#F87171" stroke-width="1.5"></rect>
            <text x="437" y="118" text-anchor="middle" fill="#B91C1C" font-size="13" font-weight="700" font-family="ui-sans-serif,sans-serif">meta.db — CORRUPT</text>
            <text x="437" y="136" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-monospace,monospace">unable to open database</text>
            <text x="437" y="174" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-sans-serif,sans-serif">returns DBUS_ERROR immediately</text>
            <text x="437" y="192" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-sans-serif,sans-serif">no thumbnail generated</text>
            <line x1="311" y1="132" x2="234" y2="132" stroke="#DC2626" stroke-width="1.5" marker-end="url(#aerr)"></line>
            <text x="270" y="152" text-anchor="middle" fill="#DC2626" font-size="12" font-weight="700" font-family="ui-sans-serif,sans-serif">DBUS_ERROR</text>
            <line x1="564" y1="108" x2="634" y2="108" stroke="#D97706" stroke-width="1.5" marker-end="url(#awrn)"></line>
            <text x="598" y="125" text-anchor="middle" fill="#D97706" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">Write Fail Entry</text>
            <rect x="636" y="44" width="260" height="152" rx="14" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
            <text x="766" y="76"  text-anchor="middle" fill="#92400E" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">Fail Cache</text>
            <text x="766" y="97"  text-anchor="middle" fill="#D97706" font-size="12" font-family="ui-monospace,monospace">~/.cache/thumbnails/</text>
            <text x="766" y="113" text-anchor="middle" fill="#D97706" font-size="12" font-family="ui-monospace,monospace">fail/gnome-thumbnail-factory/</text>
            <text x="766" y="140" text-anchor="middle" fill="#92400E" font-size="13" font-weight="600" font-family="ui-sans-serif,sans-serif">entries accrued:</text>
            <text x="766" y="162" text-anchor="middle" fill="#DC2626" font-size="16" font-weight="800" font-family="ui-monospace,monospace" class="smil">1,754
              <animate attributeName="opacity" dur="4s" repeatCount="indefinite" values="1;1;0;0;0;0" keyTimes="0;0.2;0.28;0.6;0.92;1"></animate>
            </text>
            <text x="766" y="162" text-anchor="middle" fill="#DC2626" font-size="16" font-weight="800" font-family="ui-monospace,monospace" class="smil" opacity="0">3,891
              <animate attributeName="opacity" dur="4s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;0.28;0.36;0.58;0.66;1"></animate>
            </text>
            <text x="766" y="162" text-anchor="middle" fill="#DC2626" font-size="16" font-weight="800" font-family="ui-monospace,monospace" class="smil" opacity="0">7,907
              <animate attributeName="opacity" dur="4s" repeatCount="indefinite" values="0;0;0;0;1;0" keyTimes="0;0.66;0.72;0.76;0.82;1"></animate>
            </text>
            <text x="766" y="184" text-anchor="middle" fill="#D97706" font-size="12" font-family="ui-sans-serif,sans-serif">permanent — never retried</text>
            <rect x="930" y="44" width="150" height="152" rx="12" fill="#EFF6FF" stroke="#BAE6FD" stroke-width="1.5"></rect>
            <text x="1005" y="72"  text-anchor="middle" fill="#0369A1" font-size="13" font-weight="700" font-family="ui-sans-serif,sans-serif">journalctl</text>
            <text x="1005" y="90"  text-anchor="middle" fill="#0284C7" font-size="11" font-family="ui-sans-serif,sans-serif">--user errors</text>
            <rect x="944" y="100" width="122" height="84" rx="6" fill="#F9FAFB" stroke="#E2E8F0" stroke-width="1"></rect>
            <text x="950"  y="116" fill="#0369A1" font-size="11" font-family="ui-monospace,monospace">nautilus[…]:</text>
            <text x="950"  y="132" fill="#DC2626" font-size="11" font-family="ui-monospace,monospace">Could not</text>
            <text x="950"  y="148" fill="#DC2626" font-size="11" font-family="ui-monospace,monospace">open sqlite3</text>
            <text x="950"  y="164" fill="#DC2626" font-size="11" font-family="ui-monospace,monospace">meta.db</text>
            <circle class="smil" cx="437" cy="120" r="6" fill="none" stroke="#DC2626" stroke-width="2">
              <animate attributeName="r"       dur="1.4s" repeatCount="indefinite" values="6;18;6"></animate>
              <animate attributeName="opacity" dur="1.4s" repeatCount="indefinite" values="0.9;0;0.9"></animate>
            </circle>
            <circle class="smil" r="6" fill="#2563EB" opacity="0">
              <animate attributeName="cx"      dur="2.8s" repeatCount="indefinite" values="130;437;130" keyTimes="0;0.38;0.72"></animate>
              <animate attributeName="cy"      dur="2.8s" repeatCount="indefinite" values="108;108;132" keyTimes="0;0.38;0.72"></animate>
              <animate attributeName="fill"    dur="2.8s" repeatCount="indefinite" values="#2563EB;#DC2626;#DC2626" keyTimes="0;0.38;1"></animate>
              <animate attributeName="opacity" dur="2.8s" repeatCount="indefinite" values="0;0.95;0.95;0" keyTimes="0;0.05;0.68;0.72"></animate>
            </circle>
          </svg>

thumbnail request D-Bus error (corrupt DB) fail entry written — permanent, never retried

**The compounding effect:** Nautilus runs as a background `--gapplication-service` daemon even between user sessions. With Tracker3 broken, every background file-monitoring event tried to generate thumbnails, failed, and wrote fail entries — growing from 1,754 to 7,907 entries overnight without the user doing anything.

## ⑤ The Fail Cache Death Spiral

The fail cache is designed as a performance optimisation: don't waste CPU retrying files that can never be thumbnailed. But when the failure reason is transient (a broken DB, a stale loader), the optimisation becomes a trap.

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>

Animation — the retry-block loop and why only deleting fail/ escapes it

<svg viewBox="0 0 1100 310" role="img" aria-label="Fail cache death spiral">
            <defs>
              <marker id="aloop"   markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#DC2626"></path></marker>
              <marker id="aescape" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3z" fill="#16A34A"></path></marker>
            </defs>
            <rect x="50" y="14" width="580" height="26" rx="6" fill="#FEF2F2" stroke="#FECACA" stroke-width="1"></rect>
            <text x="340" y="31" text-anchor="middle" fill="#DC2626" font-size="12" font-weight="700" font-family="ui-sans-serif,sans-serif">every subsequent browse → same result — forever, until fail/ is deleted</text>
            <path d="M546 100 C546 52, 110 52, 110 100" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="7,3" fill="none" marker-end="url(#aloop)"></path>
            <rect x="30"  y="100" width="160" height="90" rx="12" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5"></rect>
            <text x="110" y="132" text-anchor="middle" fill="#1D4ED8" font-size="14" font-weight="600" font-family="ui-sans-serif,sans-serif">Browse folder</text>
            <text x="110" y="152" text-anchor="middle" fill="#3B82F6" font-size="12" font-family="ui-sans-serif,sans-serif">Nautilus requests</text>
            <text x="110" y="168" text-anchor="middle" fill="#3B82F6" font-size="12" font-family="ui-sans-serif,sans-serif">thumbnail for file</text>
            <line x1="191" y1="145" x2="236" y2="145" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a0)"></line>
            <rect x="238" y="100" width="168" height="90" rx="12" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
            <text x="322" y="132" text-anchor="middle" fill="#374151" font-size="14" font-weight="600" font-family="ui-sans-serif,sans-serif">Check fail cache</text>
            <text x="322" y="152" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">MD5 of file URI</text>
            <text x="322" y="168" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">looked up in fail/</text>
            <line x1="322" y1="191" x2="322" y2="234" stroke="#D97706" stroke-width="1.5" marker-end="url(#awrn)"></line>
            <text x="338" y="218" fill="#D97706" font-size="12" font-weight="600" font-family="ui-sans-serif,sans-serif">MISS</text>
            <rect x="234" y="236" width="176" height="52" rx="10" fill="#FFFBEB" stroke="#FDE68A" stroke-width="1.5"></rect>
            <text x="322" y="258" text-anchor="middle" fill="#92400E" font-size="12" font-family="ui-sans-serif,sans-serif">Try generate →</text>
            <text x="322" y="274" text-anchor="middle" fill="#D97706" font-size="12" font-family="ui-sans-serif,sans-serif">fails → new fail entry</text>
            <line x1="407" y1="145" x2="452" y2="145" stroke="#DC2626" stroke-width="1.5" marker-end="url(#aloop)"></line>
            <text x="429" y="136" text-anchor="middle" fill="#DC2626" font-size="12" font-weight="700" font-family="ui-sans-serif,sans-serif">HIT</text>
            <rect x="454" y="100" width="188" height="90" rx="12" fill="#FEF2F2" stroke="#FECACA" stroke-width="1.5"></rect>
            <text x="548" y="130" text-anchor="middle" fill="#991B1B" font-size="14" font-weight="600" font-family="ui-sans-serif,sans-serif">Skip silently</text>
            <text x="548" y="150" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-sans-serif,sans-serif">no thumbnail shown</text>
            <text x="548" y="168" text-anchor="middle" fill="#DC2626" font-size="12" font-family="ui-sans-serif,sans-serif">no error, no notification</text>
            <line x1="643" y1="145" x2="696" y2="145" stroke="#16A34A" stroke-width="2" marker-end="url(#aescape)"></line>
            <text x="668" y="134" text-anchor="middle" fill="#16A34A" font-size="12" font-weight="700" font-family="ui-sans-serif,sans-serif">only</text>
            <text x="668" y="150" text-anchor="middle" fill="#16A34A" font-size="12" font-weight="700" font-family="ui-sans-serif,sans-serif">escape</text>
            <rect x="698" y="76" width="372" height="148" rx="14" fill="#F0FDF4" stroke="#86EFAC" stroke-width="2"></rect>
            <text x="884" y="107" text-anchor="middle" fill="#166534" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">Delete the fail cache</text>
            <rect x="718" y="116" width="332" height="28" rx="6" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
            <text x="884" y="135" text-anchor="middle" fill="#166534" font-size="12" font-family="ui-monospace,monospace">rm -rf ~/.cache/thumbnails/fail/</text>
            <text x="884" y="160" text-anchor="middle" fill="#16A34A" font-size="12" font-family="ui-sans-serif,sans-serif">then fix the root cause (Tracker3 + Nautilus restart)</text>
            <text x="884" y="178" text-anchor="middle" fill="#166534" font-size="13" font-weight="600" font-family="ui-sans-serif,sans-serif">Nautilus retries all files fresh ✓</text>
            <text x="884" y="214" text-anchor="middle" fill="#16A34A" font-size="12" font-family="ui-sans-serif,sans-serif">no reboot required · takes &lt;10 seconds</text>
            <circle class="smil" r="7" fill="#DC2626">
              <animate attributeName="cx" dur="3.2s" repeatCount="indefinite"
                values="110;322;546;546;328;110" keyTimes="0;0.26;0.52;0.64;0.8;1"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0 0 1 1;0.4 0 0.6 1;0.4 0 0.6 1"></animate>
              <animate attributeName="cy" dur="3.2s" repeatCount="indefinite"
                values="145;145;145;100;52;100" keyTimes="0;0.26;0.52;0.64;0.8;1"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0 0 1 1;0.4 0 0.6 1;0.4 0 0.6 1"></animate>
              <animate attributeName="opacity" dur="3.2s" repeatCount="indefinite" values="0;1;1;1;1;0" keyTimes="0;0.04;0.2;0.9;0.96;1"></animate>
            </circle>
          </svg>

permanent fail hit — no retry new fail entry written on MISS only escape: delete fail cache

## ⑥ The Fix — Three Commands, Under 10 Seconds

Command 1

tracker3 reset -s -r

Kills the miner daemon and wipes the corrupt SQLite database. Tracker rebuilds meta.db clean on next start.

Command 2

tracker3 daemon -s

Starts a fresh Tracker3 daemon with a new empty database. Thumbnail job queue is operational again.

Command 3a

rm -rf ~/.cache/thumbnails/fail/

Removes 7,907 permanent failure records. Nautilus will retry every file from scratch on next browse.

Command 3b

nautilus -q && restart

Kills the running process (with stale loaders) and spawns a fresh one that reads the current gdk-pixbuf loaders cache.

```bash
# 1. Reset Tracker3 — kills miner, wipes corrupt meta.db
tracker3 reset -s -r

# 2. Start fresh Tracker3 daemon
tracker3 daemon -s

# 3. Wipe all fail entries (permanent failure records)
rm -rf ~/.cache/thumbnails/fail/

# 4. Restart Nautilus — picks up current gdk-pixbuf loaders
nautilus -q
nohup nautilus --gapplication-service &>/dev/null &
```

<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

Animation — fix sequence with progress

<svg viewBox="0 0 1100 200" role="img" aria-label="Fix sequence animation">
            <rect x="20"  y="50" width="220" height="96" rx="12" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
            <text x="130" y="82"  text-anchor="middle" fill="#374151" font-size="14" font-weight="600" font-family="ui-sans-serif,sans-serif">tracker3 reset</text>
            <text x="130" y="101" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">kills tracker-miner-fs-3</text>
            <text x="130" y="118" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">wipes corrupt meta.db</text>
            <circle class="smil" cx="228" cy="58" r="12" fill="#16A34A" opacity="0">
              <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0;0;1;1" keyTimes="0;0.16;0.22;1"></animate>
            </circle>
            <text class="smil" x="228" y="63" text-anchor="middle" fill="white" font-size="13" font-weight="700" opacity="0">✓
              <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0;0;1;1" keyTimes="0;0.16;0.22;1"></animate>
            </text>
            <line x1="241" y1="98" x2="281" y2="98" stroke="#16A34A" stroke-width="1.5" marker-end="url(#a1)"></line>
            <rect x="283" y="50" width="220" height="96" rx="12" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
            <text x="393" y="82"  text-anchor="middle" fill="#374151" font-size="14" font-weight="600" font-family="ui-sans-serif,sans-serif">tracker3 daemon -s</text>
            <text x="393" y="101" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">fresh empty database</text>
            <text x="393" y="118" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">job queue restored</text>
            <circle class="smil" cx="491" cy="58" r="12" fill="#16A34A" opacity="0">
              <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0;0;0;1;1" keyTimes="0;0.26;0.36;0.44;1"></animate>
            </circle>
            <text class="smil" x="491" y="63" text-anchor="middle" fill="white" font-size="13" font-weight="700" opacity="0">✓
              <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0;0;0;1;1" keyTimes="0;0.26;0.36;0.44;1"></animate>
            </text>
            <line x1="504" y1="98" x2="544" y2="98" stroke="#16A34A" stroke-width="1.5" marker-end="url(#a1)"></line>
            <rect x="546" y="50" width="220" height="96" rx="12" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="1.5"></rect>
            <text x="656" y="82"  text-anchor="middle" fill="#374151" font-size="14" font-weight="600" font-family="ui-sans-serif,sans-serif">rm fail cache</text>
            <text x="656" y="101" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">7,907 entries wiped</text>
            <text x="656" y="118" text-anchor="middle" fill="#6B7280" font-size="12" font-family="ui-sans-serif,sans-serif">retry blocks removed</text>
            <circle class="smil" cx="754" cy="58" r="12" fill="#16A34A" opacity="0">
              <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0;0;0;0;1;1" keyTimes="0;0.44;0.55;0.64;0.72;1"></animate>
            </circle>
            <text class="smil" x="754" y="63" text-anchor="middle" fill="white" font-size="13" font-weight="700" opacity="0">✓
              <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0;0;0;0;1;1" keyTimes="0;0.44;0.55;0.64;0.72;1"></animate>
            </text>
            <line x1="767" y1="98" x2="807" y2="98" stroke="#16A34A" stroke-width="1.5" marker-end="url(#a1)"></line>
            <rect x="809" y="44" width="271" height="102" rx="12" fill="#F0FDF4" stroke="#86EFAC" stroke-width="2"></rect>
            <text x="944" y="76"  text-anchor="middle" fill="#166534" font-size="24">🖼</text>
            <text x="944" y="98"  text-anchor="middle" fill="#166534" font-size="15" font-weight="700" font-family="ui-sans-serif,sans-serif">Thumbnails working</text>
            <text x="944" y="116" text-anchor="middle" fill="#16A34A" font-size="12" font-family="ui-sans-serif,sans-serif">fresh loaders · Tracker3 healthy ✓</text>
            <text x="944" y="134" text-anchor="middle" fill="#16A34A" font-size="12" font-family="ui-sans-serif,sans-serif">all file types generate correctly</text>
            <rect x="20" y="164" width="1060" height="10" rx="5" fill="#E5E7EB"></rect>
            <rect x="20" y="164" width="0" height="10" rx="5" fill="#16A34A" class="smil">
              <animate attributeName="width" dur="5s" repeatCount="indefinite"
                values="0;220;503;766;1060" keyTimes="0;0.22;0.45;0.68;0.9"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1"></animate>
            </rect>
            <text x="130" y="186" text-anchor="middle" fill="#6B7280" font-size="11" font-family="ui-sans-serif,sans-serif">reset</text>
            <text x="393" y="186" text-anchor="middle" fill="#6B7280" font-size="11" font-family="ui-sans-serif,sans-serif">daemon start</text>
            <text x="656" y="186" text-anchor="middle" fill="#6B7280" font-size="11" font-family="ui-sans-serif,sans-serif">cache clear</text>
            <text x="944" y="186" text-anchor="middle" fill="#16A34A" font-size="11" font-weight="600" font-family="ui-sans-serif,sans-serif">done ✓</text>
          </svg>

step complete pipeline restored

## ⑥ Root Cause 3 — The One That Kept It Broken

Even after fixing Tracker3 and restarting Nautilus, thumbnails kept failing. The thumbnailer binaries worked perfectly from the terminal. Something was breaking them exclusively when called by the GNOME thumbnail factory. Here is exactly what and why.

### What changed in libgnome-desktop 44

Starting with **libgnome-desktop 44**, the `GnomeDesktopThumbnailFactory` — the component that orchestrates thumbnail generation across all of GNOME — was updated to run every thumbnailer inside a **bubblewrap (`bwrap`) sandbox**. This was a deliberate security improvement: if a malicious or malformed file exploits a bug in a thumbnailer, the damage is contained inside an isolated namespace.

The factory now does this internally on every thumbnail request:

```bash
# What gnome-desktop does under the hood — every time:
bwrap --ro-bind /usr /usr --proc /proc --dev /dev \
  --tmpfs /tmp -- gdk-pixbuf-thumbnailer -s 256 %u %o
```

### Why it fails on Ubuntu 24.04

`bwrap` creates an isolated sandbox using **Linux user namespaces**. Creating a user namespace requires either a setuid binary or the kernel allowing unprivileged processes to create their own namespaces. Ubuntu 24.04 (kernel 6.x) locks this down via **AppArmor**:

**The actual error — buried in the factory, never surfaced to the user:**  

`bwrap: setting up uid map: Permission denied`  

Exit code 1. The factory sees a failed subprocess, writes a fail entry to `~/.cache/thumbnails/fail/`, and moves on silently. No desktop notification. No error dialog. Nothing.

This is why clearing the fail cache and fixing Tracker3 wasn't enough — the underlying `bwrap` call was failing before the thumbnailer even started. Every single thumbnail attempt, for every file type, on every browse, was silently blocked at the sandbox layer.

### The fix — one sysctl

Allow unprivileged processes to create user namespaces. This re-enables the `bwrap` sandbox that gnome-desktop needs:

```bash
# Apply immediately (no reboot needed)
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0

# Make it survive reboots
echo 'kernel.apparmor_restrict_unprivileged_userns=0' | \
  sudo tee /etc/sysctl.d/60-userns.conf
```

Then clear the fail cache (which accumulated all the bwrap failures) and let Nautilus regenerate everything fresh:

```bash
rm -rf ~/.cache/thumbnails/fail/
nautilus -q && nohup nautilus --gapplication-service &>/dev/null &
```

**Is this a security risk?** Slightly. Unprivileged user namespaces are a prerequisite for some container escapes and privilege escalation techniques. Ubuntu 24.04 restricts them by default for this reason. However, many legitimate system tools — including `bwrap`, `flatpak`, `podman`, and Chrome's sandbox — require them. If you run a desktop machine and not a hardened server, this is the accepted trade-off. For servers, consider option B instead: `sudo chmod u+s /usr/bin/bwrap` to give only `bwrap` the privilege it needs.

### Why this was so hard to spot

Three reasons this went undiagnosed for 8 days:

1.  The thumbnailer binaries work perfectly from the terminal — the failure only happens inside the factory's sandboxed subprocess call.
2.  The factory writes a fail entry and continues — there is no log line, no notification, and no visible error at any level the user can see.
3.  The first two root causes (stale loader, corrupt Tracker3) masked this one — fixing them appeared to help briefly, then thumbnails would fail again because the sandbox was still blocked.

## ⑦ Prevention

### Keep Tracker3 healthy

If Nautilus feels sluggish or thumbnails stop working, check Tracker first. A corrupt database silently blocks all thumbnail generation with no visible error.

```bash
tracker3 status
# On any error → reset (takes 3 seconds, rebuilds cleanly)
tracker3 reset -s -r
```

### Restart Nautilus after gdk-pixbuf upgrades

Any upgrade that touches a package triggering `update-gdk-pixbuf-loaders` invalidates the in-memory loader map. Nautilus never reloads it — only a restart picks up the new loaders.

```bash
grep -i 'gdk-pixbuf\|thumbnailer' /var/log/dpkg.log | tail -20
# If you see a recent hit → restart Nautilus
nautilus -q && nohup nautilus --gapplication-service &>/dev/null &
```

### Choose the right thumbnail scope

The `show-image-thumbnails` setting controls which files Nautilus will attempt to thumbnail. Mismatches between this setting and which drives are mounted are the primary cause of fail cache accumulation.

```bash
# local-only (default) — no fail cache pollution from unmounted drives
gsettings set org.gnome.nautilus.preferences show-image-thumbnails 'local-only'

# always — includes mounted external drives
gsettings set org.gnome.nautilus.preferences show-image-thumbnails 'always'
```

**Architecture note:** The freedesktop.org thumbnail spec defines a shared repository (`.sh_thumbnails/`) on each removable volume so thumbnails travel with the drive and fail records don't pollute the local cache. GNOME reads from `.sh_thumbnails/` but doesn't write to it automatically. Until that's implemented, `local-only` is the cleanest setting if you want zero fail-cache noise from unmounted drives.
