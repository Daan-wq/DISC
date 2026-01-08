/**
 * SVG to PNG conversion using svg2png-wasm
 * 
 * Pure WASM implementation that works on Vercel without native dependencies.
 * Uses singleton pattern for efficient WASM initialization.
 */

let wasmPath: string | null = null

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
  void svgString
  void options
  throw new Error(
    '[svg-to-png] Legacy svg2png-wasm conversion has been removed (report overlay generator removed).'
  )
}

/**
 * Get the path where WASM was loaded from (for debugging).
 */
export function getWasmPath(): string | null {
  return wasmPath
}
