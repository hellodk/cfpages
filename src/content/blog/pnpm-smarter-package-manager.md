---
title: "pnpm: The Package Manager That Actually Respects Your Disk"
date: 2026-04-01
description: "How a content-addressable store and hard links turned a 50 GB node_modules problem into a solved one."
tags: [nodejs, pnpm, tooling]
cover: "assets/images/Coding_with_Style-2_uhd (1).jpg"
draft: false
---

How a content-addressable store and hard links turned a 50 GB node\_modules problem into a solved one.

~90%

less disk space vs npm

3×

faster installs (cached)

1

copy of each package, ever

0

phantom dependency bugs

## The node\_modules Problem You've Learned to Live With

Every JavaScript developer has been here: you open a project folder and it's 300 MB. You have 20 projects. That's 6 GB — mostly duplicates.

npm and Yarn both work the same way at the storage layer: every project gets its own isolated copy of every dependency. **react@18 in project A is a completely separate set of files from react@18 in project B.** Even if both projects use identical versions, the bytes are duplicated on disk twice.

Scale that to a team with a monorepo, a CI server, and a developer laptop with 30 Node projects, and you're managing hundreds of gigabytes of redundant data.

💾

### Redundant Storage

Each project downloads and stores its own full copy of every dependency, even if identical versions exist elsewhere on the machine.

🐌

### Slow Re-installs

Delete node\_modules, run npm install — it downloads everything again. No cross-project reuse of already-downloaded packages.

👻

### Phantom Dependencies

npm's flat node\_modules lets code require packages it never declared. Works until a transitive dep changes version. Silent time bombs.

🏗️

### Monorepo Pain

Sharing packages across workspace packages in a monorepo requires complex hoisting workarounds and still duplicates transitive deps.

## The Content-Addressable Store: One Copy, Infinite Projects

pnpm maintains a single global store at `~/.local/share/pnpm/store`. Every package version is stored exactly once. Projects get hard links — not copies.

