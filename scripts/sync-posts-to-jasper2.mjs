#!/usr/bin/env node
/**
 * Sync hellodk blog posts from Astro content into vanilla jekyllt/jasper2.
 * Usage: node scripts/sync-posts-to-jasper2.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src/content/blog');
const JASPER = path.join(ROOT, 'theme-previews/jasper2-hellodk');
const POSTS_OUT = path.join(JASPER, '_posts');
const ASSETS_SRC = path.join(ROOT, 'public/assets');
const ASSETS_DST = path.join(JASPER, 'assets');

const SKIP_SLUGS = new Set(['author']); // dedicated pages, not blog posts

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) {
      meta[kv[1]] = v.replace(/[[\]'"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    } else {
      meta[kv[1]] = v.replace(/^["']|["']$/g, '');
    }
  }
  return { meta, body: m[2] };
}

function yamlQuote(s) {
  return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function cleanBody(body, description) {
  if (body.trim().startsWith('<')) return body;

  if (body.includes('On This Page') || body.includes('**hellodk.io**')) {
    const start = body.search(/^## \d+\S/m);
    if (start > 0) body = body.slice(start);
  }

  body = body.replace(/^##\s*\n\s+/gm, '## ');
  body = body.replace(/^## (\d+)([A-Za-z])/gm, '## $1. $2');

  const intro = description?.trim();
  if (intro && !body.includes(intro.slice(0, 40))) {
    body = `${intro}\n\n${body}`;
  }
  return body.replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

const TAG_COVERS = {
  kubernetes: 'assets/images/kubernetes/kubernetes_logo.png',
  devops: 'assets/images/utilities/IMG_75751.JPG',
  monitoring: 'assets/images/kubernetes/kubernetes_logo.png',
};

function resolveCover(cover, tags) {
  const c = (cover || '').replace(/^\//, '');
  if (c) return c;
  for (const t of tags) {
    if (TAG_COVERS[t]) return TAG_COVERS[t];
  }
  return 'assets/images/utilities/IMG_75751.JPG';
}

function formatDate(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return { file: `${y}-${mo}-${day}`, display: `${y}-${mo}-${day} 12:00:00` };
}

// Remove demo posts
if (fs.existsSync(POSTS_OUT)) {
  for (const f of fs.readdirSync(POSTS_OUT)) {
    fs.unlinkSync(path.join(POSTS_OUT, f));
  }
}

let count = 0;
for (const file of fs.readdirSync(SRC).filter(f => f.endsWith('.md')).sort()) {
  const slug = file.replace(/\.md$/, '');
  if (SKIP_SLUGS.has(slug)) continue;

  const parsed = parseFrontmatter(fs.readFileSync(path.join(SRC, file), 'utf8'));
  if (!parsed) continue;
  if (parsed.meta.draft === 'true' || parsed.meta.draft === true) continue;

  const { file: datePrefix, display: dateDisplay } = formatDate(parsed.meta.date);
  const tags = Array.isArray(parsed.meta.tags) ? parsed.meta.tags : [];
  const tagStr = tags.join(' ');
  const cover = resolveCover(parsed.meta.cover, tags);
  const title = parsed.meta.title || slug;
  const description = parsed.meta.description || '';

  const fm = [
    '---',
    'layout: post',
    'current: post',
    'navigation: true',
    `title: ${yamlQuote(title)}`,
    `date: ${dateDisplay}`,
    tagStr ? `tags: ${tagStr}` : 'tags: blog',
    'class: post-template',
    `subclass: 'post tag-${tags[0] || 'blog'}'`,
    'author: dk',
    `cover: ${cover}`,
    description ? `excerpt: ${yamlQuote(description)}` : null,
    '---',
  ].filter(Boolean).join('\n');

  const outName = `${datePrefix}-${slug}.md`;
  let body = cleanBody(parsed.body.replace(/^---$/gm, '* * *'), description);
  if (!body.includes('{% raw %}')) {
    body = `{% raw %}\n${body}\n{% endraw %}\n`;
  }
  fs.writeFileSync(path.join(POSTS_OUT, outName), `${fm}\n${body}`);
  count++;
}

// Copy assets
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyDir(ASSETS_SRC, ASSETS_DST);
if (fs.existsSync(path.join(ROOT, 'public/images'))) {
  copyDir(path.join(ROOT, 'public/images'), path.join(ASSETS_DST, 'images'));
}

console.log(`Synced ${count} posts to ${POSTS_OUT}`);
