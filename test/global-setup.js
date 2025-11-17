'use strict';

// Reuse the deterministic seeding helper without spawning a child process
const { seedTestLRS } = require('../scripts/seed-test-lrs');

function shouldSkipSeeding() {
  const flag = process.env.SKIP_LRS_SEED;
  if (!flag) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(flag.toLowerCase());
}

module.exports = async () => {
  if (shouldSkipSeeding()) {
    console.log('⚠️  SKIP_LRS_SEED detected, skipping LRS seeding step.');
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
