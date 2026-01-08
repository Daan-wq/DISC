/**
 * Build All Script (Orchestrator)
 * 
 * Orchestrates the complete report asset build pipeline:
 * 1. Template discovery
 * 2. Generate base PDFs
 * 3. Extract positions
 * 4. Create debug overlays
 * 5. Generate manifest
 * 
 * Run with: pnpm run report:build
 */

import { discoverTemplates } from './template-discovery'
import { generateAllBasePdfs } from './generate-base-pdfs'
import { extractAllPositions } from './extract-positions'
import { createAllDebugOverlays } from './debug-overlay'
import { generateManifest } from './generate-manifest'

async function main() {
  const startTime = Date.now()
  
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║           REPORT ASSET BUILD PIPELINE                      ║')
  console.log('╚════════════════════════════════════════════════════════════╝')
  console.log()

  try {
    // Step 1: Discover templates
    console.log('┌────────────────────────────────────────────────────────────┐')
    console.log('│ STEP 1: Template Discovery                                 │')
    console.log('└────────────────────────────────────────────────────────────┘')
    const profiles = discoverTemplates()
    console.log(`\nDiscovered ${profiles.length} profiles\n`)

    // Step 2: Generate base PDFs
    console.log('┌────────────────────────────────────────────────────────────┐')
    console.log('│ STEP 2: Generate Base PDFs                                 │')
    console.log('└────────────────────────────────────────────────────────────┘')
    const basePdfs = await generateAllBasePdfs()
    console.log(`\nGenerated ${basePdfs.length} base PDFs\n`)

    // Step 3: Extract positions
    console.log('┌────────────────────────────────────────────────────────────┐')
    console.log('│ STEP 3: Extract Positions                                  │')
    console.log('└────────────────────────────────────────────────────────────┘')
    const positions = await extractAllPositions()
    console.log(`\nExtracted positions for ${positions.length} profiles\n`)

    // Step 4: Create debug overlays
    console.log('┌────────────────────────────────────────────────────────────┐')
    console.log('│ STEP 4: Create Debug Overlays                              │')
    console.log('└────────────────────────────────────────────────────────────┘')
    await createAllDebugOverlays()
    console.log(`\nDebug overlays created\n`)

    // Step 5: Generate manifest
    console.log('┌────────────────────────────────────────────────────────────┐')
    console.log('│ STEP 5: Generate Manifest                                  │')
    console.log('└────────────────────────────────────────────────────────────┘')
    const manifest = await generateManifest()
    console.log(`\nManifest generated\n`)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║                    BUILD COMPLETE                          ║')
    console.log('╚════════════════════════════════════════════════════════════╝')
    console.log()
    console.log(`  Total time: ${elapsed}s`)
    console.log(`  Profiles: ${manifest.summary.totalProfiles}`)
    console.log(`  Base PDFs: ${manifest.summary.basePdfsGenerated}`)
    console.log(`  Positions: ${manifest.summary.positionsExtracted}`)
    console.log(`  Debug Overlays: ${manifest.summary.debugOverlaysCreated}`)
    console.log()
    console.log('  Assets saved to: assets/report/')
    console.log('    - base-pdf/<profileCode>.pdf')
    console.log('    - positions/<profileCode>.json')
    console.log('    - debug/<profileCode>.overlay.pdf')
    console.log('    - manifest.json')
    console.log()

  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════════╗')
    console.error('║                    BUILD FAILED                            ║')
    console.error('╚════════════════════════════════════════════════════════════╝')
    console.error('\nError:', error)
    process.exit(1)
  }
}

// CLI entry point
main()
