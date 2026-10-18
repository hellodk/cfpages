#!/usr/bin/env node
/** Assert the migration output meets the acceptance criteria in issue #1. */
import fs from 'fs';
import path from 'path';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { POSTS } from './lib/manifest.mjs';
import { IP_TABLE, HOST_TABLE, PRESERVE, maskText, findUnmasked } from './lib/mask.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOGS = '/home/dk/Documents/blogs';
const OUT = path.join(ROOT, 'src/content/blog');
const CHROME = ['On This Page', 'min read', 'hellodk.io · Deepak'];

/**
 * Cover images live in src/data/post-covers.ts as a SLUG_COVERS map. It is a
 * .ts file, so it cannot be imported from this .mjs script — parse the literal
 * instead. Only 33 of the 88 managed slugs are mapped; the rest ship without a
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

// The 9 rebuilt posts had covers before this branch. Losing them is a visible
// regression on the homepage's cover-image cards.
for (const post of POSTS) {
  const file = path.join(OUT, `${post.slug}.md`);
  if (!fs.existsSync(file)) continue;
  const hasCover = /^cover:\s*\S/m.test(fs.readFileSync(file, 'utf8'));
  if (COVERS[post.slug] && !hasCover) fail.push(`${post.slug}: mapped cover missing from frontmatter`);
}

// ---- diagrams actually render ----
// Counting `<svg` in the markdown this script just wrote only validates the
// converter's own output format — it never renders. A blank line inside a
// re-injected SVG terminates the surrounding CommonMark HTML block, so the
// indented continuation lines parse as an indented code block: the diagram
// truncates and its source ships as literal, syntax-highlighted text. Render
// through the real Astro markdown pipeline to catch that.
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
  // Explicit regression guard for Step 1e-ii (empty-shell SVGs dropped at
  // capture time in html-to-md.mjs) — belt-and-braces alongside `emptied`.
  if (/<svg[^>]*>\s*<\/svg>/.test(code)) fail.push(`${post.slug}: empty <svg> in rendered output`);
}

// ---- totals, asserted rather than echoed ----
const live = POSTS.filter((p) => !p.draft).length;
const draft = POSTS.filter((p) => p.draft).length;
if (POSTS.length !== 105) fail.push(`manifest has ${POSTS.length} posts, expected 105`);
if (live !== 98) fail.push(`manifest has ${live} live posts, expected 98`);
if (draft !== 7) fail.push(`manifest has ${draft} draft posts, expected 7`);

// ---- masking: idempotence, injectivity, and no survivor ----
// The real IP_TABLE / HOST_TABLE live only in the gitignored
// scripts/lib/mask.local.mjs, so their integrity can only be checked here,
// at runtime against the actual loaded table — never by a committed test,
// which would have to either hardcode real values or print facts derived
// from them. tests/unit/mask.test.mjs checks the masking mechanism itself
// (anchoring, case handling, the gate) against fixtures instead.
const ipValues = Object.values(IP_TABLE);
if (new Set(ipValues).size !== ipValues.length) fail.push('IP_TABLE masked values are not pairwise distinct');
if (Object.keys(IP_TABLE).length !== 37) fail.push(`IP_TABLE has ${Object.keys(IP_TABLE).length} entries, expected 37`);

const hostValues = Object.values(HOST_TABLE);
if (new Set(hostValues).size !== hostValues.length) fail.push('HOST_TABLE masked values are not pairwise distinct');
if (Object.keys(HOST_TABLE).length !== 5) fail.push(`HOST_TABLE has ${Object.keys(HOST_TABLE).length} entries, expected 5`);

// Idempotence precondition: no replacement value is itself a source key.
const ipKeys = new Set(Object.keys(IP_TABLE));
for (const v of ipValues) if (ipKeys.has(v)) fail.push(`IP_TABLE value ${v} is itself a table key`);
const hostKeys = new Set(Object.keys(HOST_TABLE));
for (const v of hostValues) if (hostKeys.has(v)) fail.push(`HOST_TABLE value ${v} is itself a table key`);

// Preserve list must never be shadowed by a rewrite entry.
for (const ip of PRESERVE) if (IP_TABLE[ip] !== undefined) fail.push(`PRESERVE entry ${ip} is also an IP_TABLE key`);

for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith('.md'))) {
  const text = fs.readFileSync(path.join(OUT, file), 'utf8');
  const leaked = findUnmasked(text);
  if (leaked.length) fail.push(`${file}: unmasked address ${leaked.join(', ')}`);
  if (maskText(text) !== text) fail.push(`${file}: masking is not idempotent`);
}

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

// ---- permissive audit: does not reuse the rewriter's/gate's anchors ----
// Two real addresses reached production because a converted table cell
// concatenated an address directly against a letter (`192.168.1.xMac`), and
// IP_RULES / IN_SCOPE shared a `\b` trailing anchor that a letter satisfies
// without actually bounding the address. findUnmasked (used above) shares
// that anchor, so it shares the blind spot — it cannot be trusted to check
// itself. This scan deliberately does not reuse it.
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

// ---- test-reports/ gitignored ----
const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
if (!/^test-reports\/?$/m.test(gitignore)) fail.push('test-reports/ is not gitignored');

// The blogs directory is actively written to. Anything that appears there and
// is neither migrated nor deliberately excluded is a post we would silently drop.
const EXCLUDED = new Set([
  'nfs-meltdown (Copy)', 'linux_hacks.md', 'nginx_tutorials.md', 'docs',
  'redesign-mockup.html', 'animation-preview.html', 'traffic-animations.html',
  'token-consumption-24h.html', 'token-consumption.svg', '.superpowers',
  'omlx-blog-mocks-v2.html',
  '2026-10-02-gemma-4-e2b-mm1-mlx', '2026-10-03-gemma-4-mlx-kaggle-mirror',
  // Consumed post assets in the blogs root (referenced by network-spike-investigation), not posts.
  'network-spike-1.jpeg', 'network-spike-2.jpeg',
  // Owner decision: personal photos dropped in the blogs root, not posts.
  'WhatsApp Image 2026-03-01 at 10.14.02 AM (1).jpeg',
  'WhatsApp Image 2026-03-01 at 10.14.02 AM.jpeg',
]);
const known = new Set(POSTS.map((p) => p.src.split('/')[0]));
const stray = fs.readdirSync(BLOGS)
  .filter((n) => !n.startsWith('.') && !known.has(n) && !EXCLUDED.has(n));
if (stray.length) fail.push(`unaccounted for in ~/Documents/blogs: ${stray.join(', ')}`);

// ---- summary: 96 managed posts, distinct from the directory total ----
const total = fs.readdirSync(OUT).filter((f) => f.endsWith('.md')).length;
console.log(`migrated: ${POSTS.length}/${POSTS.length}  (${live} live, ${draft} draft)`);
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
