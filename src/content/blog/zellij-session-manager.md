---
title: "Zellij Session Manager — Every Terminal, Named, Resumable, Remote"
date: 2026-07-17
description: "A Zellij session management system: auto-naming from directories, auto-attach on shell open, capture existing terminals, fzf picker, Tailscale remote access, and reboot recovery. 4 scripts, 150 lines of bash."
tags: [zellij, terminal, dotfiles]
cover: "assets/images/covers/zellij-session-manager.svg"
draft: false
---

## The Problem

Two laptops, two cities, terminal chaos. Sessions unnamed, untracked, and gone after reboot.

Cities

2

Bengaluru ↔ Guwahati

Sessions

??

Unnamed, untracked

After reboot

0

Everything gone

## What was happening

1

Open terminal, `cd ~/git/kri`, start working

2

Open another terminal, `cd ~/git/atlas`, start working

3

Laptop restarts — both terminals gone, no idea what was running

4

SSH from Guwahati — can't reach any sessions, start over

<aside class="callout"><strong class="callout__title">The core issue:</strong><div class="callout__body">Terminal sessions are anonymous, ephemeral, and local. No naming, no persistence, no remote access.</div></aside>

### Why Zellij (not tmux)

Zellij gives us session resurrection without plugins, discoverable keybindings without memorization, and floating panes without configuration.

## Zellij wins

| Session restore | Built-in, no plugins |
| --- | --- |
| Discoverability | Live keybinding hints |
| Floating panes | Built-in (Alt-p) |
| Layout files | KDL (human-readable) |
| Config to be productive | Zero lines needed |

## tmux wins

| Pre-installed | Every server |
| --- | --- |
| Plugin ecosystem | Mature (TPM) |
| Scripting | Shell-scriptable |
| Community | 15+ years of guides |
| Memory | ~4MB vs ~22MB |

<aside class="callout"><strong class="callout__title">The decision:</strong><div class="callout__body">Zellij for local dev (better UX, built-in resurrection). tmux stays on remote servers (pre-installed everywhere). The shell hook + Tailscale bridge the gap.</div></aside>

### Architecture

4 scripts + 1 config + 1 shell hook = every terminal tracked, named, and resumable.

zj

capture

Existing terminal → Zellij session

sess

fzf

Pick from all sessions

shell hook

auto

New terminal → auto-create session

Complete architecture — animated LIVE

