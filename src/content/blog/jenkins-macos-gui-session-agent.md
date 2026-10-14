---
title: "Jenkins on macOS: The GUI Session Agent — Complete Visual Guide"
date: 2026-09-09
description: "A complete, reproducible guide to running a Jenkins inbound agent inside the macOS GUI (Aqua) session: auto-login, keychain auto-unlock, launchd LaunchAgent plist, the codesign consent-prompt pitfalls — and a real macOS Tahoe case where codesign worked from Xcode but failed from Jenkins because the "
tags: [jenkins, macos, ci, devops]
cover: "assets/images/covers/jenkins-macos-gui-session-agent.svg"
draft: false
---

01 Why GUI Context Matters 02 Auto-Login & Keychain 03 LaunchAgent Plist 04 Setup Script + Jenkins 05 Pitfalls & Checklist 06 The Domain Trap

### Why the GUI session matters

A Jenkins agent launched via ssh or launchctl into a non-interactive session is a different animal from one running inside the logged-in Aqua session. For pure-shell jobs it makes no difference. The moment you sign with a keychain, drive a Simulator, run XCUITests, or route audio/video — it decides everything.

### GUI session vs. background session

Two ways the agent process can be born — and what each can reach

<svg viewBox="0 0 820 240" xmlns="http://www.w3.org/2000/svg" font-family="system-ui">
      <defs>
        <marker id="ar1" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#4F6BFF"></path></marker>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EEF0FF"></stop><stop offset="100%" stop-color="#E6E4FF"></stop></linearGradient>
      </defs>
      <rect x="20" y="40" width="210" height="150" rx="14" fill="url(#g1)" stroke="#4F6BFF" stroke-width="2"></rect>
      <text x="125" y="70" fill="#1E293B" font-size="14" font-weight="700" text-anchor="middle">GUI Session Agent</text>
      <text x="125" y="90" fill="#64748B" font-size="11" text-anchor="middle">launchd in gui/&lt;uid&gt; domain</text>
      <text x="125" y="110" fill="#334155" font-size="12" text-anchor="middle">Access: WindowServer</text>
      <text x="125" y="128" fill="#334155" font-size="12" text-anchor="middle">Access: login keychain</text>
      <text x="125" y="146" fill="#334155" font-size="12" text-anchor="middle">Access: Simulator / Xcode</text>
      <text x="125" y="170" fill="#0284C7" font-size="11.5" font-weight="600" text-anchor="middle">codesign consent dialog WORKS</text>
      <rect x="320" y="40" width="210" height="150" rx="14" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.16)" stroke-width="1.5"></rect>
      <text x="425" y="70" fill="#1E293B" font-size="14" font-weight="700" text-anchor="middle">Background Agent</text>
      <text x="425" y="90" fill="#64748B" font-size="11" text-anchor="middle">ssh / system launchd domain</text>
      <text x="425" y="110" fill="#334155" font-size="12" text-anchor="middle">No WindowServer session</text>
      <text x="425" y="128" fill="#334155" font-size="12" text-anchor="middle">No GUI keychain bootstrap</text>
      <text x="425" y="146" fill="#7C3AED" font-size="12" text-anchor="middle">Simulator: not usable</text>
      <text x="425" y="170" fill="#DC2626" font-size="11.5" font-weight="600" text-anchor="middle">codesign consent dialog FAILS</text>
      <line x1="230" y1="115" x2="320" y2="115" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar1)"></line>
      <text x="275" y="102" fill="#64748B" font-size="10.5" text-anchor="middle">same agent.jar</text>
      <rect x="620" y="40" width="180" height="150" rx="14" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.16)" stroke-width="1.5"></rect>
      <text x="710" y="70" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">securityd decision</text>
      <text x="710" y="98" fill="#0F766E" font-size="11.5" text-anchor="middle">key not in partition list?</text>
      <text x="710" y="116" fill="#0F766E" font-size="11.5" text-anchor="middle">-&gt; can it render the prompt?</text>
      <text x="710" y="140" fill="#B45309" font-size="11.5" text-anchor="middle">NO -&gt; errSecInternalComponent</text>
      <text x="710" y="158" fill="#DC2626" font-size="11.5" text-anchor="middle">YES -&gt; indefinite HANG</text>
      <text x="710" y="180" fill="#64748B" font-size="10.5" text-anchor="middle">(nobody to click Allow)</text>
      <line x1="530" y1="115" x2="620" y2="115" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar1)"></line>
    </svg>

### The consent-prompt flow (why this bites codesign)

When a private key in a keychain is used by a process that is **not** in the key's partition list, Security.framework must ask the user. Where it asks depends entirely on the **session** the process lives in:

#### codesign wants to use the key

Key is found and opened; ACL allows request to proceed.

#### is codesign in the key's partition list?

If security set-key-partition-list ... codesign: was applied — approval is silent, rc=0, no prompt.

#### No partition entry -> can securityd render a prompt?

Process has an Aqua session → dialog is registered and **waits forever**. No Aqua session → framework takes the fast-fail path: errSecInternalComponent (rc=1, ~0.3s).

