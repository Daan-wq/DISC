"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Search, Trash2 } from "lucide-react"
import { Card, CardContent } from '@/components/admin/ui/Card'
import { Badge } from '@/components/admin/ui/Badge'
import { Button } from '@/components/admin/ui/Button'
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog'
import { Input, Select } from '@/components/admin/ui/Input'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TableLoading,
} from '@/components/admin/ui/Table'

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
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDelete = async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch(`/api/admin/candidates/delete?id=${candidateId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Verwijdering mislukt')
        return false
      }

      onDeleted()
      return true
    } catch (e) {
      setError('Fout bij verwijdering')
      console.error(e)
      return false
    } finally {
      setLoading(false)
    }
  }

  if (error) {
    return <Badge variant="error">{error}</Badge>
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Kandidaat verwijderen"
        description={`Weet je zeker dat je "${candidateName}" wilt verwijderen?\nDit kan niet ongedaan gemaakt worden.`}
        confirmText="Verwijderen"
        cancelText="Annuleren"
        variant="danger"
        loading={loading}
        onCancel={() => {
          if (loading) return
          setConfirmOpen(false)
        }}
        onConfirm={async () => {
          const ok = await handleDelete()
          if (ok) setConfirmOpen(false)
        }}
      />
      <button
        onClick={() => setConfirmOpen(true)}
        disabled={loading}
        className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        title="Verwijderen"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
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
      const res = await fetch("/api/admin/candidates/list", { credentials: 'include' })
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

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          c.email.toLowerCase().includes(term) ||
          (c.full_name?.toLowerCase().includes(term) ?? false) ||
          (c.company?.toLowerCase().includes(term) ?? false)
      )
    }

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
      <PageHeader
        title="Deelnemers"
        description={`${candidates.length} deelnemers totaal`}
        action={
          <Button
            variant="outline"
            onClick={loadCandidates}
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
                placeholder="Zoeken op email, naam of bedrijf..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                options={[
                  { value: 'created', label: 'Nieuwste eerst' },
                  { value: 'name', label: 'Op naam' },
                  { value: 'email', label: 'Op email' },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Deelnemer</TableHead>
            <TableHead>Bedrijf</TableHead>
            <TableHead>Aangemaakt</TableHead>
            <TableHead>Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoading colSpan={4} />
          ) : filtered.length === 0 ? (
            <TableEmpty
              colSpan={4}
              message="Geen deelnemers gevonden"
            />
          ) : (
            filtered.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-900">{candidate.full_name || "Onbekend"}</div>
                    <div className="text-xs text-slate-500 font-mono">{candidate.email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  {candidate.company ? (
                    <Badge variant="outline">{candidate.company}</Badge>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-slate-600">
                    {new Date(candidate.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <DeleteCandidateButton
                    candidateId={candidate.id}
                    candidateName={candidate.full_name || candidate.email}
                    onDeleted={loadCandidates}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
