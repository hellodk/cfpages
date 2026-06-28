#!/usr/bin/env node
/**
 * Fail if files look like they contain secrets or must not be committed.
 *   npm run check:secrets          — all tracked files
 *   node scripts/check-secrets.mjs --staged   — pre-commit (staged only)
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

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

const ALLOWLIST_PATHS = [
  /^\.env\.example$/,
  /^docs\//,
  /^scripts\/check-secrets\.mjs$/,
  /^package-lock\.json$/,
  /^README\.md$/,
];

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

function blockedPath(rel) {
  return BLOCKED_PATHS.some(p => p.test(rel));
}

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
}

if (failed) {
  console.error('\nCommit blocked. See docs/SECRETS.md');
  process.exit(1);
}

console.log(stagedOnly ? '✓ Pre-commit secret check passed' : '✓ No secret patterns in tracked files');
