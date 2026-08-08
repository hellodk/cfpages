# Blog Content Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 42 items from `~/Documents/blogs` into `src/content/blog` markdown, preserving SVG diagrams and code blocks, with deterministic masking of infrastructure detail.

**Architecture:** A parser-based pipeline replaces the blind-regex script. Three pure, independently testable modules (`mask`, `html-to-md`, `manifest`) sit under `scripts/lib/`; a thin orchestrator owns all filesystem I/O. Masking runs on the finished markdown, after conversion, and is enforced by a gate wired into the existing pre-commit hook.

**Tech Stack:** Node 22, Astro 6, Turndown, node-html-parser, Vitest.

Spec: `docs/superpowers/specs/2026-08-07-blog-content-migration-design.md`
Issue: hellodk/cfpages#1
Branch: `feat/blog-content-migration`

## Global Constraints

- **Package manager is npm.** This repo is an explicit exception to the global pnpm rule — the Cloudflare Pages/Workers Builds pipeline is configured against npm (`npm ci`, `npm run build`, `npm run cf:deploy`). Never introduce `pnpm` or `yarn` here.
- **New dependencies are devDependencies only.** `turndown`, `node-html-parser`, `vitest`. They must never enter the Workers or Pages Function bundle.
- **`scripts/migrate-blogs.mjs` must NOT be wired into `prebuild` or `build`.** It reads the absolute path `/home/dk/Documents/blogs`, which does not exist on Cloudflare's builder. Keeping it out of the build is load-bearing.
- **All test output goes to `test-reports/`**, which is gitignored.
- **Blog source of truth is `/home/dk/Documents/blogs`.** `src/content/blog/` is generated and overwritten.
- **Frontmatter schema** (`src/content.config.ts`): `title: string`, `date: coerce.date`, `description: string`, `tags: string[]`, `cover?: string`, `draft: boolean`.
- **Masking replacement blocks are RFC 5737:** `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`.
- Commit after every task. Never use `--no-verify`.

---

### Task 1: Test infrastructure and dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: `npm test` runs Vitest against `tests/unit/*.test.mjs` and writes JUnit XML to `test-reports/unit/results.xml`. All later tasks depend on this.

- [ ] **Step 1: Install the three devDependencies**

```bash
npm install --save-dev turndown@7.2.0 node-html-parser@6.1.13 vitest@3.0.5
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.mjs`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.mjs'],
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-reports/unit/results.xml' },
  },
});
```

- [ ] **Step 3: Add the npm scripts**

In `package.json`, add to `"scripts"` (leave every existing entry untouched, and do NOT touch `prebuild` or `build`):

```json
"test": "vitest run",
"test:watch": "vitest",
"migrate:blogs": "node scripts/migrate-blogs.mjs"
```

- [ ] **Step 4: Gitignore the test reports**

Append to `.gitignore`:

```
# test output
test-reports/
```

- [ ] **Step 5: Verify Vitest runs with no tests yet**

Run: `npm test`
Vitest exits **1** when it finds no test files. Add `passWithNoTests: true` to the `test` block in `vitest.config.mjs` so an empty run is green, then re-run.
Expected after the config change: exit 0, "No test files found".

- [ ] **Step 6: Confirm the build path is untouched**

Run: `node -e "const p=require('./package.json'); console.log(p.scripts.prebuild); console.log(p.scripts.build)"`
Expected: `prebuild` and `build` print exactly their original values, with no reference to `migrate:blogs`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.mjs .gitignore
git commit -m "Add Vitest and migration dependencies.

Refs #1"
```

---

### Task 2: Masking module

The security-critical path. Written test-first, and every property is asserted rather than assumed.

**Files:**
- Create: `scripts/lib/mask.mjs`
- Test: `tests/unit/mask.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `IP_TABLE: Record<string,string>` — 25 exact IP rewrites
  - `HOST_TABLE: Record<string,string>` — 5 hostname rewrites
  - `PRESERVE: Set<string>` — addresses that must pass through untouched
  - `maskText(input: string): string`
  - `maskSlug(slug: string): string`
  - `findUnmasked(text: string): string[]` — in-range addresses that are neither rewritten nor preserved

- [ ] **Step 1: Write the failing test**

Create `tests/unit/mask.test.mjs`:

```js
// This code block originally embedded the full test file verbatim, including
// the real IP_TABLE / HOST_TABLE addresses used as fixtures. `hellodk/cfpages`
// is public, so that repeated the exact leak this task exists to fix — the
// block has been redacted here.
//
// The actual, current tests/unit/mask.test.mjs is the source of truth. It was
// rewritten (Step 1f of the 2026-08-07 merge-blocker follow-up) to assert the
// same properties — injectivity, idempotence, anchoring, preserve-list,
// case handling, the unknown-address gate — against fixture addresses this
// test constructs itself, never against the real corpus. Read that file
// directly rather than this historical snapshot.
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/mask.test.mjs`
Expected: FAIL — `Failed to resolve import "../../scripts/lib/mask.mjs"`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/mask.mjs`:

```js
// This code block originally embedded the full implementation of
// scripts/lib/mask.mjs verbatim, including the real IP_TABLE / HOST_TABLE —
// the exact `real -> masked` mapping for all 42 posts. `hellodk/cfpages` is
// public, so that repeated the leak this task exists to fix — the block has
// been redacted here.
//
// As of the 2026-08-07 merge-blocker follow-up (Step 1f), the tables no
// longer live in mask.mjs at all: they moved to the gitignored
// scripts/lib/mask.local.mjs, and mask.mjs imports them from there, throwing
// loudly if the file is absent. Read scripts/lib/mask.mjs directly for the
// current (table-free) implementation, and see the "Masking" section of
// docs/superpowers/specs/2026-08-07-blog-content-migration-design.md for the
// shapes (`192.168.1.x -> 192.0.2.x`, `<host>.internal -> <host>.example.internal`).
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/unit/mask.test.mjs`
Expected: PASS, all assertions green.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/mask.mjs tests/unit/mask.test.mjs
git commit -m "Add deterministic masking module.

Exact-match table over the 29 corpus addresses; patterns collide
(two distinct source blocks can land on the same target octet). Verified
injective and idempotent.

Refs #1"
```

---

### Task 3: HTML to markdown converter

**Files:**
- Create: `scripts/lib/html-to-md.mjs`
- Test: `tests/unit/html-to-md.test.mjs`

**Interfaces:**
- Consumes: nothing (pure; masking is applied later by the orchestrator)
- Produces: `convertHtml(html: string): { title: string, description: string, body: string }`

**Ordering matters.** Chrome is stripped *before* SVG extraction, because `header.top .chip svg` is a 24×24 decorative icon that must not survive as a diagram. The sequence is: read head metadata → inject tab headings → strip chrome → drop the leading `h1` → extract remaining SVGs to placeholders → Turndown → re-inject SVGs.

Source formats in the corpus:
- **Concept Guide** — `.wrap`, `header.top`, `.byline`, `nav.tabbar > button.tab > span.tab-num`, `section.panel`, `.section-title`, `.diagram > .bar + .body > svg`
- **Narrative** — `.page`, `.hero`, `.meta`, `.tag-strip`, `.diagram-wrap`, `.code-label`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/html-to-md.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import TurndownService from 'turndown';
import { convertHtml } from '../../scripts/lib/html-to-md.mjs';

const CONCEPT_GUIDE = `<!doctype html><html><head>
<title>The Perils of Timezone — A Complete Visual Guide</title>
<meta name="description" content="Why UTC is the only sane default.">
<style>.diagram{padding:8px}</style>
</head><body>
<div class="wrap">
  <header class="top">
    <span class="chip"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg></span>
    <div><h1>The Perils of Timezone</h1><p class="sub">A single instant.</p></div>
  </header>
  <div class="byline"><span>by <b>hellodk</b></span><span>06 Aug 2026</span></div>
  <nav class="tabbar"><button class="tab"><span class="tab-num">1</span> The Trap</button>
  <button class="tab"><span class="tab-num">2</span> The Discipline</button></nav>
  <section class="panel" id="p0">
    <div class="section-title">It works on your laptop.</div>
    <p>Timezone bugs surface at 2 AM.</p>
    <div class="diagram"><div class="bar">One Instant</div><div class="body">
      <svg viewBox="0 0 720 300"><text x="360" y="46">One Real Event</text></svg>
    </div></div>
    <pre>kubectl get pods -A</pre>
  </section>
  <section class="panel" id="p1">
    <p>Store UTC.</p>
    <table><thead><tr><th>Layer</th><th>Zone</th></tr></thead>
    <tbody><tr><td>DB</td><td>UTC</td></tr></tbody></table>
  </section>
</div>
<script>function switchTab(i){}</script>
</body></html>`;

// The third layout in the corpus (10 files): topbar + left sidebar nav, no
// meta description, tabs named .tabs/.tab-btn/.tab-panel rather than the
// Concept Guide's .tabbar/.tab/section.panel.
const APP_SHELL = `<!doctype html><html><head>
<title>Drift Detector — hellodk</title>
</head><body>
<header class="topbar">
  <div class="topbar-icon">🛰️</div>
  <div class="topbar-meta">08 Aug 2026 · 7 min read</div>
</header>
<nav class="sidebar">
  <div class="nav-label">On This Page</div>
  <a class="nav-link" href="#a">Problem</a>
</nav>
<main>
  <div class="hero">
    <div class="hero-eyebrow">Observability</div>
    <h1>Drift Detector</h1>
    <p>Config drift went unnoticed for six weeks before anyone looked.</p>
    <div class="hero-meta">by hellodk · 7 min read</div>
  </div>
  <div class="tabs">
    <button class="tab-btn">Detection</button>
    <button class="tab-btn">Alerting</button>
  </div>
  <div class="tab-panel"><p>Compare rendered state against desired.</p></div>
  <div class="tab-panel"><p>Alert only on sustained drift.</p></div>
