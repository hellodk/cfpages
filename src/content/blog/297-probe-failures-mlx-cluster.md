---
title: "297 Probe Failures and One Curly Apostrophe: Wiring Two Macs Into an MLX Cluster"
date: 2026-08-16
description: "A PR that shipped 56,190 lines by accident, a security regression that rejected every real SSH key, a 2 GB venv one flag away from deletion, and a cluster that flapped 297 times because a bundled Python could not import its own package. Every number here came off the machines."
tags: [mlx, macos, apple-silicon, debugging]
cover: "assets/images/covers/297-probe-failures-mlx-cluster.png"
draft: false
---

## Every error message pointed somewhere the bug was not

Two Mac minis, a Thunderbolt cable, and a branch that was supposed to be ready to merge. What follows is the log of getting them to act like one machine. Every number below was read off the hardware or out of a tool, not recalled.

<div class="stat-cards">
<div class="stat-card stat-card--err"><span class="stat-card__n">52,477</span><span class="stat-card__l">Lines in one accidental file</span></div>
<div class="stat-card stat-card--err"><span class="stat-card__n">297</span><span class="stat-card__l">Probe failures, one cause</span></div>
<div class="stat-card stat-card--ok"><span class="stat-card__n">0.68 ms</span><span class="stat-card__l">Thunderbolt round trip</span></div>
<div class="stat-card stat-card--ok"><span class="stat-card__n">50 / 50</span><span class="stat-card__l">Tests, both nodes</span></div>
<div class="stat-card stat-card--warn"><span class="stat-card__n">2.0 GB</span><span class="stat-card__l">One flag from deletion</span></div>
<div class="stat-card stat-card--err"><span class="stat-card__n">U+2019</span><span class="stat-card__l">The final blocker</span></div>
</div>

### The 56,190-Line PR

A knowledge-graph cache rode into a feature branch and nobody noticed.

The branch added subnet discovery, a host inventory and SSH key provisioning. Reviewing the diff against `main` produced this:

```bash
67 files changed, 56190 insertions(+), 3 deletions(-)
 omlx/cluster/graphify-out/graph.json    | 52477 +++++++++++++++
 omlx/cluster/graphify-out/manifest.json |   296 +
 ... 53 more cache files ...
```

A tool had been pointed at `omlx/cluster/` rather than the repo root, so it wrote its extraction cache _inside the package_. The repo's `.gitignore` had no entry for it — verified with `git show HEAD:.gitignore`, zero matches — so a `git add -A` swept in **55 files, 3.6 MB** alongside the real work. The commit message mentioned none of it.

<aside class="callout callout--warn"><strong class="callout__title">The rule that would have caught it</strong><div class="callout__body"><p>
          Adding the ignore entry afterwards changes nothing — <code class="inl">.gitignore</code>
          does not untrack what is already tracked. It needs
          <code class="inl">git rm -r --cached</code>, or better, the files never enter a commit at all.
        </p></div></aside>

### Find & Replace Broke English

Scrubbing a word from a codebase is not a text operation.

An earlier cleanup had removed every mention of a certain configuration-management tool from the source. It worked, in the sense that the grep came back empty. It also produced this, in five places:

```bash
# omlx/cluster/inventory.py
"""cluster-style cluster host inventory backed by a private YAML file."""

# omlx/cli.py
help="Manage the cluster-style host inventory file"

# omlx/cli.py — the flag now documents itself as itself
help="Existing SSH private key used to authenticate (--private-key)"
```

A blind substitution of one noun for another leaves grammar behind. Worse, the removal was cosmetic where it mattered least and absent where it mattered most: the commit messages still carried the word, so the history a reviewer reads was untouched.

### A Dot Is Not An Injection Vector

A hardening patch that rejected every real SSH key.

The provisioning code interpolates a public key inside single quotes in a remote command, so it validates the key first. Reasonable. This was the validator:

```bash
_AUTHORIZED_KEY_RE = re.compile(
    r"^ssh-(ed25519|rsa) [A-Za-z0-9+/=]+(?: [^\n\r'\"\\;`$&|<>.!*?~\[\]{}]{0,4096})?$"
)
```

Note the `.` inside the excluded set. The comment field of an OpenSSH key is, by default, `user@hostname`. Hostnames contain dots. Tested against the validator:

```bash
False | ssh-ed25519 AAAA... operator@node-a.local
False | ssh-ed25519 AAAA... test@example.com
True  | ssh-ed25519 AAAA... omlx-cluster
```

Only the project's own hard-coded comment survived. Any key an operator actually generated was rejected with _"invalid SSH public key format"_. A dot cannot terminate a single-quoted shell string; the only characters that can are the quote itself, CR and LF. The fix was an explicit allowlist that excludes exactly those and permits the rest.

Two more in the same file:

```bash
# Not an escape sequence. SyntaxWarning today, SyntaxError later.
if any(c in public_key for c in "\"';\$&|<>`"):

