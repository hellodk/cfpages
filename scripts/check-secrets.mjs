#!/usr/bin/env node
/**
 * Fail if tracked files look like they contain real secrets.
 * Run: npm run check:secrets
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '..');

const FORBIDDEN = [
  { name: 'Brevo API key', re: /xkeysib-[a-zA-Z0-9]{16,}/ },
  { name: 'GitHub PAT', re: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: 'OpenAI key', re: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'Google API key', re: /AIza[0-9A-Za-z\-_]{35}/ },
  { name: 'Private key block', re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/ },
];

const ALLOWLIST_PATHS = [
  /^\.env\.example$/,
  /^docs\//,
  /^scripts\/check-secrets\.mjs$/,
  /^package-lock\.json$/,
];

function trackedFiles() {
  const out = execSync('git ls-files -z', { cwd: ROOT, encoding: 'buffer' });
  return out.toString('utf8').split('\0').filter(Boolean);
}

function allowed(rel) {
  return ALLOWLIST_PATHS.some(p => p.test(rel));
}

let failed = false;

for (const rel of trackedFiles()) {
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
      console.error(`✗ ${name} pattern in tracked file: ${rel}`);
      failed = true;
    }
  }
}

if (fs.existsSync(path.join(ROOT, '.env'))) {
  const envTracked = execSync('git ls-files .env', { cwd: ROOT, encoding: 'utf8' }).trim();
  if (envTracked) {
    console.error('✗ .env is tracked by git — remove it immediately');
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('✓ No secret patterns in tracked files');
