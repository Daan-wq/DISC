"use client"

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Clock,
  MessageSquare,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'

import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/admin/ui/Card'
import { Input, Select } from '@/components/admin/ui/Input'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { StatCard, StatCardSkeleton } from '@/components/admin/ui/StatCard'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHeader,
  TableHead,
  TableRow,
  TableLoading,
} from '@/components/admin/ui/Table'

type FeedbackItem = {
  id: string
  created_at: string
  attempt_id: string
  user_id: string
  candidate_email: string | null
  candidate_name: string | null
  delivery_preference: string | null
  length_preference: string | null
  rating_user_friendly: number | null
  rating_trust_result: number | null
  rating_recommend_to_others: number | null
  responses?: any
}

type Metric = {
  key: string
  label: string
  avg: number | null
  count: number
}

type SummaryResponse = {
  total: number
  last7days: number
  days: number
  since: string
  averages: Record<string, number | null>
  top: Metric[]
  low: Metric[]
  distributions: {
    delivery_preference: Record<string, number>
    length_preference: Record<string, number>
  }
}

function formatPreference(v: string | null) {
  if (!v) return '—'
  if (v === 'mail') return 'Via e-mail'
  if (v === 'result_page') return 'Uitslagpagina'
  if (v === 'both') return 'Beide'
  if (v === 'too_short') return 'Te kort'
  if (v === 'good') return 'Precies goed'
  if (v === 'too_long') return 'Te lang'
  return v
}

function RatingBadge({ value }: { value: number | null }) {
  if (typeof value !== 'number') {
    return <Badge variant="outline">—</Badge>
  }

  const variant = value >= 8 ? 'success' : value >= 6 ? 'warning' : 'error'
  return <Badge variant={variant}>{value}</Badge>
}

export default function AdminFeedbackPage() {
  const [days, setDays] = useState('30')
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [query, setQuery] = useState('')

  const loadData = async (d: number) => {
    setLoading(true)
    setSummaryLoading(true)
    try {
      const since = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

      const [summaryRes, listRes] = await Promise.all([
        fetch(`/api/admin/feedback/summary?days=${d}`, { credentials: 'include' }),
        fetch(`/api/admin/feedback/list?limit=500&since=${encodeURIComponent(since)}`, {
          credentials: 'include',
        }),
      ])

      if (summaryRes.ok) {
        const s = (await summaryRes.json()) as SummaryResponse
        setSummary(s)
      } else {
        setSummary(null)
      }

      if (listRes.ok) {
        const j = await listRes.json()
        setItems((j?.items || []) as FeedbackItem[])
      } else {
        setItems([])
      }
    } finally {
      setLoading(false)
      setSummaryLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const d = parseInt(days, 10) || 30

    ;(async () => {
      await loadData(d)
      if (cancelled) return
    })()

    return () => {
      cancelled = true
    }
  }, [days])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items

    return items.filter((i) => {
      const name = (i.candidate_name || '').toLowerCase()
      const email = (i.candidate_email || '').toLowerCase()
      const attempt = (i.attempt_id || '').toLowerCase()
      return name.includes(q) || email.includes(q) || attempt.includes(q)
    })
  }, [items, query])

  const avgRecommend = summary?.averages?.rating_recommend_to_others ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="Overzicht van ingediende feedback en gemiddelden"
        action={
          <div className="flex items-center gap-3">
            <Select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={[
                { value: '7', label: '7 dagen' },
                { value: '30', label: '30 dagen' },
                { value: '90', label: '90 dagen' },
                { value: '365', label: '365 dagen' },
              ]}
            />
            <Button
              variant="outline"
              onClick={() => loadData(parseInt(days, 10) || 30)}
              leftIcon={<Clock className="h-4 w-4" />}
            >
              Vernieuwen
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title={`Feedback (${days} dagen)`}
              value={summary?.total ?? 0}
              subtitle="Aantal inzendingen"
              icon={<MessageSquare className="h-5 w-5" />}
            />
            <StatCard
              title="Laatste 7 dagen"
              value={summary?.last7days ?? 0}
              subtitle="Aantal inzendingen"
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              title="Gemiddelde aanbevelen"
              value={typeof avgRecommend === 'number' ? avgRecommend : '—'}
              subtitle="Schaal 1-10"
              icon={<Star className="h-5 w-5" />}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaryLoading ? (
              <div className="text-sm text-slate-500">Laden...</div>
            ) : summary?.top?.length ? (
              summary.top.map((m) => (
                <div key={m.key} className="flex items-center justify-between">
                  <div className="text-sm text-slate-700">{m.label}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">{m.avg ?? '—'}</Badge>
                    <span className="text-xs text-slate-400">({m.count})</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">Geen data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Laagste scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summaryLoading ? (
              <div className="text-sm text-slate-500">Laden...</div>
            ) : summary?.low?.length ? (
              summary.low.map((m) => (
                <div key={m.key} className="flex items-center justify-between">
                  <div className="text-sm text-slate-700">{m.label}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="warning">{m.avg ?? '—'}</Badge>
                    <span className="text-xs text-slate-400">({m.count})</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">Geen data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader
          action={
            <div className="w-72">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Zoek op naam, e-mail of attempt_id"
              />
            </div>
          }
        >
          <CardTitle>Inzendingen</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Datum</TableHead>
                <TableHead>Deelnemer</TableHead>
                <TableHead>Ontvangst</TableHead>
                <TableHead>Lengte</TableHead>
                <TableHead>Gebruiksvriendelijk</TableHead>
                <TableHead>Vertrouwen</TableHead>
                <TableHead>Aanbevelen</TableHead>
                <TableHead>Details</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableLoading colSpan={8} rows={6} />
              ) : filtered.length === 0 ? (
                <TableEmpty
                  colSpan={8}
                  message="Geen feedback gevonden in deze periode"
                />
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(i.created_at).toLocaleString('nl-NL', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell className="min-w-[220px]">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">
                          {i.candidate_name || 'Onbekend'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {i.candidate_email || i.user_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{formatPreference(i.delivery_preference)}</TableCell>
                    <TableCell>{formatPreference(i.length_preference)}</TableCell>
                    <TableCell>
                      <RatingBadge value={i.rating_user_friendly} />
                    </TableCell>
                    <TableCell>
                      <RatingBadge value={i.rating_trust_result} />
                    </TableCell>
                    <TableCell>
                      <RatingBadge value={i.rating_recommend_to_others} />
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <details>
                        <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 inline-flex items-center gap-2">
                          <ThumbsUp className="h-4 w-4" />
                          Toon
                        </summary>
                        <div className="mt-2">
                          <div className="text-xs text-slate-500 mb-2">
                            attempt_id: {i.attempt_id}
                          </div>
                          <pre className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 overflow-x-auto max-w-[520px]">
                            {JSON.stringify(i.responses || {}, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Interpretatie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <ThumbsUp className="h-4 w-4 text-emerald-600" />
            8-10 = sterk positief
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <ThumbsDown className="h-4 w-4 text-red-600" />
            1-5 = duidelijke verbeterkans
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