# Copy-pasted message in the SSH path
raise ValueError("sweep port must be between 1 and 65535")
```

And an untyped CLI flag: `--ports` had no `type=int`, so a non-numeric value sailed past argparse and reached `int()` deep in the socket layer, producing a raw traceback instead of a usage error.

### Rewriting History Without Losing It

Four commits became two, and the 3.6 MB never existed.

Dropping the cache from the tip would have left an add-then-delete pair in the history. Since the branch was unmerged, the correct move was to rebuild it: collapse to the merge base, drop the cache from the index, commit the real work as one change plus one ignore rule.

Before anything destructive, the old tips went into a bundle outside the repo:

```bash
$ git bundle create ~/backups/pre-rewrite.bundle \
      backup/pre-rewrite origin/feat/branch ^main
$ git bundle list-heads ~/backups/pre-rewrite.bundle
2502e576... refs/heads/backup/pre-rewrite
f0bcb00e... refs/remotes/origin/feat/branch
291K
```

291 KB, holding both tips, verified with `git bundle verify`. The local backup branch was then deleted so no stray ref could ever be pushed. The result:

|  | Before | After |
| --- | --- | --- |
| Commits | 4 | 2 |
| Files in PR | 67 | 13 |
| Insertions | 56,190 | 1,633 |
| Cache files | 55 | 0 |

### GitHub Says 422

You cannot reopen a pull request whose head you rewrote.

The PR was closed. Force-pushing the clean branch and reopening should have been mechanical. It was not:

```bash
$ gh pr reopen 2672
API call failed: GraphQL: Could not open the pull request.

