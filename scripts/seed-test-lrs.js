#!/usr/bin/env node
/**
 * REQ-FN-018: E2E Test LRS Data Seeding Script
 *
 * Seeds xAPI statements into the LRS for testing purposes.
 * Used in CI/CD to populate the test LRS with known data before running E2E tests.
 *
 * Usage:
 *   node scripts/seed-test-lrs.js
 *
 * Environment Variables:
 *   LRS_URL: LRS endpoint URL (default: http://localhost:8090/xapi)
 *   LRS_API_KEY: LRS API key (default: test-api-key)
 *   LRS_API_SECRET: LRS API secret (default: test-api-secret)
 *   LRS_FIXTURES: Comma-separated list of fixture files to load (optional)
 *   LRS_POST_READY_DELAY_MS: Delay after /about readiness before seeding
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration from environment variables
const LRS_URL = process.env.LRS_URL || 'http://localhost:8090/xapi';
const LRS_API_KEY = process.env.LRS_API_KEY || 'test-api-key';
const LRS_API_SECRET = process.env.LRS_API_SECRET || 'test-api-secret';
const MAX_RETRIES = 9; // Wait up to 40 seconds for LRS to be ready (9 attempts with 8 delays)
const RETRY_DELAY = 5000; // 5 seconds between retries
const POST_READY_DELAY_MS = Number(process.env.LRS_POST_READY_DELAY_MS || 5000);
const BASIC_AUTH_HEADER = `Basic ${Buffer.from(
  `${LRS_API_KEY}:${LRS_API_SECRET}`,
).toString('base64')}`;
const REPO_ROOT = path.join(__dirname, '..');
const FIXTURES_DIR = path.join(REPO_ROOT, 'test', 'fixtures', 'xapi');
const LEGACY_FIXTURE_PATH = path.join(
  REPO_ROOT,
  'test',
  'fixtures',
  'xapi-statements.json',
);
const DEFAULT_FIXTURE_FILES = [
  'course-mvp.json',
  'topic-mvp.json',
  'element-mvp.json',
];

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve fixture filenames from defaults or environment override
 */
function resolveFixtureFiles() {
  if (process.env.LRS_FIXTURES) {
    return process.env.LRS_FIXTURES.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const missingDefault = DEFAULT_FIXTURE_FILES.some((file) => {
    const candidate = resolveFixturePath(file);
    return !fs.existsSync(candidate);
  });

  if (missingDefault) {
    console.warn(
      '⚠️ Default MVP fixture files missing, falling back to legacy xapi-statements.json',
    );
    return [LEGACY_FIXTURE_PATH];
  }

  return DEFAULT_FIXTURE_FILES;
}

/**
 * Resolve a fixture path relative to repo/test fixtures directory
 * @param {string} fileRef Relative or absolute reference
 */
function resolveFixturePath(fileRef) {
  if (path.isAbsolute(fileRef)) {
    return fileRef;
  }

  const fixtureDirCandidate = path.join(FIXTURES_DIR, fileRef);
  if (fs.existsSync(fixtureDirCandidate)) {
    return fixtureDirCandidate;
  }

  return path.join(REPO_ROOT, fileRef);
}

/**
 * Load statements for the requested fixture files
 */
function loadFixtureStatements(fixtureFiles = []) {
  const filesToLoad =
    fixtureFiles.length > 0 ? fixtureFiles : [LEGACY_FIXTURE_PATH];
  const statements = [];
  const loadedFiles = [];

  filesToLoad.forEach((fileRef) => {
    const absolutePath = resolveFixturePath(fileRef);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Fixtures file not found: ${absolutePath}`);
    }

    const fileContents = fs.readFileSync(absolutePath, 'utf-8');
    let parsed;

    try {
      parsed = JSON.parse(fileContents);
    } catch (error) {
      throw new Error(`Failed to parse fixture file: ${absolutePath}`);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error(
        `Fixture file must contain a non-empty array of statements: ${absolutePath}`,
      );
    }

    statements.push(...parsed);
    loadedFiles.push({
      path: absolutePath,
      count: parsed.length,
    });
  });

  if (statements.length === 0) {
    throw new Error('No xAPI statements loaded from fixture files');
  }

  return { statements, files: loadedFiles };
}

/**
 * Build a normalized xAPI URL for the configured LRS
 * Ensures we always target the /xapi namespace regardless of trailing slashes
 * @param {string} pathSuffix Suffix to append (e.g., '/about')
 */
function buildXapiUrl(pathSuffix = '') {
  const normalized = LRS_URL.replace(/\/+$/, '');
  const base = normalized.endsWith('/xapi') ? normalized : `${normalized}/xapi`;
  return `${base}${pathSuffix}`;
}

/**
 * Make HTTP request
 */
function makeRequest(url, options, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      ...options,
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Check if LRS is healthy and ready
 */
async function waitForLRS() {
  const aboutUrl = buildXapiUrl('/about');

  console.log(`⏳ Waiting for LRS at ${aboutUrl} to be ready...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await makeRequest(aboutUrl, {
        method: 'GET',
        headers: {
          Authorization: BASIC_AUTH_HEADER,
          'X-Experience-API-Version': '1.0.3',
        },
      });

      if (response.statusCode === 200) {
        console.log(`✅ LRS is ready (attempt ${attempt}/${MAX_RETRIES})`);
        return true;
      }

      console.log(
        `⏳ LRS not ready yet (HTTP ${response.statusCode}), retrying in ${RETRY_DELAY / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`,
      );
    } catch (error) {
      console.log(
        `⏳ LRS not reachable yet: ${error.message}, retrying in ${RETRY_DELAY / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`,
      );
    }

    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY);
    }
  }

  throw new Error(`LRS did not become ready after ${MAX_RETRIES} attempts`);
}

