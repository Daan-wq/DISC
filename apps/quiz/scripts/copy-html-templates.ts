/**
 * Script to copy HTML report templates from the original location to public/report-templates/
 * Each profile gets a clean folder name (e.g., D, DI, SC, etc.)
 * 
 * Run: pnpm --filter quiz tsx scripts/copy-html-templates.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Source folder containing all original templates
// Located at: C:\Users\Daant\Documents\Windsurf projects\DISC\Disc profielen origineel
const SOURCE_ROOT = path.resolve(__dirname, '../../../../../Disc profielen origineel')

// Fonts used by the original templates (copied from repo assets)
const SOURCE_FONTS_DIR = path.resolve(__dirname, '../assets/report/fonts')
const REQUIRED_FONT_FILES = [
  'MinionPro-Bold.otf',
  'MinionPro-BoldItalic.otf',
  'MinionPro-Italic.otf',
  'MinionPro-Regular.otf',
  'PTSans-Bold.ttf',
  'PTSans-BoldItalic.ttf',
  'PTSans-Italic.ttf',
  'PTSans-Regular.ttf',
] as const

// Destination folder in public
const DEST_ROOT = path.resolve(__dirname, '../public/report-templates')

// Mapping of profile codes to their source folder names
// The folder names have slight variations so we map them explicitly
const PROFILE_FOLDER_MAP: Record<string, string> = {
  'C': '1 C Basis profiel plus The Lean Communication',
  'CD': '1 CD Basis profiel plus The Lean Communication',
  'CI': '1 CI Basis profiel plus The Lean Communication',
  'CS': '1 CS Basis profiel plus The Lean Communication',
  'D': '1 D Basis profiel plus The Lean Communication-1',
  'DC': '1 DC Basis profiel plus The Lean Communication',
  'DI': '1 DI Basis profiel plus The Lean Communication',
  'DS': '1 DS Basis profiel plus The Lean Communication-1',
  'I': '1 I Basis profiel plus The Lean Communication',
  'IC': '1 IC Basis profiel plus The Lean Communication',
  'ID': '1 ID Basis profiel plusThe Lean Communication', // Note: missing space in original
  'IS': '1 IS Basis profiel plus The Lean Communication',
  'S': '1 S Basis profiel plus The Lean Communication',
  'SC': '1 SC Basis profiel plus The Lean Communication',
  'SD': '1 SD Basis profiel plus The Lean Communication',
  'SI': '1 SI Basis profiel plus The Lean Communication',
}

function isHtmlDisguisedAsFont(buf: Buffer): boolean {
  const prefix = buf.toString('utf8', 0, 256).trimStart()
  return (
    prefix.startsWith('<!DOCTYPE') ||
    prefix.startsWith('<!doctype') ||
    prefix.startsWith('<html') ||
    prefix.startsWith('<HTML')
  )
}

function isValidFontHeader(buf: Buffer, fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase()
  const magicAscii = buf.slice(0, 4).toString('ascii')

  if (ext === '.otf') {
    return magicAscii === 'OTTO'
  }

  if (ext === '.ttf') {
    const isTrueType = buf.length >= 4 && buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00
    return isTrueType || magicAscii === 'true' || magicAscii === 'typ1' || magicAscii === 'ttcf'
  }

  return false
}

function copyFolderRecursive(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    console.error(`[ERROR] Source folder does not exist: ${src}`)
    return
  }

  // Create destination folder
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyFolderRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function copyRequiredFonts(destTemplateFolder: string): void {
  if (!fs.existsSync(SOURCE_FONTS_DIR)) {
    console.error(`[ERROR] Fonts source folder not found: ${SOURCE_FONTS_DIR}`)
    return
  }

  const destFontsDir = path.join(destTemplateFolder, 'font')
  if (!fs.existsSync(destFontsDir)) {
    fs.mkdirSync(destFontsDir, { recursive: true })
  }

  for (const file of REQUIRED_FONT_FILES) {
    const srcFontPath = path.join(SOURCE_FONTS_DIR, file)
    const destFontPath = path.join(destFontsDir, file)

    if (!fs.existsSync(srcFontPath)) {
      console.error(`[ERROR] Required font file missing: ${srcFontPath}`)
      continue
    }

    const buf = fs.readFileSync(srcFontPath)
    if (isHtmlDisguisedAsFont(buf) || !isValidFontHeader(buf, file)) {
      console.error(`[ERROR] Invalid font file detected: ${srcFontPath}`)
      console.error('[ERROR] Dit bestand lijkt geen geldige .ttf/.otf te zijn (mogelijk HTML per ongeluk gedownload).')
      process.exit(1)
    }

    fs.copyFileSync(srcFontPath, destFontPath)
  }
}

interface TemplateManifest {
  generatedAt: string
  templates: Array<{
    profileCode: string
    sourceFolderName: string
    publicBasePath: string
  }>
}

function generateManifest(copiedTemplates: Array<{ profileCode: string; folderName: string }>): void {
  const manifest: TemplateManifest = {
    generatedAt: new Date().toISOString(),
    templates: copiedTemplates.map(({ profileCode, folderName }) => ({
      profileCode,
      sourceFolderName: folderName,
      publicBasePath: `/report-templates/${profileCode}`,
    })),
  }

  const manifestPath = path.join(DEST_ROOT, 'manifest.json')

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    console.log('[copy-html-templates] Generated manifest at:', manifestPath)
  } catch (err) {
    console.error('[ERROR] Failed to write manifest.json:', err)
    process.exit(1)
  }
}

function main(): void {
  console.log('[copy-html-templates] Starting template copy...')
  console.log(`[copy-html-templates] Source: ${SOURCE_ROOT}`)
  console.log(`[copy-html-templates] Destination: ${DEST_ROOT}`)

  // Check source exists
  if (!fs.existsSync(SOURCE_ROOT)) {
    console.error(`[ERROR] Source folder not found: ${SOURCE_ROOT}`)
    console.error('[ERROR] Make sure "Disc profielen origineel" folder exists at the expected location.')
    process.exit(1)
  }

  // Clean destination folder if exists
  if (fs.existsSync(DEST_ROOT)) {
    console.log('[copy-html-templates] Cleaning existing destination folder...')
    fs.rmSync(DEST_ROOT, { recursive: true, force: true })
  }

  // Create destination folder
  fs.mkdirSync(DEST_ROOT, { recursive: true })

  let successCount = 0
  let failCount = 0
  const copiedTemplates: Array<{ profileCode: string; folderName: string }> = []

  for (const [profileCode, folderName] of Object.entries(PROFILE_FOLDER_MAP)) {
    const srcPath = path.join(SOURCE_ROOT, folderName)
    const destPath = path.join(DEST_ROOT, profileCode)

    if (!fs.existsSync(srcPath)) {
      console.error(`[ERROR] Template folder not found for ${profileCode}: ${srcPath}`)
      failCount++
      continue
    }

    console.log(`[copy-html-templates] Copying ${profileCode}...`)
    copyFolderRecursive(srcPath, destPath)
    copyRequiredFonts(destPath)
    copiedTemplates.push({ profileCode, folderName })
    successCount++
  }

  console.log('')
  console.log('[copy-html-templates] Done!')
  console.log(`[copy-html-templates] Success: ${successCount}, Failed: ${failCount}`)

  if (successCount > 0) {
    generateManifest(copiedTemplates)
  }

  console.log('')
  console.log('[copy-html-templates] Templates available at:')
  console.log(`  /report-templates/<PROFILE>/index.html`)
  console.log('  Example: /report-templates/D/index.html')
}

main()
