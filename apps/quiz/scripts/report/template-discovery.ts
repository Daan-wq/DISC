/**
 * Template Discovery Module
 * Scans src/ folder for profile template folders containing the required 9 HTML pages.
 */

import fs from 'fs'
import path from 'path'

export interface TemplateProfile {
  profileCode: string
  folderPath: string
  htmlDir: string
  htmlFiles: string[]
}

const REQUIRED_HTML_FILES = [
  'publication.html',
  'publication-1.html',
  'publication-2.html',
  'publication-3.html',
  'publication-4.html',
  'publication-5.html',
  'publication-6.html',
  'publication-7.html',
  'publication-8.html',
]

/**
 * Extracts profileCode from folder name.
 * Example: "1 DC Basis profiel plus The Lean Communication" -> "DC"
 */
function extractProfileCode(folderName: string): string | null {
  // Pattern: "1 XX Basis profiel plus The Lean Communication"
  // Where XX is the profile code (1-2 letters)
  const match = folderName.match(/^1\s+([A-Z]{1,2})\s+Basis\s+profiel/i)
  if (match) {
    return match[1].toUpperCase()
  }
  return null
}

/**
 * Checks if a folder contains all required HTML files for a valid template.
 */
function hasRequiredHtmlFiles(htmlDir: string): boolean {
  if (!fs.existsSync(htmlDir)) {
    return false
  }

  for (const file of REQUIRED_HTML_FILES) {
    const filePath = path.join(htmlDir, file)
    if (!fs.existsSync(filePath)) {
      return false
    }
  }

  return true
}

/**
 * Discovers all valid template profiles in the given root directory.
 * 
 * @param rootDir - Root directory to scan (default: process.cwd() + "/src")
 * @returns Array of discovered template profiles
 * @throws Error if no valid profiles are found
 */
export function discoverTemplates(rootDir?: string): TemplateProfile[] {
  const templatesRoot = rootDir || process.env.REPORT_TEMPLATES_SOURCE || path.join(process.cwd(), 'src')
  
  console.log(`[template-discovery] Scanning: ${templatesRoot}`)
  
  if (!fs.existsSync(templatesRoot)) {
    throw new Error(`[template-discovery] Templates root directory not found: ${templatesRoot}`)
  }

  const profiles: TemplateProfile[] = []
  const entries = fs.readdirSync(templatesRoot, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const folderPath = path.join(templatesRoot, entry.name)
    const profileCode = extractProfileCode(entry.name)

    if (!profileCode) {
      // Skip non-profile folders (e.g., Teamgrid folders)
      continue
    }

    // Check for HTML files in publication-web-resources/html
    const htmlDir = path.join(folderPath, 'publication-web-resources', 'html')
    
    if (!hasRequiredHtmlFiles(htmlDir)) {
      console.warn(`[template-discovery] Skipping ${entry.name}: missing required HTML files in ${htmlDir}`)
      continue
    }

    profiles.push({
      profileCode,
      folderPath,
      htmlDir,
      htmlFiles: REQUIRED_HTML_FILES.slice(), // Copy array
    })

    console.log(`[template-discovery] Found profile: ${profileCode} at ${folderPath}`)
  }

  if (profiles.length === 0) {
    throw new Error(`[template-discovery] No valid template profiles found in ${templatesRoot}. ` +
      `Each profile folder must contain publication-web-resources/html/ with all 9 HTML files.`)
  }

  console.log(`[template-discovery] Discovered ${profiles.length} profile(s): ${profiles.map(p => p.profileCode).join(', ')}`)
  
  return profiles
}

/**
 * Gets a specific template profile by code.
 */
export function getTemplateProfile(profileCode: string, rootDir?: string): TemplateProfile | null {
  const profiles = discoverTemplates(rootDir)
  return profiles.find(p => p.profileCode.toUpperCase() === profileCode.toUpperCase()) || null
}

// CLI entry point
if (require.main === module) {
  try {
    const profiles = discoverTemplates()
    console.log('\n=== Template Discovery Results ===')
    for (const profile of profiles) {
      console.log(`\nProfile: ${profile.profileCode}`)
      console.log(`  Folder: ${profile.folderPath}`)
      console.log(`  HTML Dir: ${profile.htmlDir}`)
      console.log(`  Files: ${profile.htmlFiles.length}`)
    }
    console.log(`\nTotal: ${profiles.length} profiles`)
  } catch (error) {
    console.error('Template discovery failed:', error)
    process.exit(1)
  }
}
