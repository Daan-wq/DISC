"use client"

import { useEffect, useMemo, useState } from 'react'

type Noti = { id: string; created_at: string; severity: 'info'|'warning'|'error'|'success'; source: string; message: string; meta?: any }

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Noti[]>([])
  const [loading, setLoading] = useState(true)
  const [severity, setSeverity] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    let stop = false
    async function tick() {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const res = await fetch(`/api/admin/notifications/list?limit=500&since=${encodeURIComponent(since)}`)
        const j = await res.json()
        if (!stop) setItems(j.items || [])
      } finally {
        if (!stop) setLoading(false)
      }
    }
    tick()
    const h = setInterval(tick, 5000)
    return () => { stop = true; clearInterval(h) }
  }, [])

  const filtered = useMemo(() => items.filter(n =>
    (!severity || n.severity === severity) &&
    (!source || n.source === source)
  ), [items, severity, source])

  const sources = useMemo(() => Array.from(new Set(items.map(i => i.source))).sort(), [items])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Meldingen</h1>

      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm">Ernst</label>
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="border rounded px-3 py-2">
            <option value="">alle</option>
            <option value="info">info</option>
            <option value="success">success</option>
            <option value="warning">waarschuwing</option>
            <option value="error">fout</option>
          </select>
        </div>
        <div>
          <label className="block text-sm">Bron</label>
          <select value={source} onChange={e => setSource(e.target.value)} className="border rounded px-3 py-2">
            <option value="">alle</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="border rounded divide-y bg-white">
        {loading ? (
          <div className="p-3 text-sm">Laden…</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-sm text-gray-600">Geen meldingen</div>
        ) : filtered.map(n => (
          <div key={n.id} className="p-3 flex items-start justify-between">
            <div>
              <div className="font-medium">[{n.severity}] {n.source}</div>
              <div className="text-gray-700 text-sm">{n.message}</div>
              {n.meta ? <pre className="text-xs text-gray-500 whitespace-pre-wrap break-all mt-1">{JSON.stringify(n.meta, null, 2)}</pre> : null}
            </div>
            <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
