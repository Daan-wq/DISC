import { generateReportPdf } from '../src/lib/report'
import fs from 'fs'
import path from 'path'

// All possible DISC profile codes
const ALL_PROFILES = [
  // Single dominance (one axis ≥50%, others <50%)
  'D', 'I', 'S', 'C',
  // Double dominance (two axes ≥50%)
  'DI', 'DC', 'DS', 'ID', 'IC', 'IS', 'CD', 'CI', 'CS', 'SD', 'SI', 'SC'
]

/**
 * Generate realistic percentages for a given profile code
 * - For single letters (e.g., 'D'): one axis at 60%, others split the remaining 40%
 * - For double letters (e.g., 'DI'): both at 55%, others at 15%
 */
function generatePercentagesForProfile(profileCode: string) {
  const base = { D: 20, I: 20, S: 20, C: 20 } // Default: all equal at 20%
  
  if (profileCode.length === 1) {
    // Single dominance: primary at 60%, others at ~13.33% each
    const primary = profileCode as 'D' | 'I' | 'S' | 'C'
    base[primary] = 60
    const others = (['D', 'I', 'S', 'C'] as const).filter(k => k !== primary)
    others.forEach(k => base[k] = 13.33)
  } else if (profileCode.length === 2) {
    // Double dominance: both at 55%, others at 15% each
    const first = profileCode[0] as 'D' | 'I' | 'S' | 'C'
    const second = profileCode[1] as 'D' | 'I' | 'S' | 'C'
    base[first] = 55
    base[second] = 55
    const others = (['D', 'I', 'S', 'C'] as const).filter(k => k !== first && k !== second)
    others.forEach(k => base[k] = 15)
  }
  
  // Normalize to ensure sum is ~100% (allow small rounding differences)
  const sum = base.D + base.I + base.S + base.C
  if (Math.abs(sum - 100) > 1) {
    const factor = 100 / sum
    base.D = Math.round(base.D * factor * 100) / 100
    base.I = Math.round(base.I * factor * 100) / 100
    base.S = Math.round(base.S * factor * 100) / 100
    base.C = Math.round(base.C * factor * 100) / 100
  }
  
  return base
}

async function generateAllProfiles() {
  console.log('Starting PDF generation for all DISC profiles...\n')
  
  // 1. Create output directory
  const outputDir = path.join(process.cwd(), 'output', 'all-profiles')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
    console.log(`Created output directory: ${outputDir}\n`)
  }
  
  // 2. Template base path (adjust if needed)
  const templateBasePath = path.join(process.cwd(), 'Profile rapport templates')
  
  // 3. Generate PDFs for each profile
  const results: { profile: string; success: boolean; error?: string }[] = []
  
  for (const profileCode of ALL_PROFILES) {
    console.log(`Generating ${profileCode} profile...`)
    
    try {
      // Create test data for this profile
      const percentages = generatePercentagesForProfile(profileCode)
      
      const placeholderData = {
        candidate: {
          full_name: 'John Pork',
        },
        results: {
          created_at: new Date().toISOString().split('T')[0],
          profile_code: profileCode,
          natural_d: Math.round(percentages.D),
          natural_i: Math.round(percentages.I),
          natural_s: Math.round(percentages.S),
          natural_c: Math.round(percentages.C),
          response_d: Math.round(percentages.D),
          response_i: Math.round(percentages.I),
          response_s: Math.round(percentages.S),
          response_c: Math.round(percentages.C),
        },
      }
      
      const discData = {
        natural: {
          D: percentages.D,
          I: percentages.I,
          S: percentages.S,
          C: percentages.C,
        },
        response: {
          D: percentages.D,
          I: percentages.I,
          S: percentages.S,
          C: percentages.C,
        },
      }
      
      // Generate the PDF using Node-only generator
      const pdfBuffer = await generateReportPdf({
        profileCode,
        fullName: placeholderData.candidate.full_name,
        date: placeholderData.results.created_at,
        styleLabel: profileCode,
        discData,
      })
      
      // Save to file
      const filename = `${profileCode}-profile.pdf`
      const filepath = path.join(outputDir, filename)
      fs.writeFileSync(filepath, pdfBuffer)
      
      console.log(`   Saved: ${filename}`)
      console.log(`   Percentages: D=${percentages.D}%, I=${percentages.I}%, S=${percentages.S}%, C=${percentages.C}%\n`)
      
      results.push({ profile: profileCode, success: true })
    } catch (error: any) {
      console.error(`   Failed: ${error.message}\n`)
      results.push({ profile: profileCode, success: false, error: error.message })
    }
  }
  
  // 4. Summary
  console.log('\n' + '='.repeat(60))
  console.log('GENERATION SUMMARY')
  console.log('='.repeat(60))
  
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  console.log(`Successful: ${successful.length}/${ALL_PROFILES.length}`)
  if (successful.length > 0) {
    console.log(`   Profiles: ${successful.map(r => r.profile).join(', ')}`)
  }
  
  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}/${ALL_PROFILES.length}`)
    failed.forEach(r => {
      console.log(`   - ${r.profile}: ${r.error}`)
    })
  }
  
  console.log(`\nOutput directory: ${outputDir}`)
  console.log('='.repeat(60))
}

// Run the script
generateAllProfiles()
  .then(() => {
    console.log('\nAll done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nFatal error:', error)
    process.exit(1)
  })
