import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getAdminSession } from '@/src/server/admin/session'

export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'csv'
    const exportType = params.type

    let data: any[] = []

    if (exportType === 'candidates') {
      const { data: candidates, error } = await supabaseAdmin
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      data = candidates || []
    } else if (exportType === 'results') {
      const { data: results, error } = await supabaseAdmin
        .from('quiz_attempts')
        .select(`
          id,
          user_id,
          quiz_id,
          started_at,
          finished_at,
          score,
          pdf_path,
          pdf_filename,
          alert,
          candidates!inner(email, full_name)
        `)
        .not('finished_at', 'is', null)
        .order('started_at', { ascending: false })

      if (error) throw error

      data = (results || []).map((r: any) => ({
        id: r.id,
        email: r.candidates?.email,
        name: r.candidates?.full_name,
        score: r.score,
        started_at: r.started_at,
        finished_at: r.finished_at,
        pdf_generated: !!r.pdf_path,
        alert: r.alert,
      }))
    } else if (exportType === 'answers') {
      const { data: answers, error } = await supabaseAdmin
        .from('answers')
        .select(`
          id,
          candidate_id,
          created_at,
          raw_answers,
          candidates!inner(email, full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      data = (answers || []).map((a: any) => ({
        id: a.id,
        email: a.candidates?.email,
        name: a.candidates?.full_name,
        answers: (a.raw_answers || []).join(','),
        created_at: a.created_at,
      }))
    } else {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    let content: string
    let contentType: string
    let filename: string

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      contentType = 'application/json'
      filename = `export-${exportType}-${new Date().toISOString().split('T')[0]}.json`
    } else {
      // CSV format
      if (data.length === 0) {
        content = 'No data'
        contentType = 'text/csv'
        filename = `export-${exportType}-${new Date().toISOString().split('T')[0]}.csv`
      } else {
        const headers = Object.keys(data[0])
        const csvRows = [
          headers.join(','),
          ...data.map((row) =>
            headers
              .map((header) => {
                const value = row[header]
                if (value === null || value === undefined) return ''
                const str = String(value)
                // Escape quotes and wrap in quotes if contains comma
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`
                }
                return str
              })
              .join(',')
          ),
        ]
        content = csvRows.join('\n')
        contentType = 'text/csv'
        filename = `export-${exportType}-${new Date().toISOString().split('T')[0]}.csv`
      }
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    console.error('Export error:', e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
