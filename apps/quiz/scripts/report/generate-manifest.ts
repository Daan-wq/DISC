/**
 * Manifest Generation Script
 * 
 * Build-time script that:
 * 1. Lists all generated assets (base PDFs, positions, debug overlays)
 * 2. Calculates file sizes and hashes
 * 3. Creates manifest.json for runtime verification
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { discoverTemplates } from './template-discovery'

export interface ManifestEntry {
  profileCode: string
  basePdf: {
    path: string
    size: number
    hash: string
    pages: number
  } | null
  positions: {
    path: string
    size: number
    hash: string
  } | null
  debugOverlay: {
    path: string
    size: number
  } | null
}

export interface Manifest {
  version: string
  generatedAt: string
  templateVersion: string
  profiles: ManifestEntry[]
  summary: {
    totalProfiles: number
    basePdfsGenerated: number
    positionsExtracted: number
    debugOverlaysCreated: number
  }
}

/**
 * Calculate MD5 hash of a file.
 */
function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Get page count from PDF (simple check via pdf-lib).
 */
async function getPdfPageCount(filePath: string): Promise<number> {
  try {
    const { PDFDocument } = await import('pdf-lib')
    const bytes = fs.readFileSync(filePath)
    const doc = await PDFDocument.load(bytes)
    return doc.getPageCount()
  } catch {
    return 0
  }
}

/**
 * Main function to generate manifest.
 */
async function main() {
  console.log('=== Manifest Generation ===\n')

  // Discover templates
  const profiles = discoverTemplates()
  console.log(`Found ${profiles.length} profiles`)

  // Asset directories
  const assetsDir = path.join(process.cwd(), 'assets', 'report')
  const basePdfDir = path.join(assetsDir, 'base-pdf')
  const positionsDir = path.join(assetsDir, 'positions')
  const debugDir = path.join(assetsDir, 'debug')

  const entries: ManifestEntry[] = []
  let basePdfsGenerated = 0
  let positionsExtracted = 0
  let debugOverlaysCreated = 0

  for (const profile of profiles) {
    const entry: ManifestEntry = {
      profileCode: profile.profileCode,
      basePdf: null,
      positions: null,
      debugOverlay: null,
    }

    // Check base PDF
    const basePdfPath = path.join(basePdfDir, `${profile.profileCode}.pdf`)
    if (fs.existsSync(basePdfPath)) {
      const stats = fs.statSync(basePdfPath)
      const pages = await getPdfPageCount(basePdfPath)
      entry.basePdf = {
        path: `base-pdf/${profile.profileCode}.pdf`,
        size: stats.size,
        hash: hashFile(basePdfPath),
        pages,
      }
      basePdfsGenerated++
      console.log(`  [${profile.profileCode}] Base PDF: ${stats.size} bytes, ${pages} pages`)
    }

    // Check positions
    const positionsPath = path.join(positionsDir, `${profile.profileCode}.json`)
    if (fs.existsSync(positionsPath)) {
      const stats = fs.statSync(positionsPath)
      entry.positions = {
        path: `positions/${profile.profileCode}.json`,
        size: stats.size,
        hash: hashFile(positionsPath),
      }
      positionsExtracted++
      console.log(`  [${profile.profileCode}] Positions: ${stats.size} bytes`)
    }

    // Check debug overlay
    const debugPath = path.join(debugDir, `${profile.profileCode}.overlay.pdf`)
    if (fs.existsSync(debugPath)) {
      const stats = fs.statSync(debugPath)
      entry.debugOverlay = {
        path: `debug/${profile.profileCode}.overlay.pdf`,
        size: stats.size,
      }
      debugOverlaysCreated++
    }

    entries.push(entry)
  }

  // Create manifest
  const manifest: Manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    templateVersion: new Date().toISOString().split('T')[0],
    profiles: entries,
    summary: {
      totalProfiles: profiles.length,
      basePdfsGenerated,
      positionsExtracted,
      debugOverlaysCreated,
    },
  }

  // Save manifest
  const manifestPath = path.join(assetsDir, 'manifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  console.log('\n=== Manifest Generation Complete ===')
  console.log(`Saved: ${manifestPath}`)
  console.log(`\nSummary:`)
  console.log(`  - Profiles: ${manifest.summary.totalProfiles}`)
  console.log(`  - Base PDFs: ${manifest.summary.basePdfsGenerated}`)
  console.log(`  - Positions: ${manifest.summary.positionsExtracted}`)
  console.log(`  - Debug Overlays: ${manifest.summary.debugOverlaysCreated}`)

  // Validation warnings
  if (basePdfsGenerated < profiles.length) {
    console.warn(`\nWarning: ${profiles.length - basePdfsGenerated} profiles missing base PDFs`)
  }
  if (positionsExtracted < profiles.length) {
    console.warn(`Warning: ${profiles.length - positionsExtracted} profiles missing positions`)
  }

  return manifest
}

// CLI entry point
if (require.main === module) {
  main().catch((err) => {
    console.error('Manifest generation failed:', err)
    process.exit(1)
  })
}

export { main as generateManifest }