A **hard link** is a second directory entry pointing to the same bytes on disk. Reading the file from either location is identical — the OS sees one file. When 10 projects all use `react@18.2.0`, there is exactly one physical copy on your disk shared by all ten.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 380" style="width:100%;display:block;">
        <rect width="820" height="380" fill="#FAFAFA"></rect>
        <text x="180" y="32" text-anchor="middle" font-size="13" font-weight="700" fill="#6B7280" font-family="system-ui,sans-serif">npm / Yarn approach</text>
        <g class="fade-1">
          <rect x="30" y="50" width="140" height="80" rx="8" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"></rect>
          <text x="100" y="72" text-anchor="middle" font-size="13" font-weight="700" fill="#7F1D1D" font-family="system-ui">Project A</text>
          <text x="100" y="91" text-anchor="middle" font-size="11" fill="#991B1B" font-family="monospace">react@18 (14MB)</text>
          <text x="100" y="108" text-anchor="middle" font-size="11" fill="#991B1B" font-family="monospace">lodash@4 (6MB)</text>
        </g>
        <g class="fade-2">
          <rect x="30" y="150" width="140" height="80" rx="8" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"></rect>
          <text x="100" y="172" text-anchor="middle" font-size="13" font-weight="700" fill="#7F1D1D" font-family="system-ui">Project B</text>
          <text x="100" y="191" text-anchor="middle" font-size="11" fill="#991B1B" font-family="monospace">react@18 (14MB)</text>
          <text x="100" y="208" text-anchor="middle" font-size="11" fill="#991B1B" font-family="monospace">lodash@4 (6MB)</text>
        </g>
        <g class="fade-3">
          <rect x="30" y="250" width="140" height="80" rx="8" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1.5"></rect>
          <text x="100" y="272" text-anchor="middle" font-size="13" font-weight="700" fill="#7F1D1D" font-family="system-ui">Project C</text>
          <text x="100" y="291" text-anchor="middle" font-size="11" fill="#991B1B" font-family="monospace">react@18 (14MB)</text>
          <text x="100" y="308" text-anchor="middle" font-size="11" fill="#991B1B" font-family="monospace">lodash@4 (6MB)</text>
        </g>
        <g class="fade-4">
          <rect x="20" y="346" width="160" height="26" rx="6" fill="#DC2626"></rect>
          <text x="100" y="363" text-anchor="middle" font-size="12" font-weight="700" fill="#FFF" font-family="system-ui">Total: 60 MB (×3 copies)</text>
        </g>
        <line x1="415" y1="20" x2="415" y2="360" stroke="#D1D5DB" stroke-width="1.5" stroke-dasharray="6,4"></line>
        <text x="415" y="12" text-anchor="middle" font-size="11" fill="#9CA3AF" font-family="system-ui">VS</text>
        <text x="620" y="32" text-anchor="middle" font-size="13" font-weight="700" fill="#6B7280" font-family="system-ui,sans-serif">pnpm approach</text>
        <g class="fade-2">
          <polygon points="620,80 660,58 700,80 700,124 660,146 620,124"
                   fill="#FEF3C7" stroke="#F59E0B" stroke-width="2"></polygon>
          <text x="660" y="98" text-anchor="middle" font-size="11" font-weight="800" fill="#78350F" font-family="system-ui">Global</text>
          <text x="660" y="113" text-anchor="middle" font-size="11" font-weight="800" fill="#78350F" font-family="system-ui">Store</text>
          <text x="660" y="128" text-anchor="middle" font-size="9" fill="#92400E" font-family="monospace">~/.pnpm/store</text>
          <rect x="620" y="162" width="160" height="22" rx="5" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
          <text x="700" y="177" text-anchor="middle" font-size="11" font-weight="600" fill="#14532D" font-family="monospace">react@18 (14MB ×1)</text>
          <rect x="620" y="190" width="160" height="22" rx="5" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
          <text x="700" y="205" text-anchor="middle" font-size="11" font-weight="600" fill="#14532D" font-family="monospace">lodash@4 (6MB ×1)</text>
        </g>
        <g class="fade-3">
          <rect x="440" y="50" width="130" height="40" rx="7" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1.5"></rect>
          <text x="505" y="75" text-anchor="middle" font-size="13" font-weight="700" fill="#1E3A8A" font-family="system-ui">Project A</text>
          <rect x="440" y="160" width="130" height="40" rx="7" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1.5"></rect>
          <text x="505" y="185" text-anchor="middle" font-size="13" font-weight="700" fill="#1E3A8A" font-family="system-ui">Project B</text>
          <rect x="440" y="270" width="130" height="40" rx="7" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1.5"></rect>
          <text x="505" y="295" text-anchor="middle" font-size="13" font-weight="700" fill="#1E3A8A" font-family="system-ui">Project C</text>
        </g>
        <line class="draw-line draw-line-1" x1="570" y1="70" x2="622" y2="100" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"></line>
        <line class="draw-line draw-line-2" x1="570" y1="180" x2="622" y2="102" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"></line>
        <line class="draw-line draw-line-3" x1="570" y1="290" x2="622" y2="115" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"></line>
        <g class="fade-5">
          <text x="586" y="66" font-size="9" fill="#B45309" font-family="system-ui" font-weight="600">hard link</text>
          <text x="564" y="166" font-size="9" fill="#B45309" font-family="system-ui" font-weight="600">hard link</text>
          <text x="564" y="278" font-size="9" fill="#B45309" font-family="system-ui" font-weight="600">hard link</text>
        </g>
        <circle class="pulse" cx="595" cy="80" r="4" fill="#F59E0B"></circle>
        <circle class="pulse" cx="595" cy="168" r="4" fill="#F59E0B" style="animation-delay:.4s"></circle>
        <circle class="pulse" cx="595" cy="292" r="4" fill="#F59E0B" style="animation-delay:.8s"></circle>
        <g class="fade-6">
          <rect x="440" y="330" width="280" height="26" rx="6" fill="#16A34A"></rect>
          <text x="580" y="347" text-anchor="middle" font-size="12" font-weight="700" fill="#FFF" font-family="system-ui">Total on disk: 20 MB (shared by all)</text>
        </g>
        <rect x="403" y="0" width="24" height="16" rx="2"
              fill="rgba(239,68,68,.18)" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,2"></rect>
        <rect x="556" y="157" width="60" height="15" rx="2"
              fill="rgba(239,68,68,.18)" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,2"></rect>
        <rect x="556" y="269" width="60" height="14" rx="2"
              fill="rgba(239,68,68,.18)" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,2"></rect>
      </svg>