<aside class="callout"><strong class="callout__title">Real-world data point.</strong><div class="callout__body"><span class="a-icon">i</span><div> Our ios-m4 no-partition experiment produced <b>one instant error and three hangs from byte-identical keychain state</b> — the deciding variable was whether the Mac's GUI session was reachable at that moment. See Tab 5.</div></div></aside>

### Jobs that flat-out need the GUI session

🔑

### iOS / macOS codesign

Keychain key access + Xcode requires a GUI login; non-partitioned keys otherwise error or hang.

📱

### Simulator

CoreSimulator spawns UIKit apps in the GUI session; headless launches either fail or render nothing.

🧪

### XCUITest

Automation needs a WindowServer-target — the test runner must reach the login session.

🎬

### Video / audio capture

Element capture, AVFoundation output, screen recording require WindowServer + screen recording permission.

🗝️

### Keychain-backed secrets

Any binary that gets a password from the login keychain for the first time triggers a consent prompt.

🧯

### System prompt handling

macOS dialogs (updates, Camera/WiFi keys, Gatekeeper) only auto-dismiss in an interactive session.

<aside class="callout"><strong class="callout__title">"But my agent runs as the logged-in user."</strong><div class="callout__body"><span class="a-icon">!</span><div> Same uid is not the same session. A LaunchDaemon with <span class="inline-code">UserName</span> set runs your builds as you, with your <span class="inline-code">$HOME</span>, your keychains, your identity — and still outside the Aqua session. codesign works from Xcode and fails from Jenkins, and every obvious comparison comes back identical. <a href="#s60" onclick="switchTab(5)" style="color:var(--accent);font-weight:600">Tab 06 walks through that exact case →</a></div></div></aside>

### Auto-login & keychain

A GUI-session agent is useless if the session doesn't exist after a reboot. Three things must survive power cycles: the logged-in user, the unlocked keychain, and a machine that never sleeps.

### 1\. Enable auto-login

#### System Settings → Users & Groups

Enable Automatically log in as for the dedicated build user (e.g. dk). macOS requires the user to be in the **Administrators** group.

#### Confirm fileVault/secure-boot status

Auto-login is skipped if FileVault is on (unless capable "secure token" user). For a build Mac this is usually fine — the box is on a locked LAN.

#### Reboot test

No account is more reliable than one you re-test. After \`sudo reboot\`, confirm the console lands on the desktop, not the login window.

Boot → GUI session → agent lifecycle

<svg viewBox="0 0 820 120" xmlns="http://www.w3.org/2000/svg" font-family="system-ui">
      <defs>
        <marker id="ar2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#4F6BFF"></path></marker>
        <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EEF0FF"></stop><stop offset="100%" stop-color="#E6E4FF"></stop></linearGradient>
      </defs>
      <rect x="15" y="20" width="130" height="80" rx="12" fill="url(#g2)" stroke="#4F6BFF" stroke-width="2"></rect>
      <text x="80" y="52" fill="#1E293B" font-size="12" font-weight="700" text-anchor="middle">Power on</text>
      <text x="80" y="70" fill="#64748B" font-size="10.5" text-anchor="middle">auto-login user</text>
      <text x="205" y="60" fill="#64748B" font-size="22">→</text>
      <rect x="230" y="20" width="150" height="80" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.16)" stroke-width="1.5"></rect>
      <text x="305" y="52" fill="#1E293B" font-size="12" font-weight="700" text-anchor="middle">Aqua session boots</text>
      <text x="305" y="70" fill="#64748B" font-size="10.5" text-anchor="middle">loginwindow + WindowServer</text>
      <text x="400" y="60" fill="#64748B" font-size="22">→</text>
      <rect x="445" y="20" width="150" height="80" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.16)" stroke-width="1.5"></rect>
      <text x="520" y="52" fill="#1E293B" font-size="12" font-weight="700" text-anchor="middle">launchd gui/uid</text>
      <text x="520" y="70" fill="#64748B" font-size="10.5" text-anchor="middle">loads LaunchAgents</text>
      <text x="615" y="60" fill="#64748B" font-size="22">→</text>
      <rect x="660" y="20" width="145" height="80" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.16)" stroke-width="1.5"></rect>
      <text x="732" y="52" fill="#1E293B" font-size="12" font-weight="700" text-anchor="middle">agent.jar connects</text>
      <text x="732" y="70" fill="#059669" font-size="10.5" font-weight="600" text-anchor="middle">RunAtLoad + KeepAlive</text>
    </svg>

### 2\. Keychain auto-unlock

A freshly booted login keychain is **locked**. Any agent job touching a key will hang on "unlock login keychain" unless it is pre-unlocked. Two mechanisms:

🔓

#### Unlock on login (launchd uses the session unlocked state)

Because the agent runs inside the GUI session, the login keychain is unlocked as part of sign-in. Keep the **screen-saver password** disabled, or the session becomes idle-locked and the agent loses access.

🗂️

#### Ephemeral keychains for CI (the cleaner pattern)

Create a per-build keychain, import the p12, apply the partition list, delete on exit:

keychain-per-build.shcopy

```bash
# each build gets its own keychain -> zero state leakage
KC="codesign-exp-${BUILD_NUMBER}"
security create-keychain -p "$KC_PASS" "$KC"
security unlock-keychain    -p "$KC_PASS" "$KC"
security import "$P12_FILE" -k "$KC" -P "$P12_PASS" \
          -T /usr/bin/codesign -f pkcs12
