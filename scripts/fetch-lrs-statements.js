#!/usr/bin/env node
/**
 * Fetch multiple pages of xAPI statements from LRS
 * Usage: node scripts/fetch-lrs-statements.js [pages]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const LRS_URL = process.env.LRS_URL || 'http://localhost:8090/xapi';
const LRS_SECRET = process.env.LRS_SECRET || 'test-api-key';
const LRS_SECRET = process.env.LRS_SECRET || 'test-api-secret';
const PAGES = parseInt(process.argv[2] || '5', 10);
const OUTPUT_FILE = path.join(
  __dirname,
  '..',
  'test',
  'fixtures',
  'xapi-statements.json',
);

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    const auth = Buffer.from(`${LRS_SECRET}:${LRS_SECRET}`).toString('base64');

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'X-Experience-API-Version': '1.0.3',
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function fetchMultiplePages() {
  console.log(`🚀 Fetching statements from ${LRS_URL}`);
  console.log(`📄 Requesting ${PAGES} pages (50 statements per page)\n`);

  const allStatements = [];
  let nextUrl = `${LRS_URL}/statements?limit=50`;

  for (let page = 1; page <= PAGES && nextUrl; page++) {
    try {
      console.log(`📥 Fetching page ${page}...`);
      const response = await makeRequest(nextUrl);

      if (response.statements && response.statements.length > 0) {
        allStatements.push(...response.statements);
        console.log(
          `   ✅ Got ${response.statements.length} statements (total: ${allStatements.length})`,
        );

        // Get next page URL if available
        nextUrl = response.more
          ? response.more.startsWith('http')
            ? response.more
            : response.more.includes('?')
              ? `${LRS_URL}/statements?${response.more.split('?')[1]}`
              : `${LRS_URL}/statements${response.more}`
          : null;
      } else {
        console.log(`   ℹ️  No more statements available`);
        break;
      }
    } catch (error) {
      console.error(`   ❌ Error fetching page ${page}: ${error.message}`);
      break;
    }
  }

  if (allStatements.length === 0) {
    console.error('\n❌ No statements fetched!');
    process.exit(1);
  }

  // Save to file
  console.log(
    `\n💾 Saving ${allStatements.length} statements to ${OUTPUT_FILE}...`,
  );
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allStatements, null, 2));

  console.log(`✅ Successfully saved ${allStatements.length} statements!`);
  console.log(
    `📊 File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`,
  );
}

fetchMultiplePages().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
