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
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <KPI title="Live quiz gebruikers" value={live} loading={loading} />
        <KPI title="E-mails verzonden (24u)" value={emails24h} loading={loading} />
        <KPI title="Fouten (24u)" value={errors24h} loading={loading} />
      </div>

      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-2">Snelle acties</h2>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <a href="/admin/allowlist" className="flex-1 sm:flex-none min-w-[120px] px-3 py-2.5 sm:py-2 border rounded hover:bg-gray-50 active:bg-gray-100 text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center">Allowlist beheren</a>
          <a href="/admin/notifications" className="flex-1 sm:flex-none min-w-[120px] px-3 py-2.5 sm:py-2 border rounded hover:bg-gray-50 active:bg-gray-100 text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center">Meldingen</a>
          <a href="/admin/settings" className="flex-1 sm:flex-none min-w-[120px] px-3 py-2.5 sm:py-2 border rounded hover:bg-gray-50 active:bg-gray-100 text-center text-sm sm:text-base min-h-[44px] flex items-center justify-center">Instellingen</a>
        </div>
      </section>

      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-2">Recente meldingen</h2>
        <div className="border rounded divide-y">
          {recent.slice(0, 10).map((n, i) => (
            <div key={i} className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium">[{n.severity}] {n.source}</div>
                <div className="text-gray-700 break-words">{n.message}</div>
                {n.meta ? <div className="text-gray-500 text-xs mt-1 break-all">{JSON.stringify(n.meta)}</div> : null}
              </div>
              <div className="text-gray-500 text-xs whitespace-nowrap">{new Date(n.created_at).toLocaleString()}</div>
            </div>
          ))}
          {recent.length === 0 && (
            <div className="p-2.5 sm:p-3 text-gray-500 text-xs sm:text-sm">Geen meldingen</div>
          )}
        </div>
      </section>
    </div>
  )
}

function KPI({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <div className="border rounded p-3 sm:p-4 bg-white">
      <div className="text-xs sm:text-sm text-gray-500">{title}</div>
      <div className="text-xl sm:text-2xl font-bold">{loading ? '…' : value}</div>
    </div>
  )
}
