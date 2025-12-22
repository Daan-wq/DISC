"use client"

import { useEffect, useMemo, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/admin/ui/Card'
import { Badge } from '@/components/admin/ui/Badge'
import { Select } from '@/components/admin/ui/Input'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

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
        const res = await fetch(`/api/admin/notifications/list?limit=500&since=${encodeURIComponent(since)}`, { credentials: 'include' })
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

  const severityVariant = (s: string) => {
    switch (s) {
      case 'error': return 'error'
      case 'warning': return 'warning'
      case 'success': return 'success'
      default: return 'info'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meldingen"
        description={`${items.length} meldingen in de afgelopen 24 uur`}
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select
                value={severity}
                onChange={e => setSeverity(e.target.value)}
                options={[
                  { value: '', label: 'Alle ernst' },
                  { value: 'info', label: 'Info' },
                  { value: 'success', label: 'Success' },
                  { value: 'warning', label: 'Waarschuwing' },
                  { value: 'error', label: 'Fout' },
                ]}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={source}
                onChange={e => setSource(e.target.value)}
                options={[
                  { value: '', label: 'Alle bronnen' },
                  ...sources.map(s => ({ value: s, label: s }))
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Geen meldingen"
              description="Er zijn geen meldingen die aan je filters voldoen."
              icon={<Bell className="h-8 w-8" />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(n => (
                <div key={n.id} className="px-6 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={severityVariant(n.severity)}>
                        {n.severity}
                      </Badge>
                      <span className="text-sm font-medium text-slate-700">{n.source}</span>
                    </div>
                    <p className="text-sm text-slate-600">{n.message}</p>
                    {n.meta && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-700">
                          Toon details
                        </summary>
                        <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 overflow-x-auto">
                          {JSON.stringify(n.meta, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <time className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
