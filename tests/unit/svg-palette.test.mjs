import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* SVG palette normalisation.
   The 203 migrated diagrams arrived carrying 225 distinct colours from their
   original per-post <style> blocks, ~87 of them dark saturated fills. The post
   page now renders in the Confluence preview format (white card, pastel
   tints), so every diagram fill is normalised to a pastel by attribute-selector
   overrides in src/styles/svg-palette.css.

   Rules under test:
     1. shape fills/strokes resolve to a light pastel — no dark blocks anywhere
     2. every dark colour actually present in the content is covered by the map
     3. the map itself only ever resolves to a pastel (a typo can't smuggle a
        dark value back in)
     4. a stroke never collapses onto the same pastel as its fill
     5. text is normalised to a dark readable tone, never a pastel
     6. code blocks stay light
     7. the post page renders in one font system
*/

const BLOG = 'src/content/blog';
const PALETTE = 'src/styles/svg-palette.css';
const DIAGRAMS = 'src/styles/diagrams.css';
const GLOBAL = 'src/styles/global.css';

/** WCAG relative luminance. */
function lum(hex) {
  const h = String(hex).replace('#', '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) return null;
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.040445 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** Below this a fill reads as a dark block on the white card. */
const PASTEL_FLOOR = 0.55;
/** Above this, text on the white card is invisible. */
const TEXT_CEILING = 0.35;

const SHAPE_TAGS = new Set([
  'rect', 'circle', 'path', 'polygon', 'polyline', 'line', 'ellipse', 'g', 'stop',
]);

/** { 'fill:#16a34a': n } for every colour used on a shape. Kind is separated
    because a fill and a stroke resolve to different pastels. */
function shapeUsages() {
  const out = new Map();
  for (const f of readdirSync(BLOG).filter((n) => n.endsWith('.md'))) {
    const src = readFileSync(join(BLOG, f), 'utf8');
    for (const svg of src.match(/<svg[\s\S]*?<\/svg>/g) || []) {
      // <style> inside an SVG would confuse the tag scan; migration strips them.
      const body = svg.replace(/<style[\s\S]*?<\/style>/g, '');
      for (const tag of body.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
        if (!SHAPE_TAGS.has(tag[1].toLowerCase())) continue;
        for (const a of tag[2].matchAll(/\b(fill|stroke|stop-color)\s*=\s*["'](#[0-9a-fA-F]{3,8})["']/g)) {
          const key = `${a[1]}:${a[2].toLowerCase()}`;
          out.set(key, (out.get(key) || 0) + 1);
        }
      }
    }
  }
  return out;
}

function read(path) {
  return readFileSync(path, 'utf8');
}

/** { 'fill:#16a34a': '#dcfce7' } — every normalisation the stylesheet declares. */
function paletteMap() {
  const css = read(PALETTE);
  const map = new Map();
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const decl = rule[2];
    for (const d of decl.matchAll(/(fill|stroke|stop-color)\s*:\s*([^;!]+)/gi)) {
      const prop = d[1].toLowerCase();
      const value = d[2].trim().toLowerCase();
      for (const sel of rule[1].split(',')) {
        const attr = sel.match(/\[(fill|stroke|stop-color)=["'](#[0-9a-fA-F]{3,8})["']\]/i);
        if (!attr) continue;
        map.set(`${attr[1].toLowerCase()}:${attr[2].toLowerCase()}`, value);
      }
    }
  }
  return map;
}

const SHAPES = shapeUsages();
const MAP = paletteMap();

describe('diagram fills are pastel', () => {
  it('finds shapes to normalise (the audit found 203 diagrams)', () => {
    expect(SHAPES.size).toBeGreaterThan(100);
  });

  it('leaves no dark shape fill or stroke once the map is applied', () => {
    const offenders = [];
    for (const [usage] of SHAPES) {
      const resolved = MAP.get(usage) ?? usage.split(':')[1];
      const L = lum(resolved);
      if (L === null || L < PASTEL_FLOOR) offenders.push(`${usage} -> ${resolved} (lum ${L})`);
    }
    expect(offenders, 'these diagram fills are still dark blocks').toEqual([]);
  });

  it('only ever resolves the map to a pastel', () => {
    const dark = [];
    for (const [from, to] of MAP) {
      const L = lum(to);
      if (L === null || L < PASTEL_FLOOR) dark.push(`${from} -> ${to} (lum ${L})`);
    }
    expect(dark, 'the map itself contains a non-pastel target').toEqual([]);
  });

  it('keeps a stroke from collapsing onto the same pastel as its fill', () => {
    // Only pairs the generator actually rewrote are in scope: a colour that was
    // already a pastel is left alone, and reusing it for both fill and stroke
    // was the source author's own choice, not ours.
    const collapsed = [];
    for (const [usage] of SHAPES) {
      if (!usage.startsWith('fill:')) continue;
      const colour = usage.slice(5);
      const strokeKey = `stroke:${colour}`;
      if (!MAP.has(usage) || !MAP.has(strokeKey)) continue;
      if (MAP.get(usage) === MAP.get(strokeKey)) collapsed.push(colour);
    }
    expect(collapsed, 'a normalised stroke collapsed onto its fill').toEqual([]);
  });

  it('covers every dark colour actually present in the content', () => {
    const uncovered = [];
    for (const [usage] of SHAPES) {
      const colour = usage.split(':')[1];
      if (colour === '#ffffff' || colour === '#fff') continue;
      if ((lum(colour) ?? 0) >= PASTEL_FLOOR) continue; // already a pastel
      if (!MAP.has(usage)) uncovered.push(usage);
    }
    expect(uncovered, 'dark diagram colours with no entry in svg-palette.css').toEqual([]);
  });
});

describe('diagram text stays legible', () => {
  it('normalises every text fill to one dark tone', () => {
    const css = read(PALETTE);
    const blanket = css.match(/svg\s+text[\s,]*[^{]*\{([^}]*)\}/);
    expect(blanket, 'no blanket text rule').not.toBeNull();
    const fill = blanket[1].match(/fill\s*:\s*([^;!]+)/);
    expect(fill, 'blanket text rule sets no fill').not.toBeNull();
    // resolve var(--d-*) against diagrams.css
    let value = fill[1].trim();
    const varMatch = value.match(/var\(--([\w-]+)\)/);
    if (varMatch) {
      const tok = read(DIAGRAMS).match(new RegExp(`--${varMatch[1]}:\\s*([^;]+);`));
      expect(tok, `token --${varMatch[1]} undefined in diagrams.css`).not.toBeNull();
      value = tok[1].trim();
    }
    const L = lum(value);
    expect(L, `text tone ${value} is too light to read on white`).not.toBeNull();
    expect(L).toBeLessThanOrEqual(TEXT_CEILING);
  });

  it('keeps the dark anchor box off the page', () => {
    const css = read(DIAGRAMS);
    const dark = css.match(/--d-dark:\s*(#[0-9a-fA-F]{3,8})/i);
    if (!dark) return; // token removed entirely is also fine
    expect(lum(dark[1]), `--d-dark ${dark[1]} is still a dark block`).toBeGreaterThanOrEqual(PASTEL_FLOOR);
  });
});

describe('code blocks stay light', () => {
  it('renders fenced blocks on a light pastel', () => {
    const pre = read('src/layouts/PostLayout.astro').match(/\.post-art__body :global\(pre\)\s*\{([^}]*)\}/);
    expect(pre, 'no .post-art__body pre rule').not.toBeNull();
    const bg = pre[1].match(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/);
    expect(bg, 'code blocks have no explicit light background').not.toBeNull();
    expect(lum(bg[1]), `code block background ${bg[1]} is not light`).toBeGreaterThanOrEqual(0.85);
  });

  it('uses a light Shiki theme, not a dark one', () => {
    const cfg = read('astro.config.mjs');
    const theme = cfg.match(/theme:\s*['"]([^'"]+)['"]/);
    expect(theme, 'no shiki theme configured').not.toBeNull();
    expect(theme[1].toLowerCase()).not.toMatch(/dark|dracula|nord|night|material|monokai/);
  });
});

describe('the post page is one font system', () => {
  it('rebinds --font-sans to the reading stack on article pages', () => {
    const rule = read(GLOBAL).match(/\.chirp-shell--article[^{]*\{([^}]*)\}/);
    expect(rule, 'no --font-sans override scoped to article pages').not.toBeNull();
    expect(rule[1]).toMatch(/--font-sans\s*:\s*var\(--font-reading\)/);
  });

  it('defines --font-reading as the plain system UI sans', () => {
    const tok = read(GLOBAL).match(/--font-reading\s*:\s*([^;]+);/);
    expect(tok, 'no --font-reading token').not.toBeNull();
    expect(tok[1]).toMatch(/^system-ui/);
    expect(tok[1]).not.toMatch(/Merriweather/i);
  });

  it('keeps Merriweather off article pages', () => {
    const rule = read(GLOBAL).match(/\.chirp-shell--article[^{]*\{([^}]*)\}/);
    expect(rule[1]).not.toMatch(/Merriweather/i);
  });
});
