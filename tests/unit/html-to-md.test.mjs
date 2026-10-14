import { describe, it, expect } from 'vitest';
import TurndownService from 'turndown';
import { convertHtml, firstProseParagraph, decodeEntities } from '../../scripts/lib/html-to-md.mjs';

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

  it('turns .tab labels into H2 on hyphen-less .tabpane panes', () => {
    const { body } = convertHtml(
      '<html><body><div class="tabs" role="tablist">'
      + '<button class="tab active" data-tab="metrics">Metrics</button>'
      + '<button class="tab" data-tab="logs">Logs</button></div>'
      + '<div class="tabpane" id="metrics"><p>36 metric families.</p></div>'
      + '<div class="tabpane" id="logs"><p>Streaming server logs.</p></div>'
      + '</body></html>',
    );
    expect(body).toContain('## Metrics');
    expect(body).toContain('## Logs');
    expect(body).toContain('36 metric families.');
  });

  it('drops a foreign series nav of relative .html links', () => {
    const { body } = convertHtml(
      '<html><body><nav><a href="index.html">All posts</a> '
      + '<a href="1-hardware-telemetry.html">Hardware</a> '
      + '<a href="../vllm-metal/index.html">vLLM Metal</a></nav>'
      + '<p>Real body prose stays.</p></body></html>',
    );
    expect(body).not.toContain('1-hardware-telemetry.html');
    expect(body).toContain('Real body prose stays.');
  });

  it('keeps navs with same-page anchors or real links', () => {
    const { body } = convertHtml(
      '<html><body><nav><a href="https://example.com/x">Docs</a> <a href="/tag/y">Tag</a></nav>'
      + '<p>Real body prose stays.</p></body></html>',
    );
    expect(body).toContain('[Docs](https://example.com/x)');
    expect(body).toContain('Real body prose stays.');
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

  it('propagates th align attributes into GFM column alignment', () => {
    const { body } = convertHtml(
      '<html><body><table><tr><th>Name</th><th align="right">Count</th><th align="center">Verdict</th></tr>'
      + '<tr><td>a</td><td>3</td><td>x</td></tr></table></body></html>',
    );
    expect(body).toContain('| Name | Count | Verdict |');
    expect(body).toContain('| --- | ---: | :---: |');
  });

  it('leaves unannotated tables with plain separators', () => {
    const { body } = convertHtml(
      '<html><body><table><tr><th>A</th><th>B</th></tr>'
      + '<tr><td>1</td><td>2</td></tr></table></body></html>',
    );
    expect(body).toContain('| --- | --- |');
  });

  it('preserves inline code, strong, and links inside table cells', () => {
    const { body } = convertHtml(
      '<html><body><table><tr><th>Tool</th><th>Note</th></tr>'
      + '<tr><td><code>curl</code>, <code>jq</code></td>'
      + '<td><strong>fast</strong> per <a href="https://example.com/x">docs</a></td></tr>'
      + '</table></body></html>',
    );
    expect(body).toContain('| `curl`, `jq` | **fast** per [docs](https://example.com/x) |');
  });

  it('turns br inside a table cell into a space instead of gluing words', () => {
    const { body } = convertHtml(
      '<html><body><table><tr><th>A</th></tr>'
      + '<tr><td>Stage 1<br>Base Image</td></tr></table></body></html>',
    );
    expect(body).toContain('| Stage 1 Base Image |');
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

  it('decodes entities before cleaning, so nfs-meltdown-style leads read cleanly', () => {
    const result = firstProseParagraph(`**TL;DR** &mdash; ${'a'.repeat(70)}`);
    expect(result).toContain('—');
    expect(result).not.toContain('&mdash;');
  });

  it('keeps prose that merely opens with a command word', () => {
    for (const p of [
      'git is a distributed version control system that tracks changes over time.',
      'code editors have become the primary interface most developers use daily.',
      'docker changed how teams ship software by making the runtime an artifact.',
    ]) {
      expect(firstProseParagraph(p)).not.toBe('');
    }
  });

  // A command with a natural-language tail is someone *describing* a command,
  // not a shell block. The retired round-2 fixture asserted the opposite.
  it('keeps prose that describes a command', () => {
    for (const p of [
      'Run kubectl get pods -A --all-namespaces and then inspect each namespace.',
      'First restart the service with systemctl, then wait for the mount to return.',
    ]) expect(firstProseParagraph(p)).not.toBe('');
  });

  it('skips a bare command block with no flags or paths', () => {
    expect(firstProseParagraph('kubectl get pods kubectl get svc kubectl get deployments today')).toBe('');
    expect(firstProseParagraph('kubectl get pods\nkubectl get svc\nkubectl get deployments now')).toBe('');
  });

  it('keeps prose that names several tools in a sentence', () => {
    const p = 'We compared git and docker and npm across three teams over several months.';
    expect(firstProseParagraph(p)).toBe(p);
  });

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
});

describe('decodeEntities', () => {
  it('decodes the named entities present in the corpus', () => {
    expect(decodeEntities('A &mdash; B &amp; C &nbsp;D')).toBe('A — B & C  D');
  });

  it('decodes numeric entities', () => {
    expect(decodeEntities('caf&#233;')).toBe('café');
  });

  it('leaves unknown entities untouched', () => {
    expect(decodeEntities('&notareal; thing')).toBe('&notareal; thing');
  });

  it('does not throw on an out-of-range numeric entity', () => {
    expect(() => decodeEntities('&#1200000;')).not.toThrow();
    expect(decodeEntities('&#1200000;')).toBe('&#1200000;');
  });
});

// Style 2 post layout (issue #14): `.stats` stat cards and `.note`/`.alert`
// callouts must survive migration as structured blocks the layout styles,
// instead of flattening into bare paragraphs.
const STYLE2 = `<!doctype html><html><head><title>Post</title></head><body><main>
<div class="stats">
  <div class="stat err"><div class="n">15 × 20B</div><div class="l">nightly backups</div></div>
  <div class="stat ok"><div class="n">2</div><div class="l">passwords rotated</div></div>
  <div class="stat"><div class="n">4</div><div class="l">PRs opened</div></div>
</div>
<div class="note warn"><b>The trap:</b> deleting a secret from the <code>tree</code> does nothing.</div>
<div class="alert err"><b>Then the backups.</b> Every dump was <a href="https://example.com/x">exactly 20 bytes</a>.</div>
<div class="note"><div class="t">A quiet win</div><p>No Secret object ever exists.</p></div>
<p>It started with four words and ended four PRs later having rescued the database.</p>
</main></body></html>`;

describe('convertHtml — style 2 components', () => {
  it('preserves .stats as a stat-cards block with variants', () => {
    const { body } = convertHtml(STYLE2);
    expect(body).toContain('<div class="stat-cards">');
    expect(body).toContain('stat-card--err');
    expect(body).toContain('stat-card--ok');
    expect(body).toContain('15 × 20B');
    expect(body).toContain('nightly backups');
  });

  it('preserves .note warn as a callout with its title', () => {
    const { body } = convertHtml(STYLE2);
    expect(body).toContain('<aside class="callout callout--warn">');
    expect(body).toContain('The trap:');
    expect(body).toContain('deleting a secret');
  });

  it('maps .alert err onto the same callout shape', () => {
    const { body } = convertHtml(STYLE2);
    expect(body).toContain('<aside class="callout callout--err">');
    expect(body).toContain('Then the backups.');
  });

  it('takes the callout title from a .t child too', () => {
    const { body } = convertHtml(STYLE2);
    expect(body).toContain('A quiet win');
    expect(body).toContain('No Secret object ever exists.');
  });

  it('keeps inline code and links inside callouts', () => {
    const { body } = convertHtml(STYLE2);
    expect(body).toContain('<code>tree</code>');
    expect(body).toContain('https://example.com/x');
  });

  it('never picks a stat or callout as the description fallback', () => {
    const html = `<html><head><title>Post</title></head><body><main>
      <div class="stats"><div class="stat"><div class="n">15 × 20B</div><div class="l">backups</div></div></div>
      <p>It started with four words and ended four PRs later having rescued the database.</p>
    </main></body></html>`;
    expect(convertHtml(html).description).toContain('It started with four words');
  });

  // homelab-secret-rescue shipped an unclosed <div class="alert"> (…</p> with
  // no </div>), which would swallow the rest of the document into one callout
  // via innerHTML. Malformed wrappers must degrade to flat paragraphs instead.
  it('leaves a malformed wrapper for Turndown instead of swallowing the document', () => {
    const html = `<html><head><title>Post</title></head><body><main>
      <div class="alert"><b>The trap:</b> deleting does nothing to a full-history scan.</p>
      <p>It started with four words and ended four PRs later having rescued the database.</p>
      <h2>Next section</h2>
      <pre>kubectl get pods</pre>
    </main></body></html>`;
    const { body } = convertHtml(html);
    expect(body).not.toContain('callout');
    expect(body).toContain('## Next section');
    expect(body).toContain('```');
    expect(body).toContain('It started with four words');
  });

  // Label class differs by source vintage: homelab uses .l, the 297
  // reference uses .k (its stylesheet has no .l at all).
  it('reads stat labels from .k too (297 reference vintage)', () => {
    const html = `<html><head><title>Post</title></head><body><main>
      <div class="stats"><div class="stat err"><div class="n">U+2019</div><div class="k">The final blocker</div></div></div>
      <p>It started with four words and ended four PRs later having rescued the database.</p>
    </main></body></html>`;
    const { body } = convertHtml(html);
    expect(body).toContain('U+2019');
    expect(body).toContain('The final blocker');
  });
});
