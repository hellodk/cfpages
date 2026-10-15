/**
 * Convert a self-contained blog HTML page into markdown, preserving inline
 * SVG diagrams verbatim.
 *
 * The previous migration stripped every tag with /<[^>]+>/g, which removed the
 * SVG elements while keeping their <text> labels as loose prose, and flattened
 * <pre> blocks into paragraphs. Turndown must never see an SVG — the subtrees
 * are pulled out to placeholders first and re-injected afterwards.
 */
import { parse } from 'node-html-parser';
import TurndownService from 'turndown';
import { clipDescription } from './normalize-md.mjs';

/**
 * Page furniture. Removed before SVG extraction so decorative icons go with it.
 *
 * Derived by surveying all 33 post-like sources in the corpus, which use three
 * layouts, not two: Concept Guide (`header.top` + `.tabbar`), Narrative
 * (`.page` + `.tag-strip`), and App Shell (`.topbar` + `.sidebar`).
 *
 * `.hero` is deliberately NOT here. It holds the post's opening paragraph
 * (41–122 words across the corpus) and is the description fallback below.
 * Only its metadata children are chrome.
 *
 * The tab bars are safe to remove: every `.tabs`/`.tab-nav`/`.tabbar` in the
 * corpus was verified to contain buttons only, never panels. Removing a
 * container that wrapped the panels would delete the entire post body.
 */
const CHROME_SELECTORS = [
  'style', 'script', 'noscript',
  // `head` and friends matter because two sources (salt-concepts, zellij) are
  // malformed enough that node-html-parser exposes no <body> element at all.
  // The `?? root.innerHTML` fallback at step 7 then drags <head> in, putting
  // the <title> text at the top of the body. Safe to remove here: title and
  // description are read at step 1, before this runs.
  'head', 'title', 'meta', 'link',
  // page furniture. `header.header` is a fourth header layout, used by
  // git-concepts.html alone: its .header-title duplicates the <title> into the
  // body and its .header-sub is a middot-separated badge string that the
  // description fallback would otherwise ship as the SEO description.
  'header.top', 'header.header', '.header-title', '.header-sub',
  '.topbar', '.sidebar', '.toc', '#toc', 'footer', '.footer', '.footer-note',
  // byline and metadata strips
  '.byline', '.meta', '.hero-meta', '.topbar-meta', '.tag-strip', '.hero-eyebrow', '.hero-badge',
  // tab bars (buttons only — verified)
  '.tabbar', '.tabs', '.tab-nav', '.tab-nav-inner', '.nav-label', '.nav-link',
  // decorative icons
  '.header-icon', '.topbar-icon',
];

/**
 * Drop table-of-contents and navigation strips from the converted markdown.
 *
 * Selector-based chrome removal cannot reach every TOC. In two sources
 * (salt-concepts, zellij) node-html-parser exposes neither a <body> nor the
 * <nav class="sidebar"> inside it — `querySelectorAll('nav')` returns 0 even
 * though the tag is in the file — so `.sidebar` never matches and the TOC
 * survives. This works on the shape of the output instead of the markup, so
 * it is immune to how badly the source parsed.
 *
 * A TOC block is 2+ same-page anchor links with little other text. Short
 * label blocks ("Why", "Architecture") sit between the anchor runs and are
 * skipped only when an anchor block follows. If no anchor block is ever seen,
 * nothing is removed.
 */
