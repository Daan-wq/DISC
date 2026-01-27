'use client'

import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.error('[global-error]', error)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Er ging iets mis
        </h2>
        <p className="text-gray-600 mb-6">
          Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem contact op met support.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Opnieuw proberen
          </button>
          <Link href="/" className="px-6 py-3 text-gray-600 hover:text-gray-900 transition">
            Terug naar home
          </Link>
        </div>
      </div>
    </div>
  )
}