npm duplicates packages per-project; pnpm stores each version once and hard-links it everywhere

Because hard links share the same inode, the OS treats them as a single file. Deleting `node_modules` in one project leaves the store and all other projects completely intact. The store entry is only freed when no project references it.

## Real-World Disk Savings

The savings compound as you add projects. By 10 projects the difference between npm and pnpm is measured in gigabytes.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 320" style="width:100%;display:block;">
        <rect width="760" height="320" fill="#FAFAFA"></rect>
        <text x="42" y="48"  text-anchor="end" font-size="11" fill="#6B7280" font-family="system-ui">1 GB</text>
        <text x="42" y="98"  text-anchor="end" font-size="11" fill="#6B7280" font-family="system-ui">750 MB</text>
        <text x="42" y="148" text-anchor="end" font-size="11" fill="#6B7280" font-family="system-ui">500 MB</text>
        <text x="42" y="198" text-anchor="end" font-size="11" fill="#6B7280" font-family="system-ui">250 MB</text>
        <text x="42" y="248" text-anchor="end" font-size="11" fill="#6B7280" font-family="system-ui">0</text>
        <line x1="50" y1="44"  x2="740" y2="44"  stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="50" y1="94"  x2="740" y2="94"  stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="50" y1="144" x2="740" y2="144" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="50" y1="194" x2="740" y2="194" stroke="#E5E7EB" stroke-width="1"></line>
        <line x1="50" y1="244" x2="740" y2="244" stroke="#E5E7EB" stroke-width="2"></line>
        <text x="145" y="268" text-anchor="middle" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">1 project</text>
        <text x="315" y="268" text-anchor="middle" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">3 projects</text>
        <text x="485" y="268" text-anchor="middle" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">5 projects</text>
        <text x="655" y="268" text-anchor="middle" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">10 projects</text>
        <rect x="200" y="286" width="12" height="12" rx="2" fill="#64748B"></rect>
        <text x="218" y="297" font-size="12" fill="#374151" font-family="system-ui">npm</text>
        <rect x="280" y="286" width="12" height="12" rx="2" fill="#0EA5E9"></rect>
        <text x="298" y="297" font-size="12" fill="#374151" font-family="system-ui">Yarn</text>
        <rect x="358" y="286" width="12" height="12" rx="2" fill="#F59E0B"></rect>
        <text x="376" y="297" font-size="12" fill="#374151" font-family="system-ui">pnpm</text>
        <g>
          <rect class="bar-npm" x="95"  y="204" width="30" height="40" rx="3" fill="#64748B"></rect>
          <text x="110" y="200" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">200</text>
          <rect class="bar-yarn" x="132" y="206" width="30" height="38" rx="3" fill="#0EA5E9"></rect>
          <text x="147" y="202" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">190</text>
          <rect class="bar-pnpm" x="169" y="210" width="30" height="34" rx="3" fill="#F59E0B"></rect>
          <text x="184" y="206" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">170</text>
        </g>
        <g>
          <rect class="bar-npm" x="265" y="124" width="30" height="120" rx="3" fill="#64748B"></rect>
          <text x="280" y="120" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">600</text>
          <rect class="bar-yarn" x="302" y="136" width="30" height="108" rx="3" fill="#0EA5E9"></rect>
          <text x="317" y="132" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">540</text>
          <rect class="bar-pnpm" x="339" y="206" width="30" height="38" rx="3" fill="#F59E0B"></rect>
          <text x="354" y="202" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">190</text>
        </g>
        <g>
          <rect class="bar-npm" x="435" y="47"  width="30" height="197" rx="3" fill="#64748B"></rect>
          <text x="450" y="43" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">1000</text>
          <rect class="bar-yarn" x="472" y="64"  width="30" height="180" rx="3" fill="#0EA5E9"></rect>
          <text x="487" y="60" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">900</text>
          <rect class="bar-pnpm" x="509" y="204" width="30" height="40" rx="3" fill="#F59E0B"></rect>
          <text x="524" y="200" text-anchor="middle" font-size="10" fill="#374151" font-family="system-ui">200</text>
        </g>
        <g>
          <rect class="bar-npm" x="605" y="47"  width="30" height="197" rx="3" fill="#64748B"></rect>
          <text x="620" y="43" text-anchor="middle" font-size="10" font-weight="700" fill="#DC2626" font-family="system-ui">2000+</text>
          <polyline points="605,47 612,38 619,47 626,38 635,47" stroke="#DC2626" stroke-width="2" fill="none"></polyline>
          <rect class="bar-yarn" x="642" y="47"  width="30" height="197" rx="3" fill="#0EA5E9"></rect>
          <text x="657" y="43" text-anchor="middle" font-size="10" font-weight="700" fill="#0369A1" font-family="system-ui">1800+</text>
          <polyline points="642,47 649,38 656,47 663,38 672,47" stroke="#0369A1" stroke-width="2" fill="none"></polyline>
          <rect class="bar-pnpm" x="679" y="200" width="30" height="44" rx="3" fill="#F59E0B"></rect>
          <text x="694" y="196" text-anchor="middle" font-size="10" font-weight="700" fill="#16A34A" font-family="system-ui">220</text>
        </g>
        <rect x="601" y="32" width="38" height="19" rx="2"
              fill="rgba(239,68,68,.18)" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,2"></rect>
        <rect x="638" y="32" width="38" height="19" rx="2"
              fill="rgba(239,68,68,.18)" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,2"></rect>
      </svg>

