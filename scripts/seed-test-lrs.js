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

// Load xAPI statements from fixtures
const FIXTURES_PATH = path.join(
  __dirname,
  '..',
  'test',
  'fixtures',
  'xapi-statements.json',
);

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const lrsBaseUrl = new URL(LRS_URL);
  const healthUrl = `${lrsBaseUrl.protocol}//${lrsBaseUrl.host}/health`;

  console.log(`⏳ Waiting for LRS at ${healthUrl} to be ready...`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await makeRequest(healthUrl, { method: 'GET' });

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

  // Create Basic Auth header
  const auth = Buffer.from(`${LRS_API_KEY}:${LRS_API_SECRET}`).toString(
    'base64',
  );

  // Normalize LRS_URL to avoid double slashes when appending /statements (REQ-FN-018)
  const normalizedLrsUrl = LRS_URL.replace(/\/+$/, '');
  const statementsUrl = normalizedLrsUrl.endsWith('/xapi')
    ? `${normalizedLrsUrl}/statements`
    : `${normalizedLrsUrl}/xapi/statements`;

  try {
    const response = await makeRequest(
      statementsUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
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
      console.error(`  Auth: Basic ${auth.substring(0, 10)}...`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error seeding statements: ${error.message}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 LAAC Test LRS Seeding Script');
  console.log('================================\n');
  console.log(`LRS URL: ${LRS_URL}`);
  console.log(`API Key: ${LRS_API_KEY}`);
  console.log(`Fixtures: ${FIXTURES_PATH}\n`);

  try {
    // Check if fixtures file exists
    if (!fs.existsSync(FIXTURES_PATH)) {
      throw new Error(`Fixtures file not found: ${FIXTURES_PATH}`);
    }

    // Load xAPI statements
    const statementsJson = fs.readFileSync(FIXTURES_PATH, 'utf-8');
    const statements = JSON.parse(statementsJson);

    if (!Array.isArray(statements) || statements.length === 0) {
      throw new Error('Fixtures file must contain an array of xAPI statements');
    }

    console.log(`✅ Loaded ${statements.length} statements from fixtures\n`);

    // Wait for LRS to be ready
    await waitForLRS();

    // Add a small delay to ensure LRS is fully initialized
    console.log('⏳ Waiting 5 seconds for LRS to fully initialize...');
    await sleep(5000);

    // Seed statements
    const success = await seedStatements(statements);

    if (success) {
      console.log('\n✅ Test LRS seeding completed successfully!');
      process.exit(0);
    } else {
      console.error('\n❌ Test LRS seeding failed!');
      process.exit(1);
    }
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

module.exports = { seedStatements, waitForLRS };
