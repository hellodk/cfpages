import { describe, it, expect } from 'vitest';
import { site } from '../../src/data/site.ts';
import { selectedWork } from '../../src/data/selectedWork.ts';
import { scanForEmployerNames } from '../../scripts/check-secrets.mjs';

/**
 * Homepage copy has two failure modes that only show up long after the commit
 * that caused them:
 *
 *  1. An employer name written into a hero or card string. The homepage is a
 *     blog surface, so naming the current employer there is the same
 *     compliance problem the resume `description` already caused — see the
 *     gate in scripts/check-secrets.mjs.
 *  2. A hardcoded duration ("Fifteen years"). It is correct on the day it is
 *     written and silently wrong every year after, because nobody is watching
 *     the string. Anchoring to a fixed year ("since 2011") never needs tending.
 *
 * Both are cheap to assert and impossible to notice by eye during review.
 */

/** Any spelled-out or numeric count of years — the shape that goes stale. */
const AGEING_CLAIM =
  /\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d{1,2})[\s-]*(?:\+\s*)?(?:years?|yrs?)\b/i;

/** A string is only checked against the employer gate under a non-exempt path. */
const HOMEPAGE = 'src/data/site.ts';

const heroStrings = () => [site.name, site.description, site.heroScale, site.heroTagline, site.heroJourney];

describe('hero copy', () => {
  it('keeps the narrative line the author asked to retain', () => {
    expect(site.description).toMatch(/A beautiful narrative written over an elegant publishing platform/);
  });

  it('uses the requested tagline', () => {
    expect(site.heroTagline).toBe('Home Labber — Notes from the Trenches');
  });

  it('closes on the journey line', () => {
    expect(site.heroJourney).toBe('The Journey Begins here…');
  });

  it('leads the scale line with Platform Engineering', () => {
    expect(site.heroScale).toMatch(/^Platform Engineering\./);
  });

  it('anchors the scale line to a fixed year rather than a running total', () => {
    expect(site.heroScale).toMatch(/since 2011/);
    expect(site.heroScale).not.toMatch(AGEING_CLAIM);
  });

  it('names no employer anywhere in the hero', () => {
    for (const s of heroStrings()) {
      expect(scanForEmployerNames(s, HOMEPAGE)).toEqual([]);
    }
  });

  it('has every hero string populated', () => {
    for (const s of heroStrings()) {
      expect(typeof s).toBe('string');
      expect(s.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('selected work', () => {
  it('exports exactly six entries', () => {
    expect(selectedWork).toHaveLength(6);
  });

  it('gives every entry a kicker, title, blurb and evidence note', () => {
    for (const entry of selectedWork) {
      for (const field of ['kicker', 'title', 'blurb', 'note']) {
        expect(typeof entry[field], `${entry.title} .${field}`).toBe('string');
        expect(entry[field].trim().length, `${entry.title} .${field}`).toBeGreaterThan(0);
      }
    }
  });

  it('names no employer in any field', () => {
    for (const entry of selectedWork) {
      const blob = [entry.kicker, entry.title, entry.blurb, entry.note].join(' ');
      expect(scanForEmployerNames(blob, HOMEPAGE), entry.title).toEqual([]);
    }
  });

  it('makes no claim that ages', () => {
    for (const entry of selectedWork) {
      const blob = [entry.kicker, entry.title, entry.blurb, entry.note].join(' ');
      expect(blob, entry.title).not.toMatch(AGEING_CLAIM);
    }
  });

  it('links only to internal pages, never off-site', () => {
    for (const entry of selectedWork) {
      if (entry.href) expect(entry.href, entry.title).toMatch(/^\//);
    }
  });
});