$ gh api -X PATCH repos/OWNER/REPO/pulls/2672 -f state=open
{"message":"Validation Failed","errors":[{
  "field":"state",
  "message":"state cannot be changed. The branch was force-pushed or recreated."
}]}
```

A closed PR can only be reopened while its head branch still points at the SHA the PR recorded. The force-push had moved it. The recovery used the bundle:

1.  Fetch the old head SHA back out of the bundle
2.  Rewind the remote branch to it, leased against the new SHA
3.  `gh pr reopen` — succeeds
4.  Force-push the rewritten history back, leased against the old SHA

The public branch sat at the old commit for roughly fifteen seconds. Both pushes used `--force-with-lease` pinned to an explicit SHA, so either would have aborted rather than clobbered an unexpected state.

<aside class="callout"><strong class="callout__title">Worth internalising</strong><div class="callout__body"><p>
          Take the bundle <em>before</em> the rewrite, not after. It was the only reason step 1 was
          possible.
        </p></div></aside>

### Six Plays, Two Macs

The control node cannot run the code it deploys.

Verification needed real hardware: an 8 GB M2 Mac mini and a 16 GB M4, cabled over Thunderbolt. The orchestrator is a Linux laptop that cannot import MLX at all, so it stays a pure driver — every assertion runs on a Mac, over SSH.

Deployment Topology

<svg viewBox="0 0 940 300" role="img" aria-label="Linux control node pushes over LAN to two Macs which are linked to each other by Thunderbolt">
            <defs>
              <marker id="ar" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <path d="M0,1 L8,4.5 L0,8 z" fill="#4B5563"></path>
              </marker>
              <path id="p_ctl_a" d="M300,86 L620,86"></path>
              <path id="p_ctl_b" d="M300,214 L620,214"></path>
              <path id="p_fab"   d="M772,124 L772,176"></path>
            </defs>
            <rect x="40" y="112" width="260" height="76" rx="8" fill="#1a1a3e" stroke="#2563EB" stroke-width="2"></rect>
            <text x="170" y="141" text-anchor="middle" font-size="14" font-weight="600" fill="#F9FAFB">Linux Control Node</text>
            <text x="170" y="163" text-anchor="middle" font-size="12" fill="#CBD5E1">Ansible &middot; No MLX</text>
            <circle cx="170" cy="150" r="46" fill="none" stroke="#2563EB" stroke-width="2" opacity="0">
              <animate attributeName="r" values="46;92" dur="3s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.5;0" dur="3s" repeatCount="indefinite"></animate>
            </circle>
            <line x1="300" y1="150" x2="330" y2="150" stroke="#4B5563" stroke-width="2"></line>
            <line x1="330" y1="86" x2="330" y2="214" stroke="#4B5563" stroke-width="2"></line>
            <line x1="330" y1="86"  x2="620" y2="86"  stroke="#4B5563" stroke-width="2" marker-end="url(#ar)"></line>
            <line x1="330" y1="214" x2="620" y2="214" stroke="#4B5563" stroke-width="2" marker-end="url(#ar)"></line>
            <text x="475" y="76" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">Rsync Over LAN</text>
            <text x="475" y="236" text-anchor="middle" font-size="12" font-weight="600" fill="#4B5563">Rsync Over LAN</text>
            <circle r="4" fill="#2563EB"><animateMotion dur="2.6s" repeatCount="indefinite"><mpath href="#p_ctl_a"></mpath></animateMotion></circle>
            <circle r="4" fill="#2563EB"><animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite"><mpath href="#p_ctl_b"></mpath></animateMotion></circle>
            <rect x="632" y="56" width="280" height="68" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="772" y="82" text-anchor="middle" font-size="13.5" font-weight="600" fill="#111827">Mac Mini M2 &middot; 8 GB</text>
            <text x="772" y="104" text-anchor="middle" font-size="12" fill="#4B5563">Budget 5.33 GiB</text>
            <rect x="632" y="176" width="280" height="68" rx="8" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"></rect>
            <text x="772" y="202" text-anchor="middle" font-size="13.5" font-weight="600" fill="#111827">Mac Mini M4 &middot; 16 GB</text>
            <text x="772" y="224" text-anchor="middle" font-size="12" fill="#4B5563">Coordinator &middot; Budget 12 GiB</text>
            <line x1="772" y1="124" x2="772" y2="176" stroke="#2563EB" stroke-width="3"></line>
            <circle r="4" fill="#2563EB"><animateMotion dur="1.1s" repeatCount="indefinite"><mpath href="#p_fab"></mpath></animateMotion></circle>
            <text x="792" y="154" font-size="12" font-weight="600" fill="#4B5563">Thunderbolt</text>
            <text x="792" y="170" font-size="12" fill="#4B5563">0.68 ms</text>
          </svg>

Six tagged plays: **prereq**, **preflight**, **deploy**, **test**, **fabric**, **verify**. The fabric assertions run Mac to Mac in both directions, never from the control node — which turned out to matter, because the control node reaches a completely different device at the Thunderbolt subnet's address via its default gateway.

<aside class="callout callout--err"><strong class="callout__title">Ping is not evidence</strong><div class="callout__body"><p>
          The load-bearing check is <code class="inl">route -n get &lt;peer&gt;</code> resolving to the
          Thunderbolt interface and <em>not</em> the LAN interface. A ping succeeds over Wi-Fi too. Had
          the fabric been down, a ping-only test would have passed while every measurement silently
          described the wrong link.
        </p></div></aside>

### The 2 GB Trap

One missing exclude, two machines, hours of rebuild.

Pushing the tree from the control node means `rsync --delete`. The virtualenv on each Mac lives _inside_ the repo path and holds a compiled MLX:

```bash
$ du -sh /Users/dk/Documents/git/omlx/.venv
2.0G
```

Without `--exclude=.venv`, a deploy silently deletes it on both nodes and every later step fails because the interpreter is gone. Ansible's `synchronize` module makes this easy to get wrong — it has **no `exclude:` parameter**. Confirmed against the module documentation, whose option list runs `archive, checksum, compress, copy_links, delay_updates, delete, dest, dirs, existing_only, …, rsync_opts` and contains no `exclude`. Excludes must go through `rsync_opts` as literal flags.

The dry run is the whole safety story:

```bash
$ rsync -az --delete --dry-run --itemize-changes \
      --exclude=.venv ... control:/repo/ mac:/repo/ | grep deleting
