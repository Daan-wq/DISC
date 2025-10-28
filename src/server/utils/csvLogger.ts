import { promises as fs } from 'fs'
import path from 'path'

/**
 * Append submission data to a CSV file
 * Creates the file if it doesn't exist
 */
export async function appendToCSV(data: {
  id: string
  full_name: string
  email: string
  profile_code: string
  created_at: string
  natural_d_pct: number
  natural_i_pct: number
  natural_s_pct: number
  natural_c_pct: number
  response_d_pct: number
  response_i_pct: number
  response_s_pct: number
  response_c_pct: number
}) {
  try {
    // Define CSV file path
    const csvPath = path.join(process.cwd(), 'data', 'submissions.csv')
    const dataDir = path.dirname(csvPath)
    
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true })
    
    // Check if file exists
    let fileExists = false
    try {
      await fs.access(csvPath)
      fileExists = true
    } catch {
      fileExists = false
    }
    
    // Create CSV header if file doesn't exist
    if (!fileExists) {
      const header = [
        'ID',
        'Timestamp',
        'Full Name',
        'Email',
        'Profile Code',
        'Natural D%',
        'Natural I%',
        'Natural S%',
        'Natural C%',
        'Response D%',
        'Response I%',
        'Response S%',
        'Response C%'
      ].join(',') + '\n'
      
      await fs.writeFile(csvPath, header, 'utf-8')
    }
    
    // Format date
    const timestamp = new Date(data.created_at).toISOString()
    
    // Create CSV row
    const row = [
      data.id,
      timestamp,
      `"${data.full_name.replace(/"/g, '""')}"`, // Escape quotes in name
      data.email,
      data.profile_code,
      data.natural_d_pct.toFixed(1),
      data.natural_i_pct.toFixed(1),
      data.natural_s_pct.toFixed(1),
      data.natural_c_pct.toFixed(1),
      data.response_d_pct.toFixed(1),
      data.response_i_pct.toFixed(1),
      data.response_s_pct.toFixed(1),
      data.response_c_pct.toFixed(1)
    ].join(',') + '\n'
    
    // Append row to CSV file
    await fs.appendFile(csvPath, row, 'utf-8')
    
    console.log(`CSV: Added submission ${data.id} to ${csvPath}`)
    
    return { success: true, path: csvPath }
  } catch (error) {
    console.error('Error appending to CSV:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Read CSV file and return parsed data
 */
export async function readCSV(): Promise<any[]> {
  try {
    const csvPath = path.join(process.cwd(), 'data', 'submissions.csv')
    const content = await fs.readFile(csvPath, 'utf-8')
    
    const lines = content.trim().split('\n')
    const headers = lines[0].split(',')
    
    const data = lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^,]+)/g) || []
      const row: any = {}
      
      headers.forEach((header, index) => {
        let value = values[index] || ''
        // Remove quotes if present
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1).replace(/""/g, '"')
        }
        row[header.trim()] = value
      })
      
      return row
    })
    
    return data
  } catch (error) {
    console.error('Error reading CSV:', error)
    return []
  }
}
