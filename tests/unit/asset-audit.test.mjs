import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { audit } from '../../scripts/audit-assets.mjs';
import { imageSize, contrast, luminance, auditSvgs } from '../../scripts/lib/asset-audit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOC = fs.readFileSync(path.join(ROOT, 'docs/UI_UX_AUDIT.md'), 'utf8');

/**
 * docs/UI_UX_AUDIT.md quotes ~40 measured figures. A document full of numbers
 * that nothing re-checks is worse than no document — it reads as authoritative
 * long after the site has moved on. These tests re-run the audit and compare it
 * to what the document claims, so the document fails CI rather than aging out.
 *
 * The measurement primitives are tested against hand-verifiable cases first,
 * because an audit is only as trustworthy as its instrument.
 */

/** Pull `| key | value |` rows out of the document's tables. */
function docTable(markdown) {
  const out = {};
  for (const m of markdown.matchAll(/^\|\s*([A-Za-z][\w-]*)\s*\|\s*([\d,]+)\s*\|/gm)) {
    out[m[1]] = Number(m[2].replace(/,/g, ''));
  }
  return out;
}

/** Rows of the SVG defect table: `| kind | occurrences | svgs | posts |`. */
function docDefects(markdown) {
  const out = {};
  for (const m of markdown.matchAll(/^\|\s*([a-z-]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm)) {
    out[m[1]] = { occurrences: +m[2], svgs: +m[3], posts: +m[4] };
  }
  return out;
}

describe('imageSize reads real headers', () => {
  it('reads PNG dimensions from IHDR', () => {
    const png = fs.readFileSync(path.join(ROOT, 'public/assets/images/kubernetes/kubernetes_logo.png'));
    expect(imageSize(png)).toMatchObject({ fmt: 'PNG', w: 1200, h: 1165 });
  });

  it('reads JPEG dimensions by walking to the SOF marker', () => {
    const jpg = fs.readFileSync(path.join(ROOT, 'public/assets/images/cover1.jpg'));
    expect(imageSize(jpg)).toMatchObject({ fmt: 'JPEG', w: 1600, h: 1067 });
  });

  it('returns a null format rather than guessing on unknown bytes', () => {
    expect(imageSize(Buffer.from('not an image at all'))).toMatchObject({ fmt: null });
  });
});

describe('contrast maths matches published WCAG values', () => {
  it('puts black on white at 21:1', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('scores identical colours at 1:1', () => {
    expect(contrast('#4B5563', '#4B5563')).toBeCloseTo(1, 5);
  });

  it('agrees with the figures quoted in S3', () => {
    expect(contrast('#9CA3AF', '#FFFFFF')).toBeCloseTo(2.54, 2);
    expect(contrast('#16A34A', '#FFFFFF')).toBeCloseTo(3.30, 2);
    expect(contrast('#D97706', '#FFFFFF')).toBeCloseTo(3.19, 2);
    expect(contrast('#4B5563', '#111827')).toBeCloseTo(2.35, 2);
  });

  it('confirms the ui.md floor colour passes on white and #9CA3AF does not', () => {
    expect(contrast('#4B5563', '#FFFFFF')).toBeGreaterThan(4.5);
    expect(contrast('#9CA3AF', '#FFFFFF')).toBeLessThan(4.5);
  });

  it('rejects unparseable input instead of returning a plausible number', () => {
    expect(contrast('currentColor', '#FFFFFF')).toBeNull();
    expect(luminance('#GGG')).toBeNull();
  });
});

describe('auditSvgs detects each defect it claims to', () => {
  const wrap = (inner, vb = '0 0 100 100') =>
    `<svg viewBox="${vb}" role="img" aria-label="a description long enough">${inner}</svg>`;

  it('flags a label below the 12px floor', () => {
    const [svg] = auditSvgs(wrap('<text x="10" y="10" font-size="9">Hi</text>'));
    expect(svg.issues.map((i) => i.kind)).toContain('tiny-font');
  });

  it('does not flag a label at exactly 12px', () => {
    const [svg] = auditSvgs(wrap('<text x="10" y="10" font-size="12">Hi</text>'));
    expect(svg.issues.map((i) => i.kind)).not.toContain('tiny-font');
  });

  it('scores contrast against the enclosing rect, not the page', () => {
    // White on a dark chip is correct and must not be reported.
    const ok = auditSvgs(wrap(
      '<rect x="0" y="0" width="50" height="50" fill="#111827"/>' +
      '<text x="10" y="10" font-size="14" fill="#FFFFFF">Hi</text>',
    ))[0];
    expect(ok.issues.map((i) => i.kind)).not.toContain('low-contrast');

    // Grey on that same chip is not.
    const bad = auditSvgs(wrap(
      '<rect x="0" y="0" width="50" height="50" fill="#111827"/>' +
      '<text x="10" y="10" font-size="14" fill="#4B5563">Hi</text>',
    ))[0];
    expect(bad.issues.map((i) => i.kind)).toContain('low-contrast');
  });

  it('flags a dark fill covering a tenth of the canvas or more', () => {
    const [svg] = auditSvgs(wrap('<rect x="0" y="0" width="100" height="30" fill="#1a1a3e"/>'));
    expect(svg.issues.map((i) => i.kind)).toContain('dark-panel');
  });

  it('ignores a dark fill too small to read as a panel', () => {
    const [svg] = auditSvgs(wrap('<rect x="0" y="0" width="5" height="5" fill="#1a1a3e"/>'));
    expect(svg.issues.map((i) => i.kind)).not.toContain('dark-panel');
  });

  it('flags a baseline painted past the viewBox floor', () => {
    const [svg] = auditSvgs(wrap('<text x="10" y="98" font-size="14">Gone</text>'));
    expect(svg.issues.map((i) => i.kind)).toContain('text-past-viewbox');
  });

  it('flags a diagonal connector but not a straight one', () => {
    const diag = auditSvgs(wrap('<line x1="0" y1="0" x2="50" y2="50"/>'))[0];
    expect(diag.issues.map((i) => i.kind)).toContain('diagonal');
    const straight = auditSvgs(wrap('<line x1="0" y1="0" x2="50" y2="0"/>'))[0];
    expect(straight.issues.map((i) => i.kind)).not.toContain('diagonal');
  });

  it('flags a blank line, which terminates the markdown HTML block', () => {
    const [svg] = auditSvgs(`<svg viewBox="0 0 10 10">\n\n<rect/>\n</svg>`);
    expect(svg.issues.map((i) => i.kind)).toContain('blank-line');
  });

  it('treats a 24x24 viewBox as a decorative icon', () => {
    const [svg] = auditSvgs('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>');
    expect(svg.isIcon).toBe(true);
  });
});

describe('docs/UI_UX_AUDIT.md matches the current site', () => {
  const report = audit();
  const claimed = docTable(DOC);
  const claimedDefects = docDefects(DOC);

  it('quotes every headline total', () => {
    for (const key of Object.keys(report.totals)) {
      expect(claimed, `docs/UI_UX_AUDIT.md never states "${key}"`).toHaveProperty(key);
    }
  });

  it.each(Object.entries(audit().totals))('states %s correctly', (key, value) => {
    expect(claimed[key]).toBe(value);
  });

  it.each(Object.keys(audit().issueCounts))('states the %s defect counts correctly', (kind) => {
    const row = claimedDefects[kind];
    expect(row, `no table row for ${kind}`).toBeTruthy();
    expect(row.occurrences).toBe(report.issueCounts[kind]);
    expect(row.svgs).toBe(report.svgsByIssue[kind]);
    expect(row.posts).toBe(new Set(report.issues.filter((i) => i.kind === kind).map((i) => i.slug)).size);
  });

  it('names every affected post somewhere in the document', () => {
    // Asserted as a list of misses rather than `toContain` on the document, so
    // a failure prints the slugs instead of the whole 400-line file.
    const unnamed = [];
    for (const [kind, slugs] of Object.entries(report.postsByIssue)) {
      for (const slug of slugs) if (!DOC.includes(slug)) unnamed.push(`${kind}: ${slug}`);
    }
    expect(unnamed).toEqual([]);
  });

  it('records the two regressions that must never come back', () => {
    // Both were real incidents: blank lines broke 99 diagrams during the
    // original migration, and a viewBox-less SVG filled the whole column.
    expect(report.issueCounts['blank-line']).toBe(0);
    expect(report.issueCounts['no-viewbox']).toBe(0);
  });

  it('reports no missing image anywhere', () => {
    expect(report.totals.missingCovers).toBe(0);
    expect(report.totals.missingBodyImages).toBe(0);
  });
});