Disk usage (MB) for projects sharing a common set of dependencies. pnpm barely grows with each new project.

The reason pnpm's bar barely moves: the packages are already in the store. Adding a new project that uses the same dependencies costs only a few kilobytes of hard link entries — not megabytes of package files.

> "On a laptop with 20 Node projects, switching from npm to pnpm recovered 18 GB of disk space on the first run."

## Installation Speed: Cold Cache vs Warm Cache

pnpm shines most on repeat installs. Once a package is in the global store, installing it into a new project is near-instant — no download, just hard link creation.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 310" style="width:100%;display:block;">
        <rect width="720" height="310" fill="#FAFAFA"></rect>
        <text x="370" y="32" text-anchor="middle" font-size="14" font-weight="700" fill="#111827" font-family="system-ui">Installation Time (lower = faster)</text>
        <text x="20" y="65" font-size="12" font-weight="700" fill="#374151" font-family="system-ui">First install (cold cache)</text>
        <text x="70"  y="98" text-anchor="end" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">npm</text>
        <rect x="78" y="84" width="600" height="20" rx="4" fill="#E5E7EB"></rect>
        <rect class="prog-npm" x="78" y="84" width="0" height="20" rx="4" fill="#64748B" style="max-width:528px"></rect>
        <text x="690" y="98" font-size="12" fill="#374151" font-family="system-ui" font-weight="600">~ 8.2s</text>
        <text x="70"  y="126" text-anchor="end" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">Yarn</text>
        <rect x="78" y="112" width="600" height="20" rx="4" fill="#E5E7EB"></rect>
        <rect class="prog-yarn" x="78" y="112" width="0" height="20" rx="4" fill="#0EA5E9" style="max-width:396px"></rect>
        <text x="690" y="126" font-size="12" fill="#374151" font-family="system-ui" font-weight="600">~ 6.0s</text>
        <text x="70"  y="154" text-anchor="end" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">pnpm</text>
        <rect x="78" y="140" width="600" height="20" rx="4" fill="#E5E7EB"></rect>
        <rect class="prog-pnpm-cold" x="78" y="140" width="0" height="20" rx="4" fill="#F59E0B" style="max-width:288px"></rect>
        <text x="690" y="154" font-size="12" fill="#374151" font-family="system-ui" font-weight="600">~ 3.5s</text>
        <rect x="0" y="170" width="720" height="1" fill="#E5E7EB"></rect>
        <text x="20" y="196" font-size="12" font-weight="700" fill="#374151" font-family="system-ui">Re-install (warm cache, packages in store)</text>
        <text x="70"  y="230" text-anchor="end" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">npm</text>
        <rect x="78" y="216" width="600" height="20" rx="4" fill="#E5E7EB"></rect>
        <rect class="prog-npm" x="78" y="216" width="0" height="20" rx="4" fill="#64748B" style="animation-delay:.8s;max-width:528px"></rect>
        <text x="690" y="230" font-size="12" fill="#374151" font-family="system-ui" font-weight="600">~ 5.8s</text>
        <text x="70"  y="258" text-anchor="end" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">Yarn</text>
        <rect x="78" y="244" width="600" height="20" rx="4" fill="#E5E7EB"></rect>
        <rect class="prog-yarn" x="78" y="244" width="0" height="20" rx="4" fill="#0EA5E9" style="animation-delay:1s;max-width:396px"></rect>
        <text x="690" y="258" font-size="12" fill="#374151" font-family="system-ui" font-weight="600">~ 4.1s</text>
        <text x="70"  y="286" text-anchor="end" font-size="12" font-weight="600" fill="#374151" font-family="system-ui">pnpm</text>
        <rect x="78" y="272" width="600" height="20" rx="4" fill="#E5E7EB"></rect>
        <rect class="prog-pnpm-warm" x="78" y="272" width="0" height="20" rx="4" fill="#16A34A" style="animation-delay:1.2s"></rect>
        <text x="690" y="286" font-size="12" fill="#374151" font-family="system-ui" font-weight="600">~ 0.9s</text>
        <g class="fade-6">
          <rect x="160" y="262" width="106" height="18" rx="4" fill="#DCFCE7" stroke="#86EFAC" stroke-width="1"></rect>
          <text x="213" y="275" text-anchor="middle" font-size="10" font-weight="700" fill="#14532D" font-family="system-ui">just hard links!</text>
        </g>
        <rect x="155" y="258" width="116" height="36" rx="3"
              fill="rgba(239,68,68,.18)" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,2"></rect>
      </svg>

