/**
 * Embed Excel Config Script
 * 
 * This script reads analysis/excel_parity/excel_config.json and embeds it
 * into src/lib/disc/excel_config_embedded.ts as a TypeScript constant.
 * 
 * This ensures the config is available at build time and doesn't require
 * file I/O at runtime.
 * 
 * Usage: npx tsx scripts/embed-excel-config.ts
 */

import fs from 'fs'
import path from 'path'

const CONFIG_SOURCE = path.resolve(__dirname, '../analysis/excel_parity/excel_config.json')
const CONFIG_DEST = path.resolve(__dirname, '../src/lib/disc/excel_config_embedded.ts')

async function embedConfig() {
  try {
    // Read the JSON config
    if (!fs.existsSync(CONFIG_SOURCE)) {
      console.error(`Config file not found: ${CONFIG_SOURCE}`)
      process.exit(1)
    }

    const configJson = fs.readFileSync(CONFIG_SOURCE, 'utf-8')
    const config = JSON.parse(configJson)

    // Generate TypeScript file
    const tsContent = `/**
 * Embedded Excel Config - Loaded at build time
 * 
 * This file is auto-generated from analysis/excel_parity/excel_config.json
 * by the embed-excel-config script. Do not edit manually.
 * 
 * To update this file, run: npm run embed-excel-config
 */

import type { ExcelConfig } from './types'

// Embedded config - no file I/O needed at runtime
export const EMBEDDED_EXCEL_CONFIG: ExcelConfig = ${JSON.stringify(config, null, 2)}

/**
 * Get the embedded Excel config
 * This is the preferred way to access the config - no file I/O needed
 */
export function getEmbeddedConfig(): ExcelConfig {
  return EMBEDDED_EXCEL_CONFIG
}
`

    // Write the TypeScript file
    fs.writeFileSync(CONFIG_DEST, tsContent, 'utf-8')
    console.log(`Embedded config written to: ${CONFIG_DEST}`)
    console.log(`   Config size: ${Math.round(configJson.length / 1024)}KB`)
  } catch (error) {
    console.error('Failed to embed config:', error)
    process.exit(1)
  }
}

embedConfig()
