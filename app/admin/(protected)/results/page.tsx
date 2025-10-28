"use client"

import { useEffect, useState } from "react"

interface PDFDownloadLinkProps {
  attemptId: string
  filename: string | null
  expiresAt: string | null
}

function PDFDownloadLink({ attemptId, filename, expiresAt }: PDFDownloadLinkProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isExpired = expiresAt && new Date(expiresAt) < new Date()

  const handleDownload = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/pdf-download?attempt_id=${attemptId}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Download failed')
        return
      }

      const data = await res.json()
      const link = document.createElement('a')
      link.href = data.url
      link.download = data.filename || 'DISC-rapport.pdf'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      setError('Download error')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (isExpired) {
    return <span className="text-red-600 text-xs">Verlopen</span>
  }

  if (error) {
    return <span className="text-red-600 text-xs">{error}</span>
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="text-blue-600 hover:underline text-xs disabled:opacity-50"
    >
      {loading ? 'Downloaden...' : '📄 Download'}
    </button>
  )
}

interface QuizAttempt {
  id: string
  user_id: string
  quiz_id: string
  started_at: string
  finished_at: string | null
  score: number | null
  result_payload: any
  pdf_path: string | null
  pdf_created_at: string | null
  pdf_filename: string | null
  pdf_expires_at: string | null
  alert: boolean
  candidate_email: string
  candidate_name: string | null
  answers?: {
    id: string
    candidate_id: string
    raw_answers: string[] | null
    answers_export_txt: string | null
  } | null
}

export default function ResultsPage() {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([])
  const [filtered, setFiltered] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "pending">("all")
  const [sortBy, setSortBy] = useState<"date">("date")

  useEffect(() => {
    loadResults()
  }, [])

  async function loadResults() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/results/list")
      const data = await res.json()
      setAttempts(data.attempts || [])
    } catch (e) {
      console.error("Failed to load results:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = attempts

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (a) =>
          a.candidate_email.toLowerCase().includes(term) ||
          (a.candidate_name?.toLowerCase().includes(term) ?? false)
      )
    }

    // Filter by status
    if (filterStatus === "completed") {
      result = result.filter((a) => a.finished_at !== null)
    } else if (filterStatus === "pending") {
      result = result.filter((a) => a.finished_at === null)
    }

    // Sort by date
    result = [...result].sort((a, b) => {
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    })

    setFiltered(result)
  }, [attempts, searchTerm, filterStatus, sortBy])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Resultaten</h1>
        <p className="text-gray-600">Totaal: {attempts.length}</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Zoeken</label>
            <input
              type="text"
              placeholder="Email of naam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="all">Alle</option>
              <option value="completed">Voltooid</option>
              <option value="pending">In behandeling</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadResults}
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
              <th className="p-3">Email</th>
              <th className="p-3">Naam</th>
              <th className="p-3">Status</th>
              <th className="p-3">Antwoorden</th>
              <th className="p-3">PDF</th>
              <th className="p-3">Alert</th>
              <th className="p-3">Gestart</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-3 text-center text-gray-500">
                  Laden…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-3 text-center text-gray-500">
                  Geen resultaten gevonden
                </td>
              </tr>
            ) : (
              filtered.map((attempt) => (
                <tr key={attempt.id} className={`border-t hover:bg-gray-50 ${attempt.alert ? "bg-yellow-50" : ""}`}>
                  <td className="p-3 font-mono text-xs">{attempt.candidate_email}</td>
                  <td className="p-3">{attempt.candidate_name || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        attempt.finished_at
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {attempt.finished_at ? "Voltooid" : "In behandeling"}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {attempt.answers?.candidate_id ? (
                      <a
                        href={`/admin/answers/${attempt.answers.candidate_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        📋 Antwoorden ({attempt.answers.raw_answers?.length || 0})
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    {attempt.pdf_path ? (
                      <PDFDownloadLink attemptId={attempt.id} filename={attempt.pdf_filename} expiresAt={attempt.pdf_expires_at} />
                    ) : (
                      <span className="text-red-600 text-xs">Verlopen</span>
                    )}
                  </td>
                  <td className="p-3">
                    {attempt.alert ? (
                      <span className="text-yellow-600 font-semibold">⚠️</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(attempt.started_at).toLocaleDateString("nl-NL")}
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