# put it in the USER SEARCH LIST - --keychain alone is not enough
security list-keychains -d user -s "$KC" ~/Library/Keychains/login.keychain-db
# no GUI prompt for codesign from here on:
security set-key-partition-list -S "apple-tool:,apple:,codesign:" \
          -s -k "$KC_PASS" "$KC"
# ... sign ...
security list-keychains -d user -s ~/Library/Keychains/login.keychain-db
security delete-keychain "$KC"
```

<aside class="callout"><strong class="callout__title">Single most common CI failure.</strong><div class="callout__body"><span class="a-icon">!</span><div> Importing a p12 then signing <i>without</i> <span class="inline-code">set-key-partition-list</span> is what triggers the consent flow. With a GUI session → <b>hang</b>. Without one → <b>errSecInternalComponent</b>. Apply the partition list in headless CI, every time.</div></div></aside>

### 3\. Sleep / screen / update hardening

### ⚡ Prevent sleep

sudo pmset -a sleep 0 and sudo pmset -a displaysleep 0. A sleeping Mac drops the WindowServer session, breaking the GUI context mid-build.

### 🖥️ Disable screen lock

System Settings → Lock Screen → "Require password" = Never. An idle-locked session freezes keychain access.

### 📴 Block auto-updates

Turn off "Install macOS updates" and "Install application updates from the App Store" — a midnight reboot kills the next morning's build.

### 🔌 Disable deep sleep

sudo pmset -a sleep 0 plus setting System Settings → Battery → "Prevent automatic sleeping on power adapter".

### The LaunchAgent plist

The agent must be a **user LaunchAgent** (bootstrap domain gui/<uid>), not a Linux-style systemd user. This is the piece that puts the process inside the Aqua session.

### Anatomy — what each key does

| Key | Value in our agent | Why |
| --- | --- | --- |
| Label | com.jenkins.ios-m4 | Unique reverse-DNS id; launchctl uses it (no .plist suffix). |
| ProgramArguments | java -jar agent.jar -url <jenkins> -secret <agent-secret> -name ios-m4 -webSocket -workDir <dir> | JNLP inbound agent startup line, exactly as Jenkins shows on the node page. |
| RunAtLoad | true | Start immediately at login. |
| KeepAlive | true | Auto-restart if the agent JVM dies. Non-negotiable for a build box. |
| WorkingDirectory | ~/jenkins-agent-b | Where remoting/jar lives; launchd's default cwd is `/` otherwise. |
| StandardOutPath / StandardErrorPath | ~/jenkins-agent-b/agent.log | Catch the agent's own stderr so a silent connect-failure is debuggable. |
| EnvironmentVariables | PATH, LANG, HOME, RBENV_ROOT | launchd gives a minimal env; real builds need the full PATH of the user shell. |

### The complete plist

~/Library/LaunchAgents/com.jenkins.ios-m4.plistcopy

```bash
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.jenkins.ios-m4</string>

  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/opt/openjdk@21/bin/java</string>
    <string>-jar</string>
    <string>/Users/dk/jenkins-agent-b/agent.jar</string>
    <string>-url</string>
    <string>http://192.0.2.10:30880/</string>
    <string>-secret</string>
    <string>REPLACE_WITH_AGENT_SECRET</string>
    <string>-name</string>
    <string>ios-m4</string>
    <string>-webSocket</string>
    <string>-workDir</string>
    <string>/Users/dk/jenkins-agent-b</string>
  </array>

  <key>WorkingDirectory</key>
  <string>/Users/dk/jenkins-agent-b</string>

  <key>RunAtLoad</key>
  <true/>

  <key>KeepAlive</key>
  <true/>

  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/opt/homebrew/opt/openjdk@21/bin:/Users/dk/.rbenv/shims:/Users/dk/.rbenv/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>LANG</key>
    <string>en_US.UTF-8</string>
    <key>HOME</key>
    <string>/Users/dk</string>
    <key>RBENV_ROOT</key>
    <string>/Users/dk/.rbenv</string>
  </dict>

  <key>StandardOutPath</key>
  <string>/Users/dk/jenkins-agent-b/agent.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/dk/jenkins-agent-b/agent.log</string>
</dict>
</plist>
```

### Load & verify (no sudo needed)

terminalcopy

```bash
# validate the plist syntax first
plutil -lint ~/Library/LaunchAgents/com.jenkins.ios-m4.plist

# load into the user GUI domain (macOS 13+: bootstrap; fall back to load)
launchctl bootstrap "gui/$(id -u)" \
  ~/Library/LaunchAgents/com.jenkins.ios-m4.plist || \
launchctl load -w ~/Library/LaunchAgents/com.jenkins.ios-m4.plist

# confirm it is running under the GUI domain - the 'gui/' is the magic bit
launchctl print "gui/$(id -u)" | grep -A3 jenkins

