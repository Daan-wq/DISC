// Script to generate bcrypt hash for admin passwords
const bcrypt = require('bcryptjs')

const passwords = [
  { email: 'info@echooo.nl', password: process.env.ADMIN_PASSWORD || 'default' },
  { email: 'Daan0529@icloud.com', password: 'PfawDwetbpankgnz0fsu' }
]

async function hashPasswords() {
  console.log('Generating bcrypt hashes...\n')
  
  for (const { email, password } of passwords) {
    const hash = await bcrypt.hash(password, 12)
    console.log(`Email: ${email}`)
    console.log(`Hash: ${hash}\n`)
  }
}

hashPasswords().catch(console.error)
