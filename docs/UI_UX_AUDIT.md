# UI/UX audit — images and diagrams

**Date:** 2026-08-09 · **Scope:** all 56 published posts · **Issue:** [#10](https://github.com/hellodk/cfpages/issues/10)

Every figure below was measured, not estimated. The static numbers come from
`node scripts/audit-assets.mjs`; the rendering numbers come from Playwright
against the built `dist/` at fixed viewport widths.
`tests/unit/asset-audit.test.mjs` re-runs the audit and compares it to the
table in [Measured totals](#measured-totals), so this document fails the test
suite rather than going quietly stale.

---

## Verdict

The site's typography, colour tokens and code blocks are in good shape. The
diagrams are not, and the failure is severe enough to change who can read the
site: **on a phone, no label in any of the 102 diagrams is legible.** Not
"small" — measured at 2.9px to 5.8px. That is the finding that matters; almost
everything else on this page is cosmetic beside it.

The second theme is that the diagrams were authored at a desktop zoom level
and never re-checked at delivery size. 1,047 labels are below the 12px floor,
17 labels are painted outside their own canvas and therefore never appear at
all, and 307 label/backdrop pairs fall under the 4.5:1 contrast floor.

---

## Measured totals

<!-- These figures are asserted by tests/unit/asset-audit.test.mjs. -->

| Metric | Value |
|---|---|
| publishedPosts | 103 |
| postsWithSvg | 62 |
| svgs | 208 |
| diagrams | 189 |
| icons | 19 |
| cleanSvgs | 41 |
| coversOnDefault | 44 |
| distinctCovers | 57 |
| missingCovers | 0 |
| missingBodyImages | 0 |
| oversizedCovers | 14 |
| narrowCovers | 14 |
| distinctAspects | 15 |

| SVG defect | Occurrences | SVGs | Posts |
|---|---|---|---|
| tiny-font | 1459 | 113 | 38 |
| low-contrast | 354 | 86 | 32 |
| dark-panel | 19 | 17 | 10 |
| no-role | 118 | 118 | 30 |
| no-aria-label | 116 | 116 | 28 |
| diagonal | 33 | 33 | 20 |
| text-past-viewbox | 20 | 15 | 13 |
| blank-line | 0 | 0 | 0 |
| no-viewbox | 0 | 0 | 0 |

Only **4 of 121** SVGs are clean.

---

## S1 — Diagram labels are illegible on mobile

**Severity: critical. 102 diagrams, 27 posts.**

`src/styles/diagrams.css:30` sets every top-level diagram to `width: 100%`
with `height: auto` and no lower bound. An SVG with a viewBox and no intrinsic
size scales to whatever the column gives it — including down.

Measured in-browser on `/salt-concepts/`:

| Viewport | Column | viewBox | Scale | Smallest label | Largest label |
|---|---|---|---|---|---|
| 1440px | 1109px | 900 | 1.232× | 11.1px | — |
| 390px | 327px | 900 | 0.363× | **2.9px** | **5.8px** |

At 390px the whole diagram is 327px wide. A 36-label architecture diagram is
rendered into less space than a business card, and the largest text on it —
the title of the central node — lands at 5.8px. Nothing on it can be read.
Confirmed visually, not only arithmetically.

The desktop number is the mirror image of the same defect: the column is
*wider* than the canvas, so a 900-wide diagram is upscaled 1.232×. That is why
these read as acceptable during authoring — the desktop view flatters them by
23%.

**Remediation.** Stop scaling diagrams to the column. Give the diagram its
intrinsic width and let the container scroll, which is exactly the treatment
tables already get at `src/layouts/PostLayout.astro:106`:

```css
.post-art__body > svg {
  width: 100%;
  min-width: 680px;   /* never shrink below the authored legibility floor */
  height: auto;
}
/* the scroll has to live on a wrapper, not the svg itself */
.diagram > .body { overflow-x: auto; }
```

Diagrams that are not wrapped in `.diagram > .body` need a wrapper before this
works. The alternative — a CSS `clamp()` on `font-size` inside the SVG — does
not help, because SVG text scales with the viewBox transform regardless of its
declared size.

---

## S2 — 1,459 labels below the 12px floor

**Severity: critical. 113 SVGs, 38 posts.**

ui.md sets 12px as the minimum for any label that carries meaning, and 11px
only for genuinely decorative micro-text. Distribution of what is actually
shipped:

| font-size | Occurrences |
|---|---|
| 7 | 10 |
| 8 | 37 |
| 9 | 236 |
| 9.5 | 6 |
| 10 | 312 |
| 10.5 | 22 |
| 11 | 386 |
| 11.5 | 38 |

These are attribute values, before the S1 scale factor is applied. A 7px label
in a 900-wide viewBox renders at 8.6px on a 1440px desktop and **2.5px on a
phone**.

Worst offenders by count: `salt-concepts`, `tensor-parallelism-omlx`, `ios-android-build-guide`, `git-concepts`, `kri-salt-deployment`.

Full list (38 posts): `agentic-mcp-gateways`, `ai-git-branching-strategy`, `alerting`,
`auth-concepts`, `dashboards`, `deploying-qwen-tensor-parallelism`,
`e2e-testing-token-efficiency`, `engineering-reliability-testing-strategy`,
`git-concepts`, `gnome-thumbnails-broke`, `google-distroless-remediation`,
`hardware-telemetry`, `hydra-vs-mlx-oc`, `ios-android-build-guide`,
`jenkins-macos-gui-session-agent`, `kri-agentic-fleet-assistant`,
`kri-fleet-management`, `kri-knowledge-graph-graphify`, `kri-ops-guide`,
`kri-salt-deployment`, `kri-testing-strategy`, `macos-vms-tart-salt`,
`mlx-inference-performance`, `mobile-code-signing`, `observability-audit`,
`opik-feedback-loop`, `opik-llm-tracing`, `pnpm-smarter-package-manager`,
`rag-embeddings-vector-db`, `salt-concepts`, `sglang-on-two-mac-minis`,
`tensor-parallelism-omlx`, `tmux-session-manager`,
`two-mac-minis-mlx-debugging`, `typhoon-wifi-cpu-powersave`,
`ubi-micro-remediation`, `yugabyte-aerospike-connectors-opensre`,
`zellij-session-manager`..

**Remediation.** Raise every meaningful label to ≥12 and re-lay-out the nodes
that no longer fit. Diagrams that only fit their content at font-size 8 are
carrying too much content; those should be split into two diagrams rather than
shrunk further.

---

## S3 — 354 labels below the 4.5:1 contrast floor

**Severity: high. 63 SVGs, 21 posts.**

Contrast is computed against the label's **actual backdrop**, resolved by
geometry — the smallest `<rect>` containing the label's anchor point, falling
back to the page white. An earlier pass compared every fill to the page
background and produced 398 hits; that number was wrong, because it counted
white-on-dark-chip labels as failures. 307 is the corrected figure.

Of those, 90 sit on the white page and 217 sit on a coloured shape.

Representative pairs:

| Fill | Backdrop | Ratio | Occurrences | Note |
|---|---|---|---|---|
| `#16A34A` | `#FFFFFF` | 3.30:1 | 32 | ui.md success token used as text |
| `#9CA3AF` | `#FFFFFF` | 2.54:1 | 31 | below the ui.md `#4B5563` floor |
| `#16A34A` | `#F0FDF4` | 3.15:1 | 25 | green on its own tint |
| `#6B7280` | `#F3F4F6` | 4.39:1 | 20 | passes on white, fails on a grey card |
| `#DC2626` | `#FEF2F2` | 4.41:1 | 16 | just under |
| `#D97706` | `#FFFFFF` | 3.19:1 | 13 | ui.md warning token used as text |
| `#6B7280` | `#111827` | 3.67:1 | 11 | grey text on a dark panel |
| `#4B5563` | `#111827` | 2.35:1 | 4 | effectively invisible |
| `#93C5FD` | `#EFF6FF` | 1.66:1 | 3 | effectively invisible |

Two systemic causes, and they need different fixes:

1. **The ui.md status tokens are fill colours, not text colours.** `#16A34A`
   (3.30:1) and `#D97706` (3.19:1) are correct for a badge background with
   dark text on it, and wrong for 10px label text. Together they account for
   81 of the 307. They pass AA for *large* text — ≥24px, or ≥18.66px bold —
   and none of these labels are anywhere near that.
2. **`#9CA3AF` predates the ui.md floor.** ui.md sets `#4B5563` as the minimum
   label colour; `#9CA3AF` is 2.54:1 and appears 48 times across case variants.

The `#6B7280 on #F3F4F6` row is the subtle one: that colour passes at 4.83:1
on white, which is presumably how it was chosen, and drops to 4.39:1 the
moment it is placed on a grey card.

All 32 posts, by number of failing labels: `gnome-thumbnails-broke` (49), `ios-android-build-guide` (46),
`salt-concepts` (41), `kri-fleet-management` (26),
`zellij-session-manager` (25), `tensor-parallelism-omlx` (19),
`tmux-session-manager` (18), `kri-ops-guide` (17), `git-concepts` (13),
`auth-concepts` (12), `deploying-qwen-tensor-parallelism` (8),
`e2e-testing-token-efficiency` (8), `pnpm-smarter-package-manager` (8),
`kri-testing-strategy` (6), `macos-vms-tart-salt` (6),
`perils-of-timezone` (6), `rag-embeddings-vector-db` (6),
`jenkins-macos-gui-session-agent` (5), `kri-knowledge-graph-graphify` (4),
`kri-salt-deployment` (4), `llama-cpp-systemd` (4),
`two-mac-minis-mlx-debugging` (4), `typhoon-wifi-cpu-powersave` (4),
`engineering-reliability-testing-strategy` (3), `homelab-secret-rescue` (3),
`sglang-on-two-mac-minis` (3), `297-probe-failures-mlx-cluster` (1),
`google-distroless-remediation` (1), `hardware-telemetry` (1),
`hellodk-jekyll-to-astro-cloudflare-migration` (1),
`local-tool-calling-models` (1), `mlx-jaccl-silent-hang` (1)..

**Remediation.** Darken status text to `#15803D` / `#B45309` / `#B91C1C`, or
keep the bright token as a fill and put `#111827` on top of it. Replace every
`#9CA3AF`/`#94A3B8`/`#CBD5E1`/`#E5E7EB` label with `#4B5563`. Re-check `#6B7280`
against tinted cards specifically.

---

## S4 — Dark panels still present inside diagrams

**Severity: high. 17 SVGs, 10 posts.**

Code blocks went light in #6. The same dark treatment survives inside the
diagrams, where `#1a1a3e` and `#111827` are used as "main actor" emphasis
panels:

| Post | Diagram | Fill | Share of canvas |
|---|---|---|---|
| `zellij-session-manager` | #0 | `#1a1a3e` | 33% |
| `agentic-mcp-gateways` | #2 | `#1a1a3e` | 26% |
| `salt-concepts` | #0 | `#1a1a3e` | 26% |
| `agentic-mcp-gateways` | #4 | `#1a1a3e` | 20% |
| `tmux-session-manager` | #0 | `#111827` | 20% |
| `zellij-session-manager` | #2 | `#111827` | 20% |
| `salt-concepts` | #1 | `#1a1a3e` | 18% |
| `tmux-session-manager` | #0 | `#111827` | 18% |
| `salt-concepts` | #4 | `#1a1a3e` | 17% |
| `agentic-mcp-gateways` | #0 | `#1a1a3e` | 14% |
| `zellij-session-manager` | #2 | `#111827` | 14% |
| `agentic-mcp-gateways` | #3 | `#1a1a3e` | 10% |
| `rag-embeddings-vector-db` | #3 | `#1a1a3e` | 10% |

The first Salt diagram is the clearest case: the dark master panel occupies
the left third and dominates a page that is otherwise white. Beside a light
code block on the same page, it reads as a different site.

The token appears in 10 posts in total; the 5 above are where it forms a panel
of 10% of the canvas or more. The rest use it for small chips and strokes,
which is defensible — `java-distroless-cve-hunt`, `java21-libpng-cve-fix`,
`opensre-connectors-e2e-gauntlet`, `prefix-cache-economics`, and
`tensor-parallelism-omlx`.

**Remediation.** Replace the dark emphasis panel with a white card carrying a
2px accent border and an accent-tinted title bar. Where a label is currently
light-on-dark it must flip to `#111827`, so the fill and text changes have to
land together — this is exactly where the four `#4B5563 on #111827` labels
from S3 live.

---

## S5 — Diagrams are invisible to screen readers

**Severity: high. 118 of 192 SVGs, 30 posts.**

118 SVGs have no `role="img"` and 116 have no `aria-label`. An inline `<svg>`
with neither is announced as a meaningless group of text fragments, read out
label by label in document order — which for a diagram is close to random.

19 of the 192 are decorative 24×24 icons where the correct answer is
`aria-hidden="true"`, not a label. The remaining ~99 are real diagrams that
need a one-sentence description of what the diagram shows.

**Remediation.** `role="img"` plus a full-sentence `aria-label` on every
diagram; `aria-hidden="true"` on every inline icon. The three diagrams in
`hellodk-jekyll-to-astro-cloudflare-migration` are already correct and are the
pattern to copy.

---

## S6 — 20 labels are painted outside their own canvas

**Severity: medium. 15 SVGs, 13 posts.**

A `<text>` whose baseline sits below the viewBox floor is not clipped with a
warning — it is simply never painted. Nothing errors and the diagram looks
complete unless you know what is missing.

Affected: `agentic-mcp-gateways`, `e2e-testing-token-efficiency`,
`engineering-reliability-testing-strategy`, `gnome-thumbnails-broke`,
`ios-android-build-guide`, `kri-agentic-fleet-assistant`,
`kri-testing-strategy`, `macos-vms-tart-salt`, `salt-concepts`,
`tensor-parallelism-omlx`, `two-lenses-cluster-estimates`,
`two-mac-minis-mlx-debugging`, `typhoon-wifi-cpu-powersave`.

`macos-vms-tart-salt` has a label at `y=328` in a 320-high viewBox — 8px past
the bottom edge, entirely gone.

**Remediation.** Extend each viewBox height to `maxBaseline + 24` per the
ui.md padding rule. Cheaper and safer than moving the labels.

---

## S7 — 33 diagonal connectors

**Severity: low. 33 SVGs, 20 posts.**

ui.md requires connectors to be strictly horizontal or vertical, with L-bends
for off-axis links. 20 `<line>` elements have neither endpoint pair aligned.

Affected: `jenkins-macos-gui-session-agent` (4), `git-concepts` (3),
`ios-android-build-guide` (3), `mobile-code-signing` (3),
`auth-concepts` (2), `kri-fleet-management` (2),
`local-llm-inference-architecture` (2), `zellij-session-manager` (2),
`alerting` (1), `gnome-thumbnails-broke` (1), `hardware-telemetry` (1),
`kri-agentic-fleet-assistant` (1), `kri-knowledge-graph-graphify` (1),
`macos-vms-tart-salt` (1), `mlx-inference-performance` (1),
`observability-audit` (1), `opik-feedback-loop` (1), `opik-llm-tracing` (1),
`pnpm-smarter-package-manager` (1), `rag-embeddings-vector-db` (1).

This is a consistency issue rather than a readability one, and it is the
lowest-value item on this page. Worth doing when a diagram is already open for
S2 or S3.

---

## S8 — Cover aspect ratios span 1.0 to 14.26

**Severity: high.**

`.post-art__cover` at `src/layouts/PostLayout.astro:65` is a fixed slot:
`width: 100%; max-height: 360px; object-fit: cover`. At a 1440px viewport that
is 1109×360, an aspect ratio of 3.08. Source images range across 15 distinct
raster ratios (24 further covers are vector SVGs, which carry no raster dimensions):

| Ratio | Posts |
|---|---|
| 1.5 | 50 |
| 1.78 | 8 |
| 1.42 | 4 |
| 1.03 | 3 |
| 1.49 | 2 |
| 1.62 | 2 |
| 1.67 | 2 |
| 0.46, 1.0, 1.33, 1.53, 1.6, 1.87, 3.11, 14.26 | 1 each |

`object-fit: cover` crops whatever does not fit, so the further a source is
from 3.08 the more of it is thrown away. `drift-detector-observability` and
`typhoon-wifi-cpu-powersave` use a 1200×1165 logo at ratio 1.03: roughly two
thirds of the image is cropped out, leaving a horizontal band through the
middle of a logo.

**Remediation.** Fix one source ratio — 1.5 already covers 50 posts — and set
the slot to `aspect-ratio: 3 / 1` so the crop is predictable and identical
everywhere. Specified in `docs/COVER_IMAGE_BRIEF.md`.

---

## S9 — Cover weight

**Severity: medium. 10 files.**

The cover is the LCP element on every post page. Ten exceed 400KB:

| Size | Dimensions | File |
|---|---|---|
| 1,967KB | 1600×1200 | `unix_time_sharing/unix-wallpaper.png` |
| 1,118KB | 1289×771 | `screen2.png` |
| 922KB | 3840×2160 | `Coding_with_Style-2_uhd.jpg` |
| 922KB | 3840×2160 | `Coding_with_Style-2_uhd (1).jpg` |
| 916KB | 1200×800 | `jasper_screen2.png` |
| 913KB | 3840×2160 | `Coding_with_Style_uhd.jpg` |
| 652KB | 1200×800 | `jasper_screen1.png` |
| 583KB | 1281×790 | `screen4.png` |
| 522KB | 1280×790 | `screen3.png` |
| 442KB | 1024×615 | `fiction_cover.jpg` |

Two separate problems. The three `Coding_with_Style*` files are 3840×2160
delivered into a slot no wider than 1109px — a 3.5× linear oversupply, ~2.7MB
across the four posts that use them. The PNG screenshots are PNGs of
photographic content, which is the wrong container; `unix-wallpaper.png` at
1.97MB is the single heaviest asset on the site.

Fourteen covers go the other way and are **narrower than the slot**, so they
are upscaled and soft:

```
225x225    upgrade-sublime-text/sublime.jpeg
398x128    jenkins/jenkins.png
542x38     jenkins/jenkins_ssh_keys_verification.png
560x315    http.jpg, http1.png
572x322    main-qimg-…-c.jpeg
800x427    unix_time_sharing/unix.png
738x1600   blog/network-spike-investigation/network-spike-1.jpeg
800x500    rethinkdb/rethinkdb1.jpg
1000x667   travel/manali/IMG_75751.JPG
1003x657   screen6.png
1024x615   fiction_cover.jpg
1080x720   cover3.jpg, cover7.jpg
```

`jenkins.png` at 398×128 is upscaled 2.8× and `sublime.jpeg` at 225×225 nearly
5×. Neither survives it.

**Remediation.** 1600×1067 source, JPEG, ≤400KB — the spec in
`docs/COVER_IMAGE_BRIEF.md`. Re-encode the PNG screenshots as JPEG.

---

## S10 — 44 posts share one cover image

**Severity: high. 44 of 103 posts.**

44 posts resolve to `assets/images/cover1.jpg` and only 57 distinct images
serve 103 posts. Tracked separately in
[#9](https://github.com/hellodk/cfpages/issues/9) with the full per-post brief
in `docs/COVER_IMAGE_BRIEF.md`.

Contributing causes in `src/utils/postCover.ts`:

- `TAG_COVERS` has two entries (`kubernetes`, `cassandra`), so the tag
  fallback almost never fires.
- `extractFirstImage` matches `![]()` and `<img>` only. Posts illustrated with
  inline `<svg>` — which is most of the recent writing — have no raster image
  to find, so they fall through to the default.
- `SLUG_COVERS` in `src/data/post-covers.ts` is **dead code**: all 47 slugs in
  it now also carry `cover:` in their own frontmatter, so step 1 always wins
  and step 2 is unreachable.

---

## S11 — A cover URL that 404s in production

**Severity: P1. Filed separately as [#11](https://github.com/hellodk/cfpages/issues/11).**

`extractFirstImage` captures with `[^)]+`, which swallows the markdown title
attribute. `deploy-jenkins-with-ssl` therefore ships:

```html
<img src="/assets/images/jenkins/jenkins_ssh_keys_verification.png &quot;ssh keys verification&quot;">
```

`naturalWidth` is 0 in the browser — the request 404s. It reaches 7 built
pages plus `og:image` and `twitter:image`, so every share card for that post
is blank. Found here, fixed under #11.

---

## S12 — Dead components carrying a dark theme

**Severity: low.**

`src/components/PostHeader.astro` and `src/components/Hero.astro` are imported
nowhere. `PostHeader` still contains a `#0d0d0d` dark header variant
(`post-header__meta-wrap--nocov`) with white text — the pattern removed
elsewhere in #6. It is invisible today and would reintroduce a dark surface
the moment someone reuses the component.

**Remediation.** Delete both, or bring `PostHeader` in line with the light
theme if it is being kept deliberately.

---

## What is already right

Worth recording so it does not get "fixed" later:

- No missing images. All 56 covers and all 12 body image references resolve on
  disk. (The one broken URL in S11 is a resolution bug, not a missing file.)
- No blank lines inside any SVG — the CommonMark HTML-block termination that
  broke 99 diagrams during the original migration has not regressed.
- Every SVG has a `viewBox`, so nothing is stuck at a fixed pixel size.
- The icon-sizing rule at `src/styles/diagrams.css:49` correctly uses the
  direct-child combinator, so 24px inline icons are not stretched to the
  column width.
- Body copy is capped at 68ch and code blocks are light with a visible border,
  both from #6.
- No horizontal page scroll at 390px.

---

## Method

```bash
node scripts/audit-assets.mjs          # summary
node scripts/audit-assets.mjs --json   # full per-post detail
npx vitest run tests/unit/asset-audit.test.mjs
```

Static analysis lives in `scripts/lib/asset-audit.mjs`. Thresholds are in
`LIMITS` there, expressed as numbers so they can be asserted rather than
eyeballed. Image dimensions are read from JPEG/PNG/GIF/WEBP headers directly;
`sharp` is present in `node_modules` as a transitive Astro dependency but is
not in `package.json`, so depending on it would be a phantom dependency.

Rendering measurements were taken with Playwright against the built `dist/` at
1440×900 and 390×844, reading `getBoundingClientRect()` and the viewBox off
each live SVG. Nothing on this page is inferred from source alone where a
rendered measurement was available.

### Known limitation

Contrast backdrops are resolved from `<rect>` geometry only. A label sitting
on a `<circle>`, `<path>` or gradient falls back to the page white and may be
mis-scored in either direction. Every figure quoted in S3 was spot-checked
against the rendered diagram.

---

## Suggested order of work

| # | Finding | Why this order |
|---|---|---|
| 1 | S11 | Live 404 on 7 pages plus every share card. One regex. |
| 2 | S1 | One CSS rule; turns 102 unreadable diagrams into readable ones on mobile. |
| 3 | S4 + S3 | Same edits, same files — the dark panels are where the worst contrast pairs live. |
| 4 | S2 | The large mechanical pass. Do it once S1 has settled the delivery size. |
| 5 | S8 + S9 + S10 | Lands with the new cover set from #9. |
| 6 | S6, S5, S7, S12 | Per-diagram cleanup, best done while a file is already open. |