# watchdog the connect
tail -f ~/jenkins-agent-b/agent.log
# expect the "Connected" line from the remoting jar
```

<aside class="callout"><strong class="callout__title">secret</strong><div class="callout__body"><span class="a-icon">✓</span><div>The  must never be hardcoded in a repo copy of the plist — the setup script injects it from an env var at install time (see Tab 4).</div></div></aside>

### Setup script + Jenkins side

A single idempotent installer does the whole job — down below is the exact flow used for ios-m4 (from the pulse repo, jenkins-k8s/ios/agent/setup-ios-m4-agent.sh).

### The installer flow

#### Preconditions

Java 21 at a known path (/opt/homebrew/opt/openjdk@21/bin/java), python3, and AGENT\_SECRET from the Jenkins node page.

#### Work dir + agent.jar

Create ~/jenkins-agent-b/remoting, download agent.jar from <jenkins>/jnlpJars/agent.jar, validate size ≥ 1 MB (a truncated jar makes \`java -jar\` fail cryptically).

#### Write the plist via plistlib

Python generates the LaunchAgent from env vars — keeps the secret out of the repo and interpolates paths consistently.

#### Validate + bootstrap

plutil -lint then launchctl bootstrap "gui/$(id -u)" (user domain — no sudo, fully permitted on a login session).

#### Verify connection

Poll agent.log for "Connected" for up to 30s; fail loudly if not.

### Jenkins node config

Controller <-> Agent

<svg viewBox="0 0 820 150" xmlns="http://www.w3.org/2000/svg" font-family="system-ui">
      <defs>
        <marker id="ar3a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#4F6BFF"></path></marker>
        <marker id="ar3b" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,8 L8,4 L0,0 Z" fill="#4F6BFF"></path></marker>
        <linearGradient id="g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EEF0FF"></stop><stop offset="100%" stop-color="#E6E4FF"></stop></linearGradient>
      </defs>
      <rect x="20" y="25" width="170" height="100" rx="12" fill="url(#g3)" stroke="#4F6BFF" stroke-width="2"></rect>
      <text x="105" y="55" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">Jenkins Controller</text>
      <text x="105" y="75" fill="#64748B" font-size="11" text-anchor="middle">Mode: Java Web Start</text>
      <text x="105" y="93" fill="#64748B" font-size="11" text-anchor="middle">secret: auto-generated</text>
      <text x="105" y="111" fill="#64748B" font-size="11" text-anchor="middle">node page shows -secret</text>
      <rect x="330" y="25" width="170" height="100" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.16)" stroke-width="1.5"></rect>
      <text x="415" y="55" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">ios-m4 (agent)</text>
      <text x="415" y="75" fill="#64748B" font-size="11" text-anchor="middle">Labels: ios-m4 mac m4 ios</text>
      <text x="415" y="93" fill="#64748B" font-size="11" text-anchor="middle">Remote FS: ~/jenkins-agent-b</text>
      <text x="415" y="111" fill="#64748B" font-size="11" text-anchor="middle">Launch method: Inbound</text>
      <line x1="190" y1="75" x2="330" y2="75" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar3a)"></line>
      <line x1="330" y1="55" x2="190" y2="55" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar3b)"></line>
      <text x="260" y="62" fill="#64748B" font-size="10.5" text-anchor="middle">TLS/WS (webSocket)</text>
      <text x="260" y="98" fill="#64748B" font-size="10.5" text-anchor="middle">JNLP agent.jar</text>
      <text x="670" y="70" fill="#64748B" font-size="11.5">agent connects OUT</text>
      <text x="670" y="90" fill="#64748B" font-size="11.5">-&gt; no inbound ports needed</text>
      <text x="670" y="110" fill="#059669" font-size="11.5" font-weight="600">-webSocket keeps NAT simple</text>
    </svg>

### Getting the secret safely

🔐

#### No hardcoded secrets

The node page at /computer/ios-m4/slave-agent.jnlp exposes the one-time secret. In our flow it is passed as AGENT\_SECRET=<secret> ./setup-ios-m4-agent.sh, injected into the plist at write time, and never committed.

1

agent.jar download

~30s

connect window

gui/uid

bootstrap domain

### Pitfalls & checklist

The whole guide distilled into the parts that actually break production CI.

### The codesign saga (real builds, ios-m4)

| Build | Kind | Partition list | GUI session at that moment | Result |
| --- | --- | --- | --- | --- |
| codesign-ls-nopartition #1 | pipeline | skipped | not reachable | errSecInternalComponent rc=1, ~0.3s |
| codesign-ls-nopartition #2 | pipeline | skipped | reachable | HANG 15-min timeout → ABORTED |
| codesign-freestyle-ls-nopartition #1 | freestyle | skipped | reachable | HANG watchdog kill rc=137 |
| codesign-freestyle-ls-partition #1 | freestyle | **applied** | — | SUCCESS 13.3s, sig size 3699 |

<aside class="callout"><strong class="callout__title">Interpretation trap.</strong><div class="callout__body"><span class="a-icon">!</span><div> A missing <span class="inline-code">errSecInternalComponent</span> in your logs does <b>not</b> mean signing worked — it may simply mean the Mac had a GUI session, so codesign <i>hung</i> instead of failing. Any pre-fix no-partition run not returning rc=1 within a second is a hang, never a pass.</div></div></aside>

### Headless CI decision table

| Variant | UI session seen | End state | Rule |
| --- | --- | --- | --- |
| partition list applied | — | instant SUCCESS (no prompt) | use this for headings |
| partition list skipped | none | instant error, rc=1 | keeps the diagnostic |
| partition list skipped | GUI reachable | indefinite hang | MUST wrap codesign in a watchdog (SIGTERM won't stop it — use kill -9) |

### Final checklist — a GUI session agent done right

#### Auto-login for the build user

Console lands on the desktop after every reboot; FileVault considered consciously.

#### Screen lock & sleep disabled

pmset sleep 0, screensaver password off, auto-updates off.

#### User LaunchAgent, not systemd/service

A launchd plist bootstrapped into gui/$(id -u) with KeepAlive=true + RunAtLoad=true.

#### Prove the domain from inside a job

Add launchctl managername as the first line of any signing job. It must print Aqua. System means a LaunchDaemon is running your builds — see Tab 06.

#### Full PATH in EnvironmentVariables

launchd env is minimal — inject the full user shell PATH or every build fails at \`command not found\`.

#### Keychain partition list applied before any sign

security set-key-partition-list -S apple-tool:,apple:,codesign: right after p12 import — no prompt, no hang.

#### Per-build ephemeral keychains

create → unlock → import → sign → restore search list → delete. Zero cross-build state.

#### External watchdog on any key-touching command

Jenkins' polite SIGTERM won't stop a blocked codesign; wrap in a shell watchdog that uses kill -9.

#### Re-test after every reboot

Run one real signing job after a power cycle — auto-login and keychain unlock are the two things most likely to quietly regress.

<aside class="callout"><strong class="callout__title">Summary.</strong><div class="callout__body"><span class="a-icon">✓</span><div> A GUI-session agent is what makes signing, Simulator, and XCUITest jobs deterministic. The one extra thing nobody documents is that a reachable-but-unattended GUI session turns a clean <span class="inline-code">errSecInternalComponent</span> into an indefinite hang — so always pair the partition list (the real fix) with a kill -9 watchdog (the insurance), and treat <i>any</i> absence of a fast error as a hang, not a pass.</div></div></aside>

### The domain trap: same user, wrong session

A real Apple Distribution identity signed cleanly from Terminal, Xcode and xcodebuild on a Mac mini running macOS Tahoe — and failed every single time from Jenkins. Same uid. Same $HOME. Same p12. Partition list applied. Every comparison anyone suggested came back identical. This is the evidence, the red herrings that cost a day, and the one command that ended it.

### The symptom — everything matches, except the result

Diagnostics printed by the signing script immediately before codesign, in both contexts:

| Check | Terminal.app | Jenkins job (agent "mobileapp") |
| --- | --- | --- |
| whoami / id | hellodk · uid=502(hellodk) gid=20(staff) | hellodk · uid=502(hellodk) gid=20(staff) |
| $HOME | /Users/hellodk | /Users/hellodk |
| list-keychains -d user | codesign-…-PARTITION-db login.keychain-db | codesign-…-PARTITION-db login.keychain-db |
| find-identity -v -p codesigning | 1 valid identity · 77E0EB9D…DCF8 | 1 valid identity · 77E0EB9D…DCF8 |
| set-key-partition-list | applied, rc=0 | applied, rc=0 |
| codesign --force --sign … --keychain … | rc=0 Signature size=4784 | rc=1 errSecInternalComponent |
| codesign stderr | not captured (mistake — see below) | Warning: unable to build chain to self-signed root for signer "Apple Distribution: …" ./ls-binary-test: errSecInternalComponent |
| Jenkins build result | — | Finished: SUCCESS — the script printed *VERDICT: SIGNING FAILED* but never exit 1 |

<aside class="callout"><strong class="callout__title">Two separate bugs in one log.</strong><div class="callout__body"><span class="a-icon">!</span><div> The signing failure is the interesting one, but <span class="inline-code">Finished: SUCCESS</span> under a <i>SIGNING FAILED</i> verdict is the dangerous one — a downstream job would happily ship an unsigned binary. Diagnostic scripts must <span class="inline-code">exit "$RC_SIGN"</span>, not just print a verdict.</div></div></aside>

### Red herrings — what we ruled out, and how

### dead "login.keychain-db appears twice"

An earlier analysis read the Jenkins keychain block as a duplicated search list. It wasn't: the block ran security default-keychain _then_ list-keychains. Line 1 was the default-keychain output. Search lists were identical. Lesson: one command per output block, or you'll compare noise.

### dead "Bad p12 / missing private key"

find-identity -v — the **\-v** does trust evaluation — reported **1 valid identity** in both contexts. The identity was fine; the keychain was fine.

### dead "Running as SYSTEM"

That line in the Jenkins console is Jenkins' _authorization_ principal for the build. It says nothing about the Unix user or the launchd domain. Ignore it for this class of problem.

### not verified "Same script, both places"

The two runs printed different diagnostic sections — they were two revisions of the script. And the Terminal run never captured codesign's stderr, so nobody knew whether the chain warning appeared there too. If it isn't byte-identical, it isn't a comparison.

### useful The self-signed dummy control

Earlier (Tab 05) a self-signed dummy identity + partition list signed fine on the ios-m4 agent. A self-signed cert needs no intermediate; an Apple Distribution cert must chain through WWDR. That left two candidates: **certificate chain** or **process session**.

### useful Xcode and xcodebuild both sign OK

Anything launched from the GUI login session works. Only Jenkins fails. The agent process, not the certificate, is the variable — so the next question is _where does that process actually live?_

### launchd domains — why "same uid" proves nothing

launchd runs several **domains**. Which one a process is born into decides its audit/security session: whether securityd can talk to it about keychain consent, whether WindowServer exists for it, which trustd it evaluates certificates with. The Unix uid is orthogonal — a LaunchDaemon with UserName hellodk runs as uid 502 _inside the system domain_.

| Domain target | Populated from | launchctl managername | Aqua session |
| --- | --- | --- | --- |
| system | /Library/LaunchDaemons, /System/Library/LaunchDaemons — loaded at boot as root; UserName only changes the uid | System | no |
| user/<uid> | Per-user background domain — exists without a GUI login | Background | no |
| login/<asid> | Every login session — an SSH session gets its own | not Aqua (we did not observe the exact string) | no for SSH |
| gui/<uid> | ~/Library/LaunchAgents, /Library/LaunchAgents — created at GUI login, gone at the login window | Aqua | yes |

Same Uid, Two Domains — Where Each codesign Process Is Born

<svg viewBox="0 0 820 340" xmlns="http://www.w3.org/2000/svg" font-family="system-ui">
      <defs>
        <marker id="ar6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#4F6BFF"></path></marker>
        <linearGradient id="g6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#EEF0FF"></stop><stop offset="100%" stop-color="#E6E4FF"></stop></linearGradient>
        <path id="p6-sys" d="M410,68 V100 H130 V124"></path>
        <path id="p6-gui" d="M410,68 V100 H690 V124"></path>
        <path id="p6-sys2" d="M130,198 V226"></path>
        <path id="p6-gui2" d="M690,198 V226"></path>
      </defs>
      <rect x="335" y="24" width="150" height="44" rx="12" fill="rgba(255,255,255,.7)" stroke="#4F6BFF" stroke-width="2"></rect>
      <text x="410" y="51" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">launchd (PID 1)</text>
      <line x1="410" y1="68" x2="410" y2="100" stroke="#4F6BFF" stroke-width="2"></line>
      <line x1="130" y1="100" x2="690" y2="100" stroke="#4F6BFF" stroke-width="2"></line>
      <line x1="130" y1="100" x2="130" y2="124" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar6)"></line>
      <line x1="410" y1="100" x2="410" y2="124" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar6)"></line>
      <line x1="690" y1="100" x2="690" y2="124" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar6)"></line>
      <rect x="40" y="124" width="180" height="74" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.18)" stroke-width="1.5"></rect>
      <text x="130" y="146" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">system</text>
      <text x="130" y="164" fill="#4B5563" font-size="11.5" text-anchor="middle">/Library/LaunchDaemons</text>
      <text x="130" y="182" fill="#B45309" font-size="12" font-weight="600" text-anchor="middle">managername = System</text>
      <rect x="320" y="124" width="180" height="74" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.18)" stroke-width="1.5"></rect>
      <text x="410" y="146" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">user/502</text>
      <text x="410" y="164" fill="#4B5563" font-size="11.5" text-anchor="middle">Background, No GUI</text>
      <text x="410" y="182" fill="#4B5563" font-size="12" font-weight="600" text-anchor="middle">managername = Background</text>
      <rect x="600" y="124" width="180" height="74" rx="12" fill="url(#g6)" stroke="#4F6BFF" stroke-width="2"></rect>
      <text x="690" y="146" fill="#1E293B" font-size="13" font-weight="700" text-anchor="middle">gui/502</text>
      <text x="690" y="164" fill="#4B5563" font-size="11.5" text-anchor="middle">~/Library/LaunchAgents</text>
      <text x="690" y="182" fill="#0284C7" font-size="12" font-weight="600" text-anchor="middle">managername = Aqua</text>
      <circle cx="690" cy="124" r="4" fill="none" stroke="#4F6BFF" stroke-width="2">
        <animate attributeName="r" values="4;22" dur="2.4s" repeatCount="indefinite"></animate>
        <animate attributeName="opacity" values=".7;0" dur="2.4s" repeatCount="indefinite"></animate>
      </circle>
      <line x1="130" y1="198" x2="130" y2="226" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar6)"></line>
      <rect x="40" y="226" width="180" height="90" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.18)" stroke-width="1.5"></rect>
      <text x="130" y="248" fill="#1E293B" font-size="12" font-weight="700" text-anchor="middle">jenkins-slave (PID 346)</text>
      <text x="130" y="266" fill="#4B5563" font-size="11.5" text-anchor="middle">java (PID 44467) → bash</text>
      <text x="130" y="284" fill="#4B5563" font-size="11.5" text-anchor="middle">codesign as uid 502</text>
      <text x="130" y="302" fill="#DC2626" font-size="12" font-weight="600" text-anchor="middle">rc=1 errSecInternalComponent</text>
      <text x="410" y="252" fill="#4B5563" font-size="11.5" text-anchor="middle">Nothing Of Ours Loads Here</text>
      <line x1="690" y1="198" x2="690" y2="226" stroke="#4F6BFF" stroke-width="2" marker-end="url(#ar6)"></line>
      <rect x="600" y="226" width="180" height="90" rx="12" fill="rgba(255,255,255,.6)" stroke="rgba(30,41,59,.18)" stroke-width="1.5"></rect>
      <text x="690" y="248" fill="#1E293B" font-size="12" font-weight="700" text-anchor="middle">loginwindow → Terminal.app</text>
      <text x="690" y="266" fill="#4B5563" font-size="11.5" text-anchor="middle">login (PID 43531) → zsh</text>
      <text x="690" y="284" fill="#4B5563" font-size="11.5" text-anchor="middle">codesign as uid 502</text>
      <text x="690" y="302" fill="#059669" font-size="12" font-weight="600" text-anchor="middle">rc=0 Signed</text>
      <circle r="4" fill="#4F6BFF"><animateMotion dur="2.2s" repeatCount="indefinite"><mpath href="#p6-sys"></mpath></animateMotion></circle>
      <circle r="4" fill="#4F6BFF"><animateMotion dur="2.2s" begin="1.1s" repeatCount="indefinite"><mpath href="#p6-gui"></mpath></animateMotion></circle>
      <circle r="4" fill="#4F6BFF"><animateMotion dur="1.2s" begin=".6s" repeatCount="indefinite"><mpath href="#p6-sys2"></mpath></animateMotion></circle>
      <circle r="4" fill="#4F6BFF"><animateMotion dur="1.2s" begin="1.7s" repeatCount="indefinite"><mpath href="#p6-gui2"></mpath></animateMotion></circle>
    </svg>

<aside class="callout"><strong class="callout__title">Read the PID.</strong><div class="callout__body"><span class="a-icon">i</span><div> The wrapper <span class="inline-code">jenkins-slave</span> was PID <b>346</b>. On a Mac that number is boot-time — long before any GUI login. A <span class="inline-code">gui/&lt;uid&gt;</span> agent cannot have a PID that low unless auto-login is instantaneous. The PID alone was a strong hint the process was a daemon.</div></div></aside>

### Why launchctl load lies to you

The legacy load/unload verbs take no domain argument. They load the job into **whatever domain the shell you typed them in belongs to**. The file's location under ~/Library/LaunchAgents is a convention for _auto_\-loading at login — it does not bind a manual load to the GUI domain.

| Where you ran launchctl load | Domain the job lands in | Session |
| --- | --- | --- |
| Terminal.app / Screen Sharing on the console | gui/<uid> | Aqua |
| An SSH session | login/<asid> of that SSH session | not Aqua — login keychain locked, no prompt path |
| sudo launchctl load of anything | system | not Aqua — even with UserName set |
| Auto-loaded from ~/Library/LaunchAgents at GUI login | gui/<uid> | Aqua |
| Plist in /Library/LaunchDaemons (this case) | system | not Aqua |

<aside class="callout"><strong class="callout__title">History is useless here.</strong><div class="callout__body"><span class="a-icon">!</span><div> If the agent has been unloaded/reloaded from different places over months, the <i>current</i> instance is whichever load came last. Only the live process can tell you where it is.</div></div></aside>

explicit domain — the only unambiguous formcopy

```bash
# name the domain; correct no matter which shell you type it in
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.jenkins.mobileapp.plist
launchctl bootout   "gui/$(id -u)" ~/Library/LaunchAgents/com.jenkins.mobileapp.plist

