import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BLOG = path.join(ROOT, 'src/content/blog');
const DOC = fs.readFileSync(path.join(ROOT, 'docs/COVER_IMAGE_BRIEF.md'), 'utf8');

/**
 * The brief is only useful if it maps one-to-one onto what the site publishes.
 * The two ways it rots are a new post shipping without an entry, and an entry
 * surviving a post that was renamed or unpublished — both silent, both leaving
 * a post on the shared default cover.
 */

/**
 * Slugs of everything currently published. `draft: true` is the only listing
 * filter the site applies (src/pages/index.astro), so it is the only one here.
 */
function publishedSlugs() {
  return fs
    .readdirSync(BLOG)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !/^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(BLOG, f), 'utf8').split('\n---')[0]))
    .map((f) => f.slice(0, -3))
    .sort();
}

/** Slugs the brief gives a subject to — first cell of a subject-table row. */
function briefedSlugs() {
  return [...DOC.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*(.+?)\s*\|\s*$/gm)]
    .map((m) => m[1])
    .sort();
}

describe('the brief covers exactly what the site publishes', () => {
  const published = publishedSlugs();
  const briefed = briefedSlugs();

  it('briefs all 103 published posts', () => {
    expect(briefed).toHaveLength(103);
    expect(published).toHaveLength(103);
  });

  it('leaves no published post without a subject', () => {
    expect(published.filter((s) => !briefed.includes(s))).toEqual([]);
  });

  it('briefs no post that does not exist', () => {
    expect(briefed.filter((s) => !published.includes(s))).toEqual([]);
  });

  it('briefs each post exactly once', () => {
    const dupes = briefed.filter((s, i) => briefed.indexOf(s) !== i);
    expect(dupes).toEqual([]);
  });
});

describe('every subject is concrete enough to generate from', () => {
  const rows = [...DOC.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|\s*(.+?)\s*\|\s*$/gm)]
    .map((m) => ({ slug: m[1], subject: m[2] }));

  it.each(rows)('$slug describes a scene, not a mood', ({ subject }) => {
    // A one-line subject is a mood board entry; the generator needs a scene.
    expect(subject.split(/\s+/).length).toBeGreaterThan(12);
  });

  it.each(rows)('$slug names no AI-cliché element', ({ subject }) => {
    const banned = /\b(hologram|holographic|neon|robot|android|circuit board|binary code|wireframe|glowing)\b/i;
    expect(subject).not.toMatch(banned);
  });

  it.each(rows)('$slug puts no human in the frame', ({ subject }) => {
    // Targets a human specifically. "clock hands", "a seal face" and
    // "hand-drawn" are all legitimate photographic subjects; a `\bhands?\b`
    // ban flags all three, which is why this matches on human context instead.
    const human = /\b(human|person|people|portrait|man|woman|child|someone|figure|model|holding it|his |her |their hands)\b/i;
    expect(subject).not.toMatch(human);
  });

  it.each(rows)('$slug keeps text out of the frame or explicitly unreadable', ({ subject }) => {
    // Legible text is the strongest generated-image tell, so any subject that
    // involves printed matter has to neutralise it in the same sentence.
    if (!/\b(print|text|writing|written|label|title|number|handwriting|name plate|spines?)\b/i.test(subject)) return;
    const neutralised = /illegible|unreadable|out of focus|blank|no writing|too small to resolve|worn to illegibility|rather than readable|nothing written is legible|not legible/i;
    expect(subject).toMatch(neutralised);
  });
});

describe('the style contract states its constraints', () => {
  it('bans the four highest-signal tells', () => {
    for (const rule of [/No text, letters/i, /No people, hands, faces/i, /No logos/i, /No screens/i]) {
      expect(DOC).toMatch(rule);
    }
  });

  it('lists the AI-cliché subjects to avoid', () => {
    expect(DOC).toMatch(/Never generate/i);
    for (const cliche of [/circuit-board/i, /hologram/i, /wireframe/i, /humanoid robot/i]) {
      expect(DOC).toMatch(cliche);
    }
  });

  it('fixes one set of technical values', () => {
    expect(DOC).toMatch(/1800 × 1200/);
    expect(DOC).toMatch(/3:2/);
    expect(DOC).toMatch(/400KB/);
    expect(DOC).toMatch(/JPEG/);
  });

  it('states the safe area, because four surfaces crop the same file', () => {
    expect(DOC).toMatch(/central horizontal third/i);
    expect(DOC).toMatch(/3\.08/);
  });

  it('records that SLUG_COVERS is dead code', () => {
    expect(DOC).toMatch(/SLUG_COVERS.*dead code/is);
  });
});
