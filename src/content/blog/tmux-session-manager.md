---
title: "sess — Fuzzy Tmux Session Manager in 3 Scripts"
date: 2026-07-17
description: "A 3-file tmux session manager: fzf-powered session picker, auto-naming by project directory, and a sane tmux.conf. 50 lines of bash that replaced my terminal chaos."
tags: [tmux, terminal, dotfiles]
draft: false
---

### The Problem

Every developer who uses tmux hits the same wall: sessions pile up, names get forgotten, and `tmux ls` becomes a wall of text you scroll through while alt-tabbing between terminals.

## What most people do

1

**tmux new -s "work"** — create a session

2

**tmux new -s "kri-dev"** — another one

3

**tmux ls** — see 12 sessions, none named intuitively

4

**tmux attach -t 3** — which one was 3 again?

5

**Give up, open a new terminal**

<aside class="callout"><strong class="callout__title">The core issue:</strong><div class="callout__body">tmux gives you sessions but no good way to navigate them. <code>tmux ls</code> is a list, not an interface.</div></aside>

### The Solution: 3 Scripts

A complete session management layer on top of tmux. Three files, under 150 lines total, zero config required.

sess

fzf

Session picker with preview

tm

1 cmd

Auto-name from directory

tmux.conf

Ctrl-a

Sane prefix + splits

<aside class="callout"><strong class="callout__title">Why fzf?</strong><div class="callout__body">It gives you fuzzy filtering, live preview, and keyboard-only navigation. Type a few letters, hit enter, you're in. No scrolling through output.</div></aside>

### Before & After

## Before

| Commands to switch | 3–5 per switch |
| --- | --- |
| Session naming | Ad hoc, forgotten |
| New session | tmux new -s name -c dir |
| Session visibility | tmux ls (text dump) |
| Panes | Ctrl-b % and " (awkward prefix) |

## After

| Commands to switch | 1 (sess → pick) |
| --- | --- |
| Session naming | Auto from cwd |
| New session | tm (one word) |
| Session visibility | fzf with live preview |
| Panes | Ctrl-a \| and Ctrl-a - |

### sess — The Fuzzy Session Picker

Type `sess` and get an fzf interface showing all tmux sessions. Attached sessions show ●, detached show ○. Type to filter, hit enter to switch.

sess flow — animated

<svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="200" fill="#F8FAFC"></rect>
      <rect x="20" y="30" width="200" height="140" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="120" y="52" text-anchor="middle" font-size="10" fill="#6B7280" font-weight="600">Terminal</text>
      <text x="35" y="74" font-size="11" fill="#6EE7B7" font-family="monospace">$ sess</text>
      <line x1="230" y1="100" x2="290" y2="100" stroke="#444ce7" stroke-width="2" stroke-dasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1s" repeatCount="indefinite"></animate>
      </line>
      <polygon points="290,95 300,100 290,105" fill="#444ce7"></polygon>
      <rect x="310" y="20" width="260" height="160" rx="8" fill="#fff" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <rect x="310" y="20" width="260" height="28" rx="8" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="440" y="38" text-anchor="middle" font-size="10" fill="#6B7280" font-weight="700">fzf — sess &gt;</text>
      <text x="325" y="70" font-size="11" fill="#16A34A" font-weight="700">●</text>
      <text x="342" y="70" font-size="11" fill="#1F2937" font-family="monospace">kri</text>
      <text x="390" y="70" font-size="10" fill="#6B7280">3 windows</text>
      <rect x="320" y="80" width="240" height="22" rx="4" fill="#DBEAFE"></rect>
      <text x="325" y="95" font-size="11" fill="#16A34A" font-weight="700">●</text>
      <text x="342" y="95" font-size="11" fill="#1E40AF" font-family="monospace" font-weight="600">atlas</text>
      <text x="398" y="95" font-size="10" fill="#1E40AF">5 windows</text>
      <text x="325" y="118" font-size="11" fill="#9CA3AF" font-weight="700">○</text>
      <text x="342" y="118" font-size="11" fill="#1F2937" font-family="monospace">persona</text>
      <text x="415" y="118" font-size="10" fill="#6B7280">2 windows</text>
      <text x="325" y="140" font-size="11" fill="#9CA3AF" font-weight="700">○</text>
      <text x="342" y="140" font-size="11" fill="#1F2937" font-family="monospace">blog-drafts</text>
      <text x="432" y="140" font-size="10" fill="#6B7280">1 window</text>
      <rect x="580" y="20" width="200" height="160" rx="8" fill="#111827" stroke="#374151" stroke-width="1"></rect>
      <text x="595" y="40" font-size="9" fill="#6B7280">Preview (atlas)</text>
      <text x="595" y="60" font-size="9" fill="#6EE7B7" font-family="monospace">$ kubectl get pods</text>
      <text x="595" y="75" font-size="9" fill="#93C5FD" font-family="monospace">NAME  READY  STATUS</text>
      <text x="595" y="90" font-size="9" fill="#E5E7EB" font-family="monospace">atlas-1 Running</text>
      <line x1="570" y1="100" x2="580" y2="100" stroke="#16A34A" stroke-width="2"></line>
      <rect x="318" y="82" width="3" height="18" fill="#444ce7" rx="1">
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite"></animate>
      </rect>
    </svg>

