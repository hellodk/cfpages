/**
 * Post-conversion normalizations for migrated markdown. Applied by
 * scripts/migrate-blogs.mjs to every post (HTML and markdown sources alike)
 * so readability rules live in the pipeline, not in hand-edits that the next
 * migration overwrites.
 */

/** Split body into lines, tracking fenced regions (indent-tolerant). */
function walkLines(body, fn) {
  const lines = body.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const fence = /^[ \t]*```/.test(lines[i]);
    fn(lines, i, inFence, fence);
    if (fence) inFence = !inFence;
  }
  return lines.join('\n');
}

/**
 * Tag bare fences as `text`. A fence with no language gets no highlighting
 * and reads as an accident; `text` states intent (ASCII art, log output)
 * and the readability audit exempts exactly that tag from line-length
 * limits, since rewrapping art would destroy it.
 */
export function tagBareFences(body) {
  return walkLines(body, (lines, i, inFence, fence) => {
    if (fence && !inFence && lines[i].trim() === '```') lines[i] = lines[i].replace('```', '```text');
  });
}

/**
 * Demote body H1s to H2. The layout renders the title as the page H1, so a
 * `# ` line in the body is always a duplicate. Fenced `#` comments are
 * untouched. `exceptSlugs` covers sources whose H1s are the subject, not
 * the structure (the markdown cheatsheet demonstrates `#` syntax).
 */
export function demoteBodyH1s(body, slug = '', exceptSlugs = []) {
  if (exceptSlugs.includes(slug)) return body;
  return walkLines(body, (lines, i, inFence, fence) => {
    if (!inFence && !fence && /^# [^#]/.test(lines[i])) lines[i] = '#' + lines[i];
  });
}

/**
 * Shift heading levels so the first heading sits at H2, preserving relative
 * nesting. Guards: never produce an H1, and verify the result is gapless —
 * otherwise return the body unchanged (structural judgment call, not a
 * mechanical fix). Returns { body, changed }.
 */
export function normalizeHeadingLevels(body) {
  const lines = body.split('\n');
  let inFence = false;
  const heads = [];
  lines.forEach((l, i) => {
    if (/^[ \t]*```/.test(l)) { inFence = !inFence; return; }
    const m = !inFence && l.match(/^(#{2,6})\s+\S/);
    if (m) heads.push([i, m[1].length]);
  });
  if (!heads.length) return { body, changed: false };
  const shift = heads[0][1] - 2;
  if (shift <= 0) return { body, changed: false };
  const next = heads.map(([, lv]) => lv - shift);
  if (Math.min(...next) < 2) return { body, changed: false };
  let prev = 1;
  for (const lv of next) {
    if (lv - prev > 1) return { body, changed: false };
    prev = lv;
  }
  heads.forEach(([i, lv], k) => {
    lines[i] = '#'.repeat(next[k]) + lines[i].slice(lv);
  });
  return { body: lines.join('\n'), changed: true };
}

/**
 * Clip to max chars at a word boundary. `slice(0, n)` cuts mid-word
 * ("disappointi"); meta descriptions ship verbatim, so the cut must land
 * on a space. Returns the string unchanged when it already fits.
 */
export function clipDescription(s, max = 300) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.lastIndexOf(' ', max);
  return (cut > max * 0.5 ? t.slice(0, cut) : t.slice(0, max)).trim();
}

/** Full pass used by the migration orchestrator. */
export function normalizeBody(post, body) {
  let out = tagBareFences(body);
  out = demoteBodyH1s(out, post.slug, ['markdown-cheatsheet']);
  out = normalizeHeadingLevels(out).body;
  return out;
}
