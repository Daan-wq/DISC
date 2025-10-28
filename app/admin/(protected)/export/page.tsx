"use client"

import { useState } from "react"

export default function ExportPage() {
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [exportType, setExportType] = useState<"candidates" | "results" | "answers">("results")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleExport() {
    try {
      setExporting(true)
      setMessage(null)

      const res = await fetch(`/api/admin/export/${exportType}?format=${exportFormat}`)

      if (!res.ok) {
        throw new Error("Export mislukt")
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = res.headers.get("Content-Disposition")
      let filename = `export-${exportType}-${new Date().toISOString().split("T")[0]}.${exportFormat}`

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Download file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({
        type: "success",
        text: `Export voltooid: ${filename}`,
      })
    } catch (e) {
      console.error("Export error:", e)
      setMessage({
        type: "error",
        text: "Export mislukt. Probeer het later opnieuw.",
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Export & Rapporten</h1>
        <p className="text-gray-600">Download gegevens in CSV of JSON formaat</p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-6 max-w-2xl">
        <div>
          <label className="block text-sm font-medium mb-3">Wat wil je exporteren?</label>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="results"
                checked={exportType === "results"}
                onChange={(e) => setExportType(e.target.value as any)}
                className="mr-3"
              />
              <span className="font-medium">Resultaten</span>
              <span className="text-gray-500 text-sm ml-2">(Scores, PDF status, etc.)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="candidates"
                checked={exportType === "candidates"}
                onChange={(e) => setExportType(e.target.value as any)}
                className="mr-3"
              />
              <span className="font-medium">Deelnemers</span>
              <span className="text-gray-500 text-sm ml-2">(Email, naam, bedrijf)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="exportType"
                value="answers"
                checked={exportType === "answers"}
                onChange={(e) => setExportType(e.target.value as any)}
                className="mr-3"
              />
              <span className="font-medium">Antwoorden</span>
              <span className="text-gray-500 text-sm ml-2">(Alle antwoorden per kandidaat)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Formaat</label>
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={exportFormat === "csv"}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="mr-3"
              />
              <span className="font-medium">CSV</span>
              <span className="text-gray-500 text-sm ml-2">(Excel, Google Sheets)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="format"
                value="json"
                checked={exportFormat === "json"}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="mr-3"
              />
              <span className="font-medium">JSON</span>
              <span className="text-gray-500 text-sm ml-2">(Voor integraties)</span>
            </label>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {exporting ? "Bezig met exporteren…" : "Download"}
        </button>
      </div>

      <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold text-sm">ℹ️ Informatie</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>• <strong>CSV</strong> is ideaal voor Excel en Google Sheets</li>
          <li>• <strong>JSON</strong> bevat alle gegevens in gestructureerde vorm</li>
          <li>• Alle exports bevatten alleen voltooide quizzes</li>
          <li>• Gevoelige gegevens worden niet geëxporteerd</li>
        </ul>
      </div>
    </div>
  )
}
