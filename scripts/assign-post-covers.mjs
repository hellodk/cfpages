#!/usr/bin/env node
/** Write unique cover: fields from src/data/post-covers.ts into blog frontmatter */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG = path.join(__dirname, '../src/content/blog');
const { SLUG_COVERS } = await import(pathToFileURL(path.join(__dirname, '../src/data/post-covers.ts')).href);

let updated = 0;
for (const [slug, cover] of Object.entries(SLUG_COVERS)) {
  const file = path.join(BLOG, `${slug}.md`);
  if (!fs.existsSync(file)) continue;

  let raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) continue;

  let fm = m[1];
  const body = m[2];
  if (/^cover:/m.test(fm)) {
    fm = fm.replace(/^cover:.*$/m, `cover: "${cover}"`);
  } else {
    fm = fm.trimEnd() + `\ncover: "${cover}"`;
  }
  fs.writeFileSync(file, `---\n${fm}\n---\n${body}`);
  updated++;
  console.log(`✓ ${slug} → ${cover}`);
}
console.log(`\nUpdated ${updated} posts.`);