*deleting .git/objects/pack/pack-8376....pack
*deleting .ruff_cache/0.16.3/13669949980515150722
.venv mentions: 0
```

The play also asserts the interpreter still exists after the sync, so the failure mode is a red assertion rather than a silent two-gigabyte hole.

### The Test That Never Failed

Diagnosed as a broken test. It was a broken harness.

First full run: **49 passed, 1 failed**, identically on both machines.

```bash
FAILED tests/test_cluster_provisioning.py::test_ask_pass_path_never_persists_password
E   ProvisioningError: --ask-pass requires the sshpass binary
```

The obvious reading: the test mocks `subprocess.run` but not `shutil.which`, so it depends on a real binary and is not hermetic. Patch the test. That reading was wrong, and it would have modified a public PR to paper over a local misconfiguration.

Installing `sshpass` did not fix it. That is when the real cause showed up:

```bash
$ ssh mac 'echo $PATH'
/usr/bin:/bin:/usr/sbin:/sbin

$ ssh mac 'python -c "import shutil; print(shutil.which(\"sshpass\"))"'
None

$ ssh mac 'PATH=/opt/homebrew/bin:$PATH python -c "..."'
/opt/homebrew/bin/sshpass
```

Non-interactive SSH gets a minimal `PATH` with no Homebrew prefix. The binary was installed and invisible. The environment block had been set on one play and not the others. Adding it everywhere took the suite to **50/50 on both nodes**, and the PR needed no change at all.

<aside class="callout callout--ok"><strong class="callout__title">The general lesson</strong><div class="callout__body"><p>
          A failure that appears identically on every machine is evidence about the thing they share —
          here, the harness — not about the code under test. "Fix the test" was the expensive answer to
          a question nobody had verified.
        </p></div></aside>

### A Runtime That Was Already There

The dashboard reported a missing install. Both nodes had the same build.

The cluster page refused to proceed:

<aside class="callout callout--err"><strong class="callout__title">The device is online but its worker runtime is missing</strong><div class="callout__body"><p>
          SSH and hardware discovery succeeded, but this device cannot join an MLX collective until the
          matching worker build is installed.
        </p></div></aside>

Both machines had the same application version installed. Both answered `cluster status --json` correctly, reporting `distributed_backends: ["ring", "jaccl"]`. So the message was false — and reading the source explained why it is _always_ false in this situation. The function that produces it is documented as the path taken _before_ a runtime exists, and it hard-codes its own verdict:

```python
def probe_remote_system_host(...):
    """Inventory an SSH host before the worker runtime is installed."""
    ...
    "worker_runtime_ready": False,
    "runtime_mismatches": ["oMLX worker runtime is not installed"],