</main>
<footer class="footer-note">hellodk.io · Deepak Gupta</footer>
</body></html>`;

describe('convertHtml — app shell layout', () => {
  it('strips topbar, sidebar and footer chrome', () => {
    const { body } = convertHtml(APP_SHELL);
    for (const marker of ['On This Page', '7 min read', 'hellodk.io · Deepak', 'Observability']) {
      expect(body).not.toContain(marker);
    }
  });

  it('keeps the hero paragraph, which is body prose not chrome', () => {
    expect(convertHtml(APP_SHELL).body).toContain('Config drift went unnoticed');
  });

  it('turns .tab-btn labels into H2 on their .tab-panel', () => {
    const { body } = convertHtml(APP_SHELL);
    expect(body).toContain('## Detection');
    expect(body).toContain('## Alerting');
  });

  it('falls back to the hero paragraph when meta description is absent', () => {
    expect(convertHtml(APP_SHELL).description).toBe(
      'Config drift went unnoticed for six weeks before anyone looked.',
    );
  });

  it('still strips the — hellodk title suffix', () => {
    expect(convertHtml(APP_SHELL).title).toBe('Drift Detector');
  });

  // Five manifest sources have no meta description, no .hero p, no header .sub
  // and no .section-desc. They must not fall through to description = title.
  it('falls back to the first substantial body paragraph as a last resort', () => {
    const html = `<html><head><title>Guide</title></head><body><main>
      <h2>Overview</h2>
      <p>Short.</p>
      <p>LDAP, SSO, OIDC, OAuth 2.0 and SAML 2.0 explained with the trade-offs that matter in practice.</p>
    </main></body></html>`;
    const { description } = convertHtml(html);
    expect(description).toBe(
      'LDAP, SSO, OIDC, OAuth 2.0 and SAML 2.0 explained with the trade-offs that matter in practice.',
    );
  });

  // git-concepts.html is the only source using <header class="header">, with a
  // .header-title that duplicates the <title> and a .header-sub badge string.
  it('strips the fourth header layout so the title is not duplicated in the body', () => {
    const html = `<html><head><title>Git Concepts — Visual Guide</title></head><body>
      <header class="header">
        <div class="header-icon">🌿</div>
        <div class="header-title">Git Concepts — Visual Guide</div>
        <div class="header-sub">Merge · Rebase · Squash · Cherry-Pick</div>
      </header>
      <main><p>Two branches co-exist and then diverge, which is where the trouble starts.</p></main>
    </body></html>`;
    const { body, description } = convertHtml(html);
    expect(body).not.toContain('Git Concepts — Visual Guide');
    expect(body).not.toContain('Merge · Rebase · Squash');
    expect(description).toBe('Two branches co-exist and then diverge, which is where the trouble starts.');
  });

  // Two sources parse badly enough that node-html-parser exposes no <body>
  // and no <nav>, so selector-based chrome removal cannot reach their TOC.
  it('strips a mid-document navigation strip', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <p>An opening paragraph comfortably longer than sixty characters for the test.</p>
      <p><a href="#a">CocoaPods Internals</a> <a href="#b">SPM</a> <a href="#c">Build Phases</a></p>
      <p>Real prose continues here, also longer than sixty characters in total.</p>
    </main></body></html>`;
    const { body } = convertHtml(html);
    expect(body).not.toContain('CocoaPods Internals');
    expect(body).toContain('Real prose continues here');
  });

  it('never strips the body to nothing', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <p><a href="#a">One</a> <a href="#b">Two</a> <a href="#c">Three</a></p>
    </main></body></html>`;
    // Every block looks like navigation, so the classification must be wrong.
    expect(convertHtml(html).body).not.toBe('');
  });

  it('keeps a two-anchor prose line that is the only block', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <p>Refer to <a href="#x">X</a> and <a href="#y">Y</a>.</p>
    </main></body></html>`;
    expect(convertHtml(html).body).toContain('Refer to');
  });

  it('keeps prose that merely cites several anchors', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <p>See <a href="#a">A</a>, <a href="#b">B</a> and <a href="#c">C</a> for the derivation and a worked example.</p>
    </main></body></html>`;
    expect(convertHtml(html).body).toContain('for the derivation');
  });

  it('strips a leading table of contents even when selectors cannot reach it', () => {
    const html = `<html><head><title>Zellij</title></head><body>
      <nav class="sidebar">
        <div class="side-label">Why</div>
        <a href="#problem">The Problem</a>
        <a href="#why">Why Zellij</a>
        <div class="side-label">Architecture</div>
        <a href="#overview">Overview</a>
        <a href="#flow">Session Lifecycle</a>
      </nav>
      <main><p>Sessions pile up and names get lost, which is the whole problem.</p></main>
    </body></html>`;
    const { body } = convertHtml(html);
    expect(body).not.toMatch(/\]\(#/);
    expect(body).not.toContain('Architecture');
    expect(body.trimStart()).toMatch(/^Sessions pile up/);
  });

  it('leaves real anchor links in body prose alone', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <p>An opening paragraph that is comfortably longer than sixty characters.</p>
      <p>See <a href="#later">the later section</a> for the full derivation and worked example.</p>
    </main></body></html>`;
    const { body } = convertHtml(html);
    expect(body).toContain('[the later section](#later)');
    expect(body.trimStart()).toMatch(/^An opening paragraph/);
  });

  it('does not use a list or blockquote block as the description', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <ul><li>A bullet item long enough on its own to clear the sixty character threshold</li>
          <li>Another bullet item that is also comfortably past sixty characters</li></ul>
      <blockquote>A blockquote that is likewise longer than sixty characters in total.</blockquote>
      <p>The genuine opening paragraph, comfortably longer than sixty characters.</p>
    </main></body></html>`;
    expect(convertHtml(html).description).toBe(
      'The genuine opening paragraph, comfortably longer than sixty characters.',
    );
  });

  it('does not use a heading, code block or table row as the description', () => {
    const html = `<html><head><title>T</title></head><body><main>
      <h2>A heading that is definitely longer than sixty characters in total</h2>
      <pre>a code block line that is also longer than sixty characters here</pre>
      <p>The real opening paragraph, comfortably longer than sixty characters.</p>
    </main></body></html>`;
    expect(convertHtml(html).description).toBe(
      'The real opening paragraph, comfortably longer than sixty characters.',
    );
  });
});

describe('convertHtml — frontmatter', () => {
  it('reads the title and strips a hellodk suffix', () => {
    const { title } = convertHtml('<html><head><title>Thing — hellodk</title></head><body><p>x</p></body></html>');
    expect(title).toBe('Thing');
  });

  it('reads the title from the concept guide', () => {
    expect(convertHtml(CONCEPT_GUIDE).title).toBe('The Perils of Timezone — A Complete Visual Guide');
  });

  it('reads the meta description', () => {
    expect(convertHtml(CONCEPT_GUIDE).description).toBe('Why UTC is the only sane default.');
  });
});

describe('convertHtml — SVG preservation', () => {
  it('keeps the diagram SVG in the body', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    expect(body).toContain('<svg viewBox="0 0 720 300"');
    expect(body).toContain('One Real Event');
  });

  it('drops the decorative chrome icon SVG', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    expect(body).not.toContain('viewBox="0 0 24 24"');
  });

  it('does not leave SVG label text as loose prose', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    // the label appears exactly once — inside the svg, not also as a paragraph
    expect(body.split('One Real Event')).toHaveLength(2);
  });

  // Substring check, not a regex on the exact token shape. Turndown escapes
  // some characters in text, so a leftover placeholder can differ from what we
  // emitted — an earlier version of this test used /%%SVG_\d+%%/ and passed
  // vacuously while `%%SVG\_0%%` sat in the output. `%%SVG` catches every variant.
  it('leaves no placeholder tokens behind', () => {
    expect(convertHtml(CONCEPT_GUIDE).body).not.toContain('%%SVG');
  });

  // Pins the property the placeholder depends on, independently of convertHtml.
  it('uses a placeholder Turndown does not escape', () => {
    const td = new TurndownService();
    expect(td.turndown('<p>%%SVG0%%</p>')).toBe('%%SVG0%%');
  });
});

describe('convertHtml — structure', () => {
  it('turns tab panels into H2 sections', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    expect(body).toContain('## The Trap');
    expect(body).toContain('## The Discipline');
  });

  it('turns .section-title into H3', () => {
    expect(convertHtml(CONCEPT_GUIDE).body).toContain('### It works on your laptop.');
  });

  it('turns pre into a fenced code block', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    expect(body).toMatch(/```\w*\nkubectl get pods -A\n```/);
  });

  it('turns table into a markdown table', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    expect(body).toContain('| Layer | Zone |');
    expect(body).toContain('| DB | UTC |');
  });
});

describe('convertHtml — chrome removal', () => {
  it.each(['by hellodk', '06 Aug 2026', 'switchTab', '.diagram{padding'])(
    'removes chrome fragment %s',
    (fragment) => { expect(convertHtml(CONCEPT_GUIDE).body).not.toContain(fragment); },
  );

  it('drops the leading h1, since the layout renders the title', () => {
    const { body } = convertHtml(CONCEPT_GUIDE);
    expect(body).not.toMatch(/^#\s+The Perils of Timezone/m);
  });
});

describe('inferLanguage', () => {
  it('tags shell commands as bash', () => {
    const { body } = convertHtml('<html><body><pre>kubectl get pods</pre></body></html>');
    expect(body).toContain('```bash');
  });

  it('tags yaml by its apiVersion key', () => {
    const { body } = convertHtml('<html><body><pre>apiVersion: v1\nkind: Pod</pre></body></html>');
    expect(body).toContain('```yaml');
  });

  it('tags json by its leading brace', () => {
    const { body } = convertHtml('<html><body><pre>{\n  "a": 1\n}</pre></body></html>');
    expect(body).toContain('```json');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/html-to-md.test.mjs`
Expected: FAIL — `Failed to resolve import "../../scripts/lib/html-to-md.mjs"`

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/html-to-md.mjs`:

```js
/**
 * Convert a self-contained blog HTML page into markdown, preserving inline
 * SVG diagrams verbatim.
 *
 * The previous migration stripped every tag with /<[^>]+>/g, which removed the
 * SVG elements while keeping their <text> labels as loose prose, and flattened
 * <pre> blocks into paragraphs. Turndown must never see an SVG — the subtrees
 * are pulled out to placeholders first and re-injected afterwards.
 */
import { parse } from 'node-html-parser';
import TurndownService from 'turndown';

/**
 * Page furniture. Removed before SVG extraction so decorative icons go with it.
 *
 * Derived by surveying all 33 post-like sources in the corpus, which use three
 * layouts, not two: Concept Guide (`header.top` + `.tabbar`), Narrative
 * (`.page` + `.tag-strip`), and App Shell (`.topbar` + `.sidebar`).
 *
 * `.hero` is deliberately NOT here. It holds the post's opening paragraph
 * (41–122 words across the corpus) and is the description fallback below.
 * Only its metadata children are chrome.
 *
 * The tab bars are safe to remove: every `.tabs`/`.tab-nav`/`.tabbar` in the
 * corpus was verified to contain buttons only, never panels. Removing a
 * container that wrapped the panels would delete the entire post body.
 */
const CHROME_SELECTORS = [
  'style', 'script', 'noscript',
  // `head` and friends matter because two sources (salt-concepts, zellij) are
  // malformed enough that node-html-parser exposes no <body> element at all.
  // The `?? root.innerHTML` fallback at step 7 then drags <head> in, putting
  // the <title> text at the top of the body. Safe to remove here: title and
  // description are read at step 1, before this runs.
  'head', 'title', 'meta', 'link',
  // page furniture. `header.header` is a fourth header layout, used by
  // git-concepts.html alone: its .header-title duplicates the <title> into the
  // body and its .header-sub is a middot-separated badge string that the
  // description fallback would otherwise ship as the SEO description.
  'header.top', 'header.header', '.header-title', '.header-sub',
  '.topbar', '.sidebar', '.toc', '#toc', 'footer', '.footer', '.footer-note',
  // byline and metadata strips
  '.byline', '.meta', '.hero-meta', '.topbar-meta', '.tag-strip', '.hero-eyebrow', '.hero-badge',
  // tab bars (buttons only — verified)
  '.tabbar', '.tabs', '.tab-nav', '.tab-nav-inner', '.nav-label', '.nav-link',
  // decorative icons
  '.header-icon', '.topbar-icon',
];

/**
 * Drop table-of-contents and navigation strips from the converted markdown.
 *
 * Selector-based chrome removal cannot reach every TOC. In two sources
 * (salt-concepts, zellij) node-html-parser exposes neither a <body> nor the
 * <nav class="sidebar"> inside it — `querySelectorAll('nav')` returns 0 even
 * though the tag is in the file — so `.sidebar` never matches and the TOC
 * survives. This works on the shape of the output instead of the markup, so
 * it is immune to how badly the source parsed.
 *
 * A TOC block is 2+ same-page anchor links with little other text. Short
 * label blocks ("Why", "Architecture") sit between the anchor runs and are
 * skipped only when an anchor block follows. If no anchor block is ever seen,
 * nothing is removed.
 */
function stripNavigation(body) {
  const anchorCount = (b) => (b.match(/\]\(#[^)]+\)/g) || []).length;
  const nonLinkLength = (b) => b.replace(/\[[^\]]*\]\(#[^)]+\)/g, '').replace(/\s+/g, '').length;
  // Real navigation is pure links: every TOC and nav strip in the corpus has
  // ZERO non-link characters (separators like `·` add one or two). Prose that
  // cites anchors always carries real words between them. A loose threshold
  // here silently eats an opening paragraph — `<60` consumed
  // "See [A](#a), [B](#b) and [C](#c) for the derivation." (41 chars).
  const isNav = (b) => nonLinkLength(b) < 10;
  const isToc = (b) => anchorCount(b) >= 2 && isNav(b);
  const isLabel = (b) => b.trim().length <= 25 && !b.includes('\n') && anchorCount(b) === 0;

  // Mid-document needs 3+ anchors: a two-anchor line deep in the body is far
  // more likely to be prose than navigation.
  const isNavStrip = (b) => anchorCount(b) >= 3 && isNav(b);

  let blocks = body.split(/\n\s*\n/);

  let i = 0;
  let sawToc = false;
  while (i < blocks.length) {
    if (isToc(blocks[i])) { sawToc = true; i += 1; continue; }
    if (isLabel(blocks[i]) && blocks[i + 1] && isToc(blocks[i + 1])) { i += 1; continue; }
    break;
  }
  if (sawToc) blocks = blocks.slice(i);

  const kept = blocks.filter((b) => !isNavStrip(b));

  // Never strip the document to nothing. If every block looked like navigation
  // the classification is wrong, and an empty post is worse than a stray nav line.
  const result = kept.join('\n\n').trim();
  return result || body;
}

function inferLanguage(code) {
  const t = code.trim();
  if (/^\s*[{[]/.test(t)) return 'json';
  if (/^(apiVersion|kind|metadata|spec):/m.test(t)) return 'yaml';
  if (/^\s*(\$|#\s|sudo |kubectl |salt |git |npm |docker |brew |systemctl )/m.test(t)) return 'bash';
  if (/^\s*(def |import |from \w+ import)/m.test(t)) return 'python';
  if (/^\s*(const |let |function |export )/m.test(t)) return 'js';
  return 'bash';
}

function buildTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  td.addRule('fencedPre', {
    filter: 'pre',
    replacement: (_content, node) => {
      const code = node.textContent.replace(/\n+$/, '');
      return `\n\n\`\`\`${inferLanguage(code)}\n${code}\n\`\`\`\n\n`;
    },
  });

  td.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
      // Array.from, not spread. Turndown parses with its bundled
      // @mixmark-io/domino, whose NodeList has `length` and indexed access but
      // no Symbol.iterator — `[...nodeList]` throws "not iterable". These
      // nodes are domino's, not node-html-parser's, so the rest of this module
      // can spread freely but this rule cannot.
      const rows = Array.from(node.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th,td')).map((c) => c.textContent.trim().replace(/\|/g, '\\|')),
      );
      if (!rows.length) return '';
      const [head, ...rest] = rows;
      const line = (cells) => `| ${cells.join(' | ')} |`;
      const sep = `| ${head.map(() => '---').join(' | ')} |`;
      return `\n\n${[line(head), sep, ...rest.map(line)].join('\n')}\n\n`;
    },
  });

  return td;
}

