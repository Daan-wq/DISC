"use client"

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [twoFAMessage, setTwoFAMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [totpSecret, setTotpSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [twoFALoading, setTwoFALoading] = useState(false)

  // Load current maintenance mode and 2FA status on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [mainRes, twoFARes] = await Promise.all([
          fetch('/api/admin/settings/maintenance'),
          fetch('/api/admin/2fa/status')
        ])
        const mainData = await mainRes.json()
        const twoFAData = await twoFARes.json()
        if (mounted) {
          setMaintenanceMode(mainData.enabled === true)
          setIs2FAEnabled(twoFAData.totp_enabled || false)
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    })()
    return () => { mounted = false }
  }, [])

  async function toggleMaintenanceMode(enabled: boolean) {
    try {
      setSaving(true)
      setMessage(null)

      const res = await fetch('/api/admin/settings/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!res.ok) {
        throw new Error('Fout bij opslaan')
      }

      setMaintenanceMode(enabled)
      setMessage({
        type: 'success',
        text: enabled ? 'Onderhoudsmodus ingeschakeld' : 'Onderhoudsmodus uitgeschakeld',
      })
    } catch (e) {
      console.error('Error:', e)
      setMessage({
        type: 'error',
        text: 'Fout bij opslaan van instellingen',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateQR() {
    try {
      setTwoFALoading(true)
      setTwoFAMessage(null)
      const res = await fetch('/api/admin/2fa/generate', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setTwoFAMessage({ type: 'error', text: data.error || 'QR code generatie mislukt' })
        return
      }
      const data = await res.json()
      setQrCode(data.qrCode)
      setTotpSecret(data.secret)
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: 'QR code generatie mislukt' })
    } finally {
      setTwoFALoading(false)
    }
  }

  async function handleVerify2FA() {
    try {
      setTwoFALoading(true)
      if (!verificationCode || verificationCode.length !== 6) {
        setTwoFAMessage({ type: 'error', text: 'Voer een 6-cijferige code in' })
        return
      }
      if (!totpSecret) {
        setTwoFAMessage({ type: 'error', text: 'QR code niet gevonden. Probeer opnieuw.' })
        return
      }

      const res = await fetch('/api/admin/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: verificationCode, secret: totpSecret })
      })

      if (!res.ok) {
        const data = await res.json()
        setTwoFAMessage({ type: 'error', text: data.error || 'Verificatie mislukt' })
        return
      }

      setIs2FAEnabled(true)
      setQrCode(null)
      setTotpSecret(null)
      setVerificationCode('')
      setTwoFAMessage(null)
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: 'Verificatie mislukt' })
    } finally {
      setTwoFALoading(false)
    }
  }

  async function handleDisable2FA() {
    try {
      setTwoFALoading(true)
      const res = await fetch('/api/admin/2fa/disable', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        setTwoFAMessage({ type: 'error', text: data.error || '2FA uitschakelen mislukt' })
        return
      }
      setTwoFAMessage({ type: 'success', text: '2FA succesvol uitgeschakeld' })
      setIs2FAEnabled(false)
    } catch (err) {
      setTwoFAMessage({ type: 'error', text: '2FA uitschakelen mislukt' })
    } finally {
      setTwoFALoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold">Instellingen</h1>
        <div className="text-center text-gray-500 text-sm sm:text-base">Laden…</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Instellingen</h1>

      <section className="border rounded-lg p-4 sm:p-6 bg-white space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Onderhoudsmodus</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            Wanneer ingeschakeld, zien eindgebruikers een onderhoudsbericht in plaats van de quiz.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg border gap-3 sm:gap-4">
          <div>
            <p className="font-medium text-sm sm:text-base">Status</p>
            <p className="text-xs sm:text-sm text-gray-600">
              {maintenanceMode ? 'Onderhoudsmodus ACTIEF' : 'Normaal bedrijf'}
            </p>
          </div>
          <button
            onClick={() => toggleMaintenanceMode(!maintenanceMode)}
            disabled={saving}
            className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg font-medium transition-colors min-h-[44px] text-sm sm:text-base ${
              maintenanceMode
                ? 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400'
                : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400'
            }`}
          >
            {saving ? 'Bezig…' : maintenanceMode ? 'Uitschakelen' : 'Inschakelen'}
          </button>
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </section>

      <section className="border rounded-lg p-4 sm:p-6 bg-white space-y-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold mb-1 sm:mb-2">Twee-Factor Authenticatie (2FA)</h2>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
            Beveilig je account met een authenticator app (Google Authenticator, Authy, etc.)
          </p>
        </div>

        {is2FAEnabled ? (
          <div className="space-y-4">
            <div className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium text-sm sm:text-base">2FA is ingeschakeld op je account</p>
            </div>
            <button
              onClick={handleDisable2FA}
              disabled={twoFALoading}
              className="w-full px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition disabled:bg-gray-400 min-h-[44px] text-sm sm:text-base"
            >
              {twoFALoading ? 'Bezig…' : '2FA Uitschakelen'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!qrCode ? (
              <button
                onClick={handleGenerateQR}
                disabled={twoFALoading}
                className="w-full px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition disabled:bg-gray-400 min-h-[44px] text-sm sm:text-base"
              >
                {twoFALoading ? 'Bezig…' : 'QR Code Genereren'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">
                    Scan deze QR code met je authenticator app:
                  </p>
                  <img
                    src={qrCode}
                    alt="2FA QR Code"
                    className="w-40 h-40 sm:w-48 sm:h-48 mx-auto"
                  />
                  {totpSecret && (
                    <p className="text-xs text-gray-500 mt-3 break-all">
                      Handmatig: <code className="font-mono bg-white p-1 rounded text-xs">{totpSecret}</code>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Voer 6-cijferige code in:
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-center text-xl sm:text-2xl tracking-widest font-mono min-h-[44px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleVerify2FA}
                    disabled={twoFALoading}
                    className="flex-1 px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition disabled:bg-gray-400 min-h-[44px] text-sm sm:text-base"
                  >
                    {twoFALoading ? 'Bezig…' : 'Verificatie & Inschakelen'}
                  </button>
                  <button
                    onClick={() => {
                      setQrCode(null)
                      setTotpSecret(null)
                      setVerificationCode('')
                    }}
                    className="flex-1 px-4 py-2.5 sm:py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-400 transition min-h-[44px] text-sm sm:text-base"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {twoFAMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              twoFAMessage.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {twoFAMessage.text}
          </div>
        )}
      </section>

    </div>
  )
}