<svg viewBox="0 0 900 480" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="480" fill="#F8FAFC"></rect>
      <rect x="20" y="20" width="220" height="180" rx="12" fill="none" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="130" y="40" text-anchor="middle" font-size="10" fill="#9CA3AF" font-weight="600">GUWAHATI</text>
      <rect x="35" y="55" width="190" height="45" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="130" y="75" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">Terminal + SSH</text>
      <text x="130" y="90" text-anchor="middle" font-size="8" fill="#6B7280">ssh 198.51.100.27</text>
      <rect x="35" y="115" width="190" height="35" rx="6" fill="#DBEAFE" stroke="#93C5FD" stroke-width="1"></rect>
      <text x="130" y="137" text-anchor="middle" font-size="9" fill="#1E40AF" font-weight="600">sess → fzf picker</text>
      <rect x="290" y="30" width="200" height="160" rx="16" fill="#EFF6FF" stroke="#93C5FD" stroke-width="1.5"></rect>
      <text x="390" y="55" text-anchor="middle" font-size="10" font-weight="700" fill="#1E40AF">Tailscale VPN</text>
      <circle cx="340" cy="100" r="18" fill="#1a1a3e" stroke="#444CE7" stroke-width="1.5"></circle>
      <text x="340" y="104" text-anchor="middle" font-size="8" fill="#fff" font-weight="600">cylon</text>
      <circle cx="390" cy="115" r="10" fill="#374151"></circle><circle cx="440" cy="100" r="10" fill="#374151"></circle>
      <rect x="320" y="140" width="140" height="20" rx="4" fill="#1a1a3e"></rect>
      <text x="390" y="154" text-anchor="middle" font-size="8" fill="#A4BBFC" font-family="monospace">198.51.100.27</text>
      <circle cx="340" cy="100" r="3" fill="#444CE7"><animate attributeName="r" values="3;12" dur="2s" repeatCount="indefinite"></animate><animate attributeName="opacity" values="1;0" dur="2s" repeatCount="indefinite"></animate></circle>
      <line x1="240" y1="100" x2="288" y2="100" stroke="#2563EB" stroke-width="2" class="fl"></line>
      <polygon points="288,95 298,100 288,105" fill="#2563EB"></polygon>
      <line x1="490" y1="100" x2="540" y2="100" stroke="#2563EB" stroke-width="2" class="fl"></line>
      <polygon points="540,95 550,100 540,105" fill="#2563EB"></polygon>
      <rect x="560" y="15" width="320" height="450" rx="12" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
      <text x="720" y="38" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">cylon — Bengaluru</text>
      <text x="720" y="53" text-anchor="middle" font-size="8" fill="#818CF8">Ubuntu 24.04 · 198.51.100.27</text>
      <rect x="575" y="65" width="290" height="40" rx="6" fill="rgba(68,76,231,.2)" stroke="rgba(68,76,231,.4)" stroke-width="1"></rect>
      <text x="720" y="83" text-anchor="middle" font-size="9" fill="#C7D2FE" font-weight="600">Shell Hook — auto-name from $PWD</text>
      <text x="720" y="97" text-anchor="middle" font-size="8" fill="#818CF8">~/.config/zellij/sess.sh</text>
      <line x1="720" y1="105" x2="720" y2="120" stroke="#444CE7" stroke-width="1.5" class="fl"></line>
      <rect x="575" y="120" width="290" height="30" rx="6" fill="#2563EB" stroke="#3B82F6" stroke-width="1.5"></rect>
      <text x="720" y="140" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">Zellij Server — 0.44.3</text>
      <rect x="575" y="160" width="290" height="130" rx="6" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.15)" stroke-width="1"></rect>
      <text x="590" y="178" font-size="8" fill="#818CF8" font-weight="600">SESSIONS</text>
      <rect x="585" y="188" width="270" height="24" rx="4" fill="rgba(22,163,74,.2)" stroke="#16A34A" stroke-width="1"></rect>
      <text x="595" y="204" font-size="9" fill="#6EE7B7" font-weight="600">● kri</text>
      <text x="720" y="204" font-size="8" fill="#818CF8">3 panes · attached</text>
      <rect x="585" y="216" width="270" height="24" rx="4" fill="rgba(37,99,235,.15)" stroke="#3B82F6" stroke-width="1"></rect>
      <text x="595" y="232" font-size="9" fill="#93C5FD" font-weight="600">○ atlas</text>
      <text x="720" y="232" font-size="8" fill="#818CF8">5 panes · detached</text>
      <rect x="585" y="244" width="270" height="24" rx="4" fill="rgba(37,99,235,.15)" stroke="#3B82F6" stroke-width="1"></rect>
      <text x="595" y="260" font-size="9" fill="#93C5FD" font-weight="600">○ blog</text>
      <text x="720" y="260" font-size="8" fill="#818CF8">2 panes · detached</text>
      <rect x="585" y="272" width="270" height="12" rx="3" fill="rgba(255,255,255,.05)"></rect>
      <text x="720" y="281" text-anchor="middle" font-size="7" fill="#6B7280">+ any new terminal auto-creates here</text>
      <rect x="575" y="305" width="140" height="60" rx="6" fill="rgba(16,185,129,.15)" stroke="#10B981" stroke-width="1"></rect>
      <text x="645" y="323" text-anchor="middle" font-size="8" fill="#6EE7B7" font-weight="600">zj</text>
      <text x="645" y="337" text-anchor="middle" font-size="7" fill="#A7F3D0">capture terminal</text>
      <text x="645" y="351" text-anchor="middle" font-size="7" fill="#A7F3D0">into session</text>
      <rect x="725" y="305" width="140" height="60" rx="6" fill="rgba(245,158,11,.15)" stroke="#F59E0B" stroke-width="1"></rect>
      <text x="795" y="323" text-anchor="middle" font-size="8" fill="#FCD34D" font-weight="600">sess</text>
      <text x="795" y="337" text-anchor="middle" font-size="7" fill="#FDE68A">fzf session</text>
      <text x="795" y="351" text-anchor="middle" font-size="7" fill="#FDE68A">picker</text>
      <rect x="575" y="380" width="290" height="45" rx="6" fill="rgba(217,119,6,.15)" stroke="#D97706" stroke-width="1"></rect>
      <text x="720" y="399" text-anchor="middle" font-size="9" fill="#FCD34D" font-weight="600">Zellij Resurrection — auto-save to disk</text>
      <text x="720" y="415" text-anchor="middle" font-size="8" fill="#FBBF24">~/.local/share/zellij/</text>
      <line x1="720" y1="425" x2="720" y2="440" stroke="#D97706" stroke-width="1.5" class="fl"></line>
      <rect x="650" y="440" width="140" height="25" rx="4" fill="#374151" stroke="#6B7280" stroke-width="1"></rect>
      <text x="720" y="457" text-anchor="middle" font-size="8" fill="#E5E7EB">disk persistence</text>
      <path d="M 790 452 Q 830 452 830 420 Q 830 390 790 390" fill="none" stroke="#D97706" stroke-width="1.5" class="fl"></path>
      <text x="840" y="425" font-size="7" fill="#D97706" font-weight="600" transform="rotate(90,840,425)">reboot</text>
      <rect x="20" y="230" width="220" height="235" rx="12" fill="none" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="130" y="250" text-anchor="middle" font-size="10" fill="#9CA3AF" font-weight="600">LOCAL TERMINALS</text>
      <rect x="35" y="265" width="190" height="50" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="48" y="283" font-size="8" fill="#6EE7B7" font-family="monospace">$ zj</text>
      <text x="48" y="298" font-size="8" fill="#6B7280">capture this shell → session</text>
      <text x="48" y="308" font-size="7" fill="#4B5563">named from $PWD</text>
      <rect x="35" y="325" width="190" height="50" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="48" y="343" font-size="8" fill="#6EE7B7" font-family="monospace">$ cd ~/git/atlas</text>
      <text x="48" y="358" font-size="8" fill="#6B7280">next terminal auto-creates</text>
      <text x="48" y="368" font-size="7" fill="#4B5563">session "atlas"</text>
      <rect x="35" y="385" width="190" height="50" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="48" y="403" font-size="8" fill="#FCD34D" font-family="monospace">$ sess</text>
      <text x="48" y="418" font-size="8" fill="#6B7280">fzf picker → select session</text>
      <text x="48" y="428" font-size="7" fill="#4B5563">attach to any</text>
      <rect x="35" y="445" width="190" height="14" rx="3" fill="#F3F4F6"></rect>
      <text x="130" y="455" text-anchor="middle" font-size="7" fill="#9CA3AF">zj-migrate captures all of these</text>
      <line x1="225" y1="290" x2="575" y2="200" stroke="#10B981" stroke-width="1.5" class="fl"></line>
      <line x1="225" y1="350" x2="575" y2="256" stroke="#3B82F6" stroke-width="1.5" class="fl"></line>
      <line x1="225" y1="410" x2="575" y2="140" stroke="#F59E0B" stroke-width="1.5" class="fl"></line>
    </svg>