## Key features

-   **Live preview** — hover a session to see its last 20 lines of output
-   **Attached/detached indicator** — ● for attached, ○ for detached
-   **Tab to create** — press TAB to create a new session inline
-   **Ctrl-r to refresh** — re-scans sessions without leaving fzf
-   **Works inside tmux** — uses `display-popup` as a floating window

## The script

```bash
#!/usr/bin/env bash
# sess — fzf-powered tmux session picker

sessions=()
while IFS= read -r line; do
  sessions+=("$line")
done < <(tmux list-sessions 2>/dev/null | sort)

# Build fzf input: ● attached / ○ detached
fzf_input=""
for s in "${sessions[@]}"; do
  name=$(echo "$s" | cut -d: -f1)
  windows=$(echo "$s" | grep -oP '\d+ windows?' | head -1)
  attached=$(tmux list-clients -t "$name" &>/dev/null && echo "●" || echo "○")
  fzf_input+="${attached}  ${name}  ${windows}"$'\n'
done

# Run fzf with preview
selected=$(echo "$fzf_input" | fzf \
  --prompt="sess > " \
  --header="● attached  ○ detached  [TAB] new session" \
  --expect=tab \
  --preview="tmux capture-pane -t {2} -p | head -20" \
  --preview-window=right:50%:hidden \
  --height=40% --reverse --border=rounded)
```

### tm — One-Word Session Creation

Type `tm` in any directory and it creates a session named after that directory. Type `tm kri` to create a named session. That's it.

## Usage patterns

```bash
# In ~/Documents/git/kri — auto-names to "kri"
$ tm
Creating session: kri

# Explicit name
$ tm atlas
Creating session: atlas

# Name + start dir
$ tm monitoring /etc/prometheus
Creating session: monitoring

# Kill a session
$ tm -k old-project
Killed session 'old-project'

# List sessions (plain text)
$ tm -l
kri: 3 windows (created Thu Jul 17 10:00:00 2026)
atlas: 5 windows (created Thu Jul 17 09:30:00 2026)
```

<aside class="callout"><strong class="callout__title">The magic:</strong><div class="callout__body"><code>tm</code> auto-detects your current directory and uses it as the session name. <code>cd ~/Documents/git/kri && tm</code> creates session "kri" — no typing required.</div></aside>

### tmux.conf — Sane Defaults

The config that makes everything work together. **Ctrl-a** as prefix (screen-style), visual splits, and session management bindings.

## Key bindings

| Binding | Action |
| --- | --- |
| Ctrl-a \| | Vertical split (current path) |
| Ctrl-a - | Horizontal split (current path) |
| Ctrl-a c | New window (current path) |
| Ctrl-a s | Open fzf session picker (popup) |
| Ctrl-a S | Create named session (prompt) |
| Ctrl-a K | Kill current session (confirm) |
| Ctrl-a r | Reload tmux.conf |
| Alt-arrow | Switch pane direction |
| Ctrl-a 1-5 | Quick switch to session N |

