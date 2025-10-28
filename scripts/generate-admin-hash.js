#!/usr/bin/env node

const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== Admin Password Hash Generator ===\n');

rl.question('Enter your admin password: ', (password) => {
  if (!password || password.length < 8) {
    console.error('\n❌ Error: Password must be at least 8 characters long');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳ Generating bcrypt hash (this takes a few seconds)...\n');

  const hash = bcrypt.hashSync(password, 12);
  
  console.log('✅ Hash generated successfully!\n');
  console.log('Copy this hash and paste it in your .env.local file:\n');
  console.log('ADMIN_PASSWORD_BCRYPT=' + hash);
  console.log('\n');
  
  // Verify the hash works
  const verified = bcrypt.compareSync(password, hash);
  if (verified) {
    console.log('✅ Verification: Hash is valid and matches your password\n');
  } else {
    console.log('❌ Warning: Hash verification failed (this should not happen)\n');
  }
  
  rl.close();
});