### Session Lifecycle

From opening a terminal to resuming after reboot — every state transition.

State machine — animated transitions

<svg viewBox="0 0 900 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="900" height="320" fill="#F8FAFC"></rect>
      <defs><marker id="a" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="#9CA3AF"></polygon></marker></defs>
      <rect x="20" y="40" width="120" height="40" rx="20" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="80" y="65" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="600">Shell Opens</text>
      <rect x="190" y="40" width="120" height="40" rx="20" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.5"></rect>
      <text x="250" y="65" text-anchor="middle" font-size="10" fill="#1E40AF" font-weight="600">Hook Checks</text>
      <rect x="360" y="15" width="120" height="35" rx="18" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="420" y="37" text-anchor="middle" font-size="9" fill="#15803D" font-weight="600">Session exists</text>
      <rect x="360" y="65" width="120" height="35" rx="18" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="420" y="87" text-anchor="middle" font-size="9" fill="#92400E" font-weight="600">New session</text>
      <rect x="540" y="40" width="120" height="40" rx="20" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
      <text x="600" y="65" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">Zellij Active</text>
      <rect x="190" y="120" width="120" height="40" rx="20" fill="#EDE9FE" stroke="#7C3AED" stroke-width="1.5"></rect>
      <text x="250" y="145" text-anchor="middle" font-size="9" fill="#6D28D9" font-weight="600">zj capture</text>
      <rect x="360" y="120" width="120" height="40" rx="20" fill="#EDE9FE" stroke="#7C3AED" stroke-width="1.5"></rect>
      <text x="420" y="145" text-anchor="middle" font-size="9" fill="#6D28D9" font-weight="600">zj-migrate</text>
      <rect x="700" y="40" width="120" height="40" rx="20" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.5"></rect>
      <text x="760" y="65" text-anchor="middle" font-size="10" fill="#991B1B" font-weight="600">Reboot</text>
      <rect x="700" y="120" width="120" height="40" rx="20" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="760" y="145" text-anchor="middle" font-size="9" fill="#92400E" font-weight="600">Disk Saved</text>
      <rect x="540" y="120" width="120" height="40" rx="20" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="600" y="145" text-anchor="middle" font-size="9" fill="#15803D" font-weight="600">Auto-Restore</text>
      <rect x="190" y="210" width="120" height="40" rx="20" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1.5"></rect>
      <text x="250" y="235" text-anchor="middle" font-size="9" fill="#1E40AF" font-weight="600">SSH Remote</text>
      <rect x="360" y="210" width="120" height="40" rx="20" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
      <text x="420" y="235" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">sess / zj -a</text>
      <rect x="540" y="210" width="120" height="40" rx="20" fill="#1a1a3e" stroke="#444CE7" stroke-width="2"></rect>
      <text x="600" y="235" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">Same Session</text>
      <line x1="140" y1="60" x2="188" y2="60" stroke="#9CA3AF" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="310" y1="55" x2="358" y2="32" stroke="#16A34A" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="310" y1="65" x2="358" y2="82" stroke="#D97706" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="480" y1="32" x2="538" y2="55" stroke="#16A34A" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="480" y1="82" x2="538" y2="65" stroke="#D97706" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="250" y1="105" x2="250" y2="118" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="310" y1="140" x2="358" y2="140" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="480" y1="140" x2="538" y2="140" stroke="#7C3AED" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="660" y1="60" x2="698" y2="60" stroke="#DC2626" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="700" y1="80" x2="700" y2="118" stroke="#DC2626" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="698" y1="140" x2="662" y2="140" stroke="#D97706" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="538" y1="140" x2="500" y2="100" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#a)"></line>
      <line x1="250" y1="250" x2="358" y2="235" stroke="#3B82F6" stroke-width="1.5" marker-end="url(#a)"></line>
      <line x1="480" y1="230" x2="538" y2="230" stroke="#444CE7" stroke-width="1.5" marker-end="url(#a)"></line>
      <text x="80" y="25" text-anchor="middle" font-size="9" fill="#9CA3AF" font-weight="600">NEW TERMINAL</text>
      <text x="330" y="185" text-anchor="middle" font-size="9" fill="#9CA3AF" font-weight="600">EXISTING TERMINALS</text>
      <text x="760" y="25" text-anchor="middle" font-size="9" fill="#9CA3AF" font-weight="600">REBOOT</text>
      <text x="420" y="195" text-anchor="middle" font-size="9" fill="#9CA3AF" font-weight="600">REMOTE ACCESS</text>
    </svg>

