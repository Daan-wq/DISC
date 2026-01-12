"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, FileText, RefreshCw, Search, AlertTriangle, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from '../../components/admin/ui/Card'
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

      const res = await fetch(`/api/admin/pdf-download?attempt_id=${attemptId}`, { credentials: 'include' })
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
    return <Badge variant="error">Verlopen</Badge>
  }

  if (error) {
    return <Badge variant="error">{error}</Badge>
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
    >
      <Download className="h-4 w-4" />
      {loading ? 'Laden...' : 'PDF'}
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

  useEffect(() => {
    loadResults()
  }, [])

  async function loadResults() {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/results/list", { credentials: 'include' })
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

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (a) =>
          a.candidate_email.toLowerCase().includes(term) ||
          (a.candidate_name?.toLowerCase().includes(term) ?? false)
      )
    }

    if (filterStatus === "completed") {
      result = result.filter((a) => a.finished_at !== null)
    } else if (filterStatus === "pending") {
      result = result.filter((a) => a.finished_at === null)
    }

    result = [...result].sort((a, b) => {
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    })

    setFiltered(result)
  }, [attempts, searchTerm, filterStatus])

  const completedCount = attempts.filter(a => a.finished_at).length
  const pendingCount = attempts.filter(a => !a.finished_at).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resultaten"
        description={`${attempts.length} resultaten totaal`}
        action={
          <Button
            variant="outline"
            onClick={loadResults}
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
                placeholder="Zoeken op email of naam..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                options={[
                  { value: "all", label: `Alle (${attempts.length})` },
                  { value: "completed", label: `Voltooid (${completedCount})` },
                  { value: "pending", label: `Bezig (${pendingCount})` },
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
            <TableHead>Status</TableHead>
            <TableHead>Antwoorden</TableHead>
            <TableHead>PDF</TableHead>
            <TableHead>Alert</TableHead>
            <TableHead>Datum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableLoading colSpan={6} />
          ) : filtered.length === 0 ? (
            <TableEmpty
              colSpan={6}
              message="Geen resultaten gevonden"
            />
          ) : (
            filtered.map((attempt) => (
              <TableRow key={attempt.id} highlight={attempt.alert}>
                <TableCell>
                  <div>
                    <div className="font-medium text-slate-900">{attempt.candidate_name || "Onbekend"}</div>
                    <div className="text-xs text-slate-500 font-mono">{attempt.candidate_email}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={attempt.finished_at ? "success" : "info"}>
                    {attempt.finished_at ? "Voltooid" : "Bezig"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {attempt.answers?.candidate_id ? (
                    <Link
                      href={`/answers/${attempt.answers.candidate_id}`}
                      className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      {attempt.answers.raw_answers?.length || 0}
                    </Link>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {attempt.pdf_path ? (
                    <PDFDownloadLink
                      attemptId={attempt.id}
                      filename={attempt.pdf_filename}
                      expiresAt={attempt.pdf_expires_at}
                    />
                  ) : (
                    <Badge variant="error">Geen PDF</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {attempt.alert ? (
                    <div className="relative group inline-flex">
                      <div className="flex items-center gap-1 text-amber-600 cursor-help">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap shadow-lg" style={{ zIndex: 9999 }}>
                        <div className="font-medium mb-1">Afwijkend scorepatroon</div>
                        <div className="text-slate-300">Alle DISC scores zijn uniform hoog of laag.</div>
                        <div className="text-slate-300">Controleer de antwoorden handmatig.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600" title="Geen afwijkingen">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-slate-600">
                    {new Date(attempt.started_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
