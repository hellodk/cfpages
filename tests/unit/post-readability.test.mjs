import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const CONFIG = read('astro.config.mjs');
const LAYOUT = read('src/layouts/PostLayout.astro');

/**
 * These assertions lock two decisions that are invisible in a diff and only
 * show up when you open a post and read it:
 *
 *  1. Measure. Without a cap the prose column inherits the full content width
 *     — 1538px, ~157 characters per line at 1854px. Past roughly 80 characters
 *     the eye stops reliably finding the next line's left edge. The cap belongs
 *     on prose only: diagrams, tables and code need the whole column.
 *
 *  2. Code-block theme. Shiki writes its colours as an inline style attribute
 *     on every <pre>, so a stylesheet override would have to fight it with
 *     !important on every rule. Changing the theme is the only clean fix, and
 *     it is one line that reaches every fenced block on the site.
 */

/** Shiki bundled themes with a light background. */
const LIGHT_THEMES = new Set([
  'github-light',
  'github-light-default',
  'light-plus',
  'min-light',
  'one-light',
  'slack-ochin',
  'solarized-light',
  'vitesse-light',
  'catppuccin-latte',
  'everforest-light',
  'gruvbox-light-medium',
  'material-theme-lighter',
  'rose-pine-dawn',
  'snazzy-light',
]);

function shikiTheme(src) {
  const m = src.match(/theme:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

/** Selectors given an explicit max-width in the layout's scoped styles. */
function cappedSelectors(src) {
  const capped = new Set();
  // e.g. `.post-art__body :global(p), .post-art__body :global(ul) { max-width: 68ch; }`
  for (const block of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/max-width\s*:\s*[\d.]+ch/.test(block[2])) continue;
    for (const sel of block[1].split(',')) {
      const g = sel.match(/:global\(([^)]+)\)/);
      if (g) capped.add(g[1].trim());
    }
  }
  return capped;
}

describe('code-block theme', () => {
  it('uses a light Shiki theme', () => {
    const theme = shikiTheme(CONFIG);
    expect(theme, 'no shikiConfig.theme found in astro.config.mjs').not.toBeNull();
    expect(LIGHT_THEMES.has(theme), `"${theme}" is not a known light theme`).toBe(true);
  });

  it('keeps a border on code blocks so they read as blocks without a dark fill', () => {
    const preRule = LAYOUT.match(/:global\(pre\)\s*\{([^}]*)\}/);
    expect(preRule, 'no :global(pre) rule in PostLayout').not.toBeNull();
    expect(preRule[1]).toMatch(/border/);
  });
});

describe('prose measure', () => {
  const capped = cappedSelectors(LAYOUT);

  it('caps paragraphs to a ch-based measure', () => {
    expect(capped.has('p'), `capped selectors: ${[...capped].join(', ') || 'none'}`).toBe(true);
  });

  it('caps lists and blockquotes to the same measure', () => {
    for (const sel of ['ul', 'ol', 'blockquote']) {
      expect(capped.has(sel), `${sel} is not capped`).toBe(true);
    }
  });

  it('caps headings so they align with the prose column', () => {
    for (const sel of ['h2', 'h3']) {
      expect(capped.has(sel), `${sel} is not capped`).toBe(true);
    }
  });

  it('lands the cap inside the readable 60-80 character band', () => {
    const widths = [...LAYOUT.matchAll(/max-width\s*:\s*([\d.]+)ch/g)].map(m => parseFloat(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const w of widths) {
      expect(w, `${w}ch is outside the 60-80 band`).toBeGreaterThanOrEqual(60);
      expect(w, `${w}ch is outside the 60-80 band`).toBeLessThanOrEqual(80);
    }
  });

  it('does NOT cap elements that need the full column', () => {
    for (const sel of ['pre', 'table', 'svg', 'img']) {
      expect(capped.has(sel), `${sel} must keep the full column width`).toBe(false);
    }
  });
});

/**
 * The comments section is the last dark slab on an otherwise light post page.
 * It has three coupled parts — the wrapper fill, the embedded widget's own
 * theme, and the heading colour — and changing only the first leaves either a
 * dark widget sitting in a light box or grey-on-white text that fails contrast.
 */
describe('comments section matches the light page', () => {
  const GISCUS = read('src/components/Giscus.astro');

  /** Relative luminance of a #rrggbb string, 0 (black) to 255 (white). */
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };

  it('gives the wrapper a light background', () => {
    const m = GISCUS.match(/\.giscus-wrap\s*\{[^}]*background:\s*(#[0-9a-f]{6})/i);
    expect(m, 'no background on .giscus-wrap').not.toBeNull();
    expect(lum(m[1]), `${m[1]} is a dark fill`).toBeGreaterThan(200);
  });

  it('loads the embedded widget in its light theme', () => {
    const m = GISCUS.match(/data-theme=["']([^"']+)["']/);
    expect(m, 'no data-theme on the giscus script').not.toBeNull();
    expect(m[1]).not.toMatch(/dark/i);
  });

  it('uses no washed-out grey that would fail contrast on white', () => {
    // #9ba3af on #ffffff is 2.6:1 — below the 4.5:1 floor for body text.
    expect(GISCUS).not.toMatch(/#9ba3af/i);
  });
});

describe('no post hardcodes a dark code block', () => {
  const dir = path.join(ROOT, 'src/content/blog');
  const posts = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  it('finds no inline dark background on a <pre>', () => {
    const offenders = posts.filter(f =>
      /<pre[^>]*background[^>]*:\s*#(?:0|1|2)[0-9a-f]{5}/i.test(fs.readFileSync(path.join(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('reads every post (guards against an empty sweep passing vacuously)', () => {
    expect(posts.length).toBeGreaterThan(40);
  });
});