### Reboot Recovery

How sessions survive a laptop restart.

## The chain

1

**Zellij saves to disk** — every pane layout, tab, scrollback → `~/.local/share/zellij/`

2

**Laptop reboots** — all processes die, disk persists

3

**Tailscale auto-connects** — stable IP 198.51.100.27 returns

4

**Open terminal** — shell hook runs, finds saved session

5

**Zellij restores** — layout + scrollback back, empty shells in right positions

<aside class="callout"><strong class="callout__title">Important:</strong><div class="callout__body">Zellij restores the <em>layout</em> (panes, tabs, positions) and scrollback. It does <strong>not</strong> restore running processes. A <code>python server.py</code> that was running will need to be re-started. This is true for every multiplexer — no tool survives a reboot and brings back live processes.</div></aside>

### config.kdl

Zellij configuration — mode-based keybindings, dark theme, sensible defaults.

## Key design choices

| Setting | Value | Why |
| --- | --- | --- |
| default_shell | bash | Consistent across terminals |
| scroll_buffer_size | 50000 | Deep scrollback for logs |
| pane_frames | false | Clean look, less visual noise |
| mirror_session | true | New panes open in current dir |
| theme | custom dark | Matches blog design |

## Keybinding summary

| Binding | Action | Mode |
| --- | --- | --- |
| Alt-d / Alt-r | New pane (down / right) | Pane |
| Alt-hjkl | Move between panes | Pane |
| Alt-f | Toggle fullscreen pane | Pane |
| Alt-p | Floating pane | Global |
| Alt-t | New tab | Tab |
| Alt-1..5 | Switch to tab N | Tab |
| Alt-s | Detach | Session |
| Ctrl-p | Enter pane mode (see all keys) | Global |
| Ctrl-t | Enter tab mode (see all keys) | Global |

