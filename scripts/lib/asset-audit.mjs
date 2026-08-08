/**
 * Audit every cover image, body image and inline SVG that a published post
 * ships, and report the things that are invisible in a diff.
 *
 * This exists because the failures it catches are all silent. An SVG label at
 * font-size 9 renders; it is simply too small to read. A `<text>` whose
 * baseline sits below the viewBox renders nothing at all and reports no error.
 * A 3840x2160 cover displays correctly into a 1100px slot — it just costs the
 * reader a megabyte to do it. None of these break a build, so nothing catches
 * them except a measurement.
 *
 * Image dimensions are read straight out of the JPEG/PNG/GIF/WEBP headers
 * rather than through an imaging library. `sharp` is present in node_modules
 * as a transitive dependency of Astro, but depending on it here would be a
 * phantom dependency: it is not in package.json, so nothing guarantees it
 * survives the next dependency bump.
 */
import fs from 'fs';
import path from 'path';

/** WCAG relative luminance. */
export function luminance(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two hex colours. Null if either is unparseable. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Intrinsic dimensions from the file header. Covers the four formats the site
 * actually ships; anything else returns a null size rather than guessing.
 */
export function imageSize(buf) {
  // PNG: IHDR is always the first chunk, width/height at bytes 16..24.
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { fmt: 'PNG', w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  }
  // GIF: logical screen descriptor, little-endian, straight after the header.
  if (buf.length > 10 && buf.slice(0, 3).toString('latin1') === 'GIF') {
    return { fmt: 'GIF', w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
  }
  // WEBP (VP8X only — the lossy/lossless variants need a deeper parse).
  if (buf.length > 30 && buf.slice(0, 4).toString('latin1') === 'RIFF' &&
      buf.slice(8, 12).toString('latin1') === 'WEBP' &&
      buf.slice(12, 16).toString('latin1') === 'VP8X') {
    return { fmt: 'WEBP', w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  }
  // JPEG: walk the marker chain to the first SOF segment. Markers 0xC4/0xC8/0xCC
  // are Huffman/arithmetic tables, not frame headers, so they are skipped.
  if (buf.length > 4 && buf.readUInt16BE(0) === 0xffd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { fmt: 'JPEG', h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { fmt: 'JPEG', w: null, h: null };
  }
  if (buf.slice(0, 400).toString('utf8').includes('<svg')) return { fmt: 'SVG', w: null, h: null };
  return { fmt: null, w: null, h: null };
}

/** Frontmatter + body, without pulling in a YAML parser. */
export function parsePost(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  const tagLine = m[1].match(/^tags:\s*\[(.*)\]/m);
  const tags = tagLine
    ? tagLine[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : [];
  return { fm, tags, body: m[2], raw };
}

/**
 * Thresholds. These are the ui.md rules expressed as numbers so they can be
 * asserted rather than eyeballed.
 */
export const LIMITS = {
  /** ui.md: minimum font-size for any label that carries meaning. */
  MIN_FONT: 12,
  /** WCAG AA for normal text. */
  MIN_CONTRAST: 4.5,
  /** Below this relative luminance a fill reads as a dark panel. */
  DARK_LUM: 0.18,
  /** A fill covering at least this share of the viewBox is a background. */
  PANEL_FRACTION: 0.1,
  /** ui.md: 24px padding on all four sides; 4px is the absolute floor. */
  VIEWBOX_FLOOR: 4,
  /** Cover slot renders up to 1100 CSS px. */
  COVER_MIN_WIDTH: 1200,
  COVER_MAX_KB: 400,
};

const PAGE_BG = '#FFFFFF';

/**
 * Every <rect> with a resolvable fill and box, innermost-first.
 *
 * Contrast can only be judged against what a label actually sits on. Comparing
 * every fill to the page background marks white-on-dark-chip text as failing
 * and misses grey-on-grey entirely, so the backdrop has to be resolved by
 * geometry: the smallest rect containing the label's anchor point wins, and a
 * label inside no rect falls back to the page.
 */
function backdropRects(svg) {
  const rects = [];
  for (const m of svg.matchAll(/<rect\b([^>]*)>/g)) {
    const a = m[1];
    const num = (k) => parseFloat(a.match(new RegExp(`\\b${k}="([\\d.\\-]+)"`))?.[1] ?? NaN);
    const fill = a.match(/fill="(#[0-9a-fA-F]{3,6})"/)?.[1];
    const x = num('x');
    const y = num('y');
    const w = num('width');
    const h = num('height');
    if (!fill || [x, y, w, h].some(Number.isNaN)) continue;
    rects.push({ x, y, w, h, fill, area: w * h });
  }
  return rects.sort((a, b) => a.area - b.area);
}

/** The fill a label is drawn on top of. */
function backdropFor(rects, x, y) {
  if (Number.isNaN(x) || Number.isNaN(y)) return PAGE_BG;
  const hit = rects.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  return hit ? hit.fill : PAGE_BG;
}

/** Every top-level <svg> in a body, with its measurable defects. */
export function auditSvgs(body) {
  const out = [];
  const svgs = body.match(/<svg\b[\s\S]*?<\/svg>/g) ?? [];

  svgs.forEach((s, idx) => {
    const vb = s.match(/viewBox="([\d.\-]+) ([\d.\-]+) ([\d.]+) ([\d.]+)"/);
    const vw = vb ? parseFloat(vb[3]) : null;
    const vh = vb ? parseFloat(vb[4]) : null;
    const issues = [];

    // A viewBox-less SVG cannot scale; an icon-sized one is decorative and is
    // held to a different bar than a diagram.
    const isIcon = vw !== null && vw <= 48 && vh !== null && vh <= 48;

    if (!vb) issues.push({ kind: 'no-viewbox', detail: 'no viewBox — cannot scale' });
    if (!/role="img"/.test(s)) issues.push({ kind: 'no-role', detail: 'no role="img"' });
    if (!/aria-label="[^"]{8,}"/.test(s)) issues.push({ kind: 'no-aria-label', detail: 'no aria-label' });

    // CommonMark ends a raw HTML block at the first blank line; the indented
    // remainder then renders as a code block. This broke 99 diagrams once.
    const blank = s.split('\n').findIndex((l) => l.trim() === '');
    if (blank !== -1) {
      issues.push({ kind: 'blank-line', detail: `blank line at svg line ${blank} terminates the HTML block` });
    }

    // A dark fill covering a meaningful share of the canvas is a dark panel.
    for (const m of s.matchAll(/<rect\b([^>]*)>/g)) {
      const attrs = m[1];
      const fill = attrs.match(/fill="(#[0-9a-fA-F]{3,6})"/)?.[1];
      const w = parseFloat(attrs.match(/\bwidth="([\d.]+)"/)?.[1] ?? NaN);
      const h = parseFloat(attrs.match(/\bheight="([\d.]+)"/)?.[1] ?? NaN);
      if (!fill || !vw || Number.isNaN(w) || Number.isNaN(h)) continue;
      const lum = luminance(fill);
      const frac = (w * h) / (vw * vh);
      if (lum !== null && lum < LIMITS.DARK_LUM && frac >= LIMITS.PANEL_FRACTION) {
        issues.push({ kind: 'dark-panel', detail: `${fill} covering ${Math.round(frac * 100)}% of the canvas` });
      }
    }

    const rects = backdropRects(s);

    for (const m of s.matchAll(/<text\b([^>]*)>/g)) {
      const a = m[1];
      const x = parseFloat(a.match(/\bx="([\d.\-]+)"/)?.[1] ?? NaN);
      const y = parseFloat(a.match(/\by="([\d.\-]+)"/)?.[1] ?? NaN);
      const size = parseFloat(a.match(/font-size="([\d.]+)"/)?.[1] ?? NaN);
      const fill = a.match(/fill="(#[0-9a-fA-F]{3,6})"/)?.[1];

      if (fill) {
        const bg = backdropFor(rects, x, y);
        const ratio = contrast(fill, bg);
        if (ratio !== null && ratio < LIMITS.MIN_CONTRAST) {
          issues.push({
            kind: 'low-contrast',
            detail: `${fill} on ${bg} is ${ratio.toFixed(2)}:1`,
            value: fill,
            bg,
            ratio: +ratio.toFixed(2),
          });
        }
      }

      if (!Number.isNaN(size) && size < LIMITS.MIN_FONT) {
        issues.push({ kind: 'tiny-font', detail: `font-size ${size}`, value: size });
      }

      // A baseline below the viewBox floor is not clipped — it is never painted.
      if (vh && !Number.isNaN(y) && !Number.isNaN(size) && y + size > vh - LIMITS.VIEWBOX_FLOOR) {
        issues.push({ kind: 'text-past-viewbox', detail: `baseline y=${y} in a ${vh}-high viewBox` });
      }
    }

    const diagonals = [...s.matchAll(
      /<line[^>]*x1="([\d.]+)"[^>]*y1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*y2="([\d.]+)"/g,
    )].filter((m) => m[1] !== m[3] && m[2] !== m[4]);
    if (diagonals.length) {
      issues.push({ kind: 'diagonal', detail: `${diagonals.length} diagonal connector(s)` });
    }

    out.push({
      idx,
      isIcon,
      viewBox: vw ? { w: vw, h: vh } : null,
      labels: (s.match(/<text\b/g) ?? []).length,
      issues,
    });
  });

  return out;
}

/** Resolve a public/ path and measure it. */
export function probeImage(publicDir, webPath) {
  const file = path.join(publicDir, decodeURIComponent(webPath).replace(/^\//, ''));
  if (!fs.existsSync(file)) return { path: webPath, exists: false };
  const buf = fs.readFileSync(file);
  const { fmt, w, h } = imageSize(buf);
  return {
    path: webPath,
    exists: true,
    kb: +(buf.length / 1024).toFixed(1),
    fmt,
    w,
    h,
    aspect: w && h ? +(w / h).toFixed(2) : null,
  };
}
