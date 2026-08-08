import { describe, it, expect } from 'vitest';
import { maskText, maskSlug, findUnmasked, PRESERVE } from '../../scripts/lib/mask.mjs';

/**
 * `hellodk/cfpages` is public. The real IP_TABLE / HOST_TABLE mapping lives
 * only in the gitignored scripts/lib/mask.local.mjs (see mask.mjs) — a
 * committed test asserting against real addresses would put the exact
 * real -> masked mapping back in source control and defeat the point of
 * moving it out.
 *
 * These tests exercise the masking *mechanism* — the unknown-address gate,
 * anchoring, longest-match ordering, injectivity, idempotence, case
 * handling, and the preserve list — using fixture values this file
 * constructs itself. None of them are drawn from the real corpus.
 *
 * `scripts/lib/mask.local.mjs` was inspected at the time this file was
 * written to confirm none of the fixture octets below collide with a real
 * table entry.
 *
 * What this file deliberately does NOT assert: that the real IP_TABLE /
 * HOST_TABLE are themselves injective, collision-free, or the right size.
 * Checking that here would require either hardcoding real values (leaking
 * them) or importing the live table and deriving facts from it (still a
 * real-table dependency this file exists to avoid). `scripts/verify-migration.mjs`
 * checks exactly those properties at runtime, against the actual loaded
 * table, without a real value ever appearing in a committed file.
 */

// Private/CGNAT-range addresses. Deliberately not present in the real table.
const FIXTURE = {
  ip: '192.168.222.222',
  tailscale: '100.70.5.5',
  ten: '10.77.77.77',
  oneSeventyTwo: '172.20.5.6',
};

describe('findUnmasked — the unknown-address gate (fixtures)', () => {
  it('flags an in-range 192.168.x.x address the table does not know', () => {
    expect(findUnmasked(`node at ${FIXTURE.ip}`)).toEqual([FIXTURE.ip]);
  });

  it('flags an in-range Tailscale CGNAT address the table does not know', () => {
    expect(findUnmasked(`lb ${FIXTURE.tailscale}`)).toEqual([FIXTURE.tailscale]);
  });

  it('flags an in-range 10/8 and 172.16/12 address the table does not know', () => {
    expect(findUnmasked(FIXTURE.ten)).toEqual([FIXTURE.ten]);
    expect(findUnmasked(FIXTURE.oneSeventyTwo)).toEqual([FIXTURE.oneSeventyTwo]);
  });

  it('ignores an out-of-range public address', () => {
    expect(findUnmasked('8.8.8.8 and 1.1.1.1')).toEqual([]);
  });

  it('reports each distinct unknown address once', () => {
    expect(findUnmasked(`${FIXTURE.ip} again ${FIXTURE.ip}`)).toEqual([FIXTURE.ip]);
  });
});

describe('findUnmasked / maskText — anchoring (shared leading/trailing pattern)', () => {
  // IN_SCOPE (the gate) and IP_RULES (the rewriter) use the same anchor
  // shape by design, so testing it via findUnmasked exercises both.
  it('matches an address preceded by a letter, e.g. an \\n escape', () => {
    expect(findUnmasked(`\\n${FIXTURE.ip} (test)`)).toEqual([FIXTURE.ip]);
  });

  it('matches a sentence-final address followed by a period', () => {
    expect(findUnmasked(`The gateway is ${FIXTURE.ip}.`)).toEqual([FIXTURE.ip]);
  });

  it('does not match the tail of a longer dotted sequence', () => {
    expect(findUnmasked(`1.2.${FIXTURE.ip}`)).toEqual([]);
  });

  it('does not match an address with a trailing digit', () => {
    expect(findUnmasked(`${FIXTURE.ip}0`)).toEqual([]);
  });
});

describe('maskText — preserve list (never rewritten)', () => {
  it.each([...PRESERVE])('leaves %s untouched', (ip) => {
    expect(maskText(`svc ${ip} end`)).toBe(`svc ${ip} end`);
  });

  it('leaves already-public project names untouched', () => {
    expect(maskText('kri and graphify')).toBe('kri and graphify');
  });

  it('leaves an unknown in-range address untouched — maskText only rewrites known table entries', () => {
    // maskText is an exact-match rewriter, not a pattern-based one, so an
    // address the table does not know is left as-is. findUnmasked (above) is
    // the gate that catches this case and fails the build.
    expect(maskText(FIXTURE.ip)).toBe(FIXTURE.ip);
  });
});

