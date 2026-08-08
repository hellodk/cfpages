import { describe, it, expect } from 'vitest';
import { scanContentForAddresses } from '../../scripts/check-secrets.mjs';

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
