"use client"

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Entry { email: string; full_name?: string; quiz_id: string; expires_at?: string | null }

export default function AllowlistImportPage() {
  const [, setCsv] = useState<string>("")
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  function parseCsv(text: string): Entry[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return []
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const idx = {
      email: header.indexOf('email'),
      full_name: header.indexOf('full_name'),
      quiz_id: header.indexOf('quiz_id'),
      expires_at: header.indexOf('expires_at'),
    }
    const out: Entry[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim())
      const email = (cols[idx.email] || '').trim().toLowerCase()
      const full_name = idx.full_name >= 0 ? (cols[idx.full_name] || '').trim() : ''
      const quiz_id = (cols[idx.quiz_id] || '').trim()
      const expires_at = idx.expires_at >= 0 ? (cols[idx.expires_at] || '').trim() : ''
      if (!email || !quiz_id) continue
      out.push({ email, full_name, quiz_id, expires_at: expires_at || null })
    }
    return out
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null); setOkMsg(null)
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsv(text)
    setRows(parseCsv(text))
  }

  async function upload() {
    setLoading(true); setError(null); setOkMsg(null)
    try {
      const { data: sessionRes } = await supabase.auth.getSession()
      const token = sessionRes.session?.access_token
      if (!token) { setError('Niet ingelogd'); setLoading(false); return }

      const res = await fetch('/api/admin/allowlist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ entries: rows })
      })
      if (!res.ok) throw new Error(`Import mislukt: ${res.status}`)
      const j = await res.json()
      setOkMsg(`Geïmporteerd: ${j?.upserted ?? rows.length}`)
    } catch (e: any) {
      setError(e?.message || 'Fout tijdens import')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-2">Allowlist import (CSV)</h1>
        <p className="text-gray-600 mb-6">CSV met kolommen: email, full_name, quiz_id, expires_at (optioneel)</p>

        <input type="file" accept=".csv,text/csv" onChange={onFile} className="mb-4" />
        {rows.length > 0 && (
          <div className="mb-4 text-sm text-gray-600">Voorbeeld: {rows.length} rijen klaar om te importeren</div>
        )}

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
        {okMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{okMsg}</div>}

        <button
          onClick={upload}
          disabled={loading || rows.length === 0}
          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Bezig…' : 'Importeren'}
        </button>
      </div>
    </div>
  )
}
