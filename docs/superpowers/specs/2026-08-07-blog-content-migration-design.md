# Blog content migration — design

**Date:** 2026-08-07
**Status:** approved, pending implementation plan

Migrate the content of `~/Documents/blogs` into `src/content/blog`, mask sensitive
infrastructure detail, and update the repo README.

---

## 1. Problem

`~/Documents/blogs` holds 51 items: self-contained HTML posts (Concept Guide and
Narrative Post formats, each with 5–13 inline animated SVG diagrams), loose markdown
notes, and a handful of build artifacts. Nine of them have already been migrated into
`src/content/blog` by `scripts/migrate-blogs-2026.mjs`.

All nine migrations are degraded:

| Post | SVG | Code fences | Junk markers |
|---|---:|---:|---:|
| browser-rdp-zero-ports | 0 | 46 | 0 |
| gnome-thumbnails-broke | 0 | 6 | 0 |
| kri-knowledge-graph-graphify | 0 | 0 | 1 |
| macos-vms-tart-salt | 0 | 0 | 5 |
| graphify-token-enforcement | 0 | 6 | 1 |
| kri-fleet-management | 0 | 0 | 1 |
| kube-dns-split-dns-ubuntu24 | 0 | 8 | 0 |
| kubernetes-monitoring | 0 | 36 | 0 |
| pnpm-smarter-package-manager | 0 | 0 | 0 |

Not one preserved a diagram; four lost their code blocks entirely.

**Root cause.** `scripts/migrate-blogs-2026.mjs:82` does a blind tag strip:

```js
content = content.replace(/<[^>]+>/g, '');
```

That one line explains every symptom. SVG elements are removed but their `<text>`
labels survive as loose prose. `<pre>` blocks are never recognised, so code flattens
into paragraphs. Page chrome (header bar, tab nav, on-this-page TOC) is never removed,
so it lands in the body as text.

The script has three further defects: a hardcoded 8-post list, an `EXISTS (skip)` guard
that makes re-runs no-ops, and **no masking of any kind**.

## 2. Goals

1. Convert 42 source items into `src/content/blog` markdown, preserving diagrams, code
   blocks, and tables.
2. Mask sensitive infrastructure detail deterministically and verifiably.
3. Make the migration re-runnable, so `~/Documents/blogs` stays the single source of truth.
4. Update the README to reflect the generated-content model.

### Non-goals

- Migrating this repo from npm to pnpm. **This repo is an explicit exception to the
  global pnpm rule** — the Cloudflare Pages/Workers Builds pipeline is configured
  against npm (`npm ci`, `npm run build`, `npm run cf:deploy`). Changing it would
  change the live deploy path.
- Redesigning the post layout or the site's visual language.
- Publishing the bucket-C notes to production in this change (they ship `draft: true`).

## 3. Scope

**42 posts: 9 rebuilt, 33 new.**

| Group | Count | Date source | Draft |
|---|---:|---|---|
| Rebuilt (source exists, post exists) | 9 | existing frontmatter, preserved | `false` |
| A — dated 2026 posts | 15 | directory name | `false` |
| B — undated topical guides | 11 | source file mtime | `false` (1 exception) |
| C — internal notes | 7 | filename date, else mtime | `true` |

Live: **34**. Draft: **8**.

> The draft count is 8, not the 7 quoted during design review: `custom-vs-code-plugin`
> is a 108-byte stub and is drafted alongside bucket C.

### Excluded (9)

| Item | Reason |
|---|---|
| `nfs-meltdown (Copy)/` | duplicate of `nfs-meltdown/` |
| `linux_hacks.md` | 222-byte stub, not a post |
| `nginx_tutorials.md` | 81-byte stub, not a post |
| `docs/` | superpowers internals, not content |
| `redesign-mockup.html` | build artifact |
| `animation-preview.html` | build artifact |
| `traffic-animations.html` | build artifact |
| `token-consumption-24h.html` | build artifact |
| `token-consumption.svg` | build artifact |

### Manifest

Rebuilt — dates preserved from existing frontmatter so published URLs and ordering
do not shift:

| Source | Slug | Date |
|---|---|---|
| `2026-04-25-browser-rdp-zero-ports/` | `browser-rdp-zero-ports` | 2026-04-25 |
| `2026-05-23-gnome-thumbnails-broke/` | `gnome-thumbnails-broke` | 2026-05-23 |
| `2026-05-27-kri-knowledge-graph-graphify/` | `kri-knowledge-graph-graphify` | 2026-05-27 |
| `2026-05-27-macos-vms-tart-salt/` | `macos-vms-tart-salt` | 2026-05-27 |
| `2026-05-28-graphify-token-enforcement/` | `graphify-token-enforcement` | 2026-05-28 |
| `kri-fleet-management/` | `kri-fleet-management` | 2026-05-15 |
| `kube_dns_split_dns_ubuntu24/` | `kube-dns-split-dns-ubuntu24` | 2026-05-01 |
| `monitoring-blog/` | `kubernetes-monitoring` | 2026-05-01 |
| `pnpm-the-smarter-package-manager/` | `pnpm-smarter-package-manager` | 2026-04-01 |

Bucket A — date from directory name:

| Source | Slug | Date |
|---|---|---|
| `2026-05-28-graphify-obsidian-vault/` | `graphify-obsidian-vault` | 2026-05-28 |
| `2026-05-30-salt-concepts.html` | `salt-concepts` | 2026-05-30 |
| `2026-05-31-rag-for-kri-fleet-assistant.html` | `rag-for-kri-fleet-assistant` | 2026-05-31 |
| `2026-06-08-agentic-mcp-gateways/` | `agentic-mcp-gateways` | 2026-06-08 |
| `2026-06-09-kri-agentic-fleet-assistant/` | `kri-agentic-fleet-assistant` | 2026-06-09 |
| `2026-06-09-rag-embeddings-vector-db/` | `rag-embeddings-vector-db` | 2026-06-09 |
| `2026-06-21-kri-salt-deployment/` | `kri-salt-deployment` | 2026-06-21 |
| `2026-06-28-typhoon-wifi-cpu-powersave/` | `typhoon-wifi-cpu-powersave` | 2026-06-28 |
| `2026-07-17-tmux-session-manager/` | `tmux-session-manager` | 2026-07-17 |
| `2026-07-17-zellij-session-manager/` | `zellij-session-manager` | 2026-07-17 |
| `2026-08-02-ai-git-branching-strategy/` | `ai-git-branching-strategy` | 2026-08-02 |
| `2026-08-02-two-mac-minis-mlx-debugging/` | `two-mac-minis-mlx-debugging` | 2026-08-02 |
| `2026-08-04-drift-detector-observability/` | `drift-detector-observability` | 2026-08-04 |
| `2026-08-06-perils-of-timezone/` | `perils-of-timezone` | 2026-08-06 |
| `2026-08-07-homelab-sso-consolidation/` | `homelab-sso-consolidation` | 2026-08-07 |

Bucket B — date from source mtime:

| Source | Slug | Date | Draft |
|---|---|---|---|
| `save-tokens-and-better-prompts/` | `save-tokens-and-better-prompts` | 2026-03-04 | false |
| `custom-vs-code-plugin/` | `custom-vs-code-plugin` | 2026-04-08 | **true** (108-byte stub) |
| `nfs-meltdown/` | `nfs-meltdown` | 2026-05-10 | false |
| `e2e-testing-token-efficiency/` | `e2e-testing-token-efficiency` | 2026-05-21 | false |
| `kri-ops-guide/` | `kri-ops-guide` | 2026-05-21 | false |
| `engineering-reliability-testing-strategy/` | `engineering-reliability-testing-strategy` | 2026-05-23 | false |
| `kri-testing-strategy/` | `kri-testing-strategy` | 2026-05-23 | false |
| `git-concepts/` | `git-concepts` | 2026-05-27 | false |
| `ios-android-build-guide.html` | `ios-android-build-guide` | 2026-06-01 | false |
| `auth-concepts.html` | `auth-concepts` | 2026-06-06 | false |
| `local-llm-inference-architecture.html` | `local-llm-inference-architecture` | 2026-07-17 | false |

Bucket C — all `draft: true`:

| Source | Slug | Date |
|---|---|---|
| `using_operators.md` | `using-operators` | 2021-12-07 |
| `incident-investigation-2026-02-22.md` | `incident-investigation-2026-02-22` | 2026-02-22 |
| `linkedin-post-network-spike.md` | `linkedin-post-network-spike` | 2026-03-01 |
| `grafana-screenshot-guide.md` | `grafana-screenshot-guide` | 2026-03-01 |
| `avika_deep_analysis.md.resolved` | `atlas-deep-analysis` | 2026-03-03 |
| `blog-network-spike-investigation.md` | `network-spike-investigation` | 2026-04-08 |
| `kube-system-priority-classes.md` | `kube-system-priority-classes` | 2026-05-11 |

