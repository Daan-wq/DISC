import { promises as fs } from 'fs'
import path from 'path'

/**
 * Load HTML rapport template based on profile code
 * Maps profile codes to the appropriate template folder
 */
export async function loadRapportTemplate(profileCode: string): Promise<string> {
  try {
    // Map profile code to template folder name
    const templateMap: Record<string, string> = {
      'DC': '1 DC Basis profiel plus The Lean Communication',
      'CD': '1 CD Basis profiel plus The Lean Communication',
      'CI': '1 CI Basis profiel plus The Lean Communication',
      'CS': '1 CS Basis profiel plus The Lean Communication',
      'DI': '1 DI Basis profiel plus The Lean Communication',
      'DS': '1 DS Basis profiel plus The Lean Communication',
      'IC': '1 IC Basis profiel plus The Lean Communication',
      'ID': '1 ID Basis profiel plus The Lean Communication',
      'IS': '1 IS Basis profiel plus The Lean Communication',
      'SC': '1 SC Basis profiel plus The Lean Communication',
      'SD': '1 SD Basis profiel plus The Lean Communication',
      'SI': '1 SI Basis profiel plus The Lean Communication'
    }

    const folderName = templateMap[profileCode.toUpperCase()]
    if (!folderName) {
    }

    // Construct path to the HTML template
    const templateBasePath = path.join(
      process.cwd(),
      'Profile rapport templates',
      folderName,
      'publication-web-resources',
      'html',
      'publication.html'
    )

    // Read the HTML template
    const htmlContent = await fs.readFile(templateBasePath, 'utf-8')
    // indexPath removed (unused)
    
    // For Puppeteer, we'll use the full publication.html with its resources
    // We need to ensure CSS and images are accessible
    return htmlContent
  } catch (error) {
    console.error(`Error loading template for profile ${profileCode}:`, error)
    throw new Error(`Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Cache templates in memory for performance
 */
const templateCache = new Map<string, string>()

export async function loadRapportTemplateCached(profileCode: string): Promise<string> {
  const cacheKey = profileCode.toUpperCase()
  
  if (templateCache.has(cacheKey)) {
    return templateCache.get(cacheKey)!
  }
  
  const template = await loadRapportTemplate(profileCode)
  templateCache.set(cacheKey, template)
  
  return template
}
