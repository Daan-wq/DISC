'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Download, ChevronLeft, ChevronRight, Star } from 'lucide-react'

interface Feedback {
  id: string
  full_name: string
  email: string
  q1_personal_email: number
  q2_clear_instructions: number
  q3_pleasant_experience: number
  q4_self_recognition: number
  q5_need_explanation: number
  q6_comments: string | null
  created_at: string
}

interface Averages {
  q1: string
  q2: string
  q3: string
  q4: string
  q5: string
  total: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const questionLabels = {
  q1_personal_email: 'Persoonlijke mail',
  q2_clear_instructions: 'Duidelijke instructies',
  q3_pleasant_experience: 'Prettig invullen',
  q4_self_recognition: 'Herkenning uitkomsten',
  q5_need_explanation: 'Behoefte aan uitleg',
}

function ScoreCell({ score }: { score: number }) {
  const color = score >= 8 ? 'text-green-600 bg-green-50' 
    : score >= 6 ? 'text-blue-600 bg-blue-50'
    : score >= 4 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50'
  
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${color}`}>
      {score}
    </span>
  )
}

function AverageCard({ label, value }: { label: string; value: string }) {
  const numValue = parseFloat(value)
  const color = numValue >= 8 ? 'border-green-200 bg-green-50' 
    : numValue >= 6 ? 'border-blue-200 bg-blue-50'
    : numValue >= 4 ? 'border-yellow-200 bg-yellow-50'
    : 'border-red-200 bg-red-50'
  
  return (
    <div className={`p-4 rounded-lg border ${color}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [averages, setAverages] = useState<Averages | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchFeedback = async (page: number = 1) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/feedback/list?page=${page}&limit=20`)
      if (!response.ok) throw new Error('Failed to fetch feedback')
      
      const data = await response.json()
      setFeedback(data.feedback || [])
      setAverages(data.averages)
      setPagination(data.pagination)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
  }, [])

  const exportCSV = () => {
    if (feedback.length === 0) return
    
    const headers = ['Datum', 'Naam', 'Email', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Opmerkingen']
    const rows = feedback.map(f => [
      new Date(f.created_at).toLocaleDateString('nl-NL'),
      f.full_name,
      f.email,
      f.q1_personal_email,
      f.q2_clear_instructions,
      f.q3_pleasant_experience,
      f.q4_self_recognition,
      f.q5_need_explanation,
      `"${(f.q6_comments || '').replace(/"/g, '""')}"`,
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `feedback-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading && feedback.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedback Overzicht</h1>
            <p className="text-gray-500 text-sm">{pagination.total} reacties ontvangen</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          disabled={feedback.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {averages && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Gemiddelde Scores ({averages.total} responses)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <AverageCard label="Persoonlijke mail" value={averages.q1} />
            <AverageCard label="Duidelijke instructies" value={averages.q2} />
            <AverageCard label="Prettig invullen" value={averages.q3} />
            <AverageCard label="Herkenning" value={averages.q4} />
            <AverageCard label="Behoefte uitleg" value={averages.q5} />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Naam</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q1</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q2</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q3</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q4</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Q5</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Gem.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opmerkingen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {feedback.map((f) => {
                const avg = ((f.q1_personal_email + f.q2_clear_instructions + f.q3_pleasant_experience + f.q4_self_recognition + f.q5_need_explanation) / 5).toFixed(1)
                const hasComments = f.q6_comments && f.q6_comments.trim().length > 0
                
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(f.created_at).toLocaleDateString('nl-NL')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{f.full_name}</div>
                      <div className="text-xs text-gray-500">{f.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center"><ScoreCell score={f.q1_personal_email} /></td>
                    <td className="px-4 py-3 text-center"><ScoreCell score={f.q2_clear_instructions} /></td>
                    <td className="px-4 py-3 text-center"><ScoreCell score={f.q3_pleasant_experience} /></td>
                    <td className="px-4 py-3 text-center"><ScoreCell score={f.q4_self_recognition} /></td>
                    <td className="px-4 py-3 text-center"><ScoreCell score={f.q5_need_explanation} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold text-gray-900">{avg}</span>
                    </td>
                    <td className="px-4 py-3">
                      {hasComments ? (
                        <button
                          onClick={() => setExpandedId(expandedId === f.id ? null : f.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          {expandedId === f.id ? 'Verberg' : 'Bekijk'}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {feedback.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    Nog geen feedback ontvangen
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {expandedId && (
          <div className="border-t border-gray-200 p-4 bg-blue-50">
            <h4 className="font-medium text-gray-900 mb-2">Opmerkingen:</h4>
            <p className="text-gray-700 whitespace-pre-wrap">
              {feedback.find(f => f.id === expandedId)?.q6_comments}
            </p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Pagina {pagination.page} van {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchFeedback(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => fetchFeedback(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