# stop using these for build agents
# launchctl load   ~/Library/LaunchAgents/com.jenkins.mobileapp.plist
# launchctl unload ~/Library/LaunchAgents/com.jenkins.mobileapp.plist
```

### The one command: launchctl managername

It prints the name of the launchd manager for **the caller's own domain**. Run it from inside the job and the process tells you, in one word, where it lives. Actual outputs, verbatim:

Terminal.app on the consolecopy

```bash
$ launchctl managername
Aqua
$ ps -o pid,ppid,comm -p $$ $PPID
  PID  PPID COMM
43531   794 login
43532 43531 -zsh
```

Jenkins "Execute shell" on mobileappcopy

```bash
+ launchctl managername
System
+ ps -o pid,ppid,comm -p $$ $PPID
  PID  PPID COMM
44467   346 /usr/bin/java
44487 44467 /bin/bash
```

That is the whole diagnosis. Same uid 502, same home, same keychains, same identity — and one process is in System while the other is in Aqua. Confirm which plist owns it, one label per command (no piped grep across two domains — that ambiguity cost a round-trip):

terminalcopy

```bash
launchctl print "gui/$(id -u)/jenkins-slave" 2>&1 | head -15   # errors → not an agent
launchctl print system/jenkins-slave         2>&1 | head -15   # prints path = /Library/LaunchDaemons/… → daemon
ls -l ~/Library/LaunchAgents /Library/LaunchAgents /Library/LaunchDaemons | grep -i jenkins
```

<aside class="callout"><strong class="callout__title">Confirmed: LaunchDaemon.</strong><div class="callout__body"><span class="a-icon">✓</span><div> The <span class="inline-code">jenkins-slave</span> wrapper lived in <span class="inline-code">/Library/LaunchDaemons</span>, ran as <span class="inline-code">hellodk</span> via <span class="inline-code">UserName</span>, and spawned the agent JVM at boot. Every build shell inherited the system domain. Xcode and Terminal, born from <span class="inline-code">loginwindow</span>, never did.</div></div></aside>

### The fix — retire the daemon, bootstrap a user agent

Do this at the console (Terminal.app or Screen Sharing). **Not over SSH** — step 4 would land in the SSH session's domain and you'd be back where you started. The sudo lines are yours to run; the daemon plist is root-owned.

#### Capture the daemon's command line before touching it

launchctl print system/jenkins-slave | grep -iE 'path|program|arguments' -A8 — you need the exact java -jar agent.jar -url … -secret … -name mobileapp -webSocket -workDir … line, and the path of the plist.

#### Stop and retire the daemon

sudo launchctl bootout system /Library/LaunchDaemons/<file>.plist then sudo mv /Library/LaunchDaemons/<file>.plist ~/jenkins-daemon-plist.bak. Moving it out is not optional — left in place it comes back on the next boot and silently wins.

#### Write the user LaunchAgent

~/Library/LaunchAgents/com.jenkins.mobileapp.plist — same ProgramArguments as step 1; **delete** any UserName key; EnvironmentVariables with HOME=/Users/hellodk and the full PATH; RunAtLoad + KeepAlive true. Tab 03 has the template — substitute the user and paths.

#### Bootstrap into the GUI domain, explicitly

plutil -lint …plist → launchctl bootstrap "gui/$(id -u)" …plist → launchctl print "gui/$(id -u)/com.jenkins.mobileapp" | head -5.

#### Auto-login for the build user

System Settings → Users & Groups → Automatic Login → hellodk. Without it gui/502 does not exist after a reboot and the agent is simply down until someone logs in. This is the trade-off you accept for a working keychain session.

#### Re-run the failing job _unchanged_

Verification order matters: first launchctl managername in the job log must print Aqua — if not, step 4 ran from the wrong place and codesign output is meaningless. Then, and only then, look at codesign rc.

<aside class="callout"><strong class="callout__title">One variable at a time.</strong><div class="callout__body"><span class="a-icon">!</span><div> Do not add the WWDR intermediate import or <span class="inline-code">set-keychain-settings</span> to the script in the same run. If it passes with three changes you have no idea which one fixed it — and you'll carry two cargo-cult lines forever.</div></div></aside>

### Still open — labelled honestly

The domain difference is **verified**. The mechanism by which it produces this particular pair of messages for an Apple-issued cert, when the self-signed dummy passed in the same daemon context, is **inferred**, not proven. Two candidates, each to be tested on its own after the session fix lands:

### inferred WWDR chain in the system session

unable to build chain to self-signed root means trust evaluation could not reach the WWDR intermediate. Hypothesis: it lives in the login keychain, which is unlocked in Aqua and locked in a fresh system-domain security session. Test: import the intermediate into the ephemeral keychain and compare. Evidence to collect first: security verify-cert -c leaf.pem -p codeSign in both contexts, and where find-certificate -c "Apple Worldwide Developer Relations" finds it.

### inferred Keychain lock-on-sleep = 300 s

The job printed lock-on-sleep timeout=300s for the ephemeral keychain — the create-keychain default. A 20-second ls sign never hits it; a real xcodebuild archive will, and fails with the same errSecInternalComponent mid-build. Fix: security set-keychain-settings "$KC" (no flags = never lock) right after create-keychain. Not observed failing yet; test as its own run.

evidence block — paste before codesign, run in both contextscopy

```bash
echo "=== LAUNCH CONTEXT ==="
launchctl managername
ps -o pid,ppid,comm -p $$ $PPID

