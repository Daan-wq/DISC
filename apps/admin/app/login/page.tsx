"use client"

import { useState, Suspense, useEffect } from "react"
import { useRouter } from "next/navigation"

function LoginInner() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [totpCode, setTotpCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needs2FA, setNeeds2FA] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileWidgetId, setTurnstileWidgetId] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const renderTurnstile = () => {
    if (!siteKey) return
    if (typeof window === 'undefined' || !(window as any).turnstile) return
    const container = document.getElementById('turnstile-widget')
    if (container) container.innerHTML = ''
    const widgetId = (window as any).turnstile.render('#turnstile-widget', {
      sitekey: siteKey,
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(null),
      'error-callback': () => setTurnstileToken(null),
    })
    if (widgetId !== undefined && widgetId !== null) setTurnstileWidgetId(String(widgetId))
  }

  const hardResetTurnstile = () => {
    if (needs2FA) return
    try {
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        if (turnstileWidgetId) {
          ;(window as any).turnstile.remove(turnstileWidgetId)
        }
      }
    } catch {}
    const container = document.getElementById('turnstile-widget')
    if (container) container.innerHTML = ''
    setTurnstileToken(null)
    setTurnstileWidgetId(null)
    setTimeout(() => {
      try {
        renderTurnstile()
      } catch {}
    }, 0)
  }

  const resetTurnstile = () => {
    if (needs2FA) return
    try {
      if (typeof window !== 'undefined' && (window as any).turnstile) {
        if (turnstileWidgetId) {
          ;(window as any).turnstile.reset(turnstileWidgetId)
        } else {
          ;(window as any).turnstile.reset()
        }
      }
    } catch {}
    setTurnstileToken(null)
  }

  // Countdown timer for rate limit
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setTimeout(() => setCooldownSeconds(cooldownSeconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldownSeconds])

  // Load Turnstile widget
  useEffect(() => {
    if (!siteKey) return

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      renderTurnstile()
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const normalized = username.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError("Vul een geldig e-mailadres in.")
      setIsSubmitting(false)
      return
    }

    try {
      if (!needs2FA && (!turnstileToken || turnstileToken.length < 10)) {
        setError('Captcha verificatie ontbreekt. Rond de captcha af en probeer opnieuw.')
        setIsSubmitting(false)
        return
      }

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: normalized, 
          password,
          totpCode: totpCode || null,
          turnstileToken: turnstileToken || null
        })
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 429) {
        const retryAfter = data.retryAfter || 900
        setCooldownSeconds(retryAfter)
        setError(`Te veel inlogpogingen. Probeer het over ${Math.ceil(retryAfter / 60)} minuten opnieuw.`)
        resetTurnstile()
        setIsSubmitting(false)
        return
      }

      if (data.code === 'totp_required') {
        setNeeds2FA(true)
        setTurnstileToken(null)
        setError(null)
        setIsSubmitting(false)
        return
      }

      if (!res.ok || !data.ok) {
        if (data.code === 'invalid_totp') {
          setError('Ongeldige 2FA code. Probeer het opnieuw.')
        } else if (data.code === 'user_not_found') {
          setError('Onbekend admin account. Controleer je e-mailadres.')
        } else if (data.code === 'wrong_password') {
          setError('Onjuist wachtwoord. Probeer het opnieuw.')
        } else if (data.code === 'captcha_token_missing' || data.code === 'turnstile_failed') {
          setError('Captcha verificatie mislukt. Ververs de pagina en probeer opnieuw.')
        } else {
          setError('Ongeldige inloggegevens.')
        }

        hardResetTurnstile()

        setIsSubmitting(false)
        return
      }

      // Success - redirect to admin dashboard
      router.push('/')
    } catch {
      setError('Er ging iets mis. Probeer het later opnieuw.')
      hardResetTurnstile()
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">E-mailadres</label>
            <input
              id="username"
              type="email"
              name="username"
              autoComplete="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={needs2FA}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Wachtwoord</label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
              disabled={needs2FA}
            />
          </div>
          {needs2FA && (
            <div>
              <label className="block text-sm font-medium mb-2">2FA Code (6 cijfers)</label>
              <input
                id="totpCode"
                type="text"
                name="totpCode"
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-3 py-2 border rounded-md"
                maxLength={6}
                pattern="[0-9]{6}"
                required
              />
            </div>
          )}
          {!needs2FA && (
            <div id="turnstile-widget"></div>
          )}
          {error && (
            <div className="p-2 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            disabled={isSubmitting || cooldownSeconds > 0 || (!needs2FA && !turnstileToken)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Bezig...' : cooldownSeconds > 0 ? `Wacht ${Math.ceil(cooldownSeconds / 60)}m` : needs2FA ? 'Verifieer 2FA' : 'Inloggen'}
          </button>
          {needs2FA && (
            <button
              type="button"
              onClick={() => {
                setNeeds2FA(false)
                setTotpCode('')
                setError(null)
              }}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              Terug naar login
            </button>
          )}
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