function stripNavigation(body) {
  const anchorCount = (b) => (b.match(/\]\(#[^)]+\)/g) || []).length;
  const nonLinkLength = (b) => b.replace(/\[[^\]]*\]\(#[^)]+\)/g, '').replace(/\s+/g, '').length;
  // Real navigation is pure links: every TOC and nav strip in the corpus has
  // ZERO non-link characters (separators like `·` add one or two). Prose that
  // cites anchors always carries real words between them. A loose threshold
  // here silently eats an opening paragraph — `<60` consumed
  // "See [A](#a), [B](#b) and [C](#c) for the derivation." (41 chars).
  const isNav = (b) => nonLinkLength(b) < 10;
  const isToc = (b) => anchorCount(b) >= 2 && isNav(b);
  const isLabel = (b) => b.trim().length <= 25 && !b.includes('\n') && anchorCount(b) === 0;

  // Mid-document needs 3+ anchors: a two-anchor line deep in the body is far
  // more likely to be prose than navigation.
  const isNavStrip = (b) => anchorCount(b) >= 3 && isNav(b);

  let blocks = body.split(/\n\s*\n/);

  let i = 0;
  let sawToc = false;
  while (i < blocks.length) {
    if (isToc(blocks[i])) { sawToc = true; i += 1; continue; }
    if (isLabel(blocks[i]) && blocks[i + 1] && isToc(blocks[i + 1])) { i += 1; continue; }
    break;
  }
  if (sawToc) blocks = blocks.slice(i);

  const kept = blocks.filter((b) => !isNavStrip(b));

  // Never strip the document to nothing. If every block looked like navigation
  // the classification is wrong, and an empty post is worse than a stray nav line.
  const result = kept.join('\n\n').trim();
  return result || body;
}

/**
 * Named HTML entities that appear in the corpus. Deliberately not the full
 * HTML5 table — an unknown entity is left untouched rather than guessed at.
 */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', mdash: '—', ndash: '–', hellip: '…',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  copy: '©', reg: '®', trade: '™',
};

/**
 * Decode the named + numeric HTML entities seen in the corpus (markdown
 * sources carry these verbatim since they were never parsed as HTML).
 * Unknown entities are left untouched rather than guessed at or dropped.
 */
export function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, ent) => {
    if (ent[0] === '#') {
      const code = ent[1] === 'x' || ent[1] === 'X'
        ? parseInt(ent.slice(2), 16)
        : parseInt(ent.slice(1), 10);
      // String.fromCodePoint throws RangeError outside 0..0x10FFFF. One
      // malformed &#...; must not abort the whole migration — pass the
      // original token through unchanged instead.
      return Number.isInteger(code) && code > 0 && code <= 0x10FFFF
        ? String.fromCodePoint(code)
        : whole;
    }
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, ent) ? NAMED_ENTITIES[ent] : whole;
  });
}

