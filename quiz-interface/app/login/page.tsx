"use client"

import { useState, Suspense, useEffect } from "react"
import { useSearchParams } from "next/navigation"

function toProperCase(str: string): string {
  if (!str) return str
  // Split on spaces, hyphens, and apostrophes while preserving delimiters
  return str
    .split(/(\s|-|')/g)
    .map((part, idx) => {
      // Keep delimiters as-is (odd indices are delimiters after split)
      if (idx % 2 === 1) return part
      // Capitalize first letter, lowercase the rest
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join('')
}

function LoginInner() {
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const search = useSearchParams()

  // Countdown timer for rate limit
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldownSeconds])

  // Check maintenance mode on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/public/maintenance-status')
        const data = await res.json()
        if (mounted) {
          setMaintenanceMode(data.enabled === true)
        }
      } catch (e) {
        console.error('Failed to check maintenance mode:', e)
      }
    })()
    return () => { mounted = false }
  }, [])

  async function requestMagicLink(e: React.FormEvent) {
    e.preventDefault()
    
    // Prevent double submission
    
    setError(null)
    setIsSubmitting(true)

    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Vul een geldig e-mailadres in.")
      setIsSubmitting(false)
      return
    }

    try {
      // Request server to verify allowlist and send magic link atomically
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      const redirectParam = search.get('redirect') || '/quiz'
      const redirectTo = `${baseUrl}/auth/callback?redirect=${encodeURIComponent(redirectParam)}`

      const res = await fetch('/api/auth/request-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: normalized, 
          redirectTo,
          first_name: firstName.trim(),
          last_name: lastName.trim()
        })
      })
      const j = await res.json().catch(() => ({ sent: false }))
      if (!j?.sent) {
        if (j?.reason === 'NO_ACCESS') {
          setError('NO_ACCESS')
        } else if (j?.reason === 'SUPABASE_RATE_LIMIT') {
          const seconds = j?.retryAfterSeconds || 60
          setCooldownSeconds(seconds)
          setError(`Te veel inlogpogingen. Wacht ${seconds} seconde${seconds !== 1 ? 'n' : ''} voordat je het opnieuw probeert.`)
        } else if (res.status === 429 || j?.reason === 'RATE_LIMITED') {
          setCooldownSeconds(60)
          setError('Te veel pogingen. Probeer het over een minuut opnieuw.')
        } else {
          setError('Er ging iets mis bij het versturen van de inloglink. Probeer het later opnieuw.')
        }
        setIsSubmitting(false)
        return
      }
      setSentEmail(normalized)
      setSent(true)
      setCooldownSeconds(0)
    } catch {
      // Neutral response regardless of existence
      setError('Er ging iets mis bij het versturen van de inloglink. Probeer het later opnieuw.')
      setIsSubmitting(false)
    }
  }

  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-yellow-600">Quiz in onderhoud</h1>
          <p className="text-gray-700">Deze quiz is momenteel tijdelijk in onderhoud. Kom later terug.</p>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Controleer je e-mail</h1>
          <p className="text-gray-600 mb-2">U ontvangt een email van TLC Profielen met een inloglink:</p>
          <p className="text-lg font-semibold text-gray-900">{sentEmail}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Inloggen</h1>
        <form onSubmit={requestMagicLink} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Voornaam</label>
              <input
                id="firstName"
                type="text"
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(toProperCase(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Achternaam</label>
              <input
                id="lastName"
                type="text"
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(toProperCase(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">E-mailadres</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>
          {error && (
            <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
              {error === 'NO_ACCESS' ? (
                <span>
                  Je e-mailadres staat (nog) niet op de toegangslijst voor deze quiz. Neem{' '}
                  <a
                    href="https://tlcprofielen.nl/contact/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    contact
                  </a>
                  {' '}op met de organisator of probeer het later opnieuw.
                </span>
              ) : (
                error
              )}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting || cooldownSeconds > 0}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Bezig...' : cooldownSeconds > 0 ? `Wacht ${cooldownSeconds}s` : 'Stuur inloglink'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Bezig met laden...</h1>
        </div>
      </div>
    }>
      <LoginInner />
    </Suspense>
  )
}
