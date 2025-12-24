/**
 * SVG to PNG conversion using svg2png-wasm
 * 
 * Pure WASM implementation that works on Vercel without native dependencies.
 * Uses singleton pattern for efficient WASM initialization.
 */

import fs from 'fs'
import path from 'path'

// Lazy import for svg2png-wasm types
type Svg2pngType = typeof import('svg2png-wasm')

// Singleton state for WASM initialization
let initPromise: Promise<void> | null = null
let svg2pngModule: Svg2pngType | null = null
let wasmPath: string | null = null

/**
 * Resolves the path to the WASM file.
 * Tries multiple locations for different environments.
 */
function resolveWasmPath(): string {
  const candidates = [
    // Production: copied to assets/vendor during build
    path.join(process.cwd(), 'assets', 'vendor', 'svg2png_wasm_bg.wasm'),
    // Monorepo production
    path.join(process.cwd(), 'apps', 'quiz', 'assets', 'vendor', 'svg2png_wasm_bg.wasm'),
    // Development: direct from node_modules
    path.join(process.cwd(), 'node_modules', 'svg2png-wasm', 'svg2png_wasm_bg.wasm'),
    // Monorepo development
    path.join(process.cwd(), 'apps', 'quiz', 'node_modules', 'svg2png-wasm', 'svg2png_wasm_bg.wasm'),
    // Hoisted node_modules in monorepo
    path.join(process.cwd(), '..', '..', 'node_modules', 'svg2png-wasm', 'svg2png_wasm_bg.wasm'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `[svg-to-png] WASM file not found. Tried:\n${candidates.join('\n')}\n` +
    `Run 'npm run prebuild' or ensure svg2png-wasm is installed.`
  )
}

/**
 * Initializes the svg2png-wasm module (singleton, lazy).
 * Safe for concurrent calls - only initializes once.
 */
async function ensureInitialized(): Promise<Svg2pngType> {
  if (svg2pngModule) {
    return svg2pngModule
  }

  if (!initPromise) {
    initPromise = (async () => {
      const resolvedPath = resolveWasmPath()
      wasmPath = resolvedPath
      
      console.log(`[svg-to-png] Initializing svg2png-wasm from: ${resolvedPath}`)
      
      // Read WASM bytes
      const wasmBytes = fs.readFileSync(resolvedPath)
      
      // Dynamic import to avoid bundler issues
      const mod = await import('svg2png-wasm')
      
      // Initialize with WASM bytes
      await mod.initialize(wasmBytes)
      
      svg2pngModule = mod
      console.log(`[svg-to-png] Initialized svg2png-wasm successfully`)
    })()
  }

  await initPromise
  return svg2pngModule!
}

/**
 * Convert SVG string to PNG buffer.
 * 
 * @param svgString - The SVG content as a string
 * @param options - Conversion options
 * @returns PNG image as Buffer
 */
export async function svgToPng(
  svgString: string,
  options: {
    width?: number
    height?: number
    backgroundColor?: string
  } = {}
): Promise<Buffer> {
  const startTime = Date.now()
  
  const mod = await ensureInitialized()
  
  // Convert SVG to PNG
  const pngData = await mod.svg2png(svgString, {
    width: options.width,
    height: options.height,
    backgroundColor: options.backgroundColor || 'white',
  })
  
  const elapsed = Date.now() - startTime
  console.log(`[svg-to-png] Converted SVG to PNG in ${elapsed}ms (${pngData.byteLength} bytes)`)
  
  return Buffer.from(pngData)
}

/**
 * Get the path where WASM was loaded from (for debugging).
 */
export function getWasmPath(): string | null {
  return wasmPath
}
