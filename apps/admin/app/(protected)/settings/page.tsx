"use client"

import { useState, useEffect } from 'react'
import { Shield, Wrench, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/admin/ui/Card'
import { Button } from '@/components/admin/ui/Button'
import { Badge } from '@/components/admin/ui/Badge'
import { Input } from '@/components/admin/ui/Input'
import { PageHeader } from '@/components/admin/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'

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
        credentials: 'include',
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
      const res = await fetch('/api/admin/2fa/generate', { method: 'POST', credentials: 'include' })
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
        credentials: 'include',
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
      const res = await fetch('/api/admin/2fa/disable', { method: 'POST', credentials: 'include' })
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
      <div className="space-y-6">
        <PageHeader title="Instellingen" description="Beheer je applicatie configuratie" />
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 text-slate-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Instellingen" description="Beheer je applicatie configuratie" />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Onderhoudsmodus</CardTitle>
                <CardDescription>
                  Wanneer ingeschakeld, zien eindgebruikers een onderhoudsbericht in plaats van de quiz.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3">
                {maintenanceMode ? (
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                ) : (
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                )}
                <div>
                  <p className="font-medium text-slate-900">Status</p>
                  <p className="text-sm text-slate-500">
                    {maintenanceMode ? 'Onderhoudsmodus actief' : 'Normaal bedrijf'}
                  </p>
                </div>
              </div>
              <Button
                variant={maintenanceMode ? 'danger' : 'primary'}
                onClick={() => toggleMaintenanceMode(!maintenanceMode)}
                loading={saving}
              >
                {maintenanceMode ? 'Uitschakelen' : 'Inschakelen'}
              </Button>
            </div>

            {message && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {message.text}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Twee-Factor Authenticatie (2FA)</CardTitle>
                <CardDescription>
                  Beveilig je account met een authenticator app (Google Authenticator, Authy, etc.)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {is2FAEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-emerald-700 font-medium">2FA is ingeschakeld op je account</p>
                </div>
                <Button
                  variant="danger"
                  onClick={handleDisable2FA}
                  loading={twoFALoading}
                  className="w-full"
                >
                  2FA Uitschakelen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!qrCode ? (
                  <Button
                    variant="primary"
                    onClick={handleGenerateQR}
                    loading={twoFALoading}
                    className="w-full"
                    leftIcon={<Shield className="h-4 w-4" />}
                  >
                    QR Code Genereren
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 bg-slate-50 rounded-xl text-center border border-slate-200">
                      <p className="text-sm text-slate-600 mb-4">
                        Scan deze QR code met je authenticator app:
                      </p>
                      <img
                        src={qrCode}
                        alt="2FA QR Code"
                        className="w-48 h-48 mx-auto rounded-lg shadow-sm"
                      />
                      {totpSecret && (
                        <p className="text-xs text-slate-500 mt-4">
                          Handmatig: <code className="font-mono bg-white px-2 py-1 rounded border">{totpSecret}</code>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Voer 6-cijferige code in:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="primary"
                        onClick={handleVerify2FA}
                        loading={twoFALoading}
                        className="flex-1"
                      >
                        Verificatie & Inschakelen
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setQrCode(null)
                          setTotpSecret(null)
                          setVerificationCode('')
                        }}
                        className="flex-1"
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {twoFAMessage && (
              <div
                className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  twoFAMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {twoFAMessage.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {twoFAMessage.text}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