### zj — Capture Existing Terminal

The missing piece: bring an already-running terminal into Zellij.

## Usage

```bash
# In any terminal — capture this shell into a Zellij session
$ zj
Creating session: kri

# Capture with explicit name
$ zj my-project
Creating session: my-project

# List all sessions
$ zj -l
kri   3 panes
atlas 5 panes

# Kill a session
$ zj -k old-project

# Attach from outside Zellij
$ zj -a kri
```

## What "capture" means

`zj` creates a new Zellij session with the same `$PWD`. Your current shell continues until you type `exit`. On the **next** new terminal, the shell hook auto-attaches to this session.

<aside class="callout"><strong class="callout__title">Inside Zellij already?</strong><div class="callout__body"><code>zj</code> creates a new tab instead of a new session. This is how you expand your workspace without leaving Zellij.</div></aside>

### sess — Fuzzy Session Picker

Type `sess` and fzf shows all Zellij sessions. Type to filter, enter to attach.

sess flow — animated

<svg viewBox="0 0 800 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="180" fill="#F8FAFC"></rect>
      <rect x="20" y="25" width="160" height="130" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="100" y="45" text-anchor="middle" font-size="9" fill="#6B7280" font-weight="600">Terminal</text>
      <text x="35" y="65" font-size="10" fill="#6EE7B7" font-family="monospace">$ sess</text>
      <text x="35" y="82" font-size="8" fill="#4B5563">or: sess kri</text>
      <line x1="180" y1="90" x2="230" y2="90" stroke="#444CE7" stroke-width="2" class="fl"></line>
      <polygon points="230,85 240,90 230,95" fill="#444CE7"></polygon>
      <rect x="250" y="15" width="240" height="150" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <rect x="250" y="15" width="240" height="25" rx="8" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="370" y="32" text-anchor="middle" font-size="9" fill="#6B7280" font-weight="700">fzf — sess &gt;</text>
      <text x="265" y="60" font-size="10" fill="#16A34A" font-weight="700">●</text>
      <text x="280" y="60" font-size="10" fill="#1F2937" font-family="monospace">kri</text>
      <rect x="258" y="68" width="224" height="18" rx="3" fill="#DBEAFE"></rect>
      <text x="265" y="80" font-size="10" fill="#16A34A" font-weight="700">●</text>
      <text x="280" y="80" font-size="10" fill="#1E40AF" font-family="monospace" font-weight="600">atlas</text>
      <text x="265" y="100" font-size="10" fill="#9CA3AF" font-weight="700">○</text>
      <text x="280" y="100" font-size="10" fill="#1F2937" font-family="monospace">blog</text>
      <text x="265" y="118" font-size="10" fill="#9CA3AF" font-weight="700">○</text>
      <text x="280" y="118" font-size="10" fill="#1F2937" font-family="monospace">main</text>
      <rect x="253" y="70" width="3" height="14" fill="#444CE7" rx="1"><animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"></animate></rect>
      <line x1="490" y1="90" x2="530" y2="90" stroke="#16A34A" stroke-width="2" class="fl"></line>
      <polygon points="530,85 540,90 530,95" fill="#16A34A"></polygon>
      <rect x="550" y="25" width="220" height="130" rx="8" fill="#111827" stroke="#444CE7" stroke-width="1.5"></rect>
      <text x="660" y="50" text-anchor="middle" font-size="10" fill="#fff" font-weight="700">Zellij — atlas</text>
      <text x="565" y="72" font-size="8" fill="#6EE7B7" font-family="monospace">Pane 1: $ kubectl get pods</text>
      <text x="565" y="87" font-size="8" fill="#93C5FD" font-family="monospace">Pane 2: $ vim main.py</text>
      <text x="565" y="102" font-size="8" fill="#FCD34D" font-family="monospace">Pane 3: $ docker logs -f</text>
      <text x="565" y="125" font-size="8" fill="#6B7280">Tab 1: deploy · Tab 2: debug</text>
      <text x="565" y="142" font-size="8" fill="#6B7280">Alt-p: floating pane</text>
    </svg>

