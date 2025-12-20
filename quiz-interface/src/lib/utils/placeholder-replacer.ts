              export interface PlaceholderData {
  candidate: {
    full_name: string
  }
  results: {
    created_at: string
    profile_code: string
    natural_d: number
    natural_i: number
    natural_s: number
    natural_c: number
    response_d: number
    response_i: number
    response_s: number
    response_c: number
  }
  // Optional extras for safer rendering/styling
  meta?: {
    // If provided, use this ISO date string for <<Datum>> instead of results.created_at
    dateISO?: string
    // If provided, use this label text for <<Stijl>> (e.g., "DISC Profiel – Dominant")
    stijlLabel?: string
  }
}

/**
 * Replaces all placeholders with real data from the database
 * STRICT MODE: Only replaces known placeholders, warns on unknowns
 * @param content - The HTML content to process
 * @param data - The data to replace placeholders with
 * @returns The content with all placeholders replaced
 */
export function replacePlaceholders(content: string, data?: PlaceholderData): string {
  let processed = content
  
  if (data) {
    console.log('=== PLACEHOLDER REPLACEMENT START ===')
    console.log('Processing with data:', {
      candidate: data.candidate,
      results: {
        profile_code: data.results.profile_code,
        natural: `D:${data.results.natural_d}, I:${data.results.natural_i}, S:${data.results.natural_s}, C:${data.results.natural_c}`,
        response: `D:${data.results.response_d}, I:${data.results.response_i}, S:${data.results.response_s}, C:${data.results.response_c}`
      },
      meta: data.meta
    })
    
    // SECURITY: Escape HTML to prevent injection attacks in PDF templates
    // All user-controlled values MUST pass through this before insertion
    const escapeHtml = (s: string) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\//g, '&#x2F;')  // Forward slash - prevents closing tags
      .replace(/`/g, '&#x60;')   // Backtick - prevents template literals

    const dateToUse = data.meta?.dateISO || data.results.created_at
    const dateText = new Date(dateToUse).toLocaleDateString('nl-NL')
    const stijlText = data.meta?.stijlLabel || data.results.profile_code
    const naamText = data.candidate.full_name

    // Find all placeholders in the content first
    const allPlaceholders = content.match(/&lt;&lt;[^&]+&gt;&gt;|<<[^>]+>>/g) || []
    console.log(`Found ${allPlaceholders.length} placeholders in content`)
    
    // FIRST: Handle combined Datum+Stijl pattern BEFORE individual replacements
    // This prevents the issue where individual replacements destroy the pattern we're looking for
    let replacementCount = 0
    
    // Pattern 1: Datum and Stijl with optional space span in between
    // Example: <a href="DBF_Datum"><span><<Datum>></span></a><span> </span><a href="DBF_Stijl"><span><<Stijl>></span></a>
    const pattern1 = /<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*>(?:&lt;&lt;Datum&gt;&gt;|<<Datum>>)<\/span><\/a>(?:<span[^>]*>\s*<\/span>)?<a[^>]*href="http:\/\/DBF_Stijl"[^>]*><span[^>]*>(?:&lt;&lt;Stijl&gt;&gt;|<<Stijl>>)<\/span><\/a>/g
    
    // Pattern 2: Just Datum and Stijl directly next to each other (no space span)
    // Example: <a href="DBF_Datum"><span><<Datum>></span></a><a href="DBF_Stijl"><span><<Stijl>></span></a>
    const pattern2 = /<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*>(?:&lt;&lt;Datum&gt;&gt;|<<Datum>>)<\/span><\/a><a[^>]*href="http:\/\/DBF_Stijl"[^>]*><span[^>]*>(?:&lt;&lt;Stijl&gt;&gt;|<<Stijl>>)<\/span><\/a>/g
    
    const combinedText = `${escapeHtml(dateText)} ${escapeHtml(stijlText)}`
    
    // Try pattern 1 first (with optional space span)
    let matches = processed.match(pattern1)
    if (matches && matches.length > 0) {
      // Extract the ORIGINAL class and style from the Datum span to preserve all styling
      const firstMatch = matches[0]
      
      // Extract class from the first span inside the Datum anchor
      const classMatch = firstMatch.match(/<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*class="([^"]*)"/)
      const originalClass = classMatch ? classMatch[1] : 'CharOverride-11'
      
      // Extract style from the first span inside the Datum anchor
      const styleMatch = firstMatch.match(/<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*style="([^"]*)"/)
      const originalStyle = styleMatch ? styleMatch[1] : 'position:absolute;top:-1.45px;left:15.14px;'
      
      // Add max-width to prevent text extending beyond right margin (user requested padding 5 times)
      // Content typically ends around left:445px, add max-width constraint
      const finalStyle = originalStyle + 'max-width:430px;'
      
      // Use ONLY original class and style WITH max-width - CSS handles font, inline style handles positioning
      const replacement = `<a target="_blank" href="http://DBF_Datum"><span class="${originalClass}" style="${finalStyle}">${combinedText}</span></a>`
      processed = processed.replace(pattern1, replacement)
      console.log(`✓ Replaced ${matches.length} Datum+Stijl pattern(s) (type 1) with combined span: "${combinedText}" using class="${originalClass}"`)
      replacementCount += matches.length
    }
    
    // Try pattern 2 (direct adjacency)
    matches = processed.match(pattern2)
    if (matches && matches.length > 0) {
      const firstMatch = matches[0]
      
      // Extract class from the first span inside the Datum anchor
      const classMatch = firstMatch.match(/<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*class="([^"]*)"/)
      const originalClass = classMatch ? classMatch[1] : 'CharOverride-11'
      
      // Extract style from the first span inside the Datum anchor
      const styleMatch = firstMatch.match(/<a[^>]*href="http:\/\/DBF_Datum"[^>]*><span[^>]*style="([^"]*)"/)
      const originalStyle = styleMatch ? styleMatch[1] : 'position:absolute;top:-1.45px;left:15.14px;'
      
      // Add max-width to prevent text extending beyond right margin (user requested padding 5 times)
      // Content typically ends around left:445px, add max-width constraint
      const finalStyle = originalStyle + 'max-width:430px;'
      
      // Use ONLY original class and style WITH max-width - CSS handles font, inline style handles positioning
      const replacement = `<a target="_blank" href="http://DBF_Datum"><span class="${originalClass}" style="${finalStyle}">${combinedText}</span></a>`
      processed = processed.replace(pattern2, replacement)
      console.log(`✓ Replaced ${matches.length} Datum+Stijl pattern(s) (type 2) with combined span: "${combinedText}" using class="${originalClass}"`)
      replacementCount += matches.length
    }
    
    // THEN: Replace HTML-encoded placeholders (what actually appears in the templates)
    const encodedPlaceholderMap: Record<string, string> = {
      '&lt;&lt;Naam&gt;&gt;': escapeHtml(naamText),
      '&lt;&lt;Voornaam&gt;&gt;': escapeHtml(naamText.split(' ')[0] || naamText),
      '&lt;&lt;Datum&gt;&gt;': escapeHtml(dateText),
      '&lt;&lt;Stijl&gt;&gt;': escapeHtml(stijlText),
      '&lt;&lt;Style&gt;&gt;': `<span id="stijl" dir="ltr">${escapeHtml(stijlText)}</span>`,
      '&lt;&lt;ProfielCode&gt;&gt;': escapeHtml(data.results.profile_code),
      '&lt;&lt;NaturalD&gt;&gt;': String(Math.round(data.results.natural_d)),
      '&lt;&lt;NaturalI&gt;&gt;': String(Math.round(data.results.natural_i)),
      '&lt;&lt;NaturalS&gt;&gt;': String(Math.round(data.results.natural_s)),
      '&lt;&lt;NaturalC&gt;&gt;': String(Math.round(data.results.natural_c)),
      '&lt;&lt;ResponseD&gt;&gt;': String(Math.round(data.results.response_d)),
      '&lt;&lt;ResponseI&gt;&gt;': String(Math.round(data.results.response_i)),
      '&lt;&lt;ResponseS&gt;&gt;': String(Math.round(data.results.response_s)),
      '&lt;&lt;ResponseC&gt;&gt;': String(Math.round(data.results.response_c))
    }
    
    // Replace encoded placeholders (continue using replacementCount from above)
    Object.entries(encodedPlaceholderMap).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = processed.match(regex)
      if (matches) {
        console.log(`✓ Replacing "${placeholder}" → "${value}" (${matches.length} occurrences)`) 
        processed = processed.replace(regex, value)
        replacementCount += matches.length
      }
    })
    
    // Then decode HTML entities for any remaining content
    processed = processed.replace(/&lt;&lt;/g, '<<').replace(/&gt;&gt;/g, '>>')
    
    // Replace unencoded placeholders (in case some are not HTML-encoded)
    const unencodedPlaceholderMap: Record<string, string> = {
      '<<Naam>>': escapeHtml(naamText),
      '<<Voornaam>>': escapeHtml(naamText.split(' ')[0] || naamText),
      '<<Datum>>': escapeHtml(dateText),
      '<<Stijl>>': escapeHtml(stijlText),
      '<<Style>>': `<span id="stijl" dir="ltr">${escapeHtml(stijlText)}</span>`,
      '<<ProfielCode>>': escapeHtml(data.results.profile_code),
      '<<NaturalD>>': String(Math.round(data.results.natural_d)),
      '<<NaturalI>>': String(Math.round(data.results.natural_i)),
      '<<NaturalS>>': String(Math.round(data.results.natural_s)),
      '<<NaturalC>>': String(Math.round(data.results.natural_c)),
      '<<ResponseD>>': String(Math.round(data.results.response_d)),
      '<<ResponseI>>': String(Math.round(data.results.response_i)),
      '<<ResponseS>>': String(Math.round(data.results.response_s)),
      '<<ResponseC>>': String(Math.round(data.results.response_c))
    }
    
    Object.entries(unencodedPlaceholderMap).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = processed.match(regex)
      if (matches) {
        console.log(`✓ Replacing "${placeholder}" → "${value}" (${matches.length} occurrences)`) 
        processed = processed.replace(regex, value)
        replacementCount += matches.length
      }
    })
    
    // Dynamic canonicalized replacements for localized style placeholders (e.g., "Natuurlijke stijl %")
    // Build canonical keys from remaining placeholders, then map to computed values
    const toCanonical = (raw: string) => {
      const inner = raw.replace(/^<<|>>$/g, '').trim()
      const collapsed = inner.replace(/\s+/g, ' ')
      const lower = collapsed.toLowerCase()
      // remove diacritics
      const ascii = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      // normalize hyphens/underscores to space, drop percent signs and trailing punctuation
      return ascii
        .replace(/[-_]+/g, ' ')
        .replace(/%/g, '')
        .replace(/[.:;,-]+$/g, '')
        .trim()
    }

    const nat = { D: Math.round(data.results.natural_d), I: Math.round(data.results.natural_i), S: Math.round(data.results.natural_s), C: Math.round(data.results.natural_c) }
    const resp = { D: Math.round(data.results.response_d), I: Math.round(data.results.response_i), S: Math.round(data.results.response_s), C: Math.round(data.results.response_c) }
    const maxNat = Math.max(nat.D, nat.I, nat.S, nat.C)
    const maxResp = Math.max(resp.D, resp.I, resp.S, resp.C)

    const canonicalMap: Record<string, string> = {
      // Aggregated headline values (if such placeholders exist)
      'natuurlijke stijl': `${maxNat}%`,
      'natuurlijke stijl %': `${maxNat}%`,
      'respons stijl': `${maxResp}%`,
      'respons stijl %': `${maxResp}%`,
      // Per-trait values
      'natuurlijke stijl d %': `${nat.D}%`,
      'natuurlijke stijl i %': `${nat.I}%`,
      'natuurlijke stijl s %': `${nat.S}%`,
      'natuurlijke stijl c %': `${nat.C}%`,
      'respons stijl d %': `${resp.D}%`,
      'respons stijl i %': `${resp.I}%`,
      'respons stijl s %': `${resp.S}%`,
      'respons stijl c %': `${resp.C}%`
    }

    // Replace any remaining placeholders using canonical lookup; if unknown, leave as-is
    processed = processed.replace(/<<[^>]+>>/g, (ph) => {
      const key = toCanonical(ph)
      if (key in canonicalMap) {
        const val = canonicalMap[key]
        console.log(`[PLACEHOLDER] canonical match: ${ph} → ${val} (key='${key}')`)
        replacementCount += 1
        return val
      }
      return ph
    })

    // Find remaining placeholders - STRICT MODE: Do NOT replace with TEST
    const remainingPlaceholders = processed.match(/<<[^>]+>>/g) || []
    if (remainingPlaceholders.length > 0) {
      console.error('⚠️ UNHANDLED PLACEHOLDERS DETECTED:')
      const uniquePlaceholders = [...new Set(remainingPlaceholders)]
      uniquePlaceholders.forEach(placeholder => {
        console.error(`  ✗ ${placeholder} - NOT REPLACED (add to placeholder map)`)
      })
      // IMPORTANT: Do NOT replace with TEST - keep placeholders visible for debugging
    }
    
    console.log(`=== REPLACEMENT COMPLETE: ${replacementCount} replacements made ===`)
  } else {
    // No data provided - decode entities but do NOT replace with TEST
    console.warn('⚠️ No data provided for placeholder replacement')
    processed = processed.replace(/&lt;&lt;/g, '<<').replace(/&gt;&gt;/g, '>>')
    // Leave placeholders as-is for visibility
  }
  
  return processed
}
