/**
 * Template Registry for HTML-based DISC report templates
 * Maps profile codes to their template URLs
 */

// All valid DISC profile codes (single and double letter combinations)
export const VALID_PROFILE_CODES = [
  'C', 'CD', 'CI', 'CS',
  'D', 'DC', 'DI', 'DS',
  'I', 'IC', 'ID', 'IS',
  'S', 'SC', 'SD', 'SI',
] as const

export type ProfileCode = typeof VALID_PROFILE_CODES[number]

/**
 * Check if a string is a valid profile code
 */
export function isValidProfileCode(code: string): code is ProfileCode {
  return VALID_PROFILE_CODES.includes(code as ProfileCode)
}

/**
 * Normalize a profile code (uppercase, trim)
 */
export function normalizeProfileCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * Get the URL for a profile's HTML template
 * Returns null if the profile code is invalid
 * 
 * @param profileCode - The DISC profile code (e.g., 'D', 'DI', 'SC')
 * @returns The URL path to the template's index.html, or null if invalid
 */
export function getTemplateUrl(profileCode: string): string | null {
  const normalized = normalizeProfileCode(profileCode)
  
  if (!isValidProfileCode(normalized)) {
    console.warn(`[template-registry] Invalid profile code: ${profileCode}`)
    return null
  }
  
  // Templates are served from public/report-templates/<PROFILE>/index.html
  return `/report-templates/${normalized}/index.html`
}

/**
 * Get the base path for a profile's template folder
 * Useful for loading assets relative to the template
 */
export function getTemplateBasePath(profileCode: string): string | null {
  const normalized = normalizeProfileCode(profileCode)
  
  if (!isValidProfileCode(normalized)) {
    return null
  }
  
  return `/report-templates/${normalized}`
}

/**
 * Check if a template exists for the given profile code
 * Note: This only checks if the code is valid, not if files exist on disk
 * File existence should be verified at build/deploy time
 */
export function hasTemplate(profileCode: string): boolean {
  const normalized = normalizeProfileCode(profileCode)
  return isValidProfileCode(normalized)
}
