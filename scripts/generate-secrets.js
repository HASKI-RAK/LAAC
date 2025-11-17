#!/usr/bin/env node
/*
 * Dev convenience script to generate required secrets in `.env`.
 * - Ensures JWT_SECRET (>=32 chars), LRS_DOMAIN, and LRS_USER exist
 * - Creates `.env` from `.env.example` if missing
 * - Appends only missing keys by default; use `--force` to overwrite
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE = path.resolve(process.cwd(), '.env');
const ENV_EXAMPLE_FILE = path.resolve(process.cwd(), '.env.example');

const REQUIRED_KEYS = ['JWT_SECRET', 'LRS_DOMAIN', 'LRS_USER'];
const PLACEHOLDERS = {
  JWT_SECRET: new Set(['your-secret-key-min-32-chars-replace-in-production']),
  LRS_DOMAIN: new Set(['https://lrs.example.com/xapi']),
  LRS_USER: new Set(['your-lrs-api-key-replace-in-production']),
};

const argv = new Set(process.argv.slice(2));
const FORCE = argv.has('--force');

function ensureEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    if (fs.existsSync(ENV_EXAMPLE_FILE)) {
      fs.copyFileSync(ENV_EXAMPLE_FILE, ENV_FILE);
      console.log(`Created \`.env\` from \`.env.example\`.`);
    } else {
      fs.writeFileSync(ENV_FILE, '# Auto-generated .env for development\n');
      console.log(`Created empty \`.env\` (no template found).`);
    }
  }
}

function parseEnv(content) {
  const map = new Map();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1);
    // Strip surrounding quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function serializeAppend(entries) {
  const ts = new Date().toISOString();
  const lines = [
    '',
    `# --- Added by scripts/generate-secrets.js on ${ts} ---`,
    ...entries.map(([k, v]) => `${k}=${needsQuoting(v) ? JSON.stringify(v) : v}`),
  ];
  return lines.join('\n') + '\n';
}

function needsQuoting(v) {
  return /\s|[#\"']/.test(v);
}

function isMissingOrPlaceholder(map, key) {
  if (FORCE || !map.has(key)) return true;
  const val = String(map.get(key) || '').trim();
  if (!val) return true;
  if (PLACEHOLDERS[key] && PLACEHOLDERS[key].has(val)) return true;
  return false;
}

function generateDefaults(current) {
  const out = new Map();
  // JWT_SECRET: at least 32 chars; generate 48 random bytes -> base64 (~64 chars)
  if (isMissingOrPlaceholder(current, 'JWT_SECRET') || String(current.get('JWT_SECRET') || '').length < 32) {
    const jwt = crypto.randomBytes(48).toString('base64');
    out.set('JWT_SECRET', jwt);
  }

  return out;
}

function main() {
  ensureEnvFile();
  const original = fs.readFileSync(ENV_FILE, 'utf8');
  const current = parseEnv(original);

  const toAdd = generateDefaults(current);

  if (toAdd.size === 0) {
    console.log('All required keys already present. Nothing to do.');
    return;
  }

  const appended = serializeAppend([...toAdd.entries()]);
  fs.appendFileSync(ENV_FILE, appended);

  console.log('Updated .env with:');
  for (const [k] of toAdd) {
    // Do not print secret values
    if (k === 'JWT_SECRET' || k === 'LRS_USER') {
      console.log(`- ${k}=<generated>`);
    } else {
      console.log(`- ${k}=${toAdd.get(k)}`);
    }
  }
  console.log('\nNext steps:');
  console.log('- Review `.env` and adjust values if needed.');
  console.log('- Start the app with `yarn start` or `yarn start:dev`.');
  console.log('\nTip: Re-run with `--force` to overwrite existing values.');
}

main();