Times are representative benchmarks for a mid-sized app (~50 deps). pnpm's warm-cache install creates hard links instead of copying files.

Why is pnpm's warm-cache so fast? When you delete `node_modules` and re-run `pnpm install`, no package is downloaded. pnpm walks the `package.json`, confirms each version is in the store, and creates hard links. The entire operation is metadata manipulation — the filesystem equivalent of instant.

npm and Yarn must still verify file integrity and re-copy files on each install, even with a populated cache.

## Strict Isolation: No Phantom Dependencies

npm and Yarn hoist all packages to a flat `node_modules/`. This means your code can accidentally import a package it never declared — and your CI will explode when that transitive dep disappears.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 340" style="width:100%;display:block;">
        <rect width="760" height="340" fill="#FAFAFA"></rect>
        <text x="190" y="30" text-anchor="middle" font-size="13" font-weight="700" fill="#6B7280" font-family="system-ui">npm flat node_modules</text>
        <g class="fade-1">
          <rect x="30" y="44" width="320" height="270" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <rect x="30" y="44" width="320" height="32" rx="8" fill="#F3F4F6"></rect>
          <text x="50" y="65" font-size="12" font-weight="700" fill="#374151" font-family="monospace">node_modules/</text>
          <text x="66" y="98"  font-size="12" fill="#374151" font-family="monospace">├── react/</text>
          <text x="66" y="118" font-size="12" fill="#374151" font-family="monospace">├── lodash/</text>
          <text x="66" y="138" font-size="12" fill="#6B7280" font-family="monospace">├── scheduler/ <tspan fill="#9CA3AF">(transitive)</tspan></text>
          <text x="66" y="158" font-size="12" fill="#6B7280" font-family="monospace">├── prop-types/ <tspan fill="#9CA3AF">(transitive)</tspan></text>
          <text x="66" y="178" font-size="12" fill="#6B7280" font-family="monospace">├── loose-envify/ <tspan fill="#9CA3AF">(transitive)</tspan></text>
          <text x="66" y="198" font-size="12" fill="#6B7280" font-family="monospace">└── js-tokens/ <tspan fill="#9CA3AF">(transitive)</tspan></text>
        </g>
        <g class="fade-2">
          <rect x="42" y="218" width="296" height="50" rx="6" fill="#FEF3C7" stroke="#FCD34D" stroke-width="1"></rect>
          <text x="56" y="237" font-size="11" fill="#92400E" font-family="monospace">// Works! (but it's a trap)</text>
          <text x="56" y="255" font-size="11" fill="#78350F" font-family="monospace">import { debounce } from 'lodash'</text>
        </g>
        <g class="fade-3">
          <rect x="42" y="276" width="296" height="26" rx="5" fill="#DC2626"></rect>
          <text x="190" y="293" text-anchor="middle" font-size="11" font-weight="700" fill="#FFF" font-family="system-ui">⚠ Phantom dep — not in package.json</text>
        </g>
        <line x1="395" y1="20" x2="395" y2="330" stroke="#D1D5DB" stroke-width="1.5" stroke-dasharray="6,4"></line>
        <text x="575" y="30" text-anchor="middle" font-size="13" font-weight="700" fill="#6B7280" font-family="system-ui">pnpm strict symlinks</text>
        <g class="fade-2">
          <rect x="410" y="44" width="320" height="270" rx="8" fill="#FFF" stroke="#E5E7EB" stroke-width="1.5"></rect>
          <rect x="410" y="44" width="320" height="32" rx="8" fill="#F3F4F6"></rect>
          <text x="430" y="65" font-size="12" font-weight="700" fill="#374151" font-family="monospace">node_modules/</text>
          <text x="446" y="98"  font-size="12" fill="#374151" font-family="monospace">├── react/   → .pnpm/react@18/</text>
          <text x="446" y="118" font-size="12" fill="#6B7280" font-family="monospace">└── .pnpm/    (hidden store)</text>
          <text x="464" y="138" font-size="11" fill="#9CA3AF" font-family="monospace">├── react@18/node_modules/</text>
          <text x="480" y="156" font-size="11" fill="#9CA3AF" font-family="monospace">│   ├── scheduler/</text>
          <text x="480" y="174" font-size="11" fill="#9CA3AF" font-family="monospace">│   └── prop-types/</text>
          <text x="464" y="194" font-size="11" fill="#9CA3AF" font-family="monospace">└── lodash@4/ (not declared!)</text>
        </g>
        <g class="fade-3">
          <rect x="422" y="218" width="296" height="50" rx="6" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="1"></rect>
          <text x="436" y="237" font-size="11" fill="#7F1D1D" font-family="monospace">// Blocked by pnpm</text>
          <text x="436" y="255" font-size="11" fill="#991B1B" font-family="monospace">import { debounce } from 'lodash'</text>
        </g>
        <g class="fade-4">
          <rect x="422" y="276" width="296" height="26" rx="5" fill="#16A34A"></rect>
          <text x="570" y="293" text-anchor="middle" font-size="11" font-weight="700" fill="#FFF" font-family="system-ui">✓ ERR: lodash not in package.json</text>
        </g>
      </svg>