```

The real question was why the coordinator fell back to it. The chain:

Why The Probe Fell Back

<svg viewBox="0 0 940 250" role="img" aria-label="Probe chain from coordinator through bundled interpreter and interpreter discovery to a hardcoded fallback verdict">
            <defs>
              <marker id="ar2" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">
                <path d="M0,1 L8,4.5 L0,8 z" fill="#4B5563"></path>
              </marker>
              <path id="p1" d="M212,110 L262,110"></path>
              <path id="p2" d="M454,110 L504,110"></path>
              <path id="p3" d="M696,110 L746,110"></path>
            </defs>
            <rect x="24" y="76" width="188" height="68" rx="8" fill="#1a1a3e" stroke="#2563EB" stroke-width="2"></rect>
            <text x="118" y="102" text-anchor="middle" font-size="13" font-weight="600" fill="#F9FAFB">Coordinator</text>
            <text x="118" y="123" text-anchor="middle" font-size="12" fill="#CBD5E1">sys.executable</text>
            <line x1="212" y1="110" x2="262" y2="110" stroke="#4B5563" stroke-width="2" marker-end="url(#ar2)"></line>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="1.8s" repeatCount="indefinite"><mpath href="#p1"></mpath></animateMotion></circle>
            <rect x="266" y="76" width="188" height="68" rx="8" fill="#FFFFFF" stroke="#DC2626" stroke-width="2"></rect>
            <text x="360" y="102" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Bundled Python</text>
            <text x="360" y="123" text-anchor="middle" font-size="12" fill="#DC2626">No Module Named omlx</text>
            <circle cx="360" cy="110" r="40" fill="none" stroke="#DC2626" stroke-width="2" opacity="0">
              <animate attributeName="r" values="40;78" dur="2.4s" repeatCount="indefinite"></animate>
              <animate attributeName="opacity" values="0.45;0" dur="2.4s" repeatCount="indefinite"></animate>
            </circle>
            <line x1="454" y1="110" x2="504" y2="110" stroke="#4B5563" stroke-width="2" marker-end="url(#ar2)"></line>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="1.8s" begin="0.6s" repeatCount="indefinite"><mpath href="#p2"></mpath></animateMotion></circle>
            <rect x="508" y="76" width="188" height="68" rx="8" fill="#FFFFFF" stroke="#DC2626" stroke-width="2"></rect>
            <text x="602" y="102" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Interpreter Search</text>
            <text x="602" y="123" text-anchor="middle" font-size="12" fill="#DC2626">Nine Candidates, None Match</text>
            <line x1="696" y1="110" x2="746" y2="110" stroke="#4B5563" stroke-width="2" marker-end="url(#ar2)"></line>
            <circle r="3.5" fill="#2563EB"><animateMotion dur="1.8s" begin="1.2s" repeatCount="indefinite"><mpath href="#p3"></mpath></animateMotion></circle>
            <rect x="750" y="76" width="166" height="68" rx="8" fill="#FEF2F2" stroke="#DC2626" stroke-width="2"></rect>
            <text x="833" y="102" text-anchor="middle" font-size="13" font-weight="600" fill="#111827">Hardcoded</text>
            <text x="833" y="123" text-anchor="middle" font-size="12" fill="#DC2626">Runtime Missing</text>
            <text x="470" y="200" text-anchor="middle" font-size="12.5" fill="#4B5563">The Working Interpreter Was Never On The Candidate List</text>
          </svg>

The coordinator runs inside a packaged application, so its `sys.executable` is the app's bundled interpreter. It SSHes to the peer and runs _that same absolute path_ with `-m omlx.cli`. The path exists on the peer — both machines have the app — but the bundled interpreter cannot import the package without the launcher that assembles its module path. A comment in the source warns about exactly this hazard.

Discovery then walks nine candidate interpreters, each required to `import omlx`. It looks for `~/.omlx/bin/omlx-cluster-python`. The application ships `~/.omlx/bin/omlx` — a shell launcher, not an interpreter. The one interpreter on the machine that _can_ import the package was not on the list. Discovery raised, and the caller fell back to the function that always reports a missing runtime.

Creating the file the search was already looking for closed it:

```bash
#!/bin/sh
exec /Users/dk/Documents/git/omlx/.venv/bin/python "$@"
```

### 297 Times, Every Ten Seconds

"Needs Attention" was one probe, not an unstable cluster.

With the runtime recognised, the dashboard began cycling: ready, then _Needs Attention_, then ready. That reads like a flapping link and it is the kind of thing that erodes trust in a system fast. The server log said otherwise:

```bash
03:02:58 WARNING POST /admin/api/cluster/node-budgets → 503
         memory ceiling probe failed for Deepaks-Mac-mini.local: Traceback
           File "<string>", line 10, in <module>
         ModuleNotFoundError: No module named 'omlx'
03:03:09 WARNING POST /admin/api/cluster/node-budgets → 503   (same)
03:03:18 WARNING POST /admin/api/cluster/node-budgets → 503   (same)
         ... every ~10 seconds ...
```

The same unimportable module, on a different code path. The budgets endpoint calls a separate, deliberately minimal memory probe:

```bash
capacity_bytes = await asyncio.to_thread(
    probe_remote_admission_ceiling,
    host.ssh,
    python_executable=host.python_executable or sys.executable,
)
```

When the host record carries no discovered interpreter, it falls back to the coordinator's own — the bundled one that cannot import the package on a peer. The dashboard polls that endpoint every ten seconds. Every poll 503'd. Every 503 flipped the badge.

| Measurement | Value |
| --- | --- |
| Total ceiling-probe failures in the log | 297 |
| Last failure | 03:06:17 |
| Time of check | 03:15:47 |
| Failures in the 9.5 minutes after the shim | 0 |

297 failures, then silence. The cluster was never unstable. One probe path was failing on a ten-second timer and the UI faithfully rendered it as an oscillation.

<aside class="callout"><strong class="callout__title">A note on log-reading</strong><div class="callout__body"><p>
          The traceback in the log was truncated at <em>"Traceback (most recent call last):"</em>. The
          two lines that actually named the cause were on the following lines and would have been
          missed by any grep that stopped at the matching line.
        </p></div></aside>

### One Curly Apostrophe

The last blocker was a typographic substitution made during Setup Assistant.

With the probes healthy, activation failed on something else entirely:

```bash
03:13:04 WARNING POST /admin/api/cluster/autoconfigure → 400
         invalid node ID: 'Deepak’s Mac mini'