export function convertHtml(html) {
  const root = parse(String(html), { blockTextElements: { script: true, style: true } });

  // 1. Head metadata, before anything is removed.
  const title = (root.querySelector('title')?.textContent ?? '')
    .replace(/\s*[—|]\s*hellodk.*$/i, '')
    .trim();
  // 21 of 33 sources have no <meta name="description">, so fall back through
  // the layouts: App Shell keeps its lede in `.hero p`, Concept Guide in
  // `header .sub`, and some guides only have a `.section-desc`. Unscoped `.sub`
  // is NOT usable — several sources reuse it for stat-card sublabels.
  let description = (
    root.querySelector('meta[name="description"]')?.getAttribute('content')
    || root.querySelector('.hero p')?.textContent
    || root.querySelector('header .sub')?.textContent
    || root.querySelector('.section-desc')?.textContent
    || ''
  ).replace(/\s+/g, ' ').trim().slice(0, 300);

  // 2. Tab labels become H2 headings on their panels, before the bar is removed.
  // Selector coverage across the corpus: `.tab-panel` 10 files, `.tab` 8,
  // `.tab-btn` 4, `.tabbar .tab` and `section.panel` 1 each — so all the
  // variants are needed, not just the Concept Guide pair.
  const bar = root.querySelector('.tabbar, .tabs, .tab-nav');
  const tabLabels = bar
    ? bar.querySelectorAll('.tab-btn, .tab, button').map((tab) => {
        tab.querySelector('.tab-num')?.remove();
        return tab.textContent.replace(/\s+/g, ' ').trim();
      }).filter(Boolean)
    : [];
  root.querySelectorAll('.tab-panel, section.panel, .panel').forEach((panel, i) => {
    if (tabLabels[i]) panel.insertAdjacentHTML('afterbegin', `<h2>${tabLabels[i]}</h2>`);
  });

  // 3. .section-title becomes H3.
  root.querySelectorAll('.section-title').forEach((el) => {
    el.replaceWith(`<h3>${el.innerHTML}</h3>`);
  });

  // 4. Strip chrome. This also removes decorative icon SVGs inside it.
  for (const sel of CHROME_SELECTORS) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // 5. The layout renders the title, so drop the leading h1.
  root.querySelector('h1')?.remove();

  // 6. Pull the surviving (diagram) SVGs out before Turndown can see them.
  //
  // The placeholder must contain NO character Turndown escapes in text.
  // `%%SVG_0%%` does not work: Turndown backslash-escapes `_` to avoid stray
  // emphasis, yielding `%%SVG\_0%%`, which the re-injection regex below then
  // fails to match — the SVG is silently dropped and the literal token ships.
  // `%%SVG0%%` round-trips unchanged.
  const svgs = [];
  root.querySelectorAll('svg').forEach((svg) => {
    svgs.push(svg.outerHTML);
    svg.replaceWith(`<p>%%SVG${svgs.length - 1}%%</p>`);
  });

  // 7. Convert.
  const source = root.querySelector('body')?.innerHTML ?? root.innerHTML;
  let body = buildTurndown().turndown(source);

  // 8. Re-inject the SVGs verbatim.
  body = body.replace(/%%SVG(\d+)%%/g, (_m, i) => `\n\n${svgs[Number(i)]}\n\n`);

  body = body.replace(/\n{3,}/g, '\n\n').trim();
  body = stripNavigation(body);

  // Last resort: the first substantial prose paragraph of the converted body.
  // Five manifest sources reach here (kri-ops-guide, git-concepts,
  // ios-android-build-guide, auth-concepts, local-llm-inference-architecture).
  // Without it the orchestrator sets description = title, which duplicates the
  // heading on cards and in SEO meta.
  // Delegates to firstProseParagraph so HTML- and markdown-sourced posts apply
  // the identical prose guard. Skips headings, raw HTML (re-injected SVG), code
  // fences, table rows, bullet and numbered list items, blockquotes and
  // horizontal rules.
  if (!description) description = firstProseParagraph(body);

  return { title, description, body };
}

/**
 * The first block of real prose in a markdown body, cleaned for use as a
 * description. Exported so the orchestrator can apply the same guard to
 * markdown-sourced posts — without it those descriptions come out as
 * metadata lines, shell commands or horizontal rules.
 */
