'use client'

import { useState } from 'react'
// Remove server-side imports to fix client-side build errors

interface ResultActionsProps {
  candidateName: string
}

export default function ResultActions({ candidateName }: ResultActionsProps) {
  const [pdfLoading, setPdfLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleDownloadPDF = async () => {
    setPdfLoading(true)
    setMessage(null)
    
    try {
      const attemptId = typeof window !== 'undefined' ? localStorage.getItem('quizAttemptId') : null
      if (!attemptId) throw new Error('Geen attempt gevonden')

      // Request a signed URL for this attempt's PDF
      const res = await fetch('/api/documents/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: attemptId })
      })
      if (!res.ok) throw new Error('Kon geen ondertekende URL ophalen')
      const { signed_url, pdf_filename } = await res.json()
      if (!signed_url) throw new Error('Geen ondertekende URL ontvangen')

      // Start download using the friendly filename from the server
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = signed_url
      a.download = pdf_filename || `DISC-Profiel-${candidateName.replace(/\s+/g, '-')}.pdf`
      a.click()
      
      setMessage({ type: 'success', text: 'PDF succesvol gedownload' })
    } catch {
      console.error('Download failed')
      alert('Download mislukt. Probeer het opnieuw.')
    } finally {
      setPdfLoading(false)
      setTimeout(() => setMessage(null), 5000)
    }
  }

  // Email sturen gebeurt automatisch in de finish flow
  return (
    <>
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="flex gap-4">
        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {pdfLoading ? 'Genereren...' : 'Download PDF'}
        </button>
      </div>
    </>
  )
}
