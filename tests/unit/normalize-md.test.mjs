import { describe, it, expect } from 'vitest';
import {
  tagBareFences,
  demoteBodyH1s,
  normalizeHeadingLevels,
  clipDescription,
  normalizeBody,
} from '../../scripts/lib/normalize-md.mjs';

describe('tagBareFences', () => {
  it('tags a bare opener as text and leaves the closer alone', () => {
    const out = tagBareFences('before\n```\nart\n```\nafter');
    expect(out).toBe('before\n```text\nart\n```\nafter');
  });

  it('leaves tagged fences untouched', () => {
    const src = '```bash\necho hi\n```';
    expect(tagBareFences(src)).toBe(src);
  });

  it('handles list-indented fences without gluing blocks', () => {
    const src = '- item\n\n    ```bash\n    echo a\n    ```\n\n    ```bash\n    echo b\n    ```';
    const out = tagBareFences(src);
    expect(out).toBe(src);
    expect(out.match(/```bash/g)).toHaveLength(2);
  });
});

describe('demoteBodyH1s', () => {
  it('demotes a body H1 outside fences', () => {
    expect(demoteBodyH1s('# Title\n\nbody', 'x')).toBe('## Title\n\nbody');
  });

  it('leaves fenced # comments alone', () => {
    const src = '```bash\n# a comment\n```';
    expect(demoteBodyH1s(src, 'x')).toBe(src);
  });

  it('honours the cheatsheet exception', () => {
    const src = '# H1 demo';
    expect(demoteBodyH1s(src, 'markdown-cheatsheet', ['markdown-cheatsheet'])).toBe(src);
  });
});

describe('normalizeHeadingLevels', () => {
  it('shifts a uniform h3 document to h2', () => {
    const { body, changed } = normalizeHeadingLevels('### A\n\n### B');
    expect(changed).toBe(true);
    expect(body).toBe('## A\n\n## B');
  });

  it('preserves relative nesting when shifting', () => {
    const { body, changed } = normalizeHeadingLevels('### A\n\n#### B');
    expect(changed).toBe(true);
    expect(body).toBe('## A\n\n### B');
  });

  it('refuses a shift that would create an H1', () => {
    const src = '### Intro\n\n## Real';
    expect(normalizeHeadingLevels(src).changed).toBe(false);
  });

  it('refuses a shift that leaves a gap', () => {
    const src = '### A\n\n###### B';
    expect(normalizeHeadingLevels(src).changed).toBe(false);
  });

  it('is a no-op when already gapless', () => {
    const src = '## A\n\n### B';
    const { body, changed } = normalizeHeadingLevels(src);
    expect(changed).toBe(false);
    expect(body).toBe(src);
  });
});

describe('clipDescription', () => {
  it('returns short strings unchanged', () => {
    expect(clipDescription('hello world')).toBe('hello world');
  });

  it('cuts at a word boundary, never mid-word', () => {
    const src = 'aaa '.repeat(100);
    const out = clipDescription(src, 300);
    expect(out.length).toBeLessThanOrEqual(300);
    // The next source char is a space (or end): no word continues past the cut.
    expect(src[out.length] ?? ' ').toBe(' ');
    expect(src.startsWith(out)).toBe(true);
  });

  it('completes the distroless description case', () => {
    const src = `${'x '.repeat(149)}disappointi`;
    const out = clipDescription(`${src}onward`, 300);
    expect(out).not.toMatch(/disappointi$/);
  });
});

describe('normalizeBody', () => {
  it('applies all three rules in one pass', () => {
    // The demoted H1 anchors at h2, so ### A nests under it — gapless.
    const out = normalizeBody({ slug: 'x' }, '# H1\n\n```\nart\n```\n\n### A');
    expect(out).toBe('## H1\n\n```text\nart\n```\n\n### A');
  });
});
