#!/usr/bin/env node
/**
 * Generate src/styles/svg-palette.css — the diagram colour normaliser.
 *
 * The posts were migrated from ~/Documents/blogs, where every post styled its
 * own inline SVG in a per-page <style> block. Those blocks were stripped, but
 * the SVGs kept their per-post fill/stroke attributes, so the 203 diagrams
 * shipped 225 distinct colours — ~87 of them dark saturated fills (navy
 * #1A1A3E anchor boxes, green-900 bars, indigo-900 headers). On the post page,
 * which now renders in the Confluence preview format, those read as heavy
 * black blocks.
 *
 * This collapses every dark colour onto one pastel per semantic hue family, so
 * all 203 diagrams share a single palette and green still reads as good, red
 * as bad, amber as warn.
 *
 * Two deliberate limits:
 *
 *   - Only shapes are recoloured. CSS cannot tell a dark fill from a dark
 *     label by value, so a blanket rule pins <text>/<tspan> to the ink tone and
 *     the attribute selectors below exclude them. Diagram text therefore never
 *     becomes an unreadable pastel.
 *   - A stroke lands on the 200 tint and its fill on the 100 tint, so a
 *     stroked shape keeps its outline against the card.
 *
 * The rules use !important because 189 of the SVGs carry their colour in an
 * inline style attribute, which a normal declaration cannot beat.
 *
 * Re-run after `npm run migrate:blogs`:
 *   node scripts/generate-svg-palette.mjs
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BLOG = 'src/content/blog';
const OUT = 'src/styles/svg-palette.css';

/** Below this a fill reads as a dark block on the white card. */
const PASTEL_FLOOR = 0.55;

const SHAPE_TAGS = new Set([
  'rect', 'circle', 'path', 'polygon', 'polyline', 'line', 'ellipse', 'g', 'stop',
]);

const rgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

function lum(hex) {
  const c = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.040445 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function hueFamily(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return 'neutral';
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  if (s < 0.12) return 'neutral';
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  if (h < 15 || h >= 345) return 'red';
  if (h < 70) return 'amber';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 260) return 'blue';
  if (h < 320) return 'violet';
  return 'pink';
}

/** One pastel pair per hue family. 100 tint for fills, 200 for strokes. */
const PASTEL = {
  neutral: { fill: '#F3F4F6', stroke: '#E5E7EB' },
  red:     { fill: '#FEE2E2', stroke: '#FECACA' },
  pink:    { fill: '#FCE7F3', stroke: '#FBCFE8' },
  amber:   { fill: '#FEF3C7', stroke: '#FDE68A' },
  green:   { fill: '#DCFCE7', stroke: '#BBF7D0' },
  teal:    { fill: '#CCFBF1', stroke: '#99F6E4' },
  blue:    { fill: '#DBEAFE', stroke: '#BFDBFE' },
  violet:  { fill: '#EDE9FE', stroke: '#DDD6FE' },
};

const FAMILY_NOTE = {
  neutral: 'grey / near-black boxes and rules',
  red: 'failure, error and stop states',
  pink: 'magenta highlights',
  amber: 'warning and caution states',
  green: 'success and passing states',
  teal: 'secondary / informational states',
  blue: 'the accent family — primary flow, links, the anchor box',
  violet: 'alternating series and tertiary highlights',
};

/** Collect every { kind: fill|stroke|stop-color, colour } used on a shape. */
function collect() {
  const usages = new Map();
  for (const f of readdirSync(BLOG).filter((n) => n.endsWith('.md'))) {
    const src = readFileSync(join(BLOG, f), 'utf8');
    for (const svg of src.match(/<svg[\s\S]*?<\/svg>/g) || []) {
      const body = svg.replace(/<style[\s\S]*?<\/style>/g, '');
      for (const tag of body.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
        if (!SHAPE_TAGS.has(tag[1].toLowerCase())) continue;
        for (const a of tag[2].matchAll(/\b(fill|stroke|stop-color)\s*=\s*["'](#[0-9a-fA-F]{3,8})["']/g)) {
          usages.set(`${a[1]}:${a[2].toLowerCase()}`, true);
        }
      }
    }
  }
  return [...usages.keys()].map((k) => {
    const i = k.indexOf(':');
    return { kind: k.slice(0, i), colour: k.slice(i + 1) };
  });
}

const isWhite = (c) => c === '#ffffff' || c === '#fff';

// Group the work by family so the file reads as a palette, not a wall.
const byFamily = new Map();
let skipped = 0, normalised = 0;

for (const { kind, colour } of collect()) {
  if (isWhite(colour) || lum(colour) >= PASTEL_FLOOR) { skipped++; continue; }
  const family = hueFamily(colour);
  if (!byFamily.has(family)) byFamily.set(family, []);
  byFamily.get(family).push({ kind, colour });
  normalised++;
}

const lines = [];
lines.push('/* GENERATED by scripts/generate-svg-palette.mjs — do not edit by hand.');
lines.push('   Regenerate with: node scripts/generate-svg-palette.mjs');
lines.push('');
lines.push('   Diagram colour normaliser. See the header of that script for why this');
lines.push('   lives in CSS rather than in the migrated markdown: the content files are');
lines.push('   regenerated by `npm run migrate:blogs`, and the source HTML still carries');
lines.push('   the original per-post colours, so rewriting the markdown would not stick.');
lines.push('');
lines.push(`   ${normalised} colour/kind pairs normalised; ${skipped} already a pastel and left alone. */`);
lines.push('');
lines.push('/* Text is pinned first so it can never be dragged to a pastel by an');
lines.push('   attribute selector below. The shape rules exclude text/tspan for the same');
lines.push('   reason. Semantic label classes (.good-t, .bad-t, .head-t) re-assert their');
lines.push('   hue in diagrams.css with !important, at a higher specificity, so good/bad');
lines.push('   keep their meaning. */');
lines.push('.post-art__body svg text,');
lines.push('.post-art__body svg text * { fill: var(--d-text) !important; }');

for (const family of Object.keys(PASTEL)) {
  const entries = byFamily.get(family);
  if (!entries) continue;
  const { fill, stroke } = PASTEL[family];
  lines.push('');
  lines.push(`/* ${family} — ${FAMILY_NOTE[family]} (${entries.length} pair${entries.length === 1 ? '' : 's'}) */`);
  // One rule per kind, selector list gathered, so 225 colours stay readable.
  for (const kind of ['fill', 'stroke', 'stop-color']) {
    const cols = [...new Set(entries.filter((e) => e.kind === kind).map((e) => e.colour))].sort();
    if (!cols.length) continue;
    const target = kind === 'fill' ? fill : stroke;
    const prop = kind;
    const sel = cols.map((c) => `.post-art__body svg [${kind}="${c}"]:not(text):not(tspan)`);
    lines.push(sel.join(',\n') + ` { ${prop}: ${target} !important; }`);
  }
}

lines.push('');
lines.push('/* `currentColor` and `none` are left alone: they already inherit, and the');
lines.push('   16px inline icons in paragraphs carry no palette of their own. */');
lines.push('');

writeFileSync(OUT, lines.join('\n'));
console.log(`wrote ${OUT}: ${normalised} pairs normalised, ${skipped} left alone`);
