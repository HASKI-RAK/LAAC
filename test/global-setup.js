'use strict';

// Load environment variables from .env.test
require('dotenv').config({ path: '.env.test' });

// Reuse the deterministic seeding helper without spawning a child process
const { seedTestLRS } = require('../scripts/seed-test-lrs');

if (process.env.LRS_DOMAIN && !process.env.LRS_DOMAIN) {
  process.env.LRS_DOMAIN = process.env.LRS_DOMAIN;
}

// Print LRS configuration for debugging
console.log('LRS_DOMAIN:', process.env.LRS_DOMAIN || process.env.LRS_DOMAIN);
console.log('LRS_USER:', process.env.LRS_USER || process.env.LRS_USER);
console.log('LRS_SECRET:', process.env.LRS_SECRET);
console.log('LRS_SEED:', process.env.LRS_SEED);

function shouldSeed() {
  const flag = process.env.LRS_SEED;
  if (!flag) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(flag.toLowerCase());
}

module.exports = async () => {
  if (!shouldSeed()) {
    console.log('⚠️  LRS_SEED not enabled, skipping LRS seeding step.');
    return;
  }

  console.log('🌱 Seeding deterministic xAPI fixtures before E2E tests...');

  try {
    await seedTestLRS();
  } catch (error) {
    console.error('❌ Failed to seed deterministic LRS data');
    throw error;
  }
};
