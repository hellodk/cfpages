#!/usr/bin/env node
/**
 * Generate a diagram-style SVG cover for every post that would otherwise fall
 * back to the shared assets/images/cover1.jpg.
 *
 * These are the "no photograph available" covers. They follow the house style
 * already used by public/assets/images/covers/*.svg — a 3:2 viewBox, a light
 * vertical gradient, a few decorative discs, a ground ellipse and one centred
 * subject — but each one gets a distinct subject and palette so no two posts
 * share a cover.
 *
 * No <text> anywhere. Lettering is the single most reliable tell of a
 * generated image, and the site supplies its own titles, so a cover never
 * needs to carry words.
 *
 *   node scripts/generate-cover-svgs.mjs
 *
 * The output files are committed. This script is provenance: re-run it when a
 * subject changes and commit the regenerated .svg alongside.
 */
import fs from 'fs';
import path from 'path';

const OUT = path.join(import.meta.dirname, '../public/assets/images/covers');

/** Light background pair + a small fixed accent role per palette. */
const P = {
  sky:    { bg: ['#EFF6FF', '#D8E5FD'], d1: '#BFDBFE', d2: '#C7D2FE', g: '#C9D6F2', a: '#4F46E5', b: '#6366F1', l: '#A5B4FC', e: '#10B981', w: '#FFFFFF', dk: '#3730A3' },
  indigo: { bg: ['#EEF2FF', '#DDE4FB'], d1: '#C7D2FE', d2: '#A5B4FC', g: '#C9D2F2', a: '#4338CA', b: '#4F46E5', l: '#818CF8', e: '#10B981', w: '#FFFFFF', dk: '#312E81' },
  violet: { bg: ['#FAF5FF', '#EFE3FC'], d1: '#E9D5FF', d2: '#D8B4FE', g: '#D9CCEF', a: '#7C3AED', b: '#8B5CF6', l: '#C4B5FD', e: '#10B981', w: '#FFFFFF', dk: '#5B21B6' },
  mint:   { bg: ['#ECFDF5', '#D3EDE2'], d1: '#A7F3D0', d2: '#6EE7B7', g: '#C4D8CE', a: '#0D9488', b: '#14B8A6', l: '#5EEAD4', e: '#F59E0B', w: '#FFFFFF', dk: '#115E59' },
  teal:   { bg: ['#F0FDFA', '#D6F0EC'], d1: '#99F6E4', d2: '#5EEAD4', g: '#C6DCD8', a: '#0F766E', b: '#14B8A6', l: '#99F6E4', e: '#F59E0B', w: '#FFFFFF', dk: '#134E4A' },
  cyan:   { bg: ['#ECFEFF', '#D5F2F6'], d1: '#A5F3FC', d2: '#67E8F9', g: '#C3DCE0', a: '#0E7490', b: '#0891B2', l: '#67E8F9', e: '#F59E0B', w: '#FFFFFF', dk: '#155E75' },
  lime:   { bg: ['#F7FEE7', '#E6F5C9'], d1: '#D9F99D', d2: '#BEF264', g: '#D6DCB8', a: '#4D7C0F', b: '#65A30D', l: '#BEF264', e: '#4F46E5', w: '#FFFFFF', dk: '#3F6212' },
  amber:  { bg: ['#FFFBEB', '#FCEFC7'], d1: '#FDE68A', d2: '#FCD34D', g: '#E7D6AE', a: '#B45309', b: '#D97706', l: '#FCD34D', e: '#0D9488', w: '#FFFFFF', dk: '#92400E' },
  orange: { bg: ['#FFF7ED', '#FCEBD6'], d1: '#FED7AA', d2: '#FDBA74', g: '#E7D3B8', a: '#C2410C', b: '#EA580C', l: '#FDBA74', e: '#0D9488', w: '#FFFFFF', dk: '#9A3412' },
  rose:   { bg: ['#FFF1F2', '#FDE0E4'], d1: '#FECDD3', d2: '#FDA4AF', g: '#EBC9CE', a: '#BE123C', b: '#E11D48', l: '#FDA4AF', e: '#0D9488', w: '#FFFFFF', dk: '#9F1239' },
  slate:  { bg: ['#F8FAFC', '#E7EDF6'], d1: '#E2E8F0', d2: '#CBD5E1', g: '#D7DEEB', a: '#334155', b: '#475569', l: '#94A3B8', e: '#10B981', w: '#FFFFFF', dk: '#1E293B' },
};