describe('findUnmasked — preserve list', () => {
  it.each([...PRESERVE])('reports nothing for %s', (ip) => {
    expect(findUnmasked(`svc ${ip} end`)).toEqual([]);
  });

  it('reports nothing for a mix of preserved and out-of-range addresses', () => {
    expect(findUnmasked([...PRESERVE, '8.8.8.8'].join(' '))).toEqual([]);
  });
});

describe('maskText — identity rewrites (not table-dependent)', () => {
  it('removes the personal email', () => {
    expect(maskText('mail hello.dk@outlook.com ok')).not.toContain('hello.dk@outlook.com');
  });

  it('renames avika to atlas', () => {
    expect(maskText('the avika cluster')).toBe('the atlas cluster');
  });

  it('preserves case when renaming avika', () => {
    expect(maskText('Avika')).toBe('Atlas');
    expect(maskText('AVIKA')).toBe('ATLAS');
  });

  it('does not match avika inside a longer token', () => {
    expect(maskText('avikasomething')).toBe('avikasomething');
    expect(maskText('myavika')).toBe('myavika');
  });

  // Regression guard: JS \b treats `_` as a word character, so a naive
  // /\bavika\b/ silently fails to fire here.
  it('treats underscore and hyphen as boundaries', () => {
    expect(maskText('avika_deep_analysis')).toBe('atlas_deep_analysis');
    expect(maskText('avika-tempo')).toBe('atlas-tempo');
  });
});

describe('maskText — idempotence (values not drawn from the real table)', () => {
  const fixtures = [
    'Avika ran hello.dk@outlook.com AVIKA avika_deep_analysis',
    `unknown address ${FIXTURE.ip} stays as-is`,
    'contact hello.dk@outlook.com about the atlas migration',
  ];
  it.each(fixtures)('mask(mask(x)) === mask(x) for: %s', (input) => {
    const once = maskText(input);
    expect(maskText(once)).toBe(once);
  });

  // Idempotence of the real IP_TABLE / HOST_TABLE rewrites — i.e. that no
  // replacement value is itself a source key — cannot be exercised here
  // without real values in a committed file. It is checked at runtime, over
  // the actual loaded table and every migrated post, by
  // scripts/verify-migration.mjs (both a structural key/value check and an
  // empirical `maskText(text) !== text` check on the finished output).
});

describe('maskSlug', () => {
  it('masks avika in a slug and normalises separators', () => {
    expect(maskSlug('avika_deep_analysis')).toBe('atlas-deep-analysis');
  });

  it('leaves an already-clean slug alone', () => {
    expect(maskSlug('perils-of-timezone')).toBe('perils-of-timezone');
  });
});

describe('table properties — verified against fixture tables this test constructs', () => {
  // These fixtures are not the real IP_TABLE / HOST_TABLE. They exist to
  // prove the properties below are meaningful — each includes a table that
  // satisfies the property and one that violates it, so the assertion can
  // actually fail if the property were broken, not just pass by construction.

  it('injectivity: distinct sources must map to distinct targets', () => {
    const injective = { 'a.example': '1.2.3.4', 'b.example': '5.6.7.8' };
    const notInjective = { 'a.example': '1.2.3.4', 'b.example': '1.2.3.4' };
    expect(new Set(Object.values(injective)).size).toBe(Object.keys(injective).length);
    expect(new Set(Object.values(notInjective)).size).not.toBe(Object.keys(notInjective).length);
  });

  it('idempotence precondition: no replacement value is itself a source key', () => {
    const clean = { '10.9.9.1': '203.0.113.1', '10.9.9.2': '203.0.113.2' };
    const dirty = { '10.9.9.1': '203.0.113.1', '203.0.113.1': '10.9.9.9' };
    const violatesPrecondition = (table) => {
      const keys = new Set(Object.keys(table));
      return Object.values(table).some((v) => keys.has(v));
    };
    expect(violatesPrecondition(clean)).toBe(false);
    expect(violatesPrecondition(dirty)).toBe(true);
  });

  it('longest-match ordering: a longer key is not eaten by a shorter prefix key', () => {
    // Same shape as mask.mjs's IP_RULES: sorted longest-first, same anchor.
    const table = { '10.9.9.1': '203.0.113.1', '10.9.9.11': '203.0.113.11' };
    const rules = Object.entries(table)
      .sort(([a], [b]) => b.length - a.length)
      .map(([from, to]) => ({
        re: new RegExp(`(?<![\\d.])${from.replace(/\./g, '\\.')}\\b`, 'g'),
        to,
      }));
    const apply = (text) => rules.reduce((out, { re, to }) => out.replace(re, to), text);
    expect(apply('10.9.9.11')).toBe('203.0.113.11');
    expect(apply('10.9.9.1')).toBe('203.0.113.1');
  });
});
