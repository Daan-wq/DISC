/**
 * Download PT Sans fonts from Google Fonts
 * Run once to setup fonts for PDF generation
 */

import fs from 'fs'
import path from 'path'
import https from 'https'

const FONTS_DIR = path.join(process.cwd(), 'assets/report/fonts')

// Font URLs from Google Fonts and Adobe Fonts
const FONT_URLS = {
  // PT Sans from Google Fonts
  'PTSans-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/ptsans/PTSans-Regular.ttf',
  'PTSans-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/ptsans/PTSans-Bold.ttf',
  'PTSans-Italic.ttf': 'https://github.com/google/fonts/raw/main/ofl/ptsans/PTSans-Italic.ttf',
  'PTSans-BoldItalic.ttf': 'https://github.com/google/fonts/raw/main/ofl/ptsans/PTSans-BoldItalic.ttf',
  
  // Minion Pro alternatives (using Source Serif Pro as free alternative)
  // Minion Pro is Adobe proprietary, so we use Source Serif Pro which has similar characteristics
  'MinionPro-Regular.otf': 'https://github.com/adobe-fonts/source-serif/raw/release/OTF/SourceSerif4-Regular.otf',
  'MinionPro-Bold.otf': 'https://github.com/adobe-fonts/source-serif/raw/release/OTF/SourceSerif4-Bold.otf',
  'MinionPro-Italic.otf': 'https://github.com/adobe-fonts/source-serif/raw/release/OTF/SourceSerif4-It.otf',
  'MinionPro-BoldItalic.otf': 'https://github.com/adobe-fonts/source-serif/raw/release/OTF/SourceSerif4-BoldIt.otf',
}

async function downloadFont(url: string, filename: string): Promise<void> {
  const filepath = path.join(FONTS_DIR, filename)
  
  // Skip if already exists
  if (fs.existsSync(filepath)) {
    console.log(`  [skip] ${filename} already exists`)
    return
  }

  return new Promise((resolve, reject) => {
    console.log(`  [download] ${filename}...`)
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location!, (redirectResponse) => {
          const file = fs.createWriteStream(filepath)
          redirectResponse.pipe(file)
          file.on('finish', () => {
            file.close()
            console.log(`  [done] ${filename}`)
            resolve()
          })
        }).on('error', reject)
      } else {
        const file = fs.createWriteStream(filepath)
        response.pipe(file)
        file.on('finish', () => {
          file.close()
          console.log(`  [done] ${filename}`)
          resolve()
        })
      }
    }).on('error', reject)
  })
}

async function main() {
  console.log('[download-fonts] Starting font download...')
  
  // Ensure fonts directory exists
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true })
    console.log(`[download-fonts] Created directory: ${FONTS_DIR}`)
  }

  // Download all fonts
  for (const [filename, url] of Object.entries(FONT_URLS)) {
    try {
      await downloadFont(url, filename)
    } catch (error) {
      console.error(`[download-fonts] Failed to download ${filename}:`, error)
    }
  }

  console.log('[download-fonts] Font download complete!')
}

main().catch(console.error)