`incident-investigation-2026-02-22.md` takes its date from the filename (2026-02-22)
in preference to its mtime (2026-03-01).

**Slugs are masked too.** `avika_deep_analysis` becomes `atlas-deep-analysis` — the
masking table applies to the output filename and URL, not only to the body text.

## 4. Architecture

```
scripts/
├── lib/
│   ├── mask.mjs          pure: maskText(string) -> string
│   ├── html-to-md.mjs    pure: convert(html) -> { frontmatter, body }
│   └── manifest.mjs      static data: 42 entries, no logic
├── migrate-blogs.mjs     orchestrator, all filesystem I/O
└── check-secrets.mjs     extended with the masking gate
```

`scripts/migrate-blogs-2026.mjs` is deleted; `migrate-blogs.mjs` replaces it.

Each `lib/` module is pure and independently testable. `mask.mjs` takes a string and
returns a string. `html-to-md.mjs` takes HTML and returns frontmatter fields plus a
markdown body. Neither touches the filesystem, so both can be tested without fixtures
on disk. The orchestrator owns all reads and writes.

`manifest.mjs` is data, not code: the 42 rows above, each `{ src, slug, date, tags,
draft }`. Tags and any missing descriptions are filled once, offline, then reviewed and
committed as static values. Nothing non-deterministic survives into the build.

### Data flow

```
~/Documents/blogs/<item>
        │
        ▼
  manifest.mjs  ──►  migrate-blogs.mjs
                            │
                            ▼
                     html-to-md.mjs
                     ├─ extract <svg> to placeholders
                     ├─ strip chrome
                     ├─ turndown -> markdown
                     └─ re-inject <svg> verbatim
                            │
                            ▼
                        mask.mjs
                            │
                            ▼
              src/content/blog/<slug>.md
                            │
                            ▼
                    check-secrets.mjs  (gate)
```

Masking runs **after** conversion, over the finished markdown, so a value that survives
in an SVG label or a code block is still caught.

## 5. Masking

Deterministic **exact-match lookup table**. No model judgment anywhere in this path.

The corpus is finite and has been fully scanned: 34 distinct private/CGNAT addresses,
of which 4 are preserved and 30 are rewritten. An explicit table is used rather than
octet-pattern rules, because patterns collide.

> **Why not patterns.** A rule set of `192.168.1.<n> → 192.0.2.<n>` plus
> `10.0.<a>.<b> → 192.0.2.<b>` can map two different final octets from two different
> source blocks onto the same target (e.g. two distinct addresses both landing on
> `192.0.2.5`). Two distinct hosts collapsing to one address silently corrupts any
> prose that distinguishes them. The explicit table is collision-free by construction
> and verifiable by inspection.

Each source block maps to its own RFC 5737 documentation block, so cross-block
collisions are structurally impossible:

| Source block | Documentation block | Count |
|---|---|---:|
| `192.168.x.x` | `192.0.2.0/24` (TEST-NET-1) | 13 |
| `100.x.x.x` (Tailscale CGNAT) | `198.51.100.0/24` (TEST-NET-2) | 7 |
| `10.x.x.x` | `203.0.113.0/24` (TEST-NET-3) | 5 |

### Rewritten — IP table (25 from the blogs corpus)

> **The real table is not in this document.** `hellodk/cfpages` is public, and the exact
> `real → masked` mapping is what would let anyone reverse the masking on all 42 posts.
> The table lives only in the gitignored `scripts/lib/mask.local.mjs` — see §5
> "Surviving-address gate" below for how its integrity is verified without ever
> committing the values. Shapes only:

| Source shape | Target shape |
|---|---|
| `192.168.1.x` | `192.0.2.x` |
| `192.168.100.x` / `192.168.64.x` | `192.0.2.2xx` (offset to avoid the `192.168.1.x` octets above) |
| `100.x.x.x` (Tailscale CGNAT) | `198.51.100.x` |
| `10.0.x.x` / `10.103.x.x` | `203.0.113.x` |

Five further addresses live only in three legacy Jekyll posts that predate this
migration and are not regenerated from `~/Documents/blogs`. They are masked in
place, once, so the gate can cover the whole content directory without an
exception list — same shapes, same gitignored table:

| Source shape | Target shape | In |
|---|---|---|
| `192.168.10.x` | `192.0.2.x` | `kubernetes-cluster-vagrant`, `how-to-pass-datastax-cassandra-administrator-certification` |
| `172.31.x.x` | `198.51.100.x` | same |
| `10.60.x.x` | `203.0.113.x` | `getting-familiar-with-cassandra` |