```

The validator:

```bash
_NODE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
```

ASCII alphanumerics, dot, underscore, hyphen. Now the machine name, byte by byte:

```bash
'Deepak’s Mac mini'
['0x44','0x65','0x65','0x70','0x61','0x6b','0x2019','0x73','0x20',
 '0x4d','0x61','0x63','0x20','0x6d','0x69','0x6e','0x69']
```

`0x2019` is **RIGHT SINGLE QUOTATION MARK** — the curly apostrophe macOS substitutes automatically when you type `'` into the name field during first-run setup. Plus two spaces. Three characters outside the allowed class, none of them typed deliberately.

The machine had three different names, and the dashboard happened to send the only one that fails:

| Name | Value | Passes Validator |
| --- | --- | --- |
| ComputerName | Deepak’s Mac mini | No |
| LocalHostName | Deepaks-Mac-mini | Yes |
| HostName | mm | Yes |

A useful side effect of chasing this: the log's references to `Deepaks-Mac-mini.local` looked like a third machine on the network. It was not. It was the same node under its `LocalHostName`, while `hostname` returned something else entirely.

### The Model Already Fits On One Node

The honest finding nobody wants after building the cluster.

Waiting behind the node-ID error, in the same log:

```bash
POST /admin/api/cluster/plan → 400
model weights and KV cache for 8192 tokens do not fit the supplied
per-node budgets (at least 935175065 additional bytes required)
```

935 MB short. The 4B model at 8-bit is 4.8 GB on disk against the small node's 5.33 GiB budget; add a KV cache for 8192 tokens and it does not fit. At 4-bit it is 2.9 GB and it does.

But the more useful number came out of the project's own source:

```bash
# Tensor parallelism issues two all-reduces per layer per token, so it is
# bound by round-trip latency as much as throughput: on this fabric the
# same Thunderbolt cable gave 28.6 tok/s under RDMA and 6.6 tok/s under
# the TCP ring — 4.3x from the transport alone, at identical bandwidth.
FAST_LINK_FLOOR_BYTES_PER_SECOND = 1.0 * GB
```

And the node status:

```bash
RDMA:        enabled
Thunderbolt: peer connected (3 ports detected)
Warnings:
  - RDMA is enabled, but ibv_devices reported no RDMA interfaces.
```

RDMA is configured but no RDMA interface exists, which selects the non-RDMA backend. So the model fits comfortably on the 16 GB node alone, and splitting it adds two all-reduces per layer per token across the slower of the two transports. Distributing this particular model across these two machines will be **slower than not distributing it**.

<aside class="callout callout--warn"><strong class="callout__title">Build it anyway, but know what it is</strong><div class="callout__body"><p>
          The cluster is worth having as a proven path — the wiring, the provisioning, the fabric, the
          activation flow. It is not worth having for <em>this</em> model. A model that does not fit on
          the larger node alone is the one that makes the second machine earn its place.
        </p></div></aside>

### What Actually Held Up

The through-line across nine unrelated-looking failures.

Every error message named the wrong thing

"Worker runtime missing" — it was installed. "Requires sshpass" — it was installed. "Needs Attention" — nothing was wrong with the cluster. Three messages, three correct emissions of a wrong conclusion, because each described the symptom at the point of detection rather than the cause.

The plausible fix was the expensive one

The failing test looked non-hermetic and a two-line patch would have "fixed" it — into a public PR, hiding a local misconfiguration. Verifying that the failing code path was untouched by the branch cost one command and prevented a bad change.

Identical failures across machines accuse the shared thing

Two Macs, one test failing the same way on both. That is a statement about the harness they share, not about either machine.

Non-interactive SSH is a different computer

`PATH=/usr/bin:/bin:/usr/sbin:/sbin`. No Homebrew, no user profile. Tools that work when you log in are invisible to automation, and `which` will confidently tell you they are not installed.

Take the backup before the destructive step

A 291 KB bundle made an unrecoverable-looking GitHub 422 into a four-step recovery. It cost nothing and it was needed within the hour.

Dry run, then grep the dry run

`--dry-run --itemize-changes` piped through a grep for the one directory that must never be deleted. Running it took seconds; not running it costs two 2 GB rebuilds.

Generated artefacts belong in .gitignore before they exist

Not after. 52,477 lines entered a feature branch because an ignore rule was written one commit too late.

Nine failures, and not one of them was in the feature being tested. That is the ordinary shape of standing up real hardware: the code was mostly fine, and everything around it — environment, naming, packaging, discovery — was where the time went.
