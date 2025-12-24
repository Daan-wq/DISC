"use client"

import { useEffect, useRef, useState } from "react"
import { Activity, Loader2, Users } from "lucide-react"
import { Card, CardContent } from '@/components/admin/ui/Card'
import { Badge } from '@/components/admin/ui/Badge'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { EmptyState } from '@/components/admin/ui/EmptyState'
import { StatCard } from '@/components/admin/ui/StatCard'

interface ActivityItem {
  user_id: string
  quiz_id: string
  heartbeat_at: string
  candidate_email: string
  candidate_name: string | null
}

export default function LiveActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadActivity()
    intervalRef.current = setInterval(loadActivity, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  async function loadActivity() {
    try {
      const res = await fetch("/api/admin/activity/live", { credentials: 'include' })
      if (res.status === 401) {
        setUnauthorized(true)
        setLoading(false)
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        return
      }
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
      <PageHeader
        title="Live Activiteit"
        description={lastUpdate ? `Laatste update: ${lastUpdate.toLocaleTimeString("nl-NL")}` : 'Laden...'}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Actieve gebruikers"
          value={activities.length}
          subtitle="Op dit moment bezig"
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              title="Geen actieve gebruikers"
              description="Er zijn momenteel geen gebruikers bezig met de quiz."
              icon={<Activity className="h-8 w-8" />}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <Card key={activity.user_id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {activity.candidate_name || "Onbekend"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">
                      {activity.candidate_email}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="success">Live</Badge>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Laatst actief:</span>
                    <span className="font-medium text-emerald-600">
                      {getTimeAgo(activity.heartbeat_at)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Quiz:</span>
                    <span className="font-mono text-slate-600 text-xs">
                      {activity.quiz_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
