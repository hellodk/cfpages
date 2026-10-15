---
title: "Supervising mlx_lm.server With LaunchAgents (and Catching the Wedge)"
date: 2026-10-06
description: "Keeping mlx_lm.server alive on a headless FileVault Mac mini: LaunchAgent configs, HTTP watchdog that catches the wedge PID monitors miss, cron, caffeinate."
tags: [mlx, macos, launchd, supervision]
draft: false
---

The mm1 server "stopped" while its process was still alive — dead generation thread, live port. PID supervision can't see that failure. This is the full stack that can, and its one remaining prerequisite.

## 1\. The failure that decided the design

PID 10358 up since Friday, port 8080 answering `/v1/models` with 200 — and every generation broken. Log tail:

```bash
RuntimeError: generation thread died
```

Plus repeated `POST /v1/chat/completions → 404` from the client box. The process never exited, so no PID watcher (launchd `KeepAlive`, nohup, supervisord) would ever restart it. **Rule: liveness for LLM servers means a real generation probe, not a port check, not a PID check.** (`/v1/models` alone also passes on a wedged server — it doesn't touch the generation thread.)

## 2\. What runs now (all installed 2026-10-06, verified)

| Layer | Mechanism | Catches | State |
| --- | --- | --- | --- |
| Boot (post-login) | LaunchAgent `com.dk.mlx-gemma-server`, RunAtLoad + KeepAlive | reboot, crash/OOM-kill | installed + lint-OK, needs one GUI-context `bootstrap` |
| Wedge | `~/mlx-gemma/watchdog.sh` via cron every 2 min: `/v1/models` **plus** a 4-token generation, expects `"choices"`; else `kill -9` + relaunch | dead generation thread, hung load, dead port | installed, cron active, dry-run exit 0 on healthy server |
| Sleep | LaunchAgent `com.dk.caffeinate-server` (`caffeinate -dims`), no privilege needed | idle sleep pausing inference | installed + lint-OK, same one-time activation |
| Fleet | LiteLLM fallbacks + cooldowns across nodes | any single dark/wedged node | design agreed; gateway pending |

## 3\. LaunchAgent configurations (verbatim)

`~/Library/LaunchAgents/com.dk.mlx-gemma-server.plist`:

```bash
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.dk.mlx-gemma-server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/Users/dk/mlx-gemma/bin/mlx_lm.server</string>
    <string>--model</string><string>mlx-community/gemma-4-e2b-it-4bit</string>
    <string>--host</string><string>0.0.0.0</string>
    <string>--port</string><string>8080</string>
    <string>--max-tokens</string><string>512</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/Users/dk/mlx-gemma/server.log</string>
  <key>StandardErrorPath</key><string>/Users/dk/mlx-gemma/server.err.log</string>
</dict></plist>
```

`~/Library/LaunchAgents/com.dk.caffeinate-server.plist`: same shape, `ProgramArguments` = `/usr/bin/caffeinate -dims`, logs to `/tmp/caffeinate*.log`.

Watchdog cron: `*/2 * * * * /Users/dk/mlx-gemma/watchdog.sh` (lockfile-guarded, logs only on restart to `/tmp/mlx-watchdog.log`). Activate both agents once from a Terminal on the Mac — SSH has no GUI domain (`bootstrap` fails 125) and no sudo exists for a daemon:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dk.mlx-gemma-server.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.dk.caffeinate-server.plist
```

## 4\. The hard boundary: FileVault (verified On)

`fdesetup status` → **FileVault is On**. Consequence, stated exactly: a LaunchDaemon would _load_ at boot but its job would crash-loop on the still-locked `/Users` — same as every other mechanism. Nothing user-level starts before first authentication; that is the encryption working, not a tooling gap. Coverage is therefore: LaunchAgent + watchdog for everything _after_ first login (keys stay unwrapped until next reboot), gateway fallbacks for the gap, UPS + deferred updates + caffeinate to make cold reboots rare, and one admin ticket (auto-login account, bootstrap token, or FV exemption) to close it permanently.

## 5\. Recovery proof (2026-10-06)

Wedged PID killed, fresh server under supervision, generation probe returned `finish_reason: stop, content "ok"`. Watchdog dry-run: exit 0, no action. Endpoint live at `http://192.0.2.64:8080/v1`.

Observed on mm1 2026-10-06. Plists quoted verbatim; lint-checked with plutil.