echo "=== LEAF ISSUER ==="
security find-certificate -c "Apple Distribution" -p "$KC" > leaf.pem
openssl x509 -in leaf.pem -noout -subject -issuer -enddate

echo "=== WHERE IS WWDR ==="
for k in "$KC" "$HOME/Library/Keychains/login.keychain-db" /Library/Keychains/System.keychain; do
  echo "-- $k"
  security find-certificate -a -c "Apple Worldwide Developer Relations" -Z "$k" 2>&1 | grep -E 'SHA-1|"labl"'
done

echo "=== TRUST EVAL IN THIS SESSION ==="
security verify-cert -c leaf.pem -p codeSign
security verify-cert -c leaf.pem -p codeSign -L    # no network fetch

# and ALWAYS cat codesign's stderr, on success too:
codesign --force --sign "$IDENT" --keychain "$KC" --timestamp=none "$TARGET" > codesign-output.txt 2>&1
RC=$?; cat codesign-output.txt; exit $RC
```

<aside class="callout"><strong class="callout__title">Takeaway.</strong><div class="callout__body"><span class="a-icon">✓</span><div> When "works locally, fails in CI" survives a uid, <span class="inline-code">$HOME</span>, keychain-list and identity comparison, stop comparing environment variables and ask the process which launchd domain it was born in. <span class="inline-code">launchctl managername</span> is a one-word answer, and <span class="inline-code">launchctl bootstrap gui/&lt;uid&gt;</span> is the one-line fix. Everything else in this tab was the cost of not running that first.</div></div></aside>
