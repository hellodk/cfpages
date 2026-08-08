import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findUnmasked } from '../../scripts/lib/mask.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG = path.join(ROOT, 'src/content/blog');

/**
 * Six posts recovered from the two legacy repos. Four were publicly live on
 * hellodk.github.io and their Jekyll source is gone, so the rendered HTML is
 * the only surviving copy; two are drafts that were never published.
 *
 * Dates come from each page's <time datetime> or its frontmatter. They are
 * asserted here because the tempting failure is to stamp the migration date
 * on everything, which silently reorders the archive and makes a 2016 post
 * look like this week's work.
 *
 * The length floor guards the failure mode that actually happened during the
 * first migration: extraction picks the wrong container, writes a file with
 * valid frontmatter and almost no body, and every other check still passes.
 */
const RECOVERED = [
  { slug: 'deploy-jenkins-with-ssl',  date: '2023-03-14', title: /Jenkins/i },
  { slug: 'mobile-ci-cd',             date: '2023-03-16', title: /CI.?CD|Mobile/i },
  { slug: 'upgrading-sublime-text',   date: '2021-09-13', title: /Sublime/i },
  { slug: 'markdown-cheatsheet',      date: '2016-02-01', title: /Markdown/i },
  { slug: 'mac-shortcuts',            date: '2017-07-05', title: /Mac/i },
  { slug: 'understanding-git-flow',   date: '2015-11-09', title: /Git.?Flow/i },
];

/** Minimal frontmatter reader — avoids pulling a YAML dependency into tests. */
function readPost(slug) {
  const file = path.join(BLOG, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { raw, frontmatter: null, body: raw };
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { raw, frontmatter: fm, body: m[2] };
}

describe.each(RECOVERED)('recovered post: $slug', ({ slug, date, title }) => {
  const post = readPost(slug);

  it('exists', () => {
    expect(post, `src/content/blog/${slug}.md is missing`).not.toBeNull();
  });

  it('has parseable frontmatter', () => {
    expect(post?.frontmatter, 'frontmatter did not parse').toBeTruthy();
  });

  it('keeps its original publication date', () => {
    expect(post?.frontmatter?.date).toBe(date);
  });

  it('has a title matching the source', () => {
    expect(post?.frontmatter?.title ?? '').toMatch(title);
  });

  it('has a non-empty description', () => {
    const d = post?.frontmatter?.description ?? '';
    expect(d.length, 'description is empty').toBeGreaterThan(20);
  });

  it('has real body content, not an empty shell', () => {
    const words = (post?.body ?? '').trim().split(/\s+/).length;
    expect(words, `only ${words} words — extraction probably picked the wrong container`).toBeGreaterThan(80);
  });

  it('carries no Jekyll layout chrome', () => {
    const body = post?.body ?? '';
    for (const marker of ['{{ site.', '{% ', 'class="site-nav"', 'class="post-header"', 'class="site-footer"']) {
      expect(body, `leftover chrome: ${marker}`).not.toContain(marker);
    }
  });

  it('leaks no unmasked infrastructure address', () => {
    expect(findUnmasked(post?.raw ?? '')).toEqual([]);
  });
});

describe('the recovery as a whole', () => {
  it('adds six posts', () => {
    const present = RECOVERED.filter(r => readPost(r.slug) !== null);
    expect(present).toHaveLength(6);
  });

  it('collides with no existing slug', () => {
    const all = fs.readdirSync(BLOG).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
    const dupes = all.filter((s, i) => all.indexOf(s) !== i);
    expect(dupes).toEqual([]);
  });
});
