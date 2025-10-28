import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

export interface CsvRow {
  id: string
  created_at: string
  name: string
  email: string
  profile_code: string
  natural_d_pct: number
  natural_i_pct: number
  natural_s_pct: number
  natural_c_pct: number
  response_d_pct: number
  response_i_pct: number
  response_s_pct: number
  response_c_pct: number
  answers_json: string
}

export interface CsvWriter {
  append(row: CsvRow): Promise<void>
  read(): Promise<string>
}

/**
 * Local file system CSV writer for development
 */
export class LocalCsvWriter implements CsvWriter {
  private readonly filePath: string
  private readonly headers = [
    'id',
    'created_at',
    'name',
    'email',
    'profile_code',
    'natural_d_pct',
    'natural_i_pct',
    'natural_s_pct',
    'natural_c_pct',
    'response_d_pct',
    'response_i_pct',
    'response_s_pct',
    'response_c_pct',
    'answers_json'
  ]

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'storage', 'responses.csv')
  }

  async ensureFile(): Promise<void> {
    const dir = path.dirname(this.filePath)
    await fs.mkdir(dir, { recursive: true })
    
    try {
      await fs.access(this.filePath)
    } catch {
      // File doesn't exist, create with headers
      await fs.writeFile(this.filePath, this.headers.join(',') + '\n', 'utf-8')
    }
  }

  async append(row: CsvRow): Promise<void> {
    await this.ensureFile()
    
    const csvLine = [
      row.id,
      row.created_at,
      `"${row.name.replace(/"/g, '""')}"`,
      row.email,
      row.profile_code,
      row.natural_d_pct.toFixed(1),
      row.natural_i_pct.toFixed(1),
      row.natural_s_pct.toFixed(1),
      row.natural_c_pct.toFixed(1),
      row.response_d_pct.toFixed(1),
      row.response_i_pct.toFixed(1),
      row.response_s_pct.toFixed(1),
      row.response_c_pct.toFixed(1),
      `"${row.answers_json.replace(/"/g, '""')}"`
    ].join(',') + '\n'
    
    await fs.appendFile(this.filePath, csvLine, 'utf-8')
  }

  async read(): Promise<string> {
    await this.ensureFile()
    return fs.readFile(this.filePath, 'utf-8')
  }
}

/**
 * Supabase Storage CSV writer for production
 */
export class SupabaseCsvWriter implements CsvWriter {
  private readonly client: ReturnType<typeof createClient>
  private readonly bucket: string
  private readonly fileName: string
  private localWriter: LocalCsvWriter

  constructor(supabaseUrl: string, supabaseKey: string, bucket = 'exports', fileName = 'responses.csv') {
    this.client = createClient(supabaseUrl, supabaseKey)
    this.bucket = bucket
    this.fileName = fileName
    this.localWriter = new LocalCsvWriter()
  }

  async append(row: CsvRow): Promise<void> {
    // Download existing CSV
    let existingContent = ''
    
    try {
      const { data } = await this.client.storage
        .from(this.bucket)
        .download(this.fileName)
      
      if (data) {
        existingContent = await data.text()
      }
    } catch {
      // File doesn't exist, start with headers
      existingContent = this.localWriter['headers'].join(',') + '\n'
    }
    
    // Append new row
    const csvLine = [
      row.id,
      row.created_at,
      `"${row.name.replace(/"/g, '""')}"`,
      row.email,
      row.profile_code,
      row.natural_d_pct.toFixed(1),
      row.natural_i_pct.toFixed(1),
      row.natural_s_pct.toFixed(1),
      row.natural_c_pct.toFixed(1),
      row.response_d_pct.toFixed(1),
      row.response_i_pct.toFixed(1),
      row.response_s_pct.toFixed(1),
      row.response_c_pct.toFixed(1),
      `"${row.answers_json.replace(/"/g, '""')}"`
    ].join(',') + '\n'
    
    const updatedContent = existingContent + csvLine
    
    // Upload updated CSV
    await this.client.storage
      .from(this.bucket)
      .upload(this.fileName, new Blob([updatedContent]), {
        contentType: 'text/csv',
        upsert: true
      })
  }

  async read(): Promise<string> {
    const { data } = await this.client.storage
      .from(this.bucket)
      .download(this.fileName)
    
    if (data) {
      return data.text()
    }
    
    return ''
  }
}

// Factory function to get the appropriate CSV writer
export function getCsvWriter(): CsvWriter {
  if (process.env.NODE_ENV === 'production' && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new SupabaseCsvWriter(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      process.env.SUPABASE_BUCKET || 'exports'
    )
  }
  
  return new LocalCsvWriter()
}