Final octets are preserved wherever they are unique within the target block; the four
`192.168.64.x` / `192.168.100.x` addresses are offset into the `.2xx` range to avoid
clashing with the `192.168.1.x` octets already in use. Every target is distinct.

### Rewritten — hostnames and identity

| Source shape | Target shape |
|---|---|
| `<host>.internal` | `<host>.example.internal` |
| `<host>.home` | `<host>.example.internal` |
| `<host>.local` | `<host>.example.internal` |
| personal email | removed |
| `avika` | `atlas` (word-boundary, case-preserving) |

(Exact hostnames — `vault`, `nexus`, `logs`, etc. — are in the gitignored table, not here.)

### Moving the table out does not rewrite history

`scripts/lib/mask.local.mjs` is gitignored going forward, but the real `real → masked`
pairs remain readable in earlier commits on this branch, and the pre-branch unmasked
posts remain in `origin/main` at `5e22ec3`. This change stops new commits from adding
to the exposure; it does not remove what is already there. Squashing on merge limits
future exposure only — it is not a substitute for a history rewrite, which is out of
scope here.

### Surviving-address gate

`findUnmasked` runs on **already-masked** output. Any address inside `10.0.0.0/8`,
`172.16.0.0/12`, `192.168.0.0/16` or `100.64.0.0/10` that survives there, and is not
on the preserve list, causes `check-secrets.mjs` to exit non-zero.

Two distinct failures produce a hit, and both must fail the build:

1. **An address the table does not know** — new source material introduced it. It
   fails loudly rather than being silently rewritten by a guessed pattern. Adding it
   to the table is a deliberate, reviewed edit.
2. **A known table key that survived** — the rewriter failed to rewrite an address
   already identified as sensitive.

> An earlier revision of this spec exempted table keys from the gate, on the
> assumption that a key is always rewritten. That assumption is exactly what the gate
> exists to check, and case 2 is the more dangerous of the two: a known-sensitive
> address reaching production with the gate green. Only the preserve list is exempt.

### Explicitly preserved

| Value | Why |
|---|---|
| `10.96.0.1` | Kubernetes default service IP |
| `10.96.0.10` | Kubernetes default cluster DNS |
| `10.244.0.0/16` | default pod CIDR |
| `100.100.100.100` | Tailscale MagicDNS, a published constant |
| `127.0.0.1` | loopback |
| `kri`, `graphify` | already published on the live site |

### Required properties

- **Injectivity.** Distinct inputs map to distinct outputs. No two source addresses may
  share a masked value, or prose distinguishing two hosts stops making sense. Asserted
  over the whole table, not sampled.
- **Idempotence.** `mask(mask(x)) === mask(x)`. The pipeline is re-runnable and the gate
  runs on already-masked output, so masking must not compound. Holds because no
  replacement value appears as a key.
- **Allow-list integrity.** The preserved values below pass through untouched.
- **Longest-match ordering.** Patterns are applied longest-first, so a shorter table key
  that is a prefix of a longer one (e.g. `10.9.9.1` vs. `10.9.9.11`) cannot consume the
  longer key's match. Word-boundary anchors alone happen to cover these cases, but the
  ordering makes the guarantee explicit rather than incidental.
- **Word boundaries.** `avika` must not match inside a longer token.

No real credentials exist in the corpus — every hit is a placeholder (`yourpassword`,
`AKIAIOSFODNN7EXAMPLE`, `s.xxxxx`). No private keys, no MAC addresses, no public IPs.

## 6. Conversion

| Step | Rule |
|---|---|
| Extract SVG | `<svg>` subtrees pulled to placeholders **before** Turndown runs |
| Strip chrome | drop `<style>`, `<script>`, `header.bar`, `nav`, `.tab-num`, footer, on-this-page TOC |
| Flatten tabs | each `.tab` panel becomes `## H2`; `.section-title` becomes `### H3` |
| Code | `<pre>` becomes a fenced block; language inferred from `class="k"`/`c`/`s` token spans |
| Tables | `<table>` becomes a markdown table |
| Re-inject SVG | placeholders replaced with the original SVG markup, verbatim |
| Frontmatter | `<title>` (minus any `— hellodk` suffix) and `<meta name="description">` |

Extracting SVG before conversion is the fix for the primary defect. If Turndown sees an
SVG it strips the elements and leaves the `<text>` labels as prose — the current
failure mode.

