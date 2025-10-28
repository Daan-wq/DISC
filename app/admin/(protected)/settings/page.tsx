"use client"

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Load current maintenance mode status on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/admin/settings/maintenance')
        const data = await res.json()
        if (mounted) {
          setMaintenanceMode(data.enabled === true)
        }
      } catch (e) {
        console.error('Failed to load maintenance mode:', e)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  async function toggleMaintenanceMode(enabled: boolean) {
    try {
      setSaving(true)
      setMessage(null)

      const res = await fetch('/api/admin/settings/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!res.ok) {
        throw new Error('Fout bij opslaan')
      }

      setMaintenanceMode(enabled)
      setMessage({
        type: 'success',
        text: enabled ? 'Onderhoudsmodus ingeschakeld' : 'Onderhoudsmodus uitgeschakeld',
      })
    } catch (e) {
      console.error('Error:', e)
      setMessage({
        type: 'error',
        text: 'Fout bij opslaan van instellingen',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Instellingen</h1>
        <div className="text-center text-gray-500">Laden…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Instellingen</h1>

      <section className="border rounded-lg p-6 bg-white space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Onderhoudsmodus</h2>
          <p className="text-sm text-gray-600 mb-4">
            Wanneer ingeschakeld, zien eindgebruikers een onderhoudsbericht in plaats van de quiz.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-gray-600">
              {maintenanceMode ? '🔴 Onderhoudsmodus ACTIEF' : '🟢 Normaal bedrijf'}
            </p>
          </div>
          <button
            onClick={() => toggleMaintenanceMode(!maintenanceMode)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              maintenanceMode
                ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400'
                : 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400'
            }`}
          >
            {saving ? 'Bezig…' : maintenanceMode ? 'Uitschakelen' : 'Inschakelen'}
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </section>

    </div>
  )
}