npm exposes transitive deps for accidental use; pnpm's symlink layout makes them invisible to your code

pnpm's `node_modules` only exposes packages you actually declared. Your dependencies' dependencies are nested inside `.pnpm/` where your code cannot reach them. If you accidentally use a transitive package, pnpm will error during install — not during a production deploy six months later when a transitive dep is updated.

## First-Class Workspace Support for Monorepos

pnpm's workspace support is built in — no plugins, no Lerna, no Nx required for the basics. Add a `pnpm-workspace.yaml` and all your packages share the same store, link to each other automatically, and run scripts across the entire repo.

```bash
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

Cross-package references use the `workspace:` protocol — pnpm links them as hard-linked directory entries during development, then replaces with real version numbers during publish.

```bash
# packages/ui/package.json
{
  "dependencies": {
    "@myapp/utils": "workspace:*"
  }
}
```

🔗

### workspace:\* Protocol

Local packages reference each other via symlinks during development. No manual linking, no `npm link` confusion.

🏃

### Recursive Scripts

`pnpm -r run build` runs build in every workspace package. Add `--parallel` for concurrent execution.

🔍

### Filter by Package

`pnpm --filter @myapp/ui run test` runs only in the packages you specify, with dependency awareness.

## Getting Started in 60 Seconds

### Install pnpm

```bash
# Via npm (ironic, but it works)
npm install -g pnpm

