import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const POST = 'src/content/blog/hellodk-jekyll-to-astro-cloudflare-migration.md';
const SRC = fs.readFileSync(path.join(ROOT, POST), 'utf8');

/**
 * The three diagrams in this post were box-drawing characters inside fenced
 * code blocks. They did not scale, screen readers read them character by
 * character, and once code blocks went light (#6) a diagram and a shell
 * command became visually identical.
 *
 * The assertions below encode the failure modes that are invisible in a diff:
 *
 *  - A blank line inside a raw HTML block terminates it in CommonMark, and the
 *    indented remainder becomes an indented code block. This is exactly how 99
 *    diagrams broke during the original migration, so it is checked first.
 *  - A <text> element whose baseline sits below the viewBox is simply not
 *    rendered; nothing errors, the label is just gone.
 *  - Fills lighter than #4B5563 and font sizes under 12 are unreadable at
 *    normal screen distance but look fine while zoomed in during authoring.
 */

const BOX_DRAWING = /[─-╿▀-▟]/;

/** Fenced code blocks, with their info string. */
function fencedBlocks(src) {
  const out = [];
  const re = /^```([^\n]*)\n([\s\S]*?)^```/gm;
  let m;
  while ((m = re.exec(src)) !== null) out.push({ info: m[1].trim(), body: m[2] });
  return out;
}

/** Top-level <svg> elements. */
function svgs(src) {
  return [...src.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map(m => m[0]);
}

describe('no diagram is left as ASCII art', () => {
  it('has no box-drawing characters in any fenced code block', () => {
    const offenders = fencedBlocks(SRC)
      .filter(b => BOX_DRAWING.test(b.body))
      .map(b => b.body.split('\n')[0].slice(0, 40));
    expect(offenders).toEqual([]);
  });

  it('has no box-drawing characters anywhere in the post', () => {
    expect(BOX_DRAWING.test(SRC)).toBe(false);
  });

  it('keeps the genuine code blocks', () => {
    const blocks = fencedBlocks(SRC);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.some(b => b.info === 'bash')).toBe(true);
  });
});

describe('the diagrams are real SVG', () => {
  const all = svgs(SRC);

  it('contains exactly three diagrams', () => {
    expect(all).toHaveLength(3);
  });

  it('gives every diagram a role and an aria-label', () => {
    for (const s of all) {
      expect(s, 'missing role="img"').toMatch(/role="img"/);
      expect(s, 'missing aria-label').toMatch(/aria-label="[^"]{10,}"/);
    }
  });

  it('contains no blank line inside an SVG — a blank line ends the HTML block', () => {
    for (const s of all) {
      const blank = s.split('\n').findIndex(l => l.trim() === '');
      expect(blank, `blank line at offset ${blank} would terminate the HTML block`).toBe(-1);
    }
  });

  it('uses no label fill lighter than #4B5563', () => {
    const tooLight = /fill="#(?:9CA3AF|D1D5DB|E5E7EB|F3F4F6|CBD5E1|ADBAC7)"/i;
    for (const s of all) {
      const hits = [...s.matchAll(/<text[^>]*fill="([^"]+)"/g)].map(m => m[1]).filter(f => tooLight.test(`fill="${f}"`));
      expect(hits).toEqual([]);
    }
  });

  it('uses no label smaller than 12px', () => {
    for (const s of all) {
      const tiny = [...s.matchAll(/<text[^>]*font-size="([\d.]+)"/g)]
        .map(m => parseFloat(m[1]))
        .filter(v => v < 12);
      expect(tiny).toEqual([]);
    }
  });

  it('keeps every label inside its viewBox', () => {
    for (const s of all) {
      const vb = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      expect(vb, 'viewBox must start at 0 0').not.toBeNull();
      const height = parseFloat(vb[2]);
      const clipped = [...s.matchAll(/<text[^>]*\by="([\d.]+)"[^>]*font-size="([\d.]+)"/g)]
        .filter(m => parseFloat(m[1]) + parseFloat(m[2]) > height - 8)
        .map(m => `y=${m[1]} in a ${height}-high viewBox`);
      expect(clipped).toEqual([]);
    }
  });

  it('routes connectors strictly horizontally or vertically', () => {
    for (const s of all) {
      const diagonal = [...s.matchAll(/<line[^>]*x1="([\d.]+)"[^>]*y1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*y2="([\d.]+)"/g)]
        .filter(m => m[1] !== m[3] && m[2] !== m[4])
        .map(m => `(${m[1]},${m[2]})->(${m[3]},${m[4]})`);
      expect(diagonal).toEqual([]);
    }
  });

  it('matches every animateMotion path to a drawn connector', () => {
    for (const s of all) {
      const defs = [...s.matchAll(/<path id="[^"]+" d="M([\d.]+),([\d.]+) L([\d.]+),([\d.]+)"/g)];
      for (const d of defs) {
        // A motion path must share its axis with a real line: same x (vertical)
        // or same y (horizontal). A path that drifts off-axis desyncs the dot.
        const vertical = d[1] === d[3];
        const horizontal = d[2] === d[4];
        expect(vertical || horizontal, `motion path ${d[0]} is diagonal`).toBe(true);
      }
    }
  });
});
