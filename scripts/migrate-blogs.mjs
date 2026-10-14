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

/**
 * Cover images live in src/data/post-covers.ts as a SLUG_COVERS map. It is a
 * .ts file, so it cannot be imported from this .mjs script — parse the literal
 * instead. Only 9 of the 65 managed slugs are mapped; the rest ship without a
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
 * Copy any sibling asset the body references as `./name.ext` into
 * public/assets/blog/<slug>/ and rewrite the reference. Driven by what the
 * body actually cites, so no post is special-cased. Today only nfs-meltdown
 * has such references (6 files). Raster formats (png/jpeg/webp/gif/avif)
 * ride the same path as SVG: text formats get masked, binaries copy byte
 * for byte (e.g. the network-spike phone screenshots).
 */
function copyAssets(post, body) {
  const referenced = [...body.matchAll(/\.\/([\w.-]+\.(svg|png|jpe?g|webp|gif|avif))/gi)].map((m) => m[1]);
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

  const leaked = findUnmasked(`${title}\n${description}\n${body}\n${post.tldr?.summary ?? ''}\n${(post.tldr?.points ?? []).map((p) => `${p.k} ${p.v}`).join('\n')}`);
  if (leaked.length) problems.push(`${post.slug}: unmasked ${leaked.join(', ')}`);

  const frontmatter = [
    '---',
    `title: ${yaml(title)}`,
    `date: ${post.date}`,
    `description: ${yaml(description)}`,
    `tags: [${post.tags.join(', ')}]`,
    ...(COVERS[post.slug] ? [`cover: ${yaml(COVERS[post.slug])}`] : []),
    `draft: ${post.draft}`,
    // Per-post TL;DR panel (see PostLayout): emitted only when the manifest
    // entry carries one, so no post ever shows another post's summary.
    ...(post.tldr ? [
      'tldr:',
      `  summary: ${yaml(post.tldr.summary)}`,
      '  points:',
      ...post.tldr.points.map((p) => `    - { k: ${yaml(p.k)}, v: ${yaml(p.v)} }`),
    ] : []),
    '---',
    '',
  ].join('\n');

  // A source that converts to nothing is a failure, not a post. custom-vs-code-plugin
  // is a genuine 108-byte stub and sits just above this bar.
  if (body.trim().length < 50) {
    problems.push(`${post.slug}: converted body is ${body.trim().length} chars — source may not have parsed`);
  }

  fs.writeFileSync(path.join(OUT, `${post.slug}.md`), `${frontmatter}\n${body}\n`);
  written += 1;
  console.log(`✓ ${post.slug}.md${post.draft ? '  (draft)' : ''}`);
}

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

console.log(`\nWrote ${written}/${POSTS.length} posts.`);

if (problems.length) {
  console.error('\n✗ Problems:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
