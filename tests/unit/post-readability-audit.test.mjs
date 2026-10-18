import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const LAYOUT = read('src/layouts/PostLayout.astro');
const BASE = read('src/layouts/BaseLayout.astro');
const GLOBAL_CSS = read('src/styles/global.css');
const GISCUS = read('src/components/Giscus.astro');
const NEWSLETTER = read('src/components/NewsletterCTA.astro');

/** WCAG G18 relative luminance + contrast ratio. */
function lum(hex) {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(fg, bg) {
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

/** First `color:` hex inside the rule whose selector contains `sel`. */
function ruleColor(src, sel) {
  for (const block of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (block[1].includes(sel)) {
      const m = block[2].match(/color:\s*(#[0-9a-fA-F]{6})/);
      if (m) return m[1];
    }
  }
  return null;
}

function cappedSelectors(src) {
  const capped = new Set();
  for (const block of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/max-width\s*:\s*[\d.]+ch/.test(block[2])) continue;
    for (const sel of block[1].split(',')) {
      const g = sel.match(/:global\(([^)]+)\)/);
      if (g) capped.add(g[1].trim());
    }
  }
  return capped;
}

function publishedPosts() {
  const dir = path.join(ROOT, 'src/content/blog');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => !/^---[\s\S]*?draft:\s*true/m.test(fs.readFileSync(path.join(dir, f), 'utf8').slice(0, 800)));
}

function stripFences(body) {
  return body.replace(/```[\s\S]*?```/g, '');
}

describe('prose measure (issue #15, reverses #14)', () => {
  const capped = cappedSelectors(LAYOUT);

  it('caps prose at or below 80ch', () => {
    const widths = [...LAYOUT.matchAll(/max-width\s*:\s*([\d.]+)ch/g)].map((m) => parseFloat(m[1]));
    expect(widths.length).toBeGreaterThan(0);
    for (const w of widths) expect(w, `${w}ch exceeds the 80ch readability ceiling`).toBeLessThanOrEqual(80);
  });

  it('keeps full width for pre/table/svg/img', () => {
    for (const sel of ['pre', 'table', 'svg', 'img']) {
      expect(capped.has(sel), `${sel} must keep the full column width`).toBe(false);
    }
  });
});

describe('body line-height in the Butterick band', () => {
  it('sets post body line-height between 1.5 and 1.75', () => {
    const m = LAYOUT.match(/\.post-art__body\s*\{[^}]*line-height:\s*([\d.]+)/);
    expect(m, 'no line-height on .post-art__body').not.toBeNull();
    const lh = parseFloat(m[1]);
    expect(lh).toBeGreaterThanOrEqual(1.5);
    expect(lh).toBeLessThanOrEqual(1.75);
  });

  // Second-opinion calibration (issue #17): Smashing centers ~140-150%,
  // Butterick 120-145%. 1.65 sat above every expert band, so pin 1.6.
  it('pins post body line-height at the 1.6 consensus value', () => {
    const m = LAYOUT.match(/\.post-art__body\s*\{[^}]*line-height:\s*([\d.]+)/);
    expect(m, 'no line-height on .post-art__body').not.toBeNull();
    expect(parseFloat(m[1])).toBe(1.6);
  });
});

describe('light-mode text contrast meets WCAG AA 4.5:1', () => {
  const cases = [
    ['.post-share__lbl', '#ffffff', 'share label'],
    ['.stat-card--ok .stat-card__n', '#ffffff', 'stat ok number'],
    ['.stat-card--err .stat-card__n', '#ffffff', 'stat err number'],
    ['.stat-card--warn .stat-card__n', '#ffffff', 'stat warn number'],
    ['.post-toc-inline__head', '#ffffff', 'TOC heading'],
    ['.post-tldr__meta', '#fbfaf7', 'TL;DR meta'],
    ['.post-tldr__k', '#fbfaf7', 'TL;DR key'],
  ];
  for (const [sel, bg, name] of cases) {
    it(`${name} (${sel}) reaches 4.5:1 on ${bg}`, () => {
      const fg = ruleColor(LAYOUT, sel);
      expect(fg, `no color found for ${sel}`).not.toBeNull();
      expect(ratio(fg, bg), `${fg} on ${bg} is below 4.5:1`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('single-H1 outline', () => {
  // Cheatsheet exception: its `#` lines demonstrate syntax, not structure.
  const EXCEPTIONS = new Set(['markdown-cheatsheet.md']);
  it('has no top-level "# " heading in any published post body (outside fences)', () => {
    const dir = path.join(ROOT, 'src/content/blog');
    const offenders = publishedPosts().filter((f) => {
      if (EXCEPTIONS.has(f)) return false;
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const body = stripFences(raw.replace(/^---[\s\S]*?---\s*/, ''));
      return /^# [^#]/m.test(body);
    });
    expect(offenders).toEqual([]);
  });
});

describe('images', () => {
  it('has no empty markdown alt text in published posts', () => {
    const dir = path.join(ROOT, 'src/content/blog');
    const offenders = publishedPosts().filter((f) =>
      /!\[\s*\]\([^)]*\)/.test(fs.readFileSync(path.join(dir, f), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('cover reserves layout space and prioritises LCP', () => {
    expect(LAYOUT).toMatch(/aspect-ratio|width=.+height=/);
    expect(LAYOUT).toMatch(/fetchpriority|loading=/i);
  });
});

describe('font loading', () => {
  it('preconnects and loads fonts via <link>, including JetBrains Mono', () => {
    expect(BASE).toMatch(/preconnect.*fonts\.g/);
    expect(BASE).toMatch(/fonts\.googleapis\.com\/css2/);
    expect(BASE).toMatch(/JetBrains\+Mono/);
  });

  it('does not @import Google Fonts from CSS (render-blocking chain)', () => {
    expect(GLOBAL_CSS).not.toMatch(/@import\s+url\(['"]https:\/\/fonts\.googleapis/);
  });
});

describe('reading typography', () => {
  it('defines a system-sans reading font', () => {
    expect(GLOBAL_CSS).toMatch(/--font-reading:\s*system-ui[^;]*sans-serif/);
  });

  it('post body and title read in that sans, not the Merriweather serif', () => {
    const body = LAYOUT.match(/\.post-art__body\s*\{([^}]*)\}/);
    const title = LAYOUT.match(/\.post-art__title\s*\{([^}]*)\}/);
    expect(body, 'no .post-art__body rule').not.toBeNull();
    expect(title, 'no .post-art__title rule').not.toBeNull();
    for (const [name, css] of [['body', body[1]], ['title', title[1]]]) {
      expect(css, name).not.toMatch(/Merriweather/i);
      expect(css, name).toMatch(/var\(--font-reading\)|system-ui/);
    }
    for (const h of ['h2', 'h3', 'h4']) {
      const m = LAYOUT.match(new RegExp('\\.post-art__body :global\\(' + h + '\\)\\s*\\{([^}]*)\\}'));
      expect(m, 'no ' + h + ' rule').not.toBeNull();
      expect(m[1], h).not.toMatch(/Merriweather/i);
    }
    // the reading serif is gone from the post layout entirely
    expect(LAYOUT).not.toMatch(/Merriweather/);
  });
});

describe('keyboard + share feedback', () => {
  it('defines a visible :focus-visible style', () => {
    const all = LAYOUT + GLOBAL_CSS + NEWSLETTER;
    expect(all).toMatch(/:focus-visible/);
  });

  it('newsletter input keeps a visible focus outline', () => {
    expect(NEWSLETTER).not.toMatch(/outline:\s*none/);
  });

  it('copy-link announces confirmation via a live region', () => {
    expect(LAYOUT).toMatch(/aria-live/);
  });
});

describe('TL;DR panel flow', () => {
  it('uses no negative margins on .post-tldr', () => {
    const m = LAYOUT.match(/\.post-tldr\s*\{([^}]*)\}/);
    expect(m, 'no .post-tldr rule').not.toBeNull();
    expect(m[1]).not.toMatch(/margin:\s*-/);
  });
});

describe('no skipped heading levels (outside fences)', () => {
  // markdown-cheatsheet.md demonstrates heading syntax itself.
  const EXCEPTIONS = new Set(['markdown-cheatsheet.md']);
  it('never jumps more than one level below the title H1', () => {
    const dir = path.join(ROOT, 'src/content/blog');
    const offenders = [];
    for (const f of publishedPosts()) {
      if (EXCEPTIONS.has(f)) continue;
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const body = stripFences(raw.replace(/^---[\s\S]*?---\s*/, ''));
      let prev = 1;
      for (const m of body.matchAll(/^(#{1,6})\s+\S/gm)) {
        if (m[1].length - prev > 1) {
          offenders.push(`${f}: h${prev} -> h${m[1].length}`);
          break;
        }
        prev = m[1].length;
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('fenced code blocks carry a language tag', () => {
  it('has no untagged fences in published posts', () => {
    const dir = path.join(ROOT, 'src/content/blog');
    const offenders = [];
    for (const f of publishedPosts()) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      const body = raw.replace(/^---[\s\S]*?---\s*/, '');
      let inFence = false;
      for (const line of body.split('\n')) {
        if (line.trim().startsWith('```')) {
          if (!inFence && line.trim() === '```') offenders.push(`${f}: untagged fence`);
          inFence = !inFence;
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  // ASCII box art cannot wrap (rewrapping breaks alignment), so it is
  // explicitly tagged `text` = author asserts preformatted art. Everything
  // else must fit: Google wraps code at 80ch for narrow windows and print.
  // The fence match is indent-tolerant: list-nested fences are indented,
  // and a naive match would glue separate blocks into one false offender.
  it('has no wrappable block with 6+ lines over 80 chars', () => {
    const dir = path.join(ROOT, 'src/content/blog');
    const offenders = [];
    for (const f of publishedPosts()) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of raw.matchAll(/^[ \t]*```(\w*)[^\S\n]*\n([\s\S]*?)\n[ \t]*```/gm)) {
        if (m[1] === 'text') continue;
        const over = m[2].split('\n').filter((l) => l.length > 80).length;
        if (over >= 6) offenders.push(`${f} (${m[1] || 'untagged'}): ${over} lines over 80ch`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('copy-paste commands are complete', () => {
  // A truncated digest in a `docker pull` is an `invalid reference format`
  // at paste time (verified live against the daemon). Short SHAs in prose
  // are a legitimate display convention and are not flagged — only the
  // pull-by-digest command form is asserted.
  it('has no docker pull by a truncated sha256 digest', () => {
    const dir = path.join(ROOT, 'src/content/blog');
    const offenders = [];
    for (const f of publishedPosts()) {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of raw.matchAll(/docker pull \S*@sha256:([0-9a-f]+)/g)) {
        if (m[1].length !== 64) offenders.push(`${f}: sha256:${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('guards', () => {
  it('reads enough published posts for the sweeps to be meaningful', () => {
    expect(publishedPosts().length).toBeGreaterThan(40);
  });

  it('giscus widget stays on its light theme (locked light page)', () => {
    expect(GISCUS).toMatch(/data-theme=["']light["']/);
  });
});