/**
 * Seed xAPI statements into LRS
 */
async function seedStatements(statements) {
  console.log(
    `📤 Seeding ${statements.length} xAPI statements to ${LRS_URL}...`,
  );

  const statementsUrl = buildXapiUrl('/statements');

  try {
    const response = await makeRequest(
      statementsUrl,
      {
        method: 'POST',
        headers: {
          Authorization: BASIC_AUTH_HEADER,
          'Content-Type': 'application/json',
          'X-Experience-API-Version': '1.0.3',
        },
      },
      JSON.stringify(statements),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(
        `✅ Successfully seeded ${statements.length} statements (HTTP ${response.statusCode})`,
      );
      return true;
    } else {
      console.error(
        `❌ Failed to seed statements (HTTP ${response.statusCode})`,
      );
      console.error(`Response: ${response.body}`);
      console.error(`\nDebug Info:`);
      console.error(`  URL: ${statementsUrl}`);
      console.error(
        `  Auth: ${BASIC_AUTH_HEADER.substring(0, 15)}... (redacted)`,
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ Error seeding statements: ${error.message}`);
    return false;
  }
}

/**
 * Orchestrate deterministic seeding for tests and tooling
 */
async function seedTestLRS() {
  const fixtureRefs = resolveFixtureFiles();
  const { statements, files } = loadFixtureStatements(fixtureRefs);

  console.log('📚 Fixture files to seed:');
  files.forEach(({ path: fixturePath, count }) => {
    console.log(`  • ${fixturePath} (${count} statements)`);
  });
  console.log(
    `✅ Loaded ${statements.length} statements from ${files.length} file(s)\n`,
  );

  await waitForLRS();

  if (POST_READY_DELAY_MS > 0) {
    console.log(
      `⏳ Waiting ${POST_READY_DELAY_MS / 1000}s for LRS to fully initialize...`,
    );
    await sleep(POST_READY_DELAY_MS);
  }

  const success = await seedStatements(statements);
  if (!success) {
    throw new Error('Failed to seed xAPI statements to LRS');
  }

  return { statementCount: statements.length, files };
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 LAAC Test LRS Seeding Script');
  console.log('================================\n');
  console.log(`LRS URL: ${LRS_URL}`);
  console.log(`API Key: ${LRS_API_KEY}`);
  if (process.env.LRS_FIXTURES) {
    console.log(`Fixtures Override: ${process.env.LRS_FIXTURES}`);
  } else {
    console.log(
      `Fixture Defaults: ${DEFAULT_FIXTURE_FILES.join(', ') || 'legacy file'}`,
    );
  }
  console.log('');

  try {
    const result = await seedTestLRS();
    console.log(
      `\n✅ Test LRS seeding completed successfully (${result.statementCount} statements)!`,
    );
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  seedStatements,
  waitForLRS,
  seedTestLRS,
  loadFixtureStatements,
};
