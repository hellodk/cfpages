#!/usr/bin/env node
/**
 * Recover six posts from the two legacy repos into src/content/blog/.
 *
 *   node scripts/recover-legacy-posts.mjs
 *
 * Four of them were publicly live on hellodk.github.io and their Jekyll source
 * no longer exists — the rendered HTML is the only surviving copy, so the body
 * has to be lifted back out of a full page. Two are unpublished drafts from
 * staging.hellodk.in and still have their frontmatter.
 *
 * This is deliberately a one-shot script rather than part of `prebuild`: it
 * reaches out to GitHub, and a Cloudflare Pages build must never depend on a
 * third-party fetch succeeding.
 *
 * Dates come from each page's <time datetime> or its frontmatter — never from
 * the clock. Stamping the run date would silently reorder the archive.
 */
import fs from 'fs';
import path from 'path';
import { parse } from 'node-html-parser';
import { maskText } from './lib/mask.mjs';
import { buildTurndown, firstProseParagraph, decodeEntities } from './lib/html-to-md.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'src/content/blog');

const BUILT = 'https://raw.githubusercontent.com/hellodk/hellodk.github.io/master';
const DRAFTS = 'https://raw.githubusercontent.com/hellodk/staging.hellodk.in/master/_drafts';

const POSTS = [
  { url: `${BUILT}/jenkins_installation_ssl.html`, slug: 'deploy-jenkins-with-ssl', kind: 'built', tags: ['jenkins', 'ssl', 'ci-cd'] },
  { url: `${BUILT}/mobile_ci_cd.html`, slug: 'mobile-ci-cd', kind: 'built', tags: ['ci-cd', 'mobile', 'android', 'ios'] },
  { url: `${BUILT}/sublime-upgrade.html`, slug: 'upgrading-sublime-text', kind: 'built', tags: ['tooling', 'editor'] },
  { url: `${BUILT}/mark_down_cheatsheet.html`, slug: 'markdown-cheatsheet', kind: 'built', tags: ['markdown', 'reference'] },
  { url: `${DRAFTS}/2017-07-05-mac_shortcuts.html`, slug: 'mac-shortcuts', kind: 'draft', tags: ['macos', 'productivity'] },
  { url: `${DRAFTS}/2015-11-09-understanding_git_flow.md`, slug: 'understanding-git-flow', kind: 'draft', tags: ['git', 'workflow'] },
];

/**
 * Page furniture on the built Jekyll pages. The body itself is `.post-content`,
 * so this only has to catch what sits inside it.
 */
const CHROME = ['script', 'style', 'noscript', '.share', '.post-nav', '.related', '#disqus_thread', '.comments'];

// Same Turndown rules as the main migration — tables and fenced code included.
const turndown = buildTurndown();

/** Read <time datetime> — the published date, not the build date. */
function builtDate(root, html) {
  const t = root.querySelector('time[datetime]');
  if (t) return t.getAttribute('datetime').slice(0, 10);
  const m = html.match(/datetime="(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { fm, body: m[2] };
}

function extractBuilt(html) {
  const root = parse(html);
  const title = decodeEntities((root.querySelector('title')?.text ?? '').trim());
  const date = builtDate(root, html);
  const content = root.querySelector('.post-content') ?? root.querySelector('article');
  if (!content) throw new Error('no .post-content or <article> found');
  for (const sel of CHROME) content.querySelectorAll(sel).forEach((n) => n.remove());
  // The rendered page repeats the title as an <h1> inside the article; the
  // layout renders the frontmatter title above the body, so keeping it would
  // print the heading twice.
  const h1 = content.querySelector('h1');
  if (h1 && h1.text.trim().toLowerCase() === title.toLowerCase()) h1.remove();
  return { title, date, md: turndown.turndown(content.innerHTML) };
}

function extractDraft(raw, url) {
  const { fm, body } = parseFrontmatter(raw);
  const title = decodeEntities(fm.title ?? '');
  const date = (fm.date ?? '').slice(0, 10) || (url.match(/(\d{4}-\d{2}-\d{2})/) ?? [])[1] || null;
  // `.md` drafts are already markdown; `.html` drafts are body fragments.
  const md = url.endsWith('.md') ? body : turndown.turndown(body);
  return { title, date, md };
}

/**
 * Body images come out of the legacy HTML as `assets/images/...` — relative,
 * which on a post served at `/slug/` resolves to `/slug/assets/...` and 404s.
 * Rewrite them to absolute and pull the files across, because the images live
 * only in the legacy repo. `public/assets/images/` is the committed tree; the
 * top-level `assets/` is local-only per scripts/sync-public-assets.sh.
 */
const ASSET_ROOTS = [
  'https://raw.githubusercontent.com/hellodk/hellodk.github.io/master',
  'https://raw.githubusercontent.com/hellodk/staging.hellodk.in/master',
];

async function fetchAssets(md) {
  const refs = [...md.matchAll(/!\[[^\]]*\]\((assets\/[^)\s"]+)/g)].map((m) => m[1]);
  for (const rel of new Set(refs)) {
    const dest = path.join(ROOT, 'public', rel);
    if (fs.existsSync(dest)) continue;
    let saved = false;
    for (const base of ASSET_ROOTS) {
      const res = await fetch(`${base}/${rel.split('/').map(encodeURIComponent).join('/')}`);
      if (!res.ok) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log(`    ↓ ${rel}`);
      saved = true;
      break;
    }
    if (!saved) throw new Error(`asset not found in either legacy repo: ${rel}`);
  }
  return md.replace(/(!\[[^\]]*\]\()assets\//g, '$1/assets/');
}

function frontmatter({ title, date, description, tags }) {
  const esc = (s) => s.replace(/"/g, '\\"');
  return [
    '---',
    `title: "${esc(title)}"`,
    `date: ${date}`,
    `description: "${esc(description)}"`,
    `tags: [${tags.join(', ')}]`,
    'draft: false',
    '---',
    '',
  ].join('\n');
}

async function main() {
  let written = 0;
  for (const post of POSTS) {
    const res = await fetch(post.url);
    if (!res.ok) throw new Error(`${post.url} → HTTP ${res.status}`);
    const raw = await res.text();

    const { title, date, md } =
      post.kind === 'built' ? extractBuilt(raw) : extractDraft(raw, post.url);

    if (!title) throw new Error(`${post.slug}: no title`);
    if (!date) throw new Error(`${post.slug}: no date — refusing to stamp today's`);

    const body = await fetchAssets(maskText(md).replace(/\n{3,}/g, '\n\n').trim());
    const words = body.split(/\s+/).length;
    if (words < 80) throw new Error(`${post.slug}: only ${words} words — wrong container?`);

    const description =
      maskText(firstProseParagraph(body) ?? '').slice(0, 300) ||
      `${title} — recovered from the legacy site.`;

    fs.writeFileSync(
      path.join(OUT, `${post.slug}.md`),
      frontmatter({ title, date, description, tags: post.tags }) + '\n' + body + '\n',
      'utf8',
    );
    console.log(`✓ ${post.slug.padEnd(26)} ${date}  ${words} words`);
    written++;
  }
  console.log(`\nRecovered ${written} posts.`);
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