### zj-migrate — Capture All Existing Terminals

One command to scan every running terminal and offer to create Zellij sessions for them.

## How it works

```bash
$ zj-migrate
Scanning running terminals...

Found 3 terminal(s) to capture:

  DIRECTORY                              SESSION NAME
  ────────────────────────────────────── ────────────
  /home/dk/Documents/git/kri             kri          (new)
  /home/dk/Documents/git/atlas           atlas        (new)
  /home/dk/Documents/git/blog-drafts     blog-drafts  (new)

Create Zellij sessions for these? [y/N] y

  CREATE  kri → /home/dk/Documents/git/kri
  CREATE  atlas → /home/dk/Documents/git/atlas
  CREATE  blog-drafts → /home/dk/Documents/git/blog-drafts

Done! 3 session(s) created.

List sessions:  zellij list-sessions
Attach:         zellij attach <session>
Fuzzy picker:   sess
```

<aside class="callout"><strong class="callout__title">What it scans:</strong><div class="callout__body">All bash/zsh/fish processes, all terminal emulator processes (gnome-terminal, kitty, alacritty, wezterm). Derives session names from their current working directories. Skips duplicates and Zellij-managed panes.</div></aside>

### Shell Hook

The magic: every new terminal auto-creates/attaches to a Zellij session named after the directory.

## The hook

```bash
# ~/.config/zellij/sess.sh — add to ~/.bashrc
if [[ -z "$ZELLIJ" ]]; then
  [[ $- == *i* ]] || return
  local session=$(basename "$PWD" | tr '.' '-')
  [[ "$session" == "$(basename "$HOME")" ]] && session="main"
  command -v zellij &>/dev/null || return
  if zellij list-sessions 2>/dev/null | grep -q "^${session}:"; then
    exec zellij attach "$session"
  else
    exec zellij --session "$session"
  fi
fi
```

<aside class="callout"><strong class="callout__title">How it works:</strong><div class="callout__body">On every shell startup, check if we're inside Zellij. If not, derive a session name from <code>$PWD</code>. If the session exists → attach. If not → create. The <code>exec</code> replaces the shell process so Zellij takes over cleanly.</div></aside>

