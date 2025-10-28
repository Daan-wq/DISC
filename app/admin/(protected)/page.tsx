"use client"

import { useEffect, useMemo, useState } from 'react'

export default function AdminOverviewPage() {
  const [live, setLive] = useState<number>(0)
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Poll metrics and notifications
  useEffect(() => {
    let stop = false
    async function tick() {
      try {
        const lc = await fetch('/api/admin/metrics/live-count').then(r => r.json()).catch(() => ({ live_count: 0 }))
        if (!stop) setLive(lc?.live_count || 0)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const nf = await fetch(`/api/admin/notifications/list?limit=200&since=${encodeURIComponent(since)}`).then(r => r.json()).catch(() => ({ items: [] }))
        if (!stop) setRecent(nf?.items || [])
      } finally {
        if (!stop) setLoading(false)
      }
    }
    tick()
    const h = setInterval(tick, 5000)
    return () => { stop = true; clearInterval(h) }
  }, [])

  const emails24h = useMemo(() => recent.filter(n => n.source === 'mailer' && n.severity === 'success').length, [recent])
  const errors24h = useMemo(() => recent.filter(n => n.severity === 'error').length, [recent])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="Live quiz gebruikers" value={live} loading={loading} />
        <KPI title="E-mails verzonden (24u)" value={emails24h} loading={loading} />
        <KPI title="Fouten (24u)" value={errors24h} loading={loading} />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">Snelle acties</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/allowlist" className="px-3 py-2 border rounded hover:bg-gray-50">Allowlist beheren</a>
          <a href="/admin/notifications" className="px-3 py-2 border rounded hover:bg-gray-50">Meldingen</a>
          <a href="/admin/settings" className="px-3 py-2 border rounded hover:bg-gray-50">Instellingen</a>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Recente meldingen</h2>
        <div className="border rounded divide-y">
          {recent.slice(0, 10).map((n, i) => (
            <div key={i} className="p-3 flex items-start justify-between text-sm">
              <div>
                <div className="font-medium">[{n.severity}] {n.source}</div>
                <div className="text-gray-700">{n.message}</div>
                {n.meta ? <div className="text-gray-500 text-xs mt-1">{JSON.stringify(n.meta)}</div> : null}
              </div>
              <div className="text-gray-500 text-xs">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="p-3 text-gray-500 text-sm">Geen meldingen</div>
          )}
        </div>
      </section>
    </div>
  )
}

function KPI({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <div className="border rounded p-4 bg-white">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold">{loading ? '…' : value}</div>
    </div>
  )
}
