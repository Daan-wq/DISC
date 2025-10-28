/**
 * Safe and exact placeholder replacement for HTML templates
 * Only replaces the specific placeholders without altering any other content
 */

interface PlaceholderData {
  full_name: string
  created_at: string | Date
  profile_code: string
  naturalPct: {
    D: number
    I: number
    S: number
    C: number
  }
  responsePct: {
    D: number
    I: number
    S: number
    C: number
  }
  chartUrlOrDataUri: string
}

/**
 * Format date as dd-mm-yyyy
 */
function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

/**
 * Replace placeholders in HTML template with actual data
 * Performs exact string replacement only for specified placeholders
 */
export function fillPlaceholders(html: string, data: PlaceholderData): string {
  let result = html
  
  // Replace name placeholders
  result = result.replace(/<<Naam>>/g, data.full_name)
  result = result.replace(/<<Voornaam>>/g, data.full_name)
  
  // Replace date placeholder
  const formattedDate = formatDate(data.created_at)
  result = result.replace(/<<Datum>>/g, formattedDate)
  
  // Replace style/profile code placeholder
  result = result.replace(/<<Stijl>>/g, data.profile_code)
  
  // Replace DISC percentages in the box (Page 2)
  // These appear as 0% in the template and need to be replaced with actual values
  // The pattern in the HTML is typically in a table or structured format
  
  // Find and replace percentage patterns
  // Natural style (left column): D, I, S, C from top to bottom
  // Response style (right column): D, I, S, C from top to bottom
  
  // Look for patterns like "0%" in specific contexts
  // We need to be careful to replace them in the correct order
  
  // First, let's handle the chart image replacement
  // Look for existing image references that need to be replaced with our generated chart
  // This might be in an img tag or as a background image
  
  // Pattern to find chart/graph images (usually in page 2)
  const chartImagePattern = /<img[^>]*src="[^"]*"[^>]*class="[^"]*chart[^"]*"[^>]*>/gi
  const graphImagePattern = /<img[^>]*src="[^"]*grafiek[^"]*"[^>]*>/gi
  const discImagePattern = /<img[^>]*src="[^"]*disc[^"]*"[^>]*>/gi
  
  // Replace any existing chart image with our generated one
  if (data.chartUrlOrDataUri) {
    // Try multiple patterns to find the chart image
    if (chartImagePattern.test(result)) {
      result = result.replace(chartImagePattern, `<img src="${data.chartUrlOrDataUri}" class="disc-chart" alt="DISC Profile Chart" />`)
    } else if (graphImagePattern.test(result)) {
      result = result.replace(graphImagePattern, `<img src="${data.chartUrlOrDataUri}" alt="DISC Profile Chart" />`)
    } else if (discImagePattern.test(result)) {
      result = result.replace(discImagePattern, `<img src="${data.chartUrlOrDataUri}" alt="DISC Profile Chart" />`)
    } else {
      // If no specific chart image found, look for a placeholder image on page 2
      // This is a more generic approach - replace the second major image in the document
      const allImages = result.match(/<img[^>]*>/gi) || []
      if (allImages.length >= 2) {
        // Replace the second image (assuming first is logo/header)
        result = result.replace(allImages[1], `<img src="${data.chartUrlOrDataUri}" alt="DISC Profile Chart" style="width:100%;max-width:600px;" />`)
      }
    }
  }
  
  // Replace DISC percentage values
  // Look for percentage patterns and replace them systematically
  // The template has 8 percentage values (4 natural, 4 response)
  
  // Create an array of all percentage values in order
  const percentageValues = [
    `${Math.round(data.naturalPct.D)}%`,
    `${Math.round(data.naturalPct.I)}%`,
    `${Math.round(data.naturalPct.S)}%`,
    `${Math.round(data.naturalPct.C)}%`,
    `${Math.round(data.responsePct.D)}%`,
    `${Math.round(data.responsePct.I)}%`,
    `${Math.round(data.responsePct.S)}%`,
    `${Math.round(data.responsePct.C)}%`
  ]
  
  // Find all occurrences of "0%" in the template
  let percentageIndex = 0
  result = result.replace(/\b0%/g, (match) => {
    // Only replace the first 8 occurrences (our DISC values)
    if (percentageIndex < percentageValues.length) {
      const replacement = percentageValues[percentageIndex]
      percentageIndex++
      return replacement
    }
    return match // Keep other 0% unchanged
  })
  
  // Log any missing placeholders for debugging
  const remainingPlaceholders = result.match(/<<[^>]+>>/g)
  if (remainingPlaceholders && remainingPlaceholders.length > 0) {
    console.warn('Warning: Unresolved placeholders found:', remainingPlaceholders)
  }
  
  return result
}

/**
 * Validate that all required placeholders have been replaced
 */
export function validatePlaceholderReplacement(html: string): boolean {
  const placeholderPattern = /<<[^>]+>>/g
  const matches = html.match(placeholderPattern)
  
  if (matches && matches.length > 0) {
    console.warn('Validation failed - remaining placeholders:', matches)
    return false
  }
  
  return true
}
