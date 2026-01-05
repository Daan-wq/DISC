import { generateReportPdf } from '../src/lib/report'
import fs from 'fs'
import path from 'path'

/**
 * Generate a single DISC profile PDF with detailed error logging
 * Usage: tsx scripts/generate-single-profile.ts <PROFILE_CODE>
 * Example: tsx scripts/generate-single-profile.ts D
 */

const profileCode = process.argv[2]?.toUpperCase()

if (!profileCode) {
  console.error('Error: Please provide a profile code')
  console.error('Usage: tsx scripts/generate-single-profile.ts <PROFILE_CODE>')
  console.error('Example: tsx scripts/generate-single-profile.ts D')
  console.error('\nValid codes: D, I, S, C, DI, DC, DS, ID, IC, IS, CD, CI, CS, SD, SI, SC')
  process.exit(1)
}

const VALID_PROFILES = ['D', 'I', 'S', 'C', 'DI', 'DC', 'DS', 'ID', 'IC', 'IS', 'CD', 'CI', 'CS', 'SD', 'SI', 'SC']

if (!VALID_PROFILES.includes(profileCode)) {
  console.error(`Error: Invalid profile code "${profileCode}"`)
  console.error(`Valid codes: ${VALID_PROFILES.join(', ')}`)
  process.exit(1)
}

/**
 * Generate percentages for a profile (same logic as before)
 */
function generatePercentagesForProfile(code: string) {
  const base = { D: 20, I: 20, S: 20, C: 20 }

  if (code.length === 1) {
    const primary = code as 'D' | 'I' | 'S' | 'C'
    base[primary] = 60
    const others = (['D', 'I', 'S', 'C'] as const).filter(k => k !== primary)
    others.forEach(k => base[k] = 13.33)
  } else if (code.length === 2) {
    const first = code[0] as 'D' | 'I' | 'S' | 'C'
    const second = code[1] as 'D' | 'I' | 'S' | 'C'
    base[first] = 55
    base[second] = 55
    const others = (['D', 'I', 'S', 'C'] as const).filter(k => k !== first && k !== second)
    others.forEach(k => base[k] = 15)
  }

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

async function generateSingleProfile() {
  console.log(`\nGenerating ${profileCode} profile PDF...`)
  console.log('=' .repeat(60))

  try {
    // 1. Create output directory
    const outputDir = path.join(process.cwd(), 'output', 'all-profiles')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log(`Created output directory: ${outputDir}`)
    }

    // 2. Template base path
    const templateBasePath = path.join(process.cwd(), 'Profile rapport templates')
    console.log(`Template base path: ${templateBasePath}`)

    // 3. Generate test data
    const percentages = generatePercentagesForProfile(profileCode)
    console.log('Generated percentages:')
    console.log(`   D: ${percentages.D}%`)
    console.log(`   I: ${percentages.I}%`)
    console.log(`   S: ${percentages.S}%`)
    console.log(`   C: ${percentages.C}%`)
    console.log(`   Total: ${percentages.D + percentages.I + percentages.S + percentages.C}%`)

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

    console.log('\nGenerating PDF...')

    // 4. Generate the PDF using Node-only generator
    const pdfBuffer = await generateReportPdf({
      profileCode,
      fullName: placeholderData.candidate.full_name,
      date: placeholderData.results.created_at,
      styleLabel: profileCode,
      discData,
    })

    // 5. Save to file
    const filename = `${profileCode}-profile.pdf`
    const filepath = path.join(outputDir, filename)
    fs.writeFileSync(filepath, pdfBuffer)

    console.log('\nSUCCESS!')
    console.log(`File saved: ${filename}`)
    console.log(`Full path: ${filepath}`)
    console.log(`File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`)
    console.log('=' .repeat(60))

  } catch (error: any) {
    console.error('\nGENERATION FAILED')
    console.error('=' .repeat(60))
    console.error(`Error Type: ${error.constructor.name}`)
    console.error(`Error Message: ${error.message}`)

    if (error.stack) {
      console.error(`\nStack Trace:`)
      console.error(error.stack)
    }

    console.error('=' .repeat(60))
    console.error('\nERROR ANALYSIS:')

    if (error.message.includes('__name is not defined')) {
      console.error(`\nThe "__name is not defined" error typically means:`)
      console.error(`1. JavaScript code in the browser is trying to access a Python-like variable`)
      console.error(`2. A bundler/transpiler is incorrectly processing the code`)
      console.error(`3. There's a conflict between Puppeteer's serialization and the code being evaluated`)
      console.error(`\nThis error is occurring in the Puppeteer page.evaluate() context.`)
      console.error(`The code runs in a headless Chrome browser, which should only have JavaScript.`)
      console.error(`\nLikely cause: Puppeteer trying to serialize a complex object (like a Promise)`)
      console.error(`that contains internal references using "__name" property.`)
    }

    process.exit(1)
  }
}

// Run
generateSingleProfile()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nUnexpected error:', error)
    process.exit(1)
  })
