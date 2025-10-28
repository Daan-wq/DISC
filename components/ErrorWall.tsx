import React from 'react'

type ErrorWallProps = {
  title?: string
  message: string
  details?: { code?: string; message?: string; hint?: string } | null
  onRetry?: () => void
  backHref?: string
  supportHref?: string
}

export default function ErrorWall({ title = 'Er ging iets mis', message, details, onRetry, backHref = '/login', supportHref = 'https://tlcprofielen.nl/contact/' }: ErrorWallProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">{title}</h1>
        <p className="text-gray-700 mb-4">{message}</p>
        {details?.message && <p className="text-gray-700 mb-4">{details.message}</p>}
        <div className="flex flex-col gap-3 items-center">
          {onRetry && (
            <button onClick={onRetry} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full">
              Opnieuw proberen
            </button>
          )}
          <a href={backHref} className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 w-full text-center">
            Terug naar inloggen
          </a>
          <a href={supportHref} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-blue-600 underline">
            Contact opnemen
          </a>
        </div>
      </div>
    </div>
  )
}