## Status bar

A minimal dark bar showing the session name, current time, and hostname. Window names are compact: `1:bash` format.

kri │ 1:bash  2:vim  3:lazygit           14:30 │ machine

### Daily Workflow

How a typical day looks with sess + tm.

## Morning startup

```bash
# SSH into your box — land in tmux automatically
$ ssh lab
$ tm                         # creates "lab" session
$ tm kri                    # creates "kri" session

# Switch between projects
$ sess                      # fzf picker → pick "kri"

# Inside tmux: Ctrl-a s opens the picker as a popup
# Type "av" → filters to "atlas" → Enter → switch
```

## Project work

```bash
# cd into any project, tm auto-names it
$ cd ~/Documents/git/persona
$ tm                         # session "persona" created

# Inside tmux: split, work, detach
Ctrl-a |                     # vertical split
Ctrl-a -                     # horizontal split
Ctrl-a d                     # detach

# Later: sess → pick "persona" → resume
```

## Cleanup

```bash
# Kill a specific session
$ tm -k old-experiment

# Kill all sessions (nuclear option)
$ tmux kill-server
```

### Key Bindings Cheat Sheet

## Shell

| sess | Fuzzy session picker |
| --- | --- |
| tm | Create/attach (auto-name) |
| tm name | Create/attach named |
| tm -k name | Kill session |
| tm -l | List sessions |
| tl | Alias for tmux ls |
| ta name | Alias for tmux attach |

## Inside tmux

| Ctrl-a s | Fzf picker (popup) |
| --- | --- |
| Ctrl-a S | Create session (prompt) |
| Ctrl-a K | Kill session |
| Ctrl-a \| | Vertical split |
| Ctrl-a - | Horizontal split |
| Alt-arrows | Switch pane |
| Ctrl-a r | Reload config |

### Architecture

How the pieces fit together.

Component overview — animated