// Skip headings, raw HTML (re-injected SVG), code fences, table rows, bullet
// and numbered list items, and blockquotes.
const NOT_PROSE = /^([#<|]|```|[-*>]\s|\d+[.)]\s)/;
// Pure separator lines: `---...---`, `===...===`, `***...***`.
const HR_LINE = /^[-=_*]{3,}\s*$/;
// Markdown metadata lines ("**Date**: ... **Analyst Role**: ..."): two or
// more bold-label pairs in one block reads as a metadata strip, not prose.
const METADATA_LABEL = /\*\*[^*]+\*\*:/g;
// A bare command word is not a command: "git is a distributed version control
// system" opens a legitimate post. Require a flag or a path to follow, or an
// explicit prompt / sudo. Verified against 15 cases, prose and commands both.
const CMD = '(?:git|docker|npm|npx|node|kubectl|salt|code|brew|systemctl|yum|apt|curl|ssh|helm|terraform|pod|tart)';
const COMMAND_START = new RegExp(
  '^(?:\\$|#\\s|sudo\\s)'
  + '|^' + CMD + '\\b(?:\\s+[\\w.:@=-]+){0,3}\\s+-{1,2}\\w'
  + '|^' + CMD + '\\b(?:\\s+[\\w.:@=-]+){0,2}\\s+\\S*/',
  'i',
);
const FLAG_TOKEN = /(?:^|\s)--[\w-]+/g;
const CMD_LINE = new RegExp('^\\s*' + CMD + '\\b', 'i');
const CMD_WORD = new RegExp('\\b' + CMD + '\\b', 'gi');

/**
 * Ordinary English function words. The positive signal that a block is prose.
 * A shell invocation contains none of these; a sentence contains several.
 */
const FUNCTION_WORD = /\b(?:the|a|an|is|are|was|were|be|been|and|or|but|if|so|that|this|these|those|it|its|we|our|you|your|they|their|of|in|on|to|for|with|from|as|at|by|than|then|when|which|who|how|why|because|however|while)\b/gi;

/**
 * Flags and paths must be removed before scoring: `-A` and `--sort-by` would
 * otherwise register as the function words "a" and "by", scoring a pure
 * command block as prose.
 */
const stripCmdSyntax = (b) => b
  .replace(/(^|\s)-{1,2}[\w-]+/g, ' ')
  .replace(/\S+\/\S*/g, ' ')
  .replace(/[|&;]{1,2}/g, ' ');

const proseScore = (b) => (stripCmdSyntax(b).match(FUNCTION_WORD) || []).length;

/**
 * Command shape AND an absence of English. Shape alone is what produced three
 * rounds of false positives — prose that merely discusses tools has the shape
 * but reads like a sentence.
 *
 * Verified against 19 cases: 9 command forms (bare, flagged, chained, sudo,
 * multi-line) and 10 prose forms (ending in period, colon, paren, quote;
 * multi-line; naming two or three tools).
 */
function isCommandBlock(block) {
  const shaped =
    COMMAND_START.test(block)
    || block.split('\n').filter((l) => l.trim() && CMD_LINE.test(l)).length >= 2
    || (block.match(CMD_WORD) || []).length >= 2;
  return shaped && proseScore(block) < 2;
}

/**
 * First block of real prose in a markdown document — skips headings, code,
 * tables, lists, blockquotes, horizontal rules, bold-label metadata lines and
 * shell command lines. Shared by `convertHtml`'s description fallback and the
 * markdown migration path (`fromMarkdown` in migrate-blogs.mjs) so both apply
 * an identical rule. Returns '' when nothing qualifies.
 */
export function firstProseParagraph(md) {
  const blocks = String(md).split(/\n\s*\n/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (NOT_PROSE.test(block)) continue;
    if (HR_LINE.test(block)) continue;
    if ((block.match(METADATA_LABEL) || []).length >= 2) continue;
    if (isCommandBlock(block) || (block.match(FLAG_TOKEN) || []).length >= 2) continue;
    if (block.length <= 60) continue;
    return clipDescription(decodeEntities(block).replace(/[#*`>[\]]/g, '').replace(/\s+/g, ' ').trim());
  }
  return '';
}

function inferLanguage(code) {
  const t = code.trim();
  if (/^\s*[{[]/.test(t)) return 'json';
  if (/^(apiVersion|kind|metadata|spec):/m.test(t)) return 'yaml';
  if (/^\s*(\$|#\s|sudo |kubectl |salt |git |npm |docker |brew |systemctl )/m.test(t)) return 'bash';
  if (/^\s*(def |import |from \w+ import)/m.test(t)) return 'python';
  if (/^\s*(const |let |function |export )/m.test(t)) return 'js';
  return 'bash';
}

/**
 * Exported so one-shot recovery scripts get the same table and fenced-code
 * handling as the main migration, rather than reaching for the GFM plugin and
 * adding a dependency for rules this module already implements.
 */
export function buildTurndown() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  td.addRule('fencedPre', {
    filter: 'pre',
    replacement: (_content, node) => {
      const code = node.textContent.replace(/\n+$/, '');
      return `\n\n\`\`\`${inferLanguage(code)}\n${code}\n\`\`\`\n\n`;
    },
  });

  td.addRule('table', {
    filter: 'table',
    replacement: (_content, node) => {
      // Array.from, not spread. Turndown parses with its bundled
      // @mixmark-io/domino, whose NodeList has `length` and indexed access but
      // no Symbol.iterator — `[...nodeList]` throws "not iterable". These
      // nodes are domino's, not node-html-parser's, so the rest of this module
      // can spread freely but this rule cannot. Same for childNodes below:
      // index with .length, never spread. tagName is UPPERCASE per DOM.
      //
      // Serialize a cell's inline content instead of reading textContent.
      // textContent silently drops every inner tag — 74 <code> and 20
      // <strong> elements across the corpus never reached readers — so code
      // spans, emphasis and links are converted to their markdown forms and
      // only genuinely structural wrappers (span etc.) are flattened.
      const inline = (el) => {
        let out = '';
        const kids = el.childNodes;
        for (let k = 0; k < kids.length; k++) {
          const n = kids[k];
          if (n.nodeType === 3) { out += n.textContent; continue; }
          if (n.nodeType !== 1) continue;
          const tag = String(n.tagName || '').toLowerCase();
          if (tag === 'br') { out += ' '; continue; }
          const inner = inline(n);
          if (tag === 'code') out += '`' + inner + '`';
          else if (tag === 'strong' || tag === 'b') out += '**' + inner + '**';
          else if (tag === 'em' || tag === 'i') out += '*' + inner + '*';
          else if (tag === 'a') {
            const href = n.getAttribute ? (n.getAttribute('href') || '') : '';
            out += href ? `[${inner}](${href})` : inner;
          } else out += inner;
        }
        return out;
      };
      const rows = Array.from(node.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('th,td')).map((c) => inline(c).trim().replace(/\|/g, '\\|')),
      );
      if (!rows.length) return '';
      const [head, ...rest] = rows;
      const line = (cells) => `| ${cells.join(' | ')} |`;
      // GFM column alignment is header-driven: propagate each header cell's
      // align attribute (right/center) into the separator row. Body cells
      // inherit the column alignment at render time. Unknown or missing
      // values keep the plain separator so unannotated tables are untouched.
      const headRow = node.querySelectorAll('tr')[0];
      const aligns = headRow
        ? Array.from(headRow.querySelectorAll('th,td')).map((c) =>
            String(c.getAttribute ? c.getAttribute('align') ?? '' : '').toLowerCase())
        : [];
      const sep = `| ${head.map((_, i) => {
        const a = aligns[i];
        if (a === 'right') return '---:';
        if (a === 'center') return ':---:';
        return '---';
      }).join(' | ')} |`;
      return `\n\n${[line(head), sep, ...rest.map(line)].join('\n')}\n\n`;
    },
  });

  return td;
}

export function convertHtml(html) {
  const root = parse(String(html), { blockTextElements: { script: true, style: true } });

  // 1. Head metadata, before anything is removed.
  const title = (root.querySelector('title')?.textContent ?? '')
    .replace(/\s*[—|]\s*hellodk.*$/i, '')
    .trim();
  // 21 of 33 sources have no <meta name="description">, so fall back through
  // the layouts: App Shell keeps its lede in `.hero p`, Concept Guide in
  // `header .sub`, and some guides only have a `.section-desc`. Unscoped `.sub`
  // is NOT usable — several sources reuse it for stat-card sublabels.
  let description = (
    root.querySelector('meta[name="description"]')?.getAttribute('content')
    || root.querySelector('.hero p')?.textContent
    || root.querySelector('header .sub')?.textContent
    || root.querySelector('.section-desc')?.textContent
    || ''
  ).replace(/\s+/g, ' ').trim();
  description = clipDescription(description);

  // 2. Tab labels become H2 headings on their panels, before the bar is removed.
  // Selector coverage across the corpus: `.tab-panel` 10 files, `.tab` 8,
  // `.tab-btn` 4, `.tabbar .tab` and `section.panel` 1 each — so all the
  // variants are needed, not just the Concept Guide pair. `.tabpane` (no
  // hyphen) is the mlx-oc series convention: same tablist/buttons shape, so
  // the labels land on the panes instead of the panes shipping unlabeled
  // once the bar is stripped as chrome.
  const bar = root.querySelector('.tabbar, .tabs, .tab-nav');
  const tabLabels = bar
    ? bar.querySelectorAll('.tab-btn, .tab, button').map((tab) => {
        tab.querySelector('.tab-num')?.remove();
        return tab.textContent.replace(/\s+/g, ' ').trim();
      }).filter(Boolean)
    : [];
  root.querySelectorAll('.tab-panel, section.panel, .panel, .tabpane').forEach((panel, i) => {
    if (tabLabels[i]) panel.insertAdjacentHTML('afterbegin', `<h2>${tabLabels[i]}</h2>`);
  });

  // 3. .section-title becomes H3.
  root.querySelectorAll('.section-title').forEach((el) => {
    el.replaceWith(`<h3>${el.innerHTML}</h3>`);
  });

  // 4. Strip chrome. This also removes decorative icon SVGs inside it.
  for (const sel of CHROME_SELECTORS) {
    root.querySelectorAll(sel).forEach((el) => el.remove());
  }

  // 4a. Foreign series navs: a bare <nav> whose every link is a relative
  // filesystem path (sibling .html, ../ traversals) points at another site's
  // URL space — on this site every one of those links 404s. Same-page-anchor
  // TOCs (#...), absolute site paths (/...) and real http(s) links never
  // match, so TOC-shape filtering and content navs are untouched. Verified:
  // the 22 mlx-oc navs match; no other corpus source has such a nav.
  root.querySelectorAll('nav').forEach((el) => {
    const hrefs = el.querySelectorAll('a').map((a) => a.getAttribute('href') || '');
    const foreign = (h) => /^(?!https?:\/\/|mailto:|#|\/)[\w.\-/]+$/.test(h);
    if (hrefs.length >= 2 && hrefs.every(foreign)) el.remove();
  });

  // 4b. Style 2 components (issue #14): `.stats` stat cards and
  // `.note`/`.alert` callouts are pulled out before Turndown — which would
  // otherwise flatten them into bare paragraphs — and re-injected afterwards
  // as structured blocks the post layout styles. Same placeholder discipline
  // as the SVG pass below: no underscores, or Turndown escapes them.
  //
  // Malformed-input guard: extraction uses innerHTML, so an UNCLOSED wrapper
  // (homelab-secret-rescue §1 shipped `<div class="alert">…</p>` with no
  // `</div>`) would swallow the rest of the document into one callout. Nodes
  // whose content holds block-level structure are left for Turndown instead.
  const BLOCKY = /<(section|svg|pre|table|h[1-6]|ul|ol|blockquote|aside)[\s>]/i;
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const variantOf = (el, ...names) => {
    const classes = (el.getAttribute('class') || '').split(/\s+/);
    const found = names.find((n) => classes.includes(n));
    if (found === 'good') return 'ok';
    if (found === 'bad') return 'err';
    return found || '';
  };
  const htmlBlocks = [];
  root.querySelectorAll('.stats').forEach((stats) => {
    if (BLOCKY.test(stats.innerHTML)) return;
    const cards = stats.querySelectorAll('.stat').map((stat) => {
      const v = variantOf(stat, 'ok', 'err', 'warn', 'good', 'bad');
      const n = esc(stat.querySelector('.n')?.textContent?.trim());
      // Label class differs by source vintage: homelab uses .l, the 297
      // reference uses .k (its stylesheet has no .l at all).
      const l = esc(stat.querySelector('.l, .k')?.textContent?.trim());
      if (!n && !l) return '';
      const cls = v ? 'stat-card stat-card--' + v : 'stat-card';
      return '<div class="' + cls + '"><span class="stat-card__n">' + n + '</span><span class="stat-card__l">' + l + '</span></div>';
    }).filter(Boolean);
    if (!cards.length) { stats.remove(); return; }
    htmlBlocks.push(`<div class="stat-cards">\n${cards.join('\n')}\n</div>`);
    stats.replaceWith(`<p>%%HTML${htmlBlocks.length - 1}%%</p>`);
  });
  root.querySelectorAll('.note, .alert').forEach((note) => {
    if (BLOCKY.test(note.innerHTML)) return;
    const v = variantOf(note, 'ok', 'err', 'warn', 'good', 'bad');
    const titleEl = note.querySelector('b, strong, .t');
    const title = esc(titleEl?.textContent?.trim());
    titleEl?.remove();
    const inner = note.innerHTML.trim();
    if (!title && !inner) { note.remove(); return; }
    const cls = v ? 'callout callout--' + v : 'callout';
    htmlBlocks.push(
      '<aside class="' + cls + '">' +
      (title ? '<strong class="callout__title">' + title + '</strong>' : '') +
      (inner ? '<div class="callout__body">' + inner + '</div>' : '') +
      '</aside>',
    );
    note.replaceWith(`<p>%%HTML${htmlBlocks.length - 1}%%</p>`);
  });

  // 5. The layout renders the title, so drop the leading h1.
  root.querySelector('h1')?.remove();

  // 6. Pull the surviving (diagram) SVGs out before Turndown can see them.
  //
  // The placeholder must contain NO character Turndown escapes in text.
  // `%%SVG_0%%` does not work: Turndown backslash-escapes `_` to avoid stray
  // emphasis, yielding `%%SVG\_0%%`, which the re-injection regex below then
  // fails to match — the SVG is silently dropped and the literal token ships.
  // `%%SVG0%%` round-trips unchanged.
  const svgs = [];
  root.querySelectorAll('svg').forEach((svg) => {
    // Some source diagrams are empty shells drawn by an inline <script> at view
    // time; CHROME_SELECTORS strips <script>, so nothing can restore them. An
    // empty <svg> renders as a blank gap — drop it rather than ship a hole.
    const DRAWABLE = /<(rect|circle|ellipse|path|line|polyline|polygon|text|image|use)\b/;
    if (!DRAWABLE.test(svg.outerHTML)) { svg.remove(); return; }

    // Drop blank lines inside the SVG entirely. A blank line terminates an
    // HTML block in CommonMark, and the indented continuation lines then parse
    // as an indented code block — the diagram truncates and its source renders
    // as literal text. 1,204 blank lines across 26 posts did exactly that.
    //
    // A regex replace of /\n[ \t]*\n/ is NOT sufficient: matches are
    // non-overlapping, so a run of three blank lines collapses to one rather
    // than none. node-html-parser also drops HTML comments on serialization,
    // which creates exactly such runs. Filtering empty lines is unconditional.
    // Verified through @astrojs/markdown-remark on auth-concepts:
    //   as shipped -> 6 plaintext code blocks, 269 leaked markup lines
    //   with fix   -> 0 and 0
    svgs.push(svg.outerHTML.split('\n').filter((l) => l.trim()).join('\n'));
    svg.replaceWith(`<p>%%SVG${svgs.length - 1}%%</p>`);
  });

  // 7. Convert.
  const source = root.querySelector('body')?.innerHTML ?? root.innerHTML;
  let body = buildTurndown().turndown(source);

  // 8. Re-inject the SVGs verbatim.
  body = body.replace(/%%SVG(\d+)%%/g, (_m, i) => `\n\n${svgs[Number(i)]}\n\n`);

  // 8b. Re-inject the Style 2 component blocks verbatim.
  body = body.replace(/%%HTML(\d+)%%/g, (_m, i) => `\n\n${htmlBlocks[Number(i)]}\n\n`);

  body = body.replace(/\n{3,}/g, '\n\n').trim();
  body = stripNavigation(body);

  // Last resort: the first substantial prose paragraph of the converted body.
  // Five manifest sources reach here (kri-ops-guide, git-concepts,
  // ios-android-build-guide, auth-concepts, local-llm-inference-architecture).
  // Without it the orchestrator sets description = title, which duplicates the
  // heading on cards and in SEO meta.
  if (!description) {
    description = firstProseParagraph(body);
  }

  return { title, description, body };
}
