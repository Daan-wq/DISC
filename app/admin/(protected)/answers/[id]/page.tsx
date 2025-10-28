"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

interface Answer {
  id: string
  candidate_id: string
  raw_answers: string[] | null
  answers_export_txt: string | null
  created_at: string
  updated_at: string
}

interface CandidateInfo {
  id: string
  email: string
  full_name: string | null
  company: string | null
}

export default function AnswersViewerPage() {
  const params = useParams()
  const candidateId = params.id as string

  const [answer, setAnswer] = useState<Answer | null>(null)
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAnswers()
  }, [candidateId])

  async function loadAnswers() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/answers/${candidateId}`)
      const data = await res.json()

      if (!res.ok || !data.answer) {
        setError("Antwoorden niet gevonden")
        return
      }

      setAnswer(data.answer)
      setCandidate(data.candidate)
    } catch (e) {
      console.error("Failed to load answers:", e)
      setError("Fout bij laden van antwoorden")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Laden…</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">{error}</div>
      </div>
    )
  }

  if (!answer || !candidate) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-gray-700">
          Geen antwoorden gevonden
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Antwoorden</h1>
        <div className="bg-white border rounded-lg p-4 space-y-2">
          <p>
            <span className="font-medium">Email:</span> {candidate.email}
          </p>
          <p>
            <span className="font-medium">Naam:</span> {candidate.full_name || "—"}
          </p>
          {candidate.company && (
            <p>
              <span className="font-medium">Bedrijf:</span> {candidate.company}
            </p>
          )}
          <p>
            <span className="font-medium">Aangemaakt:</span>{" "}
            {new Date(answer.created_at).toLocaleString("nl-NL")}
          </p>
        </div>
      </div>

      {answer.answers_export_txt && (
        <div className="bg-white border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Geëxporteerde antwoorden</h2>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap break-words">
            {answer.answers_export_txt}
          </pre>
        </div>
      )}

    </div>
  )
}