# Or via the standalone script (no Node required)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Or with Homebrew
brew install pnpm
```

### Migrate an Existing Project

```bash
# Remove old lockfile and node_modules
rm -rf node_modules package-lock.json yarn.lock

# Install with pnpm — it reads your package.json
pnpm install

# A pnpm-lock.yaml is generated — commit this
```

### Drop-In Command Replacements

| npm / Yarn | pnpm equivalent | Notes |
| --- | --- | --- |
| npm install | pnpm install | Reads pnpm-lock.yaml |
| npm install react | pnpm add react | Adds to dependencies |
| npm install -D eslint | pnpm add -D eslint | Adds to devDependencies |
| npm run build | pnpm run build or pnpm build | Scripts work identically |
| npx create-next-app | pnpm dlx create-next-app | dlx = one-time exec without install |
| npm update | pnpm update | Respects semver ranges |
| npm outdated | pnpm outdated | Shows what can be updated |

### Pro Commands Worth Knowing

```bash
# See where the store lives and how big it is
pnpm store path

# Remove packages no longer referenced by any project
pnpm store prune

# Run a script across all workspace packages
pnpm -r run test

# Run only in packages that changed since git HEAD
pnpm --filter ...[HEAD~1] run build

# Show why a package is installed
pnpm why lodash

# Interactive update (choose what to bump)
pnpm update --interactive
```

## pnpm vs npm vs Yarn: Feature Matrix

| Feature | npm | Yarn Berry | pnpm |
| --- | --- | --- | --- |
| Disk efficiency | Copies per project | Cache, no hard links | Hard links, 1 copy |
| Re-install speed | Re-copies all files | Copies from cache | Links in ms |
| Phantom deps | Allowed (flat) | Blocked (PnP) | Blocked (symlinks) |
| Workspace support | Workspaces (basic) | Workspaces + PnP | workspace:* protocol |
| Node.js compat | Universal | Needs .yarnrc.yml | Drop-in compatible |
| lockfile format | package-lock.json | yarn.lock | pnpm-lock.yaml (readable) |
| Learning curve | None | High (PnP mode) | Very low |

## Try It Right Now

pnpm is a single install command away and works with every existing Node.js project. No configuration changes needed for basic usage.

```bash
npm install -g pnpm
pnpm install   # drop-in for npm install
```

Your package.json and existing scripts remain unchanged.
