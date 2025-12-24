#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Admin Password Hash Verifier ===\n');

const storedHash = process.env.ADMIN_PASSWORD_BCRYPT;

if (!storedHash) {
  console.error('❌ Error: ADMIN_PASSWORD_BCRYPT not found in .env.local');
  rl.close();
  process.exit(1);
}

console.log('Found hash in .env.local:', storedHash.substring(0, 20) + '...\n');

rl.question('Enter the password you want to test: ', (password) => {
  console.log('\n⏳ Verifying...\n');

  const matches = bcrypt.compareSync(password, storedHash);
  
  if (matches) {
    console.log('✅ SUCCESS: Password matches the stored hash!\n');
    console.log('You should be able to log in with this password.\n');
  } else {
    console.log('❌ FAILED: Password does NOT match the stored hash.\n');
    console.log('Either:\n');
    console.log('  1. You are using the wrong password, OR');
    console.log('  2. The hash in .env.local was generated with a different password\n');
    console.log('Run "node scripts/generate-admin-hash.js" to create a new hash.\n');
  }
  
  rl.close();
});