## Edge cases handled

| Scenario | Behavior |
| --- | --- |
| In `$HOME` | Session named "main" (not "dk") |
| Non-interactive shell | Skipped (scripts, cron) |
| Zellij not installed | Skipped gracefully |
| Already inside Zellij | Skipped (no nested Zellij) |
| Directory with dots | Dots → dashes (e.g. `my.project` → `my-project`) |

### Install

Everything you need, in order.

## Quick install

```bash
# 1. Install Zellij (pre-built binary, fastest)
$ curl -sL https://github.com/zellij-org/zellij/releases/download/v0.44.3/zellij-x86_64-unknown-linux-musl.tar.gz | tar xz
$ mv zellij ~/.local/bin/

# 2. Create config
$ mkdir -p ~/.config/zellij
$ cat > ~/.config/zellij/config.kdl ooter

# 3. Add shell integration
$ echo 'source ~/.config/zellij/sess.sh' >> ~/.bashrc

# 4. Install scripts
$ cp zj zj-migrate sess ~/.local/bin/
$ chmod +x ~/.local/bin/{zj,zj-migrate,sess}

# 5. Restart shell
$ source ~/.bashrc

# 6. Capture existing terminals
$ zj-migrate
```

## Prerequisites

| Tool | Required | Install |
| --- | --- | --- |
| Zellij | Yes | Binary above or `cargo install zellij` |
| fzf | For sess | `apt install fzf` |
| Tailscale | For remote | Already installed |

### Key Bindings

## Shell

| zj | Capture terminal → session |
| --- | --- |
| zj name | Capture with name |
| zj -l | List sessions |
| zj -k name | Kill session |
| zj -a name | Attach to session |
| sess | Fuzzy session picker |
| zj-migrate | Capture all terminals |

## Inside Zellij

| Alt-d / Alt-r | New pane (down/right) |
| --- | --- |
| Alt-hjkl | Move between panes |
| Alt-f | Toggle fullscreen |
| Alt-p | Floating pane |
| Alt-t | New tab |
| Alt-1..5 | Switch tab |
| Ctrl-p | Pane mode (all keys) |
| Ctrl-t | Tab mode (all keys) |

### Remote Access via Tailscale

From Guwahati, from any city, from any machine on your Tailscale network.

## The flow

```bash
# From Guwahati (or anywhere on Tailscale)
$ ssh 198.51.100.27

# List all sessions
$ sess
# → fzf shows: ● kri  ○ atlas  ○ blog

# Or attach directly
$ zellij attach kri

# Everything is exactly where you left it
# Pane layouts, scrollback, tab names — all preserved
```

<aside class="callout"><strong class="callout__title">Tailscale advantage:</strong><div class="callout__body">Stable IP (198.51.100.27) that survives network changes. Auto-connects on boot. WireGuard encryption. No port forwarding, no DNS setup.</div></aside>

### Cheat Sheet

| Session Management |
| --- |
| zj | Capture terminal → Zellij session (auto-name from $PWD) |
| zj name | Capture with explicit name |
| zj -l | List all sessions |
| zj -k name | Kill session |
| sess | Fuzzy pick from all sessions (fzf) |
| zj-migrate | Scan + capture all running terminals |
| Inside Zellij (Alt-based, no prefix) |
| Alt-d / Alt-r | New pane (down / right) |
| Alt-h / Alt-j / Alt-k / Alt-l | Move focus (left/down/up/right) |
| Alt-f | Toggle fullscreen pane |
| Alt-p | Floating pane |
| Alt-t | New tab |
| Alt-1..5 | Go to tab N |
| Alt-s | Detach |
| Alt-x | Close pane |
| Alt-w | Close tab |
| Ctrl-p | Enter pane mode (status bar shows all keys) |
| Ctrl-t | Enter tab mode (status bar shows all keys) |
| Ctrl-s | Enter scroll mode |
