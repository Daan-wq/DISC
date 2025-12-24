"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Activity, AlertCircle, ArrowRight, Mail, Shield, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/Card'
import { StatCard, StatCardSkeleton } from '@/components/admin/ui/StatCard'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'

export default function AdminOverviewPage() {
  const [live, setLive] = useState<number>(0)
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch data once on mount - no polling to reduce server load
  useEffect(() => {
    let cancelled = false
    async function loadData() {
      try {
        const lc = await fetch('/api/admin/metrics/live-count', { credentials: 'include' }).then(r => r.json()).catch(() => ({ live_count: 0 }))
        if (!cancelled) setLive(lc?.live_count || 0)
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const nf = await fetch(`/api/admin/notifications/list?limit=200&since=${encodeURIComponent(since)}`, { credentials: 'include' }).then(r => r.json()).catch(() => ({ items: [] }))
        if (!cancelled) setRecent(nf?.items || [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadData()
    return () => { cancelled = true }
  }, [])

  const emails24h = useMemo(() => recent.filter(n => n.source === 'mailer' && n.severity === 'success').length, [recent])
  const errors24h = useMemo(() => recent.filter(n => n.severity === 'error').length, [recent])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overzicht van je DISC Quiz applicatie"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Live gebruikers"
              value={live}
              subtitle="Actief op dit moment"
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              title="E-mails verzonden"
              value={emails24h}
              subtitle="Afgelopen 24 uur"
              icon={<Mail className="h-5 w-5" />}
            />
            <StatCard
              title="Fouten"
              value={errors24h}
              subtitle="Afgelopen 24 uur"
              icon={<AlertCircle className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recente meldingen</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <EmptyState
                title="Geen meldingen"
                description="Er zijn nog geen meldingen in de afgelopen 24 uur."
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.slice(0, 8).map((n, i) => (
                  <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          n.severity === 'error' ? 'error' :
                          n.severity === 'success' ? 'success' :
                          n.severity === 'warning' ? 'warning' : 'default'
                        }>
                          {n.severity}
                        </Badge>
                        <span className="text-sm font-medium text-slate-700">{n.source}</span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{n.message}</p>
                    </div>
                    <time className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(n.created_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                ))}
              </div>
            )}
            {recent.length > 8 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                <Link
                  href="/notifications"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                >
                  Alle meldingen bekijken
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Snelle acties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/allowlist" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-200 transition-colors">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">Toegangslijst</div>
                  <div className="text-xs text-slate-500">Gebruikers toevoegen</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>

            <Link href="/results" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">Resultaten</div>
                  <div className="text-xs text-slate-500">Quiz resultaten bekijken</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>

            <Link href="/settings" className="block">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900">Instellingen</div>
                  <div className="text-xs text-slate-500">Beheer configuratie</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
