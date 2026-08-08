/**
 * Deterministic masking of infrastructure detail in blog content.
 *
 * Uses an exact-match table over the 29 addresses found in the corpus rather
 * than octet-pattern rules. Patterns collide: a naive `192.168.1.x -> 192.0.2.x`
 * plus `10.0.a.b -> 192.0.2.b` rule can map two distinct source addresses
 * from two distinct blocks onto the same masked target.
 *
 * Each source block maps to its own RFC 5737 documentation block, so
 * cross-block collisions are structurally impossible.
 *
 * The tables themselves (IP_TABLE, HOST_TABLE) live in the gitignored
 * scripts/lib/mask.local.mjs, not here. `hellodk/cfpages` is public, and the
 * real -> masked mapping is exactly what an attacker needs to reverse the
 * masking on all 42 posts — committing it here would defeat the point.
 */

let IP_TABLE, HOST_TABLE;
try {
  ({ IP_TABLE, HOST_TABLE } = await import('./mask.local.mjs'));
} catch {
  throw new Error(
    'scripts/lib/mask.local.mjs is missing. It holds the real -> masked address\n'
    + 'tables and is deliberately gitignored, because this repository is public\n'
    + 'and committing the mapping would make the masking reversible.\n'
    + 'See docs/superpowers/specs/2026-08-07-blog-content-migration-design.md.',
  );
}
export { IP_TABLE, HOST_TABLE };

/** Well-known constants and already-public names. Never rewritten. */
export const PRESERVE = new Set([
  '10.96.0.1',        // Kubernetes default service IP
  '10.96.0.10',       // Kubernetes default cluster DNS
  '10.244.0.0',       // default pod CIDR
  '100.100.100.100',  // Tailscale MagicDNS
  '127.0.0.1',        // loopback
]);

const PERSONAL_EMAIL = 'hello.dk@outlook.com';

/**
 * Private + CGNAT ranges that must never appear unmasked in output.
 * Leading anchor matches IP_RULES below, so the gate and the rewriter agree
 * on what counts as an address. A plain `\b` here would be stricter than the
 * rewriter, letting an address the rewriter missed slip past undetected.
 *
 * Trailing anchor is `(?!\.?\d)`, not `\b` — see IP_RULES below for why.
 */
const IN_SCOPE = new RegExp(
  '(?<![\\d.])(?:' +
    '10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}' +
    '|172\\.(?:1[6-9]|2\\d|3[01])\\.\\d{1,3}\\.\\d{1,3}' +
    '|192\\.168\\.\\d{1,3}\\.\\d{1,3}' +
    '|100\\.(?:6[4-9]|[7-9]\\d|1[01]\\d|12[0-7])\\.\\d{1,3}\\.\\d{1,3}' +
  ')(?!\\.?\\d)',
  'g',
);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Longest key first. Defence in depth only: the trailing anchor is what
 * actually stops a shorter table key (e.g. `10.9.9.1`) consuming the prefix
 * of a longer one (`10.9.9.11`), regardless of rule order.
 */
const byLengthDesc = (a, b) => b.length - a.length || a.localeCompare(b);

/**
 * Anchors, and why they are asymmetric.
 *
 * Trailing anchor is `(?!\.?\d)`, NOT `\b`. `\b` requires a non-word
 * character to follow, so a table entry concatenated directly against a
 * letter — e.g. a table cell run together during conversion, shape
 * `192.168.1.xxMac` — is a word-boundary-adjacent match and `\b` accepts it
 * as a valid trailing boundary, so the address goes unmasked. Worse: because
 * `findUnmasked` (below) shares this exact anchor, the gate doesn't see it
 * either — one wrong anchor blinded both the rewriter and the check meant to
 * catch what the rewriter missed. `(?!\.?\d)` rejects a following digit or a
 * dot-then-digit, but NOT a letter, closing the gap. Verified on 11 cases
 * (shapes, not real addresses):
 *   192.168.1.xxMac        -> masks     (the concatenation case)
 *   192.168.1.xx.          -> masks     (sentence-final)
 *   192.168.1.xx0          -> no match  (longer address)
 *   10.9.9.11 vs 10.9.9.1  -> no match  (prefix collision)
 *   192.168.1.xx.5         -> no match  (longer dotted run)
 * Over-masking a hostname prefix like `192.168.1.xx.example.com` is
 * accepted: over-masking is safe, under-masking leaks.
 *
 * Leading `(?<![\d.])` rejects only digits and dots — NOT letters. A plain
 * `\b` would refuse to match an address immediately preceded by a letter
 * (e.g. an `\n` escape sequence rendered as literal text in a Mermaid node
 * label, shape `\n100.x.x.x`), and that address would ship unmasked.
 *
 * Hostnames use a wider leading class so a table key never over-matches a
 * hostname that merely ends with it — e.g. for a table key `app.internal`,
 * `myapp.internal`, `a-app.internal` and `sub.app.internal` are left intact.
 */
const IP_RULES = Object.keys(IP_TABLE)
  .sort(byLengthDesc)
  .map((from) => ({ re: new RegExp('(?<![\\d.])' + escape(from) + '(?!\\.?\\d)', 'g'), to: IP_TABLE[from] }));

const HOST_RULES = Object.keys(HOST_TABLE)
  .sort(byLengthDesc)
  .map((from) => ({ re: new RegExp('(?<![A-Za-z0-9.-])' + escape(from) + '\\b', 'gi'), to: HOST_TABLE[from] }));

/** Match the casing of the source token: lower, UPPER, or Title. */
function matchCase(sample, replacement) {
  if (sample === sample.toUpperCase()) return replacement.toUpperCase();
  if (sample[0] === sample[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function maskText(input) {
  let out = String(input);
  for (const { re, to } of IP_RULES) out = out.replace(re, to);
  for (const { re, to } of HOST_RULES) out = out.replace(re, to);
  out = out.split(PERSONAL_EMAIL).join('');
  // Not \bavika\b: JS treats `_` as a word character, so \b never fires
  // between `avika` and the `_` in `avika_deep_analysis`. Anchor on
  // alphanumerics only — `_` and `-` then count as boundaries, while
  // `avikasomething` and `myavika` still correctly do not match.
  out = out.replace(/(?<![a-z0-9])avika(?![a-z0-9])/gi, (m) => matchCase(m, 'atlas'));
  return out;
}

export function maskSlug(slug) {
  return maskText(String(slug))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * In-range addresses surviving in `text`. This runs on already-masked output,
 * so any hit is one of two failures, and both must fail the build:
 *
 *   1. an address the table does not know — new source material, or
 *   2. a known table key the rewriter failed to rewrite.
 *
 * Table keys are therefore NOT filtered out. Filtering them would make the gate
 * blind to case 2 — a known-sensitive address reaching production while the gate
 * reports green — which is the more dangerous of the two. Only the preserve
 * list is exempt.
 */
export function findUnmasked(text) {
  const hits = String(text).match(IN_SCOPE) || [];
  return [...new Set(hits)].filter((ip) => !PRESERVE.has(ip));
}
