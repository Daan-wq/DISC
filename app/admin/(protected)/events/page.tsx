"use client"

import { useEffect, useState } from "react"

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
      const res = await fetch("/api/admin/events/list")
      const data = await res.json()
      setEvents(data.events || [])

      // Extract unique event types
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

    // Filter by type
    if (filterType !== "all") {
      result = result.filter((e) => e.type === filterType)
    }

    // Filter by actor
    if (filterActor.trim()) {
      const term = filterActor.toLowerCase()
      result = result.filter((e) => e.actor.toLowerCase().includes(term))
    }

    // Sort by date (newest first)
    result = [...result].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    setFiltered(result)
  }, [events, filterType, filterActor])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Admin Audit Log</h1>
        <p className="text-gray-600">Totaal: {events.length} acties</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Actie type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="all">Alle</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Admin</label>
            <input
              type="text"
              placeholder="Email of naam..."
              value={filterActor}
              onChange={(e) => setFilterActor(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadEvents}
              className="w-full px-3 py-2 border rounded-md hover:bg-gray-50"
            >
              Vernieuwen
            </button>
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left border-b">
              <th className="p-3">Tijdstip</th>
              <th className="p-3">Type</th>
              <th className="p-3">Admin</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-3 text-center text-gray-500">
                  Laden…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-center text-gray-500">
                  Geen acties gevonden
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(event.created_at).toLocaleString("nl-NL")}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      {event.type}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs">{event.actor}</td>
                  <td className="p-3">
                    <details className="cursor-pointer">
                      <summary className="text-blue-600 hover:underline text-xs">
                        Toon details
                      </summary>
                      <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