const R = (x, y, w, h, rx, f, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${extra}/>`;
const C = (cx, cy, r, f, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"${extra}/>`;
const E = (cx, cy, rx, ry, f, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${extra}/>`;
const L = (x1, y1, x2, y2, s, w, extra = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}"${extra} stroke-linecap="round"/>`;
const PA = (d, f, extra = '') => `<path d="${d}" fill="${f}"${extra}/>`;
const PL = (pts, f, extra = '') => `<polygon points="${pts}" fill="${f}"${extra}/>`;
const PO = (pts, s, w, extra = '') => `<polyline points="${pts}" fill="none" stroke="${s}" stroke-width="${w}"${extra} stroke-linecap="round" stroke-linejoin="round"/>`;

/* ---- reusable subjects ------------------------------------------------- */

/** A rack of counted units. `led` overrides per-slot indicator colours. */
const rack = (x, y, w, h, units, led = null) => {
  let s = R(x, y, w, h, 24, '#E8EDF5', ' stroke="#94A3B8" stroke-width="6"') + R(x, y, w, 54, 24, '#CBD5E1');
  const slot = (h - 90) / units;
  for (let i = 0; i < units; i++) {
    const uy = y + 70 + i * slot;
    s += R(x + 22, uy, w - 44, slot - 16, 12, '#F8FAFC', ' stroke="#B6C2D6" stroke-width="4"');
    s += C(x + 46, uy + (slot - 16) / 2, 11, led?.[i] ?? (i % 3 === 2 ? '#F59E0B' : '#10B981'));
    s += R(x + 70, uy + (slot - 16) / 2 - 9, w - 120, 18, 9, '#D7DEEB');
  }
  return s;
};

/** A dashboard panel with a configurable inner trace. */
const panel = (x, y, w, h, fill, stroke) => R(x, y, w, h, 16, fill, ` stroke="${stroke}" stroke-width="4"`);

/** A Mac mini. */
const mini = (x, y, top, body) =>
  R(x, y, 210, 130, 22, body, ` stroke="${top}" stroke-width="6"`) + C(x + 44, y + 65, 15, top) + R(x + 150, y + 55, 34, 12, 6, top);

/** Cog with radial teeth and an optional hub hole. */
const gear = (cx, cy, r, color, teeth = 8, hub = null) => {
  let s = '';
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const x = (cx + Math.cos(a) * r).toFixed(1);
    const y = (cy + Math.sin(a) * r).toFixed(1);
    s += `<rect x="${(x - r * 0.13).toFixed(1)}" y="${(y - r * 0.13).toFixed(1)}" width="${(r * 0.26).toFixed(1)}" height="${(r * 0.26).toFixed(1)}" rx="${(r * 0.06).toFixed(1)}" fill="${color}" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${x} ${y})"/>`;
  }
  s += C(cx, cy, r, color);
  if (hub) s += C(cx, cy, r * 0.42, hub);
  return s;
};

const magnifier = (cx, cy, r, color) =>
  C(cx, cy, r, '#FFFFFF', ` stroke="${color}" stroke-width="16"`) + L(cx + r * 0.7, cy + r * 0.7, cx + r * 1.9, cy + r * 1.9, color, 22);

const shield = (cx, cy, color, stroke, mark = '#FFFFFF') =>
  PA(`M${cx} ${cy - 92} L${cx + 92} ${cy - 56} V${cy + 22} C${cx + 92} ${cy + 78} ${cx + 48} ${cy + 114} ${cx} ${cy + 130} C${cx - 48} ${cy + 114} ${cx - 92} ${cy + 78} ${cx - 92} ${cy + 22} V${cy - 56} Z`, color, ` stroke="${stroke}" stroke-width="8"`) +
  PO(`${cx - 40},${cy + 18} ${cx - 8},${cy + 50} ${cx + 46},${cy - 16}`, mark, 20);

const key = (cx, cy, color) =>
  C(cx, cy, 44, 'none', ` stroke="${color}" stroke-width="20"`) + R(cx + 40, cy - 11, 130, 22, 11, color) + R(cx + 150, cy, 20, 34, 8, color) + R(cx + 118, cy, 20, 26, 8, color);

const lock = (cx, cy, color) =>
  PA(`M${cx - 34} ${cy - 12} v-24 a34 34 0 0 1 68 0 v24`, 'none', ` stroke="${color}" stroke-width="16"`) +
  R(cx - 48, cy - 12, 96, 84, 14, color) + C(cx, cy + 30, 12, '#FFFFFF');

const clock = (cx, cy, r, color, angle = Math.PI * 0.25) => {
  const hx = (cx + Math.sin(angle) * r * 0.55).toFixed(1);
  const hy = (cy - Math.cos(angle) * r * 0.55).toFixed(1);
  return (
    C(cx, cy, r, '#FFFFFF', ` stroke="${color}" stroke-width="12"`) +
    C(cx, cy, 9, color) +
    L(cx, cy, hx, hy, color, 12) +
    L(cx, cy, cx + r * 0.66, cy, color, 12)
  );
};

const globe = (cx, cy, r, color, land) =>
  C(cx, cy, r, color) +
  E(cx, cy, r * 0.45, r, 'none', ' stroke="#FFFFFF" stroke-width="6" opacity="0.7"') +
  L(cx - r, cy, cx + r, cy, '#FFFFFF', 6, ' opacity="0.7"') +
  PA(`M${cx - 22} ${cy - 34} q44 -18 64 12 q-32 22 -64 10 z`, land, ' opacity="0.85"');

const browser = (x, y, w, h, color) =>
  R(x, y, w, h, 16, '#FFFFFF', ` stroke="${color}" stroke-width="6"`) +
  R(x, y, w, 44, 16, color) +
  C(x + 28, y + 22, 8, '#FFFFFF') + C(x + 56, y + 22, 8, '#FFFFFF') + C(x + 84, y + 22, 8, '#FFFFFF');

const term = (x, y, w, h, color) => {
  let s = R(x, y, w, h, 18, '#F8FAFC', ` stroke="${color}" stroke-width="6"`) + R(x, y, w, 44, 18, color);
  s += C(x + 30, y + 22, 8, '#FFFFFF') + C(x + 58, y + 22, 8, '#FFFFFF') + C(x + 86, y + 22, 8, '#FFFFFF');
  for (let i = 0; i < 3; i++) s += R(x + 30, y + 70 + i * 36, w - 60 - (i % 2) * 70, 14, 7, '#CBD5E1');
  return s;
};

const phone = (x, y, color) =>
  R(x, y, 190, 330, 26, color) + R(x + 14, y + 44, 162, 226, 10, '#FFFFFF') + C(x + 95, y + 296, 13, '#FFFFFF');

const doc = (x, y, w, h, color) => {
  let s = R(x, y, w, h, 14, '#FFFFFF', ` stroke="${color}" stroke-width="6"`);
  s += PL(`${x + w - 70},${y} ${x + w},${y + 70} ${x + w - 70},${y + 70}`, color, ' opacity="0.25"');
  for (let i = 0; i < 4; i++) s += R(x + 34, y + 130 + i * 46, w - 68 - (i % 2) * 80, 16, 8, color, ' opacity="0.35"');
  return s;
};

const coin = (cx, cy, r, color) =>
  C(cx, cy, r, color) + C(cx, cy, r * 0.6, 'none', ' stroke="#FFFFFF" stroke-width="6" opacity="0.8"') + C(cx, cy, r * 0.22, '#FFFFFF');

const plug = (cx, cy, color, rot = 0) =>
  `<g transform="rotate(${rot} ${cx} ${cy})">` +
  R(cx - 26, cy - 40, 52, 78, 14, color) + R(cx - 16, cy - 58, 10, 22, 5, color) + R(cx + 6, cy - 58, 10, 22, 5, color) +
  R(cx - 7, cy + 38, 14, 44, 7, '#94A3B8') + `</g>`;

/** A commit/branch tree. */
const branchTree = (x, y, color, accent) => {
  let s = L(x, y, x, y + 420, color, 14);
  s += C(x, y, 26, accent) + C(x, y + 210, 26, color) + C(x, y + 420, 26, accent);
  s += PA(`M${x} ${y + 210} C${x + 140} ${y + 210} ${x + 140} ${y + 90} ${x + 280} ${y + 90}`, 'none', ` stroke="${color}" stroke-width="14"`);
  s += C(x + 280, y + 90, 26, accent);
  s += PA(`M${x} ${y + 320} C${x + 140} ${y + 320} ${x + 140} ${y + 420} ${x + 280} ${y + 420}`, 'none', ` stroke="${color}" stroke-width="14"`);
  s += C(x + 280, y + 420, 26, accent);
  return s;
};

/* ---- the 53 subjects --------------------------------------------------- */

const COVERS = [
  // --- observability & dashboards
  { slug: 'alerting', label: 'A stack of alert cards beside a ringing bell', p: 'rose', body: (p) =>
    PA(`M${628} 470 Q${628} 300 ${734} 280 Q${840} 300 ${840} 470 Z`, p.a) +
    R(600, 464, 268, 26, 13, p.a) + C(734, 522, 22, p.a) +
    R(940, 470, 300, 66, 14, p.l) + R(940, 556, 300, 66, 14, p.b) + R(940, 642, 300, 66, 14, p.l) +
    C(980, 503, 12, '#FFFFFF') + C(980, 589, 12, '#FFFFFF') + C(980, 675, 12, '#FFFFFF') },

  { slug: 'observability-audit', label: 'A magnifier over a gauge on a clipboard', p: 'slate', body: (p) =>
    R(520, 280, 460, 560, 22, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    R(690, 250, 120, 60, 20, '#CBD5E1') +
    C(660, 500, 96, 'none', ' stroke="#CBD5E1" stroke-width="22"') +
    L(660, 500, 660 + 60, 500 - 46, p.a, 14) + C(660, 500, 12, p.a) +
    R(560, 700, 380, 20, 10, '#E2E8F0') + R(560, 746, 260, 20, 10, '#E2E8F0') +
    magnifier(1010, 620, 120, p.dk) },

  { slug: 'observability-dashboard-reference', label: 'A grid of dashboard panels with one line chart', p: 'indigo', body: (p) =>
    R(380, 250, 840, 560, 22, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    panel(420, 292, 350, 220, '#EEF2FF', p.l) + panel(800, 292, 380, 220, '#E0E7FF', p.l) +
    panel(420, 540, 240, 230, '#E0E7FF', p.l) + panel(690, 540, 240, 230, '#EEF2FF', p.l) + panel(960, 540, 220, 230, '#E0E7FF', p.l) +
    PO('450,470 520,410 590,440 660,350 730,380', p.a, 10) +
    PO('830,470 900,360 970,420 1040,300 1150,340', p.b, 10) +
    R(450, 700, 60, 50, 8, p.b) + R(530, 680, 60, 70, 8, p.a) + R(610, 660, 60, 90, 8, p.b) },

  { slug: 'observability-telemetry-and-testing', label: 'Telemetry signals converging into one node map', p: 'cyan', body: (p) =>
    C(800, 560, 92, p.w, ` stroke="${p.a}" stroke-width="12"`) + C(800, 560, 30, p.a) +
    C(420, 320, 30, p.b) + C(320, 620, 26, p.e) + C(430, 840, 30, p.b) +
    C(1180, 320, 30, p.b) + C(1280, 620, 26, p.e) + C(1170, 840, 30, p.b) +
    L(450, 330, 740, 520, p.l, 10) + L(346, 620, 708, 560, p.l, 10) + L(455, 830, 730, 600, p.l, 10) +
    L(1150, 330, 860, 520, p.l, 10) + L(1254, 620, 892, 560, p.l, 10) + L(1145, 830, 870, 600, p.l, 10) +
    PO('360,540 560,540 620,470 700,610 780,540 980,540 1040,540 1240,540', p.a, 8) },

  { slug: 'fault-error-restart-analysis', label: 'A circular restart arrow around a cracked gear', p: 'orange', body: (p) =>
    gear(800, 560, 150, p.b, 10, p.w) +
    PL('760,470 840,540 775,545 850,660 790,575 855,570', p.w, ' opacity="0.9"') +
    PA(`M800 ${360} a200 200 0 1 1 -190 150`, 'none', ` stroke="${p.a}" stroke-width="18"`) +
    PL('790,330 850,368 786,392', p.a) },

  { slug: 'recommendations-decision', label: 'A decision tree branching to a checked option', p: 'sky', body: (p) =>
    R(700, 250, 200, 120, 18, p.b) + C(800, 310, 26, '#FFFFFF') +
    PA('M800 370 C800 460 560 470 560 560', 'none', ` stroke="${p.l}" stroke-width="12"`) +
    PA('M800 370 C800 460 1040 470 1040 560', 'none', ` stroke="${p.l}" stroke-width="12"`) +
    R(460, 560, 200, 120, 18, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    R(940, 560, 200, 120, 18, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    C(560, 620, 30, p.e) + PO('546,620 558,632 580,606', '#FFFFFF', 8) +
    C(1040, 620, 30, p.l) },

  { slug: 'hardware-telemetry', label: 'A GPU chip beside a temperature gauge', p: 'amber', body: (p) =>
    R(470, 360, 440, 440, 26, p.a) + R(520, 410, 340, 340, 16, p.l) +
    R(560, 450, 260, 260, 12, p.a) +
    PO('300,700 300,760 240,760', p.b, 10) +
    C(980, 640, 110, '#FFFFFF', ` stroke="${p.dk}" stroke-width="14"`) +
    PA(`M980 640 L980 566 A74 74 0 0 1 ${(980 + 74 * Math.sin(0.9)).toFixed(1)} ${(640 - 74 * Math.cos(0.9)).toFixed(1)}`, 'none', ` stroke="${p.b}" stroke-width="16"`) +
    C(980, 640, 14, p.dk) },

  { slug: 'agentic-forensics', label: 'A rack with a failing node under a magnifier', p: 'slate', body: (p) =>
    rack(520, 280, 300, 540, 4, ['#10B981', '#10B981', '#EF4444', '#10B981']) +
    magnifier(1010, 600, 130, p.dk) + C(1010, 600, 96, '#FFFFFF', ' opacity="0.01"') +
    C(1010, 600, 60, 'none', ' stroke="#EF4444" stroke-width="14"') },

  { slug: 'hydra-vs-mlx-oc', label: 'A multi-headed pump beside a single clockwork monitor', p: 'teal', body: (p) =>
    R(330, 560, 300, 180, 20, p.b) + R(330, 560, 300, 44, 20, p.a) +
    PA('M430 560 V430' + ' M530 560 V400' + ' M630 560 V440', 'none', ` stroke="${p.a}" stroke-width="24"`) +
    C(430, 420, 30, p.e) + C(530, 390, 30, p.e) + C(630, 430, 30, p.e) +
    C(1120, 620, 130, '#FFFFFF', ` stroke="${p.a}" stroke-width="14"`) +
    L(1120, 620, 1120, 520, p.a, 14) + L(1120, 620, 1190, 650, p.a, 14) + C(1120, 620, 14, p.a) +
    C(1120, 360, 26, p.b) + C(1120, 360, 60, 'none', ` stroke="${p.b}" stroke-width="8" opacity="0.5"`) },

  { slug: 'model-serving-resilience', label: 'A server rack with a steady heartbeat trace', p: 'rose', body: (p) =>
    rack(360, 300, 300, 520, 4) +
    R(720, 330, 520, 460, 22, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    PO('760,600 850,600 900,480 960,720 1020,560 1090,600 1210,600', p.a, 12) +
    C(1210, 600, 20, p.e) },

  { slug: 'opik-dashboards', label: 'Custom dashboard panels with a bar chart', p: 'cyan', body: (p) =>
    R(360, 250, 880, 560, 22, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    panel(400, 292, 400, 240, '#ECFEFF', p.b) + panel(820, 292, 380, 240, '#CFFAFE', p.b) +
    panel(400, 556, 800, 214, '#F0FDFF', p.b) +
    R(460, 640, 70, 100, 8, p.b) + R(560, 600, 70, 140, 8, p.a) + R(660, 660, 70, 80, 8, p.b) +
    R(760, 580, 70, 160, 8, p.a) + R(860, 630, 70, 110, 8, p.b) + R(960, 610, 70, 130, 8, p.a) +
    PO('440,470 520,400 600,440 680,360 760,410', p.a, 10) },

  { slug: 'opik-log-streaming', label: 'Log lines streaming through a funnel into a barrel', p: 'slate', body: (p) =>
    R(420, 300, 300, 24, 12, p.l) + R(450, 356, 240, 24, 12, p.b) + R(480, 412, 180, 24, 12, p.l) + R(510, 468, 120, 24, 12, p.b) +
    PA('M620 520 L1000 560 L1000 720 L620 760 Z', p.b) +
    R(1040, 540, 280, 300, 22, p.a) + R(1040, 540, 280, 40, 22, p.dk) +
    L(1100, 640, 1280, 640, p.l, 12) + L(1100, 700, 1240, 700, p.l, 12) + L(1100, 760, 1300, 760, p.l, 12) },

  { slug: 'two-mac-minis-mlx-debugging', label: 'Two small computers sharing a crowded socket', p: 'rose', body: (p) =>
    mini(300, 480, p.a, p.l) + mini(620, 480, p.a, p.l) +
    R(980, 560, 220, 200, 22, '#FFFFFF', ` stroke="${p.dk}" stroke-width="10"`) +
    C(1030, 620, 22, p.dk) + C(1150, 620, 22, p.dk) +
    plug(1080, 470, p.a, 0) + plug(1120, 470, p.e, -18) +
    L(510, 610, 1010, 640, p.l, 10) + L(830, 610, 1060, 650, p.l, 10) +
    PL('1130,420 1170,470 1090,470', '#EF4444') },

  // --- agentic / retrieval / LLM
  { slug: 'agentic-edge-cases', label: 'A flow chart where one branch dead-ends', p: 'amber', body: (p) =>
    R(300, 300, 240, 140, 18, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    R(680, 300, 240, 140, 18, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    R(1060, 300, 240, 140, 18, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    L(540, 370, 680, 370, p.l, 10) + L(920, 370, 1060, 370, p.l, 10) +
    L(800, 440, 800, 560, p.a, 8) +
    R(680, 560, 240, 140, 18, 'none', ` stroke="${p.a}" stroke-width="6" stroke-dasharray="18 14"`) +
    PO('340,820 540,820 600,760 700,880 790,820 900,820 980,820 1260,820', p.a, 10) },

  { slug: 'agentic-mcp-gateways', label: 'Nodes passing through an arched gateway', p: 'indigo', body: (p) =>
    PA('M520 780 V500 Q800 300 1080 500 V780 Z', p.l, ' opacity="0.55"') +
    PA('M600 780 V520 Q800 370 1000 520 V780 Z', p.b) +
    C(800, 620, 76, p.w, ` stroke="${p.a}" stroke-width="10"`) + C(800, 620, 28, p.a) +
    C(800, 400, 28, p.e) + L(800, 428, 800, 546, p.w, 10) +
    C(500, 640, 24, p.a) + C(1100, 640, 24, p.a) },

  { slug: 'kri-agentic-fleet-assistant', label: 'A grid of fleet nodes joined to a central orb', p: 'indigo', body: (p) =>
    C(800, 560, 96, p.w, ` stroke="${p.a}" stroke-width="12"`) + C(800, 560, 34, p.a) +
    C(420, 360, 30, p.b) + C(1180, 360, 30, p.b) + C(420, 760, 30, p.b) + C(1180, 760, 30, p.b) +
    C(560, 560, 24, p.e) + C(1040, 560, 24, p.e) +
    L(450, 375, 720, 520, p.l, 10) + L(1150, 375, 880, 520, p.l, 10) +
    L(450, 745, 720, 600, p.l, 10) + L(1150, 745, 880, 600, p.l, 10) +
    L(584, 560, 704, 560, p.l, 10) + L(896, 560, 1016, 560, p.l, 10) },

  { slug: 'rag-embeddings-vector-db', label: 'A card catalogue with vector arrows between drawers', p: 'violet', body: (p) =>
    R(380, 260, 840, 560, 20, p.b) +
    [0, 1, 2].map((i) => [0, 1, 2, 3, 4].map((j) =>
      R(420 + j * 158, 300 + i * 172, 138, 140, 10, p.l, ` stroke="${p.dk}" stroke-width="4"`)).join('')).join('') +
    PL('760,900 900,830 900,970', p.a) + C(900, 900, 22, p.a) +
    L(700, 900, 880, 900, 'none', 0) + PA('M640 900 H860', 'none', ` stroke="${p.a}" stroke-width="12"`) },

  { slug: 'rag-for-kri-fleet-assistant', label: 'Documents chunking into a retrieval pipeline', p: 'mint', body: (p) =>
    doc(360, 300, 260, 340, p.a) +
    PA('M660 470 H760', 'none', ` stroke="${p.b}" stroke-width="12"`) +
    PL('750,440 790,470 750,500', p.b) +
    R(830, 360, 240, 220, 16, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    R(860, 400, 180, 16, 8, p.l) + R(860, 440, 140, 16, 8, p.l) + R(860, 480, 180, 16, 8, p.l) + R(860, 520, 120, 16, 8, p.l) +
    PL('1090,470 1130,470 1110,510', p.b) + C(1190, 470, 70, p.b) + C(1190, 470, 26, '#FFFFFF') },

  { slug: 'local-llm-inference-architecture', label: 'A processor chip stacked beneath software layers', p: 'violet', body: (p) =>
    R(470, 620, 660, 120, 16, p.a) + R(470, 480, 660, 120, 16, p.b) + R(470, 340, 660, 120, 16, p.l) +
    R(600, 660, 400, 160, 20, p.dk) + R(650, 700, 300, 80, 12, p.b) +
    L(800, 620, 800, 660, '#94A3B8', 10) +
    C(560, 400, 20, '#FFFFFF') + C(660, 400, 20, '#FFFFFF') + C(760, 400, 20, '#FFFFFF') },

  { slug: 'save-tokens-and-better-prompts', label: 'A stack of tokens beside a prompt card', p: 'lime', body: (p) =>
    R(400, 320, 420, 480, 20, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    R(440, 370, 340, 240, 12, '#F7FEE7', ` stroke="${p.l}" stroke-width="4"`) +
    R(470, 410, 220, 16, 8, p.l) + R(470, 450, 280, 16, 8, p.l) + R(470, 490, 180, 16, 8, p.l) +
    [0, 1, 2, 3].map((i) => E(1000, 660 - i * 44, 130, 40, i % 2 ? p.b : p.a)).join('') +
    coin(1000, 300, 70, p.e) },

  { slug: 'sre-llm-fleet-decision', label: 'A fleet of small boxes joining one router', p: 'indigo', body: (p) =>
    [0, 1, 2, 3].map((i) => mini(260 + i * 340, 640, p.a, p.l)).join('') +
    PA('M430 640 V520 H1170 V640', 'none', ` stroke="${p.b}" stroke-width="12"`) +
    PA('M600 640 V520 M770 640 V520 M940 640 V520 M1100 640 V520', 'none', ` stroke="${p.b}" stroke-width="12"`) +
    R(640, 380, 320, 120, 20, p.b) + C(700, 440, 16, p.e) + C(760, 440, 16, p.e) + C(820, 440, 16, p.e) + C(880, 440, 16, p.e) +
    L(800, 380, 800, 320, p.b, 12) + C(800, 300, 26, p.a) },

  { slug: 'sglang-on-two-mac-minis', label: 'Two small computers linked across a measured scaffold', p: 'sky', body: (p) =>
    mini(300, 560, p.a, p.l) + mini(1090, 560, p.a, p.l) +
    L(510, 625, 700, 625, p.b, 12) + L(900, 625, 1090, 625, p.b, 12) +
    R(700, 380, 200, 320, 16, 'none', ` stroke="${p.a}" stroke-width="8" stroke-dasharray="18 12"`) +
    R(700, 620, 200, 80, 12, p.b) +
    C(760, 300, 24, p.e) + C(840, 300, 24, p.e) },

  { slug: 'mlx-distributed-options-tuning', label: 'A row of tuning sliders above a node grid', p: 'violet', body: (p) =>
    R(400, 300, 800, 300, 20, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    [0, 1, 2].map((i) => L(460, 380 + i * 90, 1140, 380 + i * 90, p.l, 12)).join('') +
    C(600, 380, 26, p.b) + C(980, 470, 26, p.b) + C(720, 560, 26, p.b) +
    [0, 1, 2].map((i) => L(500 + i * 200, 760, 700 + i * 200, 760, p.l, 8)).join('') +
    [0, 1, 2, 3].map((i) => C(500 + i * 200, 760, 30, i % 2 ? p.a : p.b)).join('') },

  { slug: 'mlx-oc-monitoring-explained', label: 'A monitor showing a metric line beside a model chip', p: 'cyan', body: (p) =>
    R(360, 300, 620, 420, 20, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    L(360, 500, 620, 500, p.b, 12) + L(360, 400, 620, 400, p.b, 12) + L(360, 600, 620, 600, p.b, 12) +
    PO('400,620 470,540 540,600 610,420 680,520 760,380 900,470', p.a, 12) +
    L(670, 720, 670, 800, '#94A3B8', 16) + R(560, 800, 220, 26, 12, p.b) +
    R(1080, 420, 300, 260, 20, p.dk) + R(1130, 470, 200, 160, 12, p.b) +
    L(1220, 470, 1220, 420, p.b, 12) + C(1160, 400, 16, p.e) + C(1280, 400, 16, p.e) },

  { slug: 'mlx-supervision-launchagent', label: 'Cogs driving a watchdog eye that keeps a service up', p: 'mint', body: (p) =>
    gear(560, 560, 130, p.b, 10, p.w) + gear(760, 660, 100, p.a, 9, p.w) +
    R(900, 480, 320, 220, 24, p.w, ` stroke="${p.a}" stroke-width="8"`) +
    E(1060, 590, 100, 60, 'none', ` stroke="${p.a}" stroke-width="12"`) + C(1060, 590, 34, p.a) +
    PO('960,340 1060,300 1160,340', '#FFFFFF', 8) +
    PA('M960 340 Q1060 260 1160 340', 'none', ` stroke="${p.e}" stroke-width="12"`) },

  // --- git & writing
  { slug: 'ai-git-branching-strategy', label: 'A branch tree with a highlighted node', p: 'mint', body: (p) =>
    branchTree(520, 300, p.b, p.a) +
    C(800, 390, 34, p.e) + C(800, 390, 60, 'none', ` stroke="${p.e}" stroke-width="8" opacity="0.5"`) +
    L(520, 720, 1080, 720, p.l, 10) + R(700, 690, 220, 60, 30, p.w, ` stroke="${p.a}" stroke-width="6"`) },

  { slug: 'git-concepts', label: 'A commit graph with branches merging back', p: 'teal', body: (p) =>
    L(500, 280, 500, 800, p.b, 14) +
    [0, 1, 2, 3].map((i) => C(500, 320 + i * 160, 26, p.a)).join('') +
    PA('M500 480 C700 480 700 360 900 360', 'none', ` stroke="${p.b}" stroke-width="14"`) +
    C(900, 360, 26, p.e) + C(900, 520, 26, p.a) +
    PA('M900 360 C900 480 900 520 900 520', 'none', ` stroke="${p.b}" stroke-width="14"`) +
    PA('M500 640 C760 640 760 800 1020 800', 'none', ` stroke="${p.b}" stroke-width="14"`) +
    C(1020, 800, 26, p.e) },

  { slug: 'understanding-git-flow', label: 'A flow of parallel branches between two rails', p: 'cyan', body: (p) =>
    L(300, 800, 1300, 800, p.a, 16) +
    L(300, 300, 1300, 300, p.b, 16) +
    PA('M420 800 C520 800 520 520 620 520', 'none', ` stroke="${p.b}" stroke-width="14"`) +
    PA('M620 520 H900', 'none', ` stroke="${p.b}" stroke-width="14"`) +
    PA('M900 520 C1000 520 1000 300 1100 300', 'none', ` stroke="${p.b}" stroke-width="14"`) +
    C(420, 800, 22, p.a) + C(620, 520, 26, p.e) + C(900, 520, 22, p.a) + C(1100, 300, 22, p.b) +
    R(560, 420, 400, 200, 20, p.w, ` stroke="${p.l}" stroke-width="6"`) },

  { slug: 'markdown-cheatsheet', label: 'A document page with formatting marks', p: 'sky', body: (p) =>
    doc(520, 260, 560, 620, p.a) +
    R(600, 360, 60, 40, 8, p.b) + R(690, 360, 300, 16, 8, p.l) +
    R(600, 460, 90, 40, 8, p.b) + R(720, 460, 260, 16, 8, p.l) +
    R(600, 560, 120, 40, 8, p.b) + R(750, 560, 230, 16, 8, p.l) +
    R(600, 660, 60, 40, 8, p.b) + R(690, 660, 300, 16, 8, p.l) },

  { slug: 'how-to-write-a-readable-technical-blog', label: 'A pen beside a page of even, readable lines', p: 'sky', body: (p) =>
    doc(480, 260, 560, 620, p.a) +
    [0, 1, 2, 3, 4].map((i) => R(560, 380 + i * 80, 400 - (i % 2) * 60, 20, 10, p.l)).join('') +
    R(1040, 380, 40, 520, 16, p.a) + PL('1040,380 1080,380 1060,320', p.a) +
    C(1060, 330, 8, p.dk) },

  { slug: 'resume', label: 'A folder holding a one-page document', p: 'slate', body: (p) =>
    PA('M420 320 H700 L760 380 H1180 V820 H420 Z', p.b) +
    R(500, 360, 560, 520, 14, p.w, ` stroke="#94A3B8" stroke-width="6"`) +
    R(560, 420, 200, 24, 12, p.l) + R(560, 470, 400, 16, 8, p.l) +
    R(560, 540, 400, 16, 8, p.l) + R(560, 590, 340, 16, 8, p.l) + R(560, 640, 380, 16, 8, p.l) +
    C(1050, 760, 60, p.e) + PO('1024,760 1044,780 1076,740', '#FFFFFF', 10) },

  // --- mobile & web
  { slug: 'ios-android-build-guide', label: 'A phone and tablet beside stacked build blocks', p: 'sky', body: (p) =>
    phone(360, 380, p.a) + R(640, 420, 300, 220, 20, p.b) + R(660, 440, 260, 180, 12, '#FFFFFF') +
    R(1010, 620, 260, 80, 14, p.l) + R(1010, 520, 260, 80, 14, p.b) + R(1010, 420, 260, 80, 14, p.l) +
    L(580, 620, 640, 620, p.l, 10) + L(940, 530, 1010, 530, p.l, 10) },

  { slug: 'mobile-ci-cd', label: 'A phone travelling a pipeline of rollers', p: 'teal', body: (p) =>
    phone(400, 340, p.a) +
    C(700, 660, 60, p.b) + C(900, 660, 60, p.b) + C(1100, 660, 60, p.b) +
    C(700, 660, 22, '#FFFFFF') + C(900, 660, 22, '#FFFFFF') + C(1100, 660, 22, '#FFFFFF') +
    L(300, 620, 1300, 620, p.l, 12) +
    R(1180, 340, 200, 240, 20, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    C(1280, 460, 44, p.e) + PO('1258,460 1274,478 1306,440', '#FFFFFF', 10) },

  { slug: 'e2e-testing-token-efficiency', label: 'A browser window with a checklist and a token', p: 'lime', body: (p) =>
    browser(380, 300, 620, 460, p.a) +
    R(430, 400, 40, 40, 8, p.e) + R(500, 410, 380, 18, 9, p.l) +
    R(430, 480, 40, 40, 8, p.e) + R(500, 490, 300, 18, 9, p.l) +
    R(430, 560, 40, 40, 8, p.b) + R(500, 570, 340, 18, 9, p.l) +
    coin(1140, 560, 90, p.a) },

  { slug: 'engineering-reliability-testing-strategy', label: 'A layered pyramid under a check shield', p: 'slate', body: (p) =>
    PL('800,380 1000,660 600,660', p.l) + PL('800,500 940,660 660,660', p.b) +
    R(560, 700, 480, 60, 12, p.a) +
    shield(1180, 440, p.e, p.dk) },

  // --- fleet ops / platform
  { slug: 'kri-ops-guide', label: 'A control panel of gauges and switches', p: 'slate', body: (p) =>
    R(400, 280, 800, 520, 22, '#E8EDF5', ' stroke="#94A3B8" stroke-width="6"') +
    C(580, 460, 80, 'none', ' stroke="#CBD5E1" stroke-width="18"') + L(580, 460, 620, 420, p.a, 12) +
    C(820, 460, 80, 'none', ' stroke="#CBD5E1" stroke-width="18"') + L(820, 460, 780, 410, p.b, 12) +
    C(1060, 460, 80, 'none', ' stroke="#CBD5E1" stroke-width="18"') + L(1060, 460, 1100, 425, p.e, 12) +
    R(500, 640, 240, 80, 40, p.b) + C(700, 680, 30, p.w) +
    R(860, 660, 280, 40, 20, p.l) + C(940, 680, 26, p.b) },

  { slug: 'kri-salt-deployment', label: 'A shaker dusting salt over a grid of nodes', p: 'mint', body: (p) =>
    PA('M700 340 L900 340 L840 520 L760 520 Z', p.b) + R(690, 300, 220, 60, 16, p.a) +
    [0, 1, 2, 3].map((i) => [0, 1, 2, 3].map((j) => C(560 + j * 160, 680 + i * 60, 16, (i + j) % 2 ? p.e : p.l)).join('')).join('') +
    [0, 1, 2, 3, 4, 5].map((i) => C(660 + i * 40, 560 + (i % 2) * 24, 8, p.a)).join('') },

  { slug: 'kri-testing-strategy', label: 'Test tubes above a grid of check nodes', p: 'lime', body: (p) =>
    [0, 1, 2].map((i) => R(560 + i * 180, 360, 90, 220, 16, p.w, ` stroke="${p.a}" stroke-width="6"`) +
      R(566 + i * 180, 480 + i * 20, 78, 96 - i * 20, 10, i % 2 ? p.e : p.b)).join('') +
    R(520, 300, 620, 30, 15, p.a) +
    [0, 1, 2, 3].map((i) => C(600 + i * 140, 720, 30, p.b) + PO(`${586 + i * 140},720 ${598 + i * 140},732 ${622 + i * 140},706`, '#FFFFFF', 8)).join('') },

  { slug: 'auth-concepts', label: 'A keyhole flanked by two keys', p: 'violet', body: (p) =>
    R(680, 320, 240, 440, 30, p.a) + C(800, 470, 60, p.w) + PL('770,510 830,510 815,610 785,610', p.w) +
    key(340, 620, p.b) + key(1020, 400, p.e) },

  { slug: 'homelab-sso-consolidation', label: 'One key opening three locks, one crossed out', p: 'cyan', body: (p) =>
    key(420, 560, p.a) +
    lock(800, 560, p.b) + lock(1060, 560, p.b) + lock(1320, 560, p.b) +
    L(1290, 520, 1350, 600, '#EF4444', 14) + L(1350, 520, 1290, 600, '#EF4444', 14) +
    L(500, 560, 700, 560, p.l, 10) },

  { slug: 'perils-of-timezone', label: 'A globe ringed by clocks at different hours', p: 'amber', body: (p) =>
    globe(800, 560, 150, p.b, p.e) +
    clock(420, 380, 70, p.a, Math.PI * 0.75) + clock(1180, 380, 70, p.a, Math.PI * 0.1) + clock(800, 860, 70, p.a, Math.PI * 1.4) },

  { slug: 'mac-shortcuts', label: 'A row of keys along a keyboard base', p: 'slate', body: (p) =>
    R(340, 460, 920, 300, 30, '#E8EDF5', ' stroke="#94A3B8" stroke-width="6"') +
    [0, 1, 2, 3, 4, 5].map((i) => R(380 + i * 148, 500, 120, 100, 14, i % 2 ? p.b : p.l)).join('') +
    [0, 1, 2, 3, 4].map((i) => R(430 + i * 148, 620, 120, 100, 14, i % 2 ? p.l : p.b)).join('') },

  { slug: 'tmux-session-manager', label: 'A terminal window split into three panes', p: 'slate', body: (p) =>
    term(380, 280, 840, 520, p.a) +
    L(546, 324, 546, 800, p.l, 8) + L(546, 562, 1220, 562, p.l, 8) },

  { slug: 'zellij-session-manager', label: 'Tiled terminal panes with a highlighted status bar', p: 'cyan', body: (p) =>
    R(380, 280, 840, 540, 18, '#F8FAFC', ` stroke="${p.a}" stroke-width="6"`) +
    R(398, 298, 400, 260, 10, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    R(812, 298, 390, 260, 10, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    R(398, 572, 804, 230, 10, p.w, ` stroke="${p.b}" stroke-width="6"`) +
    R(380, 756, 840, 46, 12, p.a) +
    C(760, 420, 30, p.e) + PO('744,420 758,434 782,404', '#FFFFFF', 8) },

  { slug: 'thunderbolt-ring-launchdaemons', label: 'A ring network around a lightning bolt between two cogs', p: 'violet', body: (p) =>
    C(800, 540, 230, 'none', ` stroke="${p.b}" stroke-width="16"`) +
    [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return C((800 + Math.cos(a) * 230).toFixed(1), (540 + Math.sin(a) * 230).toFixed(1), 26, i % 2 ? p.a : p.e);
    }).join('') +
    PL('846,352 688,628 772,628 740,792 906,498 812,498', p.e, ` stroke="${p.dk}" stroke-width="6"`) +
    gear(300, 540, 92, p.b, 9, p.w) + gear(1300, 540, 92, p.a, 9, p.w) },

  // --- containers & CVE
  { slug: 'container-scanner-divergence', label: 'One container judged by four different magnifiers', p: 'cyan', body: (p) =>
    R(600, 380, 400, 420, 24, p.b) + R(600, 380, 400, 70, 24, p.a) +
    L(640, 500, 960, 500, p.l, 12) + L(640, 570, 960, 570, p.l, 12) + L(640, 640, 960, 640, p.l, 12) +
    magnifier(360, 340, 70, p.e) + magnifier(1240, 340, 70, p.a) + magnifier(360, 840, 70, p.b) + magnifier(1240, 840, 70, p.e) +
    C(360, 340, 30, '#EF4444') + C(1240, 340, 30, '#10B981') + C(360, 840, 30, '#10B981') + C(1240, 840, 30, '#F59E0B') },

  { slug: 'cve-agent-autopush', label: 'A patch travelling a guarded pipeline', p: 'orange', body: (p) =>
    R(320, 520, 220, 180, 18, p.b) + R(680, 520, 220, 180, 18, p.a) + R(1040, 520, 220, 180, 18, p.b) +
    L(540, 610, 680, 610, p.l, 12) + L(900, 610, 1040, 610, p.l, 12) +
    PL('650,580 690,610 650,640', p.l) + PL('1010,580 1050,610 1010,640', p.l) +
    [0, 1, 2, 3].map((i) => R(400 + i * 200, 380, 16, 120, 8, i % 2 ? p.e : p.a)).join('') +
    L(380, 350, 1220, 350, p.a, 10) + C(800, 350, 30, p.e) },

  { slug: 'temurin-cve-2025-69644-fix', label: 'A coffee cup beside a shield and a removed package', p: 'amber', body: (p) =>
    R(440, 500, 260, 260, 20, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    R(400, 500, 340, 50, 20, p.a) + PA(`M700 560 q120 40 0 160`, 'none', ` stroke="${p.a}" stroke-width="18"`) +
    PO('520,420 520,380 560,360 600,380 600,420', 'none', ` stroke="${p.l}" stroke-width="8"`) +
    shield(900, 560, p.e, p.dk) +
    R(1120, 480, 200, 200, 16, 'none', ` stroke="${p.a}" stroke-width="8" stroke-dasharray="16 12"`) +
    L(1160, 520, 1280, 640, '#EF4444', 14) + L(1280, 520, 1160, 640, '#EF4444', 14) },

  { slug: 'omlx-071-upstream-roadmap', label: 'An arrow leaping over a long row of commit dots', p: 'lime', body: (p) =>
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => C(400 + i * 90, 660, 22, i < 3 ? p.b : p.a)).join('') +
    PA('M380 660 C560 560 700 520 900 520 C1080 520 1180 560 1240 620', 'none', ` stroke="${p.a}" stroke-width="16"`) +
    PL('1200,600 1260,640 1190,672', p.a) +
    R(1160, 380, 200, 120, 18, p.b) + L(1260, 380, 1260, 320, p.l, 12) },

  { slug: 'opensre-integrations', label: 'Cable plugs joining blocks along a bus', p: 'violet', body: (p) =>
    L(340, 560, 1260, 560, p.l, 14) +
    R(440, 380, 200, 120, 18, p.b) + R(740, 380, 200, 120, 18, p.a) + R(1040, 380, 200, 120, 18, p.b) +
    plug(540, 560, p.e, 0) + plug(840, 560, p.e, 0) + plug(1140, 560, p.e, 0) +
    R(520, 680, 560, 100, 50, p.w, ` stroke="${p.a}" stroke-width="6"`) + C(800, 730, 26, p.a) },

  { slug: 'graphify-obsidian-vault', label: 'A node graph inside an open vault door', p: 'violet', body: (p) =>
    C(800, 560, 220, 'none', ` stroke="${p.a}" stroke-width="16"`) +
    C(800, 560, 40, p.a) + C(660, 440, 26, p.b) + C(940, 440, 26, p.b) + C(700, 700, 26, p.e) + C(920, 700, 26, p.e) +
    L(680, 455, 770, 540, p.l, 8) + L(920, 455, 830, 540, p.l, 8) +
    L(710, 690, 775, 590, p.l, 8) + L(910, 690, 825, 590, p.l, 8) +
    C(800, 560, 300, 'none', ` stroke="${p.l}" stroke-width="8" stroke-dasharray="16 14"`) },

  { slug: 'token-confidence-logprobs', label: 'A probability distribution with a single token peaking', p: 'rose', body: (p) =>
    R(360, 280, 880, 520, 22, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    L(420, 720, 1180, 720, p.l, 10) +
    PA('M420 720 C560 720 620 400 760 400 C900 400 960 720 1180 720 Z', p.l, ' opacity="0.6"') +
    PA('M420 720 C600 720 680 300 800 300 C920 300 1000 720 1180 720', 'none', ` stroke="${p.a}" stroke-width="12"`) +
    L(800, 300, 800, 720, p.e, 6, ' stroke-dasharray="12 10"') + C(800, 300, 20, p.e) },

  { slug: 'salt-concepts', label: 'A shaker pouring grains into labelled boxes', p: 'amber', body: (p) =>
    PA('M760 320 L940 320 L880 520 L820 520 Z', p.a) + R(750, 280, 200, 56, 16, p.b) +
    [0, 1, 2, 3, 4].map((i) => C(820 + Math.sin(i) * 60, 560 + i * 30, 10, p.e)).join('') +
    R(560, 720, 300, 140, 16, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    R(960, 720, 300, 140, 16, p.w, ` stroke="${p.a}" stroke-width="6"`) },

  // --- posts that previously collided on a shared raster cover
  { slug: 'drift-detector-observability', label: 'A drifting trend line pulling away from its baseline', p: 'teal', body: (p) =>
    R(380, 300, 840, 480, 22, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    L(440, 700, 1160, 700, p.l, 8) + L(440, 340, 440, 700, p.l, 8) +
    PO('440,640 620,635 800,628 1000,620 1160,614', p.a, 8, ' stroke-dasharray="14 10"') +
    PO('440,620 560,608 680,590 800,556 920,452 1040,368', p.b, 12) +
    C(920, 452, 22, '#EF4444') + C(680, 590, 16, p.e) },

  { slug: 'k8s-grafana-data-path', label: 'A data path stepping from pod to service into a graph panel', p: 'indigo', body: (p) =>
    R(340, 520, 170, 150, 18, p.b) + C(425, 595, 26, p.w) +
    R(570, 520, 170, 150, 18, p.a) + C(655, 595, 26, p.w) +
    R(800, 520, 170, 150, 18, p.b) + C(885, 595, 26, p.w) +
    L(510, 595, 570, 595, p.l, 12) + L(740, 595, 800, 595, p.l, 12) +
    R(1050, 380, 320, 380, 20, '#FFFFFF', ' stroke="#94A3B8" stroke-width="6"') +
    PO('1090,660 1170,590 1250,630 1330,500', p.b, 10) },

  { slug: 'typhoon-wifi-cpu-powersave', label: 'Wifi signal arcs beside a power meter', p: 'lime', body: (p) =>
    PA('M400 600 Q800 150 1200 600', 'none', ` stroke="${p.a}" stroke-width="22"`) +
    PA('M520 660 Q800 330 1080 660', 'none', ` stroke="${p.a}" stroke-width="22"`) +
    PA('M640 720 Q800 510 960 720', 'none', ` stroke="${p.a}" stroke-width="22"`) +
    C(800, 790, 32, p.e) +
    C(1280, 620, 86, 'none', ` stroke="${p.dk}" stroke-width="16"`) +
    L(1280, 620, 1226, 566, p.b, 14) + C(1280, 620, 12, p.dk) +
    C(360, 800, 24, p.b) },

  { slug: 'kri-knowledge-graph-graphify', label: 'A node graph feeding a magnified panel of relations', p: 'mint', body: (p) =>
    C(460, 380, 28, p.a) + C(340, 560, 26, p.b) + C(560, 560, 26, p.b) + C(460, 740, 26, p.a) + C(660, 760, 26, p.e) +
    L(460, 380, 340, 560, p.l, 8) + L(460, 380, 560, 560, p.l, 8) +
    L(340, 560, 460, 740, p.l, 8) + L(560, 560, 460, 740, p.l, 8) + L(560, 560, 660, 760, p.l, 8) +
    R(880, 420, 380, 300, 18, p.w, ` stroke="${p.a}" stroke-width="6"`) +
    C(960, 500, 18, p.b) + C(1080, 520, 18, p.e) + C(1180, 480, 18, p.b) +
    L(960, 500, 1080, 520, p.l, 6) + L(1080, 520, 1180, 480, p.l, 6) +
    magnifier(1150, 640, 72, p.a) },

  { slug: 'mlx-llms-on-apple-silicon-wwdc25-26', label: 'Three small computers beneath a rising growth arrow', p: 'sky', body: (p) =>
    mini(300, 620, p.a, p.l) + mini(620, 620, p.a, p.l) + mini(940, 620, p.a, p.l) +
    L(510, 685, 620, 685, p.b, 10) + L(830, 685, 940, 685, p.b, 10) +
    PA('M420 560 C560 440 720 380 900 340', 'none', ` stroke="${p.e}" stroke-width="16"`) +
    PL('880,306 960,336 900,392', p.e) +
    C(420, 560, 26, p.b) + C(660, 404, 26, p.b) },
];

/* ------------------------------------------------------------------------ */

function frame({ label, p, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1067" role="img" aria-label="${label}">\n` +
    `  <defs>\n    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">\n` +
    `      <stop offset="0" stop-color="${p.bg[0]}"/>\n      <stop offset="1" stop-color="${p.bg[1]}"/>\n` +
    `    </linearGradient>\n  </defs>\n` +
    `  <rect width="1600" height="1067" fill="url(#bg)"/>\n` +
    `  <circle cx="215" cy="205" r="150" fill="${p.d1}" opacity="0.55"/>\n` +
    `  <circle cx="1405" cy="855" r="180" fill="${p.d2}" opacity="0.45"/>\n` +
    `  <circle cx="1355" cy="185" r="62" fill="${p.l}" opacity="0.5"/>\n` +
    `  <ellipse cx="800" cy="898" rx="545" ry="56" fill="${p.g}"/>\n` +
    body(p) + '\n</svg>\n';
}

let written = 0;
for (const cover of COVERS) {
  const src = frame({ ...cover, p: P[cover.p] });
  fs.writeFileSync(path.join(OUT, `${cover.slug}.svg`), src);
  written++;
}
console.log(`Wrote ${written} cover SVGs.`);
