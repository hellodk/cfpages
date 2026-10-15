import { describe, it, expect } from 'vitest';
import { POSTS } from '../../scripts/lib/manifest.mjs';
import { maskSlug } from '../../scripts/lib/mask.mjs';

describe('POSTS manifest', () => {
  it('has 96 entries', () => {
    expect(POSTS).toHaveLength(96);
  });

  it('has 89 live and 7 draft', () => {
    expect(POSTS.filter((p) => !p.draft)).toHaveLength(89);
    expect(POSTS.filter((p) => p.draft)).toHaveLength(7);
  });

  it('has unique slugs', () => {
    const slugs = POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has unique source paths', () => {
    const srcs = POSTS.map((p) => p.src);
    expect(new Set(srcs).size).toBe(srcs.length);
  });

  it('uses ISO dates', () => {
    for (const p of POSTS) expect(p.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // Cap raised 4 -> 5 for the Bucket D taxonomy (issue #14): series posts
  // carry one brand tag (opensre/mlx) plus the topic tags. Lowercase rule stays.
  it('gives every post between 1 and 5 lowercase tags', () => {
    for (const p of POSTS) {
      expect(p.tags.length).toBeGreaterThan(0);
      expect(p.tags.length).toBeLessThanOrEqual(5);
      for (const t of p.tags) expect(t).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('carries no unmasked project name in a slug', () => {
    for (const p of POSTS) expect(p.slug).not.toContain('avika');
  });

  // This is what maskSlug is for: every manifest slug must already be its own
  // masked, normalised form, so the orchestrator never has to rewrite a filename.
  it('stores every slug in already-masked form', () => {
    for (const p of POSTS) expect(maskSlug(p.slug)).toBe(p.slug);
  });
});