export function firstProseParagraph(markdown, limit = 300) {
  const NOT_PROSE = /^([#<|]|```|[-*>]\s|\d+[.)]\s|-{3,}|={3,})/;
  const block = String(markdown).split(/\n\s*\n/).find((b) => {
    const t = b.trim();
    return t.length > 60 && !NOT_PROSE.test(t);
  }) || '';
  return decodeEntities(block)
    .replace(/[#*`>[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

/** Markdown sources carry raw HTML entities (`&mdash;` in nfs-meltdown). */
export function decodeEntities(text) {
  const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '\u2014', ndash: '\u2013', hellip: '\u2026' };
  return String(text)
    .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED[name.toLowerCase()] ?? m);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/unit/html-to-md.test.mjs`
Expected: PASS. If the `table` rule does not fire, confirm Turndown is receiving the table before the chrome pass removes it — tables are not in `CHROME_SELECTORS`, so a failure here means a selector is over-matching.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/html-to-md.mjs tests/unit/html-to-md.test.mjs
git commit -m "Add parser-based HTML to markdown converter.

Extracts SVG subtrees to placeholders before Turndown runs, so diagrams
survive verbatim instead of being reduced to loose label text. Chrome is
stripped first, which also drops decorative 24x24 icon SVGs.

Refs #1"
```

---

### Task 4: Post manifest

Static reviewed data — no logic. Tags come from each source's `<meta name="keywords">` where present (16 of 41), and from subject matter otherwise.

**Files:**
- Create: `scripts/lib/manifest.mjs`
- Test: `tests/unit/manifest.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `POSTS: Array<{ src: string, slug: string, date: string, tags: string[], draft: boolean }>` — 42 entries. `src` is relative to `/home/dk/Documents/blogs`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/manifest.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { POSTS } from '../../scripts/lib/manifest.mjs';
import { maskSlug } from '../../scripts/lib/mask.mjs';

describe('POSTS manifest', () => {
  it('has 42 entries', () => {
    expect(POSTS).toHaveLength(42);
  });

  it('has 34 live and 8 draft', () => {
    expect(POSTS.filter((p) => !p.draft)).toHaveLength(34);
    expect(POSTS.filter((p) => p.draft)).toHaveLength(8);
  });

  it('has unique slugs', () => {
    const slugs = POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has unique source paths', () => {
    const srcs = POSTS.map((p) => p.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it('uses ISO dates', () => {
    for (const p of POSTS) expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('gives every post between 1 and 4 lowercase tags', () => {
    for (const p of POSTS) {
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.tags.length).toBeLessThanOrEqual(4);
      for (const t of p.tags) expect(t).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('carries no unmasked project name in a slug', () => {
    for (const p of POSTS) expect(p.slug).not.toContain('avika');
  });

  // This is what maskSlug is for: every manifest slug must already be its own
  // masked, normalised form, so the orchestrator never has to rewrite a filename.
  it('stores every slug in already-masked form', () => {
    for (const p of POSTS) expect(maskSlug(p.slug)).toBe(p.slug);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/manifest.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `scripts/lib/manifest.mjs`:

```js
/**
 * The 42 posts migrated from ~/Documents/blogs.
 *
 * Static reviewed data. `src` is relative to the blogs root. Rebuild entries
 * keep the date already published, so URLs and ordering do not shift.
 *
 * Excluded by design: nfs-meltdown (Copy)/ (duplicate), linux_hacks.md
 * (222 bytes) and nginx_tutorials.md (81 bytes) (near-empty stubs, not posts),
 * docs/ (superpowers internals), and the five build artifacts
 * (redesign-mockup, animation-preview, traffic-animations,
 * token-consumption-24h, token-consumption.svg).
 */
export const POSTS = [
  // ---- Rebuilt: post already exists, date preserved from its frontmatter ----
  { src: '2026-04-25-browser-rdp-zero-ports/2026-04-25-browser-rdp-zero-ports.md', slug: 'browser-rdp-zero-ports', date: '2026-04-25', tags: ['kubernetes', 'networking', 'rdp'], draft: false },
  { src: '2026-05-23-gnome-thumbnails-broke/2026-05-23-gnome-thumbnails-broke.html', slug: 'gnome-thumbnails-broke', date: '2026-05-23', tags: ['linux', 'ubuntu', 'gnome', 'debugging'], draft: false },
  { src: '2026-05-27-kri-knowledge-graph-graphify/2026-05-27-kri-knowledge-graph-graphify.html', slug: 'kri-knowledge-graph-graphify', date: '2026-05-27', tags: ['kri', 'knowledge-graph', 'graphify'], draft: false },
  { src: '2026-05-27-macos-vms-tart-salt/2026-05-27-macos-vms-tart-salt.html', slug: 'macos-vms-tart-salt', date: '2026-05-27', tags: ['macos', 'saltstack', 'virtualization'], draft: false },
  { src: '2026-05-28-graphify-token-enforcement/2026-05-28-graphify-token-enforcement.html', slug: 'graphify-token-enforcement', date: '2026-05-28', tags: ['graphify', 'llm', 'tokens'], draft: false },
  { src: 'kri-fleet-management/kri-fleet-management.html', slug: 'kri-fleet-management', date: '2026-05-15', tags: ['kri', 'devops', 'fleet-management'], draft: false },
  { src: 'kube_dns_split_dns_ubuntu24/kube_dns_split_dns_ubuntu24.md', slug: 'kube-dns-split-dns-ubuntu24', date: '2026-05-01', tags: ['kubernetes', 'dns', 'ubuntu'], draft: false },
  { src: 'monitoring-blog/monitoring-blog.md', slug: 'kubernetes-monitoring', date: '2026-05-01', tags: ['kubernetes', 'monitoring', 'prometheus'], draft: false },
  { src: 'pnpm-the-smarter-package-manager/pnpm-the-smarter-package-manager.html', slug: 'pnpm-smarter-package-manager', date: '2026-04-01', tags: ['nodejs', 'pnpm', 'tooling'], draft: false },

  // ---- Bucket A: dated posts, date from the directory name ----
  { src: '2026-05-28-graphify-obsidian-vault/2026-05-28-graphify-obsidian-vault.html', slug: 'graphify-obsidian-vault', date: '2026-05-28', tags: ['graphify', 'obsidian', 'knowledge-graph'], draft: false },
  { src: '2026-05-30-salt-concepts.html', slug: 'salt-concepts', date: '2026-05-30', tags: ['saltstack', 'devops', 'automation'], draft: false },
  { src: '2026-05-31-rag-for-kri-fleet-assistant.html', slug: 'rag-for-kri-fleet-assistant', date: '2026-05-31', tags: ['rag', 'llm', 'kri'], draft: false },
  { src: '2026-06-08-agentic-mcp-gateways/2026-06-08-agentic-mcp-gateways.html', slug: 'agentic-mcp-gateways', date: '2026-06-08', tags: ['mcp', 'agents', 'llm'], draft: false },
  { src: '2026-06-09-kri-agentic-fleet-assistant/2026-06-09-kri-agentic-fleet-assistant.html', slug: 'kri-agentic-fleet-assistant', date: '2026-06-09', tags: ['agents', 'kri', 'llm', 'saltstack'], draft: false },
  { src: '2026-06-09-rag-embeddings-vector-db/2026-06-09-rag-embeddings-vector-db.html', slug: 'rag-embeddings-vector-db', date: '2026-06-09', tags: ['rag', 'embeddings', 'pgvector'], draft: false },
  { src: '2026-06-21-kri-salt-deployment/2026-06-21-kri-salt-deployment.html', slug: 'kri-salt-deployment', date: '2026-06-21', tags: ['saltstack', 'macos', 'kri', 'launchd'], draft: false },
  { src: '2026-06-28-typhoon-wifi-cpu-powersave/2026-06-28-typhoon-wifi-cpu-powersave.html', slug: 'typhoon-wifi-cpu-powersave', date: '2026-06-28', tags: ['kubernetes', 'k0s', 'calico', 'networking'], draft: false },
  { src: '2026-07-17-tmux-session-manager/2026-07-17-tmux-session-manager.html', slug: 'tmux-session-manager', date: '2026-07-17', tags: ['tmux', 'terminal', 'dotfiles'], draft: false },
  { src: '2026-07-17-zellij-session-manager/2026-07-17-zellij-session-manager.html', slug: 'zellij-session-manager', date: '2026-07-17', tags: ['zellij', 'terminal', 'dotfiles'], draft: false },
  { src: '2026-08-02-ai-git-branching-strategy/2026-08-02-ai-git-branching-strategy.html', slug: 'ai-git-branching-strategy', date: '2026-08-02', tags: ['git', 'ai', 'workflow'], draft: false },
  { src: '2026-08-02-two-mac-minis-mlx-debugging/2026-08-02-two-mac-minis-mlx-debugging.html', slug: 'two-mac-minis-mlx-debugging', date: '2026-08-02', tags: ['macos', 'mlx', 'debugging', 'networking'], draft: false },
  { src: '2026-08-04-drift-detector-observability/2026-08-04-drift-detector-observability.html', slug: 'drift-detector-observability', date: '2026-08-04', tags: ['observability', 'prometheus', 'kubernetes'], draft: false },
  { src: '2026-08-06-perils-of-timezone/2026-08-06-perils-of-timezone.html', slug: 'perils-of-timezone', date: '2026-08-06', tags: ['timezone', 'distributed-systems', 'observability'], draft: false },
  { src: '2026-08-07-homelab-sso-consolidation/2026-08-07-homelab-sso-consolidation.html', slug: 'homelab-sso-consolidation', date: '2026-08-07', tags: ['sso', 'keycloak', 'homelab', 'cloudflare'], draft: false },

  // ---- Bucket B: undated guides, date from source mtime ----
  { src: 'save-tokens-and-better-prompts/save-tokens-and-better-prompts.md', slug: 'save-tokens-and-better-prompts', date: '2026-03-04', tags: ['llm', 'prompting', 'tokens'], draft: false },
  { src: 'custom-vs-code-plugin/custom-vs-code-plugin.md', slug: 'custom-vs-code-plugin', date: '2026-04-08', tags: ['vscode', 'tooling'], draft: true },
  { src: 'nfs-meltdown/blog-nfs-meltdown.md', slug: 'nfs-meltdown', date: '2026-05-10', tags: ['nfs', 'kubernetes', 'incident', 'storage'], draft: false },
  { src: 'e2e-testing-token-efficiency/e2e-testing-token-efficiency.html', slug: 'e2e-testing-token-efficiency', date: '2026-05-21', tags: ['testing', 'e2e', 'tokens'], draft: false },
  { src: 'kri-ops-guide/kri-ops-guide.html', slug: 'kri-ops-guide', date: '2026-05-21', tags: ['kri', 'operations', 'devops'], draft: false },
  { src: 'engineering-reliability-testing-strategy/engineering-reliability-testing-strategy.html', slug: 'engineering-reliability-testing-strategy', date: '2026-05-23', tags: ['testing', 'reliability', 'engineering'], draft: false },
  { src: 'kri-testing-strategy/kri-testing-strategy.html', slug: 'kri-testing-strategy', date: '2026-05-23', tags: ['kri', 'testing', 'strategy'], draft: false },
  { src: 'git-concepts/git-concepts.html', slug: 'git-concepts', date: '2026-05-27', tags: ['git', 'concepts', 'version-control'], draft: false },
  { src: 'ios-android-build-guide.html', slug: 'ios-android-build-guide', date: '2026-06-01', tags: ['ios', 'android', 'ci', 'mobile'], draft: false },
  { src: 'auth-concepts.html', slug: 'auth-concepts', date: '2026-06-06', tags: ['auth', 'oidc', 'security', 'concepts'], draft: false },
  { src: 'local-llm-inference-architecture.html', slug: 'local-llm-inference-architecture', date: '2026-07-17', tags: ['llm', 'inference', 'architecture'], draft: false },

  // ---- Bucket C: internal notes, all draft ----
  { src: 'using_operators.md', slug: 'using-operators', date: '2021-12-07', tags: ['kubernetes', 'operators'], draft: true },
  { src: 'incident-investigation-2026-02-22.md', slug: 'incident-investigation-2026-02-22', date: '2026-02-22', tags: ['incident', 'postmortem'], draft: true },
  { src: 'linkedin-post-network-spike.md', slug: 'linkedin-post-network-spike', date: '2026-03-01', tags: ['networking', 'incident'], draft: true },
  { src: 'grafana-screenshot-guide.md', slug: 'grafana-screenshot-guide', date: '2026-03-01', tags: ['grafana', 'monitoring'], draft: true },
  { src: 'avika_deep_analysis.md.resolved', slug: 'atlas-deep-analysis', date: '2026-03-03', tags: ['analysis', 'observability'], draft: true },
  { src: 'blog-network-spike-investigation.md', slug: 'network-spike-investigation', date: '2026-04-08', tags: ['networking', 'incident', 'debugging'], draft: true },
  { src: 'kube-system-priority-classes.md', slug: 'kube-system-priority-classes', date: '2026-05-11', tags: ['kubernetes', 'scheduling'], draft: true },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/unit/manifest.test.mjs`
Expected: PASS.

- [ ] **Step 5: Verify every source path exists on disk**

Run:

```bash
node -e "
const {POSTS}=await import('./scripts/lib/manifest.mjs');
const fs=await import('fs');
const missing=POSTS.filter(p=>!fs.existsSync('/home/dk/Documents/blogs/'+p.src));
console.log(missing.length?missing.map(m=>m.src):'all 41 sources present');
" --input-type=module
```

Expected: `all 41 sources present`

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/manifest.mjs tests/unit/manifest.test.mjs
git commit -m "Add post manifest: 42 entries, 34 live and 8 draft.

Refs #1"
```

---

### Task 5: Migration orchestrator

**Files:**
- Create: `scripts/migrate-blogs.mjs`
- Delete: `scripts/migrate-blogs-2026.mjs`
- Create: `src/styles/diagrams.css`
- Modify: `src/layouts/BaseLayout.astro:2`

**Interfaces:**
- Consumes: `POSTS` (Task 4), `convertHtml` (Task 3), `maskText` / `findUnmasked` (Task 2)
- Produces: 42 files in `src/content/blog/`, and `public/assets/blog/nfs-meltdown/*.svg` for the one post with external assets

Only `nfs-meltdown` references local assets — six sibling `.svg` files (`./architecture.svg`, `./cpu-distribution.svg`, `./timeline.svg`, `./cascade.svg`, `./self-referencing-nfs.svg`, `./load-recovery.svg`). They are copied into `public/assets/blog/nfs-meltdown/` and the `./` prefix rewritten.

- [ ] **Step 0: Test the shared helpers first (TDD)**

Add to `tests/unit/html-to-md.test.mjs`. These cover the two exports the
orchestrator now depends on. Run `npm test -- tests/unit/html-to-md.test.mjs`
and confirm they FAIL before writing the exports.

```js
describe('firstProseParagraph', () => {
  it('skips a metadata line and picks the real prose', () => {
    const md = '**Date**: 2026-03-03 **Analyst Role**: Principal Architect Reviewer Person\n\n'
      + 'The cluster degraded slowly over six weeks before anyone correlated the graphs.';
    expect(firstProseParagraph(md)).toBe(
      'The cluster degraded slowly over six weeks before anyone correlated the graphs.',
    );
  });

  it('skips a shell command block', () => {
    const md = 'code --uninstall-extension aidev-oss.aidev code --install-extension foo.bar\n\n'
      + 'This extension replaces the default completion provider with a local model.';
    expect(firstProseParagraph(md)).toBe(
      'This extension replaces the default completion provider with a local model.',
    );
  });

  it('skips a horizontal rule', () => {
    const md = '---------------------------------------------------------------------\n\n'
      + 'Operators extend the Kubernetes API with domain-specific controllers here.';
    expect(firstProseParagraph(md)).toBe(
      'Operators extend the Kubernetes API with domain-specific controllers here.',
    );
  });

  it('returns empty string when nothing qualifies', () => {
    expect(firstProseParagraph('# Heading\n\n- a\n- b')).toBe('');
  });
});

describe('decodeEntities', () => {
  it('decodes the named entities present in the corpus', () => {
    expect(decodeEntities('A &mdash; B &amp; C &nbsp;D')).toBe('A \u2014 B & C  D');
  });

  it('decodes numeric entities', () => {
    expect(decodeEntities('caf&#233;')).toBe('caf\u00e9');
  });

  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&notareal; thing')).toBe('&notareal; thing');
  });
});
```

The import line at the top of that file becomes:

```js
import { convertHtml, firstProseParagraph, decodeEntities } from '../../scripts/lib/html-to-md.mjs';
```

- [ ] **Step 1: Write the orchestrator**

Create `scripts/migrate-blogs.mjs`:

```js
#!/usr/bin/env node
/**
 * Regenerate src/content/blog from ~/Documents/blogs.
 *
 * The blogs directory is the source of truth: this script OVERWRITES its
 * output. Do not hand-edit posts under src/content/blog.
 *
 * Deliberately NOT wired into prebuild/build — it reads an absolute local
 * path that does not exist on Cloudflare's builder.
 *
 *   npm run migrate:blogs
 */
import fs from 'fs';
import path from 'path';
import { POSTS } from './lib/manifest.mjs';
import { convertHtml, firstProseParagraph, decodeEntities } from './lib/html-to-md.mjs';
import { maskText, findUnmasked } from './lib/mask.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOGS = '/home/dk/Documents/blogs';
const OUT = path.join(ROOT, 'src/content/blog');
const ASSETS = path.join(ROOT, 'public/assets/blog');

const yaml = (s) => JSON.stringify(String(s));

/** Strip an existing frontmatter block from a markdown source. */
function stripFrontmatter(raw) {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return m ? m[1] : raw;
}

/**
 * First markdown H1 becomes the title; the layout renders it, so remove it.
 *
 * Surveyed against the 13 markdown sources in the manifest: only one carries
 * frontmatter, two have no H1 at all (the orchestrator then derives a title
 * from the slug), and one references local images.
 *
 * Description reuses `firstProseParagraph` from html-to-md.mjs rather than
 * taking the first paragraph outright. Without the prose guard these sources
 * yield descriptions like:
 *   "**Date**: 2026-03-03 **Analyst Role**: Principal Architect"   (metadata)
 *   "code --uninstall-extension aidev-oss.aidev"                   (a command)
 *   "Install the operator: --------------------- yum update -y"    (code + rule)
 */
function fromMarkdown(raw) {
  const bodyRaw = stripFrontmatter(raw);
  const h1 = bodyRaw.match(/^#\s+(.+)$/m);
  const title = decodeEntities(h1 ? h1[1].trim() : '');
  const body = h1 ? bodyRaw.replace(h1[0], '').trim() : bodyRaw.trim();
  return { title, description: firstProseParagraph(body), body };
}

/** Collected failures; a non-empty list makes the script exit non-zero. */
const problems = [];

/**
 * Copy any sibling .svg the body references as `./name.svg` into
 * public/assets/blog/<slug>/ and rewrite the reference. Driven by what the
 * body actually cites, so no post is special-cased. Today only nfs-meltdown
 * has such references (6 files).
 */
function copyAssets(post, body) {
  const referenced = [...body.matchAll(/\.\/([\w.-]+\.svg)/g)].map((m) => m[1]);
  if (!referenced.length) return body;

  const srcDir = path.dirname(path.join(BLOGS, post.src));
  const dstDir = path.join(ASSETS, post.slug);
  fs.mkdirSync(dstDir, { recursive: true });

  let out = body;
  for (const file of new Set(referenced)) {
    const from = path.join(srcDir, file);
    if (!fs.existsSync(from)) {
      problems.push(`${post.slug}: referenced asset missing: ${file}`);
      continue;
    }
    fs.copyFileSync(from, path.join(dstDir, file));
    out = out.split(`./${file}`).join(`/assets/blog/${post.slug}/${file}`);
  }
  return out;
}

fs.mkdirSync(OUT, { recursive: true });

let written = 0;

for (const post of POSTS) {
  const src = path.join(BLOGS, post.src);
  if (!fs.existsSync(src)) {
    problems.push(`missing source: ${post.src}`);
    continue;
  }

  const raw = fs.readFileSync(src, 'utf8');
  const isHtml = /\.html$/i.test(post.src);
  let { title, description, body } = isHtml ? convertHtml(raw) : fromMarkdown(raw);

  if (!title) title = post.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  if (!description) description = title;

  body = copyAssets(post, body);

  // Mask last, over the finished markdown, so values inside SVG labels and
  // code blocks are caught too.
  title = maskText(title);
  description = maskText(description);
  body = maskText(body);

  const leaked = findUnmasked(`${title}\n${description}\n${body}`);
  if (leaked.length) problems.push(`${post.slug}: unmasked ${leaked.join(', ')}`);

  const frontmatter = [
    '---',
    `title: ${yaml(title)}`,
    `date: ${post.date}`,
    `description: ${yaml(description)}`,
    `tags: [${post.tags.join(', ')}]`,
    `draft: ${post.draft}`,
    '---',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(OUT, `${post.slug}.md`), `${frontmatter}\n${body}\n`);
  written += 1;
  console.log(`✓ ${post.slug}.md${post.draft ? '  (draft)' : ''}`);
}

console.log(`\nWrote ${written}/${POSTS.length} posts.`);

if (problems.length) {
  console.error('\n✗ Problems:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
```

- [ ] **Step 1a: Fix three defects the Task 5 review found**

**(a) `COMMAND_START` in `scripts/lib/html-to-md.mjs` is over-broad.** It matches
any block opening with a bare command word, so legitimate prose is silently
dropped and the post falls back to `description = title` with nothing in
`problems`:

```
firstProseParagraph('git is a distributed version control system ...')  ->  ''
firstProseParagraph('code editors have become the primary interface ...') ->  ''
```

A command word only counts when a flag or a path actually follows. Replace the
constant with:

```js
// A bare command word is not a command: "git is a distributed version control
// system" opens a legitimate post. Require a flag or a path to follow, or an
// explicit prompt / sudo. Verified against 15 cases, prose and commands both.
const CMD = '(?:git|docker|npm|npx|node|kubectl|salt|code|brew|systemctl|yum|apt|curl|ssh|helm|terraform|pod|tart)';
const COMMAND_START = new RegExp(
  '^(?:\\$|#\\s|sudo\\s)'
  + '|^' + CMD + '\\b(?:\\s+[\\w.:@=-]+){0,3}\\s+-{1,2}\\w'
  + '|^' + CMD + '\\b(?:\\s+[\\w.:@=-]+){0,2}\\s+\\S*/',
  'i',
);
```

**(b) `decodeEntities` can abort the whole migration.** `String.fromCodePoint`
throws `RangeError` outside `0..0x10FFFF`, and no call site wraps conversion in
a try/catch — one malformed `&#…;` in any source kills the run before the
collect-and-report path ever executes. Guard the range and pass the original
through unchanged:

```js
    .replace(/&#(\d+);/g, (m, d) => {
      const code = Number(d);
      return Number.isInteger(code) && code > 0 && code <= 0x10FFFF
        ? String.fromCodePoint(code)
        : m;
    })
```

**(c) An empty body is reported as success.** In `scripts/migrate-blogs.mjs`,
a source converting to nothing still writes a frontmatter-only file, increments
`written` and prints `✓`. Add a guard immediately before `fs.writeFileSync`:

```js
  // A source that converts to nothing is a failure, not a post. custom-vs-code-plugin
  // is a genuine 108-byte stub and sits just above this bar.
  if (body.trim().length < 50) {
    problems.push(`${post.slug}: converted body is ${body.trim().length} chars — source may not have parsed`);
  }
```

Tests to add to `tests/unit/html-to-md.test.mjs`:

```js
  it('keeps prose that merely opens with a command word', () => {
    for (const p of [
      'git is a distributed version control system that tracks changes over time.',
      'code editors have become the primary interface most developers use daily.',
      'docker changed how teams ship software by making the runtime an artifact.',
    ]) {
      expect(firstProseParagraph(p)).not.toBe('');
    }
  });

  it('still skips an actual command invocation', () => {
    expect(firstProseParagraph('kubectl get pods -A --all-namespaces')).toBe('');
    expect(firstProseParagraph('sudo systemctl restart nfs-server')).toBe('');
  });

  it('does not throw on an out-of-range numeric entity', () => {
    expect(() => decodeEntities('&#1200000;')).not.toThrow();
    expect(decodeEntities('&#1200000;')).toBe('&#1200000;');
  });
```

Run `npm run migrate:blogs` afterwards so the corrected description logic is
applied, then `npm test`.

- [ ] **Step 1a-ii: Close the false negative the fix for (a) opened**

Narrowing `COMMAND_START` to require a flag or path traded a false positive for
a false negative: a bare invocation with neither is now read as prose.

```
firstProseParagraph('kubectl get pods kubectl get svc kubectl get deployments today')
  -> 'kubectl get pods kubectl get svc ...'   (want '')
```

Add two more signals alongside the existing one. Both key on shape rather than
on the command word alone, so prose that merely mentions a tool still survives:

```js
const CMD_LINE = new RegExp('^\\s*' + CMD + '\\b', 'i');
const CMD_WORD = new RegExp('\\b' + CMD + '\\b', 'gi');

/**
 * A block is a command block if a flag/path/prompt follows a command word
 * (COMMAND_START), OR two or more of its lines begin with one, OR it names
 * three or more tools with no sentence-ending punctuation anywhere.
 *
 * The punctuation clause is what protects prose: "We compared git and docker
 * and npm across three teams." names three tools but ends a sentence, so it is
 * kept. Verified against 11 cases in both directions.
 */
function isCommandBlock(block) {
  if (COMMAND_START.test(block)) return true;
  const lines = block.split('\n').filter((l) => l.trim());
  if (lines.filter((l) => CMD_LINE.test(l)).length >= 2) return true;
  return (block.match(CMD_WORD) || []).length >= 3 && !/[.!?](\s|$)/.test(block);
}
```

In `firstProseParagraph`, replace the `COMMAND_START.test(block)` guard with
`isCommandBlock(block)`.

**Also fix two vacuous tests.** `'kubectl get pods -A --all-namespaces'` (36
chars) and `'sudo systemctl restart nfs-server'` (33 chars) both sit under the
independent `block.length <= 60` floor, so they return `''` whether or not the
command logic fires — they would pass with the matcher disabled entirely.
Replace them with blocks over 60 characters:

```js
  it('still skips an actual command invocation', () => {
    // Both over 60 chars, so the length floor cannot mask the result.
    expect(firstProseParagraph('kubectl get pods -A --all-namespaces and then inspect each namespace')).toBe('');
    expect(firstProseParagraph('sudo systemctl restart nfs-server then wait for the mount to return')).toBe('');
  });

  it('skips a bare command block with no flags or paths', () => {
    expect(firstProseParagraph('kubectl get pods kubectl get svc kubectl get deployments today')).toBe('');
    expect(firstProseParagraph('kubectl get pods\nkubectl get svc\nkubectl get deployments now')).toBe('');
  });

  it('keeps prose that names several tools in a sentence', () => {
    const p = 'We compared git and docker and npm across three teams over several months.';
    expect(firstProseParagraph(p)).toBe(p);
  });
```

- [ ] **Step 1a-iii: Invert the heuristic — test for prose, not for commands**

Three revisions of `isCommandBlock` produced three different failure directions.
Round 1 dropped prose opening with a command word. Round 2 missed bare
invocations. Round 3 dropped prose ending in `:`, `)` or `"`, and two-line
paragraphs whose lines begin with a capitalised tool name:

```
'The engineering team evaluated git, docker, and npm for the new workflow:'   -> '' (wrong)
'We tested git, docker, and npm (three popular tools) before deciding.'       -> '' (wrong)
'Git is powerful. It handles branching well.\nDocker containers replaced...'  -> '' (wrong)
```

Each round patched the symptom. The cause is that every version asked "does
this look like a command?" — an open-ended question with endless edge cases.
Ask the opposite instead: **does this read like English?** A shell block
essentially never contains two ordinary function words; a sentence essentially
always does. That is a bounded question with a stable answer.

Replace the whole guard with:

```js
/**
 * Ordinary English function words. The positive signal that a block is prose.
 * A shell invocation contains none of these; a sentence contains several.
 */
const FUNCTION_WORD = /\b(?:the|a|an|is|are|was|were|be|been|and|or|but|if|so|that|this|these|those|it|its|we|our|you|your|they|their|of|in|on|to|for|with|from|as|at|by|than|then|when|which|who|how|why|because|however|while)\b/gi;

/**
 * Flags and paths must be removed before scoring: `-A` and `--sort-by` would
 * otherwise register as the function words "a" and "by", scoring a pure
 * command block as prose.
 */
const stripCmdSyntax = (b) => b
  .replace(/(^|\s)-{1,2}[\w-]+/g, ' ')
  .replace(/\S+\/\S*/g, ' ')
  .replace(/[|&;]{1,2}/g, ' ');

const proseScore = (b) => (stripCmdSyntax(b).match(FUNCTION_WORD) || []).length;

/**
 * Command shape AND an absence of English. Shape alone is what produced three
 * rounds of false positives — prose that merely discusses tools has the shape
 * but reads like a sentence.
 *
 * Verified against 19 cases: 9 command forms (bare, flagged, chained, sudo,
 * multi-line) and 10 prose forms (ending in period, colon, paren, quote;
 * multi-line; naming two or three tools).
 */
function isCommandBlock(block) {
  const shaped =
    COMMAND_START.test(block)
    || block.split('\n').filter((l) => l.trim() && CMD_LINE.test(l)).length >= 2
    || (block.match(CMD_WORD) || []).length >= 2;
  return shaped && proseScore(block) < 2;
}
```

The `CMD_WORD` threshold drops from 3 to 2 because `proseScore` now carries the
false-positive protection; at 3, `npm run build && npm run preview …` was missed.

Tests to add — take verbatim, and note the prose set deliberately covers the
three terminators that broke round 3:

```js
  it('skips command blocks in every form', () => {
    for (const c of [
      'kubectl get pods kubectl get svc kubectl get deployments today',
      'kubectl get pods\nkubectl get svc\nkubectl get deployments now',
      'kubectl get pods -A --all-namespaces --output json --sort-by .metadata.name',
      'sudo systemctl restart nfs-server && systemctl status nfs-server --no-pager',
      'npm run build && npm run preview -- --host 127.0.0.1 --port 4321 --open',
    ]) expect(firstProseParagraph(c)).toBe('');
  });

  it('keeps prose regardless of how the sentence ends', () => {
    for (const p of [
      'The engineering team evaluated git, docker, and npm for the new workflow:',
      'We tested git, docker, and npm (three popular tools) before deciding.',
      'The lead said "we compared git, docker, and npm" before the rewrite',
      'Git is powerful. It handles branching well.\nDocker containers replaced our VM images.',
      'Both git and docker reshaped deployment practice across the whole industry.',
    ]) expect(firstProseParagraph(p)).not.toBe('');
  });
```

- [ ] **Step 1a-iv: Retire a fixture that encoded the wrong expectation**

Applying Step 1a-iii leaves one test red — `still skips an actual command
invocation`, from the round-2 brief:

```js
expect(firstProseParagraph('kubectl get pods -A --all-namespaces and then inspect each namespace')).toBe('');
expect(firstProseParagraph('sudo systemctl restart nfs-server then wait for the mount to return')).toBe('');
```

Both strings were fabricated in round 2 by appending an English tail to a real
command, purely to clear the 60-character floor. Neither resembles content that
occurs anywhere. Read them as prose and they are ordinary sentence fragments —
"…and then inspect each namespace" is a person describing a command, not a
shell block. Keeping them is the correct behaviour.

This was verified before changing anything. Realistic long commands are all
still skipped, and prose describing a command is kept:

```
'kubectl get pods -A --all-namespaces --output json --sort-by .metadata.name'  -> skipped
'sudo systemctl restart nfs-server && systemctl status nfs-server --no-pager'  -> skipped
'npm run build && npm run preview -- --host 127.0.0.1 --port 4321 --open'      -> skipped
'Run kubectl get pods -A --all-namespaces and then inspect each namespace.'    -> kept
'First restart the service with systemctl, then wait for the mount to return.' -> kept
```

**Delete** the `still skips an actual command invocation` test. Its realistic
replacements already live in `skips command blocks in every form` (Step 1a-iii),
which covers flagged, chained and sudo forms over 60 characters.

Add this in its place, pinning the behaviour the retired fixture got backwards:

```js
  // A command with a natural-language tail is someone *describing* a command,
  // not a shell block. The retired round-2 fixture asserted the opposite.
  it('keeps prose that describes a command', () => {
    for (const p of [
      'Run kubectl get pods -A --all-namespaces and then inspect each namespace.',
      'First restart the service with systemctl, then wait for the mount to return.',
    ]) expect(firstProseParagraph(p)).not.toBe('');
  });
```

Changing a test to make code pass is normally forbidden on this plan, and has
been enforced against six times. It is justified here only because the
realistic cases were checked independently first and all behave correctly; had
they not, the code would have been at fault.

- [ ] **Step 1d: Mask copied assets, and widen the gate to see them (LEAK FIX)**

`copyAssets` copies referenced asset files byte-for-byte. Masking only ever ran
on the markdown body, so `public/assets/blog/nfs-meltdown/architecture.svg`
shipped with a real Tailscale LoadBalancer address (100.x.x.x shape) — committed
and rendered into `dist/`.

The gate did not catch it because `check-secrets.mjs:93` scopes the address
check to `src/content/blog/`. `findUnmasked` flags the file correctly; nothing
asked it to look at `public/`.

**Fix 1 — mask text assets on copy.** In `scripts/migrate-blogs.mjs`, `copyAssets`
currently does `fs.copyFileSync`. SVG is XML text, so mask it like any other
content. Replace the copy with:

```js
    // Assets are content too. SVG is XML text and the nfs-meltdown diagrams
    // carry real addresses in their labels — copying byte-for-byte published
    // one. Binary formats are copied unchanged.
    const TEXT_ASSET = /\.(svg|txt|md|json|csv)$/i;
    if (TEXT_ASSET.test(file)) {
      const masked = maskText(fs.readFileSync(from, 'utf8'));
      fs.writeFileSync(path.join(dstDir, file), masked);
      const leaked = findUnmasked(masked);
      if (leaked.length) problems.push(`${post.slug}/${file}: unmasked ${leaked.join(', ')}`);
    } else {
      fs.copyFileSync(from, path.join(dstDir, file));
    }
```

**Fix 2 — widen the gate.** In `scripts/check-secrets.mjs`, the address check must
cover copied assets as well as posts:

```js
    if (rel.startsWith('src/content/blog/') || rel.startsWith('public/assets/blog/')) {
```

**Fix 3 — widen the verifier.** In `scripts/verify-migration.mjs`, the
per-file `findUnmasked` sweep must include copied assets:

```js
// Copied assets are content. One shipped an unmasked address because masking
// ran only on markdown bodies.
const ASSETS = path.join(ROOT, 'public/assets/blog');
if (fs.existsSync(ASSETS)) {
  for (const dir of fs.readdirSync(ASSETS)) {
    for (const file of fs.readdirSync(path.join(ASSETS, dir))) {
      if (!/\.(svg|txt|md|json|csv)$/i.test(file)) continue;
      const text = fs.readFileSync(path.join(ASSETS, dir, file), 'utf8');
      const leaked = findUnmasked(text);
      if (leaked.length) fail.push(`assets/${dir}/${file}: unmasked address ${leaked.join(', ')}`);
    }
  }
}
```

**Test** in `tests/unit/check-secrets.test.mjs`:

```js
  it('scans copied blog assets, not only posts', () => {
    expect(scanContentForAddresses('<text>100.x.x.x</text>')).toEqual(['100.x.x.x']);
  });
```

(The address in this snippet was real at the time this step was written; the
committed `tests/unit/check-secrets.test.mjs` was later rewritten, in the same
follow-up that produced this redaction, to use fixture addresses instead —
see Step 1f below.)

After the fix, re-run `npm run migrate:blogs` and confirm `architecture.svg`
contains `198.51.100.27` and no in-range address survives anywhere under
`public/assets/blog/`.

- [ ] **Step 1e: Make the diagrams actually render (BLOCKING)**

99 of 124 preserved diagrams do not display. `html-to-md.mjs` re-injects
`svg.outerHTML` verbatim, and the source SVGs contain 1,204 blank lines across
26 posts. In CommonMark a blank line ends an HTML block; every continuation
line is indented ≥4 spaces and starts with `<`, so it opens an **indented code
block**. The page shows raw SVG source as syntax-highlighted plaintext.

Measured in the built site:

```
auth-concepts             6 diagrams -> 6 plaintext code blocks
ios-android-build-guide   9 -> 9
git-concepts              7 -> 7
153 lines of raw SVG markup rendered as literal code on auth-concepts alone
```

This is the same defect the branch exists to fix, relocated from the converter
to the renderer.

**Fix** — one line in `scripts/lib/html-to-md.mjs`, where SVGs are captured:

```js
    // Drop blank lines inside the SVG entirely. A blank line terminates an
    // HTML block in CommonMark, and the indented continuation lines then parse
    // as an indented code block — the diagram truncates and its source renders
    // as literal text. 1,204 blank lines across 26 posts did exactly that.
    //
    // A regex replace of /\n[ \t]*\n/ is NOT sufficient: matches are
    // non-overlapping, so a run of three blank lines collapses to one rather
    // than none. node-html-parser also drops HTML comments on serialization,
    // which creates exactly such runs. Filtering empty lines is unconditional.
    // Verified through @astrojs/markdown-remark on auth-concepts:
    //   as shipped -> 6 plaintext code blocks, 269 leaked markup lines
    //   with fix   -> 0 and 0
    svgs.push(svg.outerHTML.split('\n').filter((l) => l.trim()).join('\n'));
```

**Fix the verifier too — it could not see this.** `verify-migration.mjs` counts
`<svg` occurrences in the markdown it just wrote: it validates its own output
format and never renders. Add a real render assertion:

```js
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

const processor = await createMarkdownProcessor({});
for (const post of POSTS) {
  const file = path.join(OUT, `${post.slug}.md`);
  if (!fs.existsSync(file)) continue;
  const body = fs.readFileSync(file, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  if (!/<svg[\s>]/.test(body)) continue;
  const { code } = await processor.render(body);
  const emptied = (code.match(/<svg[^>]*>\s*<\/svg>/g) || []).length;
  const leaked = (code.match(/data-language="plaintext"/g) || []).length;
  if (emptied) fail.push(`${post.slug}: ${emptied} diagram(s) render empty`);
  if (leaked) fail.push(`${post.slug}: ${leaked} block(s) of SVG source render as code`);
}
```

Expected after the fix: zero emptied diagrams, zero plaintext blocks, across all
42 posts.

- [ ] **Step 1e-ii: Drop empty-shell SVGs**

A second, unrelated defect. Eight diagrams have no drawable children at all —
they are empty `<svg>` shells whose content was generated by an inline
`<script>` at view time, and `CHROME_SELECTORS` strips `<script>` (correctly:
executing arbitrary script from migrated content is not acceptable).

```
ai-git-branching-strategy   6 of 8 diagrams are empty shells
gnome-thumbnails-broke      2 of 11
```

No regex recovers content that was never in the markup. An empty `<svg>` renders
as a blank gap, which is worse than no element. Drop them at capture time in
`scripts/lib/html-to-md.mjs`, immediately before the push:

```js
    // Some source diagrams are empty shells drawn by an inline <script> at view
    // time; CHROME_SELECTORS strips <script>, so nothing can restore them. An
    // empty <svg> renders as a blank gap — drop it rather than ship a hole.
    const DRAWABLE = /<(rect|circle|ellipse|path|line|polyline|polygon|text|image|use)\b/;
    if (!DRAWABLE.test(svg.outerHTML)) { svg.remove(); return; }
```

Expected: 124 SVG in markdown becomes 116, and the two affected posts lose only
their blank shells.

Add to the verifier's render assertion so this cannot regress:

```js
  if (/<svg[^>]*>\s*<\/svg>/.test(code)) fail.push(`${post.slug}: empty <svg> in rendered output`);
```

- [ ] **Step 1h: Fix the trailing anchor — two real addresses are live (BLOCKING)**

A permissive scan of the shipped content found two real addresses (both present
in the rewrite table, shapes `192.168.1.x`) surviving in a published post:

```
src/content/blog/two-mac-minis-mlx-debugging.md:21
  Host B192.168.1.xxMac mini M2 · 8GB · 2× TB4
a second table entry, same shape, in the same post; both reach dist/
```

Conversion concatenated table cells without spaces, so the address is followed
immediately by a letter. `IP_RULES` and `IN_SCOPE` both end in `\b`, which needs
a non-word character — a letter defeats it. The rewriter therefore never masked
them, and the gate, sharing the anchor, never saw them. Two independent
safeguards with one blind spot.

This choice was made in Task 2. `(?!\.?\d)` was tested then and rejected because
it masks a hostname shaped `192.168.1.xx.example.com`. That was wrong:
over-masking is safe, under-masking leaks.

**Fix** — in `scripts/lib/mask.mjs`, change the trailing anchor in both places.
The real implementation and its comment (verified on 11 cases, using shapes —
not real addresses — in the comment itself, consistent with Step 1f) is the
source of truth; read `scripts/lib/mask.mjs` directly rather than a snapshot
here.

and the same trailing change on `IN_SCOPE`, replacing its closing `\b` with
`(?!\.?\d)` so the gate matches the rewriter exactly.

**Add a permissive audit to `verify-migration.mjs`** — the existing check reuses
`findUnmasked`, which shares the anchor and so shares the blind spot. This one
must not:

```js
// Deliberately looser than findUnmasked: a permissive shape match that does NOT
// reuse the rewriter's anchors. A shared anchor means a shared blind spot, which
// is exactly how two addresses reached production.
const LOOSE = /(?<![\d.])(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3})(?!\.?\d)/g;
for (const [dir, exts] of [[OUT, /\.md$/], [path.join(ROOT, 'public/assets/blog'), /\.(svg|txt|json)$/i]]) {
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir, { recursive: true }).filter((f) => exts.test(String(f)));
  for (const f of files) {
    const abs = path.join(dir, String(f));
    if (!fs.statSync(abs).isFile()) continue;
    for (const ip of (fs.readFileSync(abs, 'utf8').match(LOOSE) || [])) {
      if (!PRESERVE.has(ip)) fail.push(`${f}: real address ${ip} survived masking`);
    }
  }
}
```

`verify-migration.mjs` needs `PRESERVE` imported for this.

**Also finish 1f.** `scripts/lib/mask.mjs` still cites two real addresses in its
anchor comments. Replace them with shapes — `192.168.1.x`, `100.x.y.z` — so the
committed file names no real value.

Expected after the fix: the permissive audit reports zero, and
`two-mac-minis-mlx-debugging.md` shows `192.0.2.64` and `192.0.2.5`.

- [ ] **Step 1f: Move the masking tables out of the public repo (BLOCKING)**

`hellodk/cfpages` is public, and `IP_TABLE`/`HOST_TABLE` carry the exact
`real → masked` mapping — so the masking is reversible for all 42 posts by
anyone reading the repo. The design docs and `mask.test.mjs` repeat the pairs,
and `check-secrets.mjs` allowlists `^docs/` from every scan.

Move the data out; keep the logic in.

1. Create `scripts/lib/mask.local.mjs` holding the 30 IP pairs and 5 hostname
   pairs, exporting `IP_TABLE` and `HOST_TABLE`. Add `scripts/lib/mask.local.mjs`
   to `.gitignore`.
2. `scripts/lib/mask.mjs` imports them and **fails loudly** if the file is
   absent, so a fresh clone cannot silently mask nothing:

```js
let IP_TABLE, HOST_TABLE;
try {
  ({ IP_TABLE, HOST_TABLE } = await import('./mask.local.mjs'));
} catch {
  throw new Error(
    'scripts/lib/mask.local.mjs is missing. It holds the real -> masked address\n'
    + 'tables and is deliberately gitignored, because this repository is public\n'
    + 'and committing the mapping would make the masking reversible.\n'
    + 'See docs/superpowers/specs/2026-08-07-blog-content-migration-design.md.',
  );
}
export { IP_TABLE, HOST_TABLE };
```

3. Rewrite `tests/unit/mask.test.mjs` to use **fixture** addresses, not real
   ones: assert the properties (injectivity, idempotence, anchoring, preserve
   list) against a table the test constructs itself. The real table's integrity
   is then checked by `verify-migration.mjs` at runtime, not by a committed test.
4. Redact both design docs to shapes only — `192.168.1.x → 192.0.2.x`,
   `<host>.internal → <host>.example.internal` — never a specific real value.
5. Note in the spec that this does **not** rewrite history: the pairs remain in
   earlier commits on this branch, and the pre-branch unmasked posts remain in
   `origin/main` at `5e22ec3`. Squashing on merge limits future exposure only.

- [ ] **Step 1g: Make the secrets gate fail closed**

Two holes in the one file whose job is to fail closed:

1. `main()` is guarded by `process.argv[1].endsWith('check-secrets.mjs')`, which
   **silently exits 0** under a symlink or wrapper with a different basename.
   Replace with an exact module-identity check:

```js
import { pathToFileURL } from 'url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

2. `allowed(rel)` short-circuits at line 73 **before** any scanning, so an
   `ALLOWLIST_PATHS` entry matching a blog path would bypass both the secret
   scan and the address gate. Run the address check before the allowlist
   early-return, or assert at startup that no allowlist entry matches
   `src/content/blog/` or `public/assets/blog/`.

- [ ] **Step 1c: Restore cover images (regression fix)**

The migration drops `cover:` from frontmatter. All 9 rebuilt posts previously
had one and now do not:

```
browser-rdp-zero-ports   before: assets/images/unix_time_sharing/unix-wallpaper.png   after: none
gnome-thumbnails-broke   before: assets/images/screen2.png                            after: none
macos-vms-tart-salt      before: assets/images/travel/manali/IMG_75751.JPG            after: none
...9 total
```

The homepage renders cover-image post cards, so this is visible. The mappings
still exist in `src/data/post-covers.ts` as `SLUG_COVERS` — 23 entries, of which
9 match managed slugs. The generator simply never reads them.

`post-covers.ts` is TypeScript and cannot be imported by a `.mjs` script, so
parse it. Add near the top of `scripts/migrate-blogs.mjs`:

```js
/**
 * Cover images live in src/data/post-covers.ts as a SLUG_COVERS map. It is a
 * .ts file, so it cannot be imported from this .mjs script — parse the literal
 * instead. Only 9 of the 42 managed slugs are mapped; the rest ship without a
 * cover until images are chosen for them.
 */
function loadCovers() {
  const file = path.join(ROOT, 'src/data/post-covers.ts');
  if (!fs.existsSync(file)) return {};
  const src = fs.readFileSync(file, 'utf8');
  const covers = {};
  for (const m of src.matchAll(/['"]?([a-z0-9-]+)['"]?\s*:\s*['"]([^'"]+)['"]/g)) {
    covers[m[1]] = m[2];
  }
  return covers;
}
const COVERS = loadCovers();
```

In the frontmatter builder, emit `cover` only when the slug is mapped, placed
after `tags` to match the field order of the pre-existing posts:

```js
  const frontmatter = [
    '---',
    `title: ${yaml(title)}`,
    `date: ${post.date}`,
    `description: ${yaml(description)}`,
    `tags: [${post.tags.join(', ')}]`,
    ...(COVERS[post.slug] ? [`cover: ${yaml(COVERS[post.slug])}`] : []),
    `draft: ${post.draft}`,
    '---',
    '',
  ].join('\n');
```

Add to `scripts/verify-migration.mjs`, so this regression cannot recur silently:

```js
// The 9 rebuilt posts had covers before this branch. Losing them is a visible
// regression on the homepage's cover-image cards.
for (const post of POSTS) {
  const file = path.join(OUT, `${post.slug}.md`);
  if (!fs.existsSync(file)) continue;
  const hasCover = /^cover:\s*\S/m.test(fs.readFileSync(file, 'utf8'));
  if (COVERS[post.slug] && !hasCover) fail.push(`${post.slug}: mapped cover missing from frontmatter`);
}
```

`verify-migration.mjs` needs the same `loadCovers()` helper.

Expected after re-running the migration: exactly 9 of the 42 posts carry a
`cover:` line, and `git diff` on the other 33 shows no change.

- [ ] **Step 1b: Add the one-time legacy masking pass**

Three legacy Jekyll posts predate this migration and are not regenerated from
`~/Documents/blogs`, so the orchestrator never touches them — yet they carry
real private addresses and are already published. Mask them in place, once, so
the Task 6 gate can cover the whole content directory with no exception list.

Append to `scripts/migrate-blogs.mjs`, after the main loop and before the
summary output:

```js
// One-time pass over posts NOT managed by the manifest. Legacy Jekyll content
// lives only in this repo — there is no source to regenerate it from — so it
// is masked in place. Idempotent: re-running finds nothing left to change.
const managed = new Set(POSTS.map((p) => `${p.slug}.md`));
let legacyMasked = 0;
for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith('.md'))) {
  if (managed.has(file)) continue;
  const abs = path.join(OUT, file);
  const before = fs.readFileSync(abs, 'utf8');
  const after = maskText(before);
  if (after !== before) {
    fs.writeFileSync(abs, after);
    legacyMasked += 1;
    console.log(`~ ${file}  (legacy, masked in place)`);
  }
  const leaked = findUnmasked(after);
  if (leaked.length) problems.push(`${file}: unmasked ${leaked.join(', ')}`);
}
if (legacyMasked) console.log(`\nMasked ${legacyMasked} legacy post(s) in place.`);
```

Expected on this run: exactly 3 legacy posts masked —
`getting-familiar-with-cassandra.md`,
`how-to-pass-datastax-cassandra-administrator-certification.md`,
`kubernetes-cluster-vagrant.md`.

- [ ] **Step 2: Extract the diagram stylesheet**

Create `src/styles/diagrams.css`:

```css
/* Styling for inline SVG diagram blocks migrated from ~/Documents/blogs.
   Uses the direct-child combinator so 16px icon SVGs inside captions are
   never stretched to full width. */
.diagram {
  margin: 24px 0;
  border: 1px solid var(--border, #E5E7EB);
  border-radius: 8px;
  overflow: hidden;
  background: #FFFFFF;
}

.diagram > .bar {
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4B5563;
  background: #F9FAFB;
  border-bottom: 1px solid var(--border, #E5E7EB);
}

.diagram > .body {
  padding: 16px;
  overflow-x: auto;
}

/* `.post-art__body` is the slot wrapper in src/layouts/PostLayout.astro:43.
   Direct-child only, so any small inline icon SVG stays its own size. */
.diagram > .body > svg,
.post-art__body > svg {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
}

.post-art__body svg text {
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 3: Import the stylesheet**

In `src/layouts/BaseLayout.astro`, directly after line 2 (`import '../styles/global.css';`) add:

```js
import '../styles/diagrams.css';
```

- [ ] **Step 4: Delete the old script**

```bash
git rm scripts/migrate-blogs-2026.mjs
```

- [ ] **Step 5: Run the migration**

Run: `npm run migrate:blogs`
Expected: 42 `✓` lines, `Wrote 42/42 posts.`, exit 0 with no Problems block. If any `unmasked` problem is reported, add the address to `IP_TABLE` in `scripts/lib/mask.mjs` with an unused octet in the matching documentation block, extend the Task 2 test, and re-run.

- [ ] **Step 6: Commit**

```bash
git add scripts/migrate-blogs.mjs src/styles/diagrams.css src/layouts/BaseLayout.astro src/content/blog public/assets/blog
git commit -m "Replace migration script with parser-based pipeline.

Regenerates all 42 posts with diagrams and code blocks intact, masking
applied to the finished markdown.

Refs #1"
```

---

### Task 6: Unknown-address gate in check-secrets

**Files:**
- Modify: `scripts/check-secrets.mjs:14-22` (the `FORBIDDEN` block) and the per-file loop
- Test: `tests/unit/check-secrets.test.mjs`

**Interfaces:**
- Consumes: `findUnmasked` (Task 2)
- Produces: `npm run check:secrets` exits non-zero when an in-range address survives under `src/content/blog/`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/check-secrets.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { scanContentForAddresses } from '../../scripts/check-secrets.mjs';

describe('scanContentForAddresses', () => {
  it('flags a LAN address in post content', () => {
    expect(scanContentForAddresses('node at 192.168.222.222')).toEqual(['192.168.222.222']);
  });

  it('flags a Tailscale address in post content', () => {
    expect(scanContentForAddresses('lb at 100.70.5.5')).toEqual(['100.70.5.5']);
  });

  it('allows preserved well-known addresses', () => {
    expect(scanContentForAddresses('dns 10.96.0.10, magic 100.100.100.100')).toEqual([]);
  });

  it('allows fully masked output', () => {
    expect(scanContentForAddresses('192.0.2.64 198.51.100.27 203.0.113.111')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/unit/check-secrets.test.mjs`
Expected: FAIL — `scanContentForAddresses is not a function`.

- [ ] **Step 3: Add the export and wire it into the scan**

In `scripts/check-secrets.mjs`, add this import beside the existing imports at the top:

```js
import { findUnmasked } from './lib/mask.mjs';
```

Add this exported function immediately after the `ALLOWLIST_PATHS` array:

```js
/** In-range addresses that survived masking. */
export function scanContentForAddresses(text) {
  return findUnmasked(text);
}
```

Inside the per-file loop, immediately after the existing `for (const { name, re } of FORBIDDEN)` block, add:

```js
  if (rel.startsWith('src/content/blog/')) {
    const leaked = scanContentForAddresses(text);
    if (leaked.length) {
      console.error(`✗ Unmasked address in ${rel}: ${leaked.join(', ')}`);
      failed = true;
    }
  }
```

Guard the script's side effects so importing it from a test does not run the scan. Wrap everything from `let failed = false;` to the final `console.log(...)` in:

```js
function main() {
  // ... existing body ...
}

if (process.argv[1] && process.argv[1].endsWith('check-secrets.mjs')) main();
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/unit/check-secrets.test.mjs`
Expected: PASS.

- [ ] **Step 5: Run the real gate over the repo**

Run: `npm run check:secrets`
Expected: `✓ No secret patterns in tracked files`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add scripts/check-secrets.mjs tests/unit/check-secrets.test.mjs
git commit -m "Fail check:secrets on unmasked addresses in blog content.

Refs #1"
```

---

### Task 7: Verify acceptance criteria

No new code. This task proves the migration met the spec, and is where a reviewer can reject the work.

**Files:**
- Create: `scripts/verify-migration.mjs`

**Interfaces:**
- Consumes: `POSTS` (Task 4)
- Produces: exit 0 only when every acceptance criterion holds

- [ ] **Step 1: Write the verifier**

Create `scripts/verify-migration.mjs`:

```js
#!/usr/bin/env node
/** Assert the migration output meets the acceptance criteria in issue #1. */
import fs from 'fs';
import path from 'path';
import { POSTS } from './lib/manifest.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOGS = '/home/dk/Documents/blogs';
const OUT = path.join(ROOT, 'src/content/blog');
const CHROME = ['On This Page', 'min read', 'hellodk.io · Deepak'];

const fail = [];
const count = (s, re) => (s.match(re) || []).length;

for (const post of POSTS) {
  const file = path.join(OUT, `${post.slug}.md`);
  if (!fs.existsSync(file)) { fail.push(`${post.slug}: not written`); continue; }
  const out = fs.readFileSync(file, 'utf8');
  const src = fs.readFileSync(path.join(BLOGS, post.src), 'utf8');

  const srcSvg = count(src, /<svg[\s>]/g);
  const outSvg = count(out, /<svg[\s>]/g);
  // Chrome icons are dropped, so equality is not expected — presence is.
  if (srcSvg > 0 && outSvg === 0) fail.push(`${post.slug}: ${srcSvg} SVG in source, 0 in output`);

  // Indent-aware: a <pre> inside an <li> converts to a fence indented to match
  // the list item, which is valid CommonMark. A /^```/ anchor cannot see those
  // — in kri-ops-guide that undercounts 9 real fences as 5.
  const srcPre = count(src, /<pre[\s>]/g);
  const outFence = count(out, /^\s*```/gm) / 2;
  if (srcPre > 0 && outFence < srcPre) fail.push(`${post.slug}: ${srcPre} <pre> in source, ${outFence} fences in output`);

  for (const marker of CHROME) {
    if (out.includes(marker)) fail.push(`${post.slug}: chrome marker "${marker}"`);
  }

  const expected = `draft: ${post.draft}`;
  if (!out.includes(expected)) fail.push(`${post.slug}: expected ${expected}`);
}

const written = fs.readdirSync(OUT).filter((f) => f.endsWith('.md'));
console.log(`posts: ${written.length}  live: ${POSTS.filter(p => !p.draft).length}  draft: ${POSTS.filter(p => p.draft).length}`);

if (fail.length) {
  console.error('\n✗ Acceptance failures:');
  for (const f of fail) console.error(`  ${f}`);
  process.exit(1);
}
console.log('✓ All acceptance criteria met');
```

- [ ] **Step 1a: Actually gate every criterion the script claims**

The review found the verifier prints `✓ All acceptance criteria met` while
checking 6 of 11 criteria, and that the counts are echoed rather than asserted —
editing the manifest to 40 posts would still exit 0. Both defects come from this
plan's own template.

Fix the summary line, assert the totals, and fold in the four criteria that are
cheap to check here. Replace the summary and final block with:

```js
import { IP_TABLE, PRESERVE, maskText, findUnmasked } from './lib/mask.mjs';

// ---- totals, asserted rather than echoed ----
const live = POSTS.filter((p) => !p.draft).length;
const draft = POSTS.filter((p) => p.draft).length;
if (POSTS.length !== 42) fail.push(`manifest has ${POSTS.length} posts, expected 42`);
if (live !== 34) fail.push(`manifest has ${live} live posts, expected 34`);
if (draft !== 8) fail.push(`manifest has ${draft} draft posts, expected 8`);

// ---- masking: idempotence, injectivity, and no survivor ----
const values = Object.values(IP_TABLE);
if (new Set(values).size !== values.length) fail.push('IP_TABLE masked values are not pairwise distinct');
if (Object.keys(IP_TABLE).length !== 30) fail.push(`IP_TABLE has ${Object.keys(IP_TABLE).length} entries, expected 30`);

for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(OUT, file), 'utf8');
  const leaked = findUnmasked(text);
  if (leaked.length) fail.push(`${file}: unmasked address ${leaked.join(', ')}`);
  if (maskText(text) !== text) fail.push(`${file}: masking is not idempotent`);
}

// ---- test-reports/ gitignored ----
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
if (!/^test-reports\/?$/m.test(gitignore)) fail.push('test-reports/ is not gitignored');

// ---- summary: 42 managed posts, distinct from the directory total ----
const total = fs.readdirSync(OUT).filter((f) => f.endsWith('.md')).length;
console.log(`migrated: ${POSTS.length}/42  (${live} live, ${draft} draft)`);
console.log(`src/content/blog/ total: ${total}  (${total - POSTS.length} pre-existing, untouched)`);

if (fail.length) {
  console.error('\n✗ Acceptance failures:');
  for (const f of fail) console.error(`  ${f}`);
  process.exit(1);
}
// Deliberately narrower than "all acceptance criteria met". Two criteria are
// external commands and are NOT gated here: `npm run build` (Astro schema) and
// `npm run check:secrets` (tracked-file secret scan). Say so, so nobody reads
// a green run as more than it is.
console.log('\n✓ Migration output checks passed');
console.log('  Not covered here — run separately: npm run build, npm run check:secrets');
```

Note `maskText(text) !== text` is a genuine idempotence check on shipped content:
masked output re-masked must be unchanged.

**Prove the new assertions fire.** Temporarily change the expected post count to
43, confirm exit 1 names it, restore, confirm exit 0. Do the same for one
masking assertion. Paste both runs.

- [ ] **Step 2: Add the npm script**

In `package.json` `"scripts"`, add:

```json
"verify:migration": "node scripts/verify-migration.mjs"
```

- [ ] **Step 3: Run the verifier**

Run: `npm run verify:migration`
Expected: `✓ All acceptance criteria met`. Any failure names the post and the criterion — fix the converter or the manifest, re-run `npm run migrate:blogs`, then re-verify. Do not weaken the check.

- [ ] **Step 4: Run the full unit suite**

Run: `npm test`
Expected: all suites pass; `test-reports/unit/results.xml` is written.

- [ ] **Step 5: Build the site**

Run: `npm run build`
Expected: Astro build completes with no content-collection schema errors, then Pagefind indexes `dist`.

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-migration.mjs package.json
git commit -m "Add migration acceptance verifier.

Refs #1"
```

---

### Task 8: Update the README

**Files:**
- Modify: `README.md` — the "Project layout", "Scripts", and "Writing a post" sections

**Interfaces:**
- Consumes: nothing
- Produces: documentation only

- [ ] **Step 1: Mark the content directory as generated**

In the "Project layout" code block, change the `src/content/blog/` line to:

```text
│   ├── content/blog/     # posts — GENERATED, see "Writing a post"
```

- [ ] **Step 2: Add the new scripts**

In the "Scripts" table, add these rows after the `npm run check:secrets` row:

```markdown
| `npm run migrate:blogs` | Regenerate `src/content/blog/` from `~/Documents/blogs` |
| `npm run verify:migration` | Assert migrated posts meet the acceptance criteria |
| `npm test` | Vitest unit suite → `test-reports/unit/` |
```

- [ ] **Step 3: Rewrite the "Writing a post" section**

Replace the entire "Writing a post" section body with:

````markdown
Posts under `src/content/blog/` are **generated** from `~/Documents/blogs` by
`scripts/migrate-blogs.mjs`. Edits made directly to a post are overwritten on the
next run — write the post in the blogs directory instead, add it to
`scripts/lib/manifest.mjs`, then:

```bash
npm run migrate:blogs     # convert + mask
npm run verify:migration  # check acceptance criteria
npm run dev               # hot reload
```

Generated frontmatter:

```yaml
---
title: "Your post title"
date: 2026-06-28
description: "One-line summary for cards and SEO"
tags: [devops, kubernetes]
draft: false
---
```

A `cover:` line is added automatically for any slug listed in
`src/data/post-covers.ts`. Posts without an entry there ship without a cover.

Set `draft: true` in the manifest to hide a post from production builds.

**Masking.** Infrastructure detail is rewritten by `scripts/lib/mask.mjs` — LAN and
Tailscale addresses become RFC 5737 documentation addresses, internal hostnames are
neutralised. `npm run check:secrets` fails if an unmasked address reaches
`src/content/blog/`, and runs in the pre-commit hook. A new address in new source
material fails the gate rather than being silently guessed at: add it to `IP_TABLE`.
````

- [ ] **Step 4: Verify the README renders and the gate still passes**

Run: `npm run check:secrets`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "Document the generated-content model and masking gate.

Closes #1"
```

---

## Definition of done

- [ ] 42 files in `src/content/blog/`, 34 live and 8 draft
- [ ] `npm test` green
- [ ] `npm run verify:migration` green
- [ ] `npm run build` green
- [ ] `npm run check:secrets` green
- [ ] `scripts/migrate-blogs-2026.mjs` deleted
- [ ] `prebuild` and `build` unchanged — migration never runs on Cloudflare
- [ ] README documents the generated-content model
- [ ] PR opened with `Closes #1`
