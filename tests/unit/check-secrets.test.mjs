import { describe, it, expect } from 'vitest';
import { scanContentForAddresses, scanForEmployerNames } from '../../scripts/check-secrets.mjs';

// `hellodk/cfpages` is public. `scanContentForAddresses` (findUnmasked) is a
// range-based gate — it flags anything in the private/CGNAT ranges that
// isn't a preserved constant, regardless of whether it is a real corpus
// address — so these fixtures exercise the exact same logic paths without
// putting a real address in a committed file. Deliberately not present in
// the real table (scripts/lib/mask.local.mjs, gitignored).
describe('scanContentForAddresses', () => {
  it('flags a LAN address in post content', () => {
    expect(scanContentForAddresses('node at 192.168.222.222')).toEqual(['192.168.222.222']);
  });

  it('flags a Tailscale address in post content', () => {
    expect(scanContentForAddresses('lb at 100.70.5.5')).toEqual(['100.70.5.5']);
  });

  it('allows preserved well-known addresses', () => {
    expect(scanContentForAddresses('dns 10.96.0.10, magic 100.100.100.100')).toEqual([]);
  });

  it('allows fully masked (RFC 5737 documentation) output', () => {
    expect(scanContentForAddresses('192.0.2.64 198.51.100.27 203.0.113.111')).toEqual([]);
  });

  it('scans copied blog assets, not only posts', () => {
    expect(scanContentForAddresses('<text>100.70.5.5</text>')).toEqual(['100.70.5.5']);
  });
});

// The resume names the current employer; blog surfaces must not. The resume
// lives in the blog collection, so its `description` frontmatter is syndicated
// into feed.xml, the paginated listing cards and tag pages — a single field
// leaking the name across three public surfaces at once.
describe('employer-name gate', () => {
  const rel = 'src/content/blog/some-post.md';

  it('flags an employer name in a normal post', () => {
    expect(scanForEmployerNames('I work at HDFC Bank', rel)).toHaveLength(1);
  });

  it('flags it in the resume description regardless of case', () => {
    expect(scanForEmployerNames('Lead DevSecOps Engineer at hdfc', rel)).toHaveLength(1);
  });

  it('allows the resume itself to name the employer', () => {
    expect(scanForEmployerNames('HDFC Bank, Bengaluru', 'src/content/blog/resume.md')).toEqual([]);
  });

  it('does not flag unrelated prose', () => {
    expect(scanForEmployerNames('secure CI/CD across banking and gaming', rel)).toEqual([]);
  });

  it("does not match the name as a substring of another word", () => {
    expect(scanForEmployerNames('the HDFCX protocol', rel)).toEqual([]);
  });
});
