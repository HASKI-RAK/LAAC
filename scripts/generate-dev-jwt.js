#!/usr/bin/env node
/*
 * Dev convenience script to generate valid JWT tokens for testing
 * Usage: node scripts/generate-dev-jwt.js [--admin] [--readonly] [--custom-scopes=scope1,scope2]
 *
 * Examples:
 *   node scripts/generate-dev-jwt.js                    # Default: metrics:read scope
 *   node scripts/generate-dev-jwt.js --admin            # Admin with all scopes
 *   node scripts/generate-dev-jwt.js --readonly         # Read-only scopes
 *   node scripts/generate-dev-jwt.js --custom-scopes=metrics:read,cache:invalidate
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Load .env file
const ENV_FILE = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(ENV_FILE)) {
  console.error(
    'Error: .env file not found. Run `yarn generate:secrets` first.',
  );
  process.exit(1);
}

const envContent = fs.readFileSync(ENV_FILE, 'utf8');
const envMap = new Map();
envContent.split(/\r?\n/).forEach((line) => {
  if (!line || line.trim().startsWith('#')) return;
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const key = line.slice(0, idx).trim();
  let val = line.slice(idx + 1).trim();
  // Strip quotes
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  envMap.set(key, val);
});

const JWT_SECRET = envMap.get('JWT_SECRET');
const JWT_EXPIRATION = envMap.get('JWT_EXPIRATION') || '1h';

if (!JWT_SECRET) {
  console.error(
    'Error: JWT_SECRET not found in .env file. Run `yarn generate:secrets` first.',
  );
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const argv = new Set(args.filter((a) => a.startsWith('--')));
const customScopes = args
  .find((a) => a.startsWith('--custom-scopes='))
  ?.split('=')[1];

// Define scope presets (using correct scope names from the API)
const SCOPE_PRESETS = {
  admin: ['analytics:read', 'analytics:write', 'admin:cache', 'admin:all'],
  readonly: ['analytics:read'],
  default: ['analytics:read'],
};

// Determine scopes
let scopes;
if (customScopes) {
  scopes = customScopes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
} else if (argv.has('--admin')) {
  scopes = SCOPE_PRESETS.admin;
} else if (argv.has('--readonly')) {
  scopes = SCOPE_PRESETS.readonly;
} else {
  scopes = SCOPE_PRESETS.default;
}

// Generate JWT payload
const payload = {
  sub: 'dev-user-001', // Subject (user ID)
  username: 'dev-user',
  scopes: scopes,
};

// Sign the token
const token = jwt.sign(payload, JWT_SECRET, {
  expiresIn: JWT_EXPIRATION,
});

// Decode to show expiration
const decoded = jwt.decode(token);

// Update .env file with the generated token
const DEV_JWT_KEY = 'DEV_JWT';
const updatedEnvLines = [];
let foundDevJwt = false;

envContent.split(/\r?\n/).forEach((line) => {
  if (line.trim().startsWith(`${DEV_JWT_KEY}=`)) {
    updatedEnvLines.push(`${DEV_JWT_KEY}="${token}"`);
    foundDevJwt = true;
  } else {
    updatedEnvLines.push(line);
  }
});

// If DEV_JWT wasn't found, append it
if (!foundDevJwt) {
  updatedEnvLines.push('');
  updatedEnvLines.push(
    `# --- Development JWT Token (auto-generated on ${new Date().toISOString()}) ---`,
  );
  updatedEnvLines.push(`${DEV_JWT_KEY}="${token}"`);
}

fs.writeFileSync(ENV_FILE, updatedEnvLines.join('\n'));

// Output
console.log('\n=== Development JWT Token ===\n');
console.log('Token:');
console.log(token);
console.log('\nPayload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\nExpires:', new Date(decoded.exp * 1000).toISOString());
console.log(`\n✓ Token saved to .env as ${DEV_JWT_KEY}`);
console.log('\n=== Usage ===\n');
console.log('Copy the token and use it in your HTTP requests:');
console.log('\ncurl example:');
console.log(
  `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/v1/instances`,
);
console.log('\nOr use the environment variable from .env:');
console.log('source .env  # Or use dotenv in your tool');
console.log(
  `curl -H "Authorization: Bearer $DEV_JWT" http://localhost:3000/api/v1/instances`,
);
console.log('\n=== Available Presets ===\n');
console.log(
  '--admin       : All scopes (analytics:read, analytics:write, admin:cache, admin:all)',
);
console.log('--readonly    : Read-only scopes (analytics:read)');
console.log('(default)     : Basic access (analytics:read)');
console.log('--custom-scopes=scope1,scope2 : Custom scopes\n');
