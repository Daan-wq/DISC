/**
 * Copies svg2png-wasm WASM file to assets/vendor for Vercel deployment.
 * 
 * Run this as a prebuild step to ensure the WASM file is available
 * without needing network access at runtime.
 */

import fs from 'fs'
import path from 'path'

const WASM_FILENAME = 'svg2png_wasm_bg.wasm'

function findWasmSource(): string {
  const candidates = [
    // Local node_modules
    path.join(process.cwd(), 'node_modules', 'svg2png-wasm', WASM_FILENAME),
    // Hoisted in monorepo
    path.join(process.cwd(), '..', '..', 'node_modules', 'svg2png-wasm', WASM_FILENAME),
    // Root of quiz-interface
    path.join(process.cwd(), '..', 'node_modules', 'svg2png-wasm', WASM_FILENAME),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `Could not find ${WASM_FILENAME} in node_modules.\n` +
    `Tried:\n${candidates.join('\n')}\n` +
    `Make sure svg2png-wasm is installed: pnpm add svg2png-wasm`
  )
}

function main() {
  console.log('[copy-wasm] Copying svg2png-wasm WASM file...')

  // Find source
  const sourcePath = findWasmSource()
  console.log(`[copy-wasm] Found WASM at: ${sourcePath}`)

  // Create destination directory
  const destDir = path.join(process.cwd(), 'assets', 'vendor')
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
    console.log(`[copy-wasm] Created directory: ${destDir}`)
  }

  // Copy file
  const destPath = path.join(destDir, WASM_FILENAME)
  fs.copyFileSync(sourcePath, destPath)
  
  const stats = fs.statSync(destPath)
  console.log(`[copy-wasm] Copied to: ${destPath} (${(stats.size / 1024).toFixed(1)} KB)`)
  console.log('[copy-wasm] Done!')
}

main()
