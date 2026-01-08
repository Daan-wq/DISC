'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function NoAccessInner() {
  const searchParams = useSearchParams()
  const reason = searchParams?.get('reason') || 'not-listed'

  const isUsed = reason === 'used'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Geen toegang</h1>
        
        <p className="text-gray-700 mb-6">
          Je hebt geen toegang tot deze vragenlijst. Neem <a href="https://tlcprofielen.nl/contact/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">contact</a> op met de organisator of probeer het later opnieuw.
        </p>
        
        <a
          href="/login"
          className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Terug naar login
        </a>
      </div>
    </div>
  )
}

export default function NoAccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Bezig met laden...</h1>
        </div>
      </div>
    }>
      <NoAccessInner />
    </Suspense>
  )
}
