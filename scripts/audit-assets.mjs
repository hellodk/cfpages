#!/usr/bin/env node
/**
 * Measure every image and inline SVG the published posts ship.
 *
 *   node scripts/audit-assets.mjs            # human-readable summary
 *   node scripts/audit-assets.mjs --json     # machine-readable, for tests
 *
 * The numbers quoted in docs/UI_UX_AUDIT.md come from here, and
 * tests/unit/asset-audit.test.mjs re-runs it so the document cannot drift away
 * from the site without a test failing.
 */
import fs from 'fs';
import path from 'path';
import { parsePost, auditSvgs, probeImage, LIMITS } from './lib/asset-audit.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BLOG = path.join(ROOT, 'src/content/blog');
const PUBLIC = path.join(ROOT, 'public');

// Mirrors src/utils/postCover.ts. Kept in step by reading the same table the
// site reads, so a change there shows up here rather than silently diverging.
const coversTs = fs.readFileSync(path.join(ROOT, 'src/data/post-covers.ts'), 'utf8');
const SLUG_COVERS = Object.fromEntries([...coversTs.matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
const DEFAULT_COVER = coversTs.match(/DEFAULT_COVER\s*=\s*'([^']+)'/)?.[1] ?? 'assets/images/cover1.jpg';
const TAG_COVERS = {
  kubernetes: 'assets/images/kubernetes/kubernetes_logo.png',
  cassandra: 'assets/images/cassandra/astronaut_on_the_moon.jpg',
};

const abs = (p) => '/' + p.replace(/^\//, '');

function resolveCover({ fm, tags, body }, slug) {
  if (fm.cover) return [abs(fm.cover), 'frontmatter'];
  if (SLUG_COVERS[slug]) return [abs(SLUG_COVERS[slug]), 'SLUG_COVERS'];
  const md = body.match(/!\[[^\]]*\]\(([^)\s]+)/);
  const html = body.match(/<img[^>]+src=["']([^"']+)/i);
  for (const c of [md, html]) {
    if (c && !c[1].startsWith('http') && !c[1].startsWith('data:')) return [abs(c[1]), 'body image'];
  }
  for (const t of tags) {
    if (TAG_COVERS[t.toLowerCase()]) return [abs(TAG_COVERS[t.toLowerCase()]), 'tag default'];
  }
  return [abs(DEFAULT_COVER), 'DEFAULT_COVER'];
}

export function audit() {
  const posts = [];

  for (const file of fs.readdirSync(BLOG).filter((f) => f.endsWith('.md')).sort()) {
    const parsed = parsePost(fs.readFileSync(path.join(BLOG, file), 'utf8'));
    if (!parsed || parsed.fm.draft === 'true') continue;
    const slug = file.slice(0, -3);
    const [cover, coverSource] = resolveCover(parsed, slug);

    const seen = new Set();
    const bodyImages = [];
    for (const re of [/!\[[^\]]*\]\(([^)\s]+)/g, /<img[^>]+src=["']([^"']+)/gi]) {
      for (const m of parsed.body.matchAll(re)) {
        const u = m[1];
        if (u.startsWith('http') || u.startsWith('data:') || seen.has(u)) continue;
        seen.add(u);
        bodyImages.push(probeImage(PUBLIC, abs(u)));
      }
    }

    posts.push({
      slug,
      title: parsed.fm.title ?? '',
      date: parsed.fm.date ?? '',
      tags: parsed.tags,
      cover: probeImage(PUBLIC, cover),
      coverSource,
      bodyImages,
      svgs: auditSvgs(parsed.body),
    });
  }

  const svgs = posts.flatMap((p) => p.svgs.map((s) => ({ ...s, slug: p.slug })));
  const diagrams = svgs.filter((s) => !s.isIcon);
  const issues = svgs.flatMap((s) => s.issues.map((i) => ({ ...i, slug: s.slug, idx: s.idx, isIcon: s.isIcon })));
  const count = (kind) => issues.filter((i) => i.kind === kind).length;
  const postsWith = (kind) => [...new Set(issues.filter((i) => i.kind === kind).map((i) => i.slug))];
  // Occurrences and affected SVGs are both worth reporting: 1,047 tiny labels
  // spread over 80 diagrams is a different remediation job to 1,047 spread
  // over three.
  const svgsWith = (kind) =>
    new Set(issues.filter((i) => i.kind === kind).map((i) => `${i.slug}#${i.idx}`)).size;
  const KINDS = ['tiny-font', 'low-contrast', 'dark-panel', 'no-role', 'no-aria-label',
                 'diagonal', 'text-past-viewbox', 'blank-line', 'no-viewbox'];

  return {
    posts,
    totals: {
      publishedPosts: posts.length,
      postsWithSvg: posts.filter((p) => p.svgs.length).length,
      svgs: svgs.length,
      diagrams: diagrams.length,
      icons: svgs.length - diagrams.length,
      cleanSvgs: svgs.filter((s) => !s.issues.length).length,
      coversOnDefault: posts.filter((p) => p.coverSource === 'DEFAULT_COVER').length,
      distinctCovers: new Set(posts.map((p) => p.cover.path)).size,
      missingCovers: posts.filter((p) => !p.cover.exists).length,
      missingBodyImages: posts.flatMap((p) => p.bodyImages).filter((i) => !i.exists).length,
      oversizedCovers: [...new Set(posts.filter((p) => (p.cover.kb ?? 0) > LIMITS.COVER_MAX_KB).map((p) => p.cover.path))].length,
      narrowCovers: [...new Set(posts.filter((p) => p.cover.w && p.cover.w < LIMITS.COVER_MIN_WIDTH).map((p) => p.cover.path))].length,
      distinctAspects: new Set(posts.map((p) => p.cover.aspect).filter(Boolean)).size,
    },
    issueCounts: Object.fromEntries(KINDS.map((k) => [k, count(k)])),
    svgsByIssue: Object.fromEntries(KINDS.map((k) => [k, svgsWith(k)])),
    postsByIssue: Object.fromEntries(
      ['tiny-font', 'low-contrast', 'dark-panel', 'diagonal', 'text-past-viewbox']
        .map((k) => [k, postsWith(k).sort()]),
    ),
    issues,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = audit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(r, null, 1));
  } else {
    console.log('totals');
    for (const [k, v] of Object.entries(r.totals)) console.log(`  ${k.padEnd(22)} ${v}`);
    console.log('\nsvg issues            occurrences  svgs  posts');
    for (const [k, v] of Object.entries(r.issueCounts)) {
      const posts = new Set(r.issues.filter((i) => i.kind === k).map((i) => i.slug)).size;
      console.log(`  ${k.padEnd(20)} ${String(v).padStart(9)} ${String(r.svgsByIssue[k]).padStart(6)} ${String(posts).padStart(6)}`);
    }
    console.log('\nposts by issue');
    for (const [k, v] of Object.entries(r.postsByIssue)) {
      console.log(`  ${k} (${v.length}): ${v.join(', ')}`);
    }
  }
}
