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
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials')
  const [totpCode, setTotpCode] = useState("")

  useEffect(() => {
    setSiteKey(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null)
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
      // Require a fresh token produced by the widget (only if Turnstile is configured AND we're on credentials step)
      if (step === 'credentials' && siteKey && !tfToken) {
        setError('Beveiligingscontrole bezig of verlopen. Wacht even en probeer opnieuw.')
        window.turnstile?.reset()
        setLoading(false)
        return
      }
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          turnstileToken: step === 'credentials' ? (tfToken ?? undefined) : undefined,
          totpCode: step === '2fa' ? totpCode : undefined,
        })
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Check if 2FA is required
        if (j?.code === 'totp_required') {
          setStep('2fa')
          setError(null)
          setLoading(false)
          return
        }
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
        } else if (j?.code === 'invalid_totp') {
          setError('Onjuiste 2FA code. Probeer opnieuw.')
        } else {
          setError(j?.error || 'Inloggen mislukt')
        }
        // Always reset the widget so a new token is generated
        window.turnstile?.reset()
        setTfToken(null)
        setLoading(false)
        return
      }
      window.location.href = '/'
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
        {step === 'credentials' ? (
          <>
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
              {error && <div className="text-sm p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>}
              <button type="submit" disabled={loading || (Boolean(siteKey) && !tfToken)} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium">
                {loading ? 'Bezig…' : 'Inloggen'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-center mb-2">Verificatie Vereist</h1>
              <p className="text-center text-gray-600 text-sm">Voer de 6-cijferige code in van je authenticator app</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="totp" className="block text-sm font-medium mb-2">Authenticatie Code</label>
                <input
                  id="totp"
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-3xl tracking-widest font-mono focus:border-blue-600 focus:outline-none"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">Controleer je authenticator app voor de code</p>
              </div>
              {error && <div className="text-sm p-3 bg-red-50 text-red-700 rounded border border-red-200">{error}</div>}
              <button type="submit" disabled={loading || totpCode.length !== 6} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium">
                {loading ? 'Bezig…' : 'Verifiëren'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('credentials')
                  setTotpCode('')
                  setError(null)
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 rounded hover:bg-gray-200 font-medium"
              >
                Terug
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
