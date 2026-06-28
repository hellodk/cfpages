/**
 * Build a lightweight knowledge index for search fallback + AI chat widget.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLOG_DIR = path.join(__dirname, '../src/content/blog');
const OUT = path.join(__dirname, '../public/knowledge-index.json');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('[')) {
      meta[m[1]] = v.replace(/[[\]'"]/g, '').split(',').map(t => t.trim()).filter(Boolean);
    } else {
      meta[m[1]] = v.replace(/^["']|["']$/g, '');
    }
  }
  return { meta, body: match[2] };
}

const entries = [];

for (const file of fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))) {
  const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  if (meta.draft === 'true' || meta.draft === true) continue;

  const slug = file.replace(/\.md$/, '');
  if (slug === 'author' || slug === 'resume') continue;

  const tags = Array.isArray(meta.tags)
    ? meta.tags
    : (meta.tags || '').split(',').map(t => t.trim()).filter(Boolean);

  const excerpt = body
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*`[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);

  entries.push({
    slug,
    url: `https://hellodk.io/${slug}`,
    title: meta.title || slug,
    description: meta.description || '',
    tags,
    excerpt,
  });
}

entries.sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), posts: entries }, null, 0));
console.log(`Wrote ${entries.length} posts to knowledge-index.json`);