Markdown sources (buckets B and C partially, plus `.md.resolved`) skip conversion:
frontmatter is generated, the body passes through, then masking applies.

Diagram CSS (`.diagram`, `.blk`, `.row`, `.ico`, `.cap`) is lifted once into
`src/styles/diagrams.css` and imported by the post layout, rather than inlined 41 times.

The orchestrator **overwrites** existing output. There is no skip-if-exists guard: the
blogs directory is the source of truth, and re-running must converge.

## 7. README changes

Three targeted edits; the README is otherwise sound.

1. **Project layout** — mark `src/content/blog/` as generated from `~/Documents/blogs`
   via `scripts/migrate-blogs.mjs`, so a hand-edited post is not silently lost on the
   next run.
2. **Scripts table** — add `npm run migrate:blogs` and `npm run test`.
3. **Writing a post** — state that the blogs directory is the source of truth and that
   masking is enforced by `check:secrets`.

## 8. Testing

Tests are written before the implementation. `test-reports/` does not yet exist in this
repo; it is created and gitignored.

| Suite | Assertions |
|---|---|
| `mask.test.mjs` | masking mechanism against **fixture** addresses (not the real table): unknown-address gate, anchoring, longest-match ordering, injectivity and idempotence-precondition proven against a table the test constructs itself; allow-list untouched (`10.96.0.1`, `10.96.0.10`, `10.244.0.0`, `100.100.100.100`, `127.0.0.1`, `kri`, `graphify`); `avika` word-boundary (must not match inside a longer token); slug masking. Real-table integrity (30 entries, injective, no key/value collision) is checked by `verify-migration.mjs` at runtime instead, since the table itself is gitignored and must never appear in a committed test |
| `html-to-md.test.mjs` | SVG survives byte-identical; `<pre>` becomes a fenced block; `<table>` becomes a markdown table; chrome removed; tabs become H2; frontmatter read from `<title>` and `<meta description>` |
| `check-secrets` gate | exits non-zero if any real LAN or CGNAT IP, `.internal`/`.home` hostname, or the personal email appears under `src/content/blog/` |

The gate runs in the existing `.githooks/pre-commit` and `check:secrets` path, so an
unmasked address cannot reach the remote even if the converter regresses.

### Test runner

`vitest`, added as a devDependency. New devDependencies: `turndown`,
`node-html-parser`, `vitest`.

**Cloudflare impact: none.** All three are devDependencies used only by the migration
script, which is deliberately not wired into `prebuild` or `build`. Nothing new enters
the Workers or Pages Function bundle. The script reads an absolute local path
(`/home/dk/Documents/blogs`) that does not exist on Cloudflare's builder, so keeping it
out of `build` is load-bearing rather than cosmetic.

## 9. Acceptance criteria

- [ ] 42 files present in `src/content/blog/`
- [ ] 34 with `draft: false`, 8 with `draft: true`
- [ ] `npx astro build` completes with no schema errors
- [ ] every post whose source contains SVG has SVG count > 0
- [ ] no post has fewer code fences than its source has `<pre>` blocks (counted indent-aware: a `<pre>` inside an `<li>` yields an indented fence)
- [ ] no post body contains chrome markers (`On This Page`, `min read`, `hellodk.io · Deepak`)
- [ ] `npm run check:secrets` exits 0
- [ ] `mask(mask(x)) === mask(x)` for every fixture
- [ ] the 30 masked IP values are pairwise distinct (injectivity)
- [ ] no address in `10/8`, `172.16/12`, `192.168/16` or `100.64/10` survives in output
      unless it is on the preserve list
- [ ] README reflects the generated-content model
- [ ] `test-reports/` gitignored

## 10. Risks

| Risk | Mitigation |
|---|---|
| Rebuild overwrites hand-edits to the 9 existing posts | Changes are in git; diff reviewed before commit |
| New source material introduces an address not in the table | Unknown-address gate fails the build rather than guessing a rewrite; adding the address to the table is a deliberate, reviewed edit |
| Masking misses a non-address pattern entirely | `check-secrets` gate runs on the output, not the input; pre-push hook blocks the push |
| Bucket C notes contain context no regex can catch | Ship `draft: true`; user reviews rendered before publishing |
| Source HTML structure varies across formats | Converter flags low-confidence output; acceptance criteria are measured per post, not in aggregate |
| Turndown mangles an edge case | Per-post SVG and code-fence counts are asserted, so regressions surface as failures |
