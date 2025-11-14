#!/usr/bin/env node
/**
 * REQ-NF-019: Anonymize xAPI statements for test fixtures
 *
 * Anonymizes personally identifiable information (PII) in xAPI statements:
 * - Actor identifiers (mbox, account names, openid)
 * - Authority identifiers
 * - Sensitive URLs and domains
 * - Preserves structure and relationships for testing
 *
 * Usage:
 *   node scripts/anonymize-xapi-statements.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INPUT_FILE = path.join(
  __dirname,
  '..',
  'test',
  'fixtures',
  'xapi-statements.json',
);
const OUTPUT_FILE = INPUT_FILE; // Overwrite original

// Consistent mapping for anonymization
const emailMap = new Map();
const accountNameMap = new Map();
const domainMap = new Map();
let emailCounter = 1;
let accountCounter = 1;
let domainCounter = 1;

/**
 * Generate consistent hash for a value
 */
function hashValue(value) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Anonymize email (mbox)
 */
function anonymizeEmail(mbox) {
  if (!mbox || !mbox.startsWith('mailto:')) return mbox;

  if (!emailMap.has(mbox)) {
    emailMap.set(mbox, `mailto:student${emailCounter}@test.example.com`);
    emailCounter++;
  }

  return emailMap.get(mbox);
}

/**
 * Anonymize account name
 */
function anonymizeAccountName(name) {
  if (!name) return name;

  if (!accountNameMap.has(name)) {
    accountNameMap.set(name, `user-${hashValue(name)}`);
    accountCounter++;
  }

  return accountNameMap.get(name);
}

/**
 * Anonymize domain/URL
 */
function anonymizeDomain(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);
    const originalDomain = urlObj.hostname;

    if (!domainMap.has(originalDomain)) {
      domainMap.set(originalDomain, `test-domain-${domainCounter}.example.com`);
      domainCounter++;
    }

    urlObj.hostname = domainMap.get(originalDomain);
    return urlObj.toString();
  } catch (e) {
    // Not a valid URL, return as-is
    return url;
  }
}

/**
 * Anonymize a single actor or authority
 */
function anonymizeAgent(agent) {
  if (!agent) return agent;

  const anonymized = { ...agent };

  // Anonymize mbox
  if (anonymized.mbox) {
    anonymized.mbox = anonymizeEmail(anonymized.mbox);
  }

  // Anonymize mbox_sha1sum (remove it, as we can't reconstruct from anonymized email)
  if (anonymized.mbox_sha1sum) {
    delete anonymized.mbox_sha1sum;
  }

  // Anonymize openid
  if (anonymized.openid) {
    anonymized.openid = anonymizeDomain(anonymized.openid);
  }

  // Anonymize account
  if (anonymized.account) {
    anonymized.account = {
      ...anonymized.account,
      name: anonymizeAccountName(anonymized.account.name),
      homePage: anonymized.account.homePage
        ? anonymizeDomain(anonymized.account.homePage)
        : anonymized.account.homePage,
    };
  }

  // Remove name (PII)
  if (anonymized.name) {
    delete anonymized.name;
  }

  return anonymized;
}

/**
 * Anonymize URLs in activity definitions
 */
function anonymizeActivity(activity) {
  if (!activity) return activity;

  const anonymized = { ...activity };

  // Anonymize activity ID (URL)
  if (anonymized.id) {
    anonymized.id = anonymizeDomain(anonymized.id);
  }

  // Anonymize definition URLs
  if (anonymized.definition) {
    anonymized.definition = { ...anonymized.definition };

    if (anonymized.definition.moreInfo) {
      anonymized.definition.moreInfo = anonymizeDomain(
        anonymized.definition.moreInfo,
      );
    }
  }

  return anonymized;
}

/**
 * Anonymize context
 */
function anonymizeContext(context) {
  if (!context) return context;

  const anonymized = { ...context };

  // Anonymize instructor
  if (anonymized.instructor) {
    anonymized.instructor = anonymizeAgent(anonymized.instructor);
  }

  // Anonymize team
  if (anonymized.team) {
    anonymized.team = anonymizeAgent(anonymized.team);
  }

  // Anonymize contextActivities
  if (anonymized.contextActivities) {
    anonymized.contextActivities = { ...anonymized.contextActivities };

    ['parent', 'grouping', 'category', 'other'].forEach((key) => {
      if (anonymized.contextActivities[key]) {
        anonymized.contextActivities[key] =
          anonymized.contextActivities[key].map(anonymizeActivity);
      }
    });
  }

  // Anonymize extensions with domains
  if (anonymized.extensions) {
    const newExtensions = {};
    for (const [key, value] of Object.entries(anonymized.extensions)) {
      // Anonymize extension URLs
      const newKey = anonymizeDomain(key);
      let newValue = value;

      // If value is an object with domain field, anonymize it
      if (value && typeof value === 'object' && value.domain) {
        newValue = {
          ...value,
          domain: anonymizeDomain(value.domain),
        };
      }

      newExtensions[newKey] = newValue;
    }
    anonymized.extensions = newExtensions;
  }

  return anonymized;
}

/**
 * Anonymize a single statement
 */
function anonymizeStatement(statement) {
  const anonymized = { ...statement };

  // Anonymize actor
  if (anonymized.actor) {
    anonymized.actor = anonymizeAgent(anonymized.actor);
  }

  // Anonymize authority
  if (anonymized.authority) {
    anonymized.authority = anonymizeAgent(anonymized.authority);
  }

  // Anonymize object (if it's an agent)
  if (anonymized.object) {
    if (
      anonymized.object.objectType === 'Agent' ||
      anonymized.object.objectType === 'Group'
    ) {
      anonymized.object = anonymizeAgent(anonymized.object);
    } else {
      // It's an activity
      anonymized.object = anonymizeActivity(anonymized.object);
    }
  }

  // Anonymize context
  if (anonymized.context) {
    anonymized.context = anonymizeContext(anonymized.context);
  }

  // Anonymize attachments URLs
  if (anonymized.attachments) {
    anonymized.attachments = anonymized.attachments.map((att) => ({
      ...att,
      fileUrl: att.fileUrl ? anonymizeDomain(att.fileUrl) : att.fileUrl,
    }));
  }

  return anonymized;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔒 LAAC xAPI Statement Anonymization Script');
  console.log('==========================================\n');
  console.log(`📄 Input: ${INPUT_FILE}\n`);

  try {
    // Read statements
    const statementsJson = fs.readFileSync(INPUT_FILE, 'utf-8');
    const statements = JSON.parse(statementsJson);

    if (!Array.isArray(statements)) {
      throw new Error('Input file must contain an array of statements');
    }

    console.log(`✅ Loaded ${statements.length} statements\n`);
    console.log('🔄 Anonymizing...');

    // Anonymize all statements
    const anonymizedStatements = statements.map(anonymizeStatement);

    // Write back to file
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(anonymizedStatements, null, 2),
    );

    console.log(`\n✅ Anonymization complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   - Anonymized ${emailMap.size} email addresses`);
    console.log(`   - Anonymized ${accountNameMap.size} account names`);
    console.log(`   - Anonymized ${domainMap.size} domains`);
    console.log(`   - Output: ${OUTPUT_FILE}`);
    console.log(
      `\n⚠️  Note: Structure and relationships preserved for testing`,
    );
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
