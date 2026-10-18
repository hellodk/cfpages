---
title: "How to Write a Technical Blog People Actually Finish"
date: 2026-10-15
description: "Five expert sources, six rules: what Baymard, Smashing Magazine, Google's docs guide, NN/g, and the W3C agree on about readable technical writing — applied to this very blog, with the numbers."
tags: [writing, blogging, readability, ux]
cover: "assets/images/covers/how-to-write-a-readable-technical-blog.jpg"
draft: false
tldr:
  summary: "Readable technical writing is a solved problem with agreed numbers: 50–75 characters per line, ~150% line height, one H1 with no skipped levels, 4.5:1 text contrast, tagged code samples wrapped at 80 characters, and alt text that follows the W3C decision tree. This post applies all six to this blog and shows the receipts."
  points:
    - { k: "Measure", v: "50–75 characters per line (Baymard); this blog caps prose at 68ch" }
    - { k: "Leading", v: "~150% of font size (Smashing); this blog uses 1.6 after a correction" }
    - { k: "Structure", v: "One H1, never skip a level (Google, MDN); summaries up front (NN/g)" }
    - { k: "Contrast + code + images", v: "4.5:1 text (WCAG), tagged fences at 80ch (Google), decision-tree alt text (W3C)" }
---

Most readability advice is vibes. This post is the opposite: six rules with numbers, each traced to the expert source that established it, each applied to this blog with a verifiable result. If you run a technical blog, steal the checklist at the end.

<div class="stat-cards">
<div class="stat-card"><span class="stat-card__n">68ch</span><span class="stat-card__l">Prose measure on this blog</span></div>
<div class="stat-card"><span class="stat-card__n">1.6</span><span class="stat-card__l">Body line-height</span></div>
<div class="stat-card"><span class="stat-card__n">4.5:1</span><span class="stat-card__l">Minimum text contrast (WCAG AA)</span></div>
<div class="stat-card"><span class="stat-card__n">+124%</span><span class="stat-card__l">Usability gain, concise + scannable (NN/g)</span></div>
</div>

## Start with the conclusion

NN/g's inverted-pyramid rule: put the most important information first so readers get the main point regardless of how much they read — and "consider adding a summary or list of highlights." That is what the TL;DR panel at the top of this post is. In Nielsen's classic web-reading study, concise writing scored 58% higher in measured usability, scannable layout 47% higher, and all improvements combined 124% higher. A summary panel plus a table of contents is the cheapest way to buy the scannability half.

## Keep lines between 50 and 75 characters

This is the most replicated finding in the set. Baymard's 2022 large-scale testing lands on 50–75 characters per line, Ruder argued 50–60, and WCAG success criterion 1.4.8 sets the accessibility ceiling at 80. Past ~80 characters the eye stops reliably finding the next line's left edge; past 100, Baymard observed outright fatigue.

This blog learned it the hard way: prose used to run at 200ch — effectively uncapped. It is now capped at 68ch, inside every band above. Wide elements (code, tables, diagrams) keep the full column; only prose is capped, because only prose is read line by line.

## Set leading near 150 percent

Smashing Magazine's rule of thumb is ~150% of font size, with two adjustments that matter: longer measures want taller leading, and smaller type wants more height, not less. Butterick's band is 120–145%.

<aside class="callout callout--warn"><strong class="callout__title">Where the experts corrected this blog</strong><div class="callout__body"><p>
          The first fix set body leading to 1.65. The second-opinion panel flagged it: 165% sits above every expert band, and since the measure had just been shortened to 68ch, the "longer measure" justification pointed the wrong way. It now reads 1.6 — the top of consensus rather than above it. If your experts disagree with your fix, the experts win.
        </p></div></aside>

## Use one H1 and never skip a level

Google's developer documentation style guide says it plainly: a unique level-1 heading once per page, and never skip heading levels. MDN says the same for accessibility — screen-reader users navigate by headings, and a jump from H1 to H3 reads as a hole in the document. This blog's table of contents only collects H2/H3, so anything else is invisible twice: to readers and to navigation.

The audit found 3 posts with body H1s and 12 with skipped levels (H1 straight to H3 or H5). All fixed by demotion, with one documented exception: the Markdown cheatsheet, whose `#` lines demonstrate syntax rather than structure.

One deliberate deviation, recorded so it doesn't drift: Google also says not to number headings ("Step 1 — …"), preferring hierarchy and order to carry sequence. This blog keeps numbered tutorial headings anyway — narrative posts scan better with them, and the house style already numbers sections. Experts advise; editors decide, in writing.

## Treat contrast as arithmetic, not taste

WCAG 1.4.3 requires 4.5:1 for normal text and has not changed since 2008. There is no debate to have — compute the ratio and fix what fails. On this blog the failures were all small gray-on-white accents a designer would call "subtle": share labels at 2.5:1, stat numbers at 3.1–3.3:1, section eyebrows near 3:1. Every one now computes above 4.5:1. If you remember one thing from this post: check your grays. They are always the ones that fail.

## Tag every code sample and wrap at 80 characters

Google's code-sample guidance has three mechanical rules: mark blocks as preformatted text, wrap lines at 80 characters for narrow windows and print, and precede each sample with an introductory sentence. The audit here found 28 untagged fences (now all tagged — ASCII box art is honestly labeled `text`, since rewrapping art would destroy it) and exactly 3 blocks with serious over-length lines, concentrated in two posts rather than spread across the site.

<aside class="callout"><strong class="callout__title">Measure twice, especially your own measurements</strong><div class="callout__body"><p>
          The first scan reported an entire 52-line "bash block" of over-length lines. It was a false positive: the fence parser didn't tolerate indented closing fences, so it glued five separate blocks and the prose between them into one monster. The corrected parser found zero offenders there. Lint your linters.
        </p></div></aside>

## Give every image the alt text the decision tree prescribes

The W3C alt decision tree is a flowchart, not an essay: decorative or redundant-to-nearby-text gets `alt=""`; informative images get a brief description of what they contribute; complex graphs need the data elsewhere on the page. Applied here: cover art duplicates the post title, so it is decorative (`alt=""`); screenshots of terminal output in the Jenkins post keep descriptive alts, and the one piece of information that existed only inside a screenshot (the openssl Distinguished Name answers) is now transcribed as text in the post — because Google's accessibility guide also says never to let an image be the sole carrier of text content.

## The checklist

| Rule | Number | Source |
| --- | --- | --- |
| Line length | 50–75ch, hard ceiling 80 | Baymard 2022, WCAG 1.4.8 |
| Line height | ~140–150% | Smashing Magazine, Butterick |
| Headings | One H1, no skipped levels | Google docs guide, MDN |
| Summaries | Conclusion and highlights first | NN/g inverted pyramid |
| Contrast | 4.5:1 normal text | WCAG 1.4.3 |
| Code | Tagged, 80ch, introduced | Google code-sample guide |
| Images | Decision-tree alt, no sole-carrier screenshots | W3C WAI, Google a11y guide |

Five sources, six rules, all with numbers. Run the table against your own blog — every row is checkable in an afternoon, and this blog is proof: two audit rounds, all green, 688 tests watching for regressions.
