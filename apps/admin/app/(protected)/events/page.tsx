"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Search, ListChecks } from "lucide-react"
import { Card, CardContent } from '../../components/admin/ui/Card'
import { Badge } from '../../components/admin/ui/Badge'
import { Button } from '../../components/admin/ui/Button'
import { Input, Select } from '../../components/admin/ui/Input'
import { PageHeader } from '../../components/admin/ui/PageHeader'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
} from '../../components/admin/ui/Table'

interface AdminEvent {
  id: string
  created_at: string
  type: string
  actor: string
  payload: any
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [filtered, setFiltered] = useState<AdminEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterActor, setFilterActor] = useState<string>("")
  const [eventTypes, setEventTypes] = useState<string[]>([])

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/events/list", { credentials: 'include' })
      const data = await res.json()
      setEvents(data.events || [])

      const types = [...new Set((data.events || []).map((e: AdminEvent) => e.type))]
      setEventTypes(types as string[])
    } catch (e) {
      console.error("Failed to load events:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = events

    if (filterType !== "all") {
      result = result.filter((e) => e.type === filterType)
    }

    if (filterActor.trim()) {
      const term = filterActor.toLowerCase()
      result = result.filter((e) => e.actor.toLowerCase().includes(term))
    }

    result = [...result].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setFiltered(result)
  }, [events, filterType, filterActor])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description={`${events.length} acties gelogd`}
        action={
          <Button
            variant="outline"
            onClick={loadEvents}
            loading={loading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Vernieuwen
          </Button>
        }
      />

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Zoeken op admin..."
                value={filterActor}
                onChange={(e) => setFilterActor(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: 'all', label: 'Alle types' },
                  ...eventTypes.map(t => ({ value: t, label: t }))
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tijdstip</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoading colSpan={4} />
          ) : filtered.length === 0 ? (
            <TableEmpty
              colSpan={4}
              message="Geen acties gevonden"
            />
          ) : (
            filtered.map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  <div className="text-slate-600">
                    {new Date(event.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}
                    <span className="text-slate-400 ml-2">
                      {new Date(event.created_at).toLocaleTimeString("nl-NL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{event.type}</Badge>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-slate-600">{event.actor}</span>
                </TableCell>
                <TableCell>
                  <details className="cursor-pointer group">
                    <summary className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1">
                      Toon details
                    </summary>
                    <pre className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 overflow-x-auto max-w-md">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
