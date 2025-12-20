"use client"

import { useEffect, useState } from "react"

interface Activity {
  user_id: string
  quiz_id: string
  heartbeat_at: string
  candidate_email: string
  candidate_name: string | null
}

export default function LiveActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    loadActivity()
    const interval = setInterval(loadActivity, 3000) // Refresh every 3 seconds
    return () => clearInterval(interval)
  }, [])

  async function loadActivity() {
    try {
      const res = await fetch("/api/admin/activity/live")
      const data = await res.json()
      setActivities(data.activities || [])
      setLastUpdate(new Date())
      setLoading(false)
    } catch (e) {
      console.error("Failed to load activity:", e)
    }
  }

  const getTimeAgo = (date: string): string => {
    const now = new Date()
    const then = new Date(date)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s geleden`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m geleden`
    return `${Math.floor(seconds / 3600)}h geleden`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Live Activiteit</h1>
        <p className="text-gray-600">
          Actieve gebruikers: {activities.length}
          {lastUpdate && (
            <span className="text-xs text-gray-500 ml-4">
              Bijgewerkt: {lastUpdate.toLocaleTimeString("nl-NL")}
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Laden…</div>
      ) : activities.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-gray-500">
          Geen actieve gebruikers
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <div
              key={activity.user_id}
              className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{activity.candidate_name || "Onbekend"}</div>
                  <div className="text-xs text-gray-500 font-mono">{activity.candidate_email}</div>
                </div>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Actief:</span>
                  <span className="font-medium text-green-600">
                    {getTimeAgo(activity.heartbeat_at)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Quiz ID:</span>
                  <span className="font-mono text-gray-700">{activity.quiz_id.slice(0, 8)}…</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
