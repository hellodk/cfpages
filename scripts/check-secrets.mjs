#!/usr/bin/env node
/**
 * Fail if files look like they contain secrets or must not be committed.
 *   npm run check:secrets          — all tracked files
 *   node scripts/check-secrets.mjs --staged   — pre-commit (staged only)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { pathToFileURL } from 'url';
import { findUnmasked } from './lib/mask.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const stagedOnly = process.argv.includes('--staged');

const FORBIDDEN = [
  { name: 'Brevo API key', re: /xkeysib-[a-zA-Z0-9]{16,}/ },
  { name: 'GitHub PAT', re: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: 'GitHub OAuth', re: /gho_[a-zA-Z0-9]{36,}/ },
  { name: 'OpenAI key', re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Private key block', re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
];

const BLOCKED_PATHS = [
  /^\.env$/,
  /^\.env\.local$/,
  /^\.dev\.vars$/,
  /\.pem$/,
  /\.key$/,
  /^credentials\.json$/,
  /^secrets\.json$/,
];

/**
 * Employer names are fine on the resume and nowhere else. The resume lives in
 * the blog collection, so its `description` frontmatter is syndicated into
 * feed.xml, the paginated listing cards and tag pages — naming an employer
 * there publishes it across the blog, which is a compliance problem even
 * though the resume page itself may name them freely.
 */
const EMPLOYER_TERMS = [/\bHDFC\b/i];
const EMPLOYER_ALLOWED = new Set([
  'src/content/blog/resume.md',
  'tests/unit/check-secrets.test.mjs',
]);

export function scanForEmployerNames(text, rel) {
  if (EMPLOYER_ALLOWED.has(rel)) return [];
  return EMPLOYER_TERMS.filter(re => re.test(text)).map(re => String(re));
}

const ALLOWLIST_PATHS = [
  /^\.env\.example$/,
  /^docs\//,
  /^scripts\/check-secrets\.mjs$/,
  /^package-lock\.json$/,
  /^README\.md$/,
];

/** In-range addresses that survived masking. */
export function scanContentForAddresses(text) {
  return findUnmasked(text);
}

function filesToCheck() {
  if (stagedOnly) {
    const out = execSync('git diff --cached --name-only -z', { cwd: ROOT, encoding: 'buffer' });
    return out.toString('utf8').split('\0').filter(Boolean);
  }
  const out = execSync('git ls-files -z', { cwd: ROOT, encoding: 'buffer' });
  return out.toString('utf8').split('\0').filter(Boolean);
}

function allowed(rel) {
  return ALLOWLIST_PATHS.some(p => p.test(rel));
}

/**
 * Fail closed: an ALLOWLIST_PATHS entry that happened to match blog content
 * would silently bypass both the secret-pattern scan and the address gate,
 * since `allowed(rel)` short-circuits before any scanning runs. Assert this
 * can never happen rather than relying on scan-order alone.
 */
function assertAllowlistDoesNotShadowBlogContent() {
  const probes = ['src/content/blog/example.md', 'public/assets/blog/example/diagram.svg'];
  for (const p of ALLOWLIST_PATHS) {
    for (const probe of probes) {
      if (p.test(probe)) {
        throw new Error(
          `ALLOWLIST_PATHS entry ${p} matches blog content path "${probe}" `
          + '— it would bypass the secrets and address gate.',
        );
      }
    }
  }
}

function blockedPath(rel) {
  return BLOCKED_PATHS.some(p => p.test(rel));
}

function main() {
  assertAllowlistDoesNotShadowBlogContent();

  let failed = false;

  for (const rel of filesToCheck()) {
    if (blockedPath(rel)) {
      console.error(`✗ Blocked file must not be committed: ${rel}`);
      failed = true;
      continue;
    }
    if (allowed(rel)) continue;

    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    if (fs.statSync(abs).size > 2_000_000) continue;

    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }

    for (const { name, re } of FORBIDDEN) {
      if (re.test(text)) {
        console.error(`✗ ${name} pattern in ${stagedOnly ? 'staged' : 'tracked'} file: ${rel}`);
        failed = true;
      }
    }

    const employers = scanForEmployerNames(text, rel);
    if (employers.length) {
      console.error(`✗ Employer name outside the resume in ${rel}: ${employers.join(', ')}`);
      failed = true;
    }

    if (rel.startsWith('src/content/blog/') || rel.startsWith('public/assets/blog/')) {
      const leaked = scanContentForAddresses(text);
      if (leaked.length) {
        console.error(`✗ Unmasked address in ${rel}: ${leaked.join(', ')}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error('\nCommit blocked. See docs/SECRETS.md');
    process.exit(1);
  }

  console.log(stagedOnly ? '✓ Pre-commit secret check passed' : '✓ No secret patterns in tracked files');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
