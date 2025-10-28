"use client"

import { useState, useEffect } from "react"

declare global {
  interface Window {
    turnstile?: { reset: (id?: string) => void }
    turnstileCallback?: (token: string) => void
    turnstileExpired?: () => void
    turnstileError?: () => void
  }
}

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [siteKey, setSiteKey] = useState<string | null>(null)
  const [tfToken, setTfToken] = useState<string | null>(null)

  useEffect(() => {
    setSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || null)
    // Register global callbacks expected by Turnstile
    window.turnstileCallback = (token: string) => {
      setTfToken(token)
    }
    window.turnstileExpired = () => {
      setTfToken(null)
    }
    window.turnstileError = () => {
      setTfToken(null)
    }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Require a fresh token produced by the widget (only if Turnstile is configured)
      if (siteKey && !tfToken) {
        setError('Beveiligingscontrole bezig of verlopen. Wacht even en probeer opnieuw.')
        window.turnstile?.reset()
        setLoading(false)
        return
      }
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, turnstileToken: tfToken })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Friendlier errors for common cases
        if (j?.code === 'wrong_username' || j?.code === 'wrong_password') {
          setError('Onjuiste gebruikersnaam of wachtwoord.')
        } else if (j?.code === 'turnstile_failed') {
          const code = j?.details?.codes?.[0]
          if (code === 'timeout-or-duplicate') {
            setError('Beveiligingstoken verlopen. We hebben het ververst, probeer opnieuw.')
          } else if (code === 'invalid-input-secret') {
            setError('Serverbeveiliging ongeldig geconfigureerd. Neem contact op met beheerder.')
          } else if (code === 'invalid-input-response') {
            setError('Beveiligingstoken ongeldig. Probeer opnieuw in te loggen.')
          } else {
            setError(j?.error || 'Inloggen mislukt')
          }
        } else {
          setError(j?.error || 'Inloggen mislukt')
        }
        // Always reset the widget so a new token is generated
        window.turnstile?.reset()
        setTfToken(null)
        setLoading(false)
        return
      }
      window.location.href = '/admin'
    } catch (e) {
      setError('Onbekende fout')
      window.turnstile?.reset()
      setTfToken(null)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Admin Inloggen</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">E-mailadres</label>
            <input id="username" name="username" autoComplete="username" type="email" className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">Wachtwoord</label>
            <input id="password" name="password" autoComplete="current-password" type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <div>
            {siteKey && (
              <>
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                <div
                  className="cf-turnstile"
                  data-sitekey={siteKey}
                  data-callback="turnstileCallback"
                  data-expired-callback="turnstileExpired"
                  data-error-callback="turnstileError"
                  data-refresh-expired="auto"
                ></div>
              </>
            )}
          </div>
          {error && <div className="text-sm p-2 bg-red-100 text-red-700 rounded">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Bezig…' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