<svg viewBox="0 0 800 300" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="300" fill="#F8FAFC"></rect>
      <rect x="20" y="20" width="360" height="260" rx="10" fill="none" stroke="#E5E7EB" stroke-width="1.5" stroke-dasharray="6,4"></rect>
      <text x="200" y="40" text-anchor="middle" font-size="10" fill="#9CA3AF" font-weight="600">SHELL LAYER</text>
      <rect x="40" y="55" width="140" height="70" rx="8" fill="#111827" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="110" y="80" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">sess</text>
      <text x="110" y="96" text-anchor="middle" font-size="9" fill="#818cf8">fzf session picker</text>
      <text x="110" y="112" text-anchor="middle" font-size="9" fill="#6B7280">~/.local/bin/sess</text>
      <rect x="200" y="55" width="140" height="70" rx="8" fill="#111827" stroke="#16A34A" stroke-width="1.5"></rect>
      <text x="270" y="80" text-anchor="middle" font-size="13" font-weight="700" fill="#fff">tm</text>
      <text x="270" y="96" text-anchor="middle" font-size="9" fill="#6EE7B7">quick create/attach</text>
      <text x="270" y="112" text-anchor="middle" font-size="9" fill="#6B7280">~/.local/bin/tm</text>
      <rect x="40" y="145" width="300" height="50" rx="8" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1"></rect>
      <text x="190" y="168" text-anchor="middle" font-size="10" fill="#4B5563" font-weight="600">sess.sh — shell aliases + prompt integration</text>
      <text x="190" y="183" text-anchor="middle" font-size="9" fill="#9CA3AF">source ~/.config/tmux/sess.sh</text>
      <line x1="110" y1="125" x2="110" y2="210" stroke="#444ce7" stroke-width="1.5" stroke-dasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="270" y1="125" x2="270" y2="210" stroke="#16A34A" stroke-width="1.5" stroke-dasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1s" repeatCount="indefinite"></animate>
      </line>
      <rect x="20" y="210" width="360" height="60" rx="8" fill="#1a1a3e" stroke="#444ce7" stroke-width="1.5"></rect>
      <text x="200" y="235" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">tmux server</text>
      <text x="200" y="252" text-anchor="middle" font-size="9" fill="#818cf8">~/.tmux.conf — prefix: Ctrl-a</text>
      <rect x="420" y="55" width="180" height="120" rx="8" fill="#fff" stroke="#D97706" stroke-width="1.5"></rect>
      <text x="510" y="80" text-anchor="middle" font-size="12" font-weight="700" fill="#92400E">fzf</text>
      <text x="510" y="96" text-anchor="middle" font-size="9" fill="#B45309">fuzzy finder</text>
      <text x="510" y="112" text-anchor="middle" font-size="9" fill="#92400E">sessions list</text>
      <text x="510" y="128" text-anchor="middle" font-size="9" fill="#92400E">preview pane</text>
      <text x="510" y="144" text-anchor="middle" font-size="9" fill="#92400E">tab to create</text>
      <text x="510" y="160" text-anchor="middle" font-size="9" fill="#9CA3AF">fzf 0.44+</text>
      <line x1="180" y1="90" x2="420" y2="90" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1s" repeatCount="indefinite"></animate>
      </line>
      <text x="300" y="82" text-anchor="middle" font-size="9" fill="#B45309">piped input</text>
      <line x1="510" y1="175" x2="510" y2="210" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1s" repeatCount="indefinite"></animate>
      </line>
      <line x1="510" y1="210" x2="380" y2="210" stroke="#D97706" stroke-width="1.5" stroke-dasharray="4,3">
        <animate attributeName="stroke-dashoffset" from="14" to="0" dur="1s" repeatCount="indefinite"></animate>
      </line>
      <text x="460" y="203" text-anchor="middle" font-size="9" fill="#B45309">switch-client</text>
      <rect x="640" y="55" width="140" height="120" rx="8" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="1.5"></rect>
      <text x="710" y="80" text-anchor="middle" font-size="11" font-weight="600" fill="#374151">tmux.conf</text>
      <text x="710" y="100" text-anchor="middle" font-size="9" fill="#6B7280">Ctrl-a prefix</text>
      <text x="710" y="115" text-anchor="middle" font-size="9" fill="#6B7280">| and - splits</text>
      <text x="710" y="130" text-anchor="middle" font-size="9" fill="#6B7280">vi copy mode</text>
      <text x="710" y="145" text-anchor="middle" font-size="9" fill="#6B7280">popup: Ctrl-a s</text>
      <text x="710" y="160" text-anchor="middle" font-size="9" fill="#6B7280">status bar</text>
    </svg>

### Install

30 seconds to set up. Copy the scripts, add one line to your shell rc.

## Quick install

```bash
# 1. Clone or copy the scripts
$ git clone https://github.com/you/sess.git ~/sess
$ cd ~/sess && bash install.sh

# 2. Add to ~/.bashrc or ~/.zshrc
$ echo 'source ~/.config/tmux/sess.sh' >> ~/.bashrc
$ source ~/.bashrc

# 3. Verify
$ which sess tm
~/.local/bin/sess
~/.local/bin/tm
```

## Prerequisites

| Tool | Required | Install |
| --- | --- | --- |
| tmux | Yes | apt install tmux |
| fzf | Yes | apt install fzf |
| xclip/pbcopy | Optional | For clipboard integration |

### Cheat Sheet

| Session Management |
| --- |
| tm | Create session from current dir |
| tm name | Create/attach named session |
| sess | Fuzzy pick from all sessions |
| tm -l | List sessions (plain text) |
| tm -k name | Kill session |
| Inside tmux (prefix: Ctrl-a) |
| Ctrl-a s | Fzf session picker (popup) |
| Ctrl-a S | Create session (prompt) |
| Ctrl-a \| | Vertical split |
| Ctrl-a - | Horizontal split |
| Ctrl-a c | New window |
| Ctrl-a d | Detach |
| Ctrl-a r | Reload config |
| Alt-arrows | Switch pane |
| Ctrl-a 1-5 | Quick switch session |
