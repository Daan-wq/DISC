// Seed admin users into database
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedAdmins() {
  console.log('🔐 Seeding admin users...\n')

  const admins = [
    {
      email: 'info@echooo.nl',
      password: process.env.ADMIN_PASSWORD || 'changeme'
    },
    {
      email: 'daan0529@icloud.com',
      password: 'PfawDwetbpankgnz0fsu'
    }
  ]

  for (const admin of admins) {
    console.log(`Processing ${admin.email}...`)
    
    // Generate bcrypt hash
    const passwordHash = await bcrypt.hash(admin.password, 12)
    
    // Insert or update admin
    const { data, error } = await supabase
      .from('admin_users')
      .upsert({
        email: admin.email.toLowerCase(),
        password_hash: passwordHash,
        totp_enabled: false // Will be enabled after first login
      }, {
        onConflict: 'email'
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ Error for ${admin.email}:`, error)
    } else {
      console.log(`✅ ${admin.email} added/updated`)
    }
  }

  console.log('\n✨ Done!')
}

seedAdmins().catch(console.error)
