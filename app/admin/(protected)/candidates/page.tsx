"use client"

import { useEffect, useState } from "react"

interface Candidate {
  id: string
  email: string
  full_name: string | null
  company: string | null
  created_at: string
  updated_at: string
  user_id: string | null
  quiz_id: string | null
}

interface DeleteCandidateButtonProps {
  candidateId: string
  candidateName: string
  onDeleted: () => void
}

function DeleteCandidateButton({ candidateId, candidateName, onDeleted }: DeleteCandidateButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm(`Weet je zeker dat je "${candidateName}" wilt verwijderen? Dit kan niet ongedaan gemaakt worden.`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/candidates/delete?id=${candidateId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Verwijdering mislukt')
        return
      }

      onDeleted()
    } catch (e) {
      setError('Fout bij verwijdering')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <span className="text-red-600 text-xs">{error}</span>
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50 hover:underline"
    >
      {loading ? 'Verwijderen...' : '🗑️ Verwijderen'}
    </button>
  )
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [filtered, setFiltered] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "email" | "created">("created")

  useEffect(() => {
    loadCandidates()
  }, [])

  async function loadCandidates() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/candidates/list")
      const data = await res.json()
      setCandidates(data.candidates || [])
    } catch (e) {
      console.error("Failed to load candidates:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let result = candidates

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          c.email.toLowerCase().includes(term) ||
          (c.full_name?.toLowerCase().includes(term) ?? false) ||
          (c.company?.toLowerCase().includes(term) ?? false)
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "name") {
        return (a.full_name || "").localeCompare(b.full_name || "")
      } else if (sortBy === "email") {
        return a.email.localeCompare(b.email)
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    setFiltered(result)
  }, [candidates, searchTerm, sortBy])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Deelnemers</h1>
        <p className="text-gray-600">Totaal: {candidates.length}</p>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Zoeken</label>
            <input
              type="text"
              placeholder="Email, naam of bedrijf..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Sorteren op</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="created">Nieuwste eerst</option>
              <option value="name">Naam</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadCandidates}
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
              <th className="p-3">Bedrijf</th>
              <th className="p-3">Aangemaakt</th>
              <th className="p-3">Acties</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-3 text-center text-gray-500">
                  Laden…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-3 text-center text-gray-500">
                  Geen deelnemers gevonden
                </td>
              </tr>
            ) : (
              filtered.map((candidate) => (
                <tr key={candidate.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{candidate.email}</td>
                  <td className="p-3">{candidate.full_name || "—"}</td>
                  <td className="p-3">{candidate.company || "—"}</td>
                  <td className="p-3 text-xs text-gray-500">
                    {new Date(candidate.created_at).toLocaleDateString("nl-NL")}
                  </td>
                  <td className="p-3">
                    <DeleteCandidateButton candidateId={candidate.id} candidateName={candidate.full_name || candidate.email} onDeleted={loadCandidates} />
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
